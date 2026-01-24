const fs = require('fs');

const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
const regex = /<h2/gi;
let match;
let count = 0;
const samples = [];

while ((match = regex.exec(content)) !== null) {
    count++;
    if (count % 30 === 0 || count < 5) {
        samples.push({
            index: match.index,
            context: content.substring(match.index - 100, match.index + 200).replace(/\r?\n/g, ' ')
        });
    }
}

console.log(`Total <h2 matches (regex): ${count}`);
samples.forEach((s, i) => {
    console.log(`Sample ${i} (Index ${s.index}): ...${s.context}...`);
});
