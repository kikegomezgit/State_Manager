const mongoose = require('mongoose');
const { Schema } = mongoose;
//order schema
const order = new Schema({
    order_id: String,
    workflow: String,
    items: Array,
    desired_date: Date,
    status: { type: String, default: 'pending' },
    version: { type: Number, default: 0 }  // Version field to track changes
});
//process-steps 
//run once per day, get processStepsConfiguration.find(workflow,action).order by numerical_order  steps: [{}]

//Step
const stepSchema = new Schema({
    step_name: { type: String, required: true },
    numerical_order: { type: Number, required: true },
    // workflow: { type: String, required: true },
    action: { type: String, required: true },//brief description of action
    api_call_id: { type: Schema.Types.ObjectId, ref: 'ApiCall' },
    status: { type: String, enum: ['pending', 'in progress', 'completed', 'failed', null], default: null },
    response: { type: Schema.Types.Mixed, default: null },
    error: { type: Schema.Types.Mixed, default: null },
    end_time: { type: Date, default: null },
});

const processStepsConfiguration = new Schema({
    name: String,
    workflow: String,
    // action: String,
    steps: [stepSchema]
});

//Workflow
const stateManagerSchema = new Schema({
    order_id: { type: String, required: true },
    order: { type: Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date, default: null },
    current_step: { type: String },
    steps: [stepSchema]  // List of steps involved in the state manager
});

//Apis
const apiCallSchema = new Schema({
    api_name: { type: String, required: true },
    description: { type: String, required: false },
    workflow: { type: String, required: false },
    url: { type: String, required: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], required: true },
    request_attributes: { type: Schema.Types.Mixed, default: null },//{body:{slot:"78"},headers:{}} authorization will reuse this schema but specified
    response_attributes: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
});

const ApiCall = mongoose.model('ApiCall', apiCallSchema);
const StateManager = mongoose.model('StateManager', stateManagerSchema);
const Order = mongoose.model('Order', order);
const ProcessStepsConfiguration = mongoose.model('ProcessStepsConfiguration', processStepsConfiguration);

module.exports = {
    ApiCall,
    StateManager,
    Order,
    ProcessStepsConfiguration
}

