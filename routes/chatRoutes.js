const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { getChat, saveChatMessage } = require("../controllers/chatController");

router.post("/messages", verifyToken, getChat);
router.post("/send", verifyToken, saveChatMessage);

module.exports = router;