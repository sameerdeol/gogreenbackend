const db = require('../config/db');

const searchProduct = {
  search: (searchTerm, searchNum, user_id, callback) => {
    const likeSearchTerm = `%${searchTerm}%`;
    let query = '';
    let values = [];

    if ((searchNum === 3 || searchNum === 4) && !user_id) {
      return callback(new Error("user_id is required for this search"), null);
    }

    if (searchNum == 1) {
      query = `
        SELECT p.*
        FROM products p
        JOIN product_categories c ON p.category_id = c.id
        WHERE p.name LIKE ? OR c.name LIKE ?`;
      values = [likeSearchTerm, likeSearchTerm];

    } else if (searchNum == 0) {
      query = `
        SELECT id, name, description 
        FROM product_categories
        WHERE name LIKE ?`;
      values = [likeSearchTerm];

    } else if (searchNum == 2) {
      query = `
        SELECT id, name, description, category_id 
        FROM product_subcategories
        WHERE name LIKE ?`;
      values = [likeSearchTerm];

    } else if (searchNum == 3) {
      query = `
        SELECT 
            u.firstname, 
            u.lastname, 
            u.email, 
            u.prefix, 
            u.phonenumber, 
            v.store_address, 
            v.profile_pic, 
            v.store_name,
            IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite
        FROM users u 
        JOIN vendors v ON v.user_id = u.id 
        LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
        WHERE v.store_name LIKE ?`;
      values = [user_id, likeSearchTerm];

    } else if (searchNum == 4) {
      query = `
        SELECT DISTINCT 
            u.firstname, 
            u.lastname, 
            u.email, 
            u.prefix, 
            u.phonenumber,
            v.store_name, 
            v.store_address, 
            v.profile_pic,
            IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite
        FROM products p
        JOIN vendors v ON p.vendor_id = v.user_id
        JOIN users u ON v.user_id = u.id
        LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
        WHERE p.name LIKE ?`;
      values = [user_id, likeSearchTerm];
    }

    if (!query) {
      return callback(new Error("Invalid searchNum provided"), null);
    }

    db.query(query, values, callback);
  }
};

module.exports = searchProduct;
