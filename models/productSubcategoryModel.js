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

    findAllSubCatWithProducts: (callback) => {
        const query = `
            SELECT sc.*
            FROM product_subcategories sc
            JOIN products p ON sc.id = p.sub_category
            GROUP BY sc.id
            HAVING COUNT(p.id) > 0
        `;
        db.query(query, callback);
    },
    
    // Get subcategory by ID with category name
    findById: (id, callback) => {
        console.log("Finding subcategory with ID:", id); // Debugging log
    
        const query = `
            SELECT product_subcategories.*, product_categories.name AS category_name 
            FROM product_subcategories 
            JOIN product_categories ON product_subcategories.category_id = product_categories.id
            WHERE product_subcategories.id = ?
        `;
        
        db.query(query, [id], (err, results) => {
            if (err) {
                console.error("Database error in findById:", err); // Debugging log
                return callback(err, null);
            }
    
            callback(null, results.length > 0 ? results[0] : null); // Fix: Return single object or null
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
