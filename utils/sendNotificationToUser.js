// const { getFirebaseApp } = require('../firebaseKeys/firebaseInit');
// const db = require('../config/db');
// const Notification = require('../models/notificationModel');

// // Single reusable function to notify any user by their ID
// const sendNotificationToUser = async ({ userId, title, body, data = {}, saveToDB = false }) => {
//     try {
//         // Optional: save notification in DB via model
//         if (saveToDB) {
//             await Notification.create({
//                 user_id: userId,
//                 title,
//                 message: body,
//                 type: data?.type || null,
//                 reference_id: data?.order_id || null,
//                 data
//             });
//         }

//         // Fetch FCM token
//         const [user] = await new Promise((resolve, reject) => {
//             db.query(
//                 "SELECT fcm_token FROM users_fcm_token WHERE user_id = ?",
//                 [userId],
//                 (err, results) => {
//                     if (err) return reject(err);
//                     resolve(results);
//                 }
//             );
//         });

//         if (!user || !user.fcm_token) {
//             console.warn(`No FCM token found for user ID: ${userId}`);
//             return { success: false, error: "No FCM token found" };
//         }

//         const message = {
//             token: user.fcm_token,
//             notification: { title, body },
//             data: Object.fromEntries(
//                 Object.entries(data).map(([k, v]) => [k, String(v)])
//             )
//         };

//         // const message = {
//         //     token: user.fcm_token,
//         //     data: {
//         //         title,
//         //         body,
//         //         ...Object.fromEntries(
//         //         Object.entries(data).map(([k, v]) => [k, String(v)])
//         //         )
//         //     }
//         //     // 🚫 DO NOT include `notification: { ... }`
//         // };

//         const firebaseApp = getFirebaseApp();
//         const response = await firebaseApp.messaging().send(message);

//         return { success: true, response };
//     } catch (error) {
//         console.error('Notification Error:', error);
//         return { success: false, error: error.message };
//     }
// };
// // const sendNotificationToUser = async ({ userId, title, body, data = {}, saveToDB = false }) => {
// //     try {
// //         // Optional: save notification in DB via model
// //         if (saveToDB) {
// //             await Notification.create({
// //                 user_id: userId,
// //                 title,
// //                 message: body,
// //                 type: data?.type || null,
// //                 reference_id: data?.order_id || null,
// //                 data
// //             });
// //         }

// //         // Fetch FCM token
// //         const [user] = await new Promise((resolve, reject) => {
// //             db.query(
// //                 "SELECT fcm_token FROM users_fcm_token WHERE user_id = ?",
// //                 [userId],
// //                 (err, results) => {
// //                     if (err) return reject(err);
// //                     resolve(results);
// //                 }
// //             );
// //         });

// //         if (!user || !user.fcm_token) {
// //             console.warn(`No FCM token found for user ID: ${userId}`);
// //             return { success: false, error: "No FCM token found" };
// //         }

// //         // ✅ CRITICAL: Ensure 'type' is in data for frontend detection
// //         const notificationData = {
// //             type: data?.type || 'general', // Default if not provided
// //             ...data
// //         };

// //         const message = {
// //             token: user.fcm_token,
// //             notification: { 
// //                 title, 
// //                 body 
// //             },
// //             data: Object.fromEntries(
// //                 Object.entries(notificationData).map(([k, v]) => [k, String(v)])
// //             ),
// //             // ✅ Add Android priority for immediate delivery
// //             android: {
// //                 priority: 'high', // Ensures immediate delivery
// //                 notification: {
// //                     sound: 'default',
// //                     channelId: 'default', // Make sure this channel exists in your Android app
// //                     priority: 'high'
// //                 }
// //             },
// //             // ✅ Add APNS priority for iOS
// //             apns: {
// //                 headers: {
// //                     'apns-priority': '10' // High priority for immediate delivery
// //                 },
// //                 payload: {
// //                     aps: {
// //                         sound: 'default',
// //                         contentAvailable: true
// //                     }
// //                 }
// //             }
// //         };

// //         const firebaseApp = getFirebaseApp();
// //         const response = await firebaseApp.messaging().send(message);

// //         console.log('✅ Notification sent successfully:', { userId, type: data?.type });
// //         return { success: true, response };
// //     } catch (error) {
// //         console.error('Notification Error:', error);
// //         return { success: false, error: error.message };
// //     }
// // };
// module.exports = sendNotificationToUser;
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

        // ✅ CRITICAL: Ensure all data fields are strings and include 'type'
        const notificationData = {
            type: data?.type || 'general',
            ...data
        };

        // Convert all data values to strings (FCM requirement)
        const stringifiedData = Object.fromEntries(
            Object.entries(notificationData).map(([k, v]) => [k, String(v)])
        );

        // ✅ For riders receiving new_order notifications, use data-only messages
        // This ensures notifications work even when app is killed
        const isNewOrderForRider = data?.type === 'new_order';

        const message = isNewOrderForRider ? {
            // 🎯 DATA-ONLY MESSAGE for riders (works better in killed state)
            token: user.fcm_token,
            data: {
                title,
                body,
                ...stringifiedData
            },
            // ✅ High priority for immediate delivery
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'high',
                    channelId: 'new_order_channel' // Make sure this exists in Android
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                    'apns-push-type': 'alert'
                },
                payload: {
                    aps: {
                        alert: {
                            title,
                            body
                        },
                        sound: 'default',
                        contentAvailable: true,
                        badge: 1
                    }
                }
            }
        } : {
            // 📢 DISPLAY NOTIFICATION for regular users (customers, vendors)
            token: user.fcm_token,
            notification: { 
                title, 
                body 
            },
            data: stringifiedData,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                    priority: 'high'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        contentAvailable: true
                    }
                }
            }
        };

        const firebaseApp = getFirebaseApp();
        const response = await firebaseApp.messaging().send(message);

        console.log(`✅ Notification sent to user ${userId} (type: ${data?.type || 'general'})`);
        return { success: true, response };
    } catch (error) {
        console.error('❌ Notification Error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = sendNotificationToUser;