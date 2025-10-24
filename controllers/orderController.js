const OrderDetails = require("../models/orderDetails");
const OrderItem = require("../models/orderItem");
const OrderModel = require("../models/orderModel");
const sendNotificationToUser = require("../utils/sendNotificationToUser");
const {User} = require('../models/User');
const Product = require('../models/productModel');
const { generateOtp } = require('../utils/otpGenerator'); // adjust path if needed


 
// const createOrder = async (req, res) => {
//     try {
//         const { user_id, cart, payment_method, user_address_id, vendor_id, is_fast_delivery } = req.body;

//         if (!user_id || !cart || cart.length === 0) {
//             console.warn("Invalid order data received");
//             return res.status(400).json({ error: "Invalid order data" });
//         }

//         let total_quantity = 0;
//         let total_price = 0;
//         const order_uid = `ORD${Date.now()}`;

//         // ✅ 1. Validate Stock / Availability Before Creating Order
//         try {
//             const stockCheckPromises = cart.map(async (item) => {
//                 return new Promise((resolve, reject) => {
//                     // Step 1: Check if product has variants
//                     Product.countVariants(item.product_id, (err, count) => {
//                         if (err) return reject(err);

//                         if (count > 0) {
//                             // Restaurant Product → must have variant_id and check availability
//                             if (!item.variant_id) {
//                                 return reject(new Error(`Variant ID is required for product ${item.product_id}`));
//                             }

//                             Product.getVariantAvailability(item.variant_id, (err, variant) => {
//                                 if (err) return reject(err);
//                                 if (!variant || variant.is_available === 0) {
//                                     return reject(new Error(`Variant not available for product ${item.product_id}`));
//                                 }
//                                 resolve();
//                             });

//                         } else {
//                             // Normal product → check stock
//                             Product.getProductStock(item.product_id, (err, product) => {
//                                 if (err) return reject(err);
//                                 if (!product) return reject(new Error(`Product not found: ${item.product_id}`));
//                                 if (product.stock < item.quantity) {
//                                     return reject(new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`));
//                                 }
//                                 resolve();
//                             });
//                         }
//                     });
//                 });
//             });

//             await Promise.all(stockCheckPromises);
//         } catch (stockErr) {
//             console.warn("Stock/Availability validation failed:", stockErr.message);
//             return res.status(400).json({ error: stockErr.message });
//         }

//         // ✅ 2. Calculate totals
//         cart.forEach((item) => {
//             const hasVariant = item.variant_price && Number(item.variant_price) > 0;
//             const baseOrVariantPrice = hasVariant ? Number(item.variant_price) : Number(item.price || 0);
//             const addon_total = (item.addons || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
//             const item_unit_price = baseOrVariantPrice + addon_total;
//             const item_total_price = parseFloat((item_unit_price * item.quantity).toFixed(2));

//             total_quantity += item.quantity;
//             total_price = parseFloat((total_price + item_total_price).toFixed(2));
//         });

//         if (is_fast_delivery) {
//             total_price = parseFloat((total_price + 3).toFixed(2));
//         }

//         // ✅ 3. Create Order
//         OrderDetails.addOrder(
//             user_id,
//             total_quantity,
//             total_price,
//             payment_method,
//             user_address_id,
//             vendor_id,
//             is_fast_delivery,
//             order_uid,
//             async (err, result) => {
//                 if (err) {
//                     console.error("Error adding order details:", err);
//                     return res.status(500).json({ error: "Error adding order details" });
//                 }

//                 const order_id = result.insertId;

//                 try {
//                     const itemPromises = cart.map((item, index) => {
//                         const { product_id, quantity, price, variant_id = null, variant_price = 0, addons = [] } = item;
//                         const hasVariant = variant_price && Number(variant_price) > 0;
//                         const baseOrVariantPrice = hasVariant ? Number(variant_price) : Number(price || 0);
//                         const addon_total = addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
//                         const item_unit_price = baseOrVariantPrice + addon_total;
//                         const total_item_price = parseFloat((item_unit_price * quantity).toFixed(2));

//                         return new Promise((resolve, reject) => {
//                             OrderItem.addItem(
//                                 order_id,
//                                 user_id,
//                                 product_id,
//                                 quantity,
//                                 Number(price),
//                                 total_item_price,
//                                 variant_id,
//                                 Number(variant_price),
//                                 async (err, result) => {
//                                     if (err) {
//                                         console.error(`Error adding item ${index + 1}:`, err);
//                                         return reject(err);
//                                     }

//                                     const order_item_id = result.insertId;

//                                     try {
//                                         // ✅ 4. Decrease Stock for normal products
//                                         Product.countVariants(product_id, (err, count) => {
//                                             if (!err && count === 0) {
//                                                 Product.decreaseStock(product_id, quantity, (stockErr) => {
//                                                     if (stockErr) {
//                                                         console.error(`Error decreasing stock for product ${product_id}:`, stockErr);
//                                                     }
//                                                 });
//                                             }
//                                         });

//                                         // Addons
//                                         const addonPromises = addons.map((addon) => {
//                                             return new Promise((resolveAddon, rejectAddon) => {
//                                                 OrderItem.addAddon(order_item_id, addon.addon_id, Number(addon.price), (err) => {
//                                                     if (err) {
//                                                         console.error("Error adding addon:", err);
//                                                         return rejectAddon(err);
//                                                     }
//                                                     resolveAddon();
//                                                 });
//                                             });
//                                         });

//                                         await Promise.all(addonPromises);
//                                         resolve();
//                                     } catch (addonErr) {
//                                         console.error("Error adding addons:", addonErr);
//                                         reject(addonErr);
//                                     }
//                                 }
//                             );
//                         });
//                     });

//                     await Promise.all(itemPromises);

//                     res.status(201).json({
//                         message: "Order created successfully",
//                         order_id,
//                         order_uid
//                     });

