const db = require('../config/db');

const ProductBrand = {
    findAll: (callback) => {
        const query = 'SELECT * FROM product_brands WHERE status = 1';
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

    getById: (id, callback) => {
        const query = 'SELECT * FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    },

    update: (id, updateFields, callback) => {
        if (Object.keys(updateFields).length === 0) {
            return callback(new Error("No fields provided to update"));
        }

        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(id);

        const query = `UPDATE product_brands SET ${fields} WHERE id = ?`;

        db.query(query, values, (err, result) => {
            if (err) return callback(err);

            // Fetch the updated brand after update
            ProductBrand.getById(id, callback);
        });
    },

    delete: (id, callback) => {
        const query = 'DELETE FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductBrand;
