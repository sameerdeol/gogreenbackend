const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authorization token is missing.' });
    }

    try {
        // ✅ Decode and verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ Attach the decoded payload to req.user
        req.user = decoded;

        // Proceed to the next middleware/route handler
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
        } else {
            console.error('Unexpected error:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while verifying the token.' });
        }
    }
};

module.exports = { verifyToken };