//                     // ✅ Notification logic remains unchanged
//                     try {
//                         const userdata = await User.getUserDetailsByIdAsync(user_id, user_address_id);
//                         const username = userdata?.full_name || "User";
//                         const addressText = userdata?.full_address || "No address found";
//                         const productIds = cart.map(item => item.product_id);
//                         const productDetails = await Product.getProductDetailsByIdsAsync(productIds);

//                         const productMap = {};
//                         productDetails.forEach(prod => {
//                             productMap[prod.id] = prod;
//                         });

//                         const enrichedCart = cart.map(item => ({
//                             quantity: item.quantity,
//                             price: item.price,
//                             product_name: productMap[item.product_id]?.name || 'Unknown Product'
//                         }));

//                         sendNotificationToUser({
//                             userId: vendor_id,
//                             title: "New Order Received",
//                             body: `You have a new order #${order_id}`,
//                             saveToDB: true,
//                             data: {
//                                 order_id: order_id.toString(),
//                                 order_uid: order_uid.toString(),
//                                 type: "new_order",
//                                 customer: username.toString(),
//                                 customer_address: addressText.toString(),
//                                 order_cart: JSON.stringify(enrichedCart),
//                                 is_fast_delivery: is_fast_delivery.toString()
//                             }
//                         });
//                     } catch (fetchErr) {
//                         console.warn("Order created, but failed to fetch user or product data:", fetchErr);
//                     }

//                 } catch (itemErr) {
//                     console.error("Error adding order items or addons:", itemErr);
//                 }
//             }
//         );
//     } catch (error) {
//         console.error("Server error while creating order:", error);
//         if (!res.headersSent) {
//             res.status(500).json({ error: "Server error" });
//         }
//     }
// };

