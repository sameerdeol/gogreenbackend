const express = require('express');
const router = express.Router();
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const multer = require('multer');
const { verifyToken } = require('../middleware/authroization');
const upload = multer(); // No storage, just parsing
const {
    getsingleproductsbyvendorID,
    getallproductsbyvendorID,
    createProduct,
    getProductById,
    updateProductById,
    deleteProductById,
    getProducts,
    setProductTodayDeal,
    setProductFeatured,
    getProductsByType,
    getproductbycatgeoryID,
    getproductbycatvenID,
    getproductbybrandID,
    bestSellProducts,
    getFilteredProducts
} = require('../controllers/productController');

// Route to create a new product - only managers can create products
router.post('/products', verifyToken, uploadFields, createProduct);

router.post('/productbyvendorid/', verifyToken,getsingleproductsbyvendorID);
// get list of products
router.post('/getallproductsbyvendorID/', verifyToken,getallproductsbyvendorID);

// Route to get a product by ID
router.post('/productbyid/', upload.none(), verifyToken,getProductById);
// get list of products
router.post('/getproducts/', verifyToken,getProducts);

// Route to update a product by ID - only managers can update products
router.post('/update-products', verifyToken, uploadFields, updateProductById);
router.delete('/delete-product', verifyToken, uploadFields, deleteProductById);

// Route to delete a product by ID - only managers can delete products
router.delete('/products', checkManagerRole, deleteProductById);

router.put('/makeproductfeatures', checkManagerRole, setProductFeatured);
router.put('/makeproductweeklydeal', checkManagerRole, setProductTodayDeal);

router.post('/featuredproducts', verifyToken, (req, res) => {
    req.body.type = 'featured';  // Set type statically
    getProductsByType(req, res);
});

router.post('/weeklydealproducts', verifyToken, (req, res) => {
    req.body.type = 'today_deal';  // Set type statically
    getProductsByType(req, res);
});

//get product by category or sub-category  id
router.post('/productbycategoryid', verifyToken,getproductbycatgeoryID);

//get product by catyegory and vendor id
router.post('/productbycat-vendorId', verifyToken, getproductbycatvenID);

//get product by brand id
router.post('/productbybrandID', verifyToken, getproductbybrandID);

router.post('/bestsellerproducts', verifyToken, bestSellProducts);

router.post("/filter", productController.getFilteredProducts);

module.exports = router;
