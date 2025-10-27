const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { distanceCustomerVendor, getDistanceMatrix } = require('../utils/distanceService');
const  {savePolylines, saveRouteCoordinates}  = require('../utils/routeCordinates');

const updateFields = (data, tableFields) => {
    const fieldsToUpdate = [];
    const values = [];

    for (const key of tableFields) {
        if (data[key] !== undefined) {  // Only update fields that are provided
            fieldsToUpdate.push(`\`${key}\` = ?`);
            values.push(data[key]);  // Correctly extract value from userData
        }
    }

    return {
        queryPart: fieldsToUpdate.join(', '),
        values
    };
};

const User = {

    findByEmail: (email, callback) => {
        const query = `SELECT * FROM users WHERE email = ?`;
        db.query(query, [email], (err, results) => {
            if (err) return callback(err, null);
            if (results.length === 0) return callback(null, null);
            callback(null, results[0]); // returns a single user object
        });
    },    
    findByEmailforAdmin: (email, callback) => {
        const query = `SELECT * FROM users WHERE email = ? AND role_id IN (1, 2)`;
        db.query(query, [email], (err, results) => {
            if (err) return callback(err, null);
            if (results.length === 0) return callback(null, null);
            callback(null, results[0]); // returns a single user object
        });
    },
  
    checkCustomIdExists : (custom_id, callback) => {
        db.query('SELECT * FROM users WHERE custom_id = ?', [custom_id], (err, results) => {
            if (err) return callback(err);
            callback(null, results.length > 0);
        });
    },

    insertUser: (userData, callback) => {
        const allowedFields = [
            "username", "firstname", "lastname", "password", "prefix",
            "phonenumber", "email", "role_id", "is_verified", "custom_id",
            "other_phone_number", "dob", "address"
        ];

        // Prepare user insert
        const fields = Object.keys(userData).filter(
            key => allowedFields.includes(key) && userData[key] !== undefined
        );

        if (fields.length === 0) {
            return callback(new Error("No valid fields provided"), null);
        }

        const placeholders = fields.map(() => "?").join(", ");
        const query = `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`;
        const values = fields.map(field => userData[field]);

        db.query(query, values, (err, result) => {
            if (err) return callback(err, null);

            const user_id = result.insertId;

            // Extract delivery partner fields safely
            const other_phone_number = userData.other_phone_number;
            const dob = userData.dob;
            const address = userData.address;

            // Only insert into delivery_partners if any of these are provided
            if (other_phone_number || dob || address) {
                const deliveryPartnerData = { user_id };

                if (other_phone_number) deliveryPartnerData.other_phone_number = other_phone_number;
                if (dob) deliveryPartnerData.dob = dob;
                if (address) deliveryPartnerData.address = address;

                const dpFields = Object.keys(deliveryPartnerData);
                const dpPlaceholders = dpFields.map(() => "?").join(", ");
                const dpQuery = `INSERT INTO delivery_partners (${dpFields.join(", ")}) VALUES (${dpPlaceholders})`;
                const dpValues = dpFields.map(field => deliveryPartnerData[field]);

                db.query(dpQuery, dpValues, (dpErr) => {
                    if (dpErr) return callback(dpErr, null);
                    return callback(null, result); // ✅ Both inserted successfully
                });
            } else {
                // Skip delivery_partners insert
                return callback(null, result);
            }
        });
    },

    findByEmailForVendorRider: (email,role_id, callback) => {
        if (!email || typeof email !== 'string' || !email.match(/\S+@\S+\.\S+/)) {
            return callback(null, { success: false, message: "Invalid email format" });
        }

        const checkQuery = `SELECT * FROM users WHERE email = ? and role_id =?`;

        db.query(checkQuery, [email,role_id], (err, results) => {
            if (err) {
                return callback(err, null);
            }

            if (results.length === 0) {
                return callback(null, { success: false, message: "User not found" });
            }

            const user = results[0];
            // Don't return early — just pass back the user along with the verification info
            return callback(null, { success: true, user });
        });
    },

    findByEmailOrPhone : (email, phonenumber, callback) => {
        const query = `SELECT * FROM users WHERE email = ? OR phonenumber = ?`;
        db.query(query, [email, phonenumber], (err, results) => {
            if (err) return callback(err, null);
            callback(null, results.length > 0 ? results[0] : null);
        });
    },
    
    
    findById : (user_id, callback) => {
        const query = 'SELECT * FROM users WHERE id = ?';
        db.query(query, [user_id], (err, results) => {
            if (err) return callback(err, null);
            if (results.length === 0) return callback(null, null);
            callback(null, results[0]);
        });
    },

    updatePassword: (user_id, new_password, callback) => {
        bcrypt.hash(String(new_password), 10, (err, hashedPassword) => {
            if (err) return callback(err);
            db.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, user_id],
                callback
            );
        });
    },


    storeOTP: (email, otp, expiresAt, callback) => {
        // Delete any existing OTP entries for this email (including the flag state)
        const deleteQuery = 'DELETE FROM password_resets_otp WHERE email = ?';
        db.query(deleteQuery, [email], (deleteErr) => {
            if (deleteErr) return callback(deleteErr);
    
            // Insert OTP along with flag (flag = 0 means not used)
            const insertQuery = 'INSERT INTO password_resets_otp (email, otp, expires_at, verified) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [email, otp, expiresAt, 0], callback);  // flag set to 0 (unused)
        });
    },
    
    verifyOTP: (email, otp, callback) => {
        // Query to verify OTP and check if it hasn't been used (flag = 0)
        const query = `SELECT * FROM password_resets_otp 
                       WHERE email = ? AND otp = ? AND expires_at > NOW() AND verified = 0
                       ORDER BY id DESC LIMIT 1`;
        db.query(query, [email, otp], (err, results) => {
            if (err) return callback(err, null);
            // If no result, the OTP might have expired or been already used
            if (results.length === 0) {
                return callback(null, null);  // OTP expired or already used
            }
    
            // OTP is valid and hasn't been used, so return it
            callback(null, results[0]);
        });
    },
    
    // To mark OTP as used once it has been verified
    markOTPAsUsed: (email, otp, callback) => {
        const updateQuery = 'UPDATE password_resets_otp SET verified = 1 WHERE email = ? AND otp = ?';
        db.query(updateQuery, [email, otp], callback);
    },
    

    updateUser: (user_id, role_id, userData, callback) => {
        // Step 1: Allow updates only for certain roles (1, 2)
        if (![1, 2].includes(role_id)) {
            return callback(new Error('Permission denied: Only role_id 1, 2 can update details'), null);
        }
    
        // Start a transaction
        db.beginTransaction((err) => {
            if (err) return callback(err, null);
    
            const updateFields = (data, tableFields) => {
                const fieldsToUpdate = Object.keys(data)
                    .filter(key => tableFields.includes(key)) // Ensure only allowed fields are updated
                    .map(key => `\`${key}\` = ?`);
                return {
                    queryPart: fieldsToUpdate.join(', '),
                    values: Object.values(data)
                };
            };
    
            // Define allowed fields for the `users` table
            const userTableFields = ['username', 'email', 'role_id', 'firstname', 'lastname', 'phonenumber'];
    
            // Update `users` table if relevant fields exist in `userData`
            const { queryPart: userQueryPart, values: userValues } = updateFields(userData, userTableFields);
    
            if (userQueryPart) {
                const userQuery = `UPDATE users SET ${userQueryPart} WHERE id = ?`;
                userValues.push(user_id);
    
                db.query(userQuery, userValues, (err) => {
                    if (err) {
                        return db.rollback(() => {
                            callback(err, null);
                        });
                    }
    
                    // Commit the transaction after updating `users`
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                callback(err, null);
                            });
                        }
                        callback(null, { message: 'User updated successfully' });
                    });
                });
            } else {
                callback(null, { message: 'No updates provided' });
            }
        });
    },

    updateWorkerData: (user_id, role_id, userData, callback) => {
        // Check if role_id is a string and convert it to a number if needed
        if (typeof role_id === 'string') {
            role_id = Number(role_id);
        }
    
        // Check if role_id is valid (must be a number and one of the allowed roles)
        if (![3, 4, 5].includes(role_id)) {
            return callback(new Error('Permission denied: Invalid role_id'), null);
        }
    
        db.beginTransaction((err) => {
            if (err) return callback(err, null);
    
            const userTableFields = ['firstname', 'lastname', 'prefix', 'phonenumber', 'email'];
            const vendorTableFields = ['store_name','vendor_type_id','store_address', 'sin_code', 'profile_pic', 'vendor_thumb', 'vendor_lng', 'vendor_lat','business_reg_number', 'store_image'];
            const deliveryPartnerTableFields = ['license_number', 'sin_code', 'profile_pic', 'dob'];
            const customerTableFields = ['dob','gender'];
    
            const queries = [];
    
            // **UPDATE users table**
            const { queryPart: userQueryPart, values: userValues } = updateFields(userData, userTableFields);
            if (userQueryPart) {
                const userQuery = `UPDATE users SET ${userQueryPart} WHERE id = ?`;
                queries.push({ query: userQuery, values: [...userValues, user_id] });
            }
    
            // **UPDATE vendors OR delivery_partners (single query)**
            let extraQuery = '';
            let extraValues = [];
    
            if (role_id === 3) {
                const { queryPart, values } = updateFields(userData, vendorTableFields);
                if (queryPart) {
                    extraQuery = `UPDATE vendors SET ${queryPart} WHERE user_id = ?`;
                    extraValues = [...values, user_id];
                }
            } else if (role_id === 4) {
                const { queryPart, values } = updateFields(userData, deliveryPartnerTableFields);
                if (queryPart) {
                    extraQuery = `UPDATE delivery_partners SET ${queryPart} WHERE user_id = ?`;
                    extraValues = [...values, user_id];
                }
            }
            else if (role_id === 5) {
                const { queryPart, values } = updateFields(userData, customerTableFields);
    
                if (queryPart) {
                    // First, check if customer record exists
                    queries.push({
                        query: `SELECT COUNT(*) AS count FROM customers WHERE user_id = ?`,
                        values: [user_id],
                        isSelect: true,
                        next: (result) => {
                            const exists = result[0].count > 0;
    
                            if (exists) {
                                const updateQuery = `UPDATE customers SET ${queryPart} WHERE user_id = ?`;
                                queries.push({ query: updateQuery, values: [...values, user_id] });
                            } else {
                                const insertFields = customerTableFields.filter(key => userData[key] !== undefined);
                                const insertValues = insertFields.map(key => userData[key]);
                                insertFields.push('user_id'); // add user_id to fields
                                insertValues.push(user_id);
    
                                const placeholders = insertFields.map(() => '?').join(', ');
                                const insertQuery = `INSERT INTO customers (${insertFields.join(', ')}) VALUES (${placeholders})`;
                                queries.push({ query: insertQuery, values: insertValues });
                            }
                        }
                    });
                }
            }
    
            if (extraQuery) {
                queries.push({ query: extraQuery, values: extraValues });
            }
    
            // **Execute Queries**
            const executeQuery = (index) => {
                if (index >= queries.length) {
                    return db.commit((err) => {
                        if (err) return db.rollback(() => callback(err, null));
                        callback(null, { message: 'User updated successfully' });
                    });
                }
    
                const { query, values, isSelect, next } = queries[index];
    
                db.query(query, values, (err, result) => {
                    if (err) return db.rollback(() => callback(err, null));
    
                    if (isSelect && next) {
                        next(result);
                    }
    
                    executeQuery(index + 1);
                });
            };
    
            if (queries.length > 0) {
                executeQuery(0);
            } else {
                callback(null, { message: 'No updates provided' });
            }
        });
    },
    
    

    findCustomerByPhone : (phonenumber,role_id, callback) => {
        const sql = `SELECT 
                        u.*,
                        CASE 
                            WHEN COUNT(ua.id) > 0 THEN TRUE
                            ELSE FALSE
                        END AS is_user_address_available
                    FROM users u
                    LEFT JOIN user_addresses ua 
                        ON ua.user_id = u.id
                    WHERE u.phonenumber = ? 
                    AND u.role_id = ?
                    GROUP BY u.id;
                    `;
        db.query(sql, [phonenumber,role_id], (err, result) => {
            if (err) {
                return callback(err, null);
            }
            return callback(null, result);
        });
    },
    
    // Insert new user into `users` table (without storing phone number)
    createUser : (role_id, callback) => {
        const sql = `INSERT INTO users (role_id) VALUES (?)`; // Removed `phonenumber`
        db.query(sql, [role_id], (err, result) => {
            if (err) {
                return callback(err, null);
            }
            return callback(null, result);
        });
    },
    
    // Insert phone number into `customers` table
    createCustomer : (user_id, phonenumber, prefix,role_id, callback) => {
        const sql = `INSERT INTO customers (user_id, phonenumber, prefix,role_id) VALUES (?, ?, ?, ?)`;
        db.query(sql, [user_id, phonenumber, prefix, role_id], (err, result) => {
            if (err) {
                return callback(err, null);
            }
            return callback(null, result);
        });
    },
    
    getUnverifiedUsers: (callback) => {
        const vendorsQuery = `
            SELECT u.*, v.* 
            FROM users u
            JOIN vendors v ON u.id = v.user_id
            WHERE u.is_verified IN (0, 2, 3);
        `;
    
        const deliveryPartnersQuery = `
            SELECT u.*, dp.* 
            FROM users u
            JOIN delivery_partners dp ON u.id = dp.user_id
            WHERE u.is_verified IN (0, 2, 3);
        `;
    
        db.query(vendorsQuery, (err, vendors) => {
            if (err) return callback(err, null);
    
            db.query(deliveryPartnersQuery, (err, delivery_partners) => {
                if (err) return callback(err, null);
    
                callback(null, { vendors, delivery_partners });
            });
        });
    },

    // Approve verification for a specific user
    verifyUser: (userId,verification_status, callback) => {
        const query = `UPDATE users SET is_verified = ? WHERE id = ?`;
        db.query(query, [verification_status,userId], callback);
    },

    checkVerificationStatus: (user_id, callback) => {
        const query = `SELECT verification_applied, is_verified FROM users WHERE id = ?`;
        db.query(query, [user_id], (err, results) => {
            if (err) return callback(err, null);
            if (results.length === 0) return callback(null, null);
            return callback(null, results[0]);
        });
    },

    insertUserVerification: (role_id, data, callback) => {
        let insertQuery;
        let values;

        if (role_id == 3) { // Vendor
            // Convert array to comma-separated string
            const vendorTypeIdsString = Array.isArray(data.vendor_type_id) 
                ? data.vendor_type_id.join(',') 
                : data.vendor_type_id;

            insertQuery = `
                INSERT INTO vendors 
                (user_id, store_name, store_address, sin_code, country_status, identity_proof, profile_pic, store_image, business_reg_number, vendor_type_id, vendor_start_time, vendor_close_time, vendor_lat, vendor_lng) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            values = [
                data.user_id,
                data.storename,
                data.storeaddress,
                data.sincode,
                data.countrystatus,
                data.identity_proof,
                data.worker_profilePic,
                data.store_image,
                data.business_reg_number,
                vendorTypeIdsString,
                data.vendor_start_time,
                data.vendor_close_time ,
                data.vendor_lat,
                data.vendor_lng 
            ];
        } else if (role_id == 4) { // Delivery Partner
            insertQuery = `
                INSERT INTO delivery_partners 
                (user_id, license_number, license_expiry_date, rider_license_image, profile_pic, vehicle_owner_name, vehicle_registration_number, vehicle_type, registraion_expiry_date, registration_doc, identity_proof) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            values = [
                data.user_id,
                data.license_number,
                data.license_expiry_date,
                data.rider_license_image,
                data.worker_profilePic,
                data.vehicle_owner_name,
                data.vehicle_registration_number,
                data.vehicle_type,
                data.registraion_expiry_date,
                data.registration_doc,
                data.identity_proof
            ];
        } else {
            return callback(new Error('Invalid role_id'), null);
        }

        db.query(insertQuery, values, (err, result) => {
            if (err) {
                return callback(err, null);
            }
            // ✅ Removed verification_applied update
            callback(null, { insertResult: result });
        });
    },
    
    updateRiderPersonalDetails: (role_id, data, callback) => {

        const checkQuery = `SELECT id FROM delivery_partners WHERE user_id = ?`;
        db.query(checkQuery, [data.user_id], (checkErr, rows) => {
            if (checkErr) {
                console.error("❌ [ERROR] Failed to check delivery_partners:", checkErr);
                return callback(checkErr, null);
            }

            if (rows.length === 0) {
                const insertQuery = `
                    INSERT INTO delivery_partners (user_id, address, dob, other_phone_number, profile_pic, identity_proof)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                const insertValues = [
                    data.user_id,
                    data.address,
                    data.dob,
                    data.other_phone_number,
                    data.profile_pic,
                    data.identity_proof
                ];

                db.query(insertQuery, insertValues, (insertErr, insertResult) => {
                    if (insertErr) {
                        console.error("❌ [ERROR] Failed to insert into delivery_partners:", insertErr);
                        return callback(insertErr, null);
                    }

                    // Update verification_applied after insert
                    updateVerificationApplied(data.user_id, callback, insertResult);
                });
            } else {
                console.log("✅ [DEBUG] delivery_partner found, updating existing row...");

                const updateDeliveryPartnerQuery = `
                    UPDATE delivery_partners 
                    SET 
                        address = ?, 
                        dob = ?, 
                        other_phone_number = ?, 
                        profile_pic = ?, 
                        identity_proof = ?
                    WHERE user_id = ?
                `;

                const deliveryPartnerValues = [
                    data.address,
                    data.dob,
                    data.other_phone_number,
                    data.profile_pic,
                    data.identity_proof,
                    data.user_id
                ];

                db.query(updateDeliveryPartnerQuery, deliveryPartnerValues, (err, result) => {
                    if (err) {
                        console.error("❌ [ERROR] Failed to update delivery_partners:", err);
                        return callback(err, null);
                    }
                    console.log("✅ [DEBUG] Updated delivery_partner row:", result);
                    updateVerificationApplied(data.user_id, callback, result);
                });
            }
        });

        function updateVerificationApplied(user_id, callback, deliveryPartnerResult) {
            const updateUserQuery = `UPDATE users SET verification_applied = TRUE WHERE id = ?`;
            db.query(updateUserQuery, [user_id], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error("❌ [ERROR] Failed to update users:", updateErr);
                    return callback(updateErr, null);
                }
                console.log("✅ [DEBUG] users update result:", updateResult);
                callback(null, {
                    deliveryPartnerUpdate: deliveryPartnerResult,
                    userVerificationUpdate: updateResult
                });
            });
        }
    },



    // fetch user profile
    userProfile: (userId, roleId, callback) => {
        let query;
        const queryParams = [userId];
        if (typeof roleId === 'string') {
            roleId = Number(roleId);
        }
        
        // If roleId is 3, fetch delivery partner details
        if (roleId === 4) {
            query = `
                SELECT 
                    u.username,
                    u.firstname,
                    u.lastname,
                    u.email,
                    u.phonenumber,
                    u.prefix,
                    u.status,
                    u.custom_id,
                    dp.id AS delivery_partners_id,
                    dp.sin_code,
                    dp.license_number,
                    dp.profile_pic,
                    dp.other_phone_number,
                    dp.rider_start_time,
                    dp.rider_close_time,
                    dp.dob,
                    dp.address,
                    CAST(IFNULL(od.total_orders, 0) AS SIGNED) AS total_orders,
                    CAST(IFNULL(od.completed_orders, 0) AS SIGNED) AS completed_orders,
                    CAST(IFNULL(od.rejected_orders, 0) AS SIGNED) AS rejected_orders
                FROM users u
                LEFT JOIN delivery_partners dp 
                    ON dp.user_id = u.id
                LEFT JOIN (
                    SELECT 
                        rider_id,
                        COUNT(*) AS total_orders,
                        SUM(order_status = 4) AS completed_orders,
                        SUM(order_status = 5) AS rejected_orders
                    FROM order_details
                    WHERE DATE(created_at) = CURDATE()  -- ✅ filter by today's date
                    GROUP BY rider_id
                ) od ON od.rider_id = u.id
                WHERE u.id = ? AND u.role_id = ?;
            `;
            queryParams.push(roleId); // Add roleId to parameters
        } else if(roleId ===3) {
            // Default query for other roles
            query = `
                SELECT 
                    u.firstname, 
                    u.lastname, 
                    u.email, 
                    u.phonenumber, 
                    u.status,
                    u.custom_id,  
                    v.user_id AS vendor_id,
                    v.store_address, 
                    v.vendor_type_id,
                    v.sin_code, 
                    v.store_name, 
                    v.profile_pic, 
                    v.vendor_thumb,
                    v.business_reg_number,
                    v.vendor_start_time,
                    v.vendor_close_time,
                    v.vendor_lat,
                    v.vendor_lng,
                    v.store_image,
                    v.profile_pic,
                    v.gst_number,

                    CAST(IFNULL(od.total_orders, 0) AS SIGNED) AS total_orders,
                    CAST(IFNULL(od.completed_orders, 0) AS SIGNED) AS completed_orders,
                    CAST(IFNULL(od.rejected_orders, 0) AS SIGNED) AS rejected_orders

                FROM users u 
                LEFT JOIN vendors v 
                    ON v.user_id = u.id 
                LEFT JOIN (
                    SELECT 
                        vendor_id,
                        COUNT(*) AS total_orders,
                        SUM(order_status = 2) AS completed_orders,
                        SUM(order_status = 3) AS rejected_orders
                    FROM order_details
                    WHERE order_status IN (1, 2, 3)
                    AND DATE(created_at) = CURDATE()  -- ✅ Filter for today's orders
                    GROUP BY vendor_id
                ) od 
                ON od.vendor_id = v.user_id
                WHERE u.id = ? 
                AND u.role_id = ?;
            `;
            queryParams.push(roleId); // Add roleId to parameters
        }else {
            query = `
                SELECT 
                    u.firstname, 
                    u.lastname, 
                    u.email, 
                    u.phonenumber, 
                    u.custom_id, 
                    c.id AS customer_id, 
                    c.dob, 
                    c.gender, 
                    ua.*
                FROM users u
                LEFT JOIN customers c 
                    ON c.user_id = u.id
                LEFT JOIN user_addresses ua 
                    ON ua.id = (
                        SELECT uad.id
                        FROM user_addresses uad
                        WHERE uad.user_id = u.id
                        ORDER BY uad.created_at DESC
                        LIMIT 1
                    )
                WHERE u.id = ? 
                AND u.role_id = ?;
                ;
            `;
            queryParams.push(roleId); // You also need to push roleId here!
        }
        
        // Run the query
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return callback(err, null);
            }
            return callback(null, results[0]); // Return single user object
        });
    },     

    userStatus: (data, callback) => {
        const { user_id, ...fieldsToUpdate } = data;

        const keys = Object.keys(fieldsToUpdate);
        const values = Object.values(fieldsToUpdate);

        // Construct dynamic SQL query
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        const sql = `UPDATE users SET ${setClause} WHERE id = ?`;

        db.query(sql, [...values, user_id], (err, result) => {
            if (err) return callback(err);
            if (result.affectedRows === 0) return callback(null, null);
            callback(null, true);
        });
    },

    Status: (data, callback) => {
        const { role_id, user_id, status, deactivated_by, start_time, close_time } = data;

        let updateSql = null;
        let updateValues = [];

        if (role_id === 3) {
            // Vendors table
            let setFields = [];
            if (typeof start_time !== 'undefined') {
                setFields.push(`vendor_start_time = ?`);
                updateValues.push(start_time);
            }
            if (typeof close_time !== 'undefined') {
                setFields.push(`vendor_close_time = ?`);
                updateValues.push(close_time);
            }

            if (setFields.length > 0) {
                updateSql = `
                    UPDATE vendors 
                    SET ${setFields.join(', ')} 
                    WHERE user_id = ?
                `;
                updateValues.push(user_id);
            }
        } else if (role_id === 4) {
            // Delivery partners table
            let setFields = [];
            if (typeof start_time !== 'undefined') {
                setFields.push(`rider_start_time = ?`);
                updateValues.push(start_time);
            }
            if (typeof close_time !== 'undefined') {
                setFields.push(`rider_close_time = ?`);
                updateValues.push(close_time);
            }

            if (setFields.length > 0) {
                updateSql = `
                    UPDATE delivery_partners 
                    SET ${setFields.join(', ')} 
                    WHERE user_id = ?
                `;
                updateValues.push(user_id);
            }
        }

        // Always update users table
        const userSql = `
            UPDATE users 
            SET status = ?, deactivated_by = ? 
            WHERE id = ?
        `;
        const userValues = [status, deactivated_by, user_id];

        if (updateSql) {
            db.query(updateSql, updateValues, (err, result) => {
                if (err) return callback(err);

                db.query(userSql, userValues, (err, userResult) => {
                    if (err) return callback(err);
                    callback(null, true);
                });
            });
        } else {
            db.query(userSql, userValues, (err, userResult) => {
                if (err) return callback(err);
                callback(null, true);
            });
        }
    },





    vehicleDetails: (user_id, callback) => {
        const sql = `
            SELECT 
                vd.vehicle_owner_name,
                vd.vehicle_registration_number,
                vd.vehicle_type,
                vd.registraion_expiry_date,  -- match typo exactly
                vd.registration_doc 
            FROM delivery_partners vd 
            WHERE vd.user_id = ?
        `;

        db.query(sql, [user_id], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return callback(err, null);
            }
            return callback(null, results[0]);
        });
    },

    allVendors: (user_id, vendor_type_ids = [], callback) => {
        let sql = `
            SELECT 
                u.firstname, 
                u.lastname, 
                u.email, 
                u.prefix, 
                u.phonenumber,
                u.status,
                v.store_address, 
                v.sin_code, 
                v.store_name, 
                v.profile_pic, 
                v.user_id AS vendor_id,
                v.store_image,
                v.vendor_thumb,
                v.vendor_start_time,
                v.vendor_close_time,
                IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,

                -- ✅ Vendor rating columns
                IFNULL(r.avg_rating, 0) AS vendor_rating,
                IFNULL(r.total_ratings, 0) AS total_vendor_ratings,

                (
                    SELECT GROUP_CONCAT(DISTINCT p.featured_image)
                    FROM products p
                    WHERE p.vendor_id = v.user_id
                ) AS featured_images

            FROM users u
            JOIN vendors v ON v.user_id = u.id
            LEFT JOIN favourite_vendors fv 
                ON fv.vendor_id = v.user_id 
                AND fv.user_id = ?

            -- ✅ LEFT JOIN to get vendor ratings
            LEFT JOIN (
                SELECT 
                    rateable_id,
                    ROUND(AVG(rating), 1) AS avg_rating,
                    COUNT(*) AS total_ratings
                FROM ratings
                WHERE rateable_type = 2  -- ✅ 2 = Vendor
                GROUP BY rateable_id
            ) r ON r.rateable_id = v.user_id

            WHERE u.is_verified = 1 
            AND u.status = 1
            AND EXISTS (
                SELECT 1 
                FROM products p2 
                WHERE p2.vendor_id = v.user_id
            )
        `;

        const params = [user_id];

        // ✅ Add vendor_type_ids filter dynamically (if any)
        if (vendor_type_ids.length > 0) {
            const findSetConditions = vendor_type_ids.map(() => `FIND_IN_SET(?, v.vendor_type_id)`).join(' OR ');
            sql += ` AND (${findSetConditions})`;
            params.push(...vendor_type_ids);
        }

        // ✅ Finally append LIMIT (only once)
        sql += ` LIMIT 0, 1000`;

        db.query(sql, params, callback);
    },



    
    updateRiderLocation: (userId, rider_lat, rider_lng, callback) => {
        const sql = `
            UPDATE delivery_partners
            SET rider_lat = ?, rider_lng = ?
            WHERE user_id = ?;
        `;
        
        db.query(sql, [rider_lat, rider_lng, userId], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return callback(err, null);
            }
            return callback(null, results);
        });
    },
    getUserDetailsByIdAsync: (userId, user_address_id) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    CONCAT(u.firstname, ' ', u.lastname) AS full_name,
                    CONCAT_WS(', ', ud.address, ud.type, ud.floor, ud.landmark) AS full_address
                FROM 
                    users u
                JOIN 
                    user_addresses ud 
                ON 
                    ud.user_id = u.id
                WHERE 
                    u.id = ? AND ud.id = ?;
            `;

            db.query(sql, [userId, user_address_id], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    },
    getTravelDistance: async (vendorLat, vendorLng, user_id, user_address_id) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT customer_lat, customer_lng
                FROM user_addresses
                WHERE user_id = ? AND id = ?
            `;
            db.query(sql, [user_id, user_address_id], async (err, results) => {
                if (err) return reject(err);
                if (!results.length) return reject(new Error("Address not found"));

                const { customer_lat, customer_lng } = results[0];
                try {
                    const travelData = await distanceCustomerVendor(vendorLat, vendorLng, customer_lat, customer_lng);
                    resolve(travelData);
                } catch (err) {
                    reject(err);
                }
            });
        });
    },


    getNearbyRiders: async (vendorLat, vendorLng, radiusInKm = 3) => {
        vendorLat = Number(vendorLat);
        vendorLng = Number(vendorLng);

        if (isNaN(vendorLat) || isNaN(vendorLng)) {
            throw new Error("Invalid coordinates");
        }

        const latDelta = radiusInKm / 111;
        const lngDelta = radiusInKm / (111 * Math.cos(vendorLat * Math.PI / 180));

        const minLat = Number((vendorLat - latDelta).toFixed(6));
        const maxLat = Number((vendorLat + latDelta).toFixed(6));
        const minLng = Number((vendorLng - lngDelta).toFixed(6));
        const maxLng = Number((vendorLng + lngDelta).toFixed(6));

        const sql = `
            SELECT user_id, rider_lat, rider_lng
            FROM delivery_partners
            WHERE rider_lat BETWEEN ? AND ?
            AND rider_lng BETWEEN ? AND ?
        `;

        try {
            const riders = await new Promise((resolve, reject) => {
            db.query(sql, [minLat, maxLat, minLng, maxLng], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
            });

            if (!riders.length) return [];

            // Now get an array of {rider, distance, polyline}
            const ridersWithDistances = await getDistanceMatrix(vendorLat, vendorLng, riders);

            // Filter riders within radius and map needed data
            const nearbyRiders = ridersWithDistances
            .filter(({ distance }) => distance !== null && (distance / 1000) <= radiusInKm)
            .map(({ rider, distance, polyline }) => ({
                ...rider,
                distance_km: (distance / 1000).toFixed(2),
                polyline,
            }));

            return nearbyRiders;

        } catch (error) {
            console.error("Error in getNearbyRiders:", error);
            throw error;
        }
    },

    // getNearbyRidersWithPolylines: (
    //     order_id,
    //     vendorId,
    //     vendorLat,
    //     vendorLng,
    //     customerId,
    //     user_address_id,
    //     radiusInKm = 3,
    //     callback
    // ) => {
    //     vendorLat = Number(vendorLat);
    //     vendorLng = Number(vendorLng);

    //     if (isNaN(vendorLat) || isNaN(vendorLng)) {
    //         console.error("❌ Invalid coordinates:", { vendorLat, vendorLng });
    //         return callback(new Error("Invalid coordinates"));
    //     }

    //     const sqlCustomer = `
    //         SELECT customer_lat, customer_lng
    //         FROM user_addresses
    //         WHERE user_id = ? AND id = ?
    //     `;

    //     db.query(sqlCustomer, [customerId, user_address_id], (err, customerResults) => {
    //         if (err) {
    //             console.error("❌ Error fetching customer coordinates:", err);
    //             return callback(err);
    //         }
    //         if (!customerResults.length) {
    //             console.warn("⚠️ No customer address found:", { customerId, user_address_id });
    //             return callback(new Error("Address not found"));
    //         }

    //         const { customer_lat, customer_lng } = customerResults[0];

    //         const latDelta = radiusInKm / 111;
    //         const lngDelta = radiusInKm / (111 * Math.cos(vendorLat * Math.PI / 180));
    //         const minLat = vendorLat - latDelta;
    //         const maxLat = vendorLat + latDelta;
    //         const minLng = vendorLng - lngDelta;
    //         const maxLng = vendorLng + lngDelta;

    //         const sqlRiders = `
    //             SELECT user_id AS riderId, rider_lat, rider_lng
    //             FROM delivery_partners
    //             WHERE rider_lat BETWEEN ? AND ?
    //             AND rider_lng BETWEEN ? AND ?
    //         `;

    //         db.query(sqlRiders, [minLat, maxLat, minLng, maxLng], (err, riders) => {
    //             if (err) {
    //                 console.error("❌ Error querying riders:", err);
    //                 return callback(err);
    //             }
    //             if (!riders.length) {
    //                 console.log("⚠️ No riders found within bounding box");
    //                 return callback(null, []);
    //             }

    //             getDistanceMatrix(vendorLat, vendorLng, riders, customer_lat, customer_lng, (err, results) => {
    //                 if (err) return callback(err);

    //                 // ✅ Fix: ensure distance is always a number string, not null
    //                 const riderPolylines = results.map(({ rider, riderVendorPolyline, distance_rider_to_vendor }) => {
    //                     let distanceKm = "0.00"; // default if missing
    //                     if (distance_rider_to_vendor && !isNaN(distance_rider_to_vendor)) {
    //                         distanceKm = (distance_rider_to_vendor / 1000).toFixed(2);
    //                     }

    //                     return {
    //                         riderId: rider.riderId,
    //                         polyline: riderVendorPolyline || null,
    //                         distance_km: distanceKm,
    //                     };
    //                 });

    //                 const vendorCustomerPolyline = results[0]?.vendorCustomerPolyline || null;
    //                 let vendorToCustomerDistance = "0.00";
    //                 if (results[0]?.vendor_to_customer_distance && !isNaN(results[0].vendor_to_customer_distance)) {
    //                     vendorToCustomerDistance = (results[0].vendor_to_customer_distance / 1000).toFixed(2);
    //                 }

    //                 savePolylines(order_id,vendorId, customerId, vendorCustomerPolyline, riderPolylines, (err) => {
    //                     if (err) return callback(err);

    //                     const result = riderPolylines.map(rp => ({
    //                         user_id: rp.riderId,
    //                         distance_km: rp.distance_km,
    //                         vendor_to_customer_distance_km: vendorToCustomerDistance,
    //                     }));

    //                     callback(null, result);
    //                 });
    //             });
    //         });
    //     });
    // },

    getNearbyRidersWithPolylines: (
            order_id,
            vendorId,
            vendorLat,
            vendorLng,
            customerId,
            user_address_id,
            radiusInKm 
        ) => {
            return new Promise((resolve, reject) => {
                vendorLat = Number(vendorLat);
                vendorLng = Number(vendorLng);

                if (isNaN(vendorLat) || isNaN(vendorLng)) {
                    console.error("❌ Invalid coordinates:", { vendorLat, vendorLng });
                    return reject(new Error("Invalid coordinates"));
                }

                const sqlCustomer = `
                    SELECT customer_lat, customer_lng
                    FROM user_addresses
                    WHERE user_id = ? AND id = ?
                `;

                db.query(sqlCustomer, [customerId, user_address_id], (err, customerResults) => {
                    if (err) return reject(err);
                    if (!customerResults.length) return reject(new Error("Address not found"));

                    const { customer_lat, customer_lng } = customerResults[0];

                    const latDelta = radiusInKm / 111;
                    const lngDelta = radiusInKm / (111 * Math.cos(vendorLat * Math.PI / 180));
                    const minLat = vendorLat - latDelta;
                    const maxLat = vendorLat + latDelta;
                    const minLng = vendorLng - lngDelta;
                    const maxLng = vendorLng + lngDelta;

                    const sqlRiders = `
                        SELECT dp.user_id AS riderId, dp.rider_lat, dp.rider_lng
                        FROM delivery_partners dp
                        JOIN users u on u.id = dp.user_id 
                        WHERE dp.rider_lat BETWEEN ? AND ?
                        AND dp.rider_lng BETWEEN ? AND ? AND u.status = 1
                    `;

                    db.query(sqlRiders, [minLat, maxLat, minLng, maxLng], (err, riders) => {
                        if (err) return reject(err);
                        if (!riders.length) return resolve([]);

                        getDistanceMatrix(vendorLat, vendorLng, riders, customer_lat, customer_lng, (err, results) => {
                            if (err) return reject(err);

                            const riderCoordinates = results.map(({ rider }) => ({
                                riderId: rider.riderId,
                                rider_lat: Number(rider.rider_lat),
                                rider_lng: Number(rider.rider_lng)
                            }));

                            saveRouteCoordinates(
                                order_id,
                                vendorId,
                                vendorLng,
                                vendorLat,
                                customerId,
                                customer_lat,
                                customer_lng,
                                riderCoordinates,
                                (err) => {
                                    if (err) return reject(err);

                                    const vendorToCustomerMeters = results[0]?.vendor_to_customer_distance;
                                    const vendorToCustomerDistanceKm = (vendorToCustomerMeters && !isNaN(vendorToCustomerMeters))
                                        ? (vendorToCustomerMeters / 1000).toFixed(2)
                                        : "0.00";

                                    const final = results.map(({ rider, distance_rider_to_vendor }) => {
                                        let distanceKm = "0.00";
                                        if (distance_rider_to_vendor && !isNaN(distance_rider_to_vendor)) {
                                            distanceKm = (distance_rider_to_vendor / 1000).toFixed(2);
                                        }

                                        return {
                                            user_id: rider.riderId,
                                            rider_lat: Number(rider.rider_lat),
                                            rider_lng: Number(rider.rider_lng),
                                            distance_km: distanceKm,
                                            vendor_to_customer_distance_km: vendorToCustomerDistanceKm
                                        };
                                    });

                                    resolve(final);
                                }
                            );
                        });
                    });
                });
            });
        },


    // getNearbyRidersWithPolylines: (
    //     order_id,
    //     vendorId,
    //     vendorLat,
    //     vendorLng,
    //     customerId,
    //     user_address_id,
    //     radiusInKm = 3,
    //     callback
    // ) => {
    //     vendorLat = Number(vendorLat);
    //     vendorLng = Number(vendorLng);

    //     if (isNaN(vendorLat) || isNaN(vendorLng)) {
    //         console.error("❌ Invalid coordinates:", { vendorLat, vendorLng });
    //         return callback(new Error("Invalid coordinates"));
    //     }

    //     const sqlCustomer = `
    //         SELECT customer_lat, customer_lng
    //         FROM user_addresses
    //         WHERE user_id = ? AND id = ?
    //     `;

    //     db.query(sqlCustomer, [customerId, user_address_id], (err, customerResults) => {
    //         if (err) return callback(err);
    //         if (!customerResults.length) return callback(new Error("Address not found"));

    //         const { customer_lat, customer_lng } = customerResults[0];

    //         const latDelta = radiusInKm / 111;
    //         const lngDelta = radiusInKm / (111 * Math.cos(vendorLat * Math.PI / 180));
    //         const minLat = vendorLat - latDelta;
    //         const maxLat = vendorLat + latDelta;
    //         const minLng = vendorLng - lngDelta;
    //         const maxLng = vendorLng + lngDelta;

    //         const sqlRiders = `
    //             SELECT dp.user_id AS riderId, dp.rider_lat, dp.rider_lng
    //             FROM delivery_partners dp
    //             JOIN users u on u.id = dp.user_id 
    //             WHERE dp.rider_lat BETWEEN ? AND ?
    //             AND dp.rider_lng BETWEEN ? AND ? AND u.status = 1
    //         `;
    //         db.query(sqlRiders, [minLat, maxLat, minLng, maxLng], (err, riders) => {
    //             if (err) return callback(err);
    //             if (!riders.length) return callback(null, []);

    //             getDistanceMatrix(vendorLat, vendorLng, riders, customer_lat, customer_lng, (err, results) => {
    //                 if (err) return callback(err);

    //                 // Build data for DB
    //                 const riderCoordinates = results.map(({ rider }) => ({
    //                     riderId: rider.riderId,
    //                     rider_lat: Number(rider.rider_lat),
    //                     rider_lng: Number(rider.rider_lng)
    //                 }));
    //                 saveRouteCoordinates(
    //                     order_id,
    //                     vendorId,
    //                     vendorLng,
    //                     vendorLat,
    //                     customerId,
    //                     customer_lat,
    //                     customer_lng,
    //                     riderCoordinates,
    //                     (err) => {
    //                         if (err) return callback(err);

    //                         // Build final response for frontend
    //                         const vendorToCustomerMeters = results[0]?.vendor_to_customer_distance;
    //                         const vendorToCustomerDistanceKm = (vendorToCustomerMeters && !isNaN(vendorToCustomerMeters))
    //                             ? (vendorToCustomerMeters / 1000).toFixed(2)
    //                             : "0.00";
    //                         const final = results.map(({ rider, distance_rider_to_vendor }) => {
    //                             let distanceKm = "0.00";
    //                             if (distance_rider_to_vendor && !isNaN(distance_rider_to_vendor)) {
    //                                 distanceKm = (distance_rider_to_vendor / 1000).toFixed(2);
    //                             }

    //                             return {
    //                                 user_id: rider.riderId,
    //                                 rider_lat: Number(rider.rider_lat),
    //                                 rider_lng: Number(rider.rider_lng),
    //                                 distance_km: distanceKm,
    //                                 vendor_to_customer_distance_km: vendorToCustomerDistanceKm
    //                             };
    //                         });

    //                         callback(null, final);
    //                     }
    //                 );
    //             });
    //         });
    //     });
    // },

    getNearbyRidersWithPolylinesForParcel: (
        parcelId,
        pickupLat,
        pickupLng,
        radiusInKm = 3,
        callback
    ) => {
        pickupLat = Number(pickupLat);
        pickupLng = Number(pickupLng);

        if (isNaN(pickupLat) || isNaN(pickupLng)) {
            console.error("❌ Invalid pickup coordinates:", { pickupLat, pickupLng });
            return callback(new Error("Invalid coordinates"));
        }

        const latDelta = radiusInKm / 111;
        const lngDelta = radiusInKm / (111 * Math.cos(pickupLat * Math.PI / 180));

        const minLat = pickupLat - latDelta;
        const maxLat = pickupLat + latDelta;
        const minLng = pickupLng - lngDelta;
        const maxLng = pickupLng + lngDelta;

        const sqlRiders = `
            SELECT dp.user_id AS riderId, dp.rider_lat, dp.rider_lng
            FROM delivery_partners dp
            JOIN users u on u.id = dp.user_id 
            WHERE dp.rider_lat BETWEEN ? AND ?
            AND dp.rider_lng BETWEEN ? AND ? AND u.status = 1
        `;

        db.query(sqlRiders, [minLat, maxLat, minLng, maxLng], (err, riders) => {
            if (err) return callback(err);
            if (!riders.length) return callback(null, []);

            // 🚚 Calculate distances from rider to pickup (skip vendor/customer logic)
            getDistanceMatrix(pickupLat, pickupLng, riders, null, null, (err, results) => {
                if (err) return callback(err);

                const final = results.map(({ rider, distance_rider_to_vendor }) => {
                    let distanceKm = "0.00";
                    if (distance_rider_to_vendor && !isNaN(distance_rider_to_vendor)) {
                        distanceKm = (distance_rider_to_vendor / 1000).toFixed(2);
                    }

                    return {
                        user_id: rider.riderId,
                        rider_lat: Number(rider.rider_lat),
                        rider_lng: Number(rider.rider_lng),
                        distance_km: distanceKm
                    };
                });

                callback(null, final);
            });
        });
    },



    updateStoreDetails: (user_id, data, callback) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');

        const sql = `UPDATE vendors SET ${setClause} WHERE user_id = ?`;

        db.query(sql, [...values, user_id], (err, result) => {
            if (err) return callback(err);

            // ✅ After successful vendor update, update verification_applied = TRUE
            const updateQuery = `
                UPDATE users 
                SET verification_applied = TRUE 
                WHERE id = ?
            `;
            db.query(updateQuery, [user_id], (updateErr, updateResult) => {
                if (updateErr) return callback(updateErr, null);
                
                callback(null, { vendorUpdate: result, verificationUpdate: updateResult });
            });
        });
    },


    getallVendorsForAdmin: (vendor_id, callback) => {
        let sql = `
            SELECT 
                u.custom_id,
                u.role_id,
                u.username,
                u.is_verified,
                u.verification_applied,
                u.status,
                u.firstname, 
                u.lastname, 
                u.email, 
                u.prefix, 
                u.phonenumber,
                v.country_status,
                v.business_reg_number,
                v.store_image,
                v.identity_proof,
                v.vendor_thumb,
                v.vendor_start_time,
                v.vendor_close_time,
                v.vendor_lat,
                v.vendor_lng,
                v.bussiness_license_number,
                v.bussiness_license_number_pic,
                v.gst_number,
                v.gst_number_pic,
                v.vendor_insurance_certificate,
                v.health_inspection_certificate,
                v.food_certificate,
                v.store_address, 
                v.sin_code, 
                v.store_name, 
                v.profile_pic, 
                v.user_id AS vendor_id,
                ub.*
            FROM users u
            JOIN vendors v ON v.user_id = u.id
            JOIN users_bank_details ub on ub.user_id = u.id
            WHERE u.role_id = 3 and u.is_verified = 1
        `;

        // Add conditionally WHERE clause if vendor_id is provided
        const params = [];
        if (vendor_id) {
            sql += ` AND u.id = ?`;
            params.push(vendor_id);
        }

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return callback(err, null);
            }
            return callback(null, results);
        });
    },

    getallRidersForAdmin: (vendor_id, callback) => {
        let sql = `
            SELECT 
                u.custom_id,
                u.role_id,
                u.username,
                u.is_verified,
                u.verification_applied,
                u.status,
                u.firstname, 
                u.lastname, 
                u.email, 
                u.prefix, 
                u.phonenumber,
                r.identity_proof,
                r.country_status,
                r.sin_code,
                r.license_number,
                r.profile_pic,
                r.rider_lat,
                r.rider_lng,
                r.user_id AS rider_id,
                r.vehicle_registration_number,
                r.registration_doc,
                r.rider_license_image,
                ub.*
            FROM users u
            JOIN delivery_partners r ON r.user_id = u.id
            JOIN users_bank_details ub on ub.user_id = u.id
            WHERE u.role_id = 4 and u.is_verified = 1
        `;

        // Add conditionally WHERE clause if vendor_id is provided
        const params = [];
        if (vendor_id) {
            sql += ` AND u.id = ?`;
            params.push(vendor_id);
        }

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return callback(err, null);
            }
            return callback(null, results);
        });
    },
    createvendortype: (data, callback) => {
        const sql = 'INSERT INTO vendor_type (vendor_type, status, vendor_type_image) VALUES (?, ?, ?)';
        db.query(sql, [data.vendor_type, data.status, data.vendor_type_image], callback);
    },

    getAllvendortype: (callback) => {
        const sql = 'SELECT * FROM vendor_type';
        db.query(sql, callback);
    },

    updatevendortype: (id, data, callback) => {
        const sql = 'UPDATE vendor_type SET vendor_type = ?, status = ?, vendor_type_image = ? WHERE id = ?';
        db.query(sql, [data.vendor_type, data.status, data.vendor_type_image, id], callback);
    },

    deletevendortype: (id, callback) => {
        const sql = 'DELETE FROM vendor_type WHERE id = ?';
        db.query(sql, [id], callback);
    },
    getVendorTypeById: (id, callback) => {
        const sql = 'SELECT * FROM vendor_type where id = ?';
        db.query(sql, [id],callback);
    },
