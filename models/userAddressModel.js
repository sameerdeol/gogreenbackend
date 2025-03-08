const db = require('../config/db'); // Import your database connection

const UserAddress = {
    // Create a new address
    create: (user_id, address, city, province, postal_code, road_number, landmark, type, callback) => {
        const sql = `
            INSERT INTO user_addresses (user_id, address, city, province, postal_code, road_number, landmark, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [user_id, address, city, province, postal_code, road_number, landmark, type], callback);
    },

    // Get all addresses of a specific user
    findByUserId: (user_id, callback) => {
        const sql = "SELECT * FROM user_addresses WHERE user_id = ?";
        db.query(sql, [user_id], callback);
    },

    // Get a single address by its ID
    findById: (id, callback) => {
        const sql = "SELECT * FROM user_addresses WHERE id = ?";
        db.query(sql, [id], callback);
    },

    // Update an address by its ID
    update: (id, address, city, province, postal_code, road_number, landmark, type, callback) => {
        const sql = `
            UPDATE user_addresses 
            SET address = ?, city = ?, province = ?, postal_code = ?, road_number = ?, landmark = ?, type = ? 
            WHERE id = ?`;
        db.query(sql, [address, city, province, postal_code, road_number, landmark, type, id], callback);
    },

    // Delete an address by its ID
    delete: (id, callback) => {
        const sql = "DELETE FROM user_addresses WHERE id = ?";
        db.query(sql, [id], callback);
    }
};

module.exports = UserAddress;
