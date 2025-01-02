
const { WorkflowBlueprint, ApiCall, Order, StateOrder } = require('../database/database');
const { getIdwithConsecutive } = require('./helpers')
const axios = require('axios');
const process_limit = 5
const process_interval = 60_000
const cache = {};
const apiCallsCache = {}


const processStateOrders = async () => {
    const stateOrders = [];
    for (let i = 0; i < process_limit; i++) {
        const order = await StateOrder.findOneAndUpdate(
            { status: { $nin: ["completed", "failed", "in_progress"] } },
            { $set: { status: "in_progress" } },
            { sort: { _id: 1 }, new: true })
            .populate([
                { path: 'steps.api_call_id' },
                { path: 'steps.onFailed.api_call_id' }
            ])
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
const concurrentProcessStateOrder = async (stateOrder) => {
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
            const { onFailed: { api_call_id } = {} } = step
            let {
                url,
                method,
                request_attributes,
                response_attributes,
            } = step.api_call_id || {};
            // Prepare Axios request
            let requestBody = {};
            let requestHeaders = {};
            let requestQuery = {};
            let errorMessage = null
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
            }).then(res => ({ api_response: res.data }))
                .catch(async error => {
                    errorMessage = {
                        code: error?.response?.status,
                        r_message: error?.response?.data,
                        message: error?.code
                    };

                    step.error = errorMessage;

                    // api_response: res.data 
                    if (step.onFailed && step.onFailed?.api_call_id) {
                        const { url, method, request_attributes, response_attributes } = step.onFailed?.api_call_id;
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

                        const result = await axios({
                            method: method.toLowerCase(),
                            url,
                            timeout: 20_000,
                            data: requestBody,
                            headers: requestHeaders,
                            params: requestQuery
                        }).then(res => res.data)
                        return { onFailed: true, api_response: result }
                    }

                    step.status = 'failed';
                    stateOrder.status = 'failed';
                    step.response = null;
                    step.end_time = new Date();
                    stateOrder.end_time = new Date();

                    console.log('Finished ' + stateOrder?.order_id + ' ' + stateOrder.workflow + ' with status ' + stateOrder.status);
                    await stateOrder.save();
                    throw new Error(`Workflow failed at step ${step.step_name}`);

                });

            if (result?.onFailed === true) response_attributes = api_call_id?.response_attributes
            // Handle response attributes to save to step_data for the next step
            if (response_attributes) {
                response_attributes.map(item => {
                    let { attribute, process_function, source = 'result' } = item;
                    source = source === 'result' ? result.api_response : source === 'step_data' ? step_data : order;
                    step_data[attribute] = process_function
                        ? functionPool[process_function](source[attribute])
                        : source[attribute];
                });
            }


            step.response = result?.api_response ?? null;
            step.error = errorMessage || null;
            await markStepAsCompleted(step, stateOrder, step_data);
            console.log('[order] ' + stateOrder.order_id + + ' ' + stateOrder.workflow + ' finished processing: ' + step.step_name);
        }
    } catch (err) {
        throw err
    }
}

const cacheworkflowBlueprints = async () => {
    try {
        const workflows = await WorkflowBlueprint.find();
        workflows.forEach(workflow => {
            cache[workflow.workflow] = workflow.steps;
        });
        console.log('Workflow steps cached successfully.');
    } catch (error) {
        throw error
    }
}
const cacheApiCalls = async () => {
    try {
        const apiCalls = await ApiCall.find();  // Fetch from DB
        apiCalls.forEach(apiCall => {
            apiCallsCache[apiCall._id] = apiCall
        });
        // console.log(apiCalls)
        console.log('apiCalls cached successfully.');
    } catch (error) {
        throw error
    }
}

const markStepAsCompleted = async (step, stateOrder) => {
    step.status = "completed";
    step.end_time = new Date();

    // Mark workflow as completed if this is the last step

    // if (step_finish_length === step.numerical_order) workflow.status = 'completed'
    // if (stateOrder.steps.every((s) => s.status === "completed")) {
    if (stateOrder.steps[stateOrder.steps.length - 1].status === "completed") {
        stateOrder.status = "completed";
        stateOrder.end_time = new Date();
        console.log('Finished ' + stateOrder?.order_id + ' with status ' + stateOrder.status)
    }
    await stateOrder.save();
}

const createStateOrder = async (body) => {
    const { workflow, order: { order_id } } = body;
    if (!cache[workflow]) throw new Error('Invalid workflow');
    let stateOrder = new StateOrder({
        order_id,
        workflow,
        order: body.order,
        steps: cache[workflow],
        status: 'pending'
    });
    try {
        await stateOrder.save();
    } catch (error) {
        if (error.code === 11000) {
            console.error('Duplicate order detected:', order_id);
        } else {
            console.error('Error saving order:', error.message);
            throw error
        }
    }
};

const findAndReprocessFailedStateOrders = async ({ orders = [], workflow }) => {
    // console.log(orders, workflow)

    const query = [
        // Match documents based on the condition
        {
            $match: {
                ...(orders.length > 0 ? { order_id: { $in: orders } } : {}),
                status: 'failed',
                workflow,
                reprocessed: { $ne: true } // Ignore documents where reprocessed is true
            }
        },
        // Sort documents by a timestamp 
        {
            $sort: { created_at: -1 } // Adjust the field to the timestamp you use
        },
        {
            $group: {
                _id: "$order_id", // Unique field
                latest: { $first: "$$ROOT" } // Get the latest document
            }
        },
        {
            $replaceRoot: { newRoot: "$latest" }
        }
    ];

    // Find the documents that match the query.
    const stateOrders = await StateOrder.aggregate(query);
    if (query.length > 0) {
        // Prepare copies with the updated fields.
        const newStateOrders = stateOrders.map(doc => {
            const current_id = doc.order_id
            const newDoc = doc; // Convert Mongoose document to plain object
            delete newDoc._id; // Remove `_id` to allow creation of a new document
            newDoc.status = 'pending'; // Update status
            newDoc.order_id = getIdwithConsecutive(newDoc.order_id); // Append '01' to order_id
            // Step 2: Update the `reprocessed` field for each document to avoid duplicates on all
            StateOrder.updateOne(
                { order_id: current_id, workflow: doc.workflow }, // Match the document by its `_id` or unique identifier
                { $set: { reprocessed: true } }, // Update the `reprocessed` field
                { upsert: false }
            ).then(res => console.log(res)).catch(err => console.log(err))
            return newDoc;
        });

        const createdDocs = await StateOrder.insertMany(newStateOrders);
        return createdDocs

    }
}

const functionPool = {
    firstOfArray: (array) => {
        return array[0];
    },
    wait: (seconds) => {
        return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
    }
}

const findStateOrders = async ({ pageSize = 50, page = 1, workflow }) => {
    const orders = await StateOrder.find({ workflow })
        .sort({ _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
    const totalOrders = await StateOrder.countDocuments();
    return { orders, totalOrders }
}
const findStateOrder = async ({ order_id, workflow }) => {
    const result = await StateOrder.find({ order_id, workflow })
    return result[0]
}
cacheworkflowBlueprints();
cacheApiCalls();

module.exports = {
    processStateOrders,
    concurrentProcessStateOrder,
    createStateOrder,
    findAndReprocessFailedStateOrders,
    findStateOrders,
    findStateOrder
}

