const express = require('express');
const vendorController = require('../controllers/vendorController');
const uploadFields = require('../middleware/multerConfig');
const { verifyToken } = require('../middleware/authroization');
const router = express.Router();

// Vendor Type CRUD Endpoints
router.post('/type', verifyToken, uploadFields, vendorController.createVendorType);
router.get('/type', verifyToken, vendorController.getAllVendorTypes);
router.put('/type/:id', verifyToken, uploadFields, vendorController.updateVendorType);
router.delete('/type/:id', verifyToken, vendorController.deleteVendorType);

// Vendor Operations
router.post('/vendor-verification', verifyToken, uploadFields, vendorController.vendorVerification);
router.post('/update-vendorPassword', verifyToken, vendorController.updateVendorProfile);
router.put('/update-vendorProfile', verifyToken, uploadFields, vendorController.updateVendorProfile);
router.post('/vendor-login',  vendorController.vendorLogin); // Optional - remove verifyToken if login is public
router.post('/vendor-signup',  vendorController.vendorSignup); // Optional - remove verifyToken if signup is public
router.post('/vendor-profile', verifyToken, vendorController.vendorProfile);
router.post('/vendor-status', verifyToken, vendorController.vendorStatus);
router.post('/send-vendorOtp',  (req, res) => {}); // If needed, implement in vendorController
router.post('/reset-vendorPwd',  (req, res) => {}); // If needed, implement in vendorController
router.put('/chnage-vendorPwd', verifyToken, (req, res) => {}); // If needed, implement in vendorController
router.post('/all-vendors', verifyToken, vendorController.allVendors);
router.post('/store-bussinessdetails', verifyToken, uploadFields, vendorController.storeBusinessDetails);
router.post('/store-additionaldetails', verifyToken, uploadFields, vendorController.storeAdditionalDetails);
router.get('/getallvendorsforadmin', verifyToken, vendorController.allVendorsforAdmin);
router.get('/getallvendorsforadminbyID/:vendor_id', verifyToken, vendorController.allVendorsforAdminbyVendorID);

module.exports = router;
