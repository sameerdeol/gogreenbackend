const express = require('express');
const router = express.Router();
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const multer = require('multer');
const { verifyToken } = require('../middleware/authroization');
const upload = multer(); // No storage, just parsing
const {
    createProduct,
    getProductById,
    updateProductById,
    deleteProductById,
    getProducts,
    setProductTodayDeal,
    setProductFeatured,
    getFeaturedProducts,
    getTodayDealProducts,
    getproductbycatgeoryID
} = require('../controllers/productController');

// Route to create a new product - only managers can create products
router.post('/products', checkManagerRole, uploadFields, createProduct);

// Route to get a product by ID
router.post('/productbyid/', upload.none(), verifyToken,getProductById);
// get list of products
router.post('/getproducts/', verifyToken,getProducts);

// Route to update a product by ID - only managers can update products
router.put('/products', checkManagerRole, uploadFields, updateProductById);

// Route to delete a product by ID - only managers can delete products
router.delete('/products', checkManagerRole, deleteProductById);

router.put('/makeproductfeatures', checkManagerRole, setProductFeatured);
router.put('/makeproductweeklydeal', checkManagerRole, setProductTodayDeal);

router.post('/featuredproducts', verifyToken,getFeaturedProducts);
router.post('/productbycategoryid', verifyToken,getproductbycatgeoryID);
router.post('/weeklydealproducts', verifyToken,getTodayDealProducts);

module.exports = router;
