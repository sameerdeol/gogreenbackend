const schedule = require("node-schedule");
const ParcelModel = require("../models/parcelModel");
const sendNotificationToUser = require("../utils/sendNotificationToUser");
const {User} = require("../models/User"); // ensure this exports getUserDetailsByIdAsync + getNearbyRidersWithPolylines

const createParcel = async (req, res) => {
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

        // ✅ Format deliveryDate to MySQL-compatible format (YYYY-MM-DD HH:MM:SS)
        const formattedDeliveryDate = new Date(deliveryDate)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');

        const parcel_uid = `PARCEL${Date.now()}`;
        const totalWeight = parcel.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

        // ✅ Insert into DB with formatted date
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
            formattedDeliveryDate,
            scheduledComments,
            parcel_uid,
            async (err, result) => {
                if (err) {
                    console.error("❌ Error adding parcel:", err);
                    return res.status(500).json({ error: "Error adding parcel" });
                }

                const parcel_id = result.insertId;

                // ✅ Send a nice success message to frontend
                res.status(201).json({
                    success: true,
                    message: `✅ Parcel #${parcel_uid} created successfully and scheduled for delivery on ${formattedDeliveryDate}`,
                    parcel_id,
                    parcel_uid,
                    delivery_date: formattedDeliveryDate
                });

                try {
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
                        schedule.scheduleJob(scheduledDate, async () => {
                            User.getNearbyRidersWithPolylinesForParcel(
                                parcel_id,
                                pickup.coords.lat,
                                pickup.coords.lng,
                                3,
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
                                                deliveryDate: formattedDeliveryDate,
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
                                            deliveryDate: formattedDeliveryDate,
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

const getParcel = (req, res) => {
    ParcelModel.findall(req.params.user_id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching parcels', error: err });
        if (!result.length) return res.status(404).json({ success: false, message: 'parcels not found' });
        res.status(200).json({ success: true, parcels: result });
    });
};
const getParcelbyID = (req, res) => {
    ParcelModel.findById(req.params.id,req.params.user_id, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error fetching parcels', error: err });
        if (!result) return res.status(404).json({ success: false, message: 'parcels not found' });
        res.status(200).json({ success: true, parcels: result});
    });
};

module.exports = { createParcel, getParcel, getParcelbyID };
