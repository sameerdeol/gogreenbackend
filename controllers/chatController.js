const ChatModel = require('../models/ChatModel');

// ==============================
// ⭐ GET CHAT HISTORY
// ==============================
const getChat = (req, res) => {
  const { ride_id, rider_id, customer_id } = req.body;

  if (!ride_id || !rider_id || !customer_id) {
    return res.status(400).json({ error: "ride_id, rider_id, customer_id required" });
  }

  ChatModel.findMessages(ride_id, rider_id, customer_id, (err, messages) => {
    if (err) {
      console.error("Chat Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({
      status: true,
      message: "Chat loaded",
      data: messages
    });
  });
};

// ==============================
// ⭐ SAVE CHAT MESSAGE
// ==============================
const saveChatMessage = (req, res) => {
  const data = req.body;

  ChatModel.save(data, (err, result) => {
    if (err) {
      console.error("Chat Save Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({
      status: true,
      message: "Message saved successfully"
    });
  });
};

// Export in your preferred structure
module.exports = {
  getChat,
  saveChatMessage
};
