const express = require('express');
const router = express.Router();
const { createStateOrder, findAndReprocessFailedStateOrders } = require('../Functions/functions')
const { validateSecret } = require('../Middlewares/tokenSecret')
const secret_name = 'webhookapitoken'



// Webhook route
router.post('/webhook', validateSecret(secret_name), async (req, res) => {

    const { workflow, order: { order_id } } = req.body

    if (!order_id || !workflow) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    res.status(200).json({ message: 'Order received and saved successfully' });
    try {
        createStateOrder(req.body)
    } catch (err) {
        console.error('Error processing webhook:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reprocess route
router.post('/reprocess', validateSecret(secret_name), async (req, res) => {

    // if (!orders || !workflow) {
    //     return res.status(400).json({ message: 'Missing required fields' });
    // }
    res.status(200).json({ message: 'Reprocess command received' });
    try {
        //action can be some by ids [] or all
        await findAndReprocessFailedStateOrders(req.body)
    } catch (err) {
        console.error('Error processing webhook:', err);
        //save order on a log
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
