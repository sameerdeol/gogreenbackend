const ProductCategory = require('../models/productCategoryModel');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');

// Create a new category
const createCategory = async (req, res) => {
    const { name, description } = req.body;
    const role_id = req.user?.role_id || req.body.role_id || 0;
    const user_id = req.user?.id || req.body.user_id || null;

    let categoryLogo = null;
    if (req.files && req.files['category_logo']) {
        const file = req.files['category_logo'][0];
        categoryLogo = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
    }

    if (!name) {
        return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const adminApproval = (role_id === 1 || role_id === 2) ? 1 : 0;
    const listedBy = (role_id === 1 || role_id === 2) ? 'admin' : `vendor_${user_id}`;

    ProductCategory.create(name, description, categoryLogo, adminApproval, listedBy, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error creating category', error: err });
        }
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            id: result.insertId,
            admin_approval: adminApproval,
            listed_by: listedBy
        });
    });
};




// Get all categories
const getAllCategories = (req, res) => {
    const { is_web, role_id } = req.body;
    const user_id = req.user?.id || req.body.user_id;

    if (!role_id) {
        return res.status(400).json({ success: false, message: 'role_id is required' });
    }

    if (is_web) {
        ProductCategory.findAll(role_id, user_id, (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error fetching categories', error: err });
            }

            if (!results.length) {
                return res.status(200).json({ success: true, message: 'No categories found' });
            }

            res.status(200).json({ success: true, categories: results });
        });
    } else {
        ProductCategory.findAllCatWithProducts(role_id, user_id, (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error fetching categories', error: err });
            }

            if (!results.length) {
                return res.status(200).json({ success: true, message: 'No categories with products found' });
            }

            res.status(200).json({ success: true, categories: results });
        });
    }
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
const updateCategoryById = async (req, res) => {
    const { id, name, description, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Category ID is required.' });
    }

    // Fetch existing category
    ProductCategory.findById(id, async (err, category) => {
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
            const file = req.files['category_logo'][0];
            const newCategoryLogo = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
            updateFields.category_logo = newCategoryLogo;
            // Delete old logo from S3
            if (categoryObject.category_logo) {
                await deleteS3Image(categoryObject.category_logo);
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
const deleteCategoryById = async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Category ID is required.' });

    ProductCategory.findById(id, async (err, category) => {
        if (err) {
            console.error("Error fetching category:", err); // 🔍 Log errors
            return res.status(500).json({ success: false, message: 'Error fetching category', error: err });
        }

        if (!category) {
            console.log("Category not found in database"); // 🔍 Debugging log
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        // Delete category logo from S3 before deleting the category
        if (category.category_logo) {
            await deleteS3Image(category.category_logo);
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
