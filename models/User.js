const db = require('../config/db');

const User = {
    create: (username, email, password, role_id, callback) => {
        const query = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
        db.query(query, [username, email, password, role_id], callback);
    },

    // findByEmail: (email, callback) => {
    //     const query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE email = ?';
    //     db.query(query, [email], callback);
    // },
    findByEmail: (email, callback) => {
        // First, check if email exists in superadmin or managers table
        const checkQuery = `
            SELECT 'superadmin' AS source, role_id FROM superadmin WHERE email = ?
            UNION 
            SELECT 'managers' AS source, role_id FROM managers WHERE email = ?`;
    
        db.query(checkQuery, [email, email], (err, results) => {
            if (err) {
                console.error('Error checking user role:', err);
                return callback(err, null);
            }
    
            if (results.length === 0) {
                return callback(null, null); // No user found
            }
    
            const roleId = results[0].role_id;
            const sourceTable = roleId === 1 ? 'superadmin' : 'managers';
    
            // Fetch user details from the determined table
            const finalQuery = `SELECT * FROM ${sourceTable} WHERE email = ?`;
    
            db.query(finalQuery, [email], (err, userResults) => {
                if (err) {
                    console.error(`Error fetching user from ${sourceTable}:`, err);
                    return callback(err, null);
                }
    
                return callback(null, userResults);
            });
        });
    },
    
    
    findById: (user_id, callback) => {
        const query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?';
        db.query(query, [user_id], callback);
    },

    fetchUsersByCondition: (user_id, callback) => {
        let query = '';
        let params = [];

        if (user_id === 1) {
            query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE users.role_id !=5';
        } else if (user_id === 2) {
            query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE users.role_id IN (3, 4)';
        } else if (user_id === 3) {
            query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE users.role_id IN (4)';
        } else {
            // Handle other cases or return an empty result
            return callback(null, []);
        }

        db.query(query, params, callback);
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
    
                console.log(userQuery, userValues);
    
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

    findCustomerByPhone : (phonenumber, callback) => {
        const sql = `SELECT * FROM customers WHERE phonenumber = ?`;
        db.query(sql, [phonenumber], (err, result) => {
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
    createCustomer : (user_id, phonenumber, prefix, callback) => {
        const sql = `INSERT INTO customers (user_id, phonenumber, prefix) VALUES (?, ?, ?)`;
        db.query(sql, [user_id, phonenumber, prefix], (err, result) => {
            if (err) {
                return callback(err, null);
            }
            return callback(null, result);
        });
    },
    
    getUnverifiedUsersByRole: (roleId, callback) => {
        const query = `SELECT *
                       FROM users u
                       LEFT JOIN user_verifications uv ON u.id = uv.user_id
                       WHERE u.role_id = ? 
                       AND u.is_verified = 0`;
        db.query(query, [roleId], callback);
    },

    // Approve verification for a specific user
    verifyUser: (userId, callback) => {
        const query = `UPDATE users SET is_verified = 1 WHERE id = ? AND is_verified = 0`;
        db.query(query, [userId], callback);
    },
};

module.exports = User;
