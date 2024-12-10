const express = require('express');
const router = express.Router();
const { createStateOrder, findAndReprocessFailedStateOrders } = require('../Functions/functions')



// Webhook route
router.post('/webhook', async (req, res) => {

    //check on queue , initial, injection, finish
    const { queue, order: { workflow, order_id } } = req.body

    if (!order_id || !workflow) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    res.status(200).json({ message: 'Order received and saved successfully' });
    try {
        createStateOrder(req.body)
    } catch (err) {
        console.error('Error processing webhook:', err);
        //save order on a log
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reprocess route
router.post('/reprocess', async (req, res) => {

    // if (!orders || !workflow) {
    //     return res.status(400).json({ message: 'Missing required fields' });
    // }
    res.status(200).json({ message: 'Reprocess command received' });
    try {
        //action can be some by ids [] or all
        await findAndReprocessFailedStateOrders(req.body)
        // const query = [
        //     // Match documents based on the condition
        //     {
        //         $match: {
        //             ...(orders.length > 0 ? { order_id: { $in: orders } } : {}),
        //             status: 'failed',
        //             workflow,
        //             queue,
        //             reprocessed: { $ne: true } // Ignore documents where reprocessed is true
        //         }
        //     },
        //     // Sort documents by a timestamp field (e.g., `created_at`) to get the latest
        //     {
        //         $sort: { created_at: -1 } // Adjust the field to the timestamp you use
        //     },
        //     // Group by `order_id` to get unique entries
        //     {
        //         $group: {
        //             _id: "$order_id", // Unique field
        //             latest: { $first: "$$ROOT" } // Get the latest document
        //         }
        //     },
        //     // Project the final document structure
        //     {
        //         $replaceRoot: { newRoot: "$latest" }
        //     }
        // ];

        // // Find the documents that match the query.
        // // const stateManagers = await StateManager.find(query);
        // const stateOrders = await stateOrder.aggregate(query);
        // if (query.length > 0) {
        //     // Prepare copies with the updated fields.
        //     const newStateOrders = stateOrders.map(doc => {
        //         const current_id = doc.order_id
        //         const newDoc = doc; // Convert Mongoose document to plain object
        //         delete newDoc._id; // Remove `_id` to allow creation of a new document
        //         newDoc.status = 'pending'; // Update status
        //         newDoc.order_id = getIdwithConsecutive(newDoc.order_id); // Append '01' to order_id
        //         // Step 2: Update the `reprocessed` field for each document to avoid duplicates on all
        //         StateOrder.updateOne(
        //             { order_id: current_id }, // Match the document by its `_id` or unique identifier
        //             { $set: { reprocessed: true } } // Update the `reprocessed` field
        //         )
        //         return newDoc;
        //     });
        //     // Insert the new documents into the collection.
        //     const createdDocs = await StateOrder.insertMany(newStateOrders);
        //     return createdDocs; // Return the newly created documents.



        // }
    } catch (err) {
        console.error('Error processing webhook:', err);
        //save order on a log
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
