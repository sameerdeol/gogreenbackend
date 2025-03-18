const express = require('express');
const router = express.Router();
const uploadFields = require('../middleware/multerConfig');
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const { verifyToken } = require('../middleware/authroization');
const {
    createBanner,
    getAllBanners,
    getBannerById,
    updateBannerById,
    deleteBannerById
} = require('../controllers/appBannerController');

// Routes for App Banners
router.post('/app-banners', checkManagerRole, uploadFields,createBanner);
router.get('/app-banners', verifyToken,getAllBanners);
router.get('/app-bannersbyid', verifyToken,getBannerById);
router.put('/app-banners', checkManagerRole, uploadFields, updateBannerById);
router.delete('/app-banners', checkManagerRole, deleteBannerById);

module.exports = router;
