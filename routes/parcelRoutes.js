const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { createParcel,getParcel,getParcelbyID } = require("../controllers/parcelController");

// No io for now, keep it simple
router.post("/create", verifyToken, createParcel);
router.get("/getall/:user_id", verifyToken, getParcel);
router.get("/getbyid/:user_id/:id", verifyToken, getParcelbyID);
router.get("/getall/:user_id/today", verifyToken, getParcel);
router.get("/getall/:user_id/:date", verifyToken, getParcel);
module.exports = router;
