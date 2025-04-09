const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {createOrder, getOrdersByUserId} = require("../controllers/orderController");
 
router.post("/createorder", verifyToken, createOrder);
router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
 
module.exports = router;