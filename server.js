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

        // Smart Selector Logic
        if (selector === 'chapter') {
            if (content.includes('<dtbook') || content.includes('<bodymatter')) {
                selector = 'bodymatter > level1';
                logger.info('Smart Detect: Identified DTBook/DAISY structure. Using "bodymatter > level1"');
            } else if (content.includes('<html')) {
                if (content.includes('<h1')) {
                    selector = 'h1';
                    logger.info('Smart Detect: Generic HTML. Defaulting "Chapter" to "h1"');
                } else {
                    selector = 'body > section, body > div';
                    logger.info('Smart Detect: Generic HTML with no h1. Trying top-level sections.');
                }
            } else {
                selector = 'h1'; // Fallback
            }
        }

        logger.info(`Processing file: ${file.originalname} with selector: ${selector} using Preamble-Aware Tree-Aware Pruning`);

        // Load into Cheerio with XML mode
        const $ = cheerio.load(content, { xml: true, decodeEntities: false });

        // Identify targets
        const targets = $(selector);

        // Tag targets with unique IDs
        targets.each((i, el) => {
            $(el).attr('data-split-id', `marker-${i}`);
        });


        // Function to prune everything before a node (relative to container)
        function pruneBefore($, node) {
            let curr = $(node);
            while (curr.length && curr.parent().length) {
                curr.prevAll().remove();
                curr = curr.parent();
            }
        }

        // Function to prune everything after/at a node (relative to container)
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

        // 1. Process Preamble (everything before first marker)
        if (targets.length > 0) {
            const $preamble = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
            const firstMarker = $preamble('[data-split-id="marker-0"]')[0];
            if (firstMarker) {
                pruneFrom($preamble, firstMarker);
                // Clean up ALL temporary attributes
                $preamble('[data-split-id]').removeAttr('data-split-id');
                const preambleXml = $preamble.html();
                // Check if preamble has meaningful content
                if (preambleXml.replace(/\s+/g, '').length > 50) {
                    const filename = `000_Preamble${ext}`;
                    await fs.writeFile(path.join(outputDir, filename), preambleXml);
                    sections.push(filename);
                }
            }
        }

        // 2. Process Sections
        for (let i = 0; i < targets.length; i++) {
            const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
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
                // Extract title: prioritize first heading within the target
                const $target = $(targets[i]);
                let title = $target.find('h1, h2, h3, h4, h5, h6').first().text().trim();
                if (!title) {
                    title = $target.text().trim();
                }
                const safeTitle = title.replace(/[^\w\d-_]/g, '_').substring(0, 100) || `section_${i}`;
                const filename = `${String(i + 1).padStart(3, '0')}_${safeTitle}${ext}`;

                await fs.writeFile(path.join(outputDir, filename), sectionXml);
                sections.push(filename);
            }
        }

        // 3. Process Tail (everything after last marker)
        if (targets.length > 0) {
            const lastIdx = targets.length - 1;
            const $tail = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
            const lastMarker = $tail(`[data-split-id="marker-${lastIdx}"]`)[0];
            if (lastMarker) {
                pruneBefore($tail, lastMarker);
                // Remove the last marker itself to get ONLY what follows
                $tail(`[data-split-id="marker-${lastIdx}"]`).remove();
                // Clean up ALL temporary attributes
                $tail('[data-split-id]').removeAttr('data-split-id');
                const tailXml = $tail.html();
                // Avoid empty shells
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

        // Zip the output
        const zipName = `split_${Date.now()}.zip`;
        const zipPath = path.join(__dirname, 'output', zipName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            logger.info(`Successfully processed ${file.originalname}. ${sections.length} sections. Zip: ${zipPath}`);
            res.download(zipPath, zipName, async (err) => {
                if (err) {
                    logger.error(`Download error for ${zipName}: ${err.message}`);
                }
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
