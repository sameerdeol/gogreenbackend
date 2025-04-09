// routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const { verifyToken } = require('../middleware/authroization');
const {
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getDiscounts
} = require('../controllers/discountController');

router.post('/add-discount', checkManagerRole, createDiscount);
router.get('/get-discounts', checkManagerRole, getDiscounts);
router.put('/update-discount', checkManagerRole, updateDiscount);
router.delete('/delete-discount', checkManagerRole, deleteDiscount);

module.exports = router;
