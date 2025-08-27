const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { checkManagerRole } = require('../middleware/checkManagerRoll');
const {
  createOrder,
  getOrdersByUserId,
  updateOrderStatus,
  getOrdersByVendorIdandRiderID,
  getOrderDetails,
  updateOrderTiming,
  verifyOtp,
  getAllOrders,
  orderHistory,
  handleOrderByRider,
  orderDetailsForRider
} = require("../controllers/orderController");

// Accept `io` when initializing routes
module.exports = (io) => {
  router.post("/createorder", verifyToken, createOrder);
  router.put('/updateorderstatus', verifyToken, updateOrderStatus);
  router.post('/getorderbyuserID', verifyToken, getOrdersByUserId);
  router.post('/getorderdetails', verifyToken, getOrderDetails);
  router.post('/getallorderbyvendorid/:filter', verifyToken, getOrdersByVendorIdandRiderID);
  router.post('/list', verifyToken, getAllOrders);
  router.post('/updateordertiming', verifyToken, updateOrderTiming);

  // 🛠️ Wrap in a callback to pass io
  router.post('/verifyotprider', verifyToken, (req, res) =>
    verifyOtp(req, res, io)
  );

  router.post('/orderhistorybyuserid', verifyToken, orderHistory);

  // 🛠️ Pass io to the controller function
  router.post('/handle-orderbyrider', verifyToken, (req, res) =>
    handleOrderByRider(req, res, io)
  );

  router.get('/orderdetailsforrider/:rider_id', verifyToken, orderDetailsForRider);
  
  return router;
};
