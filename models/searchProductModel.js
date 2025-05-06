const db = require('../config/db');

const searchProduct = {
  search: (searchTerm, searchNum, callback) => {
    const likeSearchTerm = `%${searchTerm}%`;
    let query = '';
    let values = [];

    if (searchNum == 1) {
      query = `
        SELECT p.*
        FROM products p
        JOIN product_categories c ON p.category_id = c.id
        WHERE p.name LIKE ? OR c.name LIKE ?`;
      values = [likeSearchTerm, likeSearchTerm];
    } else if (searchNum == 0) {
      query = `
        SELECT *
        FROM product_categories
        WHERE name LIKE ?`;
      values = [likeSearchTerm];
    } else if (searchNum == 2) {
      query = `
        SELECT *
        FROM product_subcategories
        WHERE name LIKE ?`;
      values = [likeSearchTerm];
    } else if (searchNum == 3) {
      query = `
        SELECT u.firstname, u.lastname, u.email, u.prefix, u.phonenumber, 
              v.store_address, v.profile_pic, v.store_name
        FROM users u 
        JOIN vendors v ON v.user_id = u.id 
        WHERE v.store_name LIKE ?;
        `;
      values = [likeSearchTerm];
    } else if (searchNum == 4) {
      query = `
        SELECT DISTINCT u.firstname, u.lastname, u.email, u.prefix, u.phonenumber,
                        v.store_name, v.store_address, v.profile_pic
        FROM products p
        JOIN vendors v ON p.vendor_id = v.user_id
        JOIN users u ON v.user_id = u.id
        WHERE p.name LIKE ?
        `;
      values = [likeSearchTerm];
    }

    db.query(query, values, callback);
  }
};

module.exports = searchProduct;
