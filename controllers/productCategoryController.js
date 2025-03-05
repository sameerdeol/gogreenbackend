const ProductCategory = require('../models/productCategoryModel');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const fs = require('fs');

// Create a new category
const createCategory = (req, res) => {
    console.log("Received Files:", req.files); // Debugging output
    console.log("Received Body:", req.body); // Check if form fields exist

    const { name, description } = req.body;
    const categoryLogo = req.files && req.files['category_logo'] 
        ? req.files['category_logo'][0].path 
        : null;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    ProductCategory.create(name, description, categoryLogo, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error creating category', error: err });
        }
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
    const { id, name, description, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Category ID is required.' });
    }

    // Fetch existing category
    ProductCategory.findById(id, (err, category) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching category', error: err });
        }

        // Ensure category is an object, not an array
        const categoryObject = Array.isArray(category) ? category[0] : category;

        if (!categoryObject) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const updateFields = {
            name: name !== undefined ? name : categoryObject.name,
            description: description !== undefined ? description : categoryObject.description,
            status: status !== undefined ? status : categoryObject.status,
            category_logo: categoryObject.category_logo, // Keep existing logo by default
        };

        // Check if a new category logo was uploaded
        if (req.files && req.files['category_logo']) {
            console.log("✅ New category logo uploaded");
            const newCategoryLogo = req.files['category_logo'][0].path;
            updateFields.category_logo = newCategoryLogo;

            // Delete old logo from server
            if (categoryObject.category_logo) {
                const oldLogoPath = categoryObject.category_logo;
                fs.unlink(oldLogoPath, (err) => {
                    if (err) console.error('❌ Error deleting old category logo:', err);
                    else console.log('🗑️ Old category logo deleted successfully');
                });
            }
        }

        // Update the category and return the full updated category
        ProductCategory.update(id, updateFields, (err, updatedCategory) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating category', error: err });
            }

            // Ensure updatedCategory is an object, not an array
            const updatedCategoryObject = Array.isArray(updatedCategory) ? updatedCategory[0] : updatedCategory;

            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                category: updatedCategoryObject, // ✅ Now returns an object
            });
        });
    });
};



// Delete category by ID
const deleteCategoryById = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Category ID is required.' });

    ProductCategory.findById(id, (err, category) => {
        if (err) {
            console.error("Error fetching category:", err); // 🔍 Log errors
            return res.status(500).json({ success: false, message: 'Error fetching category', error: err });
        }

        if (!category) {
            console.log("Category not found in database"); // 🔍 Debugging log
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        // Delete category logo from server before deleting the category
        if (category.category_logo) {
            fs.unlink(category.category_logo, (err) => {
                if (err) console.error('Error deleting category logo:', err);
                else console.log('Category logo deleted successfully');
            });
        }

        ProductCategory.delete(id, (err, result) => {
            if (err) {
                console.error("Error deleting category:", err); // 🔍 Log errors
                return res.status(500).json({ success: false, message: 'Error deleting category', error: err });
            }
            res.status(200).json({ success: true, message: 'Category deleted successfully.' });
        });
    });
};



module.exports = {
    uploadFields,
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategoryById,
    deleteCategoryById
};
