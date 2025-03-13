const db = require('../config/db');

const Favourite = {
    addFavourite: (user_id, product_id, callback) => {
        const sql = `INSERT INTO favourite_products (user_id, product_id) VALUES (?, ?)`;
        db.query(sql, [user_id, product_id], callback);
    },

    getUserFavourites: (user_id, callback) => {
        const sql = `SELECT * FROM favourite_products WHERE user_id = ?`;
        db.query(sql, [user_id], callback);
    },

    removeFavourite: (user_id, product_id, callback) => {
        const sql = `DELETE FROM favourite_products WHERE user_id = ? AND product_id = ?`;
        db.query(sql, [user_id, product_id], callback);
    }
};

module.exports = Favourite;
