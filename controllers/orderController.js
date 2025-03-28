const OrderDetails = require("../models/orderDetails");
const OrderItem = require("../models/orderItem");

const createOrder = async (req, res) => {
    try {
        const { user_id, cart, payment_type } = req.body;

        if (!user_id || !cart || cart.length === 0) {
            return res.status(400).json({ error: "Invalid order data" });
        }

        let total_quantity = 0;
        let total_price = 0;

        const itemPromises = cart.map(async (item) => {
            const { id, quantity, price } = item;

            // Calculate total price for this item
            const total_item_price = quantity * price;
            
            // Update total order quantity and price
            total_quantity += quantity;
            total_price += total_item_price;

            return new Promise((resolve, reject) => {
                OrderItem.addItem(user_id, id, quantity, price, total_item_price, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        });

        // Wait until all order cart are inserted
        await Promise.all(itemPromises);

        // Insert order details without storing payment_type
        OrderDetails.addOrder(user_id, total_quantity, total_price,payment_type, (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Error adding order details" });
            }
            res.status(201).json({ message: "Order created successfully", order_id: result.insertId });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = { createOrder };
