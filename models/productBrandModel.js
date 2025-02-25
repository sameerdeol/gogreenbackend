const db = require('../config/db');

const ProductBrand = {
    findAll: (callback) => {
        const query = 'SELECT * FROM product_brands where status=1';
        db.query(query, callback);
    },

    findById: (id, callback) => {
        const query = 'SELECT * FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    },

    create: (name, description, brandLogo, callback) => {
        const query = 'INSERT INTO product_brands (name, description, brand_logo) VALUES (?, ?, ?)';
        db.query(query, [name, description, brandLogo], callback);
    },
    getById : (id, callback) => {
        const query = 'SELECT * FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    },
    
    update: (id, updateFields, callback) => {
        // Map the keys of the updateFields object to SQL format
        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    
        // Get the values from updateFields and append the ID for the WHERE clause
        const values = Object.values(updateFields);
        values.push(id);  // Append the ID at the end to update the correct row
    
        // Construct the SQL query
        const query = `UPDATE product_brands SET ${fields} WHERE id = ?`;
    
        // Execute the query
        db.query(query, values, callback);
    },


    delete: (id, callback) => {
        const query = 'DELETE FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    }
};

module.exports = ProductBrand;
