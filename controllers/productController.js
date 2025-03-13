const Product = require('../models/productModel');
const GalleryImage = require('../models/galleryImage');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Create a new product
const createProduct = (req, res) => {
    try {
        let {
            name, description, price, category, sub_category,
            stock, manufacturer_details, title, subtitle, size, fast_delivery_available
        } = req.body;

        // Convert numeric values safely
        price = parseFloat(price) || 0;
        stock = parseInt(stock, 10) || 0;
        size = parseFloat(size) || 0;
        sub_category = sub_category && !isNaN(sub_category) ? parseInt(sub_category, 10) : null;

        // Parse attributes JSON
        let attributes = [];
        if (req.body.attributes) {
            try {
                attributes = JSON.parse(req.body.attributes);
            } catch (error) {
                return res.status(400).json({ success: false, message: 'Invalid attributes format' });
            }
        }

        // Handle file uploads
        const featuredImage = req.files['featuredImage'] ? `uploads/featured-images/${req.files['featuredImage'][0].filename}` : null;
        const galleryImages = req.files['galleryImages'] ? req.files['galleryImages'].map(file => `uploads/gallery-images/${file.filename}`) : [];

        // Insert product into MySQL
        Product.create(
            name, description, price, category, sub_category, stock, featuredImage, manufacturer_details, title, subtitle, size, fast_delivery_available,
            (err, productResult) => {
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

                    // Insert attributes into `product_attributes` table
                    if (attributes.length > 0) {
                        Product.addAttributes(productId, attributes, (attrErr, attrResult) => {
                            if (attrErr) {
                                console.error("Attributes Insert Error:", attrErr);
                                return res.status(500).json({ success: false, message: 'Error adding attributes', error: attrErr });
                            }

                            res.status(201).json({
                                success: true,
                                message: 'Product created successfully',
                                product_id: productId,
                                gallery_images: imageResult,
                                attributes: attrResult
                            });
                        });
                    } else {
                        res.status(201).json({
                            success: true,
                            message: 'Product created successfully',
                            product_id: productId,
                            gallery_images: imageResult
                        });
                    }
                });
            }
        );
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: 'Server error', error });
    }
};



