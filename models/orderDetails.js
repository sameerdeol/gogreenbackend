const db = require("../config/db");
 
const OrderDetails = {
    addOrder: (user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, callback) => {
        const sql = `INSERT INTO order_details (user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery], callback);
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
            SELECT user_id FROM order_details WHERE order_details.id = ?
        `;
        db.query(sql, [order_id], callback);
    }
};
 
 module.exports = OrderDetails;