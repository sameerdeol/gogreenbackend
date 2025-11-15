const db = require("../config/db");

exports.saveMessage = async ({ ride_id, sender_id, receiver_id, sender_type, message, sent_at }) => {
  const query = `
    INSERT INTO chat_messages 
    (ride_id, sender_id, receiver_id, sender_type, message, sent_at, is_read)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `;

  return db.execute(query, [
    ride_id,
    sender_id,
    receiver_id,
    sender_type,
    message,
    sent_at
  ]);
};