const createOrder = async (req, res) => {
    try {
        const { user_id, cart, payment_method, user_address_id, vendor_id, is_fast_delivery } = req.body;

        if (!user_id || !cart || cart.length === 0) {
            console.warn("Invalid order data received");
            return res.status(400).json({ error: "Invalid order data" });
        }

        let total_quantity = 0;
        let total_price = 0;
        const order_uid = `ORD${Date.now()}`;

        // ✅ 1. Validate stock
        try {
            const stockCheckPromises = cart.map(async (item) => {
                return new Promise((resolve, reject) => {
                    Product.countVariants(item.product_id, (err, count) => {
                        if (err) return reject(err);

                        if (count > 0) {
                            if (!item.variant_id) {
                                return reject(new Error(`Variant ID is required for product ${item.product_id}`));
                            }

                            Product.getVariantAvailability(item.variant_id, (err, variant) => {
                                if (err) return reject(err);
                                if (!variant || variant.is_available === 0) {
                                    return reject(new Error(`Variant not available for product ${item.product_id}`));
                                }
                                resolve();
                            });
                        } else {
                            Product.getProductStock(item.product_id, (err, product) => {
                                if (err) return reject(err);
                                if (!product) return reject(new Error(`Product not found: ${item.product_id}`));
                                if (product.stock < item.quantity) {
                                    return reject(new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`));
                                }
                                resolve();
                            });
                        }
                    });
                });
            });

            await Promise.all(stockCheckPromises);
        } catch (stockErr) {
            console.warn("Stock/Availability validation failed:", stockErr.message);
            return res.status(400).json({ error: stockErr.message });
        }

        // ✅ 2. Calculate totals
        cart.forEach((item) => {
            const hasVariant = item.variant_price && Number(item.variant_price) > 0;
            const baseOrVariantPrice = hasVariant ? Number(item.variant_price) : Number(item.price || 0);
            const addon_total = (item.addons || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
            const item_unit_price = baseOrVariantPrice + addon_total;
            const item_total_price = parseFloat((item_unit_price * item.quantity).toFixed(2));

            total_quantity += item.quantity;
            total_price = parseFloat((total_price + item_total_price).toFixed(2));
        });

        if (is_fast_delivery) {
            total_price = parseFloat((total_price + 3).toFixed(2));
        }

        // ✅ 3. Create order
        OrderDetails.addOrder(
    user_id,
    total_quantity,
    total_price,
    payment_method,
    user_address_id,
    vendor_id,
    is_fast_delivery,
    order_uid,
    async (err, result) => {
        if (err) {
            console.error("Error adding order details:", err);
            if (!res.headersSent)
                return res.status(500).json({ error: "Error adding order details" });
            return;
        }

        const order_id = result.insertId;

        try {
            // ✅ 1. Add all items and addons
            await Promise.all(cart.map(async (item, index) => {
                const { product_id, quantity, price, variant_id = null, variant_price = 0, addons = [] } = item;
                const hasVariant = variant_price && Number(variant_price) > 0;
                const baseOrVariantPrice = hasVariant ? Number(variant_price) : Number(price || 0);
                const addon_total = addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
                const item_unit_price = baseOrVariantPrice + addon_total;
                const total_item_price = parseFloat((item_unit_price * quantity).toFixed(2));

                // wrap addItem in Promise
                const result = await new Promise((resolve, reject) => {
                    OrderItem.addItem(
                        order_id,
                        user_id,
                        product_id,
                        quantity,
                        Number(price),
                        total_item_price,
                        variant_id,
                        Number(variant_price),
                        (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        }
                    );
                });

                const order_item_id = result.insertId;

                // decrease stock if needed
                Product.countVariants(product_id, (err, count) => {
                    if (!err && count === 0) {
                        Product.decreaseStock(product_id, quantity, (stockErr) => {
                            if (stockErr)
                                console.error(`Error decreasing stock for product ${product_id}:`, stockErr);
                        });
                    }
                });

                // handle addons
                await Promise.all(addons.map(addon => {
                    return new Promise((resolveAddon, rejectAddon) => {
                        OrderItem.addAddon(order_item_id, addon.addon_id, Number(addon.price), (err) => {
                            if (err) return rejectAddon(err);
                            resolveAddon();
                        });
                    });
                }));
            }));

            // ✅ 2. Get vendor and nearby riders (safe block)
            let vendorDetails = null;
            try {
                vendorDetails = await new Promise((resolve, reject) => {
                    Vendor.getVendorById(vendor_id, (err, result) => {
                        if (err) return reject(err);
                        resolve(result?.[0] || null);
                    });
                });
            } catch (e) {
                console.warn("Vendor fetch failed:", e.message);
            }

            let nearbyRiders = [];
            let searchRadiusKm = 3;

            if (vendorDetails) {
                const { lat: vendor_lat, lng: vendor_lng } = vendorDetails;

                try {
                    nearbyRiders = await new Promise((resolve, reject) => {
                        User.getNearbyRidersWithPolylines(
                            order_id,
                            vendor_id,
                            vendor_lat,
                            vendor_lng,
                            user_id,
                            user_address_id,
                            3,
                            (err, riders) => {
                                if (err) return reject(err);
                                resolve(riders || []);
                            }
                        );
                    });

                    if (nearbyRiders.length > 0) {
                        const maxDistance = Math.max(...nearbyRiders.map(r => parseFloat(r.distance_km) || 0));
                        searchRadiusKm = Math.ceil(maxDistance || 3);
                    }
                } catch (riderErr) {
                    console.warn("Failed to fetch nearby riders:", riderErr.message);
                }
            }

            // ✅ 3. Always respond (no matter what)
            if (!res.headersSent) {
                res.status(201).json({
                    message: "Order created successfully",
                    order_id,
                    order_uid,
                    total_price,
                    nearby_riders_count: nearbyRiders.length,
                    search_radius_km: searchRadiusKm,
                    nearby_riders: nearbyRiders.map(r => ({
                        user_id: r.user_id,
                        rider_lat: r.rider_lat,
                        rider_lng: r.rider_lng,
                        distance_km: r.distance_km
                    }))
                });
            }

            // ✅ 4. Continue background tasks (notifications)
            process.nextTick(async () => {
                try {
                    const userdata = await User.getUserDetailsByIdAsync(user_id, user_address_id);
                    const username = userdata?.full_name || "User";
                    const addressText = userdata?.full_address || "No address found";
                    const productIds = cart.map(item => item.product_id);
                    const productDetails = await Product.getProductDetailsByIdsAsync(productIds);

                    const productMap = {};
                    productDetails.forEach(prod => {
                        productMap[prod.id] = prod;
                    });

                    const enrichedCart = cart.map(item => ({
                        quantity: item.quantity,
                        price: item.price,
                        product_name: productMap[item.product_id]?.name || 'Unknown Product'
                    }));

                    sendNotificationToUser({
                        userId: vendor_id,
                        title: "New Order Received",
                        body: `You have a new order #${order_id}`,
                        saveToDB: true,
                        data: {
                            order_id: order_id.toString(),
                            order_uid: order_uid.toString(),
                            type: "new_order",
                            customer: username.toString(),
                            customer_address: addressText.toString(),
                            order_cart: JSON.stringify(enrichedCart),
                            is_fast_delivery: is_fast_delivery.toString()
                        }
                    });
                } catch (notifyErr) {
                    console.warn("Notification failed:", notifyErr.message);
                }
            });

        } catch (innerErr) {
            console.error("Error during order creation:", innerErr);
            if (!res.headersSent)
                res.status(500).json({ error: "Error while processing order" });
        }
    }
        );

    } catch (error) {
        console.error("Server error while creating order:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Server error" });
        }
    }
};


const updateOrderStatus = async (req, res) => {
    const { order_id, vendor_id, order_status } = req.body;

    if (!order_id || !order_status) {
        return res.status(400).json({ error: "Order ID and Order Status are required" });
    }

    try {
        // Step 1: Verify vendor owns the order if vendor_id is provided
        if (vendor_id) {
            const orderResult = await new Promise((resolve, reject) => {
                OrderDetails.findOrderByVendor(order_id, vendor_id, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
            if (orderResult.length === 0) {
                return res.status(403).json({ error: "Unauthorized to update this order" });
            }
        }

        // Step 2: Update order status (and rider_id if provided)
        await new Promise((resolve, reject) => {
            OrderDetails.updateOrderStatus(order_id, order_status, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
        // Step 3: Fetch user info
        const userResult = await new Promise((resolve, reject) => {
            OrderDetails.getUserIdByOrderId(order_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
        if (userResult.length === 0 || !userResult[0].user_id) {
            console.warn("User not found for notification");
            return res.status(200).json({ message: "Order updated, but user notification skipped" });
        }

        const { user_id, store_name, vendor_lat, vendor_lng, user_address_id, rider_id: assigned_rider_id } = userResult[0];
        const orderIdStr = order_id.toString();
        const notifications = [];
        // Step 4: Handle notifications
        switch (order_status) {
            case 1: // Vendor confirmed order
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Confirmed",
                    body: `Your order from ${store_name} is being prepared.`,
                    data: { order_id: orderIdStr, type: "order_update" },
                    saveToDB: true
                }));

                // Notify nearby riders only if vendor_id exists
                if (vendor_id) {
                    User.getNearbyRidersWithPolylines(
                        order_id,
                        vendor_id,
                        vendor_lat,
                        vendor_lng,
                        user_id,
                        user_address_id,
                        30, // radius in KM
                        (err, nearbyRiders) => {
                            if (err) return console.error("Error getting nearby riders:", err);
                            for (const rider of nearbyRiders) {
                                notifications.push(sendNotificationToUser({
                                    userId: String(rider.user_id || ""),
                                    title: "New Delivery Opportunity",
                                    body: `New order from ${store_name} is ready for pickup near you.`,
                                    data: {
                                        order_id: orderIdStr,
                                        type: "new_order",
                                        vendor_id: String(vendor_id),
                                        vendor_to_customer_distance_km: String(rider.vendor_to_customer_distance_km ?? "0.00"),
                                        rider_to_vendor_distance_km: String(rider.distance_km ?? "0.00")
                                    }
                                }));
                            }
                        }
                    );
                }
                break;

            case 3: // Rejected
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Rejected",
                    body: `Your order from ${store_name} was rejected. Please contact support if needed.`,
                    data: { order_id: orderIdStr, type: "order_update" },
                    saveToDB: true
                }));
                break;

            default:
                console.log("No specific notification for status:", order_status);
        }

        const notifResults = await Promise.allSettled(notifications);
        notifResults.forEach((result, index) => {
            if (result.status === "rejected") {
                console.warn(`Notification #${index + 1} failed:`, result.reason);
            }
        });

        return res.status(200).json({ message: `Order status updated to '${order_status}' successfully` });

    } catch (error) {
        console.error("Error in updateOrderStatus:", error);
        return res.status(500).json({ error: "Something went wrong while updating order status" });
    }
};


// const updateOrder = async (req, res, io) => {
//     const { order_id, actor_role, vendor_id, order_status, rider_id } = req.body;

//     if (!order_id || !order_status || !actor_role || !vendor_id) {
//         return res.status(400).json({ success: false, message: "Missing required fields" });
//     }

//     try {
//         // Step 1: Permission check
//         if (actor_role === 3) {
//             const orderResult = await new Promise((resolve, reject) => {
//                 OrderDetails.findOrderByVendor(order_id, vendor_id, (err, results) => {
//                     if (err) return reject(err);
//                     resolve(results);
//                 });
//             });
//             if (!orderResult || orderResult.length === 0) {
//                 return res.status(403).json({ success: false, message: "Vendor not authorized for this order" });
//             }
//         }

//         if (actor_role === 4) {
//             const isHandled = await OrderModel.handleOrder(order_id, vendor_id, order_status);
//             if (!isHandled) {
//                 return res.status(400).json({ success: false, message: "Order already handled" });
//             }
//         }

//         // Step 2: Update order status
//         await OrderModel.updateOrderStatus(order_id, order_status, rider_id);

//         // Step 3: Fetch order & user details
//         const userResult = await new Promise((resolve, reject) => {
//             OrderDetails.getUserIdByOrderId(order_id, (err, result) => {
//                 if (err) return reject(err);
//                 resolve(result);
//             });
//         });

//         if (!userResult || userResult.length === 0) {
//             return res.status(404).json({ success: false, message: "Order not found for notifications" });
//         }

//         const order = userResult[0];
//         const orderIdStr = order_id.toString();
//         const notifications = [];

//         // Step 4: Handle status-specific actions
//         switch (order_status) {
//             // Vendor confirmed
//             case 1:
//                 notifications.push(sendNotificationToUser({
//                     userId: order.user_id,
//                     title: "Order Confirmed",
//                     body: `Your order from ${order.store_name} is being prepared.`,
//                     data: { order_id: orderIdStr, type: "order_update" }
//                 }));

//                 if (actor_role === 3) {
//                     User.getNearbyRidersWithPolylines(
//                         order_id,
//                         vendor_id,
//                         order.vendor_lat,
//                         order.vendor_lng,
//                         order.user_id,
//                         order.user_address_id,
//                         3,
//                         (err, nearbyRiders) => {
//                             if (err) return console.error("Error fetching riders:", err);
//                             for (const rider of nearbyRiders) {
//                                 notifications.push(sendNotificationToUser({
//                                     userId: String(rider.user_id || ""),
//                                     title: "New Delivery Opportunity",
//                                     body: `New order from ${order.store_name} ready for pickup.`,
//                                     data: {
//                                         order_id: orderIdStr,
//                                         type: "new_order",
//                                         vendor_id: String(vendor_id),
//                                         vendor_to_customer_distance_km: String(rider.vendor_to_customer_distance_km ?? "0.00"),
//                                         rider_to_vendor_distance_km: String(rider.distance_km ?? "0.00")
//                                     }
//                                 }));
//                             }
//                         }
//                     );
//                 }
//                 break;

//             // Rider accepted
//             case 2: // Rider accepted
//                 notifications.push(sendNotificationToUser({
//                     userId: order.user_id,
//                     title: "Delivery Assigned",
//                     body: `A rider has been assigned to deliver your order.`,
//                     data: { order_id: orderIdStr, type: "order_update" }
//                 }));

//                 io.emit(`stop-buzzer-${orderIdStr}`, { orderId: orderIdStr });
//                 break;


//             // Rider reached vendor
//             case 3: // Rider reached vendor
//                 const otp = generateOtp(6);
//                 const expiry = new Date(Date.now() + 10 * 60 * 1000);
//                 await OrderModel.updateOtpAndStatus(orderIdStr, otp, expiry);

//                 await sendNotificationToUser({
//                     userId: rider_id,
//                     title: "OTP for Vendor",
//                     body: `Show this OTP to the vendor: ${otp}`,
//                     data: { order_id: orderIdStr, type: "otp_info" }
//                 });

//                 io.emit(`rider-reached-vendor-${orderIdStr}`, { orderId: orderIdStr, riderId: rider_id });
//                 break;

//             case 4: // Out for Delivery
//                 await OrderModel.updateOrderStatus(orderIdStr, 4, rider_id);

//                 notifications.push(sendNotificationToUser({
//                     userId: order.user_id,
//                     title: "Order Out for Delivery",
//                     body: `Your order is on the way with ${order.rider_firstname}.`,
//                     data: { order_id: orderIdStr, type: "order_update" }
//                 }));

//                 io.emit(`order-out-for-delivery-${orderIdStr}`, { orderId: orderIdStr, riderId: rider_id });
//                 break;  
                
//             // Rider delivered
//             case 5:
//                 await OrderModel.updateOrderStatus(order_id, 5, rider_id);
//                 notifications.push(sendNotificationToUser({
//                     userId: order.user_id,
//                     title: "Order Delivered",
//                     body: "Your order has been delivered successfully.",
//                     data: { order_id: orderIdStr, type: "order_update" }
//                 }));
//                 io.emit(`order-delivered-${orderIdStr}`, { orderId: orderIdStr, riderId: rider_id });
//                 break;

//             // Rejected
//             case 6:
//                 notifications.push(sendNotificationToUser({
//                     userId: order.user_id,
//                     title: "Order Rejected",
//                     body: `Your order from ${order.store_name} was rejected.`,
//                     data: { order_id: orderIdStr, type: "order_update" }
//                 }));

//                 io.emit(`order-rejected-${orderIdStr}`, { orderId: orderIdStr, riderId: rider_id });
//                 break;                

//             default:
//                 console.log("Unhandled status:", order_status);
//         }

//         // Step 5: Send notifications concurrently
//         const notifResults = await Promise.allSettled(notifications);
//         notifResults.forEach((result, index) => {
//             if (result.status === "rejected") {
//                 console.warn(`Notification #${index + 1} failed:`, result.reason);
//             }
//         });

//         return res.status(200).json({ success: true, message: `Order updated to status '${order_status}' successfully` });

//     } catch (error) {
//         console.error("Error in updateOrder:", error);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// };


const getOrdersByUserId = (req, res) => {
    const { user_id } = req.body;

    OrderModel.getOrdersByUserId(user_id, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found for this user." });
        }

        const ordersMap = {};

        results.forEach(row => {
            const {
                order_id, user_id, total_quantity, total_price,
                payment_method, order_created_at,
                product_id, product_name, product_description,
                product_price, total_item_price,
                address, type, floor, landmark,
                firstname, lastname, phonenumber
            } = row;

            if (!ordersMap[order_id]) {
                ordersMap[order_id] = {
                    order_id,
                    user_id,
                    total_quantity,
                    total_price,
                    payment_method,
                    order_created_at,
                    firstname,
                    lastname,
                    phonenumber,
                    address,
                    type,
                    floor,
                    landmark,
                    items: []
                };
            }

            ordersMap[order_id].items.push({
                product_id,
                product_name,
                product_description,
                product_price,
                total_item_price
            });
        });

        const groupedOrders = Object.values(ordersMap);
        res.status(200).json(groupedOrders);
    });
};

const getAllOrders = async (req, res) => {
    let { status, search, page, limit, vendor_id, start_date, end_date, ascending } = req.body;

    // Pagination setup
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    // ✅ Default date range: current month 1st -> today
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ✅ Normalize start_date and end_date (add 00:00:00 and 23:59:59 automatically)
    if (start_date) {
        start_date = new Date(`${start_date}T00:00:00.000Z`);
    } else {
        start_date = new Date(firstDayOfMonth.setHours(0, 0, 0, 0));
    }

    if (end_date) {
        end_date = new Date(`${end_date}T23:59:59.000Z`);
    } else {
        end_date = new Date(today.setHours(23, 59, 59, 999));
    }

    OrderModel.getAllOrders((err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found." });
        }

        // Filtering
        let filtered = results;

        // ✅ Filter by date range
        filtered = filtered.filter(row => {
            const createdAt = new Date(row.created_at);
            return createdAt >= start_date && createdAt <= end_date;
        });

        if (status) {
            filtered = filtered.filter(row => String(row.order_status) === String(status));
        }
        if (vendor_id) {
            filtered = filtered.filter(row => String(row.vendor_id) === String(vendor_id));
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(row =>
                (row.firstname && row.firstname.toLowerCase().includes(searchLower)) ||
                (row.lastname && row.lastname.toLowerCase().includes(searchLower)) ||
                (row.email && row.email.toLowerCase().includes(searchLower)) ||
                (row.store_address && row.store_address.toLowerCase().includes(searchLower)) ||
                (row.store_name && row.store_name.toLowerCase().includes(searchLower))
            );
        }

        // ✅ Sort orders by created_at
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return ascending ? dateA - dateB : dateB - dateA;
        });

        // Grouping orders
        const ordersMap = {};
        filtered.forEach(row => {
            const order_id = row.order_id;
            if (!ordersMap[order_id]) {
                ordersMap[order_id] = {
                    order_id: row.order_id,
                    user_id: row.user_id,
                    vendor_id: row.vendor_id,
                    total_quantity: row.total_quantity,
                    total_price: row.total_price,
                    payment_method: row.payment_method,
                    is_fast_delivery: row.is_fast_delivery,
                    order_status: row.order_status,
                    rider_status: row.rider_status,
                    created_at: row.created_at,

                    user: {
                        firstname: row.firstname,
                        lastname: row.lastname,
                        email: row.email,
                        prefix: row.prefix,
                        phonenumber: row.phonenumber,
                        custom_id: row.user_custom_id
                    },

                    vendor: {
                        store_name: row.store_name,
                        store_address: row.store_address,
                        store_image: row.store_image,
                        custom_id: row.vendor_custom_id
                    },

                    rider: {
                        firstname: row.rider_first_name,
                        lastname: row.rider_last_name,
                        custom_id: row.rider_custom_id,
                        profile_pic: row.rider_profile_pic
                    },

                    address: {
                        address: row.address,
                        type: row.type,
                        floor: row.floor,
                        landmark: row.landmark
                    },

                    products: []
                };
            }

            const existingProduct = ordersMap[order_id].products.find(p =>
                p.product_name === row.product_name &&
                p.product_size === row.product_size &&
                p.product_quantity === row.product_quantity &&
                p.single_item_price === row.single_item_price
            );

            if (existingProduct) {
                if (row.image_path && !existingProduct.gallery_images.includes(row.image_path)) {
                    existingProduct.gallery_images.push(row.image_path);
                }
            } else {
                ordersMap[order_id].products.push({
                    product_name: row.product_name,
                    product_size: row.product_size,
                    product_quantity: row.product_quantity,
                    total_item_price: row.total_item_price,
                    single_item_price: row.single_item_price,
                    featured_image: row.featured_image || null,
                    gallery_images: row.image_path ? [row.image_path] : []
                });
            }
        });

        const groupedOrders = Object.values(ordersMap);
        const paginated = groupedOrders.slice(offset, offset + limit);

        res.status(200).json({
            total: groupedOrders.length,
            page,
            limit,
            ascending: !!ascending,
            start_date: start_date.toISOString(),
            end_date: end_date.toISOString(),
            orders: paginated
        });
    });
};




