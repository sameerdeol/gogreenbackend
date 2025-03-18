const express = require('express');
const router = express.Router();
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const uploadFields = require('../middleware/multerConfig');  // Import your uploadFields middleware
const { verifyToken } = require('../middleware/authroization');
const {
    selectProductcategoryfirst,
    dynamicCategoryData1,
    dynamicCategoryData2
} = require('../controllers/dynamicCategory');

// Route to create a new product brand - only managers can create brands
router.put('/save-categories', checkManagerRole, selectProductcategoryfirst);
router.get('/dynamicCategoryDataone', verifyToken,dynamicCategoryData1);
router.get('/dynamicCategoryDatatwo', verifyToken,dynamicCategoryData2);

module.exports = router;
