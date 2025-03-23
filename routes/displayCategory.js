const express = require('express');
const router = express.Router();
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const uploadFields = require('../middleware/multerConfig');  // Import your uploadFields middleware
const { verifyToken } = require('../middleware/authroization');
const {
    selectProductcategoryfirst,
    dynamicCategoryData,
    showselectedcategory
} = require('../controllers/dynamicCategory');

// Route to create a new product brand - only managers can create brands
router.put('/save-categories', checkManagerRole, selectProductcategoryfirst);
router.post('/dynamicCategory', verifyToken,dynamicCategoryData);
// router.post('/showselectedcategory', verifyToken,showselectedcategory);

module.exports = router;
