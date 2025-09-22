let ioInstance;

module.exports = (io) => {
  ioInstance = io; // save io instance

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join', ({ role, id }) => {
      if (role === 'customer') socket.join(`customer_${id}`);
      if (role === 'vendor') socket.join(`vendor_${id}`);
      if (role === 'admin') socket.join('admins');
    });

    socket.on('disconnect', () => {
      console.log(`❌ Disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

// Helper to emit rider location
module.exports.emitRiderLocationToCustomer = (customerId, riderId, location) => {
  if (!ioInstance) {
    console.warn("⚠️ Socket.io instance not initialized. Cannot emit rider location.");
    return;
  }

  const payload = {
    rider_id: riderId,
    ...location
  };

  console.log(`📡 Emitting riderLocationUpdate to customer_${customerId}`);
  console.log("🔍 Payload:", JSON.stringify(payload, null, 2));

  ioInstance.to(`customer_${customerId}`).emit('riderLocationUpdate', payload);
};
