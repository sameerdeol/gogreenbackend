const express = require("express");
const router = express.Router();
const {createOrder} = require("../controllers/orderController");

router.post("/createorder", createOrder);

module.exports = router;
