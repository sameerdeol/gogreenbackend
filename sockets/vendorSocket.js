module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Vendor/Client connected: ${socket.id}`);

    socket.on('join', ({ role }) => {
      if (role === 'admin') {
        socket.join('admins');
        console.log(`👨‍💼 Admin joined admin room: ${socket.id}`);
      }

      if (role === 'vendor') {
        socket.join(`vendor_${socket.id}`);
        console.log(`🧑‍🍳 Vendor joined personal room: ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Disconnected: ${socket.id}`);
    });
  });
};
