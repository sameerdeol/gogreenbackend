const db = require('../config/db');

const ParcelModel = {
    addParcel: (
        user_id,
        pickup_address,
        pickup_lat,
        pickup_lng,
        drop_address,
        drop_lat,
        drop_lng,
        total_weight,
        parcel_json,
        parcel_comment,
        delivery_date,
        scheduled_comments,
        parcel_uid,
        callback
    ) => {
        const sql = `
            INSERT INTO parcels 
                (user_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng, total_weight, parcel_details, parcel_comment, delivery_date, scheduled_comments, parcel_uid) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [
            user_id,
            pickup_address,
            pickup_lat,
            pickup_lng,
            drop_address,
            drop_lat,
            drop_lng,
            total_weight,
            parcel_json,
            parcel_comment,
            delivery_date,
            scheduled_comments,
            parcel_uid
        ], callback);
    },
    findById: (id, user_id, callback) => {
    
        const query = 'SELECT * FROM parcels WHERE id =? AND user_id = ?';
        db.query(query, [id, user_id], (err, results) => {
            if (err) {
                console.error("Database error in findById:", err); // 🔍 Log errors
                return callback(err, null);
            }
            callback(null, results.length > 0 ? results[0] : null);
        });
    },
    findall: (user_id, isToday = false, date = null, callback) => {

        let query = `SELECT * FROM parcels WHERE user_id = ?`;
        let params = [user_id];

        if (isToday) {
            query += ` AND DATE(created_at) = CURDATE()`;
        } 
        else if (date) {
            query += ` AND DATE(created_at) = ?`;
            params.push(date);
        }

        query += ` ORDER BY created_at DESC`;

        db.query(query, params, (err, results) => {
            if (err) {
                console.error("Database error in findall:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    },

};

module.exports = ParcelModel;
