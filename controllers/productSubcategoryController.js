const ProductSubcategory = require('../models/productSubcategoryModel');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');

// Create a new subcategory
const createSubcategory = async (req, res) => {

    const { name, category_id, description } = req.body;
    let sub_category_logo = null;
    if (req.files && req.files['subcategory_logo']) {
        const file = req.files['subcategory_logo'][0];
        sub_category_logo = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
    }

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
    const { is_web } = req.body;

    if (is_web) {
        ProductSubcategory.findAll((err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error fetching subcategories', error: err });
            }

            if (!results.length) {
                return res.status(200).json({ success: true, message: 'No subcategories with products found' });
            }

            res.status(200).json({ success: true, subcategories: results });
        });
    } else {    
        ProductSubcategory.findAllSubCatWithProducts((err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error fetching subcategories', error: err });
            }

            if (!results.length) {
                return res.status(200).json({ success: true, message: 'No subcategories with products found' });
            }

            res.status(200).json({ success: true, subcategories: results });
        });  
    } 
};

const getAllBeautysubcat = (req, res) => {
    const  catID  =18;

    ProductSubcategory.findBycatId(catID, (err, result) => {
        if (err) {
            console.error("Error fetching subcategory:", err);
            return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        }

        if (!result || result.length === 0) {  // Fix: Ensure result is valid
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }

        res.status(200).json({ success: true, subcategories: result }); // Fix: Use "subcategories"
    });
};
const getAllSubcategoriesbycatID = (req, res) => {
    const { catID } = req.body;
    console.log(catID);

    ProductSubcategory.findBycatId(catID, (err, result) => {
        if (err) {
            console.error("Error fetching subcategory:", err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching subcategory',
                error: err
            });
        }

        if (!result || result.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No matched subcategories',
                subcategories: []
            });
        }

        res.status(200).json({
            success: true,
            subcategories: result
        });
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
const updateSubcategoryById = async (req, res) => {
    const { id, name, category_id, description, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });
    }

    // Fetch existing subcategory
    ProductSubcategory.findById(id, async (err, subcategory) => {
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
            const file = req.files['subcategory_logo'][0];
            const newSubcategoryLogo = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
            updateFields.subcategory_logo = newSubcategoryLogo;
            // Delete old logo from S3
            if (subcategoryObject.subcategory_logo) {
                await deleteS3Image(subcategoryObject.subcategory_logo);
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
const deleteSubcategoryById = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Subcategory ID is required.' });
    }

    ProductSubcategory.findById(id, async (err, subcategory) => {
        if (err) {
            console.error("Error fetching subcategory:", err); // Debugging log
            return res.status(500).json({ success: false, message: 'Error fetching subcategory', error: err });
        }

        if (!subcategory) {
            console.log("Subcategory not found in database"); // Debugging log
            return res.status(404).json({ success: false, message: 'Subcategory not found.' });
        }

        // Delete subcategory logo from S3 before deleting the subcategory
        if (subcategory.subcategory_logo) {
            await deleteS3Image(subcategory.subcategory_logo);
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
    getAllSubcategoriesbycatID,
    getAllBeautysubcat
};
