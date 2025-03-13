const express = require('express');
const router = express.Router();
const {addFavourite,getUserFavourites,removeFavourite} = require('../controllers/favouriteController');

router.post('/addfavourite', addFavourite);
router.post('/getfavouritebyuserid', getUserFavourites);
router.delete('/removefavoruite', removeFavourite);

module.exports = router;
