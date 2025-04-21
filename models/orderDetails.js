const db = require("../config/db");
 
const OrderDetails = {
    addOrder: (user_id, total_quantity, total_price, payment_method, user_address, callback) => {
        const sql = `INSERT INTO order_details (user_id, total_quantity, total_price, payment_method, user_address) VALUES (?, ?, ?, ?)`;
        db.query(sql, [user_id, total_quantity, total_price, payment_method, user_address], callback);
    },

    getOrderById: (order_id, callback) => {
        const sql = `SELECT * FROM order_details WHERE order_id = ?`;
        db.query(sql, [order_id], callback);
    }
};
 
 module.exports = OrderDetails;