const jwt = require('jsonwebtoken'); 
const ProductSubcategory = require('../models/productSubcategoryModel');

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
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
        }
    }
};

// Create a new subcategory
const createSubcategory = (req, res) => {
    const { name, category_id, description } = req.body;

    ProductSubcategory.create(name, category_id, description, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error creating subcategory', error: err });
        res.status(201).json({ success: true, message: 'Subcategory created successfully', id: result.insertId });
    });
};

// Get all subcategories
const getAllSubcategories = (req, res) => {
    ProductSubcategory.findAll((err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching subcategories', error: err });
        if (!results.length) return res.status(200).json({ success: true, message: 'No subcategories found' });
        res.status(200).json({ success: true, subcategories: results });
    });
};

// Get subcategory by ID
const getSubcategoryById = (req, res) => {
    ProductSubcategory.findById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        if (!result.length) return res.status(404).json({ success: false, message: 'Subcategory not found' });
        res.status(200).json({ success: true, subcategory: result[0] });
    });
};

// Get subcategories by category ID
const getSubcategoriesByCategoryId = (req, res) => {
    ProductSubcategory.findByCategoryId(req.params.categoryId, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching subcategories', error: err });
        res.status(200).json({ success: true, subcategories: results });
    });
};

// Update subcategory by ID
const updateSubcategoryById = (req, res) => {
    console.log(req.body)
    const { id, name, category_id, description } = req.body;
    if (!id) {
        return res.status(400).json({ success: false, message: 'Category ID is required.' });
    }

    if (!name || !description || !category_id) {
        return res.status(400).json({ success: false, message: 'Both name and description are required.' });
    }

    ProductSubcategory.update(id, name, category_id, description, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating category', error: err });
        }
        res.status(200).json({ success: true, message: 'Category updated successfully' });
    });
};

// Delete subcategory by ID
const deleteSubcategoryById = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });

    ProductSubcategory.delete(id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error deleting subcategory', error: err });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Subcategory not found.' });
        res.status(200).json({ success: true, message: 'Subcategory deleted successfully.' });
    });
};

module.exports = {
    checkManagerRole,
    createSubcategory,
    getAllSubcategories,
    getSubcategoryById,
    getSubcategoriesByCategoryId,
    updateSubcategoryById,
    deleteSubcategoryById
};
