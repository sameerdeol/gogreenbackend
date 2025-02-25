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

    create: (name, description, brandLogo, callback) => {
        const query = 'INSERT INTO product_brands (name, description, brand_logo) VALUES (?, ?, ?)';
        db.query(query, [name, description, brandLogo], callback);
    },
    
    update: (id, updateFields, callback) => {
        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(id);
    
        const query = `UPDATE product_brands SET ${fields} WHERE id = ?`;
        db.query(query, values, callback);
    },    

    delete: (id, callback) => {
        const query = 'DELETE FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductBrand;
