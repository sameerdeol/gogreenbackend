const db = require('../config/db');

const ProductCategory = {
    findAll: (callback) => {
        const query = 'SELECT * FROM product_categories';
        db.query(query, callback);
    },

    findById: (id, callback) => {
        const query = 'SELECT * FROM product_categories WHERE id = ?';
        db.query(query, [id], callback);
    },

    create: (name, description, callback) => {
        const query = 'INSERT INTO product_categories (name, description) VALUES (?, ?)';
        db.query(query, [name, description], callback);
    },

    update: (id, updateFields, callback) => {
        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(id);
    
        const query = `UPDATE product_categories SET ${fields} WHERE id = ?`;
        db.query(query, values, callback);
    },
 
    delete: (id, callback) => {
        const query = 'DELETE FROM product_categories WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductCategory;
