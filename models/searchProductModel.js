const db = require('../config/db');

const searchProduct = {
  search: (searchTerm, user_id, callback) => {
    if (!user_id) {
      return callback(new Error("user_id is required for this search"), null);
    }
  
    const likeSearchTerm = `%${searchTerm}%`;
  
    const query = `
      SELECT 'product' AS type, p.id, 
            p.name COLLATE utf8mb4_general_ci AS name, 
            p.description COLLATE utf8mb4_general_ci AS description,
            p.featured_image COLLATE utf8mb4_general_ci AS image, 
            NULL AS extra, 
            NULL AS is_favourite,
            CASE 
                WHEN p.name LIKE ? THEN 3
                WHEN c.name LIKE ? THEN 2
                ELSE 1
            END AS relevance
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      WHERE p.name LIKE ? COLLATE utf8mb4_general_ci OR c.name LIKE ? COLLATE utf8mb4_general_ci
  
      UNION ALL
  
      SELECT 'category' AS type, id, 
            name COLLATE utf8mb4_general_ci AS name, 
            description COLLATE utf8mb4_general_ci AS description,
            category_logo COLLATE utf8mb4_general_ci AS image,  
            NULL AS extra, 
            NULL AS is_favourite,
            CASE 
                WHEN name LIKE ? THEN 3 
                ELSE 1 
            END AS relevance
      FROM product_categories
      WHERE name LIKE ? COLLATE utf8mb4_general_ci
  
      UNION ALL
  
      SELECT 'subcategory' AS type, id, 
            name COLLATE utf8mb4_general_ci AS name, 
            description COLLATE utf8mb4_general_ci AS description, 
            subcategory_logo COLLATE utf8mb4_general_ci AS image,
            category_id AS extra, 
            NULL AS is_favourite,
            CASE 
                WHEN name LIKE ? THEN 3 
                ELSE 1 
            END AS relevance
      FROM product_subcategories
      WHERE name LIKE ? COLLATE utf8mb4_general_ci
  
      UNION ALL
  
      SELECT 'vendor_by_name' AS type, u.id, 
            v.store_name COLLATE utf8mb4_general_ci AS name, 
            v.store_address COLLATE utf8mb4_general_ci AS description, 
            v.profile_pic COLLATE utf8mb4_general_ci AS image,
            NULL AS extra, 
            IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,
            CASE 
                WHEN v.store_name LIKE ? THEN 3 
                ELSE 1 
            END AS relevance
      FROM users u 
      JOIN vendors v ON v.user_id = u.id 
      LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
      WHERE v.store_name LIKE ? COLLATE utf8mb4_general_ci
  
      UNION ALL
  
      SELECT DISTINCT 'vendor_by_product' AS type, u.id, 
            v.store_name COLLATE utf8mb4_general_ci AS name, 
            v.store_address COLLATE utf8mb4_general_ci AS description, 
            v.profile_pic COLLATE utf8mb4_general_ci AS image,
            NULL AS extra, 
            IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,
            CASE 
                WHEN p.name LIKE ? THEN 3 
                ELSE 1 
            END AS relevance
      FROM products p
      JOIN vendors v ON p.vendor_id = v.user_id
      JOIN users u ON v.user_id = u.id
      LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
      WHERE p.name LIKE ? COLLATE utf8mb4_general_ci
  
      ORDER BY relevance DESC;
    `;
  
    const values = [
      // product CASE and WHERE
      likeSearchTerm, likeSearchTerm, likeSearchTerm, likeSearchTerm,
  
      // category CASE and WHERE
      likeSearchTerm, likeSearchTerm,
  
      // subcategory CASE and WHERE
      likeSearchTerm, likeSearchTerm,
  
      // vendor_by_name CASE, user_id, WHERE
      likeSearchTerm, user_id, likeSearchTerm,
  
      // vendor_by_product CASE, user_id, WHERE
      likeSearchTerm, user_id, likeSearchTerm
    ];
  
    db.query(query, values, (err, results) => {
      if (err) return callback(err, null);
  
      const groupedResults = results.reduce((acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
      }, {});
  
      return callback(null, groupedResults);
    });
  },  
  searchitem: (searchTerm, searchtype, user_id, callback) => {
    const likeSearchTerm = `%${searchTerm}%`;
    const queries = [];
    const values = [];
  
    if (!searchtype || searchtype === 'product') {
      queries.push(`
        SELECT 'product' AS type, p.id, 
              p.name COLLATE utf8mb4_general_ci AS name, 
              p.description COLLATE utf8mb4_general_ci AS description,
              p.featured_image COLLATE utf8mb4_general_ci AS image, 
              NULL AS extra, 
              NULL AS is_favourite
        FROM products p
        JOIN product_categories c ON p.category_id = c.id
        WHERE p.name LIKE ? COLLATE utf8mb4_general_ci OR c.name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(likeSearchTerm, likeSearchTerm);
    }
  
    if (!searchtype || searchtype === 'category') {
      queries.push(`
        SELECT 'category' AS type, id, 
              name COLLATE utf8mb4_general_ci AS name, 
              description COLLATE utf8mb4_general_ci AS description,
              category_logo COLLATE utf8mb4_general_ci AS image,  
              NULL AS extra, 
              NULL AS is_favourite
        FROM product_categories
        WHERE name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(likeSearchTerm);
    }
  
    if (!searchtype || searchtype === 'subcategory') {
      queries.push(`
        SELECT 'subcategory' AS type, id, 
              name COLLATE utf8mb4_general_ci AS name, 
              description COLLATE utf8mb4_general_ci AS description, 
              subcategory_logo COLLATE utf8mb4_general_ci AS image,
              category_id AS extra, 
              NULL AS is_favourite
        FROM product_subcategories
        WHERE name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(likeSearchTerm);
    }
  
    if (!searchtype || searchtype === 'vendor_by_name') {
      queries.push(`
        SELECT 'vendor_by_name' AS type, u.id, 
              v.store_name COLLATE utf8mb4_general_ci AS name, 
              v.store_address COLLATE utf8mb4_general_ci AS description, 
              (
                SELECT p.featured_image 
                FROM products p 
                WHERE p.vendor_id = v.user_id 
                LIMIT 1
              ) COLLATE utf8mb4_general_ci AS image,
              NULL AS extra, 
              IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite
        FROM users u 
        JOIN vendors v ON v.user_id = u.id 
        LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
        WHERE v.store_name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(user_id, likeSearchTerm);
    }
  
    if (!searchtype || searchtype === 'vendor_by_product') {
      queries.push(`
        SELECT DISTINCT 'vendor_by_product' AS type, u.id, 
              v.store_name COLLATE utf8mb4_general_ci AS name, 
              v.store_address COLLATE utf8mb4_general_ci AS description, 
              p.featured_image COLLATE utf8mb4_general_ci AS image,  -- Changed this line
              NULL AS extra, 
              IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite
        FROM products p
        JOIN vendors v ON p.vendor_id = v.user_id
        JOIN users u ON v.user_id = u.id
        LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
        WHERE p.name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(user_id, likeSearchTerm);
    }
  
    const query = queries.join(' UNION ALL ');
  
    if (!query) {
      return callback(null, {}); // no matching query
    }
  
    db.query(query, values, (err, results) => {
      if (err) return callback(err, null);
  
      const groupedResults = results.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
      }, {});
  
      return callback(null, groupedResults);
    });
  }  
};

module.exports = searchProduct;
