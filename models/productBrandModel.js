const db = require('../config/db');

const ProductBrand = {
    findAll: (callback) => {
        const query = 'SELECT * FROM product_brands';
        db.query(query, callback);
    },

    findById: (id, callback) => {
        const query = 'SELECT * FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    },

    create: (name, description, callback) => {
        const query = 'INSERT INTO product_brands (name, description) VALUES (?, ?)';
        db.query(query, [name, description], callback);
    },

    update: (id, name, description, callback) => {
        const query = 'UPDATE product_brands SET name = ?, description = ? WHERE id = ?';
        db.query(query, [name, description, id], callback);
    },

    delete: (id, callback) => {
        const query = 'DELETE FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductBrand;
