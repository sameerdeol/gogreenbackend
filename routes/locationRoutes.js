const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {getLatLngByPlaceName} = require("../controllers/locationController");
 
router.get("/get_location", getLatLngByPlaceName);
 
module.exports = router;