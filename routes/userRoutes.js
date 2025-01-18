const express = require('express');
const { allowRoles } = require('../middleware/roleMiddleware');
const { signup, loginUser, getDashboard } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Signup route where Customer (role_id 5) does not require authentication
router.post('/signup', (req, res, next) => {
    let { role_id } = req.body; // Assuming role_id is in the request body for signup

    // If role_id is null or undefined, assume it's 5 (Customer)
    if (role_id === null || role_id === undefined) {
        role_id = 5;
    }

    // If role_id is 5 (Customer), bypass authenticateToken
    if (role_id === 5) {
        return signup(req, res);  // Call the signup directly without authentication
    }

    // For other roles, apply authenticateToken
    authenticateToken(req, res, next);
}, signup);


router.post('/login', loginUser);
router.get('/dashboard', authenticateToken, getDashboard);

module.exports = router;
