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
        const query = 'SELECT * FROM users WHERE email = ?';
        db.query(query, [email], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results);
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
            if (err) return callback(err, null);

            const query = 'UPDATE users SET password = ? WHERE id = ?';
            db.query(query, [hashedPassword, user_id], (err, result) => {
                if (err) return callback(err, null);
                callback(null, result);
            });
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
        if (![ 3, 4].includes(role_id)) {
            return callback(new Error('Permission denied: Invalid role_id'), null);
        }
    
        db.beginTransaction((err) => {
            if (err) return callback(err, null);
    
            const userTableFields = ['firstname', 'lastname', 'prefix', 'phonenumber', 'email'];
            const vendorTableFields = ['store_name', 'store_address', 'sin_code'];
            const deliveryPartnerTableFields = ['license_number','sin_code'];
    
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
    
                const { query, values } = queries[index];
    
                db.query(query, values, (err) => {
                    if (err) return db.rollback(() => callback(err, null));
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
    }

};

module.exports = User;