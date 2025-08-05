const db = require('../config/db');

const ProductCategory = {
    findAll: (role_id, user_id, callback) => {
        let query = 'SELECT * FROM product_categories';

        if (role_id == 3) {
            query += `
                WHERE admin_approval = 1
                AND (
                    listed_by = 'admin'
                    OR listed_by = 'vendor_${user_id}'
                )
            `;
        }

        db.query(query, callback);
    },


    findAllCatWithProducts: (role_id, user_id, callback) => {
        let query = `
            SELECT pc.*
            FROM product_categories pc
            JOIN products p ON pc.id = p.category_id
        `;

        if (role_id == 3) {
            query += `
                WHERE pc.admin_approval = 1
                AND (
                    pc.listed_by = 'admin'
                    OR pc.listed_by = 'vendor_${user_id}'
                )
            `;
        }

        query += `
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
    

    create: (name, description, categoryLogo, adminApproval, listedBy, callback) => {
        console.log(name, description, categoryLogo, adminApproval, listedBy, callback)
        const sql = `
            INSERT INTO product_categories (name, description, category_logo, admin_approval, listed_by)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(sql, [name, description, categoryLogo, adminApproval, listedBy], callback);
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
    },

    getAllCategoriesWithSubcategories: (callback) => {
        const query = `
            SELECT 
                c.id AS category_id,
                c.name AS category_name,
                s.id AS subcategory_id,
                s.name AS subcategory_name,
                s.*
            FROM 
                product_categories c
            INNER JOIN 
                product_subcategories s ON c.id = s.category_id
            INNER JOIN 
                products p ON p.sub_category = s.id
            GROUP BY 
                s.id
        `;
        db.query(query, (err, results) => {
            if (err) {
                console.error("Error fetching categories with subcategories:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

};

module.exports = ProductCategory;
