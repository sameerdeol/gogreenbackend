// routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
    createDiscount,
    updateDiscount,
    deleteDiscount
} = require('../controllers/discountController');

router.post('/add-discount', verifyToken, createDiscount);
router.put('/update-discount', verifyToken, updateDiscount);
router.delete('/delete-discount', verifyToken, deleteDiscount);

module.exports = router;
