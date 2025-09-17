const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { createParcel } = require("../controllers/parcelController");

// No io for now, keep it simple
router.post("/create", verifyToken, createParcel);

module.exports = router;
