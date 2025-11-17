// const express = require("express");
// const router = express.Router();

// const { verifyToken } = require('../middleware/authroization');
// const { getChat, saveChatMessage } = require("../controllers/chatController");

// module.exports = (io) => {

//   // ⭐ FIX: GET → POST
//   router.post("/messages", verifyToken, getChat);

//   router.post("/send", verifyToken, (req, res) =>
//     saveChatMessage(req, res, io)
//   );

//   return router;
// };
const { verifyToken } = require('../middleware/authroization');
const express = require('express');
const router = express.Router();
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const { getChat, saveChatMessage } = require("../controllers/chatController");

// Routes for User Addresses
  // ⭐ FIX: GET → POST
  router.post("/messages", verifyToken, getChat);

  router.post("/send", verifyToken, (req, res) =>
    saveChatMessage(req, res, io)
  );

module.exports = router;