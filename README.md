# **State_Manager**
## Pending to do chores:
    -Fix pagination
    -Real login Api(front)
    -Sleep mode on processing but keep receiving orders and save on cache
    -Create state orders on batches by cache
    -Reprocess all failed orders from all time
## PDF
You can view the [project details here](./State Manager.pdf](https://github.com/kikegomezgit/State_Manager/blob/main/State%20Manager.pdf).
---

## **Overview**

Environment variables required in the `.env` file:

```env
MONGO_SRV={your_mongodb_connection_srv}
SECRET_API_TOKEN={your_secret} example: asdasd77jSkd2s
SECRET_WH_TOKEN={your_secret} example: %4kdakjK.43
```

---

## **Instructions and User Manual**

### **Routes**

#### **1. Create Order**
**Endpoint:**
```plaintext
POST http://localhost:3001/webhook
HEADERS: webhookapitoken:SECRET_WH_TOKEN
```

**Payload:**
```json
{
    "workflow":"ecommerce_creation",
    "order": {
        "order_id": "2024112360-01",
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
HEADERS: webhookapitoken:SECRET_WH_TOKEN
```

**Payload:**
```json
{
    "orders": ["2024112316-01"],
    "workflow": "ecommerce_creation" or "ecommerce_payment"
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
    "workflow": "ecommerce_creation",
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
    "workflow": "ecommerce_creation",
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

### Example 3: Document inserted manually on **ApiCalls**
this apicall is used only if step 1 fails as configured on workflowBlueprint onFailed
```json
{
    "_id": {
        "$oid": "6758a52bc740e5fbe0339680"
    },
    "api_name": "Recover schedules on failed",
    "description": "This API retrieves schedules in case of failed",
    "workflow": "ecommerce_creation",
    "url": "http://localhost:8088/api/recoverSchedule",
    "method": "POST",
    "request_attributes": {
        "body": [
            {
                "attribute": "order_id"
            }
        ]
    },
    "response_attributes": [
        {
            "attribute": "schedule",
            "process_function": "firstOfArray"
        }
    ]
}
```
```json
{
    "_id": {
        "$oid": "6759e9a9c740e5fbe034394e"
    },
    "api_name": "Confirm payment on X system",
    "description": "This API confirms payment on X system",
    "workflow": "ecommerce_payment",
    "url": "http://localhost:8088/api/orderConfirmationPaid",
    "method": "POST",
    "request_attributes": {
        "body": [
            {
                "attribute": "order"
            }
        ]
    },
    "response_attributes": [
        {
            "attribute": "confirmation_id",
            "source": "result"
        }
    ],
    "timestamp": "2024-12-11T12:00:00Z"
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
-workflow has to be unique per WorkflowBlueprint ecommerce_creation, ecommerce_payment
a wait time can be set as part of step
-"numerical_order": always has to be arranged on the order that steps will be used
```json
{
            "step_name": "wait",
            "numerical_order": {
                "$numberInt": "2"
            },
            "action": "60",
            "active": true,
            "api_call_id": null
}
```

```json
{
    "name": "Order Creation workflow",
    "workflow": "ecommerce_creation",
    "steps": [
        {
            "step_name": "get_schedules",
            "numerical_order": {
                "$numberInt": "1"
            },
            "action": "get_schedule",
            "active": true,
            "api_call_id": "66fdb4b2a0f7d9148a34ecea",
            "onFailed": {
                "api_call_id": "6758a52bc740e5fbe0339680",
                "active": true
            }
        },
        {
            "step_name": "wait",
            "numerical_order": {
                "$numberInt": "2"
            },
            "action": "60",
            "active": true,
            "api_call_id": null
        },
        {
            "step_name": "create_job_third_party",
            "numerical_order": {
                "$numberInt": "3"
            },
            "action": "create_job_third_party",
            "active": true,
            "api_call_id": "66fdb4daa0f7d9148a34eceb"
        },
        {
            "step_name": "wait",
            "numerical_order": {
                "$numberInt": "4"
            },
            "action": "30",
            "active": true,
            "api_call_id": null
        }
    ]
}
```
```json
{
    "name": "Order confirmation workflow",
    "workflow": "ecommerce_payment",
    "steps": [
        {
            "step_name": "confirm_payment_on_x_system",
            "numerical_order": {
                "$numberInt": "1"
            },
            "action": "confirm_payment_on_x_system",
            "active": true,
            "api_call_id": "6759e9a9c740e5fbe034394e"
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
