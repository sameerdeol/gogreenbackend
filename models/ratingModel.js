const db = require('../config/db');

const RatingModel = {
    // Insert or update a rating (user can only rate once)
    upsertRating: (user_id, rateable_type, rateable_id, rating, comment, callback) => {
        const sql = `
            INSERT INTO ratings (user_id, rateable_type, rateable_id, rating, comment)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment);
        `;
        db.query(sql, [user_id, rateable_type, rateable_id, rating, comment], callback);
    },

    // Get average rating and count for a specific item
    getAverageRating: (rateable_type, rateable_id, callback) => {
        const sql = `
            SELECT 
                AVG(rating) AS average_rating,
                COUNT(*) AS total_ratings
            FROM ratings
            WHERE rateable_type = ? AND rateable_id = ?;
        `;
        db.query(sql, [rateable_type, rateable_id], callback);
    },

    // Get all ratings for a specific item (optional)
    getRatingsByItem: (rateable_type, rateable_id, callback) => {
        const sql = `
            SELECT user_id, rating, comment, created_at
            FROM ratings
            WHERE rateable_type = ? AND rateable_id = ?
            ORDER BY created_at DESC;
        `;
        db.query(sql, [rateable_type, rateable_id], callback);
    }
};

module.exports = RatingModel;
