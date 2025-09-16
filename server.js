const express = require('express');
const cors = require('cors');
const http = require('http'); // Required for creating HTTP server
const { Server } = require('socket.io');
const { exec } = require('child_process');

require('dotenv').config();

const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ✅ Socket.IO setup
require('./sockets/orderSocket')(io);
require('./sockets/vendorSocket')(io);
// Import Routes
const userRoutes = require('./routes/userRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const riderRoutes = require('./routes/riderRoutes');
const webhookHandler = require('./utils/webhook');
const productRoutes = require('./routes/productRoutes');
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const productSubcategoryRoutes = require('./routes/productSubcategoryRoutes');
const productBrandsRoutes = require('./routes/productBrandsRoutes');
const appBanners = require('./routes/appBannerRoutes');
const userAddress = require('./routes/userAdressRoutes');
const dynamicCategory = require('./routes/displayCategory');
const favouriteRoutes = require('./routes/favouriteRoutes');
const orderRoutes = require('./routes/orderRoutes')(io); // Pass `io` here
const searchRoutes = require('./routes/searchRoutes');
const productDiscount = require('./routes/productDiscount');
const notificationRoutes = require('./routes/notificationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const locationRoutes = require('./routes/locationRoutes');
const parcelRoutes = require('./routes/parcelRoutes');
const ratingsRoutes = require('./routes/ratingRoutes');

// Routes
app.use('/webhook', webhookHandler);
app.use('/users', userRoutes);
app.use('/vendors', vendorRoutes);
app.use('/riders', riderRoutes);
app.use('/useraddress', userAddress);
app.use('/favourites', favouriteRoutes);
app.use('/order', orderRoutes); // Contains /accept-order route
app.use('/search', searchRoutes);
app.use('/notifications', notificationRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/location', locationRoutes);
app.use('/products', productRoutes);
app.use('/category', productCategoryRoutes);
app.use('/subcategory', productSubcategoryRoutes);
app.use('/productbrands', productBrandsRoutes);
app.use('/productdiscount', productDiscount);
app.use('/banners', appBanners);
app.use('/dynamiccat', dynamicCategory);
app.use('/parcels', parcelRoutes);
app.use('/ratings', ratingsRoutes);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("✅ Socket.IO server is ready and listening for connections");
});