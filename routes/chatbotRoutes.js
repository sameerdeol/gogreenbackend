// routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const {handleChat} = require('../controllers/chatbotController');

router.post('/chatbottest', handleChat);

module.exports = router;
