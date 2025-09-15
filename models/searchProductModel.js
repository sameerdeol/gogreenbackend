const db = require('../config/db');

const searchProduct = {
  search: (searchTerm, user_id, callback) => {
    if (!user_id) {
      return callback(new Error("user_id is required for this search"), null);
    }
  
    const likeSearchTerm = `%${searchTerm}%`;
  
  const query = `
    SELECT 'product' AS type, p.id AS product_id, 
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
    WHERE p.name LIKE ? COLLATE utf8mb4_general_ci 
      OR c.name LIKE ? COLLATE utf8mb4_general_ci

    UNION ALL

    SELECT 'category' AS type, id AS category_id, 
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

    SELECT 'subcategory' AS type, id AS subcategory_id, 
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

    SELECT 'vendor_by_name' AS type, 
          u.id AS vendor_id, 
          v.store_name COLLATE utf8mb4_general_ci AS name, 
          v.store_address COLLATE utf8mb4_general_ci AS description,
          v.store_image COLLATE utf8mb4_general_ci AS image,
          JSON_OBJECT(
            'firstname', u.firstname,
            'lastname', u.lastname,
            'email', u.email,
            'prefix', u.prefix,
            'phonenumber', u.phonenumber,
            'vendor_start_time', v.vendor_start_time,
            'vendor_close_time', v.vendor_close_time,
            'sin_code', v.sin_code
          ) AS extra,
          IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,
          CASE 
              WHEN v.store_name LIKE ? THEN 3 
              ELSE 1 
          END AS relevance
    FROM users u 
    JOIN vendors v ON v.user_id = u.id 
    LEFT JOIN favourite_vendors fv 
          ON fv.vendor_id = v.user_id AND fv.user_id = ?
    WHERE v.store_name LIKE ? COLLATE utf8mb4_general_ci

    UNION ALL

    SELECT DISTINCT 
        'vendor_by_product' AS type, 
        u.id AS vendor_id, 
        v.store_name COLLATE utf8mb4_general_ci AS name, 
        v.store_address COLLATE utf8mb4_general_ci AS description,
        v.profile_pic COLLATE utf8mb4_general_ci AS image,
        NULL AS extra, 
        IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,
        CASE 
            WHEN p.name LIKE ? COLLATE utf8mb4_general_ci THEN 3 
            ELSE 1 
        END AS relevance
    FROM products p
    JOIN vendors v ON p.vendor_id = v.user_id
    JOIN users u ON v.user_id = u.id
    LEFT JOIN favourite_vendors fv 
        ON fv.vendor_id = v.user_id 
      AND fv.user_id = ?
    WHERE p.name LIKE ? COLLATE utf8mb4_general_ci
      AND u.status = 1
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
  
    // Search vendors by product name
    if (!searchtype || searchtype === 'product') {
      queries.push(`
        SELECT DISTINCT 'vendor' AS type, u.id, 
              v.store_name COLLATE utf8mb4_general_ci AS name,
              v.store_address COLLATE utf8mb4_general_ci AS description,
              (
                SELECT p2.featured_image 
                FROM products p2 
                WHERE p2.vendor_id = v.user_id 
                LIMIT 1
              ) COLLATE utf8mb4_general_ci AS image,
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
  
    // Search vendors by category name
    if (!searchtype || searchtype === 'category') {
      queries.push(`
        SELECT DISTINCT 'vendor' AS type, u.id,
              v.store_name COLLATE utf8mb4_general_ci AS name,
              v.store_address COLLATE utf8mb4_general_ci AS description,
              (
                SELECT p2.featured_image 
                FROM products p2 
                WHERE p2.vendor_id = v.user_id 
                LIMIT 1
              ) COLLATE utf8mb4_general_ci AS image,
              NULL AS extra,
              IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite
        FROM product_categories c
        JOIN products p ON p.category_id = c.id
        JOIN vendors v ON p.vendor_id = v.user_id
        JOIN users u ON v.user_id = u.id
        LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
        WHERE c.name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(user_id, likeSearchTerm);
    }
  
    // Search vendors by subcategory name
    if (!searchtype || searchtype === 'subcategory') {
      queries.push(`
        SELECT DISTINCT 'vendor' AS type, u.id,
              v.store_name COLLATE utf8mb4_general_ci AS name,
              v.store_address COLLATE utf8mb4_general_ci AS description,
              (
                SELECT p2.featured_image 
                FROM products p2 
                WHERE p2.vendor_id = v.user_id 
                LIMIT 1
              ) COLLATE utf8mb4_general_ci AS image,
              NULL AS extra,
              IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite
        FROM product_subcategories s
        JOIN products p ON p.sub_category = s.id
        JOIN vendors v ON p.vendor_id = v.user_id
        JOIN users u ON v.user_id = u.id
        LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
        WHERE s.name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(user_id, likeSearchTerm);
    }
  
    // Search vendors by store name
    if (!searchtype || searchtype === 'vendor_by_name') {
      queries.push(`
        SELECT DISTINCT 'vendor' AS type, u.id,
              v.store_name COLLATE utf8mb4_general_ci AS name,
              v.store_address COLLATE utf8mb4_general_ci AS description,
              (
                SELECT p2.featured_image 
                FROM products p2 
                WHERE p2.vendor_id = v.user_id 
                LIMIT 1
              ) COLLATE utf8mb4_general_ci AS image,
              NULL AS extra,
              IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite
        FROM vendors v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN favourite_vendors fv ON fv.vendor_id = v.user_id AND fv.user_id = ?
        WHERE v.store_name LIKE ? COLLATE utf8mb4_general_ci
      `);
      values.push(user_id, likeSearchTerm);
    }
  
    const query = queries.join(' UNION ALL ');
  
    if (!query) {
      return callback(null, {});
    }
  
    db.query(query, values, (err, results) => {
      if (err) return callback(err, null);
  
      // Grouping is kept for future extensibility
      const groupedResults = results.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
      }, {});
  
      return callback(null, groupedResults);
    });
  },

  searchByVendor: (searchTerm, vendor_id, callback) => {
  if (!vendor_id) {
    return callback(new Error("vendor_id is required for this search"), null);
  }

  const likeSearchTerm = `%${searchTerm || ''}%`;

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
    WHERE p.vendor_id = ? AND (p.name LIKE ? COLLATE utf8mb4_general_ci OR c.name LIKE ? COLLATE utf8mb4_general_ci)

    UNION ALL

    SELECT DISTINCT 'category' AS type, pc.id, 
          pc.name COLLATE utf8mb4_general_ci AS name, 
          pc.description COLLATE utf8mb4_general_ci AS description,
          pc.category_logo COLLATE utf8mb4_general_ci AS image,  
          NULL AS extra, 
          NULL AS is_favourite,
          CASE 
              WHEN pc.name LIKE ? THEN 3 
              ELSE 1 
          END AS relevance
    FROM products p
    JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.vendor_id = ? AND pc.name LIKE ? COLLATE utf8mb4_general_ci

    UNION ALL

    SELECT DISTINCT 'subcategory' AS type, ps.id, 
          ps.name COLLATE utf8mb4_general_ci AS name, 
          ps.description COLLATE utf8mb4_general_ci AS description, 
          ps.subcategory_logo COLLATE utf8mb4_general_ci AS image,
          ps.category_id AS extra, 
          NULL AS is_favourite,
          CASE 
              WHEN ps.name LIKE ? THEN 3 
              ELSE 1 
          END AS relevance
    FROM products p
    JOIN product_subcategories ps ON p.sub_category = ps.id
    WHERE p.vendor_id = ? AND ps.name LIKE ? COLLATE utf8mb4_general_ci

    UNION ALL

    SELECT 'vendor_info' AS type, 
          u.id, 
          v.store_name COLLATE utf8mb4_general_ci AS name, 
          v.store_address COLLATE utf8mb4_general_ci AS description, 
          v.profile_pic COLLATE utf8mb4_general_ci AS image,
          NULL AS extra, 
          NULL AS is_favourite,
          CASE 
              WHEN v.store_name LIKE ? THEN 3 
              ELSE 1 
          END AS relevance
    FROM users u
    JOIN vendors v ON v.user_id = u.id
    WHERE v.user_id = ? 
      AND v.store_name LIKE ? COLLATE utf8mb4_general_ci
      AND u.status = 1
    ORDER BY relevance DESC;
  `;

  const values = [
    // products
    likeSearchTerm, likeSearchTerm, vendor_id, likeSearchTerm, likeSearchTerm,

    // categories
    likeSearchTerm, vendor_id, likeSearchTerm,

    // subcategories
    likeSearchTerm, vendor_id, likeSearchTerm,

    // vendor info
    likeSearchTerm, vendor_id, likeSearchTerm,
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


searchVendorbyProduct: (searchTerm, userId, callback) => {
  if (!userId || !searchTerm) {
    return callback(new Error("userId and searchTerm are required"), null);
  }

  const query = `
    SELECT 
        u.firstname, 
        u.lastname, 
        u.email, 
        u.prefix, 
        u.phonenumber,
        u.status,
        v.store_address, 
        v.sin_code, 
        v.store_name, 
        v.profile_pic, 
        v.user_id AS vendor_id,
        v.store_image,
        v.vendor_thumb,
        v.vendor_start_time,
        v.vendor_close_time,
        IF(fv.user_id IS NOT NULL, TRUE, FALSE) AS is_favourite,
        (
            SELECT GROUP_CONCAT(DISTINCT p.featured_image)
            FROM products p
            LEFT JOIN product_categories c ON c.id = p.category_id
            LEFT JOIN product_subcategories sc ON sc.id = p.sub_category
            WHERE p.vendor_id = v.user_id
              AND (
                   LOWER(p.name) LIKE ?
                   OR LOWER(c.name) LIKE ?
                   OR LOWER(sc.name) LIKE ?
              )
        ) AS featured_images
    FROM users u
    JOIN vendors v ON v.user_id = u.id
    LEFT JOIN favourite_vendors fv 
        ON fv.vendor_id = v.user_id 
       AND fv.user_id = ?
    WHERE u.is_verified = 1 
      AND u.status = 1
      AND EXISTS (
          SELECT 1 
          FROM products p2
          LEFT JOIN product_categories c2 ON c2.id = p2.category_id
          LEFT JOIN product_subcategories sc2 ON sc2.id = p2.sub_category
          WHERE p2.vendor_id = v.user_id
            AND (
                 LOWER(p2.name) LIKE ?
                 OR LOWER(c2.name) LIKE ?
                 OR LOWER(sc2.name) LIKE ?
            )
      );
  `;

  const likeSearch = `%${searchTerm.toLowerCase()}%`;
  const values = [
    likeSearch, likeSearch, likeSearch, // featured_images subquery
    userId,
    likeSearch, likeSearch, likeSearch  // EXISTS condition
  ];

  db.query(query, values, (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
}





};

module.exports = searchProduct;
