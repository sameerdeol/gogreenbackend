const db = require('../config/db');

const Order = {
    createOrder: (user_id, address_id, payment_type, callback) => {
        const sql = `INSERT INTO order_details (user_id, address_id, payment_type) VALUES (?, ?, ?)`;
        db.query(sql, [user_id, address_id, payment_type], callback);
    },

    addOrderItem: (order_id, product_id, quantity, price, callback) => {
        const sql = `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`;
        db.query(sql, [order_id, product_id, quantity, price], callback);
    },

    getOrderDetails: (order_id, callback) => {
        const sql = `SELECT * FROM order_details WHERE order_id = ?`;
        db.query(sql, [order_id], callback);
    },

    getOrderItems: (order_id, callback) => {
        const sql = `SELECT * FROM order_items WHERE order_id = ?`;
        db.query(sql, [order_id], callback);
    }
};

module.exports = Order;
