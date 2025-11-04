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
module.exports.emitNewOrderToRider = (riders, data) => {
  if (!ioInstance) {
    console.warn("⚠️ Socket.io instance not initialized. Cannot emit new order.");
    return;
  }

  if (!Array.isArray(riders)) {
    // single rider
    console.log(`📢 Emitting new_order to rider_${riders}`);
    ioInstance.to(`rider_${riders}`).emit('new_order', data);
    return;
  }

  // multiple riders
  riders.forEach(r => {
    if (!r.user_id) return;
    console.log(`📢 Emitting new_order to rider_${r.user_id}`);
    ioInstance.to(`rider_${r.user_id}`).emit('new_order', data);
  });
};
//----new function to get vendor notification via socket----

module.exports.emitNewOrderToVendor = (vendorId, data) => {
  if (!ioInstance) {
    console.warn("⚠️ Socket.io instance not initialized. Cannot emit new order to vendor.");
    return;
  }

  console.log(`📢 Emitting new_order to vendor_${vendorId}`);
  ioInstance.to(`vendor_${vendorId}`).emit('new_order', data);
};

