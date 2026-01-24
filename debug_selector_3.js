const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

async function debugSelector() {
    const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/3.html';

    if (!fs.existsSync(filePath)) {
        console.error(`ERROR: File not found at ${filePath}`);
        return;
    }

    console.log(`Reading ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log('Loading into Cheerio...');
    const $ = cheerio.load(content, { xml: true, decodeEntities: false });

    console.log('--- Analysis ---');

    const h1Count = $('h1').length;
    console.log(`Total 'h1' tags: ${h1Count}`);

    const level1Count = $('level1').length;
    console.log(`Total 'level1' tags: ${level1Count}`);

    const bodyLevel1 = $('bodymatter > level1');
    console.log(`'bodymatter > level1' tags: ${bodyLevel1.length}`);

    console.log('\n--- IDs of bodymatter > level1 ---');
    bodyLevel1.each((i, el) => {
        const id = $(el).attr('id');
        const firstH1 = $(el).find('h1').first().text().trim().substring(0, 50);
        console.log(`[${i}] ID: ${id} | First H1: "${firstH1}..."`);
    });

    const frontLevel1 = $('frontmatter > level1');
    console.log(`\n'frontmatter > level1' tags: ${frontLevel1.length}`);
    frontLevel1.each((i, el) => {
        const id = $(el).attr('id');
        console.log(`[${i}] ID: ${id}`);
    });
}

debugSelector().catch(console.error);
