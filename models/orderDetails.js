const db = require("../config/db");
 
const OrderDetails = {
    addOrder: (user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, order_uid, callback) => {
        const sql = `INSERT INTO order_details (user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, order_uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, order_uid], callback);
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
    
    getUserIdByOrderId: (order_id, callback) => {
        const sql = `
            SELECT 
            o.user_id,
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
    }
};
 
 module.exports = OrderDetails;