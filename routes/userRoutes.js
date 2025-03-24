const express = require('express');
// const { allowRoles } = require('../middleware/roleMiddleware');
const { signup, loginUser, getDashboard, getuserDetails, fetchUser, updateUser,appsignup, verifyUser, getUnverifiedDeliveryPartners, getUnverifiedVendors } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const uploadFields = require('../middleware/multerConfig');  // Import your uploadFields middleware


const router = express.Router();

// Signup route where Customer (role_id 5) does not require authentication
router.post('/signup', uploadFields, (req, res, next) => {
    let { role_id } = req.body;
    role_id = parseInt(role_id) || 5;

    // console.log("Uploaded Files:", req.files);

    // ✅ Ensure `identity_proof` exists before accessing
    if (req.files?.identity_proof?.length > 0) {
        req.file = req.files.identity_proof[0]; // Manually assign it
    }

    // console.log("Final Uploaded File:", req.file);

    if ([3, 4, 5].includes(role_id)) {
        return signup(req, res);
    }

    authenticateToken(req, res, () => signup(req, res));
});




router.post('/appsignup', (req, res, next) => {
    let { role_id } = req.body; // Assuming role_id is in the request body for signup

    // If role_id is null or undefined, assume it's 5 (Customer)
    if (role_id === null || role_id === undefined) {
        role_id = 5;
    }

    // If role_id is 5 (Customer), bypass authenticateToken
    if (role_id === 5) {
        return appsignup(req, res);  // Call the signup directly without authentication
    }

    // For other roles, apply authenticateToken
    authenticateToken(req, res, next);
}, appsignup);

router.post('/login', loginUser);
router.put('/update-user', authenticateToken,updateUser);
router.get('/get-userDetails', authenticateToken,getuserDetails);
router.get('/dashboard', authenticateToken, getDashboard);
router.get('/fetchuser', authenticateToken, fetchUser);
router.get('/unverifiedVendors', authenticateToken, getUnverifiedVendors);
router.get('/unverifieddeliverypartners', authenticateToken, getUnverifiedDeliveryPartners);
router.put('/verify-user', authenticateToken, verifyUser);


module.exports = router;
