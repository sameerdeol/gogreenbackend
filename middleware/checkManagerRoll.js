
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const checkManagerRole = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your JWT secret key
        // Check if the role ID exists and matches the required role (e.g., 2 for managers)
        const loggedInUserRole = decoded.role_id; // Ensure your token includes `role_id`
        if (!loggedInUserRole) {
            return res.status(400).json({
                success: false,
                message: 'Role ID is required to perform this action.',
            });
        }

        if (loggedInUserRole !== 1 && loggedInUserRole !== 2) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have manager privileges.',
            });
        }

        // Proceed to the next middleware/route handler
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please log in again.',
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please log in again.',
            });
        } else {
            console.error('Unexpected error:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while verifying the token.',
            });
        }
    }
};
module.exports = {
    checkManagerRole,
};