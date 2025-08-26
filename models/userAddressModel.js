const db = require('../config/db'); // Import your database connection

const UserAddress = {
    // Create a new address
    create: (user_id, address,floor, landmark, type, customer_lat, customer_lng, callback) => {
        const sql = `
            INSERT INTO user_addresses (user_id, address, floor, landmark, type, customer_lat, customer_lng)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [user_id, address,floor, landmark, type, customer_lat, customer_lng], callback);
    },

    // Get all addresses of a specific user
    findByUserId: (user_id, callback) => {
        const sql = `
            SELECT DISTINCT 
                ua.*,
                CASE 
                    WHEN ua.id = (
                        SELECT od2.user_address_id
                        FROM order_details od2
                        WHERE od2.user_id = ua.user_id
                        ORDER BY od2.created_at DESC
                        LIMIT 1
                    ) THEN 1
                    ELSE 0
                END AS last_used
            FROM user_addresses ua
            LEFT JOIN order_details od 
                ON ua.id = od.user_address_id
            WHERE ua.user_id = ?`;
        
        db.query(sql, [user_id], callback);
    },


    // Get a single address by its ID
    findById: (id, user_id, callback) => {
        const sql = "SELECT * FROM user_addresses WHERE id = ? AND user_id = ?";
        db.query(sql, [id, user_id], callback);
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
    delete: (id, user_id, callback) => {
        const sql = "DELETE FROM user_addresses WHERE id = ? AND user_id = ?";
        db.query(sql, [id, user_id], callback);
    }

};

module.exports = UserAddress;
