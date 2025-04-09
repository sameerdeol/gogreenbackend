const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization'); // ✅ fixed typo
const { searchProduct } = require('../controllers/searchProductController');

router.post('/searchproducts', searchProduct); // apply if needed

module.exports = router;
