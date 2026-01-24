const cheerio = require('cheerio');
const fs = require('fs');

const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
const $ = cheerio.load(content, { xml: true });

let totalOriginalText = 0;
let sectionsText = [];
let currentSectionIdx = -1; // -1 is Preamble

function walk(node) {
    if (node.type === 'tag' && $(node).attr('h2') !== undefined) {
        // This doesn't work because I didn't mark them yet.
    }

    // Check if node is an h2
    if (node.name === 'h2') {
        currentSectionIdx++;
        sectionsText[currentSectionIdx] = 0;
    }

    if (node.type === 'text') {
        const txt = $(node).text().replace(/\s+/g, ' ');
        const len = txt.length;
        totalOriginalText += len;
        if (currentSectionIdx === -1) {
            // Preamble
            if (!sectionsText[-1]) sectionsText[-1] = 0;
            sectionsText[-1] += len;
        } else {
            sectionsText[currentSectionIdx] += len;
        }
    }

    if (node.children) {
        node.children.forEach(walk);
    }
}

const root = $.root()[0];
walk(root);

let totalSum = (sectionsText[-1] || 0);
for (let i = 0; i <= currentSectionIdx; i++) {
    totalSum += (sectionsText[i] || 0);
}

let result = `Original Text: ${totalOriginalText}\n`;
result += `Preamble Text: ${sectionsText[-1] || 0}\n`;
result += `Sections Sum: ${totalSum - (sectionsText[-1] || 0)}\n`;
result += `Total Sum: ${totalSum}\n`;
result += `Difference: ${totalSum - totalOriginalText}\n`;
result += `Last Section index: ${currentSectionIdx}\n`;

fs.writeFileSync('tree_sum_results.txt', result, 'utf8');
console.log('Audit Done');
