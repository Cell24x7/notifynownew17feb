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
        console.error(`Token verification failed for token starting with ${token.substring(0, 10)}...:`, err.message);

        let message = 'Invalid token';
        if (err.name === 'TokenExpiredError') {
            message = 'Session expired. Please login again.';
        } else if (err.name === 'JsonWebTokenError') {
            message = 'Invalid session. Please login again.';
        }

        res.status(401).json({
            success: false,
            message: message,
            error_type: err.name
        });
    }
};

module.exports = authenticate;
