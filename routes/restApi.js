const express = require('express');
const router = express.Router();
const { validateSecret } = require('../Middlewares/tokenSecret')
const secret_name = 'restapitoken'

// http://localhost:3001/orders?pageSize=50&page=1
router.get('/orders', validateSecret(secret_name), async (req, res) => {
    const { pageSize = 50, page = 1 } = req.query;

    try {
        // Save the order to the database
        const orders = await StateManager.find()
            .sort({ _id: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
        const totalOrders = await StateManager.countDocuments();
        res.status(200).json({ orders, totalOrders });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/order', validateSecret(secret_name), async (req, res) => {
    const { order_id } = req.query;
    try {
        const order = await StateManager.findOne({ order_id: order_id });
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
