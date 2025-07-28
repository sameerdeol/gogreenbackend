// routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const { verifyToken } = require('../middleware/authroization');
const {
    createOrUpdateDiscount,
    deleteDiscount,
    getDiscounts
} = require('../controllers/discountController');

router.post('/add-update-discount', checkManagerRole, createOrUpdateDiscount);
router.get('/get-discounts', checkManagerRole, getDiscounts);
router.delete('/delete-discount', checkManagerRole, deleteDiscount);

module.exports = router;
