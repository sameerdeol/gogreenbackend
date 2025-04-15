const db = require('../config/db');

const ProductCategory = {
    findAll: (callback) => {
        const query = 'SELECT * FROM product_categories';
        db.query(query, callback);
    },
    findAllCatWithProducts: (callback) => {
        const query = `
            SELECT pc.*
            FROM product_categories pc
            JOIN products p ON pc.id = p.category_id
            GROUP BY pc.id
            HAVING COUNT(p.id) > 0
        `;
        db.query(query, callback);
    },

    findById: (id, callback) => {
    
        const query = 'SELECT * FROM product_categories WHERE id = ?';
        db.query(query, [id], (err, results) => {
            if (err) {
                console.error("Database error in findById:", err); // 🔍 Log errors
                return callback(err, null);
            }
    
            callback(null, results.length > 0 ? results[0] : null);
        });
    },
    

    create: (name, description, categoryLogo, callback) => {
        const query = 'INSERT INTO product_categories (name, description, category_logo) VALUES (?, ?, ?)';
        db.query(query, [name, description, categoryLogo], callback);
    },

    update: (id, updateFields, callback) => {
        if (Object.keys(updateFields).length === 0) {
            return callback(new Error('No fields to update'), null);
        }

        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(id);

        const query = `UPDATE product_categories SET ${fields} WHERE id = ?`;
        db.query(query, values, (err, result) => {
            if (err) return callback(err, null);
            
            // Fetch and return the updated category after update
            ProductCategory.findById(id, callback);
        });
    },

    delete: (id, callback) => {
        const query = 'DELETE FROM product_categories WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductCategory;
