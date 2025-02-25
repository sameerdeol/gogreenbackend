const ProductSubcategory = require('../models/productSubcategoryModel');

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
    console.log(req.body);
    const { id, name, category_id, description, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (category_id !== undefined) updateFields.category_id = category_id;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
    }

    ProductSubcategory.update(id, updateFields, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating subcategory', error: err });
        }
        res.status(200).json({ success: true, message: 'Subcategory updated successfully' });
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
    createSubcategory,
    getAllSubcategories,
    getSubcategoryById,
    getSubcategoriesByCategoryId,
    updateSubcategoryById,
    deleteSubcategoryById
};
