const cheerio = require('cheerio');
const fs = require('fs');

const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
const $ = cheerio.load(content, { xml: true });
const selector = 'h2';
const targets = $(selector);

console.log(`Total ${selector} found: ${targets.length}`);

targets.each((i, el) => {
    let depth = 0;
    let curr = el;
    let path = [];
    while (curr.parent) {
        depth++;
        path.push(curr.name || 'root');
        curr = curr.parent;
    }
    if (i < 10 || i % 50 === 0) {
        console.log(`Target ${i}: Path: ${path.reverse().join(' > ')} | Text: ${$(el).text().trim().substring(0, 30)}`);
    }
});
