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
    }
};

module.exports = ParcelModel;
