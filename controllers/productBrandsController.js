const ProductBrand = require('../models/productBrandModel');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup

// Create a new product brand
const createProductBrand = (req, res) => {
    console.log(req.files)
    const { name, description } = req.body;
    const brandLogo = req.files['brand_logo'] ? req.files['brand_logo'][0].path : null;

    // Call the create function to insert the brand with the logo path
    ProductBrand.create(name, description, brandLogo, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error creating product brand', error: err });
        }
        res.status(201).json({ success: true, message: 'Product brand created successfully', id: result.insertId });
    });
};

// Get all product brands
const getAllProductBrands = (req, res) => {
    ProductBrand.findAll((err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching product brands', error: err });
        console.log("hiii",results)
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

// Update product brand by ID (including status)
const updateProductBrandById = (req, res) => {
    const { id, name, description, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product brand ID is required.' });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;

    // Check if a new brand logo was uploaded
    if (req.files && req.files['brand_logo']) {
        // Get the new brand logo path
        const newBrandLogo = req.files['brand_logo'][0].path;

        // Add the new logo to the update fields
        updateFields.brand_logo = newBrandLogo;

        // Optional: If there's an old logo, delete it from the server
        // (You could fetch the old logo from the database before this step if needed)
        ProductBrand.getById(id, (err, brand) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error fetching product brand', error: err });
            }

            if (brand && brand.brand_logo) {
                const oldLogoPath = brand.brand_logo;
                fs.unlink(oldLogoPath, (err) => {
                    if (err) {
                        console.error('Error deleting old brand logo:', err);
                    } else {
                        console.log('Old logo deleted successfully');
                    }
                });
            }
        });
    }

    // If no fields are provided, return an error
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
    }

    // Call the update method to update the product brand
    ProductBrand.update(id, updateFields, (err, result) => {
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
    uploadFields,
    createProductBrand,
    getAllProductBrands,
    getProductBrandById,
    updateProductBrandById,
    deleteProductBrandById
};
