const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { getChat, saveChatMessage } = require("../controllers/chatController");

// Attach io to req inside server.js instead
router.post("/messages", verifyToken, getChat);

router.post("/send", verifyToken, (req, res) => {
  const io = req.app.get("socketio");   // <<< we access io this way
  saveChatMessage(req, res, io);
});

module.exports = router;
