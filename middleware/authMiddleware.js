const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Assumes token is in `Bearer <token>`

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Allow only role 1 (SuperAdmin) and role 2 (Manager) to proceed
        if (![1, 2].includes(decoded.role_id)) {
            return res.status(403).json({ success: false, message: 'Access Denied: Unauthorized Role' });
        }

        req.user = decoded;  // Attach decoded user information to request object
        next();
    } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid Token' });
    }
};

module.exports = { authenticateToken };
