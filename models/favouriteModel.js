const db = require('../config/db');

const Favourite = {
    addFavourite: (user_id, product_id, callback) => {
        const sql = `INSERT INTO favourite_products (user_id, product_id) VALUES (?, ?)`;
        db.query(sql, [user_id, product_id], callback);
    },

    getUserFavourites: (user_id, callback) => {
        console.log("Fetching favourites for user_id:", user_id);
    
        const sql = `
            SELECT 
                p.*, 
                TRUE AS is_favourite,
                IFNULL(d.discount_percent, 0) AS discount_percent,
                ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value
            FROM 
                products p
            INNER JOIN 
                favourite_products f ON p.id = f.product_id
            LEFT JOIN 
                product_discounts d ON p.id = d.product_id
            WHERE 
                f.user_id = ?;
        `;
    
        db.query(sql, [user_id], callback);
    },    

    removeFavourite: (user_id, product_id, callback) => {
        const sql = `DELETE FROM favourite_products WHERE user_id = ? AND product_id = ?`;
        db.query(sql, [user_id, product_id], callback);
    }
};

module.exports = Favourite;
