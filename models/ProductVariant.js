const db = require('../config/db');

const ProductVariant = {
    create: (productId, variants, callback) => {
        const values = variants.map(v => [productId, v.type, v.value, parseFloat(v.price)]);
        const sql = 'INSERT INTO product_variants (product_id, type, value, price) VALUES ?';
        db.query(sql, [values], callback);
    },
    deleteByProductId: (productId, callback) => {
        const sql = 'DELETE FROM variants WHERE product_id = ?';
        db.query(sql, [productId], callback);
    },
    
};

module.exports = ProductVariant;
