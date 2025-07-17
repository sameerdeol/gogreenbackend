const express = require('express');
const vendorController = require('../controllers/vendorController');
const uploadFields = require('../middleware/multerConfig');
const { verifyToken } = require('../middleware/authroization');
const router = express.Router();

// Vendor Type CRUD Endpoints
router.post('/type', uploadFields, vendorController.createVendorType);
router.get('/type', vendorController.getAllVendorTypes);
router.put('/type/:id', uploadFields, vendorController.updateVendorType);
router.delete('/type/:id', vendorController.deleteVendorType);

router.post('/vendor-verification', uploadFields, vendorController.vendorVerification);
router.post('/update-vendorPassword', verifyToken, vendorController.updateVendorProfile);
router.put('/update-vendorProfile', verifyToken, uploadFields, vendorController.updateVendorProfile);
router.post('/vendor-login', vendorController.vendorLogin);
router.post('/vendor-signup', vendorController.vendorSignup);
router.post('/vendor-profile', verifyToken, vendorController.vendorProfile);
router.post('/vendor-status', verifyToken, vendorController.vendorStatus);
router.post('/send-vendorOtp', (req, res) => {}); // If needed, implement in vendorController
router.post('/reset-vendorPwd', (req, res) => {}); // If needed, implement in vendorController
router.put('/chnage-vendorPwd', (req, res) => {}); // If needed, implement in vendorController
router.post('/all-vendors', verifyToken, vendorController.allVendors);
router.post('/store-bussinessdetails', uploadFields, vendorController.storeBusinessDetails);
router.post('/store-additionaldetails', uploadFields, vendorController.storeAdditionalDetails);
router.get('/getallvendorsforadmin', vendorController.allVendorsforAdmin);
router.get('/getallvendorsforadminbyID/:vendor_id', vendorController.allVendorsforAdminbyVendorID);

module.exports = router; 