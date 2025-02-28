const express = require('express');
const router = express.Router();
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const uploadFields = require('../middleware/multerConfig');  // Import your uploadFields middleware
const {
    createSubcategory,
    getSubcategoryById,
    updateSubcategoryById,
    deleteSubcategoryById,
    getAllSubcategories
} = require('../controllers/productSubcategoryController');

// Route to create a new subcategory - only managers can create subcategories
router.post('/subcategories', checkManagerRole,uploadFields, createSubcategory);

// Route to get a subcategory by ID
router.get('/subcategories/:id', getSubcategoryById);

// Route to get the list of subcategories
router.get('/subcategories', getAllSubcategories);

// Route to update a subcategory - only managers can update subcategories
router.put('/subcategories', checkManagerRole,uploadFields, updateSubcategoryById);

// Route to delete a subcategory - only managers can delete subcategories
router.delete('/subcategories', checkManagerRole, deleteSubcategoryById);

module.exports = router;
