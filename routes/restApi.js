const express = require('express');
const router = express.Router();
const { validateSecret } = require('../Middlewares/tokenSecret')
const { findStateOrders, findStateOrder } = require('../Functions/functions')
const secret_name = 'restapitoken'

// http://localhost:3001/orders?pageSize=50&page=1
router.get('/orders', validateSecret(secret_name), async (req, res) => {
    try {
        const { orders, totalOrders } = await findStateOrders(req.query)
        res.status(200).json({ orders, totalOrders });
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/order', validateSecret(secret_name), async (req, res) => {
    const { order_id, workflow } = req.query;
    try {
        const order = await findStateOrder({ order_id, workflow });
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
