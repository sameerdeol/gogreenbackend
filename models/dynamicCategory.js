const db = require('../config/db');

const ProductCategory = {
    updatecatforproducts: (catid, index, callback) => {
        const sql = `UPDATE category_selection 
                     SET product_categories = ? 
                     WHERE index_no = ?;`;
    
        db.query(sql, [catid, index], callback);
    },
    getProductsByIndex : (index, categoryset, userID, callback) => {
        let sql;
        let params;
    
        if (categoryset == 1) {
            sql = `
                SELECT 
                    ps.*, 
                    pc.name AS category_name
                FROM 
                    product_subcategories ps
                JOIN 
                    category_selection cs ON cs.product_categories = ps.category_id
                JOIN 
                    product_categories pc ON ps.category_id = pc.id
                JOIN 
                    products p ON p.sub_category = ps.id
                WHERE 
                    cs.index_no = ?
                GROUP BY 
                    ps.id
                `;
            params = [index];
    
            db.query(sql, params, (err, categoryResult) => {
                if (err) return callback(err);
    
                const lastIndexQuery = `SELECT MAX(index_no) AS last_added_index FROM category_selection`;
                db.query(lastIndexQuery, (err2, lastIndexResult) => {
                    if (err2) return callback(err2);
    
                    const lastIndex = lastIndexResult[0]?.last_added_index || null;
    
                    callback(null, {
                        success: true,
                        message: 'Products fetched successfully',
                        categories: categoryResult,
                        last_added_index: lastIndex
                    });
                });
            });
        } else {
            sql = `
                SELECT 
                    p.*, 
                    c.name AS category_name, 
                    s.name AS sub_category_name, 
                    CASE 
                        WHEN ? IS NOT NULL AND f.product_id IS NOT NULL THEN TRUE 
                        ELSE FALSE 
                    END AS is_favourite
                FROM 
                    products p
                JOIN 
                    category_selection cs ON p.category_id = cs.product_categories
                JOIN 
                    product_categories c ON cs.product_categories = c.id
                JOIN 
                    product_subcategories s ON p.sub_category = s.id
                LEFT JOIN 
                    favourite_products f ON p.id = f.product_id AND (f.user_id = ? OR ? IS NULL)
                WHERE 
                    cs.index_no = ?
            `;
            params = [userID, userID, userID, index];
    
            db.query(sql, params, (err, productResult) => {
                if (err) return callback(err);
    
                const lastIndexQuery = `SELECT MAX(index_no) AS last_added_index FROM category_selection`;
                db.query(lastIndexQuery, (err2, lastIndexResult) => {
                    if (err2) return callback(err2);
    
                    const lastIndex = lastIndexResult[0]?.last_added_index || null;
    
                    callback(null, {
                        success: true,
                        message: 'Products fetched successfully',
                        products: productResult,
                        last_added_index: lastIndex
                    });
                });
            });
        }
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
