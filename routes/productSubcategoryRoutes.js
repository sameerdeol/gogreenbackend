const express = require('express');
const router = express.Router();
const {
    checkManagerRole, // Role checking middleware
    createSubcategory,
    getSubcategoryById,
    updateSubcategory,
    deleteSubcategory,
    getSubcategories
} = require('../controllers/productSubcategoryController');

// Route to create a new subcategory - only managers can create subcategories
router.post('/subcategories', checkManagerRole, createSubcategory);

// Route to get a subcategory by ID
router.get('/subcategories/:id', getSubcategoryById);

// Route to get the list of subcategories
router.get('/subcategories', getSubcategories);

// Route to update a subcategory - only managers can update subcategories
router.put('/subcategories', checkManagerRole, updateSubcategory);

// Route to delete a subcategory - only managers can delete subcategories
router.delete('/subcategories', checkManagerRole, deleteSubcategory);

module.exports = router;
