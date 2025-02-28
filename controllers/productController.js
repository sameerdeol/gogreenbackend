const Product = require('../models/productModel');
const GalleryImage = require('../models/galleryImage');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup

// Create a new product
const createProduct = (req, res) => {
    // console.log("Uploaded Files:", req.files);
    // console.log("Request Body:", req.body);

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
    if (req.files?.['featuredImage']?.length > 0) {
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

                    // Fetch the updated product details before responding
                    Product.findById(id, (findErr, updatedProduct) => {
                        if (findErr) {
                            return res.status(500).json({ success: false, message: 'Error fetching updated product', error: findErr });
                        }
                        res.status(200).json({
                            success: true,
                            message: 'Product and gallery images updated successfully',
                            data: updatedProduct
                        });
                    });
                });
            });
        } else {
            // Fetch the updated product if no gallery images need updating
            Product.findById(id, (findErr, updatedProduct) => {
                if (findErr) {
                    return res.status(500).json({ success: false, message: 'Error fetching updated product', error: findErr });
                }
                res.status(200).json({
                    success: true,
                    message: 'Product updated successfully',
                    product: updatedProduct
                });
            });
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
    createProduct,
    getProductById,
    updateProductById,
    deleteProductById,
    getProducts
};
