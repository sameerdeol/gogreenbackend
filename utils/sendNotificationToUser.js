const { getFirebaseApp } = require('../firebaseKeys/firebaseInit');
const db = require('../config/db');
const Notification = require('../models/notificationModel');

// Single reusable function to notify any user by their ID
const sendNotificationToUser = async ({ userId, title, body, data = {}, saveToDB = false }) => {
    try {
        // Optional: save notification in DB via model
        if (saveToDB) {
            await Notification.create({
                user_id: userId,
                title,
                message: body,
                type: data?.type || null,
                reference_id: data?.order_id || null,
                data
            });
        }

        // Fetch FCM token
        const [user] = await new Promise((resolve, reject) => {
            db.query(
                "SELECT fcm_token FROM users_fcm_token WHERE user_id = ?",
                [userId],
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                }
            );
        });

        if (!user || !user.fcm_token) {
            console.warn(`No FCM token found for user ID: ${userId}`);
            return { success: false, error: "No FCM token found" };
        }

        // const message = {
        //     token: user.fcm_token,
        //     notification: { title, body },
        //     data: Object.fromEntries(
        //         Object.entries(data).map(([k, v]) => [k, String(v)])
        //     )
        // };

        const message = {
            token: user.fcm_token,
            data: {
                title,
                body,
                ...Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
                )
            }
            // 🚫 DO NOT include `notification: { ... }`
        };

        const firebaseApp = getFirebaseApp();
        const response = await firebaseApp.messaging().send(message);

        return { success: true, response };
    } catch (error) {
        console.error('Notification Error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = sendNotificationToUser;
