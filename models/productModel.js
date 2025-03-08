const db = require('../config/db');
const sqlString = require('sqlstring');

const Product = {
    // Create a new product (Uses sub_category instead of name)
    create: (name, description, price, category, sub_category, stock, featured_image, manufacturer_details, callback) => {
        // Ensure featured_image is a valid string or set to null
        featured_image = featured_image && typeof featured_image === 'string' ? featured_image : null;
    
        const query = sqlString.format(
            `INSERT INTO products 
            (name, description, price, category, sub_category, stock, featured_image, manufacturer_details) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(name),
                String(description),
                parseFloat(price) || 0,  // Ensure price is a valid float
                parseInt(category, 10) || null,  // Ensure category is a number or null
                sub_category ? parseInt(sub_category, 10) : null,  // Avoid NaN errors
                parseInt(stock, 10) || 0,  // Ensure stock is an integer
                featured_image,
                String(manufacturer_details)
            ]
        );
    
        db.query(query, callback);
    },    

    // Get a product by ID
    findById: (id, callback) => {
        const query = `
            SELECT p.*, c.name AS category_name, s.name AS sub_category_name 
            FROM products p
            LEFT JOIN product_categories c ON p.category = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
            WHERE p.id = ?
        `;
        
        db.query(query, [id], (err, productResult) => {
            if (err || !productResult.length) {
                return callback(err || 'Product not found', null);
            }

            // Fetch gallery images for this product
            const galleryQuery = 'SELECT image_path FROM gallery_images WHERE product_id = ?';
            db.query(galleryQuery, [id], (imgErr, images) => {
                if (imgErr) {
                    return callback(imgErr, null);
                }

                // Attach images to the product
                productResult[0].gallery_images = images;
                callback(null, productResult[0]);
            });
        });
    },

    // Get all products (Optimized with Promise.all)
    find: (callback) => {
        const query = `
            SELECT p.*, c.name AS category_name, s.name AS sub_category_name 
            FROM products p
            LEFT JOIN product_categories c ON p.category = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
        `;

        db.query(query, (err, results) => {
            if (err) {
                return callback(err, null);
            }

            // Fetch gallery images for all products using Promise.all
            const productPromises = results.map((product) => {
                return new Promise((resolve, reject) => {
                    const galleryQuery = 'SELECT image_path FROM gallery_images WHERE product_id = ?';
                    db.query(galleryQuery, [product.id], (imgErr, images) => {
                        if (imgErr) reject(imgErr);
                        product.gallery_images = images;
                        resolve(product);
                    });
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
    // Fetch all featured products
    getFeatured: (callback) => {
        const sql = `SELECT p.*, c.name AS category_name, s.name AS sub_category_name 
            FROM products p
            LEFT JOIN product_categories c ON p.category = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
            WHERE p.is_featured = TRUE`;
        db.query(sql, callback);
    },

    // Fetch all today’s deal products
    getTodayDeal: (callback) => {
        const sql = `SELECT p.*, c.name AS category_name, s.name AS sub_category_name 
            FROM products p
            LEFT JOIN product_categories c ON p.category = c.id
            LEFT JOIN product_subcategories s ON p.sub_category = s.id
            WHERE p.is_today_deal = TRUE`;
        db.query(sql, callback);
    },

    getbycategory: (id, callback) => {
        const sql = `SELECT p.*, c.name AS category_name, s.name AS sub_category_name 
                     FROM products p
                     LEFT JOIN product_categories c ON p.category = c.id
                     LEFT JOIN product_subcategories s ON p.sub_category = s.id
                     WHERE p.category = ?;`;
        
        db.query(sql, [id], callback); // ✅ Pass id as an array element
    }
    
};

module.exports = Product;
