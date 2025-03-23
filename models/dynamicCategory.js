const db = require('../config/db');

const ProductCategory = {
    updatecatforproducts: (catid, index, callback) => {
        const sql = `UPDATE category_selection 
                     SET product_categories = ? 
                     WHERE index_no = ?;`;
    
        db.query(sql, [catid, index], callback);
    },
    getProductsByIndex: (index, categoryset, callback) => {
        let sql;
        let params = [index];
        let categorcheck=categoryset;
        
        if (categorcheck == 1) {
            // If categoryset is present, fetch subcategories related to the index
            sql = `SELECT ps.*, pc.name AS category_name 
                    FROM product_subcategories ps
                    JOIN category_selection cs ON cs.product_categories = ps.category_id
                    JOIN product_categories pc ON ps.category_id = pc.id
                    WHERE cs.index_no = ?;`;
            params = [index];  // Using categoryset and index both
        } else {
            // If categoryset is not present, fetch products related to the index
            sql = `
                SELECT p.*, c.name AS category_name, s.name AS sub_category_name 
                FROM products p
                LEFT JOIN category_selection cs ON p.category = cs.product_categories
                LEFT JOIN product_categories c ON cs.product_categories = c.id
                LEFT JOIN product_subcategories s ON p.sub_category = s.id
                WHERE cs.index_no = ?;
            `;
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
