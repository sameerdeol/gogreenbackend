const jwt = require('jsonwebtoken'); 
const ProductCategory = require('../models/productCategoryModel');

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

// Create a new category
const createCategory = (req, res) => {
    console.log(req.body);
    const { name, description } = req.body;

    ProductCategory.create(name, description, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error creating category', error: err });
        res.status(201).json({ success: true, message: 'Category created successfully', id: result.insertId });
    });
};

// Get all categories
const getAllCategories = (req, res) => {
    ProductCategory.findAll((err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching categories', error: err });
        if (!results.length) return res.status(200).json({ success: true, message: 'No categories found' });
        res.status(200).json({ success: true, categories: results });
    });
};

// Get category by ID
const getCategoryById = (req, res) => {
    ProductCategory.findById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching category', error: err });
        if (!result.length) return res.status(404).json({ success: false, message: 'Category not found' });
        res.status(200).json({ success: true, category: result[0] });
    });
};

// Update category by ID
const updateCategoryById = (req, res) => {
    const { id, name, description } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Category ID is required.' });
    }

    if (!name || !description) {
        return res.status(400).json({ success: false, message: 'Both name and description are required.' });
    }

    ProductCategory.update(id, name, description, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating category', error: err });
        }
        res.status(200).json({ success: true, message: 'Category updated successfully' });
    });
};


// Delete category by ID
const deleteCategoryById = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Category ID is required.' });

    ProductCategory.delete(id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error deleting category', error: err });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Category not found.' });
        res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    });
};

module.exports = {
    checkManagerRole,
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategoryById,
    deleteCategoryById
};
