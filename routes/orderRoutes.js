const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorId} = require("../controllers/orderController");
 
router.post("/createorder",   createOrder);
router.put('/updateorderstatus',  updateOrderStatus);
router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
router.post('/getallorderbyvendorid', verifyToken, getOrdersByVendorId);
 
module.exports = router;