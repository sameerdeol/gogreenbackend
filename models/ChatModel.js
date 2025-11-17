const db = require("../config/db");

const ChatModel = {

    // ✅ Save chat message
    save: (data, callback) => {
        const query = `
            INSERT INTO chat_messages 
            (ride_id, sender_id, receiver_id, sender_type, message, sent_at, is_read)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `;

        db.query(
            query,
            [
                data.ride_id,
                data.sender_id,
                data.receiver_id,
                data.sender_type,
                data.message,
                data.sent_at
            ],
            callback
        );
    },

    // ✅ Get messages between rider & customer for a ride
    findMessages: (ride_id, rider_id, customer_id, callback) => {
        const query = `
            SELECT *
            FROM chat_messages
            WHERE ride_id = ?
              AND ((sender_id = ? AND receiver_id = ?)
                OR (sender_id = ? AND receiver_id = ?))
            ORDER BY sent_at ASC
        `;

        db.query(
            query,
            [ride_id, rider_id, customer_id, customer_id, rider_id],
            callback
        );
    },

    // (Optional) Get all messages
    findAll: (callback) => {
        db.query("SELECT * FROM chat_messages ORDER BY sent_at ASC", callback);
    },

    // (Optional) Delete message by ID
    deleteById: (id, callback) => {
        db.query("DELETE FROM chat_messages WHERE id = ?", [id], callback);
    }
};

module.exports = ChatModel;
