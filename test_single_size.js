const cheerio = require('cheerio');
const fs = require('fs');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';
const content = fs.readFileSync(filePath, 'utf8');
const originalSize = fs.statSync(filePath).size;

console.log(`Original: ${originalSize} bytes`);

const $ = cheerio.load(content, { xml: true, decodeEntities: false });
const targets = $('h2');
console.log(`Targets: ${targets.length}`);

// Test just section 10
const testIdx = 10;
targets.each((i, el) => $(el).attr('data-split-id', `marker-${i}`));
const originalHtml = $.html();

const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
const start = $copy(`[data-split-id="marker-${testIdx}"]`)[0];
const end = $copy(`[data-split-id="marker-${testIdx + 1}"]`)[0];

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

$copy(start).removeAttr('data-split-id');
pruneBefore($copy, start);
if (end) pruneFrom($copy, end);

const sectionXml = $copy.html();
console.log(`Section ${testIdx} Size: ${Buffer.byteLength(sectionXml, 'utf8')}`);

// Check for missing data: Sum of Preamble + All Chunks should equal Original (roughly)
// But if I can't run all, I'll check if Section 10 + its siblings etc are correct.

// Wait, the real test: Is there ANY content that IS NOT in any section?
// If a section contains its full parent hierarchy, it might actually be LARGER in sum
// because parent tags are repeated. If it's SMALLER, content is definitely lost.
