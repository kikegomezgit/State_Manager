const { ProcessStepsConfiguration, OrderSchema, ApiCall, StateManager } = require("./database")

OrderSchema
{
    "order_id": "ORD-1001",
        "workflow": "ecommerce",
            "desired_date": "2024-10-18T16:00:00Z",
                "items": [
                    {
                        "item_id": "P001",
                        "name": "Product 1",
                        "quantity": 2,
                        "price": 50.00
                    },
                    {
                        "item_id": "P002",
                        "name": "Product 2",
                        "quantity": 1,
                        "price": 30.00
                    }
                ],
                    "status": "pending",
                        "version": 0
}

ApiCall
{
    "api_name": "Get schedules",
        "description": "This API retrieves available schedules",
            "workflow": "ecommerce",
                "url": "https://api.inventory-service.com/schedules",
                    "method": "POST",
                        "request_attributes": {
        "body": [
            {
                "attribute": "desired_date",
                "source": 'order',
            }, {
                "attribute": "items",
                "source": 'order',
            }
        ]
    },
    "response_attributes": [
        {
            "attribute": "schedule",
            "process_function": ["firstOfArray"]
        }
    ],
        "timestamp": "2024-09-27T12:00:00Z"
}
{
    "api_name": "Create job",
        "description": "This API creates the job on third party",
            "workflow": "ecommerce",
                "url": "https://api.inventory-service.com/create-job",
                    "method": "POST",
                        "request_attributes": {
        "body": [
            {
                "attribute": "order",
                "process_function": ["createJobParseBodyThirdParty"] // No processing needed
            }
        ]
    },
    "response_attributes": [
        {
            "attribute": "job_id"
        }
    ],
        "timestamp": "2024-09-27T12:00:00Z"
}

ProcessStepsConfiguration
{
    "name": "Order Creation workflow",
        "workflow": "ecommerce",
            "action": "process_order",
                "steps": [
                    {
                        "step_name": "get_schedules",
                        "numerical_order": 1,
                        "workflow": "ecommerce",
                        "action": "get_schedule",
                        "api_call_id": "66fdacbba0f7d9148a34ece6",
                        "status": "pending",
                        "response": null,
                        "error": null
                    },
                    {
                        "step_name": "create_job_third_party",
                        "numerical_order": 2,
                        "workflow": "ecommerce",
                        "action": "create_job_third_party",
                        "api_call_id": "66fdad04a0f7d9148a34ece7",
                        "status": "pending",
                        "response": null,
                        "error": null
                    }
                ]
}

StateManager
{
    "order_id": "ORD-1001",
        "order": {
        "order_id": "ORD-1001",
            "workflow": "ecommerce",
                "items": [
                    {
                        "item_id": "P001",
                        "name": "Product 1",
                        "quantity": 2,
                        "price": 50.00
                    },
                    {
                        "item_id": "P002",
                        "name": "Product 2",
                        "quantity": 1,
                        "price": 30.00
                    }
                ],
                    "status": "pending"
    },
    "status": "in_progress",
        "start_time": "2024-09-27T12:00:00Z",
            "end_time": "2024-09-27T12:30:00Z",
                "current_step": "check_inventory",
                    "steps": [
                        {
                            "step_name": "check_inventory",
                            "numerical_order": 1,
                            "workflow": "ecommerce",
                            "action": "process_order",
                            "api_call_id": "650b9b8e4f30d72a6f5c6f18",
                            "status": "completed",
                            "response": {
                                "inventory_status": "available"
                            },
                            "error": null
                        },
                        {
                            "step_name": "reserve_inventory",
                            "numerical_order": 2,
                            "workflow": "ecommerce",
                            "action": "process_order",
                            "api_call_id": "650b9b8e4f30d72a6f5c6f19",
                            "status": "in_progress",
                            "response": null,
                            "error": null
                        },
                        {
                            "step_name": "create_shipping_label",
                            "numerical_order": 3,
                            "workflow": "ecommerce",
                            "action": "process_order",
                            "api_call_id": "650b9b8e4f30d72a6f5c6f20",
                            "status": "pending",
                            "response": null,
                            "error": null
                        }
                    ]
}


{
    _id: new ObjectId('66fdbe8376abc6c0a791c213'),
        order_id: 'ORD-1001',
            order: {
        _id: new ObjectId('66fdb85c0746b4f44b118cf0'),
            order_id: 'ORD-1001',
                workflow: 'ecommerce',
                    desired_date: 2024 - 10 - 18T16:00:00.000Z,
                        items: [[Object], [Object]],
                            status: 'processing',
                                version: 1
    },
    status: 'pending',
        start_time: 2024 - 10-02T21: 43: 31.221Z,
            steps: [
                {
                    step_name: 'get_schedules',
                    numerical_order: 1,
                    workflow: 'ecommerce',
                    action: 'get_schedule',
                    api_call_id: null,
                    status: 'pending',
                    response: null,
                    error: null,
                    _id: new ObjectId('66fdbe4776abc6c0a791c20e')
                },
                {
                    step_name: 'create_job_third_party',
                    numerical_order: 2,
                    workflow: 'ecommerce',
                    action: 'create_job_third_party',
                    api_call_id: null,
                    status: 'pending',
                    response: null,
                    error: null,
                    _id: new ObjectId('66fdbe4776abc6c0a791c20f')
                }
            ],
                end_time: 2024 - 10-02T21: 43: 31.227Z,
                    __v: 0
}


{
    _id: new ObjectId('66fdb4b2a0f7d9148a34ecea'),
        api_name: 'Get schedules',
            description: 'This API retrieves available schedules',
                workflow: 'ecommerce',
                    url: 'https://api.inventory-service.com/schedules',
                        method: 'POST',
                            request_attributes: { body: [Array] },
    response_attributes: [[Object]],
        timestamp: 2024 -09 - 27T12:00:00.000Z
},