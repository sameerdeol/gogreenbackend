const searchProductModel = require('../models/searchProductModel');

const searchProduct = (req, res) => {
    const { searchstring, searchNum, user_id } = req.body;
    if (!searchstring) {
        return res.status(400).json({ success: false, message: 'Search string is required.' });
    }

    searchProductModel.search(searchstring, searchNum, user_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error searching products', error: err });
        }
    
        if (result.length === 0) {
            return res.status(200).json({ success: true, message: 'No matching results', data: [] });
        }
    
        res.status(200).json({ success: true, message: 'Products fetched successfully', data: result });
    });
    
};

const vendorbySearchProduct = (req, res) => {
    const { searchstring, searchNum, user_id } = req.body;
    if (!searchstring) {
        return res.status(400).json({ success: false, message: 'Search string is required.' });
    }

    searchProductModel.search(searchstring, searchNum,user_id,  (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error searching vendors', error: err });
        }
    
        if (result.length === 0) {
            return res.status(200).json({ success: true, message: 'No matching results', data: [] });
        }
    
        res.status(200).json({ success: true, message: 'vendors fetched successfully', data: result });
    });
    
};

module.exports = { searchProduct, vendorbySearchProduct };
