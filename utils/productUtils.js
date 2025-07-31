const fs = require('fs');
const path = require('path');

function extractUpdatedData(body) {
    const allowedFields = [
        'name', 'description', 'price', 'category_id', 'sub_category', 'stock', 
        'manufacturer_details', 'title', 'subtitle', 'size', 'fast_delivery_available', 
        'feature_title', 'feature_description', 'status', 'brand_id', 
        'nutritional_facts', 'miscellaneous', 'ingredients', 'product_unit', 'product_quantity'
    ];

    const updatedData = {};

    allowedFields.forEach(field => {
        if (body[field] !== undefined) {
            // Special case for status to ensure it's always parsed as integer
            updatedData[field] = (field === 'status') ? parseInt(body[field], 10) : body[field];
        }
    });

    return updatedData;
}


function handleFeaturedImage(req, existingProduct, updatedData) {
    const newImage = req.files?.['featuredImage']?.[0];
    if (newImage) {
        if (existingProduct.featured_image) {
            const oldPath = path.join(__dirname, '..', existingProduct.featured_image);
            fs.unlink(oldPath, (err) => {
                if (err) console.error("Failed to delete old featured image:", err);
            });
        }
        updatedData.featured_image = newImage.path;
    }
}

module.exports = {
    extractUpdatedData,
    handleFeaturedImage
};
