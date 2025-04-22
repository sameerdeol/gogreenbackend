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
    }

    db.query(query, values, callback);
  }
};

module.exports = searchProduct;
