const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization'); // ✅ fixed typo
const { searchAll, itemSearch, searchAllbyVendor, searchVendorbyProduct} = require('../controllers/searchProductController');

router.post('/searchproducts', searchAll); // apply if needed

router.post('/searchallbyVendor', searchAllbyVendor); // apply if needed

router.post('/itembysearch', verifyToken, itemSearch); // apply if needed

router.post('/searchvendoryproduct', searchVendorbyProduct); // apply if needed
module.exports = router;
