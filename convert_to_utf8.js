const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Owner/.gemini/antigravity/scratch/xml-splitter';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.txt')) {
        const filePath = path.join(dir, file);
        try {
            const buf = fs.readFileSync(filePath);
            // Check if it's UTF-16LE (BOM: FF FE)
            if (buf[0] === 0xFF && buf[1] === 0xFE) {
                const str = buf.toString('utf16le');
                fs.writeFileSync(filePath, str, 'utf8');
                console.log(`Converted ${file} to UTF-8`);
            } else {
                console.log(`${file} is not UTF-16LE`);
            }
        } catch (e) {
            console.error(`Error processing ${file}: ${e.message}`);
        }
    }
});
