const http = require('http');

const data = JSON.stringify({
    permissions: []
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/clients/1',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);

    let body = '';
    res.on('data', d => {
        body += d;
    });

    res.on('end', () => {
        console.log('Response Body:');
        console.log(body);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
