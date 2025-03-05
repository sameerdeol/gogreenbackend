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
const getAllSubcategoriesbycatID = (req, res) => {
    console.log("Category ID received:", req.params.id); // Debugging

    ProductSubcategory.findBycatId(req.params.id, (err, result) => {
        if (err) {
            console.error("Error fetching subcategory:", err);
            return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        }
        console.log("Query Result:", result); // Debugging

        if (!result || result.length === 0) {  // Fix: Ensure result is valid
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }

        res.status(200).json({ success: true, subcategories: result }); // Fix: Use "subcategories"
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

        // Ensure subcategory is an object, not an array
        const subcategoryObject = Array.isArray(subcategory) ? subcategory[0] : subcategory;

        if (!subcategoryObject) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }

        const updateFields = {
            name: name !== undefined ? name : subcategoryObject.name,
            category_id: category_id !== undefined ? category_id : subcategoryObject.category_id,
            description: description !== undefined ? description : subcategoryObject.description,
            status: status !== undefined ? status : subcategoryObject.status,
            subcategory_logo: subcategoryObject.subcategory_logo, // Keep existing logo
        };

        // Check if a new subcategory logo was uploaded
        if (req.files && req.files['subcategory_logo']) {
            console.log("✅ New subcategory logo uploaded");
            const newSubcategoryLogo = req.files['subcategory_logo'][0].path;
            updateFields.subcategory_logo = newSubcategoryLogo;

            // Delete old logo from server
            if (subcategoryObject.subcategory_logo) {
                const oldLogoPath = subcategoryObject.subcategory_logo;
                fs.unlink(oldLogoPath, (err) => {
                    if (err) console.error('❌ Error deleting old subcategory logo:', err);
                    else console.log('🗑️ Old subcategory logo deleted successfully');
                });
            }
        }

        // Update the subcategory and return the full updated subcategory
        ProductSubcategory.update(id, updateFields, (err, updatedSubcategory) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating subcategory', error: err });
            }

            // Ensure updatedSubcategory is an object, not an array
            const updatedSubcategoryObject = Array.isArray(updatedSubcategory) ? updatedSubcategory[0] : updatedSubcategory;

            res.status(200).json({
                success: true,
                message: 'Subcategory updated successfully',
                subcategories: updatedSubcategoryObject, // ✅ Now returns an object
            });
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
        if (err) {
            console.error("Error fetching subcategory:", err); // Debugging log
            return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        }

        if (!subcategory) {
            console.log("Subcategory not found in database"); // Debugging log
            return res.status(404).json({ success: false, message: 'Subcategory not found.' });
        }

        // Delete subcategory logo from server before deleting the subcategory
        if (subcategory.subcategory_logo) {
            fs.unlink(subcategory.subcategory_logo, (err) => {
                if (err) console.error('Error deleting subcategory logo:', err);
                else console.log('Subcategory logo deleted successfully');
            });
        }

        ProductSubcategory.delete(id, (err, result) => {
            if (err) {
                console.error("Error deleting subcategory:", err); // Debugging log
                return res.status(500).json({ success: false, message: 'Error deleting subcategory', error: err });
            }
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
    deleteSubcategoryById,
    getAllSubcategoriesbycatID
};
