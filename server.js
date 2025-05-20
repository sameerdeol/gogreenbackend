const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

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


// GitHub Webhook Handler (Place before route definitions or at the end
app.post('/webhook', (req, res) => {
    console.log('✅ GitHub webhook triggered!');

    // Step 1: Pull the latest code
    exec('git pull origin main', (err, stdout, stderr) => {
        if (err) {
            console.error('❌ Git pull failed:', err);
            return res.status(500).send('Git pull failed');
        }

        console.log('📥 Git Pull Output:', stdout);

        // Step 2: Restart the app using PM2
        exec('pm2 restart server.js', (err2, stdout2, stderr2) => {
            if (err2) {
                console.error('❌ PM2 restart failed:', err2);
                return res.status(500).send('PM2 restart failed');
            }

            console.log('🔄 PM2 Restart Output:', stdout2);
            res.status(200).send('✅ Git pulled and server restarted');
        });
    });
});
app.post('/test', (req, res) => {
    res.send("hello first");
});

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
app.use("/", orderRoutes);
app.use("/", searchRoutes);
app.use("/", productDiscount);
app.use("/", notificationRoutes);
app.use('/', chatbotRoutes);
app.use('/', locationRoutes);


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
