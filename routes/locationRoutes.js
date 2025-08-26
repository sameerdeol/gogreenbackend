const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {getLatLngByPlaceName, getPolyLines} = require("../controllers/locationController");
 
router.get("/get_location", verifyToken, getLatLngByPlaceName);
router.get("/getpolylines/:order_id", verifyToken, getPolyLines);
 
module.exports = router;