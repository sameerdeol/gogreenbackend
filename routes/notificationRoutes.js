const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
  saveFcmToken,
  sendNotification,
  removeFcmToken
} = require('../controllers/notificationController');

// Save FCM token
router.post('/userfcm-token', saveFcmToken);

// Send test notification
router.post('/send-notification', sendNotification);

router.delete('/remove-fcmtoken', removeFcmToken);

module.exports = router;
