const cheerio = require('cheerio');
const fs = require('fs');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';

if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found at ${filePath}`);
    process.exit(1);
}

console.log('Reading file...');
const content = fs.readFileSync(filePath, 'utf8');
console.log(`Content read. Length: ${content.length}`);

const $ = cheerio.load(content, { xml: true, decodeEntities: false });

// Function to prune everything before a node
function pruneBefore($, node) {
    let curr = node;
    while (curr && curr.parent) { // Stay within the document
        $(curr).prevAll().remove();
        curr = curr.parent;
    }
}

// Function to prune everything after a node (inclusive of the node itself)
function pruneFrom($, node) {
    if (!node) return;
    let curr = node;
    while (curr && curr.parent) {
        $(curr).nextAll().remove();
        $(curr).remove();
        curr = curr.parent;
    }
}

const targets = $('h2');
console.log(`Found ${targets.length} targets`);

if (targets.length === 0) {
    console.error('ERROR: No h2 tags found');
    process.exit(1);
}

// Mark targets
targets.each((i, el) => {
    $(el).attr('data-split-id', `marker-${i}`);
});

const originalHtml = $.html();

// Test section 10
const testIndex = 10;
const $copy = cheerio.load(originalHtml, { xml: true, decodeEntities: false });
const startNode = $copy(`[data-split-id="marker-${testIndex}"]`)[0];
const endNode = $copy(`[data-split-id="marker-${testIndex + 1}"]`)[0];

if (startNode) {
    console.log(`Processing Section ${testIndex}: ${$(targets[testIndex]).text().trim()}...`);
    $copy(startNode).removeAttr('data-split-id');

    pruneBefore($copy, startNode);
    if (endNode) {
        pruneFrom($copy, endNode);
    }

    const outputXml = $copy.html();
    console.log(`Output length: ${outputXml.length}`);
    console.log(`Preview start:\n${outputXml.substring(0, 500)}`);
    console.log(`Preview end:\n${outputXml.substring(outputXml.length - 500)}`);

    fs.writeFileSync('test_section_out.xml', outputXml);
} else {
    console.error(`ERROR: Could not find start node for index ${testIndex}`);
}
