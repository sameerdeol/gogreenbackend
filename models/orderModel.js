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
    },

    getOrdersByUserId : (vendor_id, callback) => {
        const query = `
            SELECT 
                OD.id AS order_id,
                OD.user_id,
                OD.total_quantity,
                OD.total_price,
                OD.payment_method,
                OD.order_status,
                OD.created_at AS order_created_at,
                OI.product_id,
                OI.total_item_price,
                P.name AS product_name,
                P.description AS product_description,
                P.price AS product_price,
                UA.address,
                UA.type,
                UA.floor,
                UA.landmark,
                u.firstname,
                u.lastname,
                u.phonenumber
            FROM order_details OD
            JOIN order_items OI ON OD.id = OI.order_id
            JOIN products P ON OI.product_id = P.id
            JOIN users u on OD.user_id = u.id
            JOIN user_addresses UA ON OD.user_address_id = UA.id
            WHERE OD.vendor_id = ?;
        `;
    
        db.query(query, [vendor_id], callback);
    }
};
 
 module.exports = Order;