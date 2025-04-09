// routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
    createDiscount,
    updateDiscount,
    deleteDiscount
} = require('../controllers/discountController');

router.post('/add-discount', createDiscount);
router.put('/update-discount', updateDiscount);
router.delete('/delete-discount', deleteDiscount);

module.exports = router;
