const express = require('express');
const router = express.Router();
const {addFavourite,getUserFavouritesdetails,removeFavourite} = require('../controllers/favouriteController');
const { verifyToken } = require('../middleware/authroization');

router.post('/addfavourite', verifyToken,addFavourite);
router.post('/getfavouritebyuserid', verifyToken,getUserFavouritesdetails);
router.delete('/removefavoruite', verifyToken,removeFavourite);

module.exports = router;
