const OrderDetails = require("../models/orderDetails");
const OrderItem = require("../models/orderItem");
const OrderModel = require("../models/orderModel");
const sendNotificationToUser = require("../utils/sendNotificationToUser");
const {User} = require('../models/User');
const Product = require('../models/productModel');
const { generateOtp } = require('../utils/otpGenerator'); // adjust path if needed


 
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

        cart.forEach((item) => {
            const variant_price = Number(item.variant_price || 0);
            const addon_total = (item.addons || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
            const item_unit_price = Number(item.price || 0) + variant_price + addon_total;
            const item_total_price = parseFloat((item_unit_price * item.quantity).toFixed(2));

            total_quantity += item.quantity;
            total_price = parseFloat((total_price + item_total_price).toFixed(2));
        });

        // ✅ Add $3 if fast delivery is selected
        if (is_fast_delivery) {
            total_price = parseFloat((total_price + 3).toFixed(2));
        }

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
                    return res.status(500).json({ error: "Error adding order details" });
                }

                const order_id = result.insertId;

                try {
                    const itemPromises = cart.map((item, index) => {
                        const {
                            product_id,
                            quantity,
                            price,
                            variant_id = null,
                            variant_price = 0,
                            addons = []
                        } = item;

                        const addon_total = addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
                        const item_unit_price = Number(price || 0) + Number(variant_price || 0) + addon_total;
                        const total_item_price = parseFloat((item_unit_price * quantity).toFixed(2));

                        return new Promise((resolve, reject) => {
                            OrderItem.addItem(
                                order_id,
                                user_id,
                                product_id,
                                quantity,
                                Number(price),
                                total_item_price,
                                variant_id,
                                Number(variant_price),
                                async (err, result) => {
                                    if (err) {
                                        console.error(`Error adding item ${index + 1}:`, err);
                                        return reject(err);
                                    }

                                    const order_item_id = result.insertId;

                                    try {
                                        const addonPromises = addons.map((addon) => {
                                            return new Promise((resolveAddon, rejectAddon) => {
                                                OrderItem.addAddon(
                                                    order_item_id,
                                                    addon.addon_id,
                                                    Number(addon.price),
                                                    (err) => {
                                                        if (err) {
                                                            console.error("Error adding addon:", err);
                                                            return rejectAddon(err);
                                                        }
                                                        resolveAddon();
                                                    }
                                                );
                                            });
                                        });

                                        await Promise.all(addonPromises);
                                        resolve();
                                    } catch (addonErr) {
                                        console.error("Error adding addons:", addonErr);
                                        reject(addonErr);
                                    }
                                }
                            );
                        });
                    });

                    await Promise.all(itemPromises);

                    res.status(201).json({
                        message: "Order created successfully",
                        order_id,
                        order_uid
                    });

                    // Optional: Notification logic (unchanged)
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
                    } catch (fetchErr) {
                        console.warn("Order created, but failed to fetch user or product data:", fetchErr);
                    }

                } catch (itemErr) {
                    console.error("Error adding order items or addons:", itemErr);
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
        const { user_id, store_name, vendor_lat, vendor_lng, user_address_id, store_address, address } = userResult[0];

        // Step 4: Handle notification logic
        const orderIdStr = order_id.toString();
        const notifications = [];

        switch (order_status) {
            case 1:
            notifications.push(sendNotificationToUser({
                userId: user_id,
                title: "Order Confirmed",
                body: `Your order from ${store_name} is being prepared.`,
                data: { order_id: orderIdStr, type: "order_update" }
            }));

            // Get nearby riders with both polylines
            const nearbyRiders = await User.getNearbyRidersWithPolylines(
                vendor_id,
                vendor_lat,
                vendor_lng,
                user_id,
                user_address_id,
                3 // radius in KM
            );

            console.log("riders are", nearbyRiders);

            for (const rider of nearbyRiders) {
                notifications.push(sendNotificationToUser({
                userId: String(rider.user_id || ""),
                title: "New Delivery Opportunity",
                body: `New order from ${store_name} is ready for pickup near you.`,
                data: {
                    order_id: String(orderIdStr || ""),
                    type: "new_order",
                    vendor_id: String(vendor_id || ""),
                    distance_from_vendor: String(rider.distance_km ?? "0"),
                    distance_from_vendor_to_customer: String(rider.vendor_to_customer_distance_km ?? "0"),
                    vendor_address: String(store_address || ""),
                    user_address: String(address || ""),
                    vendor_name: String(store_name || "")
                }
                }));
            }
            break;



            case 2:
                const otp = generateOtp(6);
                const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now
                console.log(orderIdStr,otp,expiry)
                // Call model function
                await OrderModel.updateOtpAndStatus(orderIdStr, otp, expiry);
                // Notify user
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Delivery Assigned",
                    body: `A rider has been assigned to deliver your order.`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));

                // Notify rider
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "OTP for Vendor",
                    body: `Show this OTP to the vendor: ${otp}`,
                    data: { order_id: orderIdStr, type: "otp_info" }
                }));
                break;

            case 3:
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Picked Up",
                    body: `Your order is on the way!`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));
                break;

            case 4:
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Delivered",
                    body: `Your order has been delivered successfully.`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));
                break;
            
            case 5:
                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Order Rejected",
                    body: `Your order from ${store_name} was rejected. Please contact support if needed.`,
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

