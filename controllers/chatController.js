const ChatModel = require('../models/ChatModel');

const getChat = async (req, res) => {
  try {
    const { ride_id, rider_id } = req.query;

    if (!ride_id || !rider_id) {
      return res.status(400).json({ error: "ride_id and rider_id are required" });
    }

    const messages = await ChatModel.getMessages(ride_id, rider_id);

    return res.status(200).json(messages);

  } catch (error) {
    console.error("Error loading chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getChat };
