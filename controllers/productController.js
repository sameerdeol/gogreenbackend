const Product = require('../models/productModel');
const GalleryImage = require('../models/galleryImage');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup

const checkManagerRole = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your JWT secret key

        // Check if the role ID exists and matches the required role (e.g., 2 for managers)
        const loggedInUserRole = decoded.role_id; // Ensure your token includes `role_id`
        if (!loggedInUserRole) {
            return res.status(400).json({
                success: false,
                message: 'Role ID is required to perform this action.',
            });
        }

        if (loggedInUserRole !== 2) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have manager privileges.',
            });
        }

        // Proceed to the next middleware/route handler
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please log in again.',
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please log in again.',
            });
        } else {
            console.error('Unexpected error:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while verifying the token.',
            });
        }
    }
};

// Create a new product
const createProduct = (req, res) => {
    console.log("Uploaded Files:", req.files);
    console.log("Request Body:", req.body);

    // Extract values from req.body
    let { name, description, price, category, sub_category, stock, manufacturer_details } = req.body;

    // Convert numeric values safely
    price = parseFloat(price) || 0; // Ensure price is a valid float
    stock = parseInt(stock) || 0; // Ensure stock is a valid integer
    sub_category = sub_category && !isNaN(sub_category) ? parseInt(sub_category) : null; // Fix NaN issue

    // Image paths
    const featuredImage = req.files['featuredImage'] ? `uploads/featured-images/${req.files['featuredImage'][0].filename}` : null;
    const galleryImages = req.files['galleryImages'] ? req.files['galleryImages'].map(file => `uploads/gallery-images/${file.filename}`) : [];

    // Insert product into database
    Product.create(name, description, price, category, sub_category, stock, featuredImage, manufacturer_details, (err, productResult) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: 'Error creating product', error: err });
        }

        const productId = productResult.insertId;

        // Insert gallery images
        GalleryImage.create(productId, galleryImages, (imageErr, imageResult) => {
            if (imageErr) {
                console.error("Gallery Image Error:", imageErr);
                return res.status(500).json({ success: false, message: 'Error adding gallery images', error: imageErr });
            }
            res.status(201).json({ 
                success: true, 
                message: 'Product created successfully', 
                product_id: productId,
                gallery_images: imageResult 
            });
        });
    });
};

// Get product by ID
const getProductById = (req, res) => {
    const productId = req.params.id;

    Product.findById(productId, (err, product) => {
        if (err || !product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, product });
    });
};
const getProducts = (req, res) => {
    Product.find((err, products) => {
        if (err) {
            // Handle database errors
            console.error(err);
            return res.status(500).json({ success: false, message: 'Server error while fetching products' });
        }
        if (!products || products.length === 0) {
            // Handle no products found
            return res.status(201).json({ success: true, message: 'No products found' });
        }
        // Return products if successful
        res.status(200).json({ success: true, products });
    });
};

// Update product by ID
const updateProductById = (req, res) => {
    const { id, name, description, price, category, sub_category, stock, manufacturer_details, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const updatedData = {
        name,
        description,
        price,
        category,
        sub_category, 
        stock,
        manufacturer_details,
    };

    // Include status only if it's provided (0 or 1)
    if (status !== undefined) {
        updatedData.status = parseInt(status, 10);
    }

    // Safely check for files
    if (req.files && req.files['featuredImage'] && req.files['featuredImage'].length > 0) {
        updatedData.featured_image = req.files['featuredImage'][0].path; // New featured image
    }

    // Check for galleryImages
    const galleryImages = req.files?.['galleryImages']?.map(file => file.path) || [];

    // Update the product
    Product.updateById(id, updatedData, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating product', error: err });
        }

        // Update gallery images only if new ones are uploaded
        if (galleryImages.length > 0) {
            // First, delete existing gallery images for the product
            GalleryImage.deleteByProductId(id, (deleteErr) => {
                if (deleteErr) {
                    return res.status(500).json({ success: false, message: 'Error clearing gallery images', error: deleteErr });
                }

                // Then, insert new gallery images
                GalleryImage.create(id, galleryImages, (createErr) => {
                    if (createErr) {
                        return res.status(500).json({ success: false, message: 'Error updating gallery images', error: createErr });
                    }

                    // Respond with success
                    res.status(200).json({ success: true, message: 'Product and gallery images updated successfully', product: result });
                });
            });
        } else {
            // No gallery images to update
            res.status(200).json({ success: true, message: 'Product updated successfully', product: result });
        }
    });
};


// Delete product by ID
const deleteProductById = (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    Product.deleteById(id, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error deleting product', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        res.status(200).json({ success: true, message: 'Product deleted successfully.' });
    });
};


// Export multer upload as a middleware and role check as well
module.exports = {
    uploadFields,
    checkManagerRole,
    createProduct,
    getProductById,
    updateProductById,
    deleteProductById,
    getProducts
};
