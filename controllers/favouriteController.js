const Favourite = require('../models/favouriteModel');
const Product = require('../models/productModel');

const addFavourite = (req, res) => {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
        return res.status(400).json({ success: false, message: 'User ID and Product ID are required.' });
    }

    Favourite.addFavourite(user_id, product_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error adding favourite', error: err });
        }
        res.status(201).json({ success: true, message: 'Product added to favourites successfully' });
    });
};

getUserFavourites = (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    Favourite.getUserFavourites(user_id, async (err, favourites) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching favourites', error: err });
        }

        if (favourites.length === 0) {
            return res.status(200).json({ success: true, message: 'No favourites found', data: [] });
        }

        try {
            const favouriteProducts = await Promise.all(
                favourites.map(fav => new Promise((resolve, reject) => {
                    Product.findById(fav.product_id, (err, product) => {
                        if (err || !product) {
                            resolve({ ...fav, product: null }); // Handle missing products gracefully
                        } else {
                            resolve({ ...fav, product });
                        }
                    });
                }))
            );

            res.status(200).json({ success: true, data: favouriteProducts });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving product details', error });
        }
    });
};

const removeFavourite = (req, res) => {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
        return res.status(400).json({ success: false, message: 'User ID and Product ID are required.' });
    }

    Favourite.removeFavourite(user_id, product_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error removing favourite', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Favourite not found' });
        }
        res.status(200).json({ success: true, message: 'Product removed from favourites successfully' });
    });
};

module.exports = {
    removeFavourite,
    getUserFavourites, // ✅ New function added here
    addFavourite
};