const getAllOrders = async (req, res) => {
    let { status, search, page, limit, vendor_id } = req.body;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    OrderModel.getAllOrders((err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found." });
        }

        // Filtering
        let filtered = results;
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

            // Find if product already added (to group gallery images)
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
            orders: paginated
        });
    });
};


const getOrderDetails = (req, res) => {
  const { order_id } = req.body;

  OrderModel.getOrdersByOrderId(order_id, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (!results || results.length === 0) {
      return res.status(200).json({ message: "No order found for this ID." });
    }

    const order = {
      order_id: results[0].order_id,
      user_id: results[0].user_id,
      total_quantity: results[0].total_quantity,
      total_price: results[0].total_price,
      payment_method: results[0].payment_method,
      is_fast_delivery: results[0].is_fast_delivery,
      order_status: results[0].order_status,
      created_at: results[0].created_at,

      user: {
        firstname: results[0].firstname,
        lastname: results[0].lastname,
        email: results[0].email,
        prefix: results[0].prefix,
        phonenumber: results[0].phonenumber,
        custom_id: results[0].user_custom_id
      },

      vendor: {
        store_name: results[0].store_name,
        store_address: results[0].store_address,
        custom_id: results[0].vendor_custom_id
      },

      rider: {
        firstname: results[0].rider_first_name,
        lastname: results[0].rider_last_name,
        custom_id: results[0].rider_custom_id
      },

      address: {
        address: results[0].address,
        type: results[0].type,
        floor: results[0].floor,
        landmark: results[0].landmark
      },

      products: []
    };

    results.forEach(row => {
      order.products.push({
        product_name: row.product_name,
        product_size: row.product_size,
        product_quantity: row.product_quantity,
        total_item_price: row.total_item_price,
        single_item_price: row.single_item_price
      });
    });

    res.status(200).json(order);
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

const verifyOtp = async (req, res) => {
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
        await sendNotificationToUser({
          userId: result.user_id,
          title: "Order Picked Up",
          body: "Your order is on the way!",
          data: { order_id: order_id.toString(), type: "order_update" }
        });
        return res.status(200).json({ message: "OTP verified successfully. Order picked up." });

      default:
        return res.status(500).json({ message: "Unexpected error" });
    }
  } catch (error) {
    console.error("verifyOtp error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOrdersByVendorId = (req, res) => {
    const { vendor_id } = req.body;

    OrderModel.getOrdersByUserId(vendor_id, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found for this vendor." });
        }

        const ordersMap = {};

        results.forEach(row => {
            const {
                order_id, preparing_time, order_uid, user_id, total_quantity, total_price,
                payment_method, order_status, order_created_at,
                product_id, product_name, product_description,
                product_price, food_type, total_item_price,
                variant_id, variant_type, variant_value, variant_price,
                addon_id, addon_name, addon_price,
                address, type, floor, landmark,
                firstname, lastname, phonenumber, is_fast_delivery
            } = row;

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

            // Find if the item (product + variant) already exists
            const existingItem = ordersMap[order_id].items.find(item =>
                item.product_id === product_id &&
                item.variant_id === variant_id
            );

            const addonObj = addon_id
                ? {
                    addon_id,
                    addon_name,
                    addon_price
                }
                : null;

            if (existingItem) {
                // Add addon to existing item
                if (addonObj) {
                    existingItem.addons.push(addonObj);
                }
            } else {
                // Create new item with optional addon
                const newItem = {
                    product_id,
                    product_name,
                    product_description,
                    product_price,
                    food_type,
                    total_item_price,
                    variant_id,
                    variant_type,
                    variant_value,
                    variant_price,
                    addons: addonObj ? [addonObj] : []
                };
                ordersMap[order_id].items.push(newItem);
            }
        });

        const groupedOrders = Object.values(ordersMap);
        res.status(200).json(groupedOrders);
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
        // Group orders by order_id
        const ordersMap = {};

        results.forEach(row => {
            const order_id = row.order_id;
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
                if (row.product_gallery_image && !existingProduct.gallery_images.includes(row.product_gallery_image)) {
                    existingProduct.gallery_images.push(row.product_gallery_image);
                }
            } else {
                ordersMap[order_id].products.push({
                    product_name: row.product_name,
                    product_size: row.product_size,
                    product_quantity: row.product_quantity,
                    total_item_price: row.total_item_price,
                    single_item_price: row.single_item_price,
                    featured_image: row.featured_image || null,
                    gallery_images: row.product_gallery_image ? [row.product_gallery_image] : []
                });
            }
        });

        const groupedOrders = Object.values(ordersMap);

        res.status(200).json({
            total: groupedOrders.length,
            orders: groupedOrders
        });
    });
};

