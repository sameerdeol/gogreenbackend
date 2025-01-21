const db = require('../config/db');
const sqlString = require('sqlstring');

const Product = {
    // Create a new product
    create: (name, description, price, category, stock, featured_image, manufacturer_details, callback) => {

        // Ensure featured_image is either a string (file path) or null
        featured_image = featured_image && typeof featured_image === 'string' ? featured_image : null;

        // Insert product data into the products table
        const query = sqlString.format(
            'INSERT INTO products (name, description, price, category, stock, featured_image, manufacturer_details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                String(name), 
                String(description), 
                parseInt(price),  // Ensure it's a number
                String(category), 
                parseInt(stock, 10), 
                String(featured_image), 
                String(manufacturer_details)
            ]
        );

        db.query(query, callback);
    },

    // Get a product by ID
    findById: (id, callback) => {
        const query = 'SELECT * FROM products WHERE id = ?';
        db.query(query, [id], callback);
    },
    find: (callback) => {
        const query = 'SELECT * FROM products';
        db.query(query, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return callback(err, null);
            }
    
            // Loop through each product and fetch the gallery images
            const productsWithImages = [];
            let count = 0; // To track the number of products processed
    
            results.forEach((product) => {
                const galleryQuery = 'SELECT image_path  FROM gallery_images WHERE product_id = ?';
                db.query(galleryQuery, [product.id], (err, images) => {
                    if (err) {
                        console.error('Error fetching gallery images:', err);
                        return callback(err, null);
                    }
    
                    // Add the gallery images to the product object
                    product.gallery_images = images;
                    productsWithImages.push(product);
                    count++;
    
                    // Once all products are processed, return the result
                    if (count === results.length) {
                        callback(null, productsWithImages);
                    }
                });
            });
        });
    },
    
    

    // Update a product by ID
    updateById: (id, updateData, callback) => {
        const fields = [];
        const values = [];
    
        // Dynamically build the query with provided fields
        Object.keys(updateData).forEach((key) => {
            fields.push(`${key} = ?`);
            values.push(updateData[key]);
        });
    
        // Add `updated_at` field to track updates
        fields.push('updated_at = CURRENT_TIMESTAMP');
    
        const query = `
            UPDATE products 
            SET ${fields.join(', ')}
            WHERE id = ?
        `;
    
        // Append the product ID to the values array
        values.push(id);
    
        db.query(query, values, callback);
    },

    // Delete a product by ID
    deleteById: (id, callback) => {
        const query = 'DELETE FROM products WHERE id = ?';
        db.query(query, [id], callback);
    },

    // Get all products
    findAll: (callback) => {
        const query = 'SELECT * FROM products';
        db.query(query, callback);
    },
};

module.exports = Product;
