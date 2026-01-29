const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        if (!process.env.JWT_SECRET) {
            console.error('FATAL: JWT_SECRET is not defined in environment!');
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        // Returning specific error to client for debugging
        res.status(401).json({ success: false, message: `Invalid token: ${err.message}` });
    }
};

module.exports = authenticate;
