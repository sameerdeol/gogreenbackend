const db = require('../config/db');

const ProductSubcategory = {
    findAll: (callback) => {
        const query = `
            SELECT product_subcategories.*, product_categories.name AS category_name 
            FROM product_subcategories 
            JOIN product_categories ON product_subcategories.category_id = product_categories.id
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

    create: (name, category_id, description, callback) => {
        const query = 'INSERT INTO product_subcategories (name, category_id, description) VALUES (?, ?, ?)';
        db.query(query, [name, category_id, description], callback);
    },

    update: (id, updateFields, callback) => {
        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(id);
    
        const query = `UPDATE product_subcategories SET ${fields} WHERE id = ?`;
        db.query(query, values, callback);
    },    
    

    delete: (id, callback) => {
        const query = 'DELETE FROM product_subcategories WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductSubcategory;
