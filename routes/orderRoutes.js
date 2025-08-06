const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const {
  createOrder,
  getOrdersByUserId,
  updateOrderStatus,
  getOrdersByVendorId,
  getOrderDetails,
  updateOrderTiming,
  verifyOtp,
  getAllOrders,
  orderHistory,
  handleOrderByRider
} = require("../controllers/orderController");

// Accept `io` when initializing routes
module.exports = (io) => {
  router.post("/createorder", verifyToken, createOrder);
  router.put('/updateorderstatus', verifyToken, updateOrderStatus);
  router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
  router.post('/getorderdetails', verifyToken, getOrderDetails);
  router.post('/getallorderbyvendorid', verifyToken, getOrdersByVendorId);
  router.post('/list', verifyToken, getAllOrders);
  router.post('/updateordertiming', verifyToken, updateOrderTiming);
  router.post('/verifyotprider', verifyOtp);
  router.post('/orderhistorybyuserid', verifyToken, orderHistory);

  // 🛠️ Pass `io` to the controller function
  router.post('/handle-orderbyrider', verifyToken, (req, res) =>
    handleOrderByRider(req, res, io)
  );

  return router;
};
