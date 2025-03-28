const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config()
const webhookRoutes = require('./routes/webhook');
const restApiRoutes = require('./routes/restApi');
const orderPosApiRoutes= require('./routes/orderPosApi');
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
app.use('/', orderPosApiRoutes);

startDb()
processStateOrders()
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Webhook server running on port ${PORT}`);
});