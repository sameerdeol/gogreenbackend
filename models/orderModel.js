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
        getOrdersByOrderId : (order_id, callback) => {
        const query = `
            SELECT 
                OD.id AS order_id,
                OD.user_id,
                OD.total_quantity,
                OD.total_price,
                OD.payment_method,
                OD.is_fast_delivery,
                OD.order_status,
                OD.created_at,

                U.firstname,
                U.lastname,
                U.email,
                U.prefix,
                U.phonenumber,
                U.custom_id AS user_custom_id,

                UA.address,
                UA.type,
                UA.floor,
                UA.landmark,

                V.store_address,
                V.store_name,
                VU.custom_id AS vendor_custom_id,

                R.firstname AS rider_first_name,
                R.lastname AS rider_last_name,
                R.custom_id AS rider_custom_id,

                OI.product_quantity,
                OI.total_item_price,
                OI.single_item_price,

                P.name AS product_name,
                P.size AS product_size

            FROM 
                order_details OD
            JOIN 
                users U ON U.id = OD.user_id               -- Customer
            JOIN 
                users VU ON VU.id = OD.vendor_id           -- Vendor
            JOIN 
                users R ON R.id = OD.rider_id              -- Rider
            JOIN 
                user_addresses UA ON UA.id = OD.user_address_id
            JOIN 
                vendors V ON V.user_id = OD.vendor_id
            JOIN 
                order_items OI ON OI.order_id = OD.id
            JOIN 
                products P ON P.id = OI.product_id
            WHERE 
                OD.id = ?;
        `;
    
        db.query(query, [order_id], callback);
    },
    getAllOrders : (callback) => {
        const query = `
        SELECT 
            OD.id AS order_id,
            OD.user_id,
            OD.total_quantity,
            OD.total_price,
            OD.payment_method,
            OD.is_fast_delivery,
            OD.order_status,
            OD.vendor_id,
            OD.created_at,

            -- Customer details
            U.firstname AS user_firstname,
            U.lastname AS user_lastname,
            U.email AS user_email,
            U.prefix AS user_prefix,
            U.phonenumber AS user_phonenumber,
            U.custom_id AS user_custom_id,

            -- Address details
            UA.address AS user_address,
            UA.type AS address_type,
            UA.floor AS address_floor,
            UA.landmark AS address_landmark,

            -- Vendor details
            V.store_address,
            V.store_name,
            V.store_image,
            VU.custom_id AS vendor_custom_id,

            -- Rider details (optional)
            R.firstname AS rider_first_name,
            R.lastname AS rider_last_name,
            R.custom_id AS rider_custom_id,
            DP.profile_pic AS rider_profile_pic,

            -- Order item details
            OI.product_quantity,
            OI.total_item_price,
            OI.single_item_price,

            -- Product details
            P.name AS product_name,
            P.size AS product_size,
            P.featured_image,

            -- One gallery image per product
            GI.image_path AS product_gallery_image

        FROM 
            order_details OD

        -- Customer
        JOIN users U ON U.id = OD.user_id

        -- Vendor
        JOIN users VU ON VU.id = OD.vendor_id
        JOIN vendors V ON V.user_id = OD.vendor_id

        -- Rider (optional)
        LEFT JOIN users R ON R.id = OD.rider_id
        LEFT JOIN delivery_partners DP ON DP.user_id = OD.rider_id

        -- Address
        JOIN user_addresses UA ON UA.id = OD.user_address_id

        -- Order items and products
        JOIN order_items OI ON OI.order_id = OD.id
        JOIN products P ON P.id = OI.product_id

        -- Subquery to get one gallery image per product
        LEFT JOIN (
            SELECT 
                product_id,
                MIN(image_path) AS image_path
            FROM 
                gallery_images
            GROUP BY 
                product_id
        ) GI ON GI.product_id = OI.product_id
        `;
    
        db.query(query, callback);
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
        console.log(order)
        if (order.otp_verified) return { status: 'already_verified' };
        if (new Date() > new Date(order.otp_expiry)) return { status: 'expired' };
        if (String(order.otp) !== String(enteredOtp)) return { status: 'invalid' };

        // Valid OTP, update status
        await updateStatus();

        return { status: 'verified', user_id: order.user_id };
    },
    orderHistorybyUserID: (user_id, callback) => {
        const query = `
            SELECT 
                OD.id AS order_id,
                OD.order_uid,
                OD.user_id,
                OD.total_quantity,
                OD.total_price,
                OD.payment_method,
                OD.is_fast_delivery,
                OD.order_status,
                OD.vendor_id,
                OD.created_at,

                -- Customer details
                U.firstname AS user_firstname,
                U.lastname AS user_lastname,
                U.email AS user_email,
                U.prefix AS user_prefix,
                U.phonenumber AS user_phonenumber,
                U.custom_id AS user_custom_id,

                -- Address details
                UA.address AS user_address,
                UA.type AS address_type,
                UA.floor AS address_floor,
                UA.landmark AS address_landmark,

                -- Vendor details
                V.store_address,
                V.store_name,
                V.store_image,
                VU.custom_id AS vendor_custom_id,

                -- Order item details
                OI.product_quantity,
                OI.total_item_price,
                OI.single_item_price,

                -- Product details
                P.name AS product_name,
                P.size AS product_size,
                P.featured_image,

                -- One gallery image per product
                GI.image_path AS product_gallery_image

            FROM 
                order_details OD

            -- Customer
            JOIN users U ON U.id = OD.user_id

            -- Vendor
            JOIN users VU ON VU.id = OD.vendor_id
            JOIN vendors V ON V.user_id = OD.vendor_id

            -- Address
            JOIN user_addresses UA ON UA.id = OD.user_address_id

            -- Order items and products
            JOIN order_items OI ON OI.order_id = OD.id
            JOIN products P ON P.id = OI.product_id

            -- Subquery to get one gallery image per product
            LEFT JOIN (
                SELECT 
                    product_id,
                    MIN(image_path) AS image_path
                FROM 
                    gallery_images
                GROUP BY 
                    product_id
            ) GI ON GI.product_id = OI.product_id

              WHERE OD.user_id = ?

            ORDER BY OD.created_at DESC
        `;

        db.query(query, [user_id], callback);
    }


};
 
 module.exports = Order;