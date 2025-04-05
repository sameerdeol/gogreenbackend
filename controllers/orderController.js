const OrderDetails = require("../models/orderDetails");
const OrderItem = require("../models/orderItem");
const OrderModel = require("../models/OrderModel");

const createOrder = async (req, res) => {
    try {
        const { user_id, cart, payment_method } = req.body;

        if (!user_id || !cart || cart.length === 0) {
            console.warn("Invalid order data received");
            return res.status(400).json({ error: "Invalid order data" });
        }

        let total_quantity = 0;
        let total_price = 0;

        // Calculate totals
        cart.forEach((item) => {
            total_quantity += item.quantity;
            total_price += item.quantity * item.price;
        });

        // First, insert into OrderDetails to get order_id
        OrderDetails.addOrder(user_id, total_quantity, total_price, payment_method, async (err, result) => {
            if (err) {
                console.error("Error adding order details:", err);
                return res.status(500).json({ error: "Error adding order details" });
            }

            const order_id = result.insertId;

            try {
                // Insert each item into OrderItem using order_id
                const itemPromises = cart.map((item, index) => {
                    const { product_id, quantity, price } = item;
                    const total_item_price = quantity * price;

                    return new Promise((resolve, reject) => {
                        OrderItem.addItem(order_id, user_id, product_id, quantity, price, total_item_price, (err, result) => {
                            if (err) {
                                console.error(`Error adding item ${index + 1}:`, err);
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });
                    });
                });

                await Promise.all(itemPromises);

                console.log("All order items added successfully");
                res.status(201).json({ message: "Order created successfully", order_id });
            } catch (itemErr) {
                console.error("Error adding order items:", itemErr);
                res.status(500).json({ error: "Error adding order items" });
            }
        });

    } catch (error) {
        console.error("Server error while creating order:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const getOrdersByUserId = (req, res) => {
    const { user_id } = req.body;
  
    OrderModel.getOrdersByUserId(user_id, (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
  
      const ordersMap = {};
  
      results.forEach(row => {
        const {
          order_id, user_id, total_quantity, total_price,
          payment_method, order_created_at,
          product_id, product_name, product_description,
          product_price, total_item_price
        } = row;
  
        if (!ordersMap[order_id]) {
          ordersMap[order_id] = {
            order_id,
            user_id,
            total_quantity,
            total_price,
            payment_method,
            order_created_at,
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

module.exports = { createOrder, getOrdersByUserId };
