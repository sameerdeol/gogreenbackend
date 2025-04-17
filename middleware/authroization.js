const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authorization token is missing.' });
    }
    
    try {
        // Verify the token and decode it in one step
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify and decode the token
        
        // Check if the decoded token's user ID matches the user_id from the request body (if you need it)
        const { user_id } = req.body;
        if (user_id !== decoded.id) {
            return res.status(401).json({ success: false, message: 'your Token is not matched with this user.' });
        }

        // If token is valid, add the decoded user info to the request object for use in the route handler
        req.user = decoded; // Optionally attach decoded info to req.user

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
