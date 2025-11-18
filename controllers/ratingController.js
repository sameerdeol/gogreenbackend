const RatingModel = require('../models/ratingModel');

const giveRating = (req, res) => {
    const { user_id, rateable_type, rateable_id, rating, comment } = req.body;

    if (!user_id || !rateable_type || !rateable_id || !rating) {
        return res.status(400).json({ success: false, message: 'user_id, rateable_type, rateable_id and rating are required.' });
    }

    if (![1, 2, 3].includes(rateable_type)) {
        return res.status(400).json({ success: false, message: 'Invalid rateable_type. Use 1=Product, 2=Vendor, 3=Rider' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    RatingModel.upsertRating(user_id, rateable_type, rateable_id, rating, comment || null, (err, result) => {
        if (err) {
            console.error('Error saving rating:', err);
            return res.status(500).json({ success: false, message: 'Failed to save rating', error: err });
        }

        return res.status(200).json({
            success: true,
            message: 'Rating saved successfully'
        });
    });
};

const getAverageRating = (req, res) => {
    const { rateable_type, rateable_id } = req.query;

    if (!rateable_type || !rateable_id) {
        return res.status(400).json({ success: false, message: 'rateable_type and rateable_id are required.' });
    }

    RatingModel.getAverageRating(rateable_type, rateable_id, (err, results) => {
        if (err) {
            console.error('Error fetching average rating:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch average rating', error: err });
        }

        return res.status(200).json({
            success: true,
            data: results[0] || { average_rating: null, total_ratings: 0 }
        });
    });
};

const getAllRatingByUserId = (req, res) => {
    const { rateable_type, rateable_id } = req.body;

    if (!rateable_type || !rateable_id) {
        return res.status(400).json({ success: false, message: 'rateable_type and rateable_id are required.' });
    }

    RatingModel.getRatingsByItem(rateable_type, rateable_id, (err, results) => {
        if (err) {
            console.error('Error fetching  rating:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch rating', error: err });
        }

        return res.status(200).json({
            success: true,
            data: results[0] || { average_rating: null, total_ratings: 0 }
        });
    });
};

module.exports = {
    giveRating,
    getAverageRating,
    getAllRatingByUserId
};
