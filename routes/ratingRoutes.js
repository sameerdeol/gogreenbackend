// routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
    giveRating,
    getAverageRating
} = require('../controllers/ratingController');

router.post('/add', giveRating);
router.get('/average', getAverageRating);  

module.exports = router;
