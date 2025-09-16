const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authroization');
const {
  saveFcmToken,
  sendNotification,
  removeFcmToken,
  allNotificationsOfUser,
  markNotificationAsRead
} = require('../controllers/notificationController');

// Save FCM token
router.post('/userfcm-token', saveFcmToken);

// Send test notification
router.post('/send-notification', sendNotification);

router.delete('/remove-fcmtoken', removeFcmToken);

router.get('/all-notifications/:user_id', allNotificationsOfUser);

router.get('/mark-asread', markNotificationAsRead);


module.exports = router;
