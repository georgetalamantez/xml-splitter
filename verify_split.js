const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

async function verify() {
    const filePath = process.argv[2] || 'C:/Users/Owner/Documents/jan-books-2026/AI_for_the_Healthy_Brain_and.html';
    console.log(`Verifying: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf8');
    const $ = cheerio.load(content, { xmlMode: true, decodeEntities: false });

    console.log('--- DTBook Structural Check ---');
    const isDTBook = content.includes('<dtbook');
    console.log('Is DTBook:', isDTBook);

    const bodymatter = $('bodymatter');
    console.log('Bodymatter count:', bodymatter.length);

    const frontmatter = $('frontmatter');
    console.log('Frontmatter count:', frontmatter.length);

    console.log('\n--- Chapter Detection Check (Refined Logic) ---');

    // Logic from server.js
    let chapterMarkers = $('level1:has(h1.ChapterTitle), level1:has(h1.chapterNumber), level1:has(h1.partNumber), level1:has(h1.mainHeading), level1[id^="ch"], level1[id^="chapter"]');

    chapterMarkers = chapterMarkers.filter((i, el) => {
        const header = $(el).find('h1').first();
        const cls = header.attr('class') || '';
        if (cls.match(/heading-[1-9]/i)) return false;
        return true;
    });

    if (chapterMarkers.length === 0) {
        console.log('No high-confidence markers, trying pattern uXX-...');
        chapterMarkers = $('level1:has(h1[id^="u"])');
    }

    if (chapterMarkers.length === 0) {
        console.log('Still no markers, falling back to hierarchy...');
        chapterMarkers = $('bodymatter > level1, book > level1, frontmatter > level1:has(h1)');
    }

    console.log(`Chapters found: ${chapterMarkers.length}`);

    chapterMarkers.each((i, el) => {
        const id = $(el).attr('id');
        const header = $(el).find('h1, h2, h3').first();
        const title = header.text().trim() || 'No title found';
        const cls = header.attr('class') || 'No class';
        const headerId = header.attr('id') || 'No marker ID';
        console.log(`${String(i + 1).padStart(2, ' ')}. [${id}] [${headerId}] [${cls}] ${title.substring(0, 60)}...`);
    });

    console.log('\n--- Preamble Check ---');
    if (chapterMarkers.length > 0) {
        const firstChapterId = $(chapterMarkers[0]).attr('id');
        const $preamble = cheerio.load(content, { xmlMode: true, decodeEntities: false });

        // Simulating pruneFrom logic
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

        const firstMarker = $preamble(`#${firstChapterId}`)[0];
        if (firstMarker) {
            pruneFrom($preamble, firstMarker);
            const preambleText = $preamble.text();
            console.log('Preamble length:', preambleText.length);
            console.log('Preamble preview (first 200 chars):', preambleText.substring(0, 200).replace(/\s+/g, ' '));
        } else {
            console.log('FAILED to find first marker for preamble pruning');
        }
    }
}

verify().catch(console.error);
