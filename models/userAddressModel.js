const db = require('../config/db'); // Import your database connection

const UserAddress = {
    // Create a new address
    create: (user_id, address,floor, landmark, type, callback) => {
        const sql = `
            INSERT INTO user_addresses (user_id, address, floor, landmark, type)
            VALUES (?, ?, ?, ?, ?)`;
        db.query(sql, [user_id, address,floor, landmark, type], callback);
    },

    // Get all addresses of a specific user
    findByUserId: (user_id, callback) => {
        const sql = "SELECT * FROM user_addresses WHERE user_id = ?";
        db.query(sql, [user_id], callback);
    },

    // Get a single address by its ID
    findById: (id, callback) => {
        const sql = "SELECT * FROM user_addresses WHERE user_id = ?";
        db.query(sql, [id], callback);
    },

    // Update an address by its ID
    update: (id, updateFields, callback) => {
        let sql = 'UPDATE user_addresses SET ';
        const updates = [];
        const values = [];
    
        // Dynamically construct query based on provided fields
        for (const [key, value] of Object.entries(updateFields)) {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }
    
        if (updates.length === 0) {
            return callback(new Error('No fields to update'), null);
        }
    
        sql += updates.join(', ') + ' WHERE id = ?';
        values.push(id);
    
        db.query(sql, values, callback);
    },
    

    // Delete an address by its ID
    delete: (id, callback) => {
        const sql = "DELETE FROM user_addresses WHERE id = ?";
        db.query(sql, [id], callback);
    }
};

module.exports = UserAddress;
