const db = require('../config/db');

const Notification = {
    create: async ({ user_id, title, message, type = null, reference_id = null, data = {} }) => {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO notifications
                (user_id, title, message, type, reference_id, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            db.query(
                sql,
                [user_id, title, message, type, reference_id, JSON.stringify(data || {})],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });
    },

    getAllByUser: async (user_id, onlyUnread = 0) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT id, title, message, type, reference_id, data, is_read, created_at
                FROM notifications
                WHERE user_id = ?
            `;
            if (onlyUnread) {
                sql += ' AND is_read = 0';
            }
            sql += ' ORDER BY created_at DESC';

            db.query(sql, [user_id], (err, results) => {
                if (err) return reject(err);

                // Parse JSON data column
                const notifications = results.map(n => ({
                    ...n,
                    data: n.data ? JSON.parse(n.data) : {}
                }));

                resolve(notifications);
            });
        });
    },
    markAsRead: async (notificationId) => {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE notifications SET is_read = 1 WHERE id = ?`;
            db.query(sql, [notificationId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
};

module.exports = Notification;
