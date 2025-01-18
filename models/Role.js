const db = require('../config/db');

const Role = {
    getAllRoles: (callback) => {
        const query = 'SELECT * FROM roles';
        db.query(query, callback);
    },
    getRoleById: (id, callback) => {
        const query = 'SELECT * FROM roles WHERE id = ?';
        db.query(query, [id], callback);
    },
};

module.exports = Role;
