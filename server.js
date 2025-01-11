const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config()
const webhookRoutes = require('./routes/webhook');
const restApiRoutes = require('./routes/restApi');
// const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3001;
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json());
const CronController = require("./Functions/cronCrontroller"); 
// Mongoose Models
const { startDb } = require('./database/database');


const { processStateOrders } = require('./Functions/functions')
const cronController = new CronController();


app.use('/', webhookRoutes);
app.use('/', restApiRoutes);

startDb()
processStateOrders()
app.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
});