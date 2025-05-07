const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization'); // ✅ fixed typo
const { searchAll, itemSearch } = require('../controllers/searchProductController');

router.post('/searchproducts', searchAll); // apply if needed

router.post('/itembysearch', itemSearch); // apply if needed
module.exports = router;
