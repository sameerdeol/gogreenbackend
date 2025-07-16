const ProductBrand = require('../models/productBrandModel');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');

// Create a new product brand
const createProductBrand = async (req, res) => {
    console.log(req.files);
    const { name, description,category_id } = req.body;
    let brandLogo = null;
    if (req.files?.brand_logo?.[0]) {
        const file = req.files.brand_logo[0];
        brandLogo = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
    }

    ProductBrand.create(name, description,category_id, brandLogo, (err, result) => {
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
        if (!results.length) return res.status(200).json({ success: true, message: 'No product brands found' });
        res.status(200).json({ success: true, productBrands: results });
    });
};

const fetchbrandbycatID = (req, res) => {
    const {catID } = req.body;
    ProductBrand.findbycatID(catID,(err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching product brands', error: err });
        if (!results.length) return res.status(200).json({ success: true, message: 'No product brands found' });
        res.status(200).json({ success: true, productBrands: results });
    });
};

// Get product brand by ID
const getProductBrandById = (req, res) => {
    const { brandId } = req.body;
    ProductBrand.findById(brandId, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching product brand', error: err });
        if (!result.length) return res.status(404).json({ success: false, message: 'Product brand not found' });
        res.status(200).json({ success: true, productBrand: result[0] });
    });
};

const updateProductBrandById = async (req, res) => {
    const { id, name, description, categoryid, status } = req.body;
    
    if (!id) {
        return res.status(400).json({ success: false, message: 'Product brand ID is required.' });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (categoryid !== undefined) updateFields.categoryid = categoryid;
    if (status !== undefined) updateFields.status = status;

    // Check if a new brand logo was uploaded
    if (req.files?.brand_logo?.[0]) {
        const file = req.files.brand_logo[0];
        const newBrandLogo = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
        updateFields.brand_logo = newBrandLogo;
        // Fetch existing brand to delete old logo from S3
        await new Promise((resolve) => {
            ProductBrand.findById(id, async (err, brand) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error fetching product brand', error: err });
                }
                const brandObject = Array.isArray(brand) ? brand[0] : brand;
                if (!brandObject) {
                    return res.status(404).json({ success: false, message: 'Product brand not found' });
                }
                if (brandObject.brand_logo) {
                    await deleteS3Image(brandObject.brand_logo);
                }
                resolve();
            });
        });
    }

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
    }

    // Update product brand
    ProductBrand.update(id, updateFields, (err, updatedBrand) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating product brand', error: err });
        }

        // Ensure updatedBrand is an object, not an array
        const updatedBrandObject = Array.isArray(updatedBrand) ? updatedBrand[0] : updatedBrand;

        res.status(200).json({
            success: true,
            message: 'Product brand updated successfully',
            productBrand: updatedBrandObject, // ✅ Now returns an object
        });
    });
};


// Delete product brand by ID
const deleteProductBrandById = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product brand ID is required.' });
    }

    // Fetch existing product brand to delete old logo
    ProductBrand.findById(id, async (err, brand) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching product brand', error: err });
        }

        // Ensure brand is an object, not an array
        const brandObject = Array.isArray(brand) ? brand[0] : brand;

        if (!brandObject) {
            return res.status(404).json({ success: false, message: 'Product brand not found.' });
        }

        // Delete old brand logo if it exists
        if (brandObject.brand_logo) {
            await deleteS3Image(brandObject.brand_logo);
        }

        // Now delete the product brand
        ProductBrand.delete(id, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error deleting product brand', error: err });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Product brand not found.' });
            }

            res.status(200).json({ success: true, message: 'Product brand deleted successfully.' });
        });
    });
};


module.exports = {
    uploadFields,
    createProductBrand,
    getAllProductBrands,
    getProductBrandById,
    updateProductBrandById,
    deleteProductBrandById,
    fetchbrandbycatID
};
