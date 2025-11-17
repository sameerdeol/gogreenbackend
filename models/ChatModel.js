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

exports.getMessages = async (ride_id, rider_id) => {
  const query = `
    SELECT *
    FROM chat_messages
    WHERE ride_id = ?
      AND (sender_id = ? OR receiver_id = ?)
    ORDER BY sent_at ASC
  `;

  const [rows] = await db.execute(query, [ride_id, rider_id, rider_id]);
  return rows;
};
