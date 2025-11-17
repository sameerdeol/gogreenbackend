const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { getChat, saveChatMessage } = require("../controllers/chatController");

// Export router with access to io
module.exports = (io) => {

  // ⭐ Get chat history for a specific ride + rider
  router.get("/messages", verifyToken, getChat);

  // ⭐ Save message (if you also want REST API version besides socket)
  router.post("/send", verifyToken, (req, res) =>
    saveChatMessage(req, res, io)
  );

  return router;
};
