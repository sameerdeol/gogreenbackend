const express = require("express");
const router = express.Router();

const { verifyToken } = require('../middleware/authroization');
const { getChat, saveChatMessage } = require("../controllers/chatController");

module.exports = (io) => {

  // ⭐ FIX: GET → POST
  router.post("/messages", verifyToken, getChat);

  router.post("/send", verifyToken, (req, res) =>
    saveChatMessage(req, res, io)
  );

  return router;
};
