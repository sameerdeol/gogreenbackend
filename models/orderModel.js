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

    getOrdersByUserId: (user_id, role_id, callback) => {
        let query = `
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
                OD.rider_status,
                OD.created_at AS order_created_at,

                OI.id AS order_item_id,
                OI.product_id,
                OI.product_quantity,

                (
                    CASE 
                        WHEN PV.id IS NOT NULL THEN PV.price
                        ELSE P.price
                    END
                    + IFNULL(PA.price, 0)
                ) AS total_item_price,

                P.name AS product_name,
                P.description AS product_description,
                P.price AS product_price,
                P.food_type,
                P.featured_image,

                PD.discount_percent,

                UA.address,
                UA.type,
                UA.floor,
                UA.landmark,

                U.firstname,
                U.lastname,
                U.phonenumber,

                R.custom_id AS rider_unique_id,

                -- Selected variant
                PV.id AS variant_id,
                PV.type AS variant_type,
                PV.value AS variant_value,
                PV.price AS variant_price,

                -- Selected addons
                PA.id AS addon_id,
                PA.name AS addon_name,
                PA.price AS addon_price,

                SV.store_name,
                SV.store_address,
                SV.store_image,
                SU.phonenumber as vendor_phonenumber,
                SU.prefix as vendor_prefix

            FROM 
                order_details OD
            LEFT JOIN order_items OI ON OD.id = OI.order_id
            LEFT JOIN products P ON OI.product_id = P.id
            LEFT JOIN users U ON OD.user_id = U.id
            LEFT JOIN user_addresses UA ON OD.user_address_id = UA.id
            LEFT JOIN product_discounts PD ON PD.product_id = OI.product_id

            -- Selected variant
            LEFT JOIN product_variants PV ON OI.variant_id = PV.id

            -- Selected addons
            LEFT JOIN order_item_addons OIA ON OIA.order_item_id = OI.id
            LEFT JOIN product_addons PA ON OIA.addon_id = PA.id

            LEFT JOIN users R ON OD.rider_id = R.id
            LEFT JOIN users SU ON OD.vendor_id = SU.id
            LEFT JOIN vendors SV ON OD.vendor_id = SV.user_id

            WHERE 
                ${role_id === 3 ? 'OD.vendor_id = ?' : 'OD.rider_id = ?'}
            AND OD.rider_available = 1
            ORDER BY OD.created_at DESC;    
        `;

        // Use user_id as the parameter for vendor_id or rider_id dynamically
        db.query(query, [user_id], callback);
    },

    getOrdersByOrderId : (order_id, callback) => {
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
            OD.rider_status,
            OD.created_at AS order_created_at,

            OI.id AS order_item_id,
            OI.product_id,
            OI.product_quantity,

            -- Total item price = product + variant + addon
            (
                CASE 
                    WHEN PV.id IS NOT NULL THEN PV.price
                    ELSE P.price
                END
                + IFNULL(PA.price, 0)
            ) AS total_item_price,

            P.name AS product_name,
            P.description AS product_description,
            P.price AS product_price,
            P.food_type,

            UA.address,
            UA.type,
            UA.floor,
            UA.landmark,

            U.firstname,
            U.lastname,
            U.phonenumber,
            U.prefix,

            PV.id AS variant_id,
            PV.type AS variant_type,
            PV.value AS variant_value,
            PV.price AS variant_price,

            PA.id AS addon_id,
            PA.name AS addon_name,
            PA.price AS addon_price,

            V.store_name,
            V.store_address,
            S.phonenumber as vendor_phonenumber,
            S.prefix as vendor_prefix

        FROM 
            order_details OD
        LEFT JOIN 
            order_items OI ON OD.id = OI.order_id
        LEFT JOIN 
            products P ON OI.product_id = P.id
        LEFT JOIN 
            users U ON OD.user_id = U.id
        LEFT JOIN 
            vendors V ON V.user_id = OD.vendor_id 
        LEFT JOIN 
            user_addresses UA ON OD.user_address_id = UA.id

        -- Join variant
        LEFT JOIN 
            product_variants PV ON OI.variant_id = PV.id

        -- Join addon directly (no separate addons table)
        LEFT JOIN 
            order_item_addons OIA ON OIA.order_item_id = OI.id
        LEFT JOIN 
            product_addons PA ON OIA.addon_id = PA.id

        LEFT JOIN 
            users S ON S.id = OD.vendor_id     


        WHERE 
            OD.id = ?
        ORDER BY 
            OD.created_at DESC;
        ;
    `;

    db.query(query, [order_id], callback);
    },
    // getOrdersByOrderId : (order_id, callback) => {
    //     const query = `
    //     SELECT 
    //         OD.id AS order_id,
    //         OD.order_uid,
    //         OD.user_id,
    //         OD.total_quantity,
    //         OD.total_price,
    //         OD.payment_method,
    //         OD.is_fast_delivery,
    //         OD.order_status,
    //         OD.created_at,

    //         U.firstname,
    //         U.lastname,
    //         U.email,
    //         U.prefix,
    //         U.phonenumber,
    //         U.custom_id AS user_custom_id,

    //         UA.address,
    //         UA.type,
    //         UA.floor,
    //         UA.landmark,

    //         V.store_address,
    //         V.store_name,
    //         VU.custom_id AS vendor_custom_id,

    //         R.firstname AS rider_first_name,
    //         R.lastname AS rider_last_name,
    //         R.custom_id AS rider_custom_id,

    //         OI.product_quantity,
    //         OI.total_item_price,
    //         OI.single_item_price,

    //         P.name AS product_name,
    //         P.size AS product_size

    //     FROM 
    //         order_details OD
    //     LEFT JOIN 
    //         users U ON U.id = OD.user_id               /* Customer */
    //     LEFT JOIN 
    //         users VU ON VU.id = OD.vendor_id           /* Vendor */
    //     LEFT JOIN 
    //         users R ON R.id = OD.rider_id              /* Rider */
    //     LEFT JOIN 
    //         user_addresses UA ON UA.id = OD.user_address_id
    //     LEFT JOIN 
    //         vendors V ON V.user_id = OD.vendor_id
    //     LEFT JOIN 
    //         order_items OI ON OI.order_id = OD.id
    //     LEFT JOIN 
    //         products P ON P.id = OI.product_id
    //     WHERE 
    //         OD.id = ?
    //     LIMIT 0, 1000;
    //     ;
    //     `;

    //     db.query(query, [order_id], callback);
    // },
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
            OD.rider_status,
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
        LEFT JOIN users U ON U.id = OD.user_id

        -- Vendor
        LEFT JOIN users VU ON VU.id = OD.vendor_id
        LEFT JOIN vendors V ON V.user_id = OD.vendor_id

        -- Rider (optional)
        LEFT JOIN users R ON R.id = OD.rider_id
        LEFT JOIN delivery_partners DP ON DP.user_id = OD.rider_id

        -- Address
        LEFT JOIN user_addresses UA ON UA.id = OD.user_address_id

        -- Order items and products
        LEFT JOIN order_items OI ON OI.order_id = OD.id
        LEFT JOIN products P ON P.id = OI.product_id

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
    orderHistorybyUserID: (user_id, isToday = false, callback) => {
        let query = `
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
            OI.id AS order_item_id,
            OI.product_id,
            OI.product_quantity,
            OI.total_item_price,
            OI.single_item_price,
            OI.variant_id,

            P.featured_image,
            P.name,

            -- Selected variant
            PV.id AS variant_id,
            PV.type AS variant_type,
            PV.value AS variant_value,
            PV.price AS variant_price,

            -- Selected addons
            OIA.addon_id,
            A.name AS addon_name,
            A.price AS addon_price,

            -- Product gallery images
            GI.image_path AS gallery_image,

            -- Product attributes
            PA.attribute_key,
            PA.attribute_value,

            -- ⭐ Extra order-level details from order_extra_details
            OED.items_price AS extra_items_price,
            OED.fast_delivery_charges AS extra_fast_delivery_charges,
            OED.scheduled_order_date,
            OED.scheduled_time_date,
            OED.order_vendor_distance,
            OED.order_delivery_type,
            OED.rider_deliveryCharge,
            OED.overall_amount AS extra_overall_amount,
            OED.tip_amount,
            OED.tip_percentage

        FROM 
            order_details OD

            -- Customer
            JOIN users U ON U.id = OD.user_id

            -- Vendor
            JOIN users VU ON VU.id = OD.vendor_id
            JOIN vendors V ON V.user_id = OD.vendor_id

            -- Address
            JOIN user_addresses UA ON UA.id = OD.user_address_id

            -- Order items
            JOIN order_items OI ON OI.order_id = OD.id

            -- Selected variant
            LEFT JOIN product_variants PV ON PV.id = OI.variant_id
            LEFT JOIN products P ON P.id = OI.product_id

            -- Selected addons
            LEFT JOIN order_item_addons OIA ON OIA.order_item_id = OI.id
            LEFT JOIN product_addons A ON A.id = OIA.addon_id

            -- Product gallery images
            LEFT JOIN gallery_images GI ON GI.product_id = OI.product_id

            -- Product attributes
            LEFT JOIN product_attributes PA ON PA.product_id = OI.product_id

            -- ⭐ NEW SAFE JOIN (does not break anything)
            LEFT JOIN order_extra_details OED ON OED.order_id = OD.id

        WHERE OD.user_id = ?
        `;

        // 👇 Add date filter dynamically
        if (isToday) {
            query += ` AND DATE(OD.created_at) = CURDATE() `;
        }

        query += ` ORDER BY OD.created_at DESC`;

        db.query(query, [user_id], callback);
    },



    
    handleOrder: (orderId, riderId, riderStatus) => {
    return new Promise((resolve, reject) => {
        const sql = `
        UPDATE order_details 
        SET rider_status = ?, rider_id = ? 
        WHERE id = ?
        `;
        const values = [riderStatus, riderId, orderId];

        db.query(sql, values, (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
        });
    });
    },

    getOrderandRiderDetails: (order_id) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT 
                            OD.user_id as customer_id,
                            U.firstname as rider_firstname,
                            U.lastname as rider_last_name,
                            U.phonenumber as rider_number
                        FROM order_details OD
                        JOIN users U ON U.id = OD.rider_id
                        WHERE OD.id = ?`;

            db.query(sql, [order_id], (err, results) => {
            if (err) return reject(err);
            resolve(results);
            });
        });
    },

    getOrdersByRiderId : (rider_id, callback) => {
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
                OD.rider_id = ?;
        `;

        db.query(query, [rider_id], callback);
    }


};
 
 module.exports = Order;