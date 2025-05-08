const express = require('express');
const {
    loginadmin,
    updatePassword,
    updateUser, 
    appsignup, 
    verifyUser,
    getUnverifiedUsers,
    vendorRiderSignup, 
    createSuperadminManagers,
    vendorRiderVerification,
    vendorRiderLogin,
    updateWorkersProfile,
    workersProfile,
    workerStatus,
    sendOTP,
    resetPassword,
    allVendors,
    verifyOtp
} = require('../controllers/userController');

const { authenticateToken } = require('../middleware/authMiddleware');
const uploadFields = require('../middleware/multerConfig'); 
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
 * Vendor & Rider verification
 */
router.post(['/vendor-verification', '/rider-verification'],verifyToken, uploadFields, (req, res, next) => {
    if (req.files?.identity_proof?.[0]) {
        req.body.identity_proof = req.files.identity_proof[0].path || null; // ✅ Full URL
    }

    vendorRiderVerification(req, res);
});

router.post(['/update-vendorPassword', '/update-riderPassword'],verifyToken,updatePassword);
router.put(['/update-vendorProfile', '/update-riderProfile', '/update-customerProfile'],uploadFields,updateWorkersProfile);
router.post(['/vendor-login', '/rider-login'], vendorRiderLogin);
router.post(['/vendor-signup', '/rider-signup'], vendorRiderSignup);
router.post(['/vendor-profile', '/rider-profile', '/customer-profile'], verifyToken,workersProfile);
router.post(['/vendor-status', '/rider-status'], verifyToken,workerStatus);
router.post(['/send-vendorOtp', '/send-riderOtp'], sendOTP);
router.post(['/verifyotp'], verifyOtp);
router.post(['/reset-vendorPwd', '/reset-riderPwd'], resetPassword);
router.post(['/all-vendors'], verifyToken, allVendors);

/**
 * User Management Routes (Protected)
 */
router.put('/update-user', authenticateToken, updateUser);
router.get('/unverifiedUsers', authenticateToken, getUnverifiedUsers);
router.put('/verify-user', authenticateToken, verifyUser);






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

module.exports = router;
