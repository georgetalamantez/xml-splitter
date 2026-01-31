const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

async function debugSplit() {
    const filePath = 'C:/Users/Owner/Documents/jan-books-2026/Artificial_Intelligence_for__2.html';
    const outputDir = 'C:/Users/Owner/.gemini/antigravity/scratch/xml-splitter/debug_ai2_split';
    await fs.ensureDir(outputDir);

    const content = await fs.readFile(filePath, 'utf8');
    const $ = cheerio.load(content, { xmlMode: true, decodeEntities: false });

    // Strip hidden attributes that cause issues with readers
    $('[hidden]').removeAttr('hidden');
    $('[aria-hidden]').removeAttr('aria-hidden');

    // Refined logic from server.js
    let chapterMarkers = $('level1:has(h1.ChapterTitle), level1:has(h1.chapterNumber), level1:has(h1.partNumber), level1:has(h1.mainHeading), level1[id^="ch"], level1[id^="chapter"]');
    chapterMarkers = chapterMarkers.filter((i, el) => {
        const header = $(el).find('h1').first();
        const cls = header.attr('class') || '';
        if (cls.match(/heading-[1-9]/i)) return false;
        return true;
    });

    if (chapterMarkers.length === 0) {
        chapterMarkers = $('level1:has(h1[id^="u"])');
    }
    if (chapterMarkers.length === 0) {
        chapterMarkers = $('bodymatter > level1, book > level1, frontmatter > level1:has(h1)');
    }

    console.log(`Found ${chapterMarkers.length} markers`);

    chapterMarkers.each((i, el) => {
        $(el).attr('data-split-id', `marker-${i}`);
    });

    const originalHtml = $.html();

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

    for (let i = 0; i < chapterMarkers.length; i++) {
        const $copy = cheerio.load(originalHtml, { xmlMode: true, decodeEntities: false });
        const startNode = $copy(`[data-split-id="marker-${i}"]`)[0];
        const endNode = $copy(`[data-split-id="marker-${i + 1}"]`)[0];

        if (startNode) {
            $copy(startNode).removeAttr('data-split-id');
            pruneBefore($copy, startNode);
            if (endNode) {
                pruneFrom($copy, endNode);
            }
            $copy('[data-split-id]').removeAttr('data-split-id');

            const sectionXml = $copy.html();
            const filename = `chapter_${i + 1}.xml`;
            await fs.writeFile(path.join(outputDir, filename), sectionXml);
            console.log(`Wrote ${filename}`);
        }
    }
}

debugSplit().catch(console.error);
