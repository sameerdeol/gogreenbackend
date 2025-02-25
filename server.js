const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');  // Import the product routes
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const productSubcategoryRoutes = require('./routes/productSubcategoryRoutes');

const app = express();

app.use(bodyParser.json());
app.use(cors());

// Routes
app.use('/', userRoutes);
app.use('/', productRoutes);  // Product-related routes (Prefix with /api)
app.use('/', productCategoryRoutes);  // Product-related routes (Prefix with /api)
app.use('/', productSubcategoryRoutes);  // Product-related routes (Prefix with /api)

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
