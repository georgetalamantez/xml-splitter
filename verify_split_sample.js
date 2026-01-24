const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

async function verifySplit() {
    const filePath = 'sample.html';
    const outputDir = 'debug_output_sample';
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

    // Flexible pruning logic (similar to server.js)
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

    const originalHtml = $.html();

    // 1. Preamble
    const $preamble = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const firstMarker = $preamble('[data-split-id="marker-0"]')[0];
    if (firstMarker) {
        pruneFrom($preamble, firstMarker);
        $preamble('[data-split-id]').removeAttr('data-split-id');
        const xml = $preamble.html();
        if (xml.length > 0) { // Should check for meaningful content
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

            $copy('[data-split-id]').removeAttr('data-split-id');
            const xml = $copy.html();
            const filename = `${String(i + 1).padStart(3, '0')}_section${ext}`;
            await fs.writeFile(path.join(outputDir, filename), xml);
            console.log(`Wrote section ${i}: ${xml.length} bytes`);
        }
    }

    // 3. Tail
    const $tail = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const lastMarker = $tail(`[data-split-id="marker-${targets.length - 1}"]`)[0];
    if (lastMarker) {
        pruneBefore($tail, lastMarker);
        $tail(`[data-split-id="marker-${targets.length - 1}"]`).remove();
        $tail('[data-split-id]').removeAttr('data-split-id');
        const xml = $tail.html();
        // Check if meaningful content exists (heuristic: length > basic tags)
        if (xml.replace(/\s+/g, '').length > 50) { 
            await fs.writeFile(path.join(outputDir, `999_Postscript${ext}`), xml);
            console.log(`Wrote Postscript: ${xml.length} bytes`);
        } else {
             console.log(`Skipping Postscript (empty/small): ${xml.length} bytes`);
        }
    }

    console.log('Split complete.');
}

verifySplit().catch(console.error);
