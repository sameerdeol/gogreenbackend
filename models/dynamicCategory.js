const db = require('../config/db');

const ProductCategory = {
    updatecatforproducts: (catid, index, callback) => {
        const sql = `UPDATE category_selection 
                     SET product_categories = ? 
                     WHERE index_no = ?;`;
    
        db.query(sql, [catid, index], callback);
    },
    getProductsByIndex: (index, callback) => {
        const sql = `
            SELECT p.*, c.name AS category_name, s.name AS sub_category_name 
            FROM products p
            LEFT JOIN category_selection cs ON p.category = cs.product_categories
            LEFT JOIN product_categories c ON cs.product_categories = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
            WHERE cs.index_no = ?;
        `;
    
        db.query(sql, [index], callback);
    }    
};

module.exports = ProductCategory;
