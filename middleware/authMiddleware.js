const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Assumes token is in `Bearer <token>`

    if (!token) {
        return res.status(401).send('Access Denied');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Attach decoded user information to request object
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
};

module.exports = { authenticateToken };
