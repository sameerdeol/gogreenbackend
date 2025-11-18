const ChatModel = require("../models/ChatModel");

module.exports = (io) => {

  io.on("connection", (socket) => {
    console.log("💬 Chat socket connected:", socket.id);

    // -----------------------------
    // JOIN CUSTOMER ROOM
    // -----------------------------
    socket.on("join_customer", ({ customer_id }) => {
      socket.join(`customer_${customer_id}`);
      console.log(`📌 Customer joined room: customer_${customer_id}`);
    });

    // -----------------------------
    // JOIN RIDER ROOM
    // -----------------------------
    socket.on("join_rider", ({ rider_id }) => {
      socket.join(`rider_${rider_id}`);
      console.log(`📌 Rider joined room: rider_${rider_id}`);
    });

    // -----------------------------
    // SEND MESSAGE
    // -----------------------------
    socket.on("send_message", async (data) => {
      console.log("📥 New Message:", data);

      // 1️⃣ SAVE MESSAGE TO DB (KEEP THIS)
      try {
        await ChatModel.save(data);
        console.log("💾 Message saved to database");
      } catch (err) {
        console.log("❌ DB Error:", err);
      }

      // 2️⃣ SEND TO CORRECT ROOM BASED ON sender_type
      if (data.sender_type === "customer") {
        // customer → rider
        io.to(`rider_${data.receiver_id}`).emit("receive_message", data);
      }

      if (data.sender_type === "rider") {
        // rider → customer
        io.to(`customer_${data.receiver_id}`).emit("receive_message", data);
      }
    });
  });
};
