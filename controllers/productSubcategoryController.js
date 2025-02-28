const ProductSubcategory = require('../models/productSubcategoryModel');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const fs = require('fs');

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

// Get all subcategories
const getAllSubcategories = (req, res) => {
    ProductSubcategory.findAll((err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching subcategories', error: err });
        }
        if (!results.length) {
            return res.status(200).json({ success: true, message: 'No subcategories found' });
        }
        res.status(200).json({ success: true, subcategories: results });
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

// Update subcategory by ID
const updateSubcategoryById = (req, res) => {
    const { id, name, category_id, description, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });
    }

    // Fetch existing subcategory
    ProductSubcategory.findById(id, (err, subcategory) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        }
        if (!subcategory.length) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }

        const updateFields = {
            name: name !== undefined ? name : subcategory[0].name,
            category_id: category_id !== undefined ? category_id : subcategory[0].category_id,
            description: description !== undefined ? description : subcategory[0].description,
            status: status !== undefined ? status : subcategory[0].status,
            sub_category_logo: subcategory[0].sub_category_logo,
        };

        // Check if a new subcategory logo was uploaded
        if (req.files && req.files['subcategory_logo']) {
            console.log("✅ New subcategory logo uploaded");
            const newSubcategoryLogo = req.files['subcategory_logo'][0].path;
            updateFields.sub_category_logo = newSubcategoryLogo;

            // Delete old logo from server
            if (subcategory[0].sub_category_logo) {
                const oldLogoPath = subcategory[0].sub_category_logo;
                fs.unlink(oldLogoPath, (err) => {
                    if (err) console.error('❌ Error deleting old subcategory logo:', err);
                    else console.log('🗑️ Old subcategory logo deleted successfully');
                });
            }
        }

        // Update the subcategory
        ProductSubcategory.update(id, updateFields, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating subcategory', error: err });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Subcategory not found.' });
            }
            res.status(200).json({ success: true, message: 'Subcategory updated successfully' });
        });
    });
};

// Delete subcategory by ID
const deleteSubcategoryById = (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });
    }

    ProductSubcategory.findById(id, (err, subcategory) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        if (!subcategory.length) return res.status(404).json({ success: false, message: 'Subcategory not found.' });

        // Delete subcategory logo from server before deleting the subcategory
        if (subcategory[0].sub_category_logo) {
            fs.unlink(subcategory[0].sub_category_logo, (err) => {
                if (err) console.error('Error deleting subcategory logo:', err);
                else console.log('Subcategory logo deleted successfully');
            });
        }

        ProductSubcategory.delete(id, (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Error deleting subcategory', error: err });
            res.status(200).json({ success: true, message: 'Subcategory deleted successfully.' });
        });
    });
};

module.exports = {
    uploadFields,
    createSubcategory,
    getAllSubcategories,
    getSubcategoryById,
    updateSubcategoryById,
    deleteSubcategoryById
};
