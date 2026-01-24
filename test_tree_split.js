const cheerio = require('cheerio');
const fs = require('fs');

try {
    const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
    const $ = cheerio.load(content, { xml: true });

    // Test the tree-slicing logic on a small scale
    const targets = $('h2');
    console.log(`Found ${targets.length} targets`);

    if (targets.length === 0) {
        console.log("No targets found!");
        process.exit(1);
    }

    // Function to prune everything before a node
    function pruneBefore($, node) {
        let curr = node;
        while (curr && curr.name !== 'root') {
            // Remove previous siblings
            let prev = $(curr).prevAll();
            prev.remove();
            curr = curr.parent;
        }
    }

    // Function to prune everything after a node (inclusive of the node itself)
    function pruneFrom($, node) {
        if (!node) return;
        let curr = node;
        while (curr && curr.name !== 'root') {
            // Remove next siblings
            let next = $(curr).nextAll();
            next.remove();
            // Also remove the node itself if it's the end boundary
            $(curr).remove();
            curr = curr.parent;
        }
    }

    // Attempt to slice section 10
    const sectionIndex = 10;
    const startNode = targets[sectionIndex];
    const endNode = targets[sectionIndex + 1];

    const $copy = cheerio.load($.html(), { xml: true });
    const targetsCopy = $copy('h2');
    const startCopy = targetsCopy[sectionIndex];
    const endCopy = targetsCopy[sectionIndex + 1];

    pruneBefore($copy, startCopy);
    if (endCopy) {
        pruneFrom($copy, endCopy);
    }

    const output = $copy.html();
    console.log(`Section ${sectionIndex} length: ${output.length}`);
    console.log(`Section ${sectionIndex} start: ${output.substring(0, 500)}`);
    console.log(`Section ${sectionIndex} end: ${output.substring(output.length - 500)}`);

} catch (err) {
    console.error(err);
}
