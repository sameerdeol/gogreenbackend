const db = require('../config/db');

const User = {
    create: (username, email, password, role_id, callback) => {
        const query = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
        db.query(query, [username, email, password, role_id], callback);
    },
    findByEmail: (email, callback) => {
        const query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE email = ?';
        db.query(query, [email], callback);
    },
    findById: (user_id, callback) => {
        const query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?';
        db.query(query, [user_id], callback);
    },
    fetchUsersByCondition: (user_id, callback) => {
        let query = '';
        let params = [];

        if (user_id === 1) {
            query = 'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.id';
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
    findUserByPhone: (phonenumber, callback) => {
        const query = "SELECT * FROM users WHERE phonenumber = ?";
        db.query(query, [phonenumber], callback);
    },
    createUser:(phonenumber,role_id,prefix, callback) => {
        const query = `INSERT INTO users (phonenumber, role_id ,prefix) VALUES (?, ? ,?)`;
        db.query(query, [phonenumber, role_id,prefix], callback);
    }   
};

module.exports = User;
