const db = require('../config/db');

const adminModel = {
    dashboardData: (callback) => {
        const query = `
        SELECT
            -- Active vendors
            (SELECT COUNT(*) FROM users WHERE role_id = 3 AND status = 1) AS total_active_vendors,
            (SELECT COUNT(*) FROM users WHERE role_id = 3 AND status = 1 AND DATE(created_at) = CURDATE()) AS new_vendors_today,
            (SELECT COUNT(*) FROM users WHERE role_id = 3 AND status = 1 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())) AS new_vendors_this_month,

            -- Orders and revenue
            (SELECT COUNT(*) FROM order_details WHERE DATE(created_at) = CURDATE()) AS total_orders_today,
            (SELECT COUNT(*) FROM order_details WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())) AS total_orders_this_month,
            (SELECT SUM(total_price) FROM order_details WHERE DATE(created_at) = CURDATE()) AS total_revenue_today,
            (SELECT SUM(total_price) FROM order_details WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())) AS total_revenue_this_month,

            -- Riders
            (SELECT COUNT(*) FROM users WHERE role_id = 4 AND status = 1) AS total_riders,

            -- Customers
            (SELECT COUNT(*) FROM users WHERE role_id = 5) AS total_customers,
            (SELECT COUNT(*) FROM users WHERE role_id = 5 AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)) AS new_customers_this_week,

            -- Orders by status
            (SELECT COUNT(*) FROM order_details WHERE order_status IN (1, 2)) AS total_accepted_order_by_vendors,
            (SELECT COUNT(*) FROM order_details WHERE rider_status = 3) AS total_rider_picker,

            -- Most used address details
            (SELECT CONCAT(UAD.address, ', ', UAD.landmark, ', ', UAD.type, ' - ', UAD.floor,UAD.customer_lng, ', ', UAD.customer_lat)
            FROM user_addresses UAD
            JOIN (
                SELECT user_address_id, COUNT(*) AS usage_count
                FROM order_details
                GROUP BY user_address_id
                ORDER BY usage_count DESC
                LIMIT 1
            ) t ON UAD.id = t.user_address_id
            ) AS most_used_address,

            -- Ratings
            (SELECT COUNT(*) FROM ratings WHERE rating BETWEEN 1 AND 5) AS total_ratings,
            (SELECT ROUND(AVG(rating),2) FROM ratings WHERE rating BETWEEN 1 AND 5) AS average_rating;
        `;

        db.query(query, callback);
    },
};

module.exports = adminModel;
