const OrderDetails = require("../models/orderDetails");
const OrderItem = require("../models/orderItem");
const OrderModel = require("../models/orderModel");
const sendNotificationToUser = require("../utils/sendNotificationToUser");


 
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

        // Insert into OrderDetails
        OrderDetails.addOrder(user_id, total_quantity, total_price, payment_method, user_address_id, vendor_id, is_fast_delivery, async (err, result) => {
            if (err) {
                console.error("Error adding order details:", err);
                return res.status(500).json({ error: "Error adding order details" });
            }

            const order_id = result.insertId;

            try {
                // Insert all items
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

                // ✅ Now safe to send response
                res.status(201).json({ message: "Order created successfully", order_id });

                // 🔔 Notify vendor after sending response (non-blocking)
                sendNotificationToUser({
                    userId: vendor_id,
                    title: "New Order Received",
                    body: `You have a new order #${order_id}`,
                    data: {
                        order_id: order_id.toString(),
                        type: "new_order"
                    }
                });

            } catch (itemErr) {
                console.error("Error adding order items:", itemErr);
                // ❌ Don't send response here if already sent
            }
        });

    } catch (error) {
        console.error("Server error while creating order:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Server error" });
        }
    }
};

// accept order by vendor
const acceptOrder = async (req, res) => {
    const { order_id, vendor_id } = req.body;

    if (!vendor_id || !order_id) {
        return res.status(400).json({ error: "Order ID and Vendor ID are required" });
    }

    // Step 1: Verify vendor owns the order
    OrderDetails.findOrderByVendor(order_id, vendor_id, (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(403).json({ error: "Unauthorized to accept this order" });
        }

        // Step 2: Update order status
        OrderDetails.updateOrderStatus(order_id, 'accepted', (updateErr) => {
            if (updateErr) {
                console.error("Error updating order:", updateErr);
                return res.status(500).json({ error: "Could not update order status" });
            }

            // Step 3: Fetch user FCM token
            OrderDetails.getUserIdByOrderId(order_id, async (usererr, userresult) => {
                if (usererr || userresult.length === 0 || !userresult[0].user_id) {
                    console.warn("FCM token not found or error occurred:", tokenErr);
                    return res.status(200).json({ message: "Order accepted, notification not sent" });
                }

                const userId = userresult[0].user_id;

                const notifResult = await sendNotificationToUser({
                    userId,
                    title: "Order Accepted",
                    body: `Your order #${order_id} has been accepted by the vendor.`,
                    data: { order_id: order_id.toString(), type: "order_update" }
                });

                if (!notifResult.success) {
                    console.warn("Notification sending failed:", notifResult.error);
                }
                
                return res.status(200).json({ message: "Order accepted successfully" });
            });
        });
    });
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


 
 module.exports = { createOrder, getOrdersByUserId, acceptOrder };