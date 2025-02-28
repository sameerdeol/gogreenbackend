const db = require('../config/db');

const ProductSubcategory = {
    findAll: (callback) => {
        const query = `
            SELECT product_subcategories.*, product_categories.name AS category_name 
            FROM product_subcategories 
            JOIN product_categories ON product_subcategories.category_id = product_categories.id
            WHERE product_subcategories.status = 1
        `;
        db.query(query, callback);
    },

    findById: (id, callback) => {
        const query = 'SELECT * FROM product_subcategories WHERE id = ?';
        db.query(query, [id], callback);
    },

    findByCategoryId: (categoryId, callback) => {
        const query = 'SELECT * FROM product_subcategories WHERE category_id = ?';
        db.query(query, [categoryId], callback);
    },

    create: (name, category_id, description, subcategory_logo, callback) => {
        const query = 'INSERT INTO product_subcategories (name, category_id, description, subcategory_logo) VALUES (?, ?, ?, ?)';
        db.query(query, [name, category_id, description, subcategory_logo], callback);
    },

    getById: (id, callback) => {
        const query = 'SELECT * FROM product_subcategories WHERE id = ?';
        db.query(query, [id], callback);
    },

    update: (id, updateFields, callback) => {
        if (Object.keys(updateFields).length === 0) {
            return callback(new Error("No fields provided to update"));
        }

        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(id);

        const query = `UPDATE product_subcategories SET ${fields} WHERE id = ?`;

        db.query(query, values, (err, result) => {
            if (err) return callback(err);

            // Fetch the updated subcategory after update
            ProductSubcategory.getById(id, callback);
        });
    },

    delete: (id, callback) => {
        const query = 'DELETE FROM product_subcategories WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductSubcategory;
