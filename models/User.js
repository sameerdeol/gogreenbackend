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
};

module.exports = User;
