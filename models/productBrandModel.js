const db = require('../config/db');

const ProductBrand = {
    findAll: (callback) => {
        const query = `
            SELECT pb.*, pc.name AS category_name 
            FROM product_brands pb
            JOIN product_categories pc ON pb.categoryid = pc.id
        `;
        db.query(query, callback);
    },    

    findById: (id, callback) => {
        const query = `
                    SELECT pb.*, pc.name AS category_name 
                    FROM product_brands pb
                    JOIN product_categories pc ON pb.categoryid = pc.id
                    WHERE pb.id = ?;
        `;
        db.query(query, [id], callback);
    },

    create: (name, description,categoryid, brandLogo, callback) => {
        const query = 'INSERT INTO product_brands (name, description,categoryid, brand_logo) VALUES (?, ?, ?,?)';
        db.query(query, [name, description,categoryid, brandLogo], callback);
    },

    // getById: (id, callback) => {
    //     const query = 'SELECT * FROM product_brands WHERE id = ?';
    //     db.query(query, [id], callback);
    // },

    update: (id, updateFields, callback) => {
        if (Object.keys(updateFields).length === 0) {
            return callback(new Error("No fields provided to update"));
        }

        const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateFields);
        values.push(id);

        const query = `UPDATE product_brands SET ${fields} WHERE id = ?`;

        db.query(query, values, (err, result) => {
            if (err) return callback(err);

            // Fetch the updated brand after update
            ProductBrand.findById(id, callback);
        });
    },

    delete: (id, callback) => {
        const query = 'DELETE FROM product_brands WHERE id = ?';
        db.query(query, [id], callback);
    },

    findbycatID: (catID, callback) => {
        const query = `
            SELECT pb.*, pc.name AS category_name 
            FROM product_brands pb
            JOIN product_categories pc ON pb.categoryid = pc.id
            WHERE pb.categoryid = ?;
        `;
        db.query(query, [catID], callback);
    },
     
};

module.exports = ProductBrand;
