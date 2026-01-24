const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';
const content = fs.readFileSync(filePath, 'utf8');
const originalSize = fs.statSync(filePath).size;

console.log(`Original File Size: ${originalSize} bytes`);

const $ = cheerio.load(content, { xml: true, decodeEntities: false });
const selector = 'h2';
const targets = $(selector);
console.log(`Found ${targets.length} targets for selector "${selector}"`);

targets.each((i, el) => {
    $(el).attr('data-split-id', `marker-${i}`);
});

const rootNames = ['dtbook', 'book', 'html', 'body'];

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
let totalSplitSize = 0;
let sectionCount = 0;

// 1. Preamble
const $preamble = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
const firstMarker = $preamble('[data-split-id="marker-0"]')[0];
if (firstMarker) {
    pruneFrom($preamble, firstMarker);
    const preambleXml = $preamble.html();
    totalSplitSize += Buffer.byteLength(preambleXml, 'utf8');
    sectionCount++;
    console.log(`Preamble Size: ${Buffer.byteLength(preambleXml, 'utf8')} bytes`);
}

// 2. Sections
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

        const sectionXml = $copy.html();
        const size = Buffer.byteLength(sectionXml, 'utf8');
        totalSplitSize += size;
        sectionCount++;
    }
}

console.log(`\nTotal Sections: ${sectionCount}`);
console.log(`Total Split Size (Aggregate): ${totalSplitSize} bytes`);
console.log(`Difference: ${originalSize - totalSplitSize} bytes (${((totalSplitSize / originalSize) * 100).toFixed(2)}% of original)`);

// Check if any content appears AFTER the last marker
const $tail = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
const lastMarker = $tail(`[data-split-id="marker-${targets.length - 1}"]`)[0];
if (lastMarker) {
    pruneBefore($tail, lastMarker);
    // Remove the last marker itself to see what follows
    $tail(`[data-split-id="marker-${targets.length - 1}"]`).remove();
    const tailXml = $tail.html();
    console.log(`Tail content (after last marker) length: ${Buffer.byteLength(tailXml, 'utf8')} bytes`);
}
