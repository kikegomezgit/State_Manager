// reprocess


// -self protection to check if there are orders with in_progress with more than 30 minutes from now
// change them to pending

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config()

// Mongoose Models
const { ProcessStepsConfiguration, ApiCall, Order, StateManager } = require('./database');
const app = express();
const PORT = 3001;
const MONGO_SRV = process.env.MONGO_SRV
const process_limit = 5
const process_interval = 30_000
const cache = {};  // Cache for workflows
const apiCallsCache = {}

app.use(cors());
app.use(bodyParser.json());
const connectDatabase = async _ => {
    mongoose.connect(MONGO_SRV, {
    }).then(() => {
        console.log('MongoDB connected');
    }).catch((err) => {
        console.error('MongoDB connection error:', err);
    });

}


// Webhook endpoint to receive orders and create orders 
app.post('/webhook', async (req, res) => {

    //check on queue , initial, injection, finish
    const { order_id, workflow, order } = req.body?.order;

    if (!order_id || !workflow) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    res.status(200).json({ message: 'Order received and saved successfully' });
    try {

        if (!cache[workflow]) throw new Error('Invalid worfklow');

        let stateManager = new StateManager({
            order_id,
            workflow,
            queue: req.body?.queue,
            order,
            steps: cache[workflow],  // Use cached steps
            status: 'pending'
        });
        stateManager.save()
    } catch (err) {
        console.error('Error processing webhook:', err);
        //save order on a log
        res.status(500).json({ message: 'Internal server error' });
    }
});

//reprocess by queeus mandatory
app.put('/reprocess', async (req, res) => {
    const { orders = [], workflow, action = 'some' } = req.body;

    if (!order_id || !workflow) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    res.status(200).json({ message: 'Order received and saved successfully' });
    try {

        if (!cache[workflow]) throw new Error('Invalid worfklow');

        let stateManager = new StateManager({
            order_id,
            workflow,
            order: req.body,
            steps: cache[workflow],  // Use cached steps
            status: 'pending'
        });
        stateManager.save()
    } catch (err) {
        console.error('Error processing webhook:', err);
        //save order on a log
        res.status(500).json({ message: 'Internal server error' });
    }
});

