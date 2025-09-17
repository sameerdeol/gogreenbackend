const express = require('express');
const router = express.Router();
const {checkManagerRole} = require('../middleware/checkManagerRoll');
const {
    adminDashboardData
} = require('../controllers/adminController');

// Routes for User Addresses
router.get('/dashboard-data', adminDashboardData);

module.exports = router;
