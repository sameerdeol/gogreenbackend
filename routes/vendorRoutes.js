const express = require('express');
const vendorController = require('../controllers/vendorController');
const userController = require('../controllers/userController');
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
router.post('/update-vendorProfile', verifyToken, vendorController.updateVendorProfile);
router.put('/update-vendorProfile', verifyToken, uploadFields, vendorController.updateVendorProfile);
router.post('/vendor-login',  vendorController.vendorLogin); // Optional - remove verifyToken if login is public
router.post('/vendor-signup',  vendorController.vendorSignup); // Optional - remove verifyToken if signup is public
router.post('/vendor-profile', verifyToken, vendorController.vendorProfile);
router.post('/vendor-status', verifyToken, vendorController.vendorStatus);
router.post('/send-vendorOtp',  userController.sendOTP); // If needed, implement in vendorController
router.post('/reset-vendorPwd',  userController.resetPassword); // If needed, implement in vendorController
router.post('/verifyotp',  userController.verifyOtp); // If needed, implement in vendorController
router.put('/change-vendorPwd', userController.changePassword); // If needed, implement in riderController
router.post('/all-vendors', verifyToken, vendorController.allVendors);
router.post('/store-bussinessdetails', verifyToken, uploadFields, vendorController.storeBusinessDetails);
router.post('/store-additionaldetails', verifyToken, uploadFields, vendorController.storeAdditionalDetails);
router.get('/getallvendorsforadmin', verifyToken, vendorController.allVendorsforAdmin);
router.get('/getallvendorsforadminbyID/:vendor_id', verifyToken, vendorController.allVendorsforAdminbyVendorID);
router.post('/vendor-bankdetails', verifyToken, vendorController.vendorBankDetails);
router.post('/vendor-analytics', verifyToken, vendorController.vendorAnalytics);
router.get('/getallvendorsbySubcat/:subcat_id', verifyToken, vendorController.allVendorsforAdminbySubcatID);
router.post('/vendorbyid', verifyToken, vendorController.VendorbyID);


module.exports = router;
