const UserFcmToken = require('../models/fcmTokenModel');
const { getFirebaseApp } = require('../firebaseKeys/firebaseInit');

// Save FCM token
const saveFcmToken = (req, res) => {
    const { user_id, fcmToken } = req.body;

    if (!user_id || !fcmToken) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    UserFcmToken.create(user_id, fcmToken, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error saving FCM token', error: err });
        }
        res.status(201).json({ success: true, message: 'FCM token saved successfully', id: result.insertId });
    });
};

// Send notification
const sendNotification = async (req, res) => {
    const { fcmToken, title, body, data } = req.body;

    try {
        const firebaseApp = getFirebaseApp(); // No userType needed

        const message = {
            token: fcmToken,
            notification: { title, body },
            data: data || {}
        };

        const response = await firebaseApp.messaging().send(message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('FCM Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const removeFcmToken = (req, res) => {
    const { user_id, fcmToken } = req.body;
    console.log(req.body)
    if (!user_id || !fcmToken) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    UserFcmToken.remove(user_id, fcmToken, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error removing FCM token', error: err });
        }
        res.status(200).json({ success: true, message: 'FCM token removed successfully' });
    });
};

module.exports = {
    saveFcmToken,
    sendNotification,
    removeFcmToken
};
