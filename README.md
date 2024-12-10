# **State_Manager**

---

## **Overview**

Environment variables required in the `.env` file:

```env
MONGO_SRV={{your_mongodb_connection_srv}}
```

---

## **Instructions and User Manual**

### **Routes**

#### **1. Create Order**
**Endpoint:**
```plaintext
POST http://localhost:3001/webhook
```

**Payload:**
```json
{
    "queue": "initial",
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
```

---

#### **2. Reprocess Orders**
**Endpoint:**
```plaintext
POST http://localhost:3001/reprocess
```

**Payload:**
```json
{
    "queue": "initial",
    "orders": ["2024112307-01"], // optional
    "workflow": "ecommerce"
}
```

---

## **Database Schemas on MongoDBCloud**

### Example 1: Document inserted manually on **ApiCalls**
**Key Points:**
- `ApiCalls` must exist to be used by steps in `workflowBlueprint`.
- Authorization can and should be implemented using the same blueprint logic.

```json
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
```

### Example 2: Document inserted manually on **ApiCalls**
```json
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
```

---

## **Explanation of Key Points on ApiCalls**

### Request Attributes
```json
"request_attributes": {
    "body": [
        {
            "attribute": "items"
        },
        {
            "attribute": "desired_date"
        }
    ]
}
```

### Response Attributes
```json
"response_attributes": [
    {
        "attribute": "schedule",
        "process_function": "firstOfArray"
    }
]
```

- **Request Attributes**: 
  - `attribute`: The field name.
  - `source` (optional): Defines the data source. Options:
    - `order` (default): Implied, no need to specify.
    - `result`: From the response result (only for `response_attributes`).
    - `step_data`: Data accumulated from all previously completed steps.
  - **Optional**: `process_function`: Uses a function from the `functionPool`.

---

## **Example of WorkflowBlueprint**

**Key Points:**
- `api_call_id` must link with documents in `ApiCalls`.

```json
{
    "name": "Order Creation workflow",
    "workflow": "ecommerce",
    "steps": [
        {
            "step_name": "get_schedules",
            "numerical_order": 1,
            "action": "get_schedule",
            "active": true,
            "api_call_id": "66fdb4b2a0f7d9148a34ecea"
        },
        {
            "step_name": "wait",
            "numerical_order": 2,
            "action": "60",
            "active": true,
            "api_call_id": null
        },
        {
            "step_name": "create_job_third_party",
            "numerical_order": 3,
            "action": "create_job_third_party",
            "active": true,
            "api_call_id": "66fdb4daa0f7d9148a34eceb"
        },
        {
            "step_name": "wait",
            "numerical_order": 4,
            "action": "30",
            "active": true,
            "api_call_id": null
        }
    ]
}
```

---

## **FunctionPool**

- The `FunctionPool` is a library of functions available for use in `ApiCalls`.
- Example:
```json
"process_function": "firstOfArray"
```
"""