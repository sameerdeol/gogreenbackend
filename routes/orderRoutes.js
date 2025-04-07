const express = require("express");
const router = express.Router();
const {createOrder, getOrdersByUserId} = require("../controllers/orderController");
 
router.post("/createorder", createOrder);
router.post('/getorderbyuserID', getOrdersByUserId);
 
module.exports = router;