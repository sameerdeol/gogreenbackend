const ChatModel = require("../models/ChatModel");

module.exports = (io) => {

  io.on("connection", (socket) => {
    console.log("💬 Chat socket connected:", socket.id);

    // Receive message from rider or customer
    socket.on("send_message", async (data) => {
      console.log("📥 New Message:", data);

      try {
        // 1️⃣ Save message to DB
        await ChatModel.save(data);
        console.log("💾 Message saved to DB");
      } catch (err) {
        console.error("❌ Error saving message:", err);
      }

      // 2️⃣ Broadcast to receiver room
      io.to(`customer_${data.receiver_id}`).emit("receive_message", data);
      io.to(`rider_${data.sender_id}`).emit("receive_message", data);
    });

  });

};
