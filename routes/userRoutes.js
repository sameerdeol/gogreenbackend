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
    vendorRiderLogin
} = require('../controllers/userController');

const { authenticateToken } = require('../middleware/authMiddleware');
const uploadFields = require('../middleware/multerConfig'); 
const { verifyToken } = require('../middleware/authroization');

const router = express.Router();
router.post(['/vendor-signup', '/rider-signup'], vendorRiderSignup);
/**

 * Vendor & Rider verification
 */
router.post(['/vendor-verification', '/rider-verification'],verifyToken, uploadFields, (req, res, next) => {
    if (req.files?.identity_proof?.[0]) {
        req.body.identity_proof = req.files.identity_proof[0].path || null; // ✅ Full URL
    }

    vendorRiderVerification(req, res);
});

router.post(['/vendor-login', '/rider-login'], vendorRiderLogin);


/**
 * App Signup - Customer (role_id 5) doesn't need authentication
 */
router.post('/appsignup', (req, res) => {
    req.body.role_id = req.body.role_id ?? 5; // Default role_id to 5 if not provided
    return appsignup(req, res);
});


/**
 * Admin Login
 */
router.post(['/update-vendorPassword', '/update-riderPassword'],updatePassword);

/**
 * User Management Routes (Protected)
 */
router.put('/update-user', authenticateToken, updateUser);
// router.get('/get-userDetails', authenticateToken, getuserDetails);
// router.get('/fetchuser', authenticateToken, fetchUser);
// router.get('/unverifiedVendors', authenticateToken, getUnverifiedVendors);
// router.get('/unverifieddeliverypartners', authenticateToken, getUnverifiedDeliveryPartners);
router.get('/unverifiedUsers', getUnverifiedUsers);
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


module.exports = router;
