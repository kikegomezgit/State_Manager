# State_Manager
# Overall explanation

ENV VARS on .env:
MONGO_SRV={{your_mongodb_connection_srv}}

# INSTRUCTIONS AND USE MANUAL

# ROUTES:
create order
    POST http://localhost:3001/webhook
    {
        "queue":"initial",
        "order": {
            "order_id": "2024112312-01",
            "workflow": "ecommerce",
            "desired_date": "2024-11-23T16:00:00Z",
            "items": [
                {
                    "item_id": "P003-94",
                    "name": "item random",
                    "quantity": 2,
                    "price": 100
                },
                {
                    "item_id": "P003-96",
                    "name": "item random 2",
                    "quantity": 3,
                    "price": 50
                }
            ]
        }
    }


reprocess all or some orders by id
    POST http://localhost:3001/reprocess
    {
        "queue":"initial",
        "orders": ["2024112307-01"],//optional
        "workflow": "ecommerce"
    }


# DATABASE SCHEMAS ON MONGODBCLOUD
example of document inserted manually on apicall
keypoints: 
    -apicalls has to exist to be used by steps on workflowBlueprint
1-
{
    "_id": {
        "$oid": "66fdb4b2a0f7d9148a34ecea"
    },
    "api_name": "Get schedules",
    "description": "This API retrieves available schedules",
    "workflow": "ecommerce",
    "url": "http://localhost:8088/api/schedules",
    "method": "POST",
    "request_attributes": {
        "body": [
            {
                "attribute": "items"
            },
            {
                "attribute": "desired_date"
            }
        ]
    },
    "response_attributes": [
        {
            "attribute": "schedule",
            "process_function": "firstOfArray"
        }
    ],
    "timestamp": "2024-09-27T12:00:00Z"
}
2-
{
    "_id": {
        "$oid": "66fdb4daa0f7d9148a34eceb"
    },
    "api_name": "Create job",
    "description": "This API creates the job on third party",
    "workflow": "ecommerce",
    "url": "http://localhost:8088/api/createJob",
    "method": "POST",
    "request_attributes": {
        "body": [
            {
                "attribute": "order"
            },
            {
                "attribute": "schedule",
                "source": "step_data"
            }
        ]
    },
    "response_attributes": [
        {
            "attribute": "job_id",
            "source": "result"
        }
    ],
    "timestamp": "2024-09-27T12:00:00Z"
}

example of document inserted manually on workflowBlueprint
keypoints: 
    -api_call_id has to be linked with ApiCalls schemas documents on non waits

{
    "name": "Order Creation workflow",
    "workflow": "ecommerce",
    "steps": [
        {
            "step_name": "get_schedules",
            "numerical_order": 1,
            "action": "get_schedule",
            "active":true,
            "api_call_id": "66fdb4b2a0f7d9148a34ecea",
        },
        {
            "step_name": "wait",
            "numerical_order": 2,
            "action": "60",
            "active":true,
            "api_call_id": null
        },
        {
            "step_name": "create_job_third_party",
            "numerical_order": 3,
            "action": "create_job_third_party",
            "active":true,
            "api_call_id": "66fdb4daa0f7d9148a34eceb"
        },
        {
            "step_name": "wait",
            "numerical_order": 4,
            "action": "30",
            "active":true,
            "api_call_id": null
        }
    ]
}
# FUNCTIONPOOL
-functionPool is an library of available functions to be used on apicalls for request attributes and response attributes "process_function": "firstOfArray"
