const allowRoles = (allowedRoles) => {
    return (req, res, next) => {
        try {
            const user = req.user; // Assuming `req.user` is set in the authenticateToken middleware

            if (!user) {
                return res.status(401).json({ message: 'Unauthorized: User information not found' });
            }

            // Check if the user's role_id is in the allowedRoles array
            if (!allowedRoles.includes(user.role_id)) {
                return res.status(403).json({ message: 'Access Denied: Insufficient permissions' });
            }

            next(); // Role is allowed, proceed to the next middleware or route handler
        } catch (error) {
            console.error('Error in allowRoles middleware:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
};

module.exports = { allowRoles };
