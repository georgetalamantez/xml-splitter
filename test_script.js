const fs = require('fs');
const path = require('path');
const http = require('http');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

const fileContent = fs.readFileSync('sample.html');

const postDataHead = `--${boundary}\r\nContent-Disposition: form-data; name="selector"\r\n\r\nh2\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.html"\r\nContent-Type: text/html\r\n\r\n`;
const postDataTail = `\r\n--${boundary}--`;

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/split',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        // Calculate precise length
        'Content-Length': Buffer.byteLength(postDataHead) + fileContent.length + Buffer.byteLength(postDataTail)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode === 200) {
        console.log('Success: Received response with status 200 (Zip file)');

        // Save zip to check logic if needed, but for now just success is enough
        // const file = fs.createWriteStream("test_output.zip");
        // res.pipe(file);
    } else {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
    }
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(postDataHead);
req.write(fileContent);
req.write(postDataTail);
req.end();
