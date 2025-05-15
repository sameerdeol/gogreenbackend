const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {createOrder, getOrdersByUserId, acceptOrder} = require("../controllers/orderController");
 
router.post("/createorder",  verifyToken, createOrder);
router.put('/acceptorders', verifyToken, acceptOrder);
router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
 
module.exports = router;