

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
// Load proto file for gRPC
// const PROTO_PATH = './state_manager.proto';  // Path to your proto file
const MONGO_SRV = process.env.MONGO_SRV
// const packageDefinition = protoLoader.loadSync(PROTO_PATH);
// const stateManagerProto = grpc.loadPackageDefinition(packageDefinition).StateManagerService;
const process_limit = 5
const cache = {};  // Cache for workflows
const apiCallsCache = {}

// Middleware to parse JSON
app.use(cors());
app.use(bodyParser.json());
// Connect to MongoDB
mongoose.connect(MONGO_SRV, {
}).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Webhook endpoint to receive orders
app.post('/webhook', async (req, res) => {
    const { order_id, workflow, items } = req.body;

    if (!order_id || !workflow) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    res.status(200).json({ message: 'Order received and saved successfully' });
    try {
        // Save the order to the database
        // const newOrder = new Order({
        //     order_id,
        //     workflow,
        //     items
        // });

        // await newOrder.save();
        // {
        //     "order_id": "111144444-15",
        //     "workflow": "ecommerce",
        //     "desired_date": "2024-11-23T16:00:00Z",
        //     "items": [
        //         {
        //             "item_id": "P003-94",
        //             "name": "item random",
        //             "quantity": 2,
        //             "price": 100
        //         },
        //         {
        //             "item_id": "P003-96",
        //             "name": "item random 2",
        //             "quantity": 3,
        //             "price": 50
        //         }
        //     ]
        // }
        // let stateManager = await StateManager.findOne({order_id});
        // if (!stateManager) {
        if (!cache[workflow]) throw new Error('Invalid worfklow');

        let stateManager = new StateManager({
            order_id,
            workflow,
            order: req.body,
            steps: cache[workflow],  // Use cached steps
            status: 'pending'
        });
        stateManager.save()
        // }
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
// Function to process orders in batches of 3
// async function processOrdersInBatches() {
//     console.log('Entered on pending order check->')
//     try {
//         let ordersToProcess = [];
//         //config how many orders to process
//         for (let i = 0; i <= numberOfOrdersToProcess; i++) {
//             const order = await Order.findOneAndUpdate(
//                 { status: 'pending', version: { $eq: 0 } },  // Only pick orders with version 0
//                 {
//                     $set: { status: 'processing' },
//                     $inc: { version: 1 }  // Increment version for the order (lock)
//                 },
//                 { new: true }  // Return the modified document
//             );
//             if (!order) {
//                 console.log('No pending orders left to process.');
//                 break;  // Exit the loop if no more orders are found
//             }

//             ordersToProcess.push(order);
//         }

//         if (ordersToProcess.length === 0) return;

//         for (const order of ordersToProcess) {
//             console.log(ordersToProcess.length)
//             console.log(`Processing order ${order.order_id}...`);

//             let stateManager = await StateManager.findOne({
//                 order_id: order.order_id,
//                 status: 'pending'
//             });
//             console.log('Pending orders to process: ' + stateManager)
//             // return
//             if (!stateManager) {
//                 if (!cache[order.workflow]) throw new Error('Workflow not cached');

//                 stateManager = new StateManager({
//                     order_id: order.order_id,
//                     workflow: order.workflow,
//                     order: order,
//                     start_time: new Date(),
//                     steps: cache[order.workflow],  // Use cached steps
//                     status: 'pending'
//                 });
//                 stateManager.save()
//             }

//             // stateManager.current_step = 'step1';
//             // await stateManager.save();
//             console.log('before call invokeworkflow', stateManager._id)
//             order.status = 'processing';
//             await order.save();
//             // console.log(stateManager)
//             if (stateManager) await invokeWorkflow(stateManager).catch(err => err)
//             console.log(`Order ${order.order_id} processed.`);
//         }
//     } catch (err) {
//         console.error('Error processing orders:', err);
//     }
// }

// Function to invoke the workflow steps sequentially 
async function processStateOrders() {
    try {
        //Get x orders from older to newest
        const stateOrders = await StateManager.find({ status: { $nin: ["completed", "failed", "in_progress"] } })
            .populate('steps.api_call_id')
            .sort({ _id: 1 })   // Sort by `_id` to ensure consistent pagination
            .limit(process_limit)
            .exec()
        const stateOrdersLength = stateOrders.length
        if (stateOrdersLength < 1) { console.log('No pending orders left to process.'); return; }
        //update them to 'processing status
        await Promise.all(
            stateOrders.map(order =>
                StateManager.updateOne({ _id: order._id }, { $set: { status: "in_progress" } })
            )
        );
        console.log('[START] ' + stateOrdersLength + ' State orders')


        for (const stateOrder of stateOrders) {
            const { order, steps } = stateOrder;
            const step_finish_length = steps.length
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
                            let { attribute, source = 'order', process_function } = item
                            source = source === 'result' ? result : source === 'step_data' ? step_data : order
                            requestBody[attribute] = process_function ? functionPool[process_function](source[attribute]) : source[attribute]
                        });
                    }
                    const result = await axios({
                        method: method.toLowerCase(),
                        url,
                        data: requestBody,
                        headers: requestHeaders,
                        params: requestQuery
                    }).then(res => res.data)
                        .catch(async error => {
                            step.status = 'failed';
                            stateOrder.status = 'failed'

                            errorMessage = {
                                code: error?.response?.status,
                                r_message: error?.response?.data,
                                message: error?.code
                            }
                            step.error = errorMessage;
                            step.response = null
                            step.end_time = new Date()
                            console.log('Finished ' + stateOrder?.order_id + ' with status ' + stateOrder.status)
                            await stateOrder.save()
                            throw new Error(`Workflow failed at step ${step.step_name}`)
                        });

                    // Handle response attributes to save to step_data for the next step
                    if (response_attributes) {
                        response_attributes.map(item => {
                            let { attribute, process_function, source = 'result' } = item
                            source = source === 'result' ? result : source === 'step_data' ? step_data : order
                            return step_data[attribute] = process_function ? functionPool[process_function](source[attribute]) : source[attribute]
                        });
                    }
                    console.log(result)

                    step.response = result ?? null
                    step.error = null
                    await markStepAsCompleted(step, stateOrder, step_data);
                    console.log('[order] ' + stateOrder.order_id + ' finished processing: ' + step.step_name)
                    // if (step_finish_length === step.numerical_order) workflow.status = 'completed'


                }
            } catch (err) {
                console.log(err)
                continue;
            }

        }
        console.log('[END] ' + stateOrdersLength + ' State orders')
        // const workflow = await StateManager.findById(stateOrder._id)
        //     .populate('steps.api_call_id')
        //     .exec();
        // if (!workflow) return "Order not found"
        //filter pending or failure and reoirdering
        // const steps = stateManager.steps
        //     .filter(step => step.status === 'pending')
        //     .sort((a, b) => a.numerical_order - b.numerical_order);


    } catch (error) {
        // console.log(error)
        throw error
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

const markStepAsCompleted = async (step, stateOrder, step_data) => {
    step.status = "completed";
    step.end_time = new Date();

    // Mark workflow as completed if this is the last step

    // if (step_finish_length === step.numerical_order) workflow.status = 'completed'
    if (stateOrder.steps.every((s) => s.status === "completed")) {
        stateOrder.status = "completed";
        console.log('Finished ' + stateOrder?.order_id + ' with status ' + stateOrder.status)
    }
    await stateOrder.save();
    // console.log('Step data after processing:', step_data);
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
cacheProcessStepsConfigurations();
cacheApiCalls();

setInterval(processStateOrders, 30_000); // 60000 ms = 1 minute

// Start the Express server
app.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
});