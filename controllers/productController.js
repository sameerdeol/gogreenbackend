const Product = require('../models/productModel');
const GalleryImage = require('../models/galleryImage');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const {extractUpdatedData, handleFeaturedImage} = require('../utils/productUtils'); // Import Multer setup
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Create a new product
const createProduct = (req, res) => {
    try {
        let { vendor_id, name, description, price, category, sub_category,
            stock, manufacturer_details, title, subtitle, size, fast_delivery_available, 
            feature_title, feature_description, product_brand, nutritional_facts , ingredients , miscellaneous 
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
            vendor_id, name, description, price, category, sub_category, stock, featuredImage, manufacturer_details, title, subtitle, size, fast_delivery_available, feature_title, feature_description, product_brand,nutritional_facts, miscellaneous,ingredients,  
            (err, productResult) => {
                if (err) {
                    console.error("Database Error:", err);
                    return res.status(500).json({ success: false, message: 'Error creating product', error: err });
                }

                const productId = productResult.insertId;

                // Function to finalize the response
                const finalizeResponse = (galleryResponse = null, attrResponse = null) => {
                    res.status(201).json({
                        success: true,
                        message: 'Product created successfully',
                        product_id: productId,
                        gallery_images: galleryResponse,
                        attributes: attrResponse
                    });
                };

                // Check if gallery images exist before inserting
                if (galleryImages.length > 0) {
                    GalleryImage.create(productId, galleryImages, (imageErr, imageResult) => {
                        if (imageErr) {
                            console.error("Gallery Image Error:", imageErr);
                            return res.status(500).json({ success: false, message: 'Error adding gallery images', error: imageErr });
                        }

                        // Insert attributes if available
                        if (attributes.length > 0) {
                            Product.addAttributes(productId, attributes, (attrErr, attrResult) => {
                                if (attrErr) {
                                    console.error("Attributes Insert Error:", attrErr);
                                    return res.status(500).json({ success: false, message: 'Error adding attributes', error: attrErr });
                                }
                                finalizeResponse(imageResult, attrResult);
                            });
                        } else {
                            finalizeResponse(imageResult);
                        }
                    });
                } else {
                    // If no gallery images, directly insert attributes or respond
                    if (attributes.length > 0) {
                        Product.addAttributes(productId, attributes, (attrErr, attrResult) => {
                            if (attrErr) {
                                console.error("Attributes Insert Error:", attrErr);
                                return res.status(500).json({ success: false, message: 'Error adding attributes', error: attrErr });
                            }
                            finalizeResponse(null, attrResult);
                        });
                    } else {
                        finalizeResponse();
                    }
                }
            }
        );
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: 'Server error', error });
    }
};

// Get product by ID
const getProductById = (req, res) => {
    const {id,userID} = req.body;
    const productId = id;

    Product.findById(productId,userID, (err, product) => {
        if (err || !product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, product });
    });
};


// Get product by VendorID
const getallproductsbyvendorID = (req, res) => {
    const {vendor_id} = req.body;

    Product.findallByVendorId(vendor_id, (err, product) => {
        if (err || !product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, product });
    });
};


const getsingleproductsbyvendorID = (req, res) => {
    const {id,vendor_id} = req.body;
    const productId = id;

    Product.findSingleByVendorId(productId,vendor_id, (err, product) => {
        if (err || !product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, product });
    });
};



const getProducts = (req, res) => {
    const { userID } = req.body;
    Product.find(userID,(err, products) => {
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
    const { id, vendor_id } = req.body;

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

    Product.findById(id, vendor_id, (findErr, existingProduct) => {
        if (findErr || !existingProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const updatedData = extractUpdatedData(req.body);
        handleFeaturedImage(req, existingProduct, updatedData);

        const newGalleryImages = req.files?.['galleryImages']?.map(file => file.path) || [];

        Product.updateById(id, updatedData, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating product', error: err });
            }

            const handleAttributes = (cb) => {
                if (attributes && Array.isArray(attributes)) {
                    db.query(`DELETE FROM product_attributes WHERE product_id = ?`, [id], (deleteErr) => {
                        if (deleteErr) return cb(deleteErr);
                        Product.addAttributes(id, attributes, cb);
                    });
                } else cb(null);
            };

            const handleGallery = (cb) => {
                if (newGalleryImages.length > 0) {
                    GalleryImage.findByProductId(id, (galleryErr, existingGallery) => {
                        if (galleryErr) return cb(galleryErr);

                        existingGallery.forEach(img => {
                            fs.unlink(path.join(__dirname, '..', img.image_path), (err) => {
                                if (err) console.error("Error deleting gallery image:", err);
                            });
                        });

                        GalleryImage.deleteByProductId(id, (deleteErr) => {
                            if (deleteErr) return cb(deleteErr);
                            GalleryImage.create(id, newGalleryImages, cb);
                        });
                    });
                } else cb(null);
            };

            handleAttributes((attrErr) => {
                if (attrErr) {
                    return res.status(500).json({ success: false, message: 'Error updating attributes', error: attrErr });
                }

                handleGallery((galleryErr) => {
                    if (galleryErr) {
                        return res.status(500).json({ success: false, message: 'Error updating gallery images', error: galleryErr });
                    }

                    // ✅ Fetch and return full updated product
                    Product.findById(id, vendor_id, (findErr, updatedProduct) => {
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
        });
    });
};





// Delete product by ID
const deleteProductById = (req, res) => {
    const { id,user_id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    // Fetch product details before deletion
    Product.findById(id,user_id, (findErr, product) => {
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
const getProductsByType = (req, res) => {
    const { userID, type } = req.body; // `type` should be 'featured' or 'today_deal'

    if (!type || (type !== 'featured' && type !== 'today_deal')) {
        return res.status(400).json({ success: false, message: 'Invalid product type' });
    }

    Product.getByType(userID, type, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: `Error fetching ${type} products`, error: err });
        }
        res.status(200).json({ success: true, data: results });
    });
};
const getproductbycatgeoryID = (req, res) => {
    const { catID, userID, subcatID } = req.body; // Get IDs from request body

    if (!catID && !subcatID) {
        return res.status(400).json({ success: false, message: 'Category ID or Subcategory ID is required' });
    }

    Product.getbycategory(userID, catID, subcatID, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching products', error: err });
        }
        res.status(200).json({ success: true, data: results });
    });
};

const getproductbycatvenID = (req, res) => {
    const { catID, userID, subcatID,vendor_id } = req.body; // Get IDs from request body
    if (!vendor_id) {
        return res.status(400).json({ success: false, message: 'vendor_id is required' });
    }
    if (!catID && !subcatID) {
        return res.status(400).json({ success: false, message: 'Category ID or Subcategory ID is required' });
    }

    Product.getbyvencategory(userID, catID, subcatID,vendor_id, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching products', error: err });
        }
        res.status(200).json({ success: true, data: results });
    });
};

const getproductbybrandID = (req, res) => {
    const { brandID, userID } = req.body; // Get IDs from request body

    if (!brandID) {
        return res.status(400).json({ success: false, message: 'Brand ID is required' });
    }

    Product.getbybrandID(userID, brandID, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching products', error: err });
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
    getProductsByType,
    getproductbycatgeoryID,
    getallproductsbyvendorID,
    getsingleproductsbyvendorID,
    getproductbycatvenID,
    getproductbybrandID
};
