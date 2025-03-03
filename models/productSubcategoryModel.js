const db = require('../config/db');

const ProductSubcategory = {
    // Get all subcategories with category names
    findAll: (callback) => {
        const query = `
            SELECT product_subcategories.*, product_categories.name AS category_name 
            FROM product_subcategories 
            JOIN product_categories ON product_subcategories.category_id = product_categories.id
        `;
        db.query(query, callback);
    },

    // Get subcategory by ID with category name
    findById: (id, callback) => {
        const query = `
            SELECT product_subcategories.*, product_categories.name AS category_name 
            FROM product_subcategories 
            JOIN product_categories ON product_subcategories.category_id = product_categories.id
            WHERE product_subcategories.id = ?
        `;
        db.query(query, [id], (err, results) => {
            if (err) return callback(err);
            if (results.length === 0) return callback(null, null); // If no subcategory found
            callback(null, results[0]); // Return single subcategory
        });
    },
    findBycatId: (id, callback) => {
        const query = `
            SELECT product_subcategories.*, product_categories.name AS category_name 
            FROM product_subcategories 
            JOIN product_categories ON product_subcategories.category_id = product_categories.id
            WHERE product_subcategories.category_id = ?;
        `;
        db.query(query, [id], (err, results) => {
            if (err) return callback(err);
            callback(null, results);  // ✅ Fix: Return all results, not just one
        });
    },
    
    
    // Get subcategories by category ID with category name
    findByCategoryId: (categoryId, callback) => {
        const query = `
            SELECT product_subcategories.*, product_categories.name AS category_name 
            FROM product_subcategories 
            JOIN product_categories ON product_subcategories.category_id = product_categories.id
            WHERE product_subcategories.category_id = ?
        `;
        db.query(query, [categoryId], callback);
    },

    // Create a new subcategory
    create: (name, category_id, description, subcategory_logo, callback) => {
        const query = `
            INSERT INTO product_subcategories (name, category_id, description, subcategory_logo) 
            VALUES (?, ?, ?, ?)
        `;
        db.query(query, [name, category_id, description, subcategory_logo], callback);
    },

    // Update subcategory and return updated data with category name
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

            // Fetch updated subcategory with category name
            ProductSubcategory.findById(id, callback);
        });
    },

    // Delete subcategory
    delete: (id, callback) => {
        const query = 'DELETE FROM product_subcategories WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductSubcategory;
