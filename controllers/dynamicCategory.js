const dynamicCategory = require('../models/dynamicCategory');
const fs = require('fs');

// Function to update category selection
const selectProductcategoryfirst = (req, res) => {
    const { category, index } = req.body;
    if (!category || !index) {
        return res.status(400).json({ success: false, message: 'Category ID and Index are required.' });
    }

    dynamicCategory.updatecatforproducts(category, index, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating category selection', error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'No matching index found to update' });
        }

        res.status(200).json({ success: true, message: 'Category updated successfully' });
    });
};

// **New Function** to fetch products based on dynamic index
const dynamicCategoryData = (req, res) => {
    const  {index,categoryset}  = req.body;  // Getting index from request body

    if (!index) {
        return res.status(400).json({ success: false, message: 'Index is required.' });
    }

    dynamicCategory.getProductsByIndex(index,categoryset, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching products', error: err });
        }

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'No products found for this index' });
        }

        res.status(200).json({ success: true, message: 'Products fetched successfully', products: result });
    });
};
const dynamicCategoryData2 = (req, res) => {
    const  index  = 2;  // Getting index from request body

    if (!index) {
        return res.status(400).json({ success: false, message: 'Index is required.' });
    }

    dynamicCategory.getProductsByIndex(index, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching products', error: err });
        }

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'No products found for this index' });
        }

        res.status(200).json({ success: true, message: 'Products fetched successfully', products: result });
    });
};

module.exports = {
    selectProductcategoryfirst,
    dynamicCategoryData, // ✅ New function added here
    // dynamicCategoryData2
};
