const fs = require('fs');

const filePath = 'C:/Users/Owner/Documents/GitHub/georgetalamantez/books/3.html';
const content = fs.readFileSync(filePath, 'utf8');

let selector = 'chapter';

console.log('Testing Smart Selector Logic...');

if (selector === 'chapter') {
    if (content.includes('<dtbook') || content.includes('<bodymatter')) {
        selector = 'bodymatter > level1';
        console.log('SUCCESS: Detected DTBook/DAISY structure. Selector set to "bodymatter > level1"');
    } else if (content.includes('<html')) {
        if (content.includes('<h1')) {
            selector = 'h1';
            console.log('Detected Generic HTML. Selector set to "h1"');
        } else {
            selector = 'body > section, body > div';
            console.log('Detected Generic HTML (no h1). Selector set to "body > section"');
        }
    } else {
        selector = 'h1'; // Fallback
        console.log('Fallback to h1');
    }
}

if (selector === 'bodymatter > level1') {
    console.log('VERIFICATION PASSED: Logic matches expected behavior for 3.html');
} else {
    console.error(`VERIFICATION FAILED: Logic returned ${selector}`);
}
