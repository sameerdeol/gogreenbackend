const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization'); // ✅ fixed typo
const { searchAll } = require('../controllers/searchProductController');

router.post('/searchproducts', searchAll); // apply if needed

module.exports = router;
