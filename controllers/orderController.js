const OrderDetails = require("../models/orderDetails");
const OrderItem = require("../models/orderItem");
const OrderModel = require("../models/orderModel");
const sendNotificationToUser = require("../utils/sendNotificationToUser");
const {User} = require('../models/User');
const Product = require('../models/productModel');

 
const createOrder = async (req, res) => {
    try {
        const { user_id, cart, payment_method, user_address_id, vendor_id, is_fast_delivery } = req.body;

        if (!user_id || !cart || cart.length === 0) {
            console.warn("Invalid order data received");
            return res.status(400).json({ error: "Invalid order data" });
        }

        let total_quantity = 0;
        let total_price = 0;

        cart.forEach((item) => {
            total_quantity += item.quantity;
            total_price += item.quantity * item.price;
        });

        OrderDetails.addOrder(
            user_id,
            total_quantity,
            total_price,
            payment_method,
            user_address_id,
            vendor_id,
            is_fast_delivery,
            async (err, result) => {
                if (err) {
                    console.error("Error adding order details:", err);
                    return res.status(500).json({ error: "Error adding order details" });
                }

                const order_id = result.insertId;

                try {
                    const itemPromises = cart.map((item, index) => {
                        const { product_id, quantity, price } = item;
                        const total_item_price = quantity * price;

                        return new Promise((resolve, reject) => {
                            OrderItem.addItem(order_id, user_id, product_id, quantity, price, total_item_price, (err, result) => {
                                if (err) {
                                    console.error(`Error adding item ${index + 1}:`, err);
                                    return reject(err);
                                }
                                resolve(result);
                            });
                        });
                    });

                    await Promise.all(itemPromises);

                    res.status(201).json({ message: "Order created successfully", order_id });

                    // Fetch user and address details
                    try {
                        const userdata = await User.getUserDetailsByIdAsync(user_id, user_address_id);
                        const username = userdata?.full_name || "User";
                        const addressText = userdata?.full_address || "No address found";

                        // Extract product_ids and fetch their details
                        const productIds = cart.map(item => item.product_id);
                        
                        // Assuming you have a Product model method like this:
                        // Product.getProductDetailsByIds(productIds, callback)
                        const productDetails = await Product.getProductDetailsByIdsAsync(productIds);

                        // Map product_id to detail for quick lookup
                        const productMap = {};
                        productDetails.forEach(prod => {
                            productMap[prod.id] = prod;
                        });

                        // Enrich the cart
                        const enrichedCart = cart.map(item => ({
                            quantity: item.quantity,
                            price: item.price,
                            product_name: productMap[item.product_id]?.name || 'Unknown Product'
                        }));
                        // Send notification with enriched cart
                        sendNotificationToUser({
                            userId: vendor_id,
                            title: "New Order Received",
                            body: `You have a new order #${order_id}`,
                            data: {
                                order_id: order_id.toString(),
                                type: "new_order",
                                customer:username,
                                customer_address: addressText,
                                order_cart: JSON.stringify(enrichedCart) // Must be string for FCM
                            }
                        });

                    } catch (fetchErr) {
                        console.warn("Order created, but failed to fetch user or product data:", fetchErr);
                    }
                } catch (itemErr) {
                    console.error("Error adding order items:", itemErr);
                    // Don't send response here, it’s already sent above
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


// accept order by vendor
const updateOrderStatus = async (req, res) => {
    const { order_id, vendor_id, order_status } = req.body;

    if (!vendor_id || !order_id || !order_status) {
        return res.status(400).json({ error: "Order ID, Vendor ID, and Order Status are required" });
    }

    try {
        // Step 1: Verify vendor owns the order
        const orderResult = await new Promise((resolve, reject) => {
            OrderDetails.findOrderByVendor(order_id, vendor_id, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (orderResult.length === 0) {
            return res.status(403).json({ error: "Unauthorized to update this order" });
        }

        // Step 2: Update order status
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
        const { user_id, store_name, vendor_lat, vendor_lng, user_address_id } = userResult[0];

        // Step 4: Handle notification logic
        const orderIdStr = order_id.toString();
        const notifications = [];

        switch (order_status) {
            case 'confirmed&processing':
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Confirmed",
                    body: `Your order from ${store_name} is being prepared.`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));

                // Notify nearby riders
                const nearbyRiders = await User.getNearbyRiders(vendor_lat, vendor_lng, 3);
                const customerVendorDistance = await User.getTravelDistance(vendor_lat, vendor_lng,user_id,user_address_id);
                console.log("riders are",nearbyRiders)
                console.log("vendor and customer distance",customerVendorDistance)
                for (const rider of nearbyRiders) {
                    notifications.push(sendNotificationToUser({
                        userId: rider.user_id,
                        title: "New Delivery Opportunity",
                        body: `New order from ${store_name} is ready for pickup near you.`,
                        data: {
                            order_id: orderIdStr,
                            type: "delivery_request",
                            vendor_id: vendor_id.toString(),
                            distance_from_vendor: rider.distance_km.toString(),
                            distance_from_vendor_to_customer: customerVendorDistance.distance_km.toString(),
                        }
                    }));
                }
                break;

            case 'assigned':
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Delivery Assigned",
                    body: `A rider has been assigned to deliver your order.`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));
                break;

            case 'picked_up':
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Picked Up",
                    body: `Your order is on the way!`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));
                break;

            case 'delivered':
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Delivered",
                    body: `Your order has been delivered successfully.`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));
                break;

            default:
                console.log("No specific notification for status:", order_status);
        }

        // Wait for all notifications to send
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

const getOrdersByVendorId = (req, res) => {
    const { vendor_id } = req.body;

    OrderModel.getOrdersByUserId(vendor_id, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found for this user." });
        }

        const ordersMap = {};

        results.forEach(row => {
            const {
                order_id, user_id, total_quantity, total_price,
                payment_method, order_created_at,order_status,
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
                    order_status,
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


 
 module.exports = { createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorId };