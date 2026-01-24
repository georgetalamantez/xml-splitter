const cheerio = require('cheerio');
const fs = require('fs');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';
const content = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(content, { xml: true });
const targets = $('h2');
targets.each((i, el) => $(el).attr('data-split-id', `marker-${i}`));
const originalHtml = $.html();
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

let audit = ``;
for (let i = 0; i < 2; i++) {
    const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const start = $copy(`[data-split-id="marker-${i}"]`)[0];
    const end = $copy(`[data-split-id="marker-${i + 1}"]`)[0];

    if (start) {
        $copy(start).removeAttr('data-split-id');
        pruneBefore($copy, start);
        if (end) pruneFrom($copy, end);
        const xml = $copy.html();
        audit += `Section ${i}: ${xml.length} bytes\n`;
        fs.writeFileSync(`test_section_${i}.xml`, xml, 'utf8');
    }
}

fs.writeFileSync('minimal_audit.txt', audit, 'utf8');
console.log('Minimal Audit complete');
