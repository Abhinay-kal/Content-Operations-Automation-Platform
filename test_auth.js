const http = require('http');

const data = JSON.stringify({ "wp_post_ids": [1], "type": "REWRITE", "priority": "NORMAL" });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/plugin/jobs/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer b8d90d7f634dbba2c4bc9de757d5d6ac90e75222e24671e7beff5a6676c3cb3c',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.write(data);
req.end();
