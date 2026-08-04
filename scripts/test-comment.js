const http = require('http');

const testUsernames = ['Builderman', 'ROBLOX', 'DavidBaszucki', 'erik_cassi', 'Stickmasterluke'];
const randomUsername = testUsernames[Math.floor(Math.random() * testUsernames.length)];

const postData = JSON.stringify({
    tiktokUsername: 'viewer_' + Math.floor(Math.random() * 1000),
    comment: `!dance ${randomUsername}`
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/mock-comment',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log(`Sending mock comment for Roblox user: ${randomUsername}...`);

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Response:', JSON.parse(data));
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    console.error('Make sure the server is running with `npm start` first!');
});

req.write(postData);
req.end();
