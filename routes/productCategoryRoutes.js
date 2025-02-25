const express = require('express');
const router = express.Router();
const {
    checkManagerRole, // Role checking middleware
    createCategory,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCategories
} = require('../controllers/productCategoryController');

// Route to create a new category - only managers can create categories
router.post('/categories', checkManagerRole, createCategory);

// Route to get a category by ID
router.get('/categories/:id', getCategoryById);

// Route to get the list of categories
router.get('/categories', getCategories);

// Route to update a category - only managers can update categories
router.put('/categories', checkManagerRole, updateCategory);

// Route to delete a category - only managers can delete categories
router.delete('/categories', checkManagerRole, deleteCategory);

module.exports = router;
