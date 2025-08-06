const { acceptOrder } = require('../controllers/orderController'); // Adjust path if needed

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Rider joins the order room
    socket.on('joinOrderRoom', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`[Join Room] Rider ${socket.id} joined room: order_${orderId}`);
    });

    // Rider accepts the order
    socket.on('acceptOrder', ({ orderId, riderId }) => {
      console.log(`[Accept Order Attempt] Rider: ${riderId}, Order: ${orderId}`);

      acceptOrder(orderId, riderId)
        .then((success) => {
          if (success) {
            console.log(`[Order Accepted] Order ${orderId} accepted by Rider ${riderId}`);

            // Notify other riders in room
            socket.to(`order_${orderId}`).emit('stopBuzzer', { orderId });

            // Notify the rider who accepted
            socket.emit('orderAccepted', { success: true });
          } else {
            console.warn(`[Order Already Accepted] Rider: ${riderId}, Order: ${orderId}`);
            socket.emit('orderAccepted', { success: false });
          }
        })
        .catch((err) => {
          console.error(`[Error] acceptOrder failed for Rider: ${riderId}, Order: ${orderId}`, err);
          socket.emit('orderAccepted', { success: false, error: 'Server error' });
        });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });
};
