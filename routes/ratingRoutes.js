// routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
    giveRating,
    getAverageRating,
    getAllRatingByUserId

} = require('../controllers/ratingController');
router.post('/getAllRating',verifyToken , getAllRatingByUserId)
router.post('/add',verifyToken, giveRating);
router.get('/average', getAverageRating);  

module.exports = router;
