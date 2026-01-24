const cheerio = require('cheerio');
const fs = require('fs');

const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
const $ = cheerio.load(content, { xml: true });
const targets = $('h2');
console.log(`Total Targets: ${targets.length}`);

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

// Check Tail (after last marker)
const lastIdx = targets.length - 1;
const $tail = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
const lastMarker = $tail(`[data-split-id="marker-${lastIdx}"]`)[0];

if (lastMarker) {
    pruneBefore($tail, lastMarker);
    const tailXml = $tail.html();
    console.log(`Tail (Section ${lastIdx} to END) Size: ${Buffer.byteLength(tailXml, 'utf8')} bytes`);
}
