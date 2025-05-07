const searchProductModel = require('../models/searchProductModel');

const searchAll = (req, res) => {
    const { searchstring, user_id } = req.body;

    if (!searchstring) {
        return res.status(400).json({ success: false, message: 'Search string is required.' });
    }

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    searchProductModel.search(searchstring, user_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error performing search', error: err });
        }

        // Optional: Return grouped results if using Option 2
        res.status(200).json({
            success: true,
            message: 'Search results fetched successfully',
            data: result
        });
    });
};

const itemSearch = (req, res) => {
    const { searchstring, searchtype, user_id } = req.body;

    if (!searchstring || !searchtype) {
        return res.status(400).json({ success: false, message: 'Search string and type is required.' });
    }

    searchProductModel.searchitem(searchstring, searchtype,user_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error performing search', error: err });
        }

        // Optional: Return grouped results if using Option 2
        res.status(200).json({
            success: true,
            message: 'Search results fetched successfully',
            data: result
        });
    });
};

module.exports = { searchAll, itemSearch };
