const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
  saveFcmToken,
  sendNotification
} = require('../controllers/notificationController');

// Save FCM token
router.post('/userfcm-token',verifyToken, saveFcmToken);

// Send test notification
router.post('/send-notification', sendNotification);

module.exports = router;
