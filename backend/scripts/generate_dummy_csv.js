const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../../test_50k_contacts.csv');
const stream = fs.createWriteStream(targetFile);

stream.write('phone,name\n');

console.log('Generating 50,000 dummy contacts...');

for (let i = 0; i < 50000; i++) {
    // Generate invalid numbers (starting with 10000...) that are 10 digits but likely invalid/dummy
    // or just sequentially increasing dummy numbers
    const mobile = `10000${String(i).padStart(5, '0')}`;
    const name = `Test User ${i}`;
    stream.write(`${mobile},${name}\n`);
}

stream.end();

stream.on('finish', () => {
    console.log(`Successfully created ${targetFile}`);
    console.log('You can now upload this file in the Campaign Creation wizard.');
});
