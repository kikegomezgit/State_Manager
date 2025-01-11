const express = require('express');
const router = express.Router();
const { validateSecret } = require('../Middlewares/tokenSecret')
const { findStateOrders, findStateOrder,processStateOrders,pauseProcess, resumeProcess } = require('../Functions/functions')
const secret_name = 'restapitoken'
const CronController = require("../Functions/cronCrontroller");
const cronController = new CronController();

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



// Sets the cron job
router.post("/process/cron-set", (req, res) => {
    const { interval } = req.body; // e.g., "*/1 * * * *"
    if (!interval) {
      return res.status(400).json({ error: "Interval is required (e.g., '*/1 * * * *')." });
    }
  
    cronController.start(interval, resumeProcess);
    return res.json({ message: `Process started with interval '${interval}'` });
  });
  
  // Deletes the cron job
  router.delete("/process/cron-set", (req, res) => {
    cronController.stop();
    return res.json({ message: "Process stopped." });
  });
  
  // Pause the recursive process
  router.post("/process/pause", (req, res) => {
    pauseProcess();
    return res.json({ message: "Process paused." });
  });
  
  // Resume the recursive process
  router.post("/process/resume", (req, res) => {
    resumeProcess();
    return res.json({ message: "Process resumed." });
  });
  



module.exports = router;
