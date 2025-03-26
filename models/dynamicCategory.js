const db = require('../config/db');

const ProductCategory = {
    updatecatforproducts: (catid, index, callback) => {
        const sql = `UPDATE category_selection 
                     SET product_categories = ? 
                     WHERE index_no = ?;`;
    
        db.query(sql, [catid, index], callback);
    },
    getProductsByIndex: (index, categoryset, userID, callback) => {
        let sql;
        let params;
    
        if (categoryset == 1) {
            // ✅ Fetch subcategories related to the index (No need for userID here)
            sql = `
                SELECT ps.*, pc.name AS category_name 
                FROM product_subcategories ps
                JOIN category_selection cs ON cs.product_categories = ps.category_id
                JOIN product_categories pc ON ps.category_id = pc.id
                WHERE cs.index_no = ?;
            `;
            params = [index];
        } else {
            // ✅ Fetch products related to the index, including is_favourite status
            sql = `
                SELECT 
                    p.*, 
                    p.category AS category_id, 
                    c.name AS category_name, 
                    s.name AS sub_category_name, 
                    CASE 
                        WHEN ? IS NOT NULL AND f.product_id IS NOT NULL THEN TRUE 
                        ELSE FALSE 
                    END AS is_favourite
                FROM products p
                LEFT JOIN category_selection cs ON p.category = cs.product_categories
                LEFT JOIN product_categories c ON cs.product_categories = c.id
                LEFT JOIN product_subcategories s ON p.sub_category = s.id
                LEFT JOIN favourite_products f ON p.id = f.product_id AND (f.user_id = ? OR ? IS NULL)
                WHERE cs.index_no = ?;
            `;
            params = [userID, userID, userID, index]; // ✅ Ensure userID is properly handled
        }
    
        db.query(sql, params, callback);
    },    
    getshowselectedcategory: (index, callback) => {
        const sql = `
            SELECT 
                cs.*, 
                pc.*  
            FROM category_selection cs 
            JOIN product_categories pc 
                ON cs.product_categories = pc.id 
            WHERE cs.index_no = ?;
        `;
    
        db.query(sql, [index], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, results[0] || null);  // ✅ Return only the first object
        });
    },
    
    
};

module.exports = ProductCategory;