const getOrderDetails = (req, res) => {
    const { order_id } = req.body;

    OrderModel.getOrdersByOrderId(order_id, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found for this vendor." });
        }

        const ordersMap = {};

        results.forEach(row => {
            const {
                order_id, preparing_time, order_uid, user_id, total_quantity, total_price,
                payment_method, order_status, rider_status, order_created_at,
                order_item_id, product_id, product_name, product_description,
                product_price, product_quantity, food_type,
                variant_id, variant_type, variant_value, variant_price,
                addon_id, addon_name, addon_price,
                address, type, floor, landmark,
                firstname, lastname, phonenumber, prefix, is_fast_delivery,
                store_name, store_address, vendor_phonenumber, vendor_prefix
            } = row;

            // Initialize order if it doesn't exist
            if (!ordersMap[order_id]) {
                ordersMap[order_id] = {
                    order_id,
                    order_uid,
                    preparing_time,
                    is_fast_delivery,
                    user_id,
                    total_quantity,
                    total_price,
                    payment_method,
                    order_status,
                    rider_status,
                    order_created_at,
                    firstname,
                    lastname,
                    phonenumber,
                    prefix,
                    address,
                    type,
                    floor,
                    landmark,
                    store_name,
                    store_address,
                    vendor_phonenumber,
                    vendor_prefix,
                    items: []
                };
            }

            // Check if this product with same variant already exists
            let existingItem = ordersMap[order_id].items.find(item =>
                item.order_item_id === order_item_id &&
                item.variant_id === variant_id
            );

            if (existingItem) {
                // Add addon to existing item
                if (addon_id) {
                    existingItem.addons.push({
                        addon_id,
                        addon_name,
                        addon_price
                    });
                    // Sum addon price as number
                    existingItem.total_item_price += parseFloat(addon_price ?? 0);
                }
            } else {
                // Calculate base price (variant price if exists, else product price)
                const basePrice = parseFloat(variant_price ?? product_price ?? 0);
                const totalItemPrice = basePrice + (addon_id ? parseFloat(addon_price ?? 0) : 0);

                // Create new order item
                const newItem = {
                    order_item_id,
                    product_id,
                    product_name,
                    product_description,
                    product_price,
                    product_quantity,
                    food_type,
                    variant_id,
                    variant_type,
                    variant_value,
                    variant_price,
                    total_item_price: totalItemPrice,
                    addons: addon_id ? [{
                        addon_id,
                        addon_name,
                        addon_price
                    }] : []
                };

                ordersMap[order_id].items.push(newItem);
            }
        });

        // Return single order object (first order)
        const groupedOrders = Object.values(ordersMap);
        res.status(200).json(groupedOrders[0]);
    });
};


