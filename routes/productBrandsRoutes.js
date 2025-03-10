const express = require('express');
const router = express.Router();
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const uploadFields = require('../middleware/multerConfig');  // Import your uploadFields middleware
const {
    createProductBrand,
    getProductBrandById,
    updateProductBrandById,
    deleteProductBrandById,
    getAllProductBrands,
    fetchbrandbycatID
} = require('../controllers/productBrandsController');

// Route to create a new product brand - only managers can create brands
router.post('/product-brands', checkManagerRole, uploadFields, createProductBrand);

// fetch brands by product category
router.post('/product-brandsbyCategory',fetchbrandbycatID);

// Route to get a product brand by ID
router.get('/product-brands', getProductBrandById);

// Route to get the list of product brands
router.get('/allProduct-brands', getAllProductBrands);

// Route to update a product brand - only managers can update brands
router.put('/product-brands', checkManagerRole, uploadFields, updateProductBrandById);  // Add uploadFields for updating

// Route to delete a product brand - only managers can delete brands
router.delete('/product-brands', checkManagerRole, deleteProductBrandById);

module.exports = router;
