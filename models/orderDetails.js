const db = require("../config/db");
 
const OrderDetails = {
    // addOrder: (user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, order_uid,scheduled_time ,callback) => {
    //     const sql = `INSERT INTO order_details (user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, order_uid,scheduled_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)`;
    //     db.query(sql, [user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, order_uid,scheduled_time ? scheduled_time.replace('T', ' ') : null], callback);
    // },
    addOrder: (
        user_id,
        total_quantity,
        total_price,
        payment_method,
        user_address_id,
        vendor_id,
        is_fast_delivery,
        order_uid,
        scheduled_time,
        callback
        ) => {
        const sql = `
            INSERT INTO order_details (
            user_id,
            total_quantity,
            total_price,
            payment_method,
            user_address_id,
            vendor_id,
            is_fast_delivery,
            order_uid,
            scheduled_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // ✅ Handle both cases: scheduled_time can be null or valid datetime
        const formattedScheduledTime =
            scheduled_time && typeof scheduled_time === "string" && scheduled_time.trim() !== ""
            ? scheduled_time.replace("T", " ")
            : null;

        db.query(
            sql,
            [
            user_id,
            total_quantity,
            total_price,
            payment_method,
            user_address_id,
            vendor_id,
            is_fast_delivery ? 1 : 0,
            order_uid,
            formattedScheduledTime
            ],
            (err, result) => {
            if (err) {
                console.error("❌ Error inserting order:", err);
                return callback(err);
            }
            callback(null, result);
            }
        );
        },


    getOrderById: (order_id, callback) => {
        const sql = `SELECT * FROM order_details WHERE order_id = ?`;
        db.query(sql, [order_id], callback);
    },
    findOrderByVendor: (order_id, vendor_id, callback) => {
        const sql = `SELECT * FROM order_details WHERE id = ? AND vendor_id = ?`;
        db.query(sql, [order_id, vendor_id], callback);
    },

    updateOrderStatus: (order_id, status, callback) => {
        const sql = `UPDATE order_details SET order_status = ? WHERE id = ?`;
        db.query(sql, [status, order_id], callback);
    },

    updateOrderStatusbyRider: (order_id, status, rider_id, callback) => {
        const sql = `UPDATE order_details SET rider_status = ? WHERE rider_id = ?`;
        db.query(sql, [status, order_id, rider_id], callback);
    },
    
    getUserIdByOrderId: (order_id, callback) => {
        const sql = `
            SELECT 
            o.user_id,
            o.rider_id,
            v.store_name,
            v.vendor_lat,
            v.vendor_lng,
            o.user_address_id,
            v.store_address,
            ua.address
            FROM order_details o
            JOIN vendors v on v.user_id=o.vendor_id
            JOIN user_addresses ua on ua.user_id=o.user_id 
            WHERE o.id = ?
        `;
        db.query(sql, [order_id], callback);
    },

    updateRiderAvailable: (order_id, rider_available, callback) => {
        const sql = `UPDATE order_details SET rider_available = ? WHERE id = ?`;
        db.query(sql, [rider_available, order_id], callback);
    },
};
  
 module.exports = OrderDetails;