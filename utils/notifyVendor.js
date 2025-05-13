const sendNotification = require("../utils/sendNotification");
const db = require("../config/db"); // adjust path if needed

const notifyVendor = async (vendor_id, order_id) => {
    try {
        // Get vendor FCM token from database
        const [vendor] = await new Promise((resolve, reject) => {
            db.query("SELECT fcm_token FROM users_fcm_token WHERE user_id = ?", [vendor_id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (!vendor || !vendor.fcm_token) {
            console.warn(`No FCM token found for vendor ID: ${vendor_id}`);
            return;
        }

        // Send the notification
        const title = "New Order Received";
        const body = `You have a new order #${order_id}`;
        const data = {
            order_id: order_id.toString(),
            vendor_id: vendor_id.toString()
        };

        const result = await sendNotification({
            fcmToken: vendor.fcm_token,
            title,
            body,
            data
        });

        if (result.success) {
            console.log(`Notification sent to vendor ${vendor_id} for order ${order_id}`);
        } else {
            console.error(`Notification failed for vendor ${vendor_id}:`, result.error);
        }
    } catch (err) {
        console.error("Error notifying vendor:", err);
    }
};

module.exports = notifyVendor;
