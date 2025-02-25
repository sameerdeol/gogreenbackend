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

    update: (id, name, description, callback) => {
        const query = 'UPDATE product_categories SET name = ?, description = ? WHERE id = ?';
        db.query(query, [name, description, id], callback);
    },

    delete: (id, callback) => {
        const query = 'DELETE FROM product_categories WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductCategory;
