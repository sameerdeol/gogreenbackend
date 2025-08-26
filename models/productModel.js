const db = require('../config/db');
const sqlString = require('sqlstring');

const Product = {
    create: (
            vendor_id, name, description, price, category, sub_category, stock, featured_image,
            manufacturer_details, title, subtitle, size, fast_delivery_available,
            feature_title, feature_description, product_brand,
            nutritional_facts, miscellaneous, ingredients,
            product_unit, product_quantity, callback
        ) => {
            featured_image = typeof featured_image === 'string' ? featured_image : null;

            const query = sqlString.format(
                `INSERT INTO products 
                (
                    vendor_id, name, description, price, category_id, sub_category, stock, featured_image,
                    manufacturer_details, title, subtitle, size, fast_delivery_available,
                    feature_title, feature_description, brand_id,
                    nutritional_facts, miscellaneous, ingredients,
                    product_unit, product_quantity
                ) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    vendor_id || null,
                    name || null,
                    description || null,
                    parseFloat(price) || 0,
                    parseInt(category, 10) || null,
                    sub_category ? parseInt(sub_category, 10) : null,
                    parseInt(stock, 10) || 0,
                    featured_image,
                    manufacturer_details || '',
                    title || '',
                    subtitle || '',
                    parseFloat(size) || 0,
                    fast_delivery_available ? 1 : 0,
                    feature_title || null,
                    feature_description || null,
                    product_brand || null,
                    nutritional_facts || null,
                    miscellaneous || null,
                    ingredients || null,
                    product_unit || null,
                    product_quantity || null
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

        const values = [userID, userID, id];

        db.query(query, values, (err, productResult) => {
            if (err || !productResult.length) {
                return callback(err || "Product not found", null);
            }

            const product = productResult[0];

            const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
            const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
            const variantsQuery = "SELECT id, type, value, price FROM product_variants WHERE product_id = ?";
            const addonsQuery = "SELECT id, name, price FROM product_addons WHERE product_id = ?";

            Promise.all([
                new Promise((resolve, reject) => {
                    db.query(galleryQuery, [id], (imgErr, images) => {
                        if (imgErr) return reject(imgErr);
                        product.gallery_images = images.length ? images : [];
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(attributesQuery, [id], (attrErr, attributes) => {
                        if (attrErr) return reject(attrErr);
                        product.attributes = attributes.length ? attributes : [];
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(variantsQuery, [id], (variantErr, variants) => {
                        if (variantErr) return reject(variantErr);
                        product.variants = variants.length ? variants : [];
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    db.query(addonsQuery, [id], (addonErr, addons) => {
                        if (addonErr) return reject(addonErr);
                        product.addons = addons.length ? addons : [];
                        resolve();
                    });
                })
            ])
            .then(() => callback(null, product))
            .catch((error) => callback(error, null));
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

        db.query(query, [userID], (err, results) => {
            if (err) {
                return callback(err, null);
            }

            const productPromises = results.map((product) => {
                return new Promise((resolve, reject) => {
                    const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
                    const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
                    const variantsQuery = "SELECT id, type, value, price FROM product_variants WHERE product_id = ?";
                    const addonsQuery = "SELECT id, name, price FROM product_addons WHERE product_id = ?";

                    Promise.all([
                        new Promise((res, rej) => {
                            db.query(galleryQuery, [product.id], (err, data) => {
                                if (err) rej(err);
                                product.gallery_images = data || [];
                                res();
                            });
                        }),
                        new Promise((res, rej) => {
                            db.query(attributesQuery, [product.id], (err, data) => {
                                if (err) rej(err);
                                product.attributes = data || [];
                                res();
                            });
                        }),
                        new Promise((res, rej) => {
                            db.query(variantsQuery, [product.id], (err, data) => {
                                if (err) rej(err);
                                product.variants = data || [];
                                res();
                            });
                        }),
                        new Promise((res, rej) => {
                            db.query(addonsQuery, [product.id], (err, data) => {
                                if (err) rej(err);
                                product.addons = data || [];
                                res();
                            });
                        }),
                    ])
                        .then(() => resolve(product))
                        .catch((error) => reject(error));
                });
            });

            Promise.all(productPromises)
                .then((productsWithDetails) => callback(null, productsWithDetails))
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


    findallByVendorId: (vendorID, searchTerm, callback) => {
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
                d.updated_at AS discount_updated_at,
                CASE 
                    WHEN ? IS NOT NULL AND p.name LIKE CONCAT('%', ?, '%') THEN 1 
                    ELSE 0 
                END AS match_priority
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.id 
            LEFT JOIN product_subcategories s ON p.sub_category = s.id 
            LEFT JOIN product_brands b ON p.brand_id = b.id
            LEFT JOIN product_discounts d ON p.id = d.product_id
            WHERE p.vendor_id = ?
            ORDER BY match_priority DESC, p.id DESC;
        `;

        db.query(query, [searchTerm, searchTerm, vendorID], (err, results) => {
            if (err) return callback(err, null);
            if (!results.length) return callback(null, []);

            const productPromises = results.map((product) => {
                return new Promise((resolve, reject) => {
                    const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
                    const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
                    const variantsQuery = "SELECT id, type, value, price FROM product_variants WHERE product_id = ?";
                    const addonsQuery = "SELECT id, name, price FROM product_addons WHERE product_id = ?";

                    Promise.all([
                        // Gallery
                        new Promise((res, rej) => {
                            db.query(galleryQuery, [product.id], (e, r) => {
                                if (e) return rej(e);
                                product.gallery_images = r || [];
                                res();
                            });
                        }),
                        // Attributes
                        new Promise((res, rej) => {
                            db.query(attributesQuery, [product.id], (e, r) => {
                                if (e) return rej(e);
                                product.attributes = r || [];
                                res();
                            });
                        }),
                        // Variants
                        new Promise((res, rej) => {
                            db.query(variantsQuery, [product.id], (e, r) => {
                                if (e) return rej(e);
                                product.variants = r || [];
                                res();
                            });
                        }),
                        // Addons
                        new Promise((res, rej) => {
                            db.query(addonsQuery, [product.id], (e, r) => {
                                if (e) return rej(e);
                                product.addons = r || [];
                                res();
                            });
                        })
                    ])
                        .then(() => resolve(product))
                        .catch((error) => reject(error));
                });
            });

            Promise.all(productPromises)
                .then((productsWithAllDetails) => callback(null, productsWithAllDetails))
                .catch((error) => callback(error, null));
        });
    },
  


//find single produc with vendor id
    findSingleByVendorId: (id, vendorID, callback) => {
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

            // Additional queries
            const galleryQuery = "SELECT image_path FROM gallery_images WHERE product_id = ?";
            const attributesQuery = "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = ?";
            const addonsQuery = "SELECT id, name, price FROM product_addons WHERE product_id = ?";
            const variantsQuery = "SELECT id, type, value, price FROM product_variants WHERE product_id = ?";

            Promise.all([
                // Gallery images
                new Promise((resolve, reject) => {
                    db.query(galleryQuery, [id], (imgErr, images) => {
                        if (imgErr) return reject(imgErr);
                        product.gallery_images = images || [];
                        resolve();
                    });
                }),

                // Attributes
                new Promise((resolve, reject) => {
                    db.query(attributesQuery, [id], (attrErr, attributes) => {
                        if (attrErr) return reject(attrErr);
                        product.attributes = attributes || [];
                        resolve();
                    });
                }),

                // Addons
                new Promise((resolve, reject) => {
                    db.query(addonsQuery, [id], (addonErr, addons) => {
                        if (addonErr) return reject(addonErr);
                        product.addons = addons || [];
                        resolve();
                    });
                }),

                // Variants
                new Promise((resolve, reject) => {
                    db.query(variantsQuery, [id], (variantErr, variants) => {
                        if (variantErr) return reject(variantErr);
                        product.variants = variants || [];
                        resolve();
                    });
                }),
            ])
                .then(() => callback(null, product))
                .catch((error) => callback(error, null));
        });
    },

    findByIdAsync : (id) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM products WHERE id = ?`;
            db.query(query, [id], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    },

    updateByIdAsync : (id, data) => {
        return new Promise((resolve, reject) => {
            const query = `UPDATE products SET ? WHERE id = ?`;
            db.query(query, [data, id], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    },
    
    replaceAttributes : (productId, attributes) => {
        return new Promise((resolve, reject) => {
            const deleteQuery = `DELETE FROM product_attributes WHERE product_id = ?`;
            db.query(deleteQuery, [productId], (delErr) => {
                if (delErr) return reject(delErr);
    
                const insertValues = attributes.map(attr => [productId, attr.key, attr.value]);
                const insertQuery = `INSERT INTO product_attributes (product_id, attribute_key, attribute_value) VALUES ?`;
                db.query(insertQuery, [insertValues], (insErr) => {
                    if (insErr) return reject(insErr);
                    resolve();
                });
            });
        });
    },

    findBestSell: (userId, callback) => {
    
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
            FROM (
                SELECT product_id
                FROM order_items
                GROUP BY product_id
                ORDER BY COUNT(*) DESC
                LIMIT 5
            ) AS top_products
            JOIN products p ON p.id = top_products.product_id
            LEFT JOIN product_categories c ON p.category_id = c.id 
            LEFT JOIN product_subcategories s ON p.sub_category = s.id 
            LEFT JOIN product_brands b ON p.brand_id = b.id 
            LEFT JOIN product_discounts d ON p.id = d.product_id
            LEFT JOIN favourite_products f ON p.id = f.product_id AND f.user_id =?;
        `;
        db.query(sql, [userId], callback);
    },
    getProductDetailsByIdsAsync: (productIds) => {
        const placeholders = productIds.map(() => '?').join(',');
        const sql = `SELECT id, name FROM products WHERE id IN (${placeholders})`;

        return new Promise((resolve, reject) => {
            db.query(sql, productIds, (err, results) => {
                if (err) {
                    console.error("Error while querying product details:", err);
                    return reject(err);
                }
                resolve(results);
            });
        });
    },

    filterProducts: (filters, callback) => {
        let { priceSort, deliveryType, vendor_id } = filters;

        let sql = "SELECT * FROM products WHERE 1=1";
        let params = [];

        // Vendor filter (always apply)
        if (vendor_id) {
            sql += " AND vendor_id = ?";
            params.push(vendor_id);
        }

        // Delivery filter
        if (deliveryType) {
            if (deliveryType === "Fast Delivery") {
                sql += " AND fast_delivery_available = ?";
                params.push(1);
            } else if (deliveryType === "Normal Delivery") {
                sql += " AND fast_delivery_available = ?";
                params.push(0);
            }
        }

        // Price sorting
        if (priceSort) {
            if (priceSort === "High to Low") {
                sql += " ORDER BY price DESC";
            } else if (priceSort === "Low to High") {
                sql += " ORDER BY price ASC";
            }
        }

        db.query(sql, params, callback);
    }

    
};

module.exports = Product;

