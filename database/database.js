const mongoose = require('mongoose');
const { Schema } = mongoose;
const MONGO_SRV = process.env.MONGO_SRV

const startDb = () => {
    mongoose.connect(MONGO_SRV, {
    }).then(() => {
        console.log('MongoDB connected');
    }).catch((err) => {
        console.error('MongoDB connection error:', err);
    });
}
const stepSchema = new Schema({
    step_name: { type: String, required: true },
    numerical_order: { type: Number, required: true },
    action: { type: String, required: true },
    api_call_id: { type: Schema.Types.ObjectId, ref: 'ApiCall' },
    status: { type: String, enum: ['pending', 'in progress', 'completed', 'failed', null], default: null },
    response: { type: Schema.Types.Mixed, default: null },
    active: { type: Boolean, required: true },
    onFailed: {
        api_call_id: { type: mongoose.Schema.Types.ObjectId, ref: "ApiCall" },
        active: { type: Boolean },
    },
    error: { type: Schema.Types.Mixed, default: null },
    end_time: { type: Date, default: null },
});

const workflowBlueprint = new Schema({
    name: String,
    workflow: String,
    steps: [stepSchema]
});

const stateOrderSchema = new Schema({
    order_id: { type: String, required: true },
    order: { type: Schema.Types.Mixed, default: null },
    reprocessed: { type: Boolean },
    workflow: { type: String, required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date, default: null },
    current_step: { type: String },
    steps: [stepSchema]
});

const apiCallSchema = new Schema({
    api_name: { type: String, required: true },
    description: { type: String, required: false },
    workflow: { type: String, required: false },
    url: { type: String, required: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], required: true },
    request_attributes: { type: Schema.Types.Mixed, default: null },
    response_attributes: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
});

const ApiCall = mongoose.model('ApiCall', apiCallSchema);
const StateOrder = mongoose.model('StateOrder', stateOrderSchema);
const WorkflowBlueprint = mongoose.model('workflowBluePrint', workflowBlueprint);

module.exports = {
    startDb,
    ApiCall,
    StateOrder,
    WorkflowBlueprint
}
