const Product = require('../models/productModel');
const ProductAddon = require('../models/ProductAddon');
const ProductVariant = require('../models/ProductVariant');
const GalleryImage = require('../models/galleryImage');
const uploadFields = require('../middleware/multerConfig'); // Import Multer setup
const {extractUpdatedData, handleFeaturedImage} = require('../utils/productUtils'); // Import Multer setup
const deleteS3Image = require('../utils/deleteS3Image');
const uploadToS3 = require('../utils/s3Upload');
const db = require('../config/db');

// Create a new product
const createProduct = async (req, res) => { 
    try {
        let { vendor_id, name, description, price, category, sub_category,
            stock, manufacturer_details, title, subtitle, size, fast_delivery_available, 
            feature_title, feature_description, product_brand, nutritional_facts , ingredients , miscellaneous 
        } = req.body;

        // Parse variants
        let variants = [];
        if (req.body.variants) {
            try {
                variants = JSON.parse(req.body.variants); // [{type, value, price}]
            } catch (error) {
                return res.status(400).json({ success: false, message: 'Invalid variants format' });
            }
        }

        // Parse addons
        let addons = [];
        if (req.body.addons) {
            try {
                addons = JSON.parse(req.body.addons); // [{name, price}]
            } catch (error) {
                return res.status(400).json({ success: false, message: 'Invalid addons format' });
            }
        }

        // Convert numeric values safely
        price = parseFloat(price) || 0;
        stock = parseInt(stock, 10) || 0;
        size = parseFloat(size) || 0;
        sub_category = sub_category && !isNaN(sub_category) ? parseInt(sub_category, 10) : null;

        // Parse attributes
        let attributes = [];
        if (req.body.attributes) {
            try {
                attributes = JSON.parse(req.body.attributes);
            } catch (error) {
                return res.status(400).json({ success: false, message: 'Invalid attributes format' });
            }
        }

        // Handle file uploads
        let featuredImage = null;
        if (req.files['featuredImage']) {
            const file = req.files['featuredImage'][0];
            featuredImage = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
        }

        let galleryImages = [];
        if (req.files['galleryImages']) {
            for (const file of req.files['galleryImages']) {
                const url = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
                galleryImages.push(url);
            }
        }

        // Insert product into MySQL
        Product.create(
            vendor_id, name, description, price, category, sub_category, stock, featuredImage, manufacturer_details,
            title, subtitle, size, fast_delivery_available, feature_title, feature_description, product_brand,
            nutritional_facts, miscellaneous, ingredients,
            (err, productResult) => {
                if (err) {
                    console.error("Database Error:", err);
                    return res.status(500).json({ success: false, message: 'Error creating product', error: err });
                }

                const productId = productResult.insertId;

                // Insert gallery images
                const insertGallery = (callback) => {
                    if (galleryImages.length > 0) {
                        GalleryImage.create(productId, galleryImages, (imageErr, imageResult) => {
                            if (imageErr) {
                                console.error("Gallery Image Error:", imageErr);
                                return res.status(500).json({ success: false, message: 'Error adding gallery images', error: imageErr });
                            }
                            callback(null, imageResult);
                        });
                    } else {
                        callback(null, null);
                    }
                };

                // Insert attributes
                const insertAttributes = (callback) => {
                    if (attributes.length > 0) {
                        Product.addAttributes(productId, attributes, (attrErr, attrResult) => {
                            if (attrErr) {
                                console.error("Attributes Insert Error:", attrErr);
                                return res.status(500).json({ success: false, message: 'Error adding attributes', error: attrErr });
                            }
                            callback(null, attrResult);
                        });
                    } else {
                        callback(null, null);
                    }
                };

                // Insert variants
                const insertVariants = (callback) => {
                    if (variants.length > 0) {
                        ProductVariant.create(productId, variants, (variantErr, variantResult) => {
                            if (variantErr) {
                                console.error("Variants Insert Error:", variantErr);
                                return res.status(500).json({ success: false, message: 'Error adding variants', error: variantErr });
                            }
                            callback(null, variantResult);
                        });
                    } else {
                        callback(null, null);
                    }
                };

                // Insert addons
                const insertAddons = (callback) => {
                    if (addons.length > 0) {
                        ProductAddon.create(productId, addons, (addonErr, addonResult) => {
                            if (addonErr) {
                                console.error("Addons Insert Error:", addonErr);
                                return res.status(500).json({ success: false, message: 'Error adding addons', error: addonErr });
                            }
                            callback(null, addonResult);
                        });
                    } else {
                        callback(null, null);
                    }
                };

                // Finalize response
                const finalizeResponse = (galleryResult, attrResult, variantResult, addonResult) => {
                    res.status(201).json({
                        success: true,
                        message: 'Product created successfully',
                        product_id: productId,
                        gallery_images: galleryResult,
                        attributes: attrResult,
                        variants: variantResult,
                        addons: addonResult
                    });
                };

                // Run all inserts sequentially
                insertGallery((_, galleryResult) => {
                    insertAttributes((_, attrResult) => {
                        insertVariants((_, variantResult) => {
                            insertAddons((_, addonResult) => {
                                finalizeResponse(galleryResult, attrResult, variantResult, addonResult);
                            });
                        });
                    });
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
    const {vendor_id, searchTerm} = req.body;

    Product.findallByVendorId(vendor_id,searchTerm, (err, product) => {
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
const updateProductById = async (req, res) => {
    const { id, vendor_id, existingGalleryImages = [] } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    // Parse attributes
    let attributes = req.body.attributes;
    if (typeof attributes === "string") {
        try {
            attributes = JSON.parse(attributes);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid attributes format" });
        }
    }

    // Parse variants
    let variants = req.body.variants;
    if (typeof variants === "string") {
        try {
            variants = JSON.parse(variants);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid variants format" });
        }
    }

    // Parse addons
    let addons = req.body.addons;
    if (typeof addons === "string") {
        try {
            addons = JSON.parse(addons);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid addons format" });
        }
    }

    Product.findById(id, vendor_id, async (findErr, existingProduct) => {
        if (findErr || !existingProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const updatedData = extractUpdatedData(req.body);

        // Handle featured image update
        if (req.files['featuredImage']) {
            const file = req.files['featuredImage'][0];
            const newFeaturedImage = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
            updatedData.featured_image = newFeaturedImage;
            if (existingProduct.featured_image) {
                await deleteS3Image(existingProduct.featured_image);
            }
        }

        // Handle gallery images update
        let newGalleryImages = [];
        if (req.files['galleryImages']) {
            for (const file of req.files['galleryImages']) {
                const url = await uploadToS3(file.buffer, file.originalname, file.fieldname, file.mimetype);
                newGalleryImages.push(url);
            }
        }

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

            const handleVariants = (cb) => {
                if (variants && Array.isArray(variants)) {
                    db.query(`DELETE FROM product_variants WHERE product_id = ?`, [id], (deleteErr) => {
                        if (deleteErr) return cb(deleteErr);
                        ProductVariant.create(id, variants, cb);
                    });
                } else cb(null);
            };

            const handleAddons = (cb) => {
                if (addons && Array.isArray(addons)) {
                    db.query(`DELETE FROM product_addons WHERE product_id = ?`, [id], (deleteErr) => {
                        if (deleteErr) return cb(deleteErr);
                        ProductAddon.create(id, addons, cb);
                    });
                } else cb(null);
            };

            const handleGallery = (cb) => {
                if (newGalleryImages.length > 0 || existingGalleryImages.length > 0) {
                    GalleryImage.findByProductId(id, async (galleryErr, existingGallery) => {
                        if (galleryErr) return cb(galleryErr);

                        const imagesToDelete = existingGallery.filter(img => !existingGalleryImages.includes(img.image_path));

                        for (const img of imagesToDelete) {
                            await deleteS3Image(img.image_path);
                        }

                        GalleryImage.deleteByProductId(id, (deleteErr) => {
                            if (deleteErr) return cb(deleteErr);

                            const finalGallery = [...existingGalleryImages, ...newGalleryImages];
                            GalleryImage.create(id, finalGallery, cb);
                        });
                    });
                } else cb(null);
            };

            handleAttributes((attrErr) => {
                if (attrErr) {
                    return res.status(500).json({ success: false, message: 'Error updating attributes', error: attrErr });
                }

                handleVariants((variantErr) => {
                    if (variantErr) {
                        return res.status(500).json({ success: false, message: 'Error updating variants', error: variantErr });
                    }

                    handleAddons((addonErr) => {
                        if (addonErr) {
                            return res.status(500).json({ success: false, message: 'Error updating addons', error: addonErr });
                        }

                        handleGallery((galleryErr) => {
                            if (galleryErr) {
                                return res.status(500).json({ success: false, message: 'Error updating gallery images', error: galleryErr });
                            }

                            // ✅ Return full updated product
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
        });
    });
};



// Delete product by ID
const deleteProductById = async (req, res) => {
    const { id, user_id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    // Fetch product details before deletion
    Product.findById(id, user_id, async (findErr, product) => {
        if (findErr || !product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        // Delete the featured image
        if (product.featured_image) {
            await deleteS3Image(product.featured_image);
        }

        // Delete associated gallery images
        GalleryImage.findByProductId(id, async (galleryErr, galleryImages) => {
            if (!galleryErr && galleryImages.length > 0) {
                for (const img of galleryImages) {
                    await deleteS3Image(img.image_path);
                }
                // Delete gallery images from database
                GalleryImage.deleteByProductId(id, (deleteErr) => {
                    if (deleteErr) {
                        return res.status(500).json({ success: false, message: 'Error deleting gallery images', error: deleteErr });
                    }
                });
            }

            // Delete associated variants
            ProductVariant.deleteByProductId(id, (variantErr) => {
                if (variantErr) {
                    return res.status(500).json({ success: false, message: 'Error deleting product variants', error: variantErr });
                }

                // Delete associated addons
                ProductAddon.deleteByProductId(id, (addonErr) => {
                    if (addonErr) {
                        return res.status(500).json({ success: false, message: 'Error deleting product addons', error: addonErr });
                    }

                    // Now delete the product
                    Product.deleteById(id, (err, result) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: 'Error deleting product', error: err });
                        }
                        if (result.affectedRows === 0) {
                            return res.status(404).json({ success: false, message: 'Product not found.' });
                        }
                        res.status(200).json({ success: true, message: 'Product and associated data deleted successfully.' });
                    });
                });
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


const bestSellProducts = (req, res) => {
    const {user_id} = req.body;

    Product.findBestSell(user_id, (err, product) => {
        if (err || !product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, product });
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
    getproductbybrandID,
    bestSellProducts
};