// Get product by ID
const getProductById = (req, res) => {
    const {id} = req.body;
    const productId = id;

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
    const { id, name, description, price, category, sub_category, stock, manufacturer_details, title, subtitle, size, fast_delivery_available, status } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }
    let attributes = req.body.attributes;
    if (typeof attributes === "string") {
        try {
            attributes = JSON.parse(attributes);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid attributes format" });
        }
    }
    Product.findById(id, (findErr, existingProduct) => {
        if (findErr || !existingProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const updatedData = {
            name, description,price,category,sub_category,stock,manufacturer_details,title,subtitle,size,fast_delivery_available
        };

        if (status !== undefined) {
            updatedData.status = parseInt(status, 10);
        }

        if (req.files?.['featuredImage']?.length > 0) {
            const newFeaturedImagePath = req.files['featuredImage'][0].path;

            if (existingProduct.featured_image) {
                fs.unlink(path.join(__dirname, '..', existingProduct.featured_image), (err) => {
                    if (err) console.error("Error deleting old featured image:", err);
                });
            }

            updatedData.featured_image = newFeaturedImagePath;
        }

        const newGalleryImages = req.files?.['galleryImages']?.map(file => file.path) || [];

        Product.updateById(id, updatedData, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating product', error: err });
            }

            if (attributes && Array.isArray(attributes)) {
                console.log("hi");
                const deleteQuery = `DELETE FROM product_attributes WHERE product_id = ?`;
                db.query(deleteQuery, [id], (deleteErr) => {
                    if (deleteErr) {
                        return res.status(500).json({ success: false, message: 'Error deleting old attributes', error: deleteErr });
                    }

                    Product.addAttributes(id, attributes, (insertErr) => {
                        if (insertErr) {
                            return res.status(500).json({ success: false, message: 'Error inserting new attributes', error: insertErr });
                        }

                        if (newGalleryImages.length > 0) {
                            GalleryImage.findByProductId(id, (galleryErr, existingGallery) => {
                                if (!galleryErr && existingGallery.length > 0) {
                                    existingGallery.forEach(img => {
                                        fs.unlink(path.join(__dirname, '..', img.image_path), (err) => {
                                            if (err) console.error("Error deleting gallery image:", err);
                                        });
                                    });

                                    GalleryImage.deleteByProductId(id, (deleteErr) => {
                                        if (deleteErr) {
                                            return res.status(500).json({ success: false, message: 'Error clearing old gallery images', error: deleteErr });
                                        }

                                        GalleryImage.create(id, newGalleryImages, (createErr) => {
                                            if (createErr) {
                                                return res.status(500).json({ success: false, message: 'Error updating gallery images', error: createErr });
                                            }

                                            Product.findById(id, (findErr, updatedProduct) => {
                                                if (findErr) {
                                                    return res.status(500).json({ success: false, message: 'Error fetching updated product', error: findErr });
                                                }
                                                res.status(200).json({
                                                    success: true,
                                                    message: 'Product and attributes updated successfully',
                                                    product: updatedProduct
                                                });
                                            });
                                        });
                                    });
                                }
                            });
                        } else {
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
                });
            } else {
                if (newGalleryImages.length > 0) {
                    GalleryImage.findByProductId(id, (galleryErr, existingGallery) => {
                        if (!galleryErr && existingGallery.length > 0) {
                            existingGallery.forEach(img => {
                                fs.unlink(path.join(__dirname, '..', img.image_path), (err) => {
                                    if (err) console.error("Error deleting gallery image:", err);
                                });
                            });

                            GalleryImage.deleteByProductId(id, (deleteErr) => {
                                if (deleteErr) {
                                    return res.status(500).json({ success: false, message: 'Error clearing old gallery images', error: deleteErr });
                                }

                                GalleryImage.create(id, newGalleryImages, (createErr) => {
                                    if (createErr) {
                                        return res.status(500).json({ success: false, message: 'Error updating gallery images', error: createErr });
                                    }

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
                                });
                            });
                        }
                    });
                } else {
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
            }
        });
    });
};




// Delete product by ID
const deleteProductById = (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    // Fetch product details before deletion
    Product.findById(id, (findErr, product) => {
        if (findErr || !product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        // Delete the featured image
        if (product.featured_image) {
            fs.unlink(path.join(__dirname, '..', product.featured_image), (err) => {
                if (err) console.error("Error deleting featured image:", err);
            });
        }

        // Delete associated gallery images
        GalleryImage.findByProductId(id, (galleryErr, galleryImages) => {
            if (!galleryErr && galleryImages.length > 0) {
                galleryImages.forEach(img => {
                    fs.unlink(path.join(__dirname, '..', img.image_path), (err) => {
                        if (err) console.error("Error deleting gallery image:", err);
                    });
                });

                // Delete gallery images from database
                GalleryImage.deleteByProductId(id, (deleteErr) => {
                    if (deleteErr) {
                        return res.status(500).json({ success: false, message: 'Error deleting gallery images', error: deleteErr });
                    }
                });
            }

            // Now delete the product
            Product.deleteById(id, (err, result) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error deleting product', error: err });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'Product not found.' });
                }
                res.status(200).json({ success: true, message: 'Product and associated images deleted successfully.' });
            });
        });
    });
};
const setProductFeatured = (req, res) => {
    const { id, is_featured } = req.body;

    if (!id || is_featured === undefined) {
        return res.status(400).json({ success: false, message: 'Product ID and is_featured status are required' });
    }

    Product.setFeatured(id, is_featured, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating featured status', error: err });
        }
        res.status(200).json({ success: true, message: 'Product featured status updated successfully' });
    });
};
const setProductTodayDeal = (req, res) => {
    const { id, is_today_deal } = req.body;

    if (!id || is_today_deal === undefined) {
        return res.status(400).json({ success: false, message: 'Product ID and is_today_deal status are required' });
    }

    Product.setTodayDeal(id, is_today_deal, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating today deal status', error: err });
        }
        res.status(200).json({ success: true, message: 'Product today deal status updated successfully' });
    });
};
// Get all Featured Products
const getFeaturedProducts = (req, res) => {
    Product.getFeatured((err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching featured products', error: err });
        }
        res.status(200).json({ success: true, data: results });
    });
};

// Get all Today's Deal Products
const getTodayDealProducts = (req, res) => {
    Product.getTodayDeal((err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching today’s deal products', error: err });
        }
        res.status(200).json({ success: true, data: results });
    });
};

const getproductbycatgeoryID = (req, res) => {
    const { catID } = req.body; // Get catID from request body

    if (!catID) {
        return res.status(400).json({ success: false, message: 'Category ID is required' });
    }

    Product.getbycategory(catID, (err, results) => { // ✅ Pass catID as argument
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching products by category', error: err });
        }
        res.status(200).json({ success: true, data: results });
    });
};




// Export multer upload as a middleware and role check as well
module.exports = {
    uploadFields,
    createProduct,
    getProductById,
    updateProductById,
    deleteProductById,
    getProducts,
    setProductFeatured,
    setProductTodayDeal,
    getTodayDealProducts,
    getFeaturedProducts,
    getproductbycatgeoryID
};
