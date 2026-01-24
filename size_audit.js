const cheerio = require('cheerio');
const fs = require('fs');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';
const content = fs.readFileSync(filePath, 'utf8');
const originalSize = fs.statSync(filePath).size;

const $ = cheerio.load(content, { xml: true, decodeEntities: false });
const targets = $('h2');
targets.each((i, el) => $(el).attr('data-split-id', `marker-${i}`));
const originalHtml = $.html();

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

let totalSize = 0;
let results = [];

// For performance, we'll use a single Copy and modify it if possible, 
// BUT pruning is destructive, so we must clone for each section.
// To avoid memory limits, we'll process in batches or just log every 50.

for (let i = 0; i < targets.length; i++) {
    const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const start = $copy(`[data-split-id="marker-${i}"]`)[0];
    const end = $copy(`[data-split-id="marker-${i + 1}"]`)[0];

    if (start) {
        $copy(start).removeAttr('data-split-id');
        pruneBefore($copy, start);
        if (end) pruneFrom($copy, end);

        const size = Buffer.byteLength($copy.html(), 'utf8');
        totalSize += size;
        if (i % 50 === 0 || size < 1000) {
            console.log(`Section ${i}: ${size} bytes`);
        }
    }
}

console.log(`Original: ${originalSize}`);
console.log(`Total: ${totalSize}`);
console.log(`Ratio: ${(totalSize / originalSize).toFixed(2)}`);
