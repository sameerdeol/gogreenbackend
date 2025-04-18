const db = require('../config/db');
const bcrypt = require('bcryptjs');



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

    insertUser: (userData, callback) => {
        const allowedFields = ["username", "firstname", "lastname", "password", "prefix", "phonenumber", "email", "role_id", "is_verified"];
        
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
    findByEmailForVendorRider: (email, callback) => {
        const checkQuery = `SELECT * FROM users WHERE email = ?`;  // ✅ Fixed SQL syntax
    
        db.query(checkQuery, [email], (err, results) => {
            if (err) {
                console.error('Error checking user role:', err);
                return callback(err, null);
            }
    
            if (results.length === 0) {
                return callback(null, { success: false, message: "User not found" });
            }
    
            const user = results[0];
            const isVerified = !!user.is_verified; // ✅ Cleaner boolean conversion
    
            if (!isVerified) {
                return callback(null, { success: false, message: "Your application is under review" });
            }
    
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
        bcrypt.hash(new_password, 10, (err, hashedPassword) => {
            if (err) return callback(err);
            db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user_id], callback);
        });
    },

    storeOTP: (email, otp, expiresAt, callback) => {
        // Delete any existing OTP entries for this email
        const deleteQuery = 'DELETE FROM password_resets_otp WHERE email = ?';
        db.query(deleteQuery, [email], (deleteErr) => {
            if (deleteErr) return callback(deleteErr);
    
            const insertQuery = 'INSERT INTO password_resets_otp (email, otp, expires_at) VALUES (?, ?, ?)';
            db.query(insertQuery, [email, otp, expiresAt], callback);
        });
    },
    verifyOTP: (email, otp, callback) => {
        const query = `SELECT * FROM password_resets_otp 
                       WHERE email = ? AND otp = ? AND expires_at > NOW()
                       ORDER BY id DESC LIMIT 1`;
        db.query(query, [email, otp], (err, results) => {
            if (err) return callback(err, null);
            callback(null, results[0] || null);
        });
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
            const vendorTableFields = ['store_name', 'store_address', 'sin_code', 'profile_pic'];
            const deliveryPartnerTableFields = ['license_number','sin_code', 'profile_pic'];
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
            WHERE u.is_verified = 0;
        `;
    
        const deliveryPartnersQuery = `
            SELECT u.*, dp.* 
            FROM users u
            JOIN delivery_partners dp ON u.id = dp.user_id
            WHERE u.is_verified = 0;
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
    verifyUser: (userId, callback) => {
        const query = `UPDATE users SET is_verified = 1 WHERE id = ? AND is_verified = 0`;
        db.query(query, [userId], callback);
    },

    insertUserVerification : (role_id, data, callback) => {
        let insertQuery;
        let values;
    
        if (role_id == 3) { // Vendor
            insertQuery = `
                INSERT INTO vendors 
                (user_id,store_name, store_address, sin_code, country_status, identity_proof) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            values = [data.user_id, data.storename, data.storeaddress, data.sincode, data.countrystatus, data.identity_proof];
    
        } else if (role_id == 4) { // Delivery Partner
            insertQuery = `
                INSERT INTO delivery_partners 
                (user_id, license_number, sin_code, country_status, identity_proof) 
                VALUES (?, ?, ?, ?, ?)
            `;
            values = [data.user_id, data.license_number, data.sincode, data.countrystatus, data.identity_proof];
        } else {
            return callback(new Error('Invalid role_id'), null);
        }
    
        db.query(insertQuery, values, (err, result) => {
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
        
        // If roleId is 3, fetch delivery partner details
        if (roleId === 4) {
            query = `
                SELECT 
                    u.firstname, u.lastname, u.email, u.phonenumber, u.prefix, 
                    dp.id AS delivery_partners_id, dp.sin_code, dp.license_number, dp.profile_pic 
                FROM users u 
                LEFT JOIN delivery_partners dp ON dp.user_id = u.id 
                WHERE u.id = ? AND u.role_id = ?;
            `;
            queryParams.push(roleId); // Add roleId to parameters
        } else if(roleId ===3) {
            // Default query for other roles
            query = `
                SELECT 
                    u.firstname, u.lastname, u.email, u.phonenumber, 
                    v.id AS vendor_id, v.store_address, v.sin_code, v.store_name, v.profile_pic 
                FROM users u 
                LEFT JOIN vendors v ON v.user_id = u.id 
                WHERE u.id = ? AND u.role_id = ?;

            `;
            queryParams.push(roleId); // Add roleId to parameters
        }else {
            query = `
                SELECT 
                    u.firstname, u.lastname, u.email, u.phonenumber, 
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

    userStatus: (userId, status, callback) => {
        const sql = `
            UPDATE users 
            SET status = ? 
            WHERE id = ?;
        `;
        
        // Run the query
        db.query(sql, [status, userId], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return callback(err, null);
            }
            return callback(null, results); // Return results
        });
    },

};

module.exports = User;