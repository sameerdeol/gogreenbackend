const db = require('../config/db');

const Favourite = {
    addFavourite: (user_id, ref_id, favnum, callback) => {
        let sql;
        if (favnum == 1) {
            // Add favourite vendor
            sql = `INSERT INTO favourite_vendors (user_id, vendor_id) VALUES (?, ?)`;
        } else {
            // Add favourite product
            sql = `INSERT INTO favourite_products (user_id, product_id) VALUES (?, ?)`;
        }
        db.query(sql, [user_id, ref_id], callback);
    },

    getUserFavourites: (user_id, favnum, callback) => {
        console.log("Fetching favourites for user_id:", user_id, "favnum:", favnum);

        let sql;
        if (favnum == 1) {
            // Fetch favourite vendors
            sql = `
                SELECT 
                    v.*, 
                    u.firstname, u.lastname, u.email, 
                    TRUE AS is_favourite
                FROM 
                    favourite_vendors fv
                JOIN 
                    vendors v ON fv.vendor_id = v.id
                JOIN 
                    users u ON v.user_id = u.id
                WHERE 
                    fv.user_id = ?;
            `;
        } else {
            // Fetch favourite products
            sql = `
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
        }

        db.query(sql, [user_id], callback);
    },

    removeFavourite: (user_id, ref_id, favnum, callback) => {
        let sql;
        if (favnum == 1) {
            // Remove favourite vendor
            sql = `DELETE FROM favourite_vendors WHERE user_id = ? AND vendor_id = ?`;
        } else {
            // Remove favourite product
            sql = `DELETE FROM favourite_products WHERE user_id = ? AND product_id = ?`;
        }
        db.query(sql, [user_id, ref_id], callback);
    }
};

module.exports = Favourite;
