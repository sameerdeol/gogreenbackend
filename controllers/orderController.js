const Order = require('../models/orderModel');

exports.createOrder = (req, res) => {
    const { user_id, address_id, payment_type, items } = req.body;

    if (!user_id || !address_id || !payment_type || !items.length) {
        return res.status(400).json({ message: "All fields are required" });
    }

    Order.createOrder(user_id, address_id, payment_type, (err, result) => {
        if (err) return res.status(500).json({ error: err });

        const order_id = result.insertId;

        // Convert each addOrderItem call into a promise
        const itemPromises = items.map(item => {
            return new Promise((resolve, reject) => {
                Order.addOrderItem(order_id, item.product_id, item.quantity, item.price, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        // Execute all item insertions and send response once completed
        Promise.all(itemPromises)
            .then(() => {
                res.status(201).json({ message: "Order created successfully", order_id });
            })
            .catch(err => {
                res.status(500).json({ error: err });
            });
    });
};

exports.getOrderDetails = (req, res) => {
    const { order_id } = req.params;

    Order.getOrderDetails(order_id, (err, orderResult) => {
        if (err) return res.status(500).json({ error: err });

        if (orderResult.length === 0) return res.status(404).json({ message: "Order not found" });

        Order.getOrderItems(order_id, (err, itemsResult) => {
            if (err) return res.status(500).json({ error: err });

            res.json({ order: orderResult[0], items: itemsResult });
        });
    });
};
