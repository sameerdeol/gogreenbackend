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
                OD.order_uid,
                OD.preparing_time,
                OD.is_fast_delivery,
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
                P.food_type,
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
    },
        getOrdersByOrderId : (vendor_id, callback) => {
        const query = `
            SELECT 
                OD.id AS order_id,
                OD.user_id,
                OD.order_status,
                v.store_address,
                v.store_name,
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
            JOIN vendors v on OD.vendor_id = v.user_id
            JOIN user_addresses UA ON OD.user_address_id = UA.id
            WHERE OD.id = ?;
        `;
    
        db.query(query, [vendor_id], callback);
    },
    getOrdertimeByOrderId : (order_id, vendor_id, callback) => {
        const query = `
        select preparing_time from order_details where id =?  and vendor_id = ?`;

        db.query(query, [order_id, vendor_id], callback);
    },    
    updatePreparingTime: (order_id, vendor_id, newTime, callback) => {
        const query = `UPDATE order_details SET preparing_time = ? WHERE id = ? AND vendor_id = ?`;
        db.query(query, [newTime, order_id, vendor_id], callback);
    },

    updateOtpAndStatus: (orderId, otp, expiry) => {
    return new Promise((resolve, reject) => {
        const sql = `
        UPDATE order_details 
        SET otp = ?, otp_expiry = ?, otp_verified = 0, order_status = 2 
        WHERE id = ?
        `;
        db.query(sql, [otp, expiry, orderId], (err, result) => {
        if (err) return reject(err);
        resolve(result);
        });
    });
    },

    verifyOtp: async (orderId, enteredOtp) => {
        const getOtpDetails = () => {
            return new Promise((resolve, reject) => {
                db.query(
                    `SELECT otp, otp_expiry, otp_verified, user_id FROM order_details WHERE id = ?`,
                    [orderId],
                    (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    }
                );
            });
        };

        const updateStatus = () => {
            return new Promise((resolve, reject) => {
                db.query(
                    `UPDATE order_details SET otp_verified = 1, order_status = 3 WHERE id = ?`,
                    [orderId],
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );
            });
        };

        const rows = await getOtpDetails();

        if (!rows.length) return { status: 'not_found' };

        const order = rows[0];

        if (order.otp_verified) return { status: 'already_verified' };
        if (new Date() > new Date(order.otp_expiry)) return { status: 'expired' };
        if (String(order.otp) !== String(enteredOtp)) return { status: 'invalid' };

        // Valid OTP, update status
        await updateStatus();

        return { status: 'verified', user_id: order.user_id };
    }

};
 
 module.exports = Order;