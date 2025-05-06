const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization'); // ✅ fixed typo
const { searchProduct, vendorbySearchProduct } = require('../controllers/searchProductController');

router.post('/searchproducts', verifyToken ,searchProduct); // apply if needed

//all vendors according to seach products
router.post('/vendorsbysearchproduct', verifyToken, vendorbySearchProduct);

module.exports = router;
