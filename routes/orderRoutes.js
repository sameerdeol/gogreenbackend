const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {createOrder, getOrdersByUserId,  updateOrderStatus} = require("../controllers/orderController");
 
router.post("/createorder",   createOrder);
router.put('/updateorderstatus',  updateOrderStatus);
router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
 
module.exports = router;