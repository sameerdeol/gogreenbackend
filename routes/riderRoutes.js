const express = require('express');
const riderController = require('../controllers/riderController');
const userController = require('../controllers/userController');
const uploadFields = require('../middleware/multerConfig');
const { verifyToken } = require('../middleware/authroization');
const router = express.Router();

router.post('/rider-verification', verifyToken, uploadFields, riderController.riderVerification);
router.post('/rider-personaldetails', verifyToken, uploadFields, riderController.riderPersonalDetails);
router.post('/update-riderPassword', verifyToken, riderController.updateRiderProfile);
router.put('/update-riderProfile', verifyToken, uploadFields, riderController.updateRiderProfile);
router.put('/update-riderVehicledetails', verifyToken, uploadFields, riderController.updateVehicleDetails);
router.post('/rider-login', riderController.riderLogin);
router.post('/rider-signup', riderController.riderSignup);
router.post('/rider-profile', verifyToken, riderController.riderProfile);
router.post('/rider-vehicledetails', verifyToken, riderController.vehicleDetails);
router.post('/rider-status', verifyToken, riderController.riderStatus);
router.post('/send-riderOtp',  userController.sendOTP); // If needed, implement in vendorController
router.post('/verifyotp',  userController.verifyOtp); // If needed, implement in vendorController
router.post('/reset-riderPwd',  userController.resetPassword); // If needed, implement in vendorController
router.put('/chnage-riderPwd', userController.changePassword); // If needed, implement in riderController
router.put('/updateRider-location', verifyToken, riderController.updateRiderLocation);
router.get('/getallridersforadmin', verifyToken, riderController.allRidersforAdmin);
router.get('/getallridersforadminbyID/:rider_id', verifyToken, riderController.allRidersforAdminbyRiderID);
router.post('/rider-analytics', verifyToken, riderController.riderAnalytics);
router.post('/riderdashboard-analytics', verifyToken, riderController.riderDashboardAnalytics);
router.post('/rider-bankdetails', verifyToken, riderController.riderBankDetails);
router.post('/live-order-location', verifyToken, riderController.getLiveOrderLocation);

module.exports = router; 