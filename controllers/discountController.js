const DiscountModel = require('../models/discountModel');

const createOrUpdateDiscount = (req, res) => {
    const { product_id, discount_percent } = req.body;

    if (!product_id || discount_percent == null) {
        return res.status(400).json({ success: false, message: 'Product ID and discount percent are required.' });
    }

    // Step 1: Check if discount exists for this product
    DiscountModel.getDiscountByProductId(product_id, (err, existingDiscount) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error checking existing discount', error: err });
        }

        if (existingDiscount && existingDiscount.length > 0) {
            // ✅ Record Found
            const discountId = existingDiscount[0].discount_id;
            if (discount_percent == 0) {
                // 👉 Delete the existing discount
                DiscountModel.deleteDiscountById(discountId, (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Failed to delete discount', error: err });
                    }

                    return res.status(200).json({ success: true, message: 'Discount deleted successfully' });
                });
            } else {
                // 👉 Update the discount
                DiscountModel.updateDiscountByProductId(product_id, discount_percent, (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Failed to update discount', error: err });
                    }

                    return res.status(200).json({ success: true, message: 'Discount updated successfully' });
                });
            }
        } else {
            // ❌ Record Not Found
            if (discount_percent > 0) {
                // 👉 Create new discount
                DiscountModel.insertDiscount(product_id, discount_percent, (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Failed to create discount', error: err });
                    }

                    return res.status(201).json({ success: true, message: 'Discount created successfully', id: result.insertId });
                });
            } else {
                // 👉 Do nothing
                return res.status(200).json({ success: true, message: 'No action taken. Discount percent is 0 and no existing discount found.' });
            }
        }
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
    createOrUpdateDiscount,
    getDiscounts,
    deleteDiscount
};
