const express = require('express');
const multer = require('multer');
const cheerio = require('cheerio');
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');

const app = express();
const port = 3001;

// Logging Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ],
});

// Setup Uploads
const uploadStub = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/split', uploadStub.single('file'), async (req, res, next) => {
    const file = req.file;
    let selector = req.body.selector || 'h2';

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    const outputDir = path.join(__dirname, 'output', file.filename);

    try {
        await fs.ensureDir(outputDir);

        // Read file
        const content = await fs.readFile(file.path, 'utf8');
        const ext = path.extname(file.originalname) || '.xml';
        const isDTBook = content.includes('<dtbook');

        // Load into Cheerio with XML mode
        const $ = cheerio.load(content, { xmlMode: true, decodeEntities: false });

        // Strip hidden attributes that cause issues with readers
        $('[hidden]').removeAttr('hidden');
        $('[aria-hidden]').removeAttr('aria-hidden');

        let targets;
        if (selector === 'chapter' && isDTBook) {
            // Enhanced Multi-Phase DTBook Selector
            // Phase 1: High Confidence Markers (Chapters, Parts, Main Headings)
            let chapterMarkers = $('level1:has(h1.ChapterTitle), level1:has(h1.chapterNumber), level1:has(h1.partNumber), level1:has(h1.mainHeading), level1[id^="ch"], level1[id^="chapter"]');

            // Filter out sub-sections that might be wrapped in level1 (common in some exports)
            // Specific exclusion for classes known to be sub-headings even if they are top-level in their parent
            chapterMarkers = chapterMarkers.filter((i, el) => {
                const header = $(el).find('h1').first();
                const cls = header.attr('class') || '';
                // If it has a sub-heading class, it's probably not a chapter start
                if (cls.match(/heading-[1-9]/i)) return false;
                return true;
            });

            if (chapterMarkers.length > 0) {
                targets = chapterMarkers;
                logger.info(`Smart Detect: DTBook chapters found by high-confidence markers (${targets.length})`);
            } else {
                // Phase 2: Pattern-based (Specific to Packt/Complex structure uXX-)
                const patternMarkers = $('level1:has(h1[id^="u"])');

                if (patternMarkers.length > 0) {
                    targets = patternMarkers;
                    logger.info(`Smart Detect: DTBook chapters found by ID pattern uXX- (${targets.length})`);
                } else {
                    // Phase 3: Fallback to standard level1 hierarchy
                    targets = $('bodymatter > level1, book > level1, frontmatter > level1:has(h1)');
                    logger.info(`Smart Detect: DTBook chapters found by hierarchy/fallback (${targets.length})`);
                }
            }
        } else if (selector === 'chapter') {
            // Generic Chapter logic
            targets = $('h1, h2, section, article');
            logger.info(`Smart Detect: Generic chapters found (${targets.length})`);
        } else {
            // Custom selector from user
            targets = $(selector);
            logger.info(`Using provided selector: ${selector} (${targets.length} matches)`);
        }

        if (targets.length === 0) {
            logger.warn('No markers found with primary logic. Falling back to top-level divs.');
            targets = $('body > div, book > div');
        }

        // Tag targets with unique IDs
        targets.each((i, el) => {
            $(el).attr('data-split-id', `marker-${i}`);
        });

        // Helper functions for pruning
        function pruneBefore($, node) {
            let curr = $(node);
            while (curr.length && curr.parent().length) {
                curr.prevAll().remove();
                curr = curr.parent();
            }
        }

        function pruneFrom($, node) {
            if (!node) return;
            let curr = $(node);
            let first = true;
            while (curr.length && curr.parent().length) {
                curr.nextAll().remove();
                const parent = curr.parent();
                if (first) {
                    curr.remove();
                    first = false;
                }
                curr = parent;
            }
        }

        const sections = [];
        const originalHtml = $.html();

        // 1. Process Preamble (everything before the first marker)
        if (targets.length > 0) {
            const $preamble = cheerio.load(originalHtml, { xmlMode: true, decodeEntities: false });
            const firstMarker = $preamble('[data-split-id="marker-0"]')[0];
            if (firstMarker) {
                pruneFrom($preamble, firstMarker);
                $preamble('[data-split-id]').removeAttr('data-split-id');
                const preambleXml = $preamble.html();
                if (preambleXml.replace(/\s+/g, '').length > 50) {
                    const filename = `000_Preamble${ext}`;
                    await fs.writeFile(path.join(outputDir, filename), preambleXml);
                    sections.push(filename);
                }
            }
        }

        // 2. Process Sections
        for (let i = 0; i < targets.length; i++) {
            const $copy = cheerio.load(originalHtml, { xmlMode: true, decodeEntities: false });
            const startNode = $copy(`[data-split-id="marker-${i}"]`)[0];
            const endNode = $copy(`[data-split-id="marker-${i + 1}"]`)[0];

            if (startNode) {
                $copy(startNode).removeAttr('data-split-id');
                pruneBefore($copy, startNode);
                if (endNode) {
                    pruneFrom($copy, endNode);
                }

                // Clean up ALL temporary attributes from the section
                $copy('[data-split-id]').removeAttr('data-split-id');

                const sectionXml = $copy.html();

                // Extract title for filename
                const $target = $(targets[i]);
                let title = $target.find('h1, h2, h3, h4, h5, h6').first().text().trim();
                if (!title) {
                    title = $target.text().trim();
                }
                const safeTitle = title.replace(/[^\w\d-_]/g, '_').substring(0, 80) || `section_${i}`;
                const filename = `${String(i + 1).padStart(3, '0')}_${safeTitle}${ext}`;

                await fs.writeFile(path.join(outputDir, filename), sectionXml);
                sections.push(filename);
            }
        }

        // 3. Process Postscript (everything after the last marker)
        if (targets.length > 0) {
            const lastIdx = targets.length - 1;
            const $tail = cheerio.load(originalHtml, { xmlMode: true, decodeEntities: false });
            const lastMarker = $tail(`[data-split-id="marker-${lastIdx}"]`)[0];
            if (lastMarker) {
                pruneBefore($tail, lastMarker);
                $tail(`[data-split-id="marker-${lastIdx}"]`).remove();
                $tail('[data-split-id]').removeAttr('data-split-id');
                const tailXml = $tail.html();
                if (tailXml.replace(/\s+/g, '').length > 50) {
                    const filename = `999_Postscript${ext}`;
                    await fs.writeFile(path.join(outputDir, filename), tailXml);
                    sections.push(filename);
                }
            }
        }

        if (sections.length === 0) {
            throw new Error(`No sections generated. Check selector: ${selector}`);
        }

        // Zip results
        const zipName = `split_${Date.now()}.zip`;
        const zipPath = path.join(__dirname, 'output', zipName);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            logger.info(`Successfully processed ${file.originalname}. ${sections.length} sections.`);
            res.download(zipPath, zipName, async (err) => {
                if (err) logger.error(`Download error: ${err.message}`);
                // Cleanup
                await fs.remove(file.path).catch(() => { });
                await fs.remove(outputDir).catch(() => { });
                await fs.remove(zipPath).catch(() => { });
            });
        });

        archive.on('error', (err) => { throw err; });
        archive.pipe(output);
        archive.directory(outputDir, false);
        archive.finalize();

    } catch (err) {
        next(err);
        if (file) await fs.remove(file.path).catch(() => { });
        if (outputDir) await fs.remove(outputDir).catch(() => { });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error(`${err.message}\n${err.stack}`);
    res.status(500).send(`An internal error occurred: ${err.message}`);
});

app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});
