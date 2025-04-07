const db = require("../config/db");
 
const OrderDetails = {
    addOrder: (user_id, total_quantity, total_price, payment_method, callback) => {
        const sql = `INSERT INTO order_details (user_id, total_quantity, total_price, payment_method) VALUES (?, ?, ?, ?)`;
        db.query(sql, [user_id, total_quantity, total_price, payment_method], callback);
    },

    getOrderById: (order_id, callback) => {
        const sql = `SELECT * FROM order_details WHERE order_id = ?`;
        db.query(sql, [order_id], callback);
    }
};
 
 module.exports = OrderDetails;