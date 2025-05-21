const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

require('dotenv').config();

// Import Routes
const userRoutes = require('./routes/userRoutes');
const webhookHandler = require('./utils/webhook');
const productRoutes = require('./routes/productRoutes');
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const productSubcategoryRoutes = require('./routes/productSubcategoryRoutes');
const productBrandsRoutes = require('./routes/productBrandsRoutes');
const appBanners = require('./routes/appBannerRoutes');
const userAddress = require('./routes/userAdressRoutes');
const dynamicCategory = require('./routes//displayCategory');
const favouriteRoutes = require('./routes/favouriteRoutes');
const orderRoutes = require('./routes/orderRoutes');
const searchRoutes = require('./routes/searchRoutes')
const productDiscount = require('./routes/productDiscount')
const notificationRoutes = require('./routes/notificationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const locationRoutes = require('./routes/locationRoutes');
const app = express();

// Middleware
app.use(express.json()); // Handles application/json (raw JSON)
app.use(express.urlencoded({ extended: true })); // Handles form-data (x-www-form-urlencoded)
app.use(cors());

// Routes with Prefixes
app.use('/webhook', webhookHandler);

app.use('/users', userRoutes);                      // User-related routes
app.use('/useraddress', userAddress);               // User address routes
app.use('/favourites', favouriteRoutes);            // Favourite-related routes
app.use('/order', orderRoutes);                     // Order-related routes
app.use('/search', searchRoutes);                   // Search-related routes
app.use('/notifications', notificationRoutes);      // Notification-related routes
app.use('/chatbot', chatbotRoutes);                 // Chatbot-related routes
app.use('/location', locationRoutes);               // Location-related routes

// Product-related routes
app.use('/products', productRoutes);
app.use('/category', productCategoryRoutes);
app.use('/subcategory', productSubcategoryRoutes);
app.use('/productbrands', productBrandsRoutes);
app.use('/productdiscount', productDiscount);
app.use('/banners', appBanners);
app.use('/dynamiccat', dynamicCategory);



// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
