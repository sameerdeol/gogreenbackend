
const { verifyToken } = require('../middleware/authroization');
const express = require('express');
const router = express.Router();
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const { getChat, saveChatMessage } = require("../controllers/chatController");

  // ⭐ FIX: GET → POST
  router.post("/messages", verifyToken, getChat);

  router.post("/send", verifyToken, (req, res) =>
    saveChatMessage(req, res, io)
  );

module.exports = router;