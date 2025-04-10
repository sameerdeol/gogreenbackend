const db = require('../config/db');

const UserFcmToken = {
    create: (user_id, fcmToken, callback) => {
        const sql = `
            INSERT INTO users_fcm_token (user_id, fcm_token)
            VALUES (?, ?)`;
        db.query(sql, [user_id, fcmToken], callback);
    },
    getTokenByUserId: (user_id, callback) => {
        const sql = `SELECT fcm_token FROM users_fcm_token WHERE user_id = ?`;
        db.query(sql, [user_id], callback);
    }
};

module.exports = UserFcmToken;
