const cheerio = require('cheerio');
const fs = require('fs');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html';
const content = fs.readFileSync(filePath, 'utf8');
console.log(`Raw File Size: ${content.length} bytes`);

// 1. Regex check
const regexMatches = content.match(/<h2/gi) || [];
console.log(`Regex <h2 count: ${regexMatches.length}`);

// 2. Cheerio XML mode
const $xml = cheerio.load(content, { xml: true });
const xmlH2 = $xml('h2');
console.log(`Cheerio XML <h2> count: ${xmlH2.length}`);
const xmlSerializedSize = $xml.html().length;
console.log(`Cheerio XML Serialized Size: ${xmlSerializedSize} bytes`);

// 3. Cheerio HTML mode
const $html = cheerio.load(content, { xml: false });
const htmlH2 = $html('h2');
console.log(`Cheerio HTML <h2> count: ${htmlH2.length}`);
const htmlSerializedSize = $html.html().length;
console.log(`Cheerio HTML Serialized Size: ${htmlSerializedSize} bytes`);

// 4. Namespace Check
const namespaces = content.match(/xmlns:[a-zA-Z0-9]+="[^"]+"/g) || [];
console.log(`Detected namespaces: ${namespaces.join(', ')}`);

// 5. Sample missing h2 from regex vs cheerio
if (regexMatches.length > xmlH2.length) {
    console.log('Investigating missing headers...');
    // We'll find where they are
}

process.exit(0);
