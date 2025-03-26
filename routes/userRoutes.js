const express = require('express');
const { 
    signup, 
    loginadmin, 
    getuserDetails, 
    fetchUser, 
    updateUser, 
    appsignup, 
    verifyUser, 
    getUnverifiedDeliveryPartners, 
    getUnverifiedVendors, 
    vendorRiderSignup, 
    createSuperadminManagers 
} = require('../controllers/userController');

const { authenticateToken } = require('../middleware/authMiddleware');
const uploadFields = require('../middleware/multerConfig'); 
const { allowRoles } = require('../middleware/roleMiddleware');  // Uncommented if needed

const router = express.Router();

/**
 * Signup route (role_id 5 does not require authentication)
 */
// router.post('/signup', uploadFields, (req, res, next) => {
//     let { role_id } = req.body;
//     role_id = parseInt(role_id) || 5;

//     // Safely handle identity proof file
//     if (req.files?.identity_proof?.[0]) {
//         req.file = req.files.identity_proof[0]; 
//     }

//     if ([3, 4, 5].includes(role_id)) {
//         return signup(req, res);
//     }

//     authenticateToken(req, res, () => signup(req, res));
// });

/**
 * Vendor & Rider Signup
 */
router.post(['/vendor-signup', '/rider-signup'], vendorRiderSignup);

/**
 * App Signup - Customer (role_id 5) doesn't need authentication
 */
router.post('/appsignup', (req, res) => {
    let { role_id } = req.body;
    role_id = role_id ?? 5; 

    return appsignup(req, res);
});


/**
 * Admin Login
 */
router.post('/adminlogin', loginadmin);

/**
 * User Management Routes (Protected)
 */
router.put('/update-user', authenticateToken, updateUser);
router.get('/get-userDetails', authenticateToken, getuserDetails);
router.get('/fetchuser', authenticateToken, fetchUser);
router.get('/unverifiedVendors', authenticateToken, getUnverifiedVendors);
router.get('/unverifieddeliverypartners', authenticateToken, getUnverifiedDeliveryPartners);
router.put('/verify-user', authenticateToken, verifyUser);

/**
 * Create Superadmins & Managers
 */
router.post('/createadmins', (req, res) => {
    let { role_id } = req.body;
    role_id = parseInt(role_id);

    if (![1, 2].includes(role_id)) {
        return res.status(400).json({ success: false, message: "Invalid role_id" });
    }

    createSuperadminManagers(req, res);
});


module.exports = router;
