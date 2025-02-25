const db = require('../config/db');
const sqlString = require('sqlstring');

const Product = {
    // Create a new product (Uses sub_category instead of name)
    create: (name, description, price, category, sub_category, stock, featured_image, manufacturer_details, callback) => {
        featured_image = featured_image && typeof featured_image === 'string' ? featured_image : null;

        const query = sqlString.format(
            `INSERT INTO products 
            (name, description, price, category, sub_category, stock, featured_image, manufacturer_details) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(name),
                String(description),
                parseFloat(price),  // Ensure price is a float
                parseInt(category, 10),  // Ensure category is a number
                parseInt(sub_category, 10),  // Store sub_category as an integer
                parseInt(stock, 10),  // Ensure stock is an integer
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

        Object.keys(updateData).forEach((key) => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        // Ensure we don't create an invalid SQL query
        if (fields.length === 0) {
            return callback('No valid fields provided for update.', null);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
        db.query(query, values, callback);
    },

    // Delete a product by ID
    deleteById: (id, callback) => {
        const query = 'DELETE FROM products WHERE id = ?';
        db.query(query, [id], callback);
    },

    // Get all products (Optimized duplicate function)
    findAll: (callback) => {
        Product.find(callback);  // Uses the same optimized `find()` function
    }
};

module.exports = Product;
