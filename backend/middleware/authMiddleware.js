const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
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
        
        // --- Added Status Check ---
        const { query } = require('../config/db');
        const [rows] = await query('SELECT status FROM users WHERE id = ?', [decoded.id]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'User account no longer exists.' });
        }
        
        if (rows[0].status === 'suspended') {
            return res.status(403).json({ 
                success: false, 
                message: 'Your account has been suspended. All services are disabled.' 
            });
        }
        // -------------------------

        req.user = decoded;
        next();
    } catch (err) {
        let message = 'Invalid token';
        if (err.name === 'TokenExpiredError') {
            message = 'Session expired. Please login again.';
        } else if (err.name === 'JsonWebTokenError') {
            message = 'Invalid session. Please login again.';
        } else {
            console.error(`Token verification failed:`, err.message);
        }

        return res.status(401).json({
            success: false,
            message: message,
            error_type: err.name
        });
    }
};

module.exports = authenticate;
