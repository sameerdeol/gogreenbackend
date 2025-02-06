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
    updateUser: (user_id, callback) => {
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
    }
};

module.exports = User;
