const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

async function verifyFile(filePath) {
    try {
        console.log(`\n=== Verifying: ${path.basename(filePath)} ===`);
        if (!await fs.exists(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }

        const content = await fs.readFile(filePath, 'utf8');
        console.log(`File read successfully, size: ${content.length} bytes`);

        const $ = cheerio.load(content, { xmlMode: true, decodeEntities: false });

        const isDTBook = content.includes('<dtbook');
        console.log('Is DTBook:', isDTBook);

        let targets;
        // EXACT LOGIC FROM server.js
        const chapterLevel1s = $('level1[id^="ch"], level1[id*="Chapter"], level1:has(h1:contains("Chapter")), level1:has(section[epub\\:type="chapter"])');

        if (chapterLevel1s.length > 0) {
            targets = chapterLevel1s;
            console.log(`Smart Detect: DTBook chapters found by title/ID pattern (${targets.length})`);
        } else {
            targets = $('bodymatter > level1, book > level1, frontmatter > level1:has(h1)');
            console.log(`Smart Detect: DTBook chapters found by hierarchy/fallback (${targets.length})`);
        }

        targets.each((i, el) => {
            const id = $(el).attr('id');
            const title = $(el).find('h1, h2').first().text().trim() || 'No title';
            console.log(`${String(i + 1).padStart(2, ' ')}. [${id}] ${title.substring(0, 50)}...`);
        });

        if (targets.length === 0) {
            console.log('WARNING: No chapters found!');
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}

async function run() {
    console.log('Starting verification...');
    const files = [
        'C:/Users/Owner/Documents/jan-books-2026/AI_for_the_Healthy_Brain_and.html',
        'C:/Users/Owner/Documents/jan-books-2026/Ambient_Assisted_Living_1.html'
    ];

    for (const file of files) {
        await verifyFile(file);
    }
    console.log('\nVerification complete.');
}

run().catch(err => {
    console.error('Fatal error:', err);
});
