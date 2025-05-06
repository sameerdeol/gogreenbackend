const Favourite = require('../models/favouriteModel');

const addFavourite = (req, res) => {
    const { user_id, product_id, vendor_id, favnum } = req.body;

    if (!user_id || favnum === undefined) {
        return res.status(400).json({ success: false, message: 'User ID and favnum are required.' });
    }

    const ref_id = favnum == 1 ? vendor_id : product_id;

    if (!ref_id) {
        return res.status(400).json({ success: false, message: 'Product ID or Vendor ID is required.' });
    }

    Favourite.addFavourite(user_id, ref_id, favnum, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error adding favourite', error: err });
        }
        res.status(201).json({ success: true, message: 'Favourite added successfully' });
    });
};

const getUserFavouritesdetails = (req, res) => {
    const { user_id, favnum } = req.body;

    if (!user_id || favnum === undefined) {
        return res.status(400).json({ success: false, message: 'User ID and favnum are required.' });
    }

    Favourite.getUserFavourites(user_id, favnum, (err, favourites) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching favourites', error: err });
        }

        if (favourites.length === 0) {
            return res.status(200).json({ success: true, message: 'No favourites found', data: [] });
        }

        res.status(200).json({ success: true, data: favourites });
    });
};

const removeFavourite = (req, res) => {
    const { user_id, product_id, vendor_id, favnum } = req.body;

    if (!user_id || favnum === undefined) {
        return res.status(400).json({ success: false, message: 'User ID and favnum are required.' });
    }

    const ref_id = favnum == 1 ? vendor_id : product_id;

    if (!ref_id) {
        return res.status(400).json({ success: false, message: 'Product ID or Vendor ID is required.' });
    }

    Favourite.removeFavourite(user_id, ref_id, favnum, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error removing favourite', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Favourite not found' });
        }
        res.status(200).json({ success: true, message: 'Favourite removed successfully' });
    });
};

module.exports = {
    addFavourite,
    getUserFavouritesdetails,
    removeFavourite
};
