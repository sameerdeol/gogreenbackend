const db = require('../config/db');

const ProductAddon = {
    create: (productId, addons, callback) => {
        const values = addons.map(a => [productId, a.name, parseFloat(a.price)]);
        const sql = 'INSERT INTO product_addons (product_id, name, price) VALUES ?';
        db.query(sql, [values], callback);
    },
    deleteByProductId: (productId, callback) => {
        const sql = 'DELETE FROM addons WHERE product_id = ?';
        db.query(sql, [productId], callback);
    }
};

module.exports = ProductAddon;
