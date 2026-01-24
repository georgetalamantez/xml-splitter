const cheerio = require('cheerio');
const fs = require('fs');

const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
const $ = cheerio.load(content, { xml: true });
let output = '';
$('h2').each((i, el) => {
    output += `Marker ${i}: ID ${$(el).attr('id')} Text: ${$(el).text().trim().substring(0, 40)}\n`;
});
fs.writeFileSync('marker_list_utf8.txt', output, 'utf8');
console.log('Done listing ' + $('h2').length + ' markers');
