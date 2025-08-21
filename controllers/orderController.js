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
            const hasVariant = item.variant_price && Number(item.variant_price) > 0;
            const baseOrVariantPrice = hasVariant ? Number(item.variant_price) : Number(item.price || 0);

            const addon_total = (item.addons || []).reduce((sum, a) => sum + Number(a.price || 0), 0);

            const item_unit_price = baseOrVariantPrice + addon_total;
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
                        const hasVariant = variant_price && Number(variant_price) > 0;
                        const baseOrVariantPrice = hasVariant ? Number(variant_price) : Number(price || 0);
                        const addon_total = addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
                        const item_unit_price = baseOrVariantPrice + addon_total;
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

const updateOrderStatus = async (req, res) => {
    const { order_id, vendor_id, order_status, rider_id } = req.body;

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
                    data: { order_id: orderIdStr, type: "order_update" }
                }));

                // Notify nearby riders only if vendor_id exists
                if (vendor_id) {
                    User.getNearbyRidersWithPolylines(
                        vendor_id,
                        vendor_lat,
                        vendor_lng,
                        user_id,
                        user_address_id,
                        3, // radius in KM
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

            case 2: // Rider accepted
                const otp = generateOtp(6);
                const expiry = new Date(Date.now() + 10 * 60 * 1000);
                await OrderModel.updateOtpAndStatus(orderIdStr, otp, expiry);

                notifications.push(sendNotificationToUser({
                    userId: user_id,
                    title: "Delivery Assigned",
                    body: `A rider has been assigned to deliver your order.`,
                    data: { order_id: orderIdStr, type: "order_update" }
                }));

                if (assigned_rider_id) {
                    notifications.push(sendNotificationToUser({
                        userId: assigned_rider_id,
                        title: "OTP for Vendor",
                        body: `Show this OTP to the vendor: ${otp}`,
                        data: { order_id: orderIdStr, type: "otp_info" }
                    }));
                }
                break;

            case 5: // Rejected
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
            return res.status(200).json({ message: "No order found for this vendor." });
        }

        const ordersMap = {};

        results.forEach(row => {
            const {
                order_id, preparing_time, order_uid, user_id, total_quantity, total_price,
                payment_method, order_status, order_created_at,
                order_item_id, product_id, product_name, product_description,
                product_price, product_quantity, food_type, total_item_price,
                variant_id, variant_type, variant_value, variant_price,
                addon_id, addon_name, addon_price,
                address, type, floor, landmark,
                firstname, lastname, phonenumber, prefix, is_fast_delivery,  store_name, store_address, vendor_phonenumber, vendor_prefix
            } = row;

            // If this order doesn't exist in map, initialize it
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

            // Create item entry (each DB row = 1 item)
            const newItem = {
                order_item_id,
                product_id,
                product_name,
                product_description,
                product_price,
                product_quantity,
                food_type,
                total_item_price,
                variant_id,
                variant_type,
                variant_value,
                variant_price,
                addons: addon_id ? [{ addon_id, addon_name, addon_price }] : []
            };

            ordersMap[order_id].items.push(newItem);
        });

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
    const { filter } = req.params; // "today" or "all"

    OrderModel.getOrdersByUserId(vendor_id, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!results || results.length === 0) {
            return res.status(200).json({ message: "No order found for this vendor." });
        }

        // ✅ Filter orders for today if filter = "today"
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
                    ? "No order found for today."
                    : "No order found for this vendor."
            });
        }

        const ordersMap = {};

        filteredResults.forEach(row => {
            const {
                order_id, preparing_time, order_uid, user_id, total_quantity, total_price,
                payment_method, order_status, order_created_at,
                order_item_id, product_id, product_name, product_description,
                product_price, product_quantity, food_type, total_item_price,
                variant_id, variant_type, variant_value, variant_price,
                addon_id, addon_name, addon_price,
                address, type, floor, landmark,
                firstname, lastname, phonenumber, is_fast_delivery, rider_unique_id
            } = row;

            // ✅ Create order object if not exists
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
                    rider_unique_id,
                    phonenumber,
                    address,
                    type,
                    floor,
                    landmark,
                    items: {}
                };
            }

            const order = ordersMap[order_id];

            // ✅ Use order_item_id as unique key
            if (!order.items[order_item_id]) {
                order.items[order_item_id] = {
                    order_item_id,
                    product_id,
                    product_name,
                    product_description,
                    product_price,
                    product_quantity,
                    food_type,
                    total_item_price,
                    variant_id,
                    variant_type,
                    variant_value,
                    variant_price,
                    addons: []
                };
            }

            // ✅ Add addon if exists (avoid duplicates)
            if (addon_id && !order.items[order_item_id].addons.some(a => a.addon_id === addon_id)) {
                order.items[order_item_id].addons.push({
                    addon_id,
                    addon_name,
                    addon_price
                });
            }
        });

        // ✅ Convert items map → array before sending
        const finalOrders = Object.values(ordersMap).map(order => ({
            ...order,
            items: Object.values(order.items)
        }));

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

        // Sort grouped orders by created_at DESC
        const groupedOrders = Object.values(ordersMap)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.status(200).json({
            total: groupedOrders.length,
            orders: groupedOrders
        });
    });
};