const handleOrderByRider = async (req, res, io) => {
  const { orderId, riderId, action } = req.body;

  // Validate action (0 = accept, 1 = reject)
  if (![0, 1].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  const riderStatus = action === 0 ? 2 : 5; // 2 = accepted, 5 = rejected

  try {
    const isHandled = await OrderModel.handleOrder(orderId, riderId, riderStatus);

    if (!isHandled) {
      return res.status(400).json({ success: false, message: `Order already handled` });
    }

    if (action === 0) {
      // Handle ACCEPT logic
      OrderModel.getOrderandRiderDetails(orderId, async (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!results || results.length === 0) {
          return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const orderDetails = results[0];

        try {
          await sendNotificationToUser({
            userId: orderDetails.customer_id,
            title: "Meet Your Delivery Partner",
            body: `Your order is on the way with ${orderDetails.rider_firstname}. Contact: ${orderDetails.rider_number}`,
            data: {
              order_id: orderId.toString(),
              rider_name: orderDetails.rider_firstname,
              rider_phone: orderDetails.rider_number.toString(),
              type: "order_update"
            }
          });

          io.emit(`stop-buzzer-${orderId}`, { orderId });

          return res.status(200).json({ success: true, message: 'Order accepted by rider' });
        } catch (notificationError) {
          console.error("Notification error:", notificationError);
          return res.status(500).json({ success: false, message: 'Failed to send notification' });
        }
      });
    } else {
      // Handle REJECT logic
      io.emit(`order-rejected-${orderId}`, { orderId, riderId });
      return res.status(200).json({ success: true, message: 'Order rejected by rider' });
    }
  } catch (error) {
    console.error("Error in handleOrderByRider:", error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


 module.exports = { createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorId, getOrderDetails, updateOrderTiming, verifyOtp, getAllOrders, orderHistory, handleOrderByRider};