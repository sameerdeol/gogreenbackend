const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { distanceCustomerVendor, getDistanceMatrix } = require('../utils/distanceService');


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
        const allowedFields = ["username", "firstname", "lastname", "password", "prefix", "phonenumber", "email", "role_id", "is_verified", "custom_id"];
        
        // Filter only available fields
        const fields = Object.keys(userData).filter(key => allowedFields.includes(key) && userData[key] !== undefined);
        
        if (fields.length === 0) {
            return callback(new Error("No valid fields provided"), null);
        }
    
        const placeholders = fields.map(() => "?").join(", ");
        const query = `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`;
        const values = fields.map(field => userData[field]);
    
        db.query(query, values, callback);
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
            const vendorTableFields = ['store_name', 'store_address', 'sin_code', 'profile_pic', 'vendor_thumb', 'vendor_lng', 'vendor_lat'];
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
        const sql = `SELECT * FROM users WHERE phonenumber = ? and role_id= ?`;
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
                (user_id, store_name, store_address, sin_code, country_status, identity_proof, profile_pic, store_image, business_reg_number, vendor_type_id, vendor_start_time,  vendor_close_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                data.vendor_close_time  
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

            // After successful insert, update verification_applied to TRUE
            const updateQuery = `
                UPDATE users 
                SET verification_applied = TRUE 
                WHERE id = ?
            `;
            db.query(updateQuery, [data.user_id], (updateErr, updateResult) => {
                if (updateErr) {
                    return callback(updateErr, null);
                }
                callback(null, { insertResult: result, updateResult: updateResult });
            });
        });
    },
    
    updateRiderPersonalDetails: (role_id, data, callback) => {
        const updateQuery = `
            UPDATE delivery_partners 
            SET 
                address = ?, 
                dob = ?, 
                other_phone_number = ?, 
                profile_pic = ?, 
                identity_proof = ?
            WHERE user_id = ?
        `;

        const values = [
            data.address,
            data.dob,
            data.other_phone_number,
            data.profile_pic,
            data.identity_proof,
            data.user_id
        ];

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, result);
        });
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
                    u.username ,u.firstname, u.lastname, u.email, u.phonenumber, u.prefix, u.status,u.custom_id, 
                    dp.id AS delivery_partners_id, dp.sin_code, dp.license_number, dp.profile_pic, dp.license_number, other_phone_number, dob, address  
                FROM users u 
                LEFT JOIN delivery_partners dp ON dp.user_id = u.id 
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
                    v.gst_number

                    CAST(IFNULL(od.total_orders, 0) AS SIGNED) AS total_orders,
                    CAST(IFNULL(od.completed_orders, 0) AS SIGNED) AS completed_orders,
                    CAST(IFNULL(od.rejected_orders, 0) AS SIGNED) AS rejected_orders

                FROM users u 
                LEFT JOIN vendors v ON v.user_id = u.id 
                LEFT JOIN (
                    SELECT 
                        vendor_id,
                        COUNT(*) AS total_orders,
                        SUM(order_status = 4) AS completed_orders,
                        SUM(order_status = 5) AS rejected_orders
                    FROM order_details
                    WHERE order_status IN (4, 5)
                    GROUP BY vendor_id
                ) od ON od.vendor_id = v.user_id
                WHERE u.id = ? AND u.role_id = ?;
            `;
            queryParams.push(roleId); // Add roleId to parameters
        }else {
            query = `
                SELECT 
                    u.firstname, u.lastname, u.email, u.phonenumber,u.custom_id, 
                    c.id AS customer_id, c.dob, c.gender
                FROM users u 
                LEFT JOIN customers c ON c.user_id = u.id 
                WHERE u.id = ? AND u.role_id = ?;
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
                (
                    SELECT GROUP_CONCAT(DISTINCT p.featured_image)
                    FROM products p
                    WHERE p.vendor_id = v.user_id
                ) AS featured_images
            FROM users u
            JOIN vendors v ON v.user_id = u.id
            LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
            WHERE u.is_verified = 1 AND u.status = 1
            AND EXISTS (
                SELECT 1 FROM products p2 WHERE p2.vendor_id = v.user_id
            )
        `;

        const params = [user_id];

        if (vendor_type_ids.length > 0) {
            const findSetConditions = vendor_type_ids.map(() => `FIND_IN_SET(?, v.vendor_type_id)`).join(' OR ');
            sql += ` AND (${findSetConditions})`;
            params.push(...vendor_type_ids);
        }

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

    updateStoreDetails: (user_id, data, callback) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');

        const sql = `UPDATE vendors SET ${setClause} WHERE user_id = ?`;

        db.query(sql, [...values, user_id], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
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
                v.user_id AS vendor_id
            FROM users u
            JOIN vendors v ON v.user_id = u.id
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
                r.user_id AS rider_id
            FROM users u
            JOIN delivery_partners r ON r.user_id = u.id
            WHERE u.role_id = 4
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
    addBankDetails:(user_id, data, callback) => {
        const {
            role_id,
            account_holder_name,
            transit_number,
            institution_number,
            account_number,
            void_cheque
        } = data;

        const query = `
            INSERT INTO users_bank_details 
            (user_id, role_id, account_holder_name, transit_number, institution_number, account_number, void_cheque)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                role_id = VALUES(role_id),
                account_holder_name = VALUES(account_holder_name),
                transit_number = VALUES(transit_number),
                institution_number = VALUES(institution_number),
                account_number = VALUES(account_number),
                void_cheque = VALUES(void_cheque),
                updated_at = CURRENT_TIMESTAMP
        `;

        const values = [
            user_id,
            role_id,
            account_holder_name,
            transit_number,
            institution_number,
            account_number,
            void_cheque
        ];

        db.query(query, values, callback);
    }

};


module.exports = {User};