const updateOrderTiming = (req, res) => {
  const { order_id, update_time, vendor_id } = req.body;

  OrderModel.getOrdertimeByOrderId(order_id, vendor_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (!results || results.length === 0) {
      return res.status(200).json({ message: "No order found for this user." });
    }

    const currentPreparingTime = results[0].preparing_time || 0;
    let updatedTime = currentPreparingTime;

    if (update_time.startsWith("+")) {
      updatedTime += parseInt(update_time.substring(1), 10);
    } else if (update_time.startsWith("-")) {
      updatedTime -= parseInt(update_time.substring(1), 10);
    } else {
      return res.status(400).json({ message: "Invalid update_time format. Use +5 or -3 etc." });
    }

    // Ensure time doesn't go negative
    if (updatedTime < 0) updatedTime = 0;

    OrderModel.updatePreparingTime(order_id, vendor_id, updatedTime, (updateErr) => {
      if (updateErr) return res.status(500).json({ error: "Failed to update preparing time" });

      return res.status(200).json({
        message: "Preparing time updated successfully",
        old_time: currentPreparingTime,
        new_time: updatedTime,
      });
    });
  });
};

const verifyOtp = async (req, res, io) => {
  try {
    const { order_id, entered_otp } = req.body;

    if (!order_id || !entered_otp) {
      return res.status(400).json({ message: "Missing order_id or entered_otp" });
    }

    const result = await OrderModel.verifyOtp(order_id, entered_otp);
    switch (result.status) {
      case 'not_found':
        return res.status(404).json({ message: "Order not found" });

      case 'already_verified':
        return res.status(400).json({ message: "OTP already verified" });

      case 'expired':
        return res.status(400).json({ message: "OTP has expired" });

      case 'invalid':
        return res.status(401).json({ message: "Invalid OTP" });

      case 'verified':
        // ✅ Update order status
        await OrderDetails.updateOrderStatus(order_id, 2);

        // ✅ Send notification to user
        await sendNotificationToUser({
          userId: result.user_id,
          title: "Order Picked Up",
          body: "Your order is on the way!",
          data: { order_id: order_id.toString(), type: "order_update" },
          saveToDB: true
        });

        // ✅ Emit socket event for OTP verified
        io.emit(`otp-verified-${order_id}`, { 
          orderId: order_id, 
          userId: result.user_id, 
          riderId: result.rider_id || null, 
          status: "verified" 
        });

        // ✅ Console log for debug
        console.log(`Socket emitted: otp-verified-${order_id}`, { 
          orderId: order_id, 
          userId: result.user_id, 
          riderId: result.rider_id || null, 
          status: "verified" 
        });

        return res.status(200).json({ 
          message: "OTP verified successfully. Order picked up." 
        });

      default:
        return res.status(500).json({ message: "Unexpected error" });
    }
  } catch (error) {
    console.error("verifyOtp error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const getOrdersByVendorIdandRiderID = (req, res) => {
    const { user_id, role_id } = req.body;
    const { filter } = req.params; // "today" or "all"

    OrderModel.getOrdersByUserId(user_id, role_id, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found for this user." });
        }

        // Filter orders for today if filter = "today"
        let filteredResults = results;
        if (filter && filter.toLowerCase() === "today") {
            const today = new Date().toISOString().split("T")[0];
            filteredResults = results.filter(row => {
                const orderDate = new Date(row.order_created_at).toISOString().split("T")[0];
                return orderDate === today;
            });
        }

        if (filteredResults.length === 0) {
            return res.status(200).json({
                message: filter && filter.toLowerCase() === "today"
                    ? "No order found for user."
                    : "No order found for this user."
            });
        }

        const ordersMap = {};

        filteredResults.forEach(row => {
            const {
                order_id, preparing_time, order_uid, user_id, total_quantity, total_price,
                payment_method, order_status, rider_status, order_created_at,
                order_item_id, product_id, product_name, product_description,
                product_price, product_quantity, food_type,
                variant_id, variant_type, variant_value, variant_price,
                addon_id, addon_name, addon_price, discount_percent,
                address, type, floor, landmark,
                firstname, lastname, phonenumber, is_fast_delivery, rider_unique_id,
                vendor_prefix, vendor_phonenumber, store_address, store_name, store_image,
                featured_image, gallery_image
            } = row;

            // Create order object if not exists
            if (!ordersMap[order_id]) {
                ordersMap[order_id] = {
                    order_id,
                    order_uid,
                    preparing_time,
                    is_fast_delivery,
                    user_id,
                    total_quantity,
                    total_price,
                    payment_method,
                    order_status,
                    rider_status,
                    order_created_at,
                    firstname,
                    lastname,
                    rider_unique_id,
                    phonenumber,
                    store_address,
                    store_name,
                    store_image,
                    vendor_prefix,
                    vendor_phonenumber,
                    address,
                    type,
                    floor,
                    landmark,
                    items: {}
                };
            }

            const order = ordersMap[order_id];

            // Create item if not exists
            if (!order.items[order_item_id]) {
                order.items[order_item_id] = {
                    order_item_id,
                    product_id,
                    product_name,
                    product_description,
                    product_price,
                    product_quantity,
                    food_type,
                    variant_id,
                    variant_type,
                    variant_value,
                    variant_price,
                    addons: [],
                    total_item_price: 0,
                    featured_image: featured_image || null,
                    gallery_images: gallery_image ? [gallery_image] : [],
                    discount_percent: discount_percent || 0
                };
            }

            const item = order.items[order_item_id];

            // Add gallery image if not already included
            if (gallery_image && !item.gallery_images.includes(gallery_image)) {
                item.gallery_images.push(gallery_image);
            }

            // Add base product price only once
            if (item.total_item_price === 0) {
                const basePrice = parseFloat(variant_id ? variant_price : product_price) || 0;
                let finalPrice = basePrice;

                // Apply discount if available
                if (item.discount_percent > 0) {
                    finalPrice = finalPrice - (finalPrice * (item.discount_percent / 100));
                }

                item.total_item_price += finalPrice;
            }

            // Add addon if exists & update total price
            if (addon_id && !item.addons.some(a => a.addon_id === addon_id)) {
                item.addons.push({
                    addon_id,
                    addon_name,
                    addon_price
                });

                item.total_item_price += parseFloat(addon_price || 0);
            }
        });

        // Convert items map → array before sending
        const finalOrders = Object.values(ordersMap).map(order => ({
            ...order,
            items: Object.values(order.items)
        }));

        finalOrders.sort((a, b) => new Date(b.order_created_at) - new Date(a.order_created_at));

        res.status(200).json(finalOrders);
    });
};






