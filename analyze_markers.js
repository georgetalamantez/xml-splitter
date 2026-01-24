const cheerio = require('cheerio');
const fs = require('fs');

const content = fs.readFileSync('C:/Users/Owner/Documents/GitHub/georgetalamantez/books/1.html', 'utf8');
const $ = cheerio.load(content, { xml: true });
$('h2').each((i, el) => {
    console.log(`Marker ${i}: ID ${$(el).attr('id')} Text: ${$(el).text().trim().substring(0, 40)}`);
});
