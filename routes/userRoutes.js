const express = require('express');
const {
    loginadmin,
    updateUser, 
    appsignup, 
    verifyUser,
    getUnverifiedUsers,
    createSuperadminManagers,
    workersProfile,
    userBankDetails
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { verifyToken } = require('../middleware/authroization');
const router = express.Router();

/**
 * App Signup - Customer (role_id 5) doesn't need authentication
 */
router.post('/appsignup', (req, res) => {
    req.body.role_id = req.body.role_id ?? 5; // Default role_id to 5 if not provided
    return appsignup(req, res);
});

/**
 * User Management Routes (Protected)
 */
router.put('/update-user', authenticateToken, updateUser);
router.get('/unverifiedUsers', authenticateToken, getUnverifiedUsers);
router.put('/verify-user', verifyUser);
router.post(['/vendor-profile', '/rider-profile', '/customer-profile'], verifyToken,workersProfile);


/**
 * Create Superadmins & Managers
 */
router.post('/createadmins', authenticateToken, (req, res) => {
    let { role_id } = req.body;
    role_id = parseInt(role_id);

    if (![1, 2].includes(role_id)) {
        return res.status(400).json({ success: false, message: "Invalid role_id" });
    }

    createSuperadminManagers(req, res);
});

router.post('/adminlogin',loginadmin);
router.post('/addbankdetails', uploadFields, userBankDetails);

module.exports = router;