const handleOrderByRider = async (req, res, io) => {
  const { orderId, riderId, status } = req.body;
  if (![2, 3, 4, 5].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const isHandled = await OrderModel.handleOrder(orderId, riderId, status);
    if (!isHandled) {
      return res.status(400).json({ success: false, message: "Order already handled" });
    }

    switch (status) {
      case 2: { // Rider accepted
        OrderModel.getOrderandRiderDetails(orderId, async (err, results) => {
          if (err) return res.status(500).json({ success: false, message: "Database error" });
          if (!results || results.length === 0) return res.status(404).json({ success: false, message: "Order not found" });

          const orderDetails = results[0];
          const otp = generateOtp(6);
          const expiry = new Date(Date.now() + 10 * 60 * 1000);

          await OrderModel.updateOtpAndStatus(orderId.toString(), otp, expiry);

          try {
            // Notify customer
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

            // Notify rider OTP
            await sendNotificationToUser({
              userId: riderId,
              title: "OTP for Vendor",
              body: `Show this OTP to the vendor: ${otp}`,
              data: { order_id: orderId.toString(), type: "otp_info" }
            });

            io.emit(`stop-buzzer-${orderId}`, { orderId });
            console.log(`Socket emitted: stop-buzzer-${orderId}`, { orderId });
            return res.status(200).json({ success: true, message: "Order accepted by rider" });
          } catch (notificationError) {
            return res.status(500).json({ success: false, message: "Failed to send notification" });
          }
        });
        break;
      }

      case 3: { // Rider picked up
        await OrderModel.updateOrderStatus(orderId, 3, riderId);
        await sendNotificationToUser({
          userId: await OrderModel.getCustomerId(orderId),
          title: "Order Picked Up",
          body: "Your order is on the way!",
          data: { order_id: orderId.toString(), type: "order_update" }
        });
        io.emit(`order-pickedup-${orderId}`, { orderId, riderId });
        return res.json({ success: true, message: "Order picked up" });
      }

      case 4: { // Rider delivered
        await OrderModel.updateOrderStatus(orderId, 4, riderId);
        await sendNotificationToUser({
          userId: await OrderModel.getCustomerId(orderId),
          title: "Order Delivered",
          body: "Your order has been delivered successfully.",
          data: { order_id: orderId.toString(), type: "order_update" }
        });
        io.emit(`order-delivered-${orderId}`, { orderId, riderId });
        return res.json({ success: true, message: "Order delivered" });
      }

      case 5: { // Rider rejected
        io.emit(`order-rejected-${orderId}`, { orderId, riderId });
        return res.status(200).json({ success: true, message: "Order rejected by rider" });
      }

      default:
        return res.status(400).json({ success: false, message: "Unhandled status" });
    }
  } catch (error) {
    console.error("Error in handleOrderByRider:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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



 module.exports = { createOrder, getOrdersByUserId,  updateOrderStatus, getOrdersByVendorId, getOrderDetails, updateOrderTiming, verifyOtp, getAllOrders, orderHistory, handleOrderByRider, orderDetailsForRider};