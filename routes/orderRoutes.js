const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorId, getOrderDetails, updateOrderTiming, verifyOtp} = require("../controllers/orderController");
 
router.post("/createorder",   createOrder);
router.put('/updateorderstatus',  updateOrderStatus);
router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
router.post('/getorderdetails', verifyToken, getOrderDetails);
router.post('/getallorderbyvendorid', verifyToken, getOrdersByVendorId);
router.post('/updateordertiming', updateOrderTiming);
router.post('/verifyotprider', verifyOtp);

 
module.exports = router;