// http://localhost:3001/orders?pageSize=50&page=1
app.get('/orders', async (req, res) => {
    const { pageSize = 50, page = 1 } = req.query;

    try {
        // Save the order to the database
        const orders = await StateManager.find()
            .sort({ _id: 1 })   // Sort by `_id` to ensure consistent pagination
            .skip((page - 1) * pageSize)
            .limit(pageSize)
        // .find({ status: 'active' })
        // .sort({ createdAt: -1 })
        const totalOrders = await StateManager.countDocuments();
        // .find({ status: 'active' })
        // .sort({ createdAt: -1 })
        res.status(200).json({ orders, totalOrders });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/order', async (req, res) => {
    const { order_id } = req.query;
    try {
        const order = await StateManager.findOne({ order_id: order_id });
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Function to invoke the workflow steps sequentially 
async function processStateOrders() {
    const stateOrders = [];
    for (let i = 0; i < process_limit; i++) {
        const order = await StateManager.findOneAndUpdate(
            { status: { $nin: ["completed", "failed", "in_progress"] } },
            { $set: { status: "in_progress" } },
            { sort: { _id: 1 }, new: true })
            .populate('steps.api_call_id')
            .exec()
        if (!order) break; // Exit if no more orders are available
        stateOrders.push(order);
    }

    if (stateOrders.length < 1) {
        console.log(`No pending orders found. Waiting ${process_interval / 1000}s before retrying...`);
        setTimeout(processStateOrders, process_interval || 60_000); // Retry after 30 seconds
        return;
    }
    console.log(`[START] Processing ${stateOrders.length} orders`);
    await Promise.allSettled(
        stateOrders.map(stateOrder => concurrentProcessStateOrder(stateOrder))
    );
    console.log(`[END] Processing ${stateOrders.length} orders`);
    processStateOrders();

}

async function concurrentProcessStateOrder(stateOrder) {
    const { order, steps } = stateOrder;
    const step_finish_length = steps.length;
    let step_data = {};

    try {
        for (const step of steps) {
            console.log(`Order ${stateOrder.order_id} Processing step: ${step.step_name}`);
            if (step.step_name === "wait") {
                await functionPool.wait(Number(step.action));
                await markStepAsCompleted(step, stateOrder, step_data);
                continue;
            }

            const { url, method, request_attributes, response_attributes } = step.api_call_id;

            // Prepare Axios request
            let requestBody = {};
            let requestHeaders = {};
            let requestQuery = {};

            // Use the request_attributes to set request data dynamically
            if (request_attributes.body) {
                request_attributes.body.map(item => {
                    let { attribute, source = 'order', process_function } = item;
                    source = source === 'result' ? result : source === 'step_data' ? step_data : order;
                    requestBody[attribute] = process_function
                        ? functionPool[process_function](source[attribute])
                        : source[attribute];
                });
            }

            // Make API call
            const result = await axios({
                method: method.toLowerCase(),
                url,
                timeout: 20_000,
                data: requestBody,
                headers: requestHeaders,
                params: requestQuery
            }).then(res => res.data)
                .catch(async error => {
                    step.status = 'failed';
                    stateOrder.status = 'failed';

                    const errorMessage = {
                        code: error?.response?.status,
                        r_message: error?.response?.data,
                        message: error?.code
                    };

                    step.error = errorMessage;
                    step.response = null;
                    step.end_time = new Date();

                    console.log('Finished ' + stateOrder?.order_id + ' with status ' + stateOrder.status);
                    await stateOrder.save();
                    throw new Error(`Workflow failed at step ${step.step_name}`);
                });

            // Handle response attributes to save to step_data for the next step
            if (response_attributes) {
                response_attributes.map(item => {
                    let { attribute, process_function, source = 'result' } = item;
                    source = source === 'result' ? result : source === 'step_data' ? step_data : order;
                    step_data[attribute] = process_function
                        ? functionPool[process_function](source[attribute])
                        : source[attribute];
                });
            }


            step.response = result ?? null;
            step.error = null;
            await markStepAsCompleted(step, stateOrder, step_data);
            console.log('[order] ' + stateOrder.order_id + ' finished processing: ' + step.step_name);
        }
    } catch (err) {
        console.log(err);
    }
}

// Cache the workflow steps at server start
async function cacheProcessStepsConfigurations() {
    try {
        const workflows = await ProcessStepsConfiguration.find();  // Fetch from DB
        workflows.forEach(workflow => {
            cache[workflow.workflow] = workflow.steps;
        });
        // console.log(workflows)
        console.log('Workflow steps cached successfully.');
    } catch (error) {
        console.error('Error caching workflow steps:', error);
    }
}
async function cacheApiCalls() {
    try {
        const apiCalls = await ApiCall.find();  // Fetch from DB
        apiCalls.forEach(apiCall => {
            apiCallsCache[apiCall._id] = apiCall
        });
        // console.log(apiCalls)
        console.log('apiCalls cached successfully.');
    } catch (error) {
        console.error('Error caching apiCalls:', error);
    }
}

const markStepAsCompleted = async (step, stateOrder) => {
    step.status = "completed";
    step.end_time = new Date();

    // Mark workflow as completed if this is the last step

    // if (step_finish_length === step.numerical_order) workflow.status = 'completed'
    if (stateOrder.steps.every((s) => s.status === "completed")) {
        stateOrder.status = "completed";
        console.log('Finished ' + stateOrder?.order_id + ' with status ' + stateOrder.status)
    }
    await stateOrder.save();
}


const functionPool = {
    firstOfArray: (array) => {
        return array[0];
    },
    wait: (seconds) => {
        return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
    }
}

// Cache the workflow steps on startup
connectDatabase()
cacheProcessStepsConfigurations();
cacheApiCalls();

// setInterval(processStateOrders, process_interval || 30_00); // 60000 ms = 1 minute
processStateOrders()
// Start the Express server
app.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
});