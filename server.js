const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const productSubcategoryRoutes = require('./routes/productSubcategoryRoutes');
const productBrandsRoutes = require('./routes/productBrandsRoutes');
const appBanners = require('./routes/appBannerRoutes');
const userAddress = require('./routes/userAdressRoutes');
const dynamicCategory = require('./routes//displayCategory');
const favouriteRoutes = require('./routes/favouriteRoutes');
const app = express();

// Middleware
app.use(express.json()); // Handles application/json (raw JSON)
app.use(express.urlencoded({ extended: true })); // Handles form-data (x-www-form-urlencoded)
app.use(cors());

// Routes with Prefixes
app.use('/', userRoutes);
app.use('/', productRoutes);  // Product-related routes (Prefix with /api)
app.use('/', productCategoryRoutes);  // Product-related routes (Prefix with /api)
app.use('/', productSubcategoryRoutes);  // Product-related routes (Prefix with /api)
app.use('/', productBrandsRoutes);  // Product-related routes (Prefix with /api)
app.use('/', appBanners);  // Product-related routes (Prefix with /api)
app.use('/', userAddress);
app.use('/', dynamicCategory);
app.use('/', favouriteRoutes);


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
