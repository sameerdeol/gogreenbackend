// const ChatModel = require("../models/ChatModel");

// module.exports = (io) => {

//   io.on("connection", (socket) => {
//     console.log("💬 Chat socket connected:", socket.id);

//     // Receive message from rider or customer
//     socket.on("send_message", async (data) => {
//       console.log("📥 New Message:", data);

//       try {
//         // 1️⃣ Save message to DB
//         await ChatModel.save(data);
//         console.log("💾 Message saved to DB");
//       } catch (err) {
//         console.error("❌ Error saving message:", err);
//       }

//       // 2️⃣ Broadcast to receiver room
//       io.to(`customer_${data.receiver_id}`).emit("receive_message", data);
//       io.to(`rider_${data.sender_id}`).emit("receive_message", data);
//     });

//   });
// };
const ChatModel = require("../models/ChatModel");

module.exports = (io) => {

  io.on("connection", (socket) => {
    console.log("💬 Chat socket connected:", socket.id);

    // -----------------------------------------------------
    //  JOIN CUSTOMER SOCKET ROOM
    // -----------------------------------------------------
    socket.on("join_customer", ({ customer_id }) => {
      socket.join(`customer_${customer_id}`);
      console.log(`📌 Customer joined room: customer_${customer_id}`);
    });

    // -----------------------------------------------------
    //  JOIN RIDER SOCKET ROOM
    // -----------------------------------------------------
    socket.on("join_rider", ({ rider_id }) => {
      socket.join(`rider_${rider_id}`);
      console.log(`📌 Rider joined room: rider_${rider_id}`);
    });

    // -----------------------------------------------------
    //  SEND MESSAGE (Customer or Rider)
    // -----------------------------------------------------
    socket.on("send_message", async (data) => {
      console.log("📥 New Message:", data);

      try {
        await ChatModel.save(data);
        console.log("💾 Message saved to database");
      } catch (err) {
        console.log("❌ DB Error:", err);
      }

      // BROADCAST TO CUSTOMER ROOM
      io.to(`customer_${data.receiver_id}`).emit("receive_message", data);

      // BROADCAST TO RIDER ROOM
      io.to(`rider_${data.receiver_id}`).emit("receive_message", data);
    });
  });
};
