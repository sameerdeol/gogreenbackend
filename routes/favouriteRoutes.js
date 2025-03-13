const express = require('express');
const router = express.Router();
const {addFavourite,getUserFavouritesdetails,removeFavourite} = require('../controllers/favouriteController');

router.post('/addfavourite', addFavourite);
router.post('/getfavouritebyuserid', getUserFavouritesdetails);
router.delete('/removefavoruite', removeFavourite);

module.exports = router;
