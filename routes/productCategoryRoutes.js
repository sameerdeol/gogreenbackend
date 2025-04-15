const express = require('express');
const router = express.Router();
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const uploadFields = require('../middleware/multerConfig');  // Import your uploadFields middleware
const { verifyToken } = require('../middleware/authroization');
const {
    createCategory,
    getCategoryById,
    updateCategoryById,
    deleteCategoryById,
    getAllCategories
} = require('../controllers/productCategoryController');

// Route to create a new category - only managers can create categories
router.post('/categories', checkManagerRole,uploadFields, createCategory);

// Route to get a category by ID
router.get('/categories/:id', verifyToken,getCategoryById);

// Route to get the list of categories
router.post('/fetch-categories', verifyToken,getAllCategories);

// Route to update a category - only managers can update categories
router.put('/categories', checkManagerRole,uploadFields, updateCategoryById);

// Route to delete a category - only managers can delete categories
router.delete('/categories', checkManagerRole, deleteCategoryById);

module.exports = router;
