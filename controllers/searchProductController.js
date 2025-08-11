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

const searchAllbyVendor = (req, res) => {
    const { searchstring, vendor_id } = req.body;

    if (!searchstring) {
        return res.status(400).json({ success: false, message: 'Search string is required.' });
    }

    if (!vendor_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    searchProductModel.searchByVendor(searchstring, vendor_id, (err, result) => {
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

const searchVendorbyName = (req, res) => {
    const { search_name, user_id } = req.body;

    if (!search_name || typeof search_name !== 'string') {
        return res.status(400).json({ success: false, message: 'Valid search_name is required.' });
    }
    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    searchProductModel.searchVendorbyProduct(search_name, user_id, (err, result) => {
        if (err) {
            console.error("Search Error:", err);
            return res.status(500).json({ success: false, message: 'Error performing search', error: err });
        }

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: true,
                message: 'No vendors found matching that product/category/subcategory name.',
                data: []
            });
        }

        // Convert featured_images string into array
        const formattedResult = result.map(vendor => {
            return {
                ...vendor,
                featured_images: vendor.featured_images
                    ? vendor.featured_images.split(',') // split into array
                    : []
            };
        });

        res.status(200).json({
            success: true,
            message: 'Vendors found successfully.',
            data: formattedResult
        });
    });
};



module.exports = { searchAll, itemSearch, searchAllbyVendor, searchVendorbyName };
