const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {getLatLngByPlaceName, getCordinates} = require("../controllers/locationController");
 
router.get("/get_location", verifyToken, getLatLngByPlaceName);
router.get("/getcordinates/:order_id", verifyToken, getCordinates);
 
module.exports = router;