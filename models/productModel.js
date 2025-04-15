const db = require('../config/db');
const sqlString = require('sqlstring');
const fs = require('fs');
const path = require('path');

const Product = {
    create: (vendor_id, name, description, price, category, sub_category, stock, featured_image, manufacturer_details, title, subtitle, size, fast_delivery_available,feature_title, feature_description,product_brand,nutritional_facts, miscellaneous,ingredients, callback) => {
            featured_image = featured_image && typeof featured_image === 'string' ? featured_image : null;
    
            const query = sqlString.format(
                `INSERT INTO products 
                (vendor_id, name, description, price, category_id, sub_category, stock, featured_image, manufacturer_details, title, subtitle, size, fast_delivery_available,feature_title, feature_description, brand_id, nutritional_facts, miscellaneous, ingredients) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [   vendor_id,
                    String(name),
                    String(description),
                    parseFloat(price) || 0,
                    parseInt(category, 10) || null,
                    sub_category ? parseInt(sub_category, 10) : null,
                    parseInt(stock, 10) || 0,
                    featured_image,
                    String(manufacturer_details),
                    String(title),
                    String(subtitle),
                    size,
                    fast_delivery_available,
                    feature_title,
                    feature_description,
                    product_brand,
                    nutritional_facts,
                    miscellaneous,
                    ingredients
                ]
            );
    
            db.query(query, callback);
        },
    
        addAttributes: (productId, attributeValues, callback) => {
            if (attributeValues.length === 0) return callback(null);
        
            // Ensure attributeValues is mapped correctly
            const values = attributeValues.map(attr => [productId, attr.key, attr.value]);
        
            const query = `INSERT INTO product_attributes (product_id, attribute_key, attribute_value) VALUES ?`;
        
            db.query(query, [values], callback);
        },

        findById: (id, userID, callback) => {
            // Base query
            const query = `
                SELECT 
                    p.*, 
                    c.name AS category_name, 
                    s.name AS sub_category_name, 
                    b.name AS brand_name, 
                    b.categoryid AS brand_categoryid, 
                    b.brand_logo AS brandlogo, 
                    b.description AS brand_description,
                    IFNULL(d.discount_percent, 0) AS discount_percent,
                    ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
                    CASE 
                        WHEN f.product_id IS NOT NULL THEN TRUE 
                        ELSE FALSE 
                    END AS is_favourite
                FROM products p 
                LEFT JOIN product_categories c ON p.category_id = c.id 
                LEFT JOIN product_subcategories s ON p.sub_category = s.id 
                LEFT JOIN product_brands b ON p.brand_id = b.id 
                LEFT JOIN product_discounts d ON p.id = d.product_id 
                LEFT JOIN favourite_products f 
                    ON p.id = f.product_id 
                    AND (f.user_id = ? OR ? IS NULL)
                WHERE p.id = ?;
            `;
        
            // Always include userID in values, allowing NULL handling
            const values = [userID, userID, id];
        
            db.query(query, values, (err, productResult) => {
                if (err || !productResult.length) {
                    return callback(err || "Product not found", null);
                }
        
                const product = productResult[0];
        
                // Fetch gallery images & attributes
                const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
                const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
        
                Promise.all([
                    new Promise((resolve, reject) => {
                        db.query(galleryQuery, [id], (imgErr, images) => {
                            if (imgErr) return reject(imgErr);
                            product.gallery_images = images.length ? images : []; // ✅ Ensures empty array instead of undefined
                            resolve();
                        });
                    }),
                    new Promise((resolve, reject) => {
                        db.query(attributesQuery, [id], (attrErr, attributes) => {
                            if (attrErr) return reject(attrErr);
                            product.attributes = attributes.length ? attributes : []; // ✅ Ensures empty array instead of undefined
                            resolve();
                        });
                    }),
                ])
                    .then(() => callback(null, product))
                    .catch((error) => callback(error, null)); // ✅ Ensures error is returned in callback
            });
        },
         
    

    // Get all products (Optimized with Promise.all) Find All Products (Include Attributes and Gallery)
    find: (userID, callback) => {
        const query = `
            SELECT 
                p.*, 
                c.name AS category_name, 
                s.name AS sub_category_name, 
                b.name AS brand_name, 
                b.categoryid AS brand_categoryid, 
                b.brand_logo AS brandlogo, 
                b.description AS brand_description, 
                IFNULL(d.discount_percent, 0) AS discount_percent,
                ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
                CASE 
                    WHEN f.product_id IS NOT NULL THEN TRUE 
                    ELSE FALSE 
                END AS is_favourite 
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.id 
            LEFT JOIN product_subcategories s ON p.sub_category = s.id 
            LEFT JOIN product_brands b ON p.brand_id = b.id 
            LEFT JOIN product_discounts d ON p.id = d.product_id
            LEFT JOIN favourite_products f 
                ON p.id = f.product_id
                AND f.user_id = ?;
        `;   
    
        db.query(query, [userID], (err, results) => { // ✅ Fixed extra `userID`
            if (err) {
                return callback(err, null);
            }
    
            const productPromises = results.map((product) => {
                return new Promise((resolve, reject) => {
                    const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
                    const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
    
                    Promise.all([
                        new Promise((resolveGallery, rejectGallery) => {
                            db.query(galleryQuery, [product.id], (imgErr, images) => {
                                if (imgErr) rejectGallery(imgErr);
                                product.gallery_images = images.length ? images : []; // ✅ Ensure empty array
                                resolveGallery();
                            });
                        }),
                        new Promise((resolveAttributes, rejectAttributes) => {
                            db.query(attributesQuery, [product.id], (attrErr, attributes) => {
                                if (attrErr) rejectAttributes(attrErr);
                                product.attributes = attributes.length ? attributes : []; // ✅ Ensure empty array
                                resolveAttributes();
                            });
                        }),
                    ])
                        .then(() => resolve(product))
                        .catch((error) => reject(error));
                });
            });
    
            Promise.all(productPromises)
                .then((productsWithImages) => callback(null, productsWithImages))
                .catch((error) => callback(error, null));
        });
    },
    
    
    // Update a product by ID (Includes sub_category)
    updateById: (id, updateData, callback) => {
        if (!id) return callback('Product ID is required.', null);
    
        const fields = [];
        const values = [];
    
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        });
    
        // Ensure we don't create an invalid SQL query
        if (fields.length === 0) {
            return callback('No valid fields provided for update.', null);
        }
    
        // Automatically update `updated_at` timestamp
        fields.push('updated_at = CURRENT_TIMESTAMP');
    
        // Add ID at the end for the WHERE clause
        values.push(id);
    
        const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    
        db.query(query, values, (err, result) => {
            if (err) {
                return callback('Database error while updating product.', null);
            }
            if (result.affectedRows === 0) {
                return callback('Product not found or no changes made.', null);
            }
            callback(null, result);
        });
    },
    

    // Delete a product by ID
    deleteById: (id, callback) => {
        const query = 'DELETE FROM products WHERE id = ?';
        db.query(query, [id], callback);
    },

    // Get all products (Optimized duplicate function)
    findAll: (callback) => {
        Product.find(callback);  // Uses the same optimized `find()` function
    },
    
    setFeatured: (id, isFeatured, callback) => {
        const sql = `UPDATE products SET is_featured = ? WHERE id = ?`;
        db.query(sql, [isFeatured, id], callback);
    },

    setTodayDeal: (id, isTodayDeal, callback) => {
        const sql = `UPDATE products SET is_today_deal = ? WHERE id = ?`;
        db.query(sql, [isTodayDeal, id], callback);
    },
  
    getByType: (userId, type, callback) => {
        const filterColumn = type === 'featured' ? 'p.is_featured' : 'p.is_today_deal';
    
        const sql = `
        SELECT 
            p.*, 
            c.name AS category_name, 
            s.name AS sub_category_name, 
            b.name AS brand_name, 
            b.categoryid AS brand_categoryid, 
            b.brand_logo AS brandlogo, 
            b.description AS brand_description, 
            IFNULL(d.discount_percent, 0) AS discount_percent,
            ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
            CASE 
                WHEN f.product_id IS NOT NULL THEN TRUE 
                ELSE FALSE 
            END AS is_favourite 
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        LEFT JOIN product_subcategories s ON p.sub_category = s.id
        LEFT JOIN product_brands b ON p.brand_id = b.id
        LEFT JOIN product_discounts d ON p.id = d.product_id
        LEFT JOIN favourite_products f 
            ON p.id = f.product_id 
            AND f.user_id = ? 
        WHERE ${filterColumn} = TRUE;
    `; 
        db.query(sql, [userId], callback); // ✅ Fixed parameter count
    },

    getbycategory: (userId, categoryId, subcategoryId, callback) => {
        let filterColumn = categoryId ? "p.category_id" : "p.sub_category";
        let filterValue = categoryId || subcategoryId; // Use whichever ID is available
    
        const sql = `
            SELECT 
                p.*, 
                c.name AS category_name, 
                s.name AS sub_category_name, 
                b.name AS brand_name, 
                b.categoryid AS brand_categoryid, 
                b.brand_logo AS brandlogo, 
                b.description AS brand_description, 
                IFNULL(d.discount_percent, 0) AS discount_percent,
                ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
                CASE 
                    WHEN f.product_id IS NOT NULL THEN TRUE 
                    ELSE FALSE 
                END AS is_favourite 
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
            LEFT JOIN product_brands b ON p.brand_id = b.id
            LEFT JOIN product_discounts d ON p.id = d.product_id
            LEFT JOIN favourite_products f 
                ON p.id = f.product_id 
                AND f.user_id = ?
            WHERE ${filterColumn} = ?;
        `;
    
        db.query(sql, [userId, filterValue], callback);
    },

    getbybrandID: (userId,brandID, callback) => {
    
        const sql = `
            SELECT 
                p.*, 
                c.name AS category_name, 
                s.name AS sub_category_name, 
                b.name AS brand_name, 
                b.categoryid AS brand_categoryid, 
                b.brand_logo AS brandlogo, 
                b.description AS brand_description, 
                IFNULL(d.discount_percent, 0) AS discount_percent,
                ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
                CASE 
                    WHEN f.product_id IS NOT NULL THEN TRUE 
                    ELSE FALSE 
                END AS is_favourite 
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
            LEFT JOIN product_brands b ON p.brand_id = b.id
            LEFT JOIN product_discounts d ON p.id = d.product_id
            LEFT JOIN favourite_products f 
                ON p.id = f.product_id 
                AND f.user_id = ?
            WHERE brand_id = ?;
        `;
        db.query(sql, [userId, brandID], callback);
    },

    getbyvencategory: (userId, categoryId, subcategoryId,vendor_id, callback) => {
        let filterColumn = categoryId ? "p.category_id" : "p.sub_category";
        let filterValue = categoryId || subcategoryId; // Use whichever ID is available
    
        const sql = `
            SELECT 
                p.*, 
                c.name AS category_name, 
                s.name AS sub_category_name, 
                b.name AS brand_name, 
                b.categoryid AS brand_categoryid, 
                b.brand_logo AS brandlogo, 
                b.description AS brand_description, 
                IFNULL(d.discount_percent, 0) AS discount_percent,
                ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
                d.updated_at AS discount_updated_at,
                CASE 
                    WHEN f.product_id IS NOT NULL THEN TRUE 
                    ELSE FALSE 
                END AS is_favourite 
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
            LEFT JOIN product_brands b ON p.brand_id = b.id
            LEFT JOIN product_discounts d ON p.id = d.product_id
            LEFT JOIN favourite_products f 
                ON p.id = f.product_id 
                AND f.user_id = ?
            WHERE ${filterColumn} = ? AND p.vendor_id = ?;
        `;
        db.query(sql, [userId, filterValue ,vendor_id], callback);
    },


    findallByVendorId: (vendorID, callback) => {
        // Base query
        const query = `
            SELECT 
                p.*, 
                c.name AS category_name, 
                s.name AS sub_category_name, 
                b.name AS brand_name, 
                b.categoryid AS brand_categoryid, 
                b.brand_logo AS brandlogo, 
                b.description AS brand_description,
                IFNULL(d.discount_percent, 0) AS discount_percent,
                ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
                d.updated_at AS discount_updated_at
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.id 
            LEFT JOIN product_subcategories s ON p.sub_category = s.id 
            LEFT JOIN product_brands b ON p.brand_id = b.id
            LEFT JOIN product_discounts d ON p.id = d.product_id
            WHERE p.vendor_id = ?;
        `;
    
    
        // Corrected `vendorID` usage
        db.query(query, [vendorID], (err, results) => {
            if (err) {
                return callback(err, null);
            }
    
            if (!results.length) {
                return callback(null, []); // Return empty array if no products found
            }
    
            const productPromises = results.map((product) => {
                return new Promise((resolve, reject) => {
                    const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
                    const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
    
                    Promise.all([
                        new Promise((resolveGallery, rejectGallery) => {
                            db.query(galleryQuery, [product.id], (imgErr, images) => {
                                if (imgErr) return rejectGallery(imgErr);
                                product.gallery_images = images || []; // ✅ Ensures empty array
                                resolveGallery();
                            });
                        }),
                        new Promise((resolveAttributes, rejectAttributes) => {
                            db.query(attributesQuery, [product.id], (attrErr, attributes) => {
                                if (attrErr) return rejectAttributes(attrErr);
                                product.attributes = attributes || []; // ✅ Ensures empty array
                                resolveAttributes();
                            });
                        }),
                    ])
                        .then(() => resolve(product))
                        .catch((error) => reject(error));
                });
            });
    
            Promise.all(productPromises)
                .then((productsWithImages) => callback(null, productsWithImages))
                .catch((error) => callback(error, null));
        });
    },    


//find single produc with vendor id
    findSingleByVendorId: (id, vendorID, callback) => {
        // Base query
        const query = `
            SELECT 
                p.*, 
                c.name AS category_name, 
                s.name AS sub_category_name, 
                b.name AS brand_name, 
                b.categoryid AS brand_categoryid, 
                b.brand_logo AS brandlogo, 
                b.description AS brand_description,
                IFNULL(d.discount_percent, 0) AS discount_percent,
                ROUND(p.price - (p.price * IFNULL(d.discount_percent, 0) / 100), 2) AS discounted_value,
                d.updated_at AS discount_updated_at
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.id 
            LEFT JOIN product_subcategories s ON p.sub_category = s.id 
            LEFT JOIN product_brands b ON p.brand_id = b.id 
            LEFT JOIN product_discounts d ON p.id = d.product_id
            WHERE p.id = ? AND p.vendor_id = ?;
        `;
    
    
        const values = [id, vendorID];
    
        db.query(query, values, (err, productResult) => {
            if (err || !productResult.length) {
                return callback(err || "Product not found", null);
            }
    
            const product = productResult[0];
    
            // Fetch gallery images & attributes
            const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
            const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
    
            Promise.all([
                new Promise((resolve, reject) => {
                    db.query(galleryQuery, [id], (imgErr, images) => {
                        if (imgErr) return reject(imgErr);
                        product.gallery_images = images || []; // ✅ Ensures empty array
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(attributesQuery, [id], (attrErr, attributes) => {
                        if (attrErr) return reject(attrErr);
                        product.attributes = attributes || []; // ✅ Ensures empty array
                        resolve();
                    });
                }),
            ])
                .then(() => callback(null, product))
                .catch((error) => callback(error, null)); // ✅ Ensures error is returned in callback
        });
    },



    findByIdupdate:  (id, userID) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM products WHERE id = ? AND userID = ?`;
            db.query(query, [id, userID], (err, results) => {
                if (err || results.length === 0) return reject("Product not found");
                resolve(results[0]);
            });
        });
    },

    updateById: (id, updatedData) => {
        return new Promise((resolve, reject) => {
            const query = `UPDATE products SET ? WHERE id = ?`;
            db.query(query, [updatedData, id], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    },

    addAttributes: (productId, attributes) => {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO product_attributes (product_id, name, value) VALUES ?`;
            const values = attributes.map(attr => [productId, attr.name, attr.value]);
            db.query(query, [values], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    },

    updateByIdAndReturn: async (id, userID, data, files, attributes) => {
        const existingProduct = await Product.findById(id, userID);

        const updatedData = {
            name: data.name,
            description: data.description,
            price: data.price,
            category_id: data.category_id,
            sub_category: data.sub_category,
            stock: data.stock,
            manufacturer_details: data.manufacturer_details,
            title: data.title,
            subtitle: data.subtitle,
            size: data.size,
            fast_delivery_available: data.fast_delivery_available,
            feature_title: data.feature_title,
            feature_description: data.feature_description,
            brand_id: data.brand_id,
            nutritional_facts: data.nutritional_facts,
            miscellaneous: data.miscellaneous,
            ingredients: data.ingredients,
        };

        if (data.status !== undefined) {
            updatedData.status = parseInt(data.status, 10);
        }

        // Handle featured image update
        if (files?.['featuredImage']?.length > 0) {
            const newPath = files['featuredImage'][0].path;
            if (existingProduct.featured_image) {
                fs.unlink(path.join(__dirname, '..', existingProduct.featured_image), () => {});
            }
            updatedData.featured_image = newPath;
        }

        // Update product
        await Product.updateById(id, updatedData);

        // Handle attributes update
        if (attributes && Array.isArray(attributes)) {
            await new Promise((resolve, reject) => {
                const deleteQuery = `DELETE FROM product_attributes WHERE product_id = ?`;
                db.query(deleteQuery, [id], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
            await Product.addAttributes(id, attributes);
        }

        // Handle gallery images
        const galleryImages = files?.['galleryImages']?.map(file => file.path) || [];
        if (galleryImages.length > 0) {
            const existingGallery = await GalleryImage.findByProductId(id);
            for (const img of existingGallery) {
                fs.unlink(path.join(__dirname, '..', img.image_path), () => {});
            }
            await GalleryImage.deleteByProductId(id);
            await GalleryImage.create(id, galleryImages);
        }

        // Return updated product
        return new Promise((resolve, reject) => {
            db.query(`SELECT * FROM products WHERE id = ?`, [id], (err, results) => {
                if (err || results.length === 0) return reject("Failed to fetch updated product");
                resolve(results[0]);
            });
        });
    }
    
};

module.exports = Product;

