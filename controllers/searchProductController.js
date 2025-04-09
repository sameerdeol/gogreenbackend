const searchProductModel = require('../models/searchProductModel');

const searchProduct = (req, res) => {
    const { searchstring } = req.body;
    console.log(searchstring)
    if (!searchstring) {
        return res.status(400).json({ success: false, message: 'Search string is required.' });
    }

    searchProductModel.search(searchstring, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error searching products', error: err });
        }
        res.status(200).json({ success: true, message: 'Products fetched successfully', data: result });
    });
};

module.exports = { searchProduct };