const orderHistory = async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    OrderModel.orderHistorybyUserID(user_id, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found." });
        }

        const ordersMap = {};

        results.forEach(row => {
            const order_id = row.order_id;

            // Initialize order
            if (!ordersMap[order_id]) {
                ordersMap[order_id] = {
                    order_id: row.order_id,
                    order_uid: row.order_uid,
                    user_id: row.user_id,
                    vendor_id: row.vendor_id,
                    total_quantity: row.total_quantity,
                    total_price: row.total_price,
                    payment_method: row.payment_method,
                    is_fast_delivery: row.is_fast_delivery,
                    order_status: row.order_status,
                    created_at: row.created_at,

                    user: {
                        firstname: row.user_firstname,
                        lastname: row.user_lastname,
                        email: row.user_email,
                        prefix: row.user_prefix,
                        phonenumber: row.user_phonenumber,
                        custom_id: row.user_custom_id
                    },

                    vendor: {
                        store_name: row.store_name,
                        store_address: row.store_address,
                        store_image: row.store_image,
                        custom_id: row.vendor_custom_id
                    },

                    address: {
                        address: row.user_address,
                        type: row.address_type,
                        floor: row.address_floor,
                        landmark: row.address_landmark
                    },

                    products: {}
                };
            }

            const order = ordersMap[order_id];

            // Initialize product
            if (!order.products[row.product_id]) {
                order.products[row.product_id] = {
                    product_id: row.product_id,
                    name: row.name,
                    product_quantity: row.product_quantity,
                    total_item_price: row.total_item_price,
                    single_item_price: row.single_item_price,
                    featured_image: row.featured_image || null,
                    gallery_images: [],
                    attributes: [],
                    variants: [],
                    addons: []
                };
            }

            const product = order.products[row.product_id];

            // Add gallery image if not already added
            if (row.gallery_image && !product.gallery_images.includes(row.gallery_image)) {
                product.gallery_images.push(row.gallery_image);
            }

            // Add attribute if not already added
            if (row.attribute_key && row.attribute_value) {
                const exists = product.attributes.find(a => a.attribute_key === row.attribute_key && a.attribute_value === row.attribute_value);
                if (!exists) {
                    product.attributes.push({ attribute_key: row.attribute_key, attribute_value: row.attribute_value });
                }
            }

            // Add selected variant (only once)
            if (row.variant_id && !product.variants.find(v => v.variant_id === row.variant_id)) {
                product.variants.push({
                    variant_id: row.variant_id,
                    variant_type: row.variant_type,
                    variant_value: row.variant_value,
                    variant_price: row.variant_price
                });
            }

            // Add selected addon
            if (row.addon_id && !product.addons.find(a => a.addon_id === row.addon_id)) {
                product.addons.push({
                    addon_id: row.addon_id,
                    addon_name: row.addon_name,
                    addon_price: row.addon_price
                });
            }
        });

        // Convert products from object to array
        const groupedOrders = Object.values(ordersMap).map(order => {
            order.products = Object.values(order.products);
            return order;
        });

        // Sort grouped orders by created_at DESC
        groupedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.status(200).json({
            total: groupedOrders.length,
            orders: groupedOrders
        });
    });
};



