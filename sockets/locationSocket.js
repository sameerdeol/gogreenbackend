// helpers/socketHelpers.js
let ioInstance;

module.exports.initSocket = (io) => {
  ioInstance = io;
};

module.exports.emitRiderLocationToCustomer = (customerId, riderId, location) => {
  if (!ioInstance) {
    console.warn("Socket.io instance not initialized. Cannot emit rider location.");
    return;
  }

  console.log(
    `🔄 Emitting riderLocationUpdate to customer_${customerId} | Rider: ${riderId} | Location:`,
    location
  );

  ioInstance.to(`customer_${customerId}`).emit('riderLocationUpdate', {
    rider_id: riderId,
    ...location
  });
};
