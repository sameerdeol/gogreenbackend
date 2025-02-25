const express = require('express');
const router = express.Router();
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const {
    createProductBrand,
    getProductBrandById,
    updateProductBrandById,
    deleteProductBrandById,
    getAllProductBrands
} = require('../controllers/productBrandsController');

// Route to create a new product brand - only managers can create brands
router.post('/product-brands', checkManagerRole, createProductBrand);

// Route to get a product brand by ID
router.get('/product-brands/:id', getProductBrandById);

// Route to get the list of product brands
router.get('/product-brands', getAllProductBrands);

// Route to update a product brand - only managers can update brands
router.put('/product-brands/:id', checkManagerRole, updateProductBrandById);

// Route to delete a product brand - only managers can delete brands
router.delete('/product-brands/:id', checkManagerRole, deleteProductBrandById);

module.exports = router;
