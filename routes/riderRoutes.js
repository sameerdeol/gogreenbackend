const express = require('express');
const riderController = require('../controllers/riderController');
const uploadFields = require('../middleware/multerConfig');
const { verifyToken } = require('../middleware/authroization');
const router = express.Router();

router.post('/rider-verification', uploadFields, riderController.riderVerification);
router.post('/rider-personaldetails', uploadFields, riderController.riderPersonalDetails);
router.post('/update-riderPassword', verifyToken, riderController.updateRiderProfile);
router.put('/update-riderProfile', verifyToken, uploadFields, riderController.updateRiderProfile);
router.post('/rider-login', riderController.riderLogin);
router.post('/rider-signup', riderController.riderSignup);
router.post('/rider-profile', riderController.riderProfile);
router.post('/rider-vehicledetails', riderController.vehicleDetails);
router.post('/rider-status', verifyToken, riderController.riderStatus);
router.post('/send-riderOtp', (req, res) => {}); // If needed, implement in riderController
router.post('/reset-riderPwd', (req, res) => {}); // If needed, implement in riderController
router.put('/chnage-riderPwd', (req, res) => {}); // If needed, implement in riderController
router.put('/updateRider-location', verifyToken, riderController.updateRiderLocation);
router.get('/getallridersforadmin', riderController.allRidersforAdmin);
router.get('/getallridersforadminbyID/:rider_id', riderController.allRidersforAdminbyRiderID);

module.exports = router; 