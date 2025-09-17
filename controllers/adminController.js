const adminModel = require('../models/adminModel');

// Function to fetch admin dashboard data
const adminDashboardData = (req, res) => {
    adminModel.dashboardData((err, result) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error fetching admin data', 
                error: err 
            });
        }

        // Return the first row since dashboard query returns a single row
        res.status(200).json({ 
            success: true, 
            message: 'Admin data fetched successfully', 
            data: result[0] 
        });
    });
};

module.exports = { adminDashboardData };
