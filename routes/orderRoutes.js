const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {} = require('../middleware/checkManagerRoll');
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const {createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorId, getOrderDetails, updateOrderTiming, verifyOtp, getAllOrders, orderHistory} = require("../controllers/orderController");
 
router.post("/createorder", verifyToken,  createOrder);
router.put('/updateorderstatus', verifyToken,  updateOrderStatus);
router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
router.post('/getorderdetails', verifyToken, getOrderDetails);
router.post('/getallorderbyvendorid', verifyToken, getOrdersByVendorId);
router.post('/list', verifyToken, getAllOrders);
router.post('/updateordertiming', verifyToken, updateOrderTiming);
router.post('/verifyotprider', verifyOtp);
router.post('/orderhistorybyuserid', verifyToken, orderHistory);

 
module.exports = router;