// ✅ Model function
    addBankDetails: (user_id, data, callback) => {
        const {
            role_id,
            account_holder_name,
            transit_number,
            institution_number,
            account_number,
            bank_name,
            void_cheque
        } = data;

        const query = `
            INSERT INTO users_bank_details 
            (user_id, role_id, account_holder_name, transit_number, institution_number, account_number, void_cheque, bank_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                role_id = VALUES(role_id),
                account_holder_name = VALUES(account_holder_name),
                transit_number = VALUES(transit_number),
                institution_number = VALUES(institution_number),
                account_number = VALUES(account_number),
                void_cheque = VALUES(void_cheque),
                bank_name = VALUES(bank_name),
                updated_at = CURRENT_TIMESTAMP
        `;

        const values = [
            user_id,
            role_id,
            account_holder_name,
            transit_number,
            institution_number,
            account_number,
            void_cheque,
            bank_name
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error("❌ DB Error:", err);
                return callback(err, null);
            }
            callback(null, result);
        });
    },


    userBankDetails: (user_id, role_id, callback) => {
        const sql = `
            SELECT 
                account_holder_name,
                account_number,
                institution_number,
                transit_number,
                bank_name
            FROM users_bank_details 
            WHERE user_id = ? AND role_id = ?
        `;

        db.query(sql, [user_id, role_id], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return callback(err, null);
            }
            return callback(null, results[0]);
        });
    },
    getVendorAnalytics: (vendorId, callback) => {
        const analytics = {};

        const completionRateQuery = `
            SELECT 
                (SUM(CASE WHEN order_status = 4 THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS completion_rate 
            FROM order_details 
            WHERE vendor_id = ?
        `;

        db.query(completionRateQuery, [vendorId], (err, result1) => {
            if (err) return callback(err);
            analytics.completionRate = parseFloat(result1[0]?.completion_rate || 0).toFixed(2);

            const ordersByHourQuery = `
                SELECT HOUR(created_at) AS order_hour, COUNT(*) AS order_count 
                FROM order_details 
                WHERE vendor_id = ? 
                GROUP BY order_hour
            `;
            db.query(ordersByHourQuery, [vendorId], (err, result2) => {
                if (err) return callback(err);
                analytics.ordersByHour = result2;
                analytics.topHour = result2.reduce((top, curr) =>
                    curr.order_count > (top?.order_count || 0) ? curr : top, null
                );

                const dayOfWeekQuery = `
                    SELECT DAYNAME(created_at) AS day, COUNT(*) AS orders
                    FROM order_details
                    WHERE vendor_id = ?
                    GROUP BY day
                `;
                db.query(dayOfWeekQuery, [vendorId], (err, result3) => {
                    if (err) return callback(err);
                    analytics.dayOfWeekOrders = result3;
                    analytics.topDay = result3.reduce((top, curr) =>
                        curr.orders > (top?.orders || 0) ? curr : top, null
                    );

                    const weekOfMonthQuery = `
                        SELECT 
                            WEEK(created_at) - WEEK(DATE_SUB(created_at, INTERVAL DAYOFMONTH(created_at)-1 DAY)) + 1 AS week_of_month,
                            COUNT(*) AS order_count
                        FROM order_details
                        WHERE vendor_id = ?
                        GROUP BY week_of_month
                    `;
                    db.query(weekOfMonthQuery, [vendorId], (err, result4) => {
                        if (err) return callback(err);
                        analytics.weekOfMonthOrders = result4;
                        analytics.topWeek = result4.reduce((top, curr) =>
                            curr.order_count > (top?.order_count || 0) ? curr : top, null
                        );

                        const todayOrderQuery = `
                            SELECT COUNT(*) AS total_today 
                            FROM order_details 
                            WHERE vendor_id = ? AND DATE(created_at) = CURDATE()
                        `;
                        db.query(todayOrderQuery, [vendorId], (err, result5) => {
                            if (err) return callback(err);
                            analytics.totalOrdersToday = result5[0]?.total_today || 0;

                            const weekOrderQuery = `
                                SELECT COUNT(*) AS total_week 
                                FROM order_details 
                                WHERE vendor_id = ? 
                                AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
                            `;
                            db.query(weekOrderQuery, [vendorId], (err, result6) => {
                                if (err) return callback(err);
                                analytics.totalOrdersWeek = result6[0]?.total_week || 0;

                                const monthOrderQuery = `
                                    SELECT COUNT(*) AS total_month 
                                    FROM order_details 
                                    WHERE vendor_id = ? 
                                    AND MONTH(created_at) = MONTH(CURDATE()) 
                                    AND YEAR(created_at) = YEAR(CURDATE())
                                `;
                                db.query(monthOrderQuery, [vendorId], (err, result7) => {
                                    if (err) return callback(err);
                                    analytics.totalOrdersMonth = result7[0]?.total_month || 0;

                                    const repeatCustomerQuery = `
                                        SELECT 
                                            (rc.repeat_count / t.total_users) * 100 AS repeat_percentage
                                        FROM (
                                            SELECT COUNT(*) AS repeat_count
                                            FROM (
                                                SELECT user_id 
                                                FROM order_details 
                                                WHERE vendor_id = ? AND user_id IS NOT NULL
                                                GROUP BY user_id 
                                                HAVING COUNT(*) > 1
                                            ) AS repeat_customers
                                        ) AS rc
                                        JOIN (
                                            SELECT COUNT(DISTINCT user_id) AS total_users 
                                            FROM order_details 
                                            WHERE vendor_id = ? AND user_id IS NOT NULL
                                        ) AS t
                                    `;
                                    db.query(repeatCustomerQuery, [vendorId, vendorId], (err, result8) => {
                                        if (err) return callback(err);
                                        analytics.repeatCustomerPercentage = parseFloat(result8[0]?.repeat_percentage || 0).toFixed(2);

                                        return callback(null, analytics);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },
    getRiderAnalytics: (rider_id, callback) => {
        const analytics = {};

        const completionRateQuery = `
            SELECT 
                (SUM(CASE WHEN order_status = 4 THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS completion_rate 
            FROM order_details 
            WHERE rider_id = ?
        `;

        db.query(completionRateQuery, [rider_id], (err, result1) => {
            if (err) return callback(err);
            analytics.completionRate = parseFloat(result1[0]?.completion_rate || 0).toFixed(2);

            const ordersByHourQuery = `
                SELECT HOUR(created_at) AS order_hour, COUNT(*) AS order_count 
                FROM order_details 
                WHERE rider_id = ? 
                GROUP BY order_hour
            `;
            db.query(ordersByHourQuery, [rider_id], (err, result2) => {
                if (err) return callback(err);
                analytics.ordersByHour = result2;
                analytics.topHour = result2.reduce((top, curr) =>
                    curr.order_count > (top?.order_count || 0) ? curr : top, null
                );

                const dayOfWeekQuery = `
                    SELECT DAYNAME(created_at) AS day, COUNT(*) AS orders
                    FROM order_details
                    WHERE rider_id = ?
                    GROUP BY day
                `;
                db.query(dayOfWeekQuery, [rider_id], (err, result3) => {
                    if (err) return callback(err);
                    analytics.dayOfWeekOrders = result3;
                    analytics.topDay = result3.reduce((top, curr) =>
                        curr.orders > (top?.orders || 0) ? curr : top, null
                    );

                    const weekOfMonthQuery = `
                        SELECT 
                            WEEK(created_at) - WEEK(DATE_SUB(created_at, INTERVAL DAYOFMONTH(created_at)-1 DAY)) + 1 AS week_of_month,
                            COUNT(*) AS order_count
                        FROM order_details
                        WHERE rider_id = ?
                        GROUP BY week_of_month
                    `;
                    db.query(weekOfMonthQuery, [rider_id], (err, result4) => {
                        if (err) return callback(err);
                        analytics.weekOfMonthOrders = result4;
                        analytics.topWeek = result4.reduce((top, curr) =>
                            curr.order_count > (top?.order_count || 0) ? curr : top, null
                        );

                        const todayOrderQuery = `
                            SELECT COUNT(*) AS total_today 
                            FROM order_details 
                            WHERE rider_id = ? AND DATE(created_at) = CURDATE()
                        `;
                        db.query(todayOrderQuery, [rider_id], (err, result5) => {
                            if (err) return callback(err);
                            analytics.totalOrdersToday = result5[0]?.total_today || 0;

                            const weekOrderQuery = `
                                SELECT COUNT(*) AS total_week 
                                FROM order_details 
                                WHERE rider_id = ? 
                                AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
                            `;
                            db.query(weekOrderQuery, [rider_id], (err, result6) => {
                                if (err) return callback(err);
                                analytics.totalOrdersWeek = result6[0]?.total_week || 0;

                                const monthOrderQuery = `
                                    SELECT COUNT(*) AS total_month 
                                    FROM order_details 
                                    WHERE rider_id = ? 
                                    AND MONTH(created_at) = MONTH(CURDATE()) 
                                    AND YEAR(created_at) = YEAR(CURDATE())
                                `;
                                db.query(monthOrderQuery, [rider_id], (err, result7) => {
                                    if (err) return callback(err);
                                    analytics.totalOrdersMonth = result7[0]?.total_month || 0;

                                    const repeatCustomerQuery = `
                                        SELECT 
                                            (rc.repeat_count / t.total_users) * 100 AS repeat_percentage
                                        FROM (
                                            SELECT COUNT(*) AS repeat_count
                                            FROM (
                                                SELECT user_id 
                                                FROM order_details 
                                                WHERE rider_id = ? AND user_id IS NOT NULL
                                                GROUP BY user_id 
                                                HAVING COUNT(*) > 1
                                            ) AS repeat_customers
                                        ) AS rc
                                        JOIN (
                                            SELECT COUNT(DISTINCT user_id) AS total_users 
                                            FROM order_details 
                                            WHERE rider_id = ? AND user_id IS NOT NULL
                                        ) AS t
                                    `;
                                    db.query(repeatCustomerQuery, [rider_id, rider_id], (err, result8) => {
                                        if (err) return callback(err);
                                        analytics.repeatCustomerPercentage = parseFloat(result8[0]?.repeat_percentage || 0).toFixed(2);

                                        return callback(null, analytics);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    updateVehicleDetails: (user_id, updateFields, callback) => {
        if (Object.keys(updateFields).length === 0) {
            return callback(new Error('No fields to update'), null);
        }

        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(user_id);

        const query = `UPDATE delivery_partners SET ${fields} WHERE user_id = ?`;
        db.query(query, values, (err, result) => {
            if (err) return callback(err, null);
            return callback(null, result);
        });
    },

    getVendorsBySubcat : (user_id, subcat_id, callback) => {
        const sql = `
            SELECT 
                u.firstname, 
                u.lastname, 
                u.email, 
                u.prefix, 
                u.phonenumber,
                u.status,
                v.store_address, 
                v.sin_code, 
                v.store_name, 
                v.profile_pic, 
                v.user_id AS vendor_id,
                v.store_image,
                v.vendor_thumb,
                v.vendor_start_time,
                v.vendor_close_time,
                IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,
                (
                    SELECT GROUP_CONCAT(DISTINCT p.featured_image)
                    FROM products p
                    WHERE p.vendor_id = v.user_id
                ) AS featured_images
            FROM users u
            JOIN vendors v ON v.user_id = u.id
            LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
            WHERE u.is_verified = 1 
            AND u.status = 1
            AND EXISTS (
                SELECT 1 
                FROM products p2 
                WHERE p2.vendor_id = v.user_id 
                    AND p2.sub_category = ?
            )
        `;
        db.query(sql, [user_id, subcat_id], callback);
    },
    VendorbyID: (user_id, vendor_id, callback) => {
        let sql = `
            SELECT 
                u.firstname, 
                u.lastname, 
                u.email, 
                u.prefix, 
                u.phonenumber,
                u.status,
                v.store_address, 
                v.sin_code, 
                v.store_name, 
                v.profile_pic, 
                v.user_id AS vendor_id,
                v.store_image,
                v.vendor_thumb,
                v.vendor_start_time,
                v.vendor_close_time,
                IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,

                -- ✅ Vendor rating (average + total count)
                IFNULL(r.avg_rating, 0) AS vendor_rating,
                IFNULL(r.total_ratings, 0) AS total_vendor_ratings,

                (
                    SELECT GROUP_CONCAT(DISTINCT p.featured_image)
                    FROM products p
                    WHERE p.vendor_id = v.user_id
                ) AS featured_images

            FROM users u
            JOIN vendors v ON v.user_id = u.id
            LEFT JOIN favourite_vendors fv 
                ON fv.vendor_id = v.user_id 
                AND fv.user_id = ?

            -- ✅ LEFT JOIN subquery to get vendor ratings
            LEFT JOIN (
                SELECT 
                    rateable_id,
                    ROUND(AVG(rating), 1) AS avg_rating,
                    COUNT(*) AS total_ratings
                FROM ratings
                WHERE rateable_type = 2   -- 2 = Vendor
                GROUP BY rateable_id
            ) r ON r.rateable_id = v.user_id

            WHERE u.is_verified = 1 
            AND u.status = 1
            AND v.user_id = ? 
            AND EXISTS (
                SELECT 1 FROM products p2 
                WHERE p2.vendor_id = v.user_id
            )
            LIMIT 0, 1000; `;

        const params = [user_id, vendor_id];

        db.query(sql, params, callback);
    },
    
    getDashboardAnalytics: (vendor_Id, rider_id, role_id, start_date, end_date, callback) => {
        let sql, values;

        // Determine filter column based on role_id
        const filterColumn = role_id === 3 ? 'vendor_id' : 'rider_id';
        const filterValue = role_id === 3 ? vendor_Id : rider_id;

        if (start_date === end_date) {
            // ✅ Same date → group by HOUR
            sql = `
                SELECT 
                    HOUR(created_at) AS order_hour,
                    SUM(total_price) AS total_earning,
                    COUNT(*) AS total_orders,
                    COUNT(DISTINCT user_id) AS total_customers
                FROM order_details
                WHERE ${filterColumn} = ?
                AND DATE(created_at) = ?
                GROUP BY order_hour
                ORDER BY order_hour
            `;
            values = [filterValue, start_date];
        } else {
            // ✅ Different dates → group by DATE
            sql = `
                SELECT 
                    DATE(created_at) AS order_date,
                    SUM(total_price) AS total_earning,
                    COUNT(*) AS total_orders,
                    COUNT(DISTINCT user_id) AS total_customers
                FROM order_details
                WHERE ${filterColumn} = ?
                AND created_at BETWEEN ? AND ?
                GROUP BY order_date
                ORDER BY order_date
            `;
            values = [filterValue, `${start_date} 00:00:00`, `${end_date} 23:59:59`];
        }

        db.query(sql, values, (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        });
    },
    getVendorStatus: (user_id,role_id, callback) => {
        const query = `SELECT status FROM users WHERE id = ? AND role_id = ?`;
        db.query(query, [user_id,role_id], (err, results) => {
            if (err) return callback(err, null);
            if (results.length === 0) return callback(null, null);
            callback(null, results[0]); // returns a single user object
        });
    }, 




};


module.exports = {User};