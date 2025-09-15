const schedule = require("node-schedule");
const ParcelModel = require("../models/parcelModel");
const sendNotificationToUser = require("../utils/sendNotificationToUser");
const {User} = require("../models/User"); // ensure this exports getUserDetailsByIdAsync + getNearbyRidersWithPolylines

const createParcel = async (req, res) => {
    console.log("📦 Parcel request received");

    try {
        const {
            pickup,
            drop,
            parcel,
            userId,
            parcelComment,
            deliveryDate,
            scheduledComments
        } = req.body;

        // ✅ Validate request
        if (!pickup || !drop || !userId || !parcel || parcel.length === 0 || !deliveryDate) {
            console.warn("Invalid parcel data received");
            return res.status(400).json({ error: "Invalid parcel data" });
        }

        const parcel_uid = `PARCEL${Date.now()}`;
        const totalWeight = parcel.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

        // ✅ Insert into DB
        ParcelModel.addParcel(
            userId,
            pickup.address,
            pickup.coords.lat,
            pickup.coords.lng,
            drop.address,
            drop.coords.lat,
            drop.coords.lng,
            totalWeight,
            JSON.stringify(parcel),
            parcelComment,
            deliveryDate,
            scheduledComments,
            parcel_uid,
            async (err, result) => {
                if (err) {
                    console.error("❌ Error adding parcel:", err);
                    return res.status(500).json({ error: "Error adding parcel" });
                }

                const parcel_id = result.insertId;

                res.status(201).json({
                    message: "Parcel created successfully",
                    parcel_id,
                    parcel_uid
                });

                try {
                    // Inside your async controller
                    const userdata = await new Promise((resolve, reject) => {
                        User.findById(userId, (err, user) => {
                            if (err) return reject(err);
                            resolve(user);
                        });
                    });

                    const username = userdata
                        ? `${userdata.firstname ?? ""} ${userdata.lastname ?? ""}`.trim()
                        : "User";
                    const scheduledDate = new Date(deliveryDate);

                    if (scheduledDate > new Date()) {
                        console.log(`⏰ Notification scheduled for parcel #${parcel_id} at ${scheduledDate}`);

                        schedule.scheduleJob(scheduledDate, async () => {
                            console.log(`🚚 Triggering rider search for parcel #${parcel_id}`);

                            User.getNearbyRidersWithPolylinesForParcel(
                                parcel_id,
                                pickup.coords.lat,
                                pickup.coords.lng,
                                3, // radius in KM
                                async (err, nearbyRiders) => {
                                    if (err) return console.error("Error getting nearby riders:", err);
                                    for (const rider of nearbyRiders) {
                                        await sendNotificationToUser({
                                            userId: String(rider.user_id || ""),
                                            title: "New Parcel Delivery",
                                            body: `New parcel request #${parcel_id} from ${username}`,
                                            data: {
                                                type: "new_parcel",
                                                parcel_id: parcel_id.toString(),
                                                customer: username.toString(),
                                                pickup: pickup.address,
                                                drop: drop.address,
                                                deliveryDate: deliveryDate,
                                                rider_to_pickup_distance_km: String(rider.distance_km ?? "0.00")
                                            }
                                        });
                                    }
                                }
                            );
                        });
                    } else {
                        console.warn(`⚠️ Delivery date is in the past, notifying riders immediately for parcel #${parcel_id}`);

                        User.getNearbyRidersWithPolylines(
                            parcel_id,
                            null,
                            pickup.coords.lat,
                            pickup.coords.lng,
                            userId,
                            null,
                            3,
                            async (err, nearbyRiders) => {
                                if (err) return console.error("Error getting nearby riders:", err);

                                for (const rider of nearbyRiders) {
                                    await sendNotificationToUser({
                                        userId: String(rider.user_id || ""),
                                        title: "New Parcel Delivery",
                                        body: `New parcel request #${parcel_id} from ${username}`,
                                        data: {
                                            parcel_id: parcel_id.toString(),
                                            parcel_uid: parcel_uid.toString(),
                                            customer: username.toString(),
                                            pickup: pickup.address,
                                            drop: drop.address,
                                            deliveryDate: deliveryDate,
                                            parcelComment: parcelComment || "",
                                            scheduledComments: scheduledComments || "",
                                            rider_to_pickup_distance_km: String(rider.distance_km ?? "0.00")
                                        }
                                    });
                                }
                            }
                        );
                    }
                } catch (notifErr) {
                    console.warn("Parcel created, but failed to schedule rider notifications:", notifErr);
                }
            }
        );
    } catch (error) {
        console.error("Server error while creating parcel:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Server error" });
        }
    }
};

module.exports = { createParcel };
