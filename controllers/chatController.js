const ChatModel = require('../models/ChatModel');

const getChat = async (req, res) => {
  try {
    const { ride_id, rider_id, customer_id } = req.body;

    if (!ride_id || !rider_id || !customer_id) {
      return res.status(400).json({ error: "ride_id, rider_id, customer_id required" });
    }

    const messages = await ChatModel.getMessages(ride_id, rider_id, customer_id);

    return res.status(200).json({
      status: true,
      message: "Chat loaded",
      data: messages
    });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getChat };
