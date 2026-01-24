const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

async function debugSplit() {
    const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';
    const outputDir = 'C:/Users/Owner/.gemini/antigravity/scratch/xml-splitter/debug_output';
    const selector = 'h2';
    const ext = '.html';

    await fs.ensureDir(outputDir);
    await fs.emptyDir(outputDir);

    const content = await fs.readFile(filePath, 'utf8');
    console.log(`Original Size: ${content.length} bytes`);

    const $ = cheerio.load(content, { xml: true, decodeEntities: false });
    const targets = $(selector);
    console.log(`Found ${targets.length} targets`);

    targets.each((i, el) => {
        $(el).attr('data-split-id', `marker-${i}`);
    });

    const rootNames = ['dtbook', 'book', 'html', 'body', 'frontmatter', 'bodymatter', 'rearmatter'];

    function pruneBefore($, node) {
        let curr = node;
        while (curr && curr.parent && !rootNames.includes(curr.name)) {
            $(curr).prevAll().remove();
            curr = curr.parent;
        }
    }

    function pruneFrom($, node) {
        if (!node) return;
        let curr = node;
        let first = true;
        while (curr && curr.parent && !rootNames.includes(curr.name)) {
            $(curr).nextAll().remove();
            if (first) {
                $(curr).remove();
                first = false;
            }
            curr = curr.parent;
        }
    }

    const originalHtml = $.html();

    // 1. Preamble
    const $preamble = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const firstMarker = $preamble('[data-split-id="marker-0"]')[0];
    if (firstMarker) {
        pruneFrom($preamble, firstMarker);
        const xml = $preamble.html();
        if (xml.length > 500) {
            await fs.writeFile(path.join(outputDir, `000_Preamble${ext}`), xml);
            console.log(`Wrote Preamble: ${xml.length} bytes`);
        }
    }

    // 2. Sections
    for (let i = 0; i < targets.length; i++) {
        const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
        const startNode = $copy(`[data-split-id="marker-${i}"]`)[0];
        const endNode = $copy(`[data-split-id="marker-${i + 1}"]`)[0];

        if (startNode) {
            $copy(startNode).removeAttr('data-split-id');
            pruneBefore($copy, startNode);
            if (endNode) pruneFrom($copy, endNode);

            const xml = $copy.html();
            const filename = `${String(i + 1).padStart(3, '0')}_section${ext}`;
            await fs.writeFile(path.join(outputDir, filename), xml);
            if (i % 50 === 0 || i === targets.length - 1) {
                console.log(`Wrote section ${i}: ${xml.length} bytes`);
            }
        }
    }

    // 3. Tail
    const $tail = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const lastMarker = $tail(`[data-split-id="marker-${targets.length - 1}"]`)[0];
    if (lastMarker) {
        pruneBefore($tail, lastMarker);
        $tail(`[data-split-id="marker-${targets.length - 1}"]`).remove();
        const xml = $tail.html();
        if (xml.length > 500) {
            await fs.writeFile(path.join(outputDir, `999_Postscript${ext}`), xml);
            console.log(`Wrote Postscript: ${xml.length} bytes`);
        }
    }

    console.log('Split complete.');
}

debugSplit().catch(console.error);

