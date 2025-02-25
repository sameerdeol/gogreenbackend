const ProductBrand = require('../models/productBrandModel');

// Create a new product brand
const createProductBrand = (req, res) => {
    console.log(req.body);
    const { name, description } = req.body;

    ProductBrand.create(name, description, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error creating product brand', error: err });
        res.status(201).json({ success: true, message: 'Product brand created successfully', id: result.insertId });
    });
};

// Get all product brands
const getAllProductBrands = (req, res) => {
    ProductBrand.findAll((err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching product brands', error: err });
        if (!results.length) return res.status(200).json({ success: true, message: 'No product brands found' });
        res.status(200).json({ success: true, productBrands: results });
    });
};

// Get product brand by ID
const getProductBrandById = (req, res) => {
    ProductBrand.findById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching product brand', error: err });
        if (!result.length) return res.status(404).json({ success: false, message: 'Product brand not found' });
        res.status(200).json({ success: true, productBrand: result[0] });
    });
};

// Update product brand by ID (including status)
const updateProductBrandById = (req, res) => {
    const { id, name, description, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product brand ID is required.' });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
    }

    ProductBrand.update(id, updateFields, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating product brand', error: err });
        }
        res.status(200).json({ success: true, message: 'Product brand updated successfully' });
    });
};



// Delete product brand by ID
const deleteProductBrandById = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Product brand ID is required.' });

    ProductBrand.delete(id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error deleting product brand', error: err });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Product brand not found.' });
        res.status(200).json({ success: true, message: 'Product brand deleted successfully.' });
    });
};

module.exports = {
    createProductBrand,
    getAllProductBrands,
    getProductBrandById,
    updateProductBrandById,
    deleteProductBrandById
};
