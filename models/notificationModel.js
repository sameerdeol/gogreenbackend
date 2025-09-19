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

    getAllByUser: async (user_id, onlyUnread = false) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    n.id, 
                    n.title, 
                    n.message, 
                    n.type, 
                    n.reference_id, 
                    n.data,
                    n.is_read,
                    n.created_at,
                    o.vendor_id,
                    v.vendor_lng,
                    v.vendor_lat,
                    u.customer_lat,
                    u.customer_lng
                FROM notifications n
                LEFT JOIN order_details o 
                    ON JSON_VALID(n.data) 
                AND o.id = JSON_UNQUOTE(JSON_EXTRACT(n.data, '$.order_id'))
				LEFT JOIN user_addresses u
					ON u.user_id = o.user_address_id
                LEFT JOIN vendors v
                    ON v.user_id = o.vendor_id
                WHERE n.user_id = ?
            `;

            // ✅ Filter unread if requested
            if (onlyUnread) {
                sql += ' AND n.is_read = 0';
            }

            sql += ' ORDER BY n.created_at DESC';

            db.query(sql, [user_id], (err, results) => {
                if (err) return reject(err);

                const notifications = results.map(n => {
                    let parsedData = {};
                    if (n.data) {
                        try {
                            parsedData = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
                        } catch (err) {
                            parsedData = n.data; // fallback to raw data if parse fails
                        }
                    }

                    return {
                        id: n.id,
                        title: n.title,
                        message: n.message,
                        type: n.type,
                        reference_id: n.reference_id,
                        data: parsedData,
                        is_read: n.is_read,
                        created_at: n.created_at,
                        vendor_id: n.vendor_id || null,
                        vendor_lng: n.vendor_lng || null,
                        vendor_lat: n.vendor_lat || null,
                        customer_lng: n.customer_lng || null,
                        customer_lat: n.customer_lat || null
                    };
                });

                resolve(notifications);
            });
        });
    },



    getAllByUserandID: async (user_id, id, onlyUnread = false) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    n.id, 
                    n.title, 
                    n.message, 
                    n.type, 
                    n.reference_id, 
                    n.data,
                    n.is_read,
                    n.created_at,
                    o.vendor_id,
                    v.vendor_lng,
                    v.vendor_lat,
                    u.customer_lat,
                    u.customer_lng
                FROM notifications n
                LEFT JOIN order_details o 
                    ON JSON_VALID(n.data) AND o.id = JSON_UNQUOTE(JSON_EXTRACT(n.data, '$.order_id'))
                LEFT JOIN vendors v
                    ON v.user_id = o.vendor_id
                LEFT JOIN user_addresses u
					ON u.user_id = o.user_address_id
                WHERE n.user_id = ? AND n.id = ?
            `;

            if (onlyUnread) {
                sql += ' AND n.is_read = 0';
            }

            sql += ' ORDER BY n.created_at DESC';

            db.query(sql, [user_id, id], (err, results) => {
                if (err) return reject(err);

                const notifications = results.map(n => {
                    let parsedData = {};
                    if (n.data) {
                        try {
                            parsedData = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
                        } catch (err) {
                            parsedData = n.data; // fallback to raw data
                        }
                    }
                    return { ...n, data: parsedData };
                });

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
