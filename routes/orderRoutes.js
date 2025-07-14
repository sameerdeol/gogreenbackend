const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {} = require('../middleware/checkManagerRoll');
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const {createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorId, getOrderDetails, updateOrderTiming, verifyOtp, getAllOrders} = require("../controllers/orderController");
 
router.post("/createorder",   createOrder);
router.put('/updateorderstatus',  updateOrderStatus);
router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
router.post('/getorderdetails', getOrderDetails);
router.post('/getallorderbyvendorid', verifyToken, getOrdersByVendorId);
router.post('/list', getAllOrders);
router.post('/updateordertiming', updateOrderTiming);
router.post('/verifyotprider', verifyOtp);

 
module.exports = router;