const express = require('express');
const router = express.Router();
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const {
    checkManagerRole, // Role checking middleware
    createProduct,
    getProductById,
    updateProductById,
    deleteProductById,
    getProducts
} = require('../controllers/productController');

// Route to create a new product - only managers can create products
router.post('/products', checkManagerRole, uploadFields, createProduct);

// Route to get a product by ID
router.get('/products/:id', getProductById);
// get list of products
router.get('/products/', getProducts);

// Route to update a product by ID - only managers can update products
router.put('/products', checkManagerRole, uploadFields, updateProductById);

// Route to delete a product by ID - only managers can delete products
router.delete('/products', checkManagerRole, deleteProductById);

module.exports = router;
