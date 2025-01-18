const db = require('../config/db');

const User = {
    create: (username, email, password, role_id, callback) => {
        const query = 'INSERT INTO staff_users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
        db.query(query, [username, email, password, role_id], callback);
    },
    findByEmail: (email, callback) => {
        const query = 'SELECT staff_users.*, roles.role_name FROM staff_users JOIN roles ON staff_users.role_id = roles.id WHERE email = ?';
        db.query(query, [email], callback);
    },
};

module.exports = User;
