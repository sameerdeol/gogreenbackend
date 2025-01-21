const db = require('../config/db');
const sqlString = require('sqlstring');

const GalleryImage = {
    // Create a new gallery image for a product
    create: (productId, imagePaths, callback) => {
        if (!Array.isArray(imagePaths)) {
            imagePaths = [imagePaths];  // Ensure imagePaths is an array
        }

        const galleryImageData = imagePaths.map(imagePath => ({
            product_id: productId,
            image_path: imagePath
        }));

        const query = sqlString.format(
            'INSERT INTO gallery_images (product_id, image_path) VALUES ?',
            [galleryImageData.map(image => [image.product_id, image.image_path])]
        );

        db.query(query, callback);
    },

    // Get all gallery images for a product
    findByProductId: (productId, callback) => {
        const query = 'SELECT * FROM gallery_images WHERE product_id = ?';
        db.query(query, [productId], callback);
    },

    // Delete all gallery images for a product
    deleteByProductId: (productId, callback) => {
        const query = 'DELETE FROM gallery_images WHERE product_id = ?';
        db.query(query, [productId], callback);
    },

    // Delete a specific gallery image by ID
    deleteById: (id, callback) => {
        const query = 'DELETE FROM gallery_images WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = GalleryImage;
