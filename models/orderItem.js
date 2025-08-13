const db = require("../config/db");

const OrderItem = {
    addItem: (order_id, user_id, product_id, product_quantity, single_item_price, item_price, variant_id, variant_price, callback) => {
        const sql = `INSERT INTO order_items 
            (user_id, order_id, product_id, product_quantity, single_item_price, total_item_price, variant_id, variant_price) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [user_id, order_id, product_id, product_quantity, single_item_price, item_price, variant_id, variant_price], callback);
    },

    getOrderItems: (order_id, callback) => {
        const sql = `SELECT * FROM order_items WHERE order_id = ?`;
        db.query(sql, [order_id], callback);
    },

    // ✅ NEW METHOD: Add add-on to an order item
    addAddon: (order_item_id, addon_id, price, callback) => {
        const sql = `INSERT INTO order_item_addons (order_item_id, addon_id, addon_price) VALUES (?, ?, ?)`;
        db.query(sql, [order_item_id, addon_id, price], callback);
    }
};

module.exports = OrderItem;
