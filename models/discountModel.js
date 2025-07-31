const db = require('../config/db'); // Database connection

const DiscountModel = {
    // Insert a new discount
    insertDiscount: (product_id, discount_percent, callback) => {
        const sql = `
            INSERT INTO product_discounts (product_id, discount_percent)
            VALUES (?, ?)`;
        db.query(sql, [product_id, discount_percent], callback);
    },

    // Get all discounts with product details
    getDiscounts: (callback) => {
        const sql = `
            SELECT pd.*, p.* 
            FROM product_discounts pd
            JOIN products p ON p.id = pd.product_id`;
        db.query(sql, [], callback);
    },

    // Update discount by product ID
    updateDiscountByProductId: (product_id, discount_percent, callback) => {
        const sql = `
            UPDATE product_discounts 
            SET discount_percent = ?, updated_at = NOW()
            WHERE product_id = ?`;
        db.query(sql, [discount_percent, product_id], callback);
    },

    // Delete discount by primary key (assumed to be `id`)
    deleteDiscountById: (discount_id, callback) => {
        const sql = `
            DELETE FROM product_discounts 
            WHERE discount_id = ?`;
        db.query(sql, [discount_id], callback);
    },

    // Get discount record by product ID
    getDiscountByProductId: (product_id, callback) => {
        const sql = `
            SELECT * FROM product_discounts 
            WHERE product_id = ?`;
        db.query(sql, [product_id], callback);
    }
};

module.exports = DiscountModel;