const handleOrderByRider = async (req, res, io) => {
  const { orderId, riderId, status } = req.body;

  // Allowed statuses
  if (![2, 3, 4, 5].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const orderIdStr = orderId.toString();

  try {
    const isHandled = await OrderModel.handleOrder(orderIdStr, riderId, status);
    if (!isHandled) {
      return res
        .status(400)
        .json({ success: false, message: "Order already handled" });
    }

    switch (status) {
      // Rider accepted
      case 2: {
        await OrderDetails.updateOrderStatusbyRider(orderIdStr, 2, riderId);

        const results = await OrderModel.getOrderandRiderDetails(orderIdStr);
        if (!results || results.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Order not found" });
        }

        const orderDetails = results[0];

        try {
          await sendNotificationToUser({
            userId: orderDetails.customer_id,
            title: "Meet Your Delivery Partner",
            body: `Your order is on the way with ${orderDetails.rider_firstname}. Contact: ${orderDetails.rider_number}`,
            data: {
              order_id: orderIdStr,
              rider_name: orderDetails.rider_firstname,
              rider_phone: orderDetails.rider_number.toString(),
              type: "order_update",
            },
             saveToDB: true
          });

          io.emit(`stop-buzzer-${orderIdStr}`, { orderId: orderIdStr });
          return res.json({
            success: true,
            message: "Order accepted by rider",
          });
        } catch (notificationError) {
          console.error("Notification error:", notificationError);
          return res.status(500).json({
            success: false,
            message: "Failed to send notification",
          });
        }
      }

      // Rider reached vendor → Generate OTP
      case 3: {
        await OrderDetails.updateOrderStatusbyRider(orderIdStr, 3, riderId);

        const otp = generateOtp(6);
        const expiry = new Date(Date.now() + 10 * 60 * 1000);

        await OrderModel.updateOtpAndStatus(orderIdStr, otp, expiry);

        try {
          await sendNotificationToUser({
            userId: riderId,
            title: "OTP for Vendor",
            body: `Show this OTP to the vendor: ${otp}`,
            data: { order_id: orderIdStr, type: "otp_info" },
            saveToDB: true
          });
        } catch (e) {
          console.error("OTP notification error:", e);
        }

        io.emit(`otp-generated-${orderIdStr}`, { orderId: orderIdStr, riderId, otp });
        console.log(`Socket emitted: otp-generated-${orderIdStr}`, {
          orderId: orderIdStr,
          riderId,
          otp,
        });

        return res.json({
          success: true,
          message: "OTP generated and sent to rider when reached vendor",
        });
      }

      // Rider delivered
      case 4: {
        await OrderDetails.updateOrderStatusbyRider(orderIdStr, 4, riderId);

        try {
          const customerId = await OrderModel.getCustomerId(orderIdStr);
          await sendNotificationToUser({
            userId: customerId,
            title: "Order Delivered",
            body: "Your order has been delivered successfully.",
            data: { order_id: orderIdStr, type: "order_update" },
            saveToDB: true
          });
        } catch (e) {
          console.error("Delivery notification error:", e);
        }

        io.emit(`order-delivered-${orderIdStr}`, { orderId: orderIdStr, riderId });
        return res.json({ success: true, message: "Order delivered" });
      }

      // Rider rejected
      case 5: {
        await OrderDetails.updateOrderStatusbyRider(orderIdStr, 5, riderId);
        io.emit(`order-rejected-${orderIdStr}`, { orderId: orderIdStr, riderId });
        return res.json({ success: true, message: "Order rejected by rider" });
      }
    }
  } catch (error) {
    console.error("Error in handleOrderByRider:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};




const orderDetailsForRider = (req, res) => {
  const { rider_id } = req.params;

  OrderModel.getOrdersByRiderId(rider_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "No order found for this rider." });
    }

    const ordersMap = {};

    results.forEach(row => {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          user_id: row.user_id,
          total_quantity: row.total_quantity,
          total_price: row.total_price,
          payment_method: row.payment_method,
          is_fast_delivery: row.is_fast_delivery,
          order_status: row.order_status,
          created_at: row.created_at,

          user: {
            firstname: row.firstname,
            lastname: row.lastname,
            email: row.email,
            prefix: row.prefix,
            phonenumber: row.phonenumber,
            custom_id: row.user_custom_id
          },

          vendor: {
            store_name: row.store_name,
            store_address: row.store_address,
            custom_id: row.vendor_custom_id
          },

          rider: {
            firstname: row.rider_first_name,
            lastname: row.rider_last_name,
            custom_id: row.rider_custom_id
          },

          address: {
            address: row.address,
            type: row.type,
            floor: row.floor,
            landmark: row.landmark
          },

          products: []
        };
      }

      ordersMap[row.order_id].products.push({
        product_name: row.product_name,
        product_size: row.product_size,
        product_quantity: row.product_quantity,
        total_item_price: row.total_item_price,
        single_item_price: row.single_item_price
      });
    });

    res.status(200).json({
    status: true,
    message: "Orders fetched successfully",
    data: Object.values(ordersMap)
    });
  });
};



 module.exports = { createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorIdandRiderID, getOrderDetails, updateOrderTiming, verifyOtp, getAllOrders, orderHistory, handleOrderByRider, orderDetailsForRider};