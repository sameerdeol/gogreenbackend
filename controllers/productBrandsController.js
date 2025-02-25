const jwt = require('jsonwebtoken'); 
const ProductBrand = require('../models/productBrandModel');

// Middleware to check if the user is a manager
const checkManagerRole = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const loggedInUserRole = decoded.role_id;

        if (!loggedInUserRole) {
            return res.status(400).json({ success: false, message: 'Role ID is required.' });
        }

        if (loggedInUserRole !== 2) {
            return res.status(403).json({ success: false, message: 'Access denied. Manager privileges required.' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: error.name === 'TokenExpiredError' ? 'Token has expired. Please log in again.' : 'Invalid token. Please log in again.' 
        });
    }
};

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

// Update product brand by ID
const updateProductBrandById = (req, res) => {
    const { id, name, description } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product brand ID is required.' });
    }

    if (!name || !description) {
        return res.status(400).json({ success: false, message: 'Both name and description are required.' });
    }

    ProductBrand.update(id, name, description, (err, result) => {
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
    checkManagerRole,
    createProductBrand,
    getAllProductBrands,
    getProductBrandById,
    updateProductBrandById,
    deleteProductBrandById
};
