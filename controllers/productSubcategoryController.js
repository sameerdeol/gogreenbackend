const ProductSubcategory = require('../models/productSubcategoryModel');

// Create a new subcategory
const createSubcategory = (req, res) => {
    console.log("Received Files:", req.files);
    console.log("Received Body:", req.body);

    const { name, category_id, description } = req.body;
    const sub_category_logo = req.files && req.files['subcategory_logo']
        ? req.files['subcategory_logo'][0].path
        : null;

    if (!name || !category_id) {
        return res.status(400).json({ success: false, message: 'Name and category_id are required.' });
    }

    ProductSubcategory.create(name, category_id, description, sub_category_logo, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: 'Error creating subcategory', error: err });
        }

        res.status(201).json({
            success: true,
            message: 'Subcategory created successfully',
            id: result.insertId
        });
    });
};

module.exports = { createSubcategory };


// Get all subcategories
const getAllSubcategories = (req, res) => {
    ProductSubcategory.findAll((err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching subcategories', error: err });
        }
        res.status(200).json({ success: true, subcategories: results.length ? results : [] });
    });
};

// Get subcategory by ID
const getSubcategoryById = (req, res) => {
    ProductSubcategory.findById(req.params.id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        }
        if (!result.length) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }
        res.status(200).json({ success: true, subcategory: result[0] });
    });
};

// Update subcategory by ID (using body parameters)
const updateSubcategoryById = (req, res) => {
    const { id, name, category_id, description, status, sub_category_logo } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (category_id !== undefined) updateFields.category_id = category_id;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    if (sub_category_logo !== undefined) updateFields.sub_category_logo = sub_category_logo;

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
    }

    ProductSubcategory.update(id, updateFields, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating subcategory', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Subcategory not found.' });
        }
        res.status(200).json({ success: true, message: 'Subcategory updated successfully' });
    });
};

// Delete subcategory by ID (using body parameters)
const deleteSubcategoryById = (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });
    }

    ProductSubcategory.delete(id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error deleting subcategory', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Subcategory not found.' });
        }
        res.status(200).json({ success: true, message: 'Subcategory deleted successfully.' });
    });
};

module.exports = {
    createSubcategory,
    getAllSubcategories,
    getSubcategoryById,
    updateSubcategoryById,
    deleteSubcategoryById
};
