const db = require("../config/db");

const OrderItem = {
    addItem: (user_id, product_id, product_quantity, single_item_price, item_price, callback) => {
        const sql = `INSERT INTO order_items (user_id, product_id, product_quantity, single_item_price, total_item_price) VALUES (?, ?, ?, ?, ?)`;
        db.query(sql, [user_id, product_id, product_quantity, single_item_price, item_price], callback);
    },

    getOrderItems: (order_id, callback) => {
        const sql = `SELECT * FROM order_items WHERE order_id = ?`;
        db.query(sql, [order_id], callback);
    }
};

module.exports = OrderItem;
