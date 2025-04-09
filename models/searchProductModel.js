const db = require('../config/db');

const searchProduct = {
    search: (searchTerm, callback) => {
        const sql = `
            SELECT p.*
            FROM products p
            JOIN product_categories c ON p.category_id = c.id
            WHERE p.name LIKE ? OR c.name LIKE ?`;
        
        const likeSearchTerm = `%${searchTerm}%`;
        db.query(sql, [likeSearchTerm, likeSearchTerm], callback);
    }
};

module.exports = searchProduct;
