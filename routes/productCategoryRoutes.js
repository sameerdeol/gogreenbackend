const express = require('express');
const router = express.Router();
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const {
    createCategory,
    getCategoryById,
    updateCategoryById,
    deleteCategoryById,
    getAllCategories
} = require('../controllers/productCategoryController');

// Route to create a new category - only managers can create categories
router.post('/categories', checkManagerRole, createCategory);

// Route to get a category by ID
router.get('/categories/:id', getCategoryById);

// Route to get the list of categories
router.get('/categories', getAllCategories);

// Route to update a category - only managers can update categories
router.put('/categories', checkManagerRole, updateCategoryById);

// Route to delete a category - only managers can delete categories
router.delete('/categories', checkManagerRole, deleteCategoryById);

module.exports = router;
