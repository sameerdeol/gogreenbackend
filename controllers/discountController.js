const DiscountModel = require('../models/discountModel');

const createDiscount = (req, res) => {
    const { product_id, discount_percent } = req.body;

    if (!product_id || discount_percent == null) {
        return res.status(400).json({ success: false, message: 'Product ID and discount percent are required.' });
    }

    DiscountModel.insertDiscount(product_id, discount_percent, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to create discount', error: err });
        }

        res.status(201).json({ success: true, message: 'Discount created successfully', id: result.insertId });
    });
};

const getDiscounts = (req, res) => {
    DiscountModel.getDiscounts((err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve discounts', error: err });
        }

        res.status(200).json({ success: true, message: 'Discounts fetched successfully', data: result });
    });
};


const updateDiscount = (req, res) => {
    const { product_id, discount_percent } = req.body;

    if (!product_id || discount_percent == null) {
        return res.status(400).json({ success: false, message: 'Product ID and new discount percent are required.' });
    }

    DiscountModel.updateDiscountByProductId(product_id, discount_percent, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update discount', error: err });
        }

        res.status(200).json({ success: true, message: 'Discount updated successfully' });
    });
};

const deleteDiscount = (req, res) => {
    const { discount_id } = req.body;

    if (!discount_id) {
        return res.status(400).json({ success: false, message: 'Discount ID is required.' });
    }

    DiscountModel.deleteDiscountById(discount_id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete discount', error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Discount not found.' });
        }

        res.status(200).json({ success: true, message: 'Discount deleted successfully' });
    });
};


module.exports = {
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getDiscounts
};
