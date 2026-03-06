const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
console.log('JWT_SECRET exists:', !!secret);

if (!secret) {
    console.error('ERROR: JWT_SECRET is missing!');
    process.exit(1);
}

const payload = { id: 1, email: 'test@example.com' };
const token = jwt.sign(payload, secret, { expiresIn: '1h' });
console.log('Token generated successfully.');

try {
    const decoded = jwt.verify(token, secret);
    console.log('Verification SUCCESS:', decoded.email === payload.email);
} catch (err) {
    console.error('Verification FAILED:', err.message);
}
