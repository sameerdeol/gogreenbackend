const { getFirebaseApp } = require('../firebaseKeys/firebaseInit');

const sendNotification = async ({ fcmToken, title, body, data = {} }) => {
    try {
        const firebaseApp = getFirebaseApp();
        const message = {
            token: fcmToken,
            notification: { title, body },
            data
        };

        const response = await firebaseApp.messaging().send(message);
        return { success: true, response };
    } catch (error) {
        console.error('Notification Error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = sendNotification;
