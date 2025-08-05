const { acceptOrder } = require('../controllers/orderController'); // Adjust path if needed

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected');

    // Rider joins the order room
    socket.on('joinOrderRoom', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`Rider joined room: order_${orderId}`);
    });

    // Rider accepts the order
    socket.on('acceptOrder', ({ orderId, riderId }) => {
      acceptOrder(orderId, riderId)
        .then((success) => {
          if (success) {
            // Notify other riders to stop their buzzers
            socket.to(`order_${orderId}`).emit('stopBuzzer', { orderId });

            // Notify the rider who accepted
            socket.emit('orderAccepted', { success: true });
          } else {
            // Notify the rider that acceptance failed (already taken)
            socket.emit('orderAccepted', { success: false });
          }
        })
        .catch((err) => {
          console.error(err);
          socket.emit('orderAccepted', { success: false, error: 'Server error' });
        });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
};
