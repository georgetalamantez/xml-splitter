const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';
const content = fs.readFileSync(filePath, 'utf8');
const selector = 'h2';

const $ = cheerio.load(content, { xml: true, decodeEntities: false });

console.log('--- Phase 1: Shell Extraction ---');
let $container = $('bodymatter');
if ($container.length === 0) $container = $('book');
if ($container.length === 0) $container = $('body');
if ($container.length === 0) $container = $.root();

const placeholder = '<!-- SPLIT_CONTENT_PLACEHOLDER -->';
const originalContainerHtml = $container.html();
$container.html(placeholder);
const shell = $.html();
console.log(`Shell length: ${shell.length}`);
// Restore
$container.html(originalContainerHtml);

console.log('\n--- Phase 2: Splitting ---');
const targets = $(selector);
console.log(`Found ${targets.length} targets.`);

targets.each((i, el) => {
    $(el).before(`<split-marker-index-${i} />`);
});

let containerHtml = $container.html();
const sections = [];

for (let i = 0; i < Math.min(targets.length, 5); i++) { // Test first 5
    const currentMarker = `<split-marker-index-${i} />`;
    const nextMarker = `<split-marker-index-${i + 1} />`;

    const startIdx = containerHtml.indexOf(currentMarker);
    const endIdx = i < targets.length - 1 ? containerHtml.indexOf(nextMarker) : containerHtml.length;

    if (startIdx !== -1) {
        let sectionContent = containerHtml.substring(startIdx + currentMarker.length, endIdx);
        sections.push(sectionContent);
        console.log(`Section ${i + 1}: Start ${startIdx}, Length ${sectionContent.length}`);
        console.log(`Preview: ${sectionContent.trim().substring(0, 100)}...`);
    }
}

if (sections.length > 0) {
    console.log('\n--- Phase 3: Final Output Check ---');
    const finalXml = shell.replace(placeholder, sections[0]);
    console.log(`Final XML length: ${finalXml.length}`);
    console.log(`Final XML starts with: ${finalXml.substring(0, 200)}...`);
}
