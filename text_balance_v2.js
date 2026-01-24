const cheerio = require('cheerio');
const fs = require('fs');

const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
const original$ = cheerio.load(content, { xml: true });
const originalText = original$.text().replace(/\s+/g, ' ').length;
console.log(`Original Text Length: ${originalText}`);

const targets = original$('h2');
targets.each((i, el) => original$(el).attr('data-split-id', `marker-${i}`));
const originalHtml = original$.html();

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

let totalSplitText = 0;

// 1. Preamble
const $preamble = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
const firstMarker = $preamble('[data-split-id="marker-0"]')[0];
if (firstMarker) {
    pruneFrom($preamble, firstMarker);
    totalSplitText += $preamble.text().replace(/\s+/g, ' ').length;
}

// 2. Sections
for (let i = 0; i < targets.length; i++) {
    const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const start = $copy(`[data-split-id="marker-${i}"]`)[0];
    const end = $copy(`[data-split-id="marker-${i + 1}"]`)[0];

    if (start) {
        $copy(start).removeAttr('data-split-id');
        pruneBefore($copy, start);
        if (end) pruneFrom($copy, end);

        totalSplitText += $copy.text().replace(/\s+/g, ' ').length;
    }
}

// 3. Tail
const $tail = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
const lastMarker = $tail(`[data-split-id="marker-${targets.length - 1}"]`)[0];
if (lastMarker) {
    pruneBefore($tail, lastMarker);
    $tail(`[data-split-id="marker-${targets.length - 1}"]`).remove();
    totalSplitText += $tail.text().replace(/\s+/g, ' ').length;
}

console.log(`Total Split Text: ${totalSplitText}`);
console.log(`Difference: ${totalSplitText - originalText} characters`);
console.log(`Percentage: ${((totalSplitText / originalText) * 100).toFixed(2)}%`);
