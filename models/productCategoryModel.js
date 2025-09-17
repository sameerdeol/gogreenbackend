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

    getAllCategoriesWithVendors: (callback) => {
        const query = `
            SELECT 
                c.id AS category_id,
                c.name AS category_name,

                MAX(u.firstname) AS firstname, 
                MAX(u.lastname) AS lastname, 
                MAX(u.email) AS email, 
                MAX(u.prefix) AS prefix, 
                MAX(u.phonenumber) AS phonenumber,
                MAX(u.status) AS status,

                MAX(v.store_address) AS store_address, 
                MAX(v.sin_code) AS sin_code, 
                MAX(v.store_name) AS store_name, 
                MAX(v.profile_pic) AS profile_pic, 
                v.user_id AS vendor_id,
                MAX(v.store_image) AS store_image,
                MAX(v.vendor_thumb) AS vendor_thumb,
                MAX(v.vendor_start_time) AS vendor_start_time,
                MAX(v.vendor_close_time) AS vendor_close_time,

                GROUP_CONCAT(DISTINCT p.featured_image) AS featured_images

            FROM product_categories c   

            INNER JOIN products p ON p.category_id = c.id
            INNER JOIN vendors v ON v.user_id = p.vendor_id
            INNER JOIN users u ON u.id = v.user_id

            WHERE u.is_verified = 1 AND u.status = 1

            GROUP BY c.id, v.user_id
            ORDER BY c.name ASC;
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error("Error in getAllCategoriesWithVendors:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

};

module.exports = ProductCategory;
