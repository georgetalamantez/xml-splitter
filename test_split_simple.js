const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

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

let report = `Total Targets: ${targets.length}\n`;

// Test 5 sections
for (let i = 0; i < Math.min(targets.length, 5); i++) {
    const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
    const start = $copy(`[data-split-id="marker-${i}"]`)[0];
    const end = $copy(`[data-split-id="marker-${i + 1}"]`)[0];

    if (start) {
        $copy(start).removeAttr('data-split-id');
        pruneBefore($copy, start);
        if (end) pruneFrom($copy, end);

        const out = $copy.html();
        report += `Section ${i} size: ${out.length} bytes\n`;
        if (i === 0) {
            fs.writeFileSync('sample_section_0.xml', out, 'utf8');
        }
    } else {
        report += `Section ${i} START NOT FOUND\n`;
    }
}

fs.writeFileSync('split_report.txt', report, 'utf8');
console.log('Report generated');
