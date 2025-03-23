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
        let params = [index];
        let categorcheck = categoryset;
    
        if (categorcheck == 1) {
            // ✅ Fetch subcategories related to the index
            sql = `
                SELECT ps.*, pc.name AS category_name 
                FROM product_subcategories ps
                JOIN category_selection cs ON cs.product_categories = ps.category_id
                JOIN product_categories pc ON ps.category_id = pc.id
                WHERE cs.index_no = ?;
            `;
        } else {
            // ✅ Fetch products related to the index, including is_favourite status
            sql = `
                SELECT 
                    p.*, 
                    c.name AS category_name, 
                    s.name AS sub_category_name, 
                    CASE WHEN f.product_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_favourite
                FROM products p
                LEFT JOIN category_selection cs ON p.category = cs.product_categories
                LEFT JOIN product_categories c ON cs.product_categories = c.id
                LEFT JOIN product_subcategories s ON p.sub_category = s.id
                LEFT JOIN favourite_products f ON p.id = f.product_id AND f.user_id = ?
                WHERE cs.index_no = ?;
            `;
            params = [userID, index]; // ✅ Include userID for is_favourite check
        }
    
        db.query(sql, params, callback);
    },
    getshowselectedcategory: (index) => {
        const sql = `UPDATE category_selection 
                     SET product_categories = ? 
                     WHERE index_no = ?;`;
    
        db.query(sql, [catid, index], callback);
    },
        
};

module.exports = ProductCategory;
