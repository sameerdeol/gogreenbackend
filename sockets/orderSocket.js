const OrderModel = require("../models/orderModel");

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Rider joins the order room
    socket.on('joinOrderRoom', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`[Join Room] Rider ${socket.id} joined room: order_${orderId}`);
    });

    // Rider accepts the order (use common method)
    socket.on('acceptOrder', ({ orderId, riderId }) => {
      console.log(`[Accept Order Attempt] Rider: ${riderId}, Order: ${orderId}`);

      OrderModel.handleOrder(orderId, riderId, 2)
        .then((success) => {
          if (success) {
            console.log(`[Order Accepted] Order ${orderId} accepted by Rider ${riderId}`);

            socket.to(`order_${orderId}`).emit('stopBuzzer', { orderId });
            socket.emit('orderAccepted', { success: true });

            // 🔥 NEW: Fetch user & notify customer
            OrderModel.getUserIdByOrderId(orderId, async (err, result) => {
              if (err) return console.error("❌ Error fetching user:", err);

              if (!result?.length) {
                console.warn("⚠️ No customer found to notify");
                return;
              }

              const userId = result[0].user_id;

              try {
                await sendNotificationToUser({
                  userId: String(userId),
                  title: "Delivery Partner Assigned",
                  body: "A rider has accepted your order and will reach the store soon.",
                  data: { 
                    type: "order_update",
                    order_id: String(orderId)
                  },
                  saveToDB: true,
                });

                console.log(`📩 Notification sent to user ${userId}`);

              } catch (error) {
                console.error("❌ Failed to send customer notification:", error);
              }
            });

          } else {
            socket.emit('orderAccepted', { success: false });
          }
        })
        .catch((err) => {
          console.error(`[Error] acceptOrder failed`, err);
          socket.emit('orderAccepted', { success: false, error: 'Server error' });
        });
    });


    socket.on('disconnect', () => {
          console.log(`[Socket Disconnected] ID: ${socket.id}`);
        });
        socket.on('generateOtp', async ({ orderId, riderId }) => {
      try {
        const otp = generateOtp(6); // your OTP generator function
        const expiry = new Date(Date.now() + 10 * 60 * 1000);

        // Save OTP & status in DB
        await OrderModel.updateOtpAndStatus(orderId, otp, expiry);

        // Emit OTP to the rider in the order room
        io.to(`order_${orderId}`).emit(`otp-generated-${orderId}`, {
          orderId,
          riderId,
          otp
        });

        console.log(`[OTP Generated] Order: ${orderId}, Rider: ${riderId}, OTP: ${otp}`);
      } catch (err) {
        console.error(`[OTP Error] Order: ${orderId}, Rider: ${riderId}`, err);
      }
    });
  });
};
