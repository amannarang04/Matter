# Matter Workflow Data Contract

## A. Run context (how data flows)
- The engine keeps one shared key-value object per run called the run context.
- Every node that produces data writes its result into the context under a user-defined "outputKey". outputKey must be a valid identifier (letters, digits, underscore, not starting with a digit) and unique across the workflow.
- Downstream nodes read values by naming a context key. They never read another node's internals directly.
- Operand shape used everywhere:
  ```json
  { "source": "literal", "value": 10 }
  ```
  or
  ```json
  { "source": "ref", "key": "discount" }
  ```

## B. Node shapes
Each node is `{ id, type, position, data }`. Data definitions for each type:
- **input**: `{ label, values: { [key]: number|string|boolean } }`. On execution, every key in values is written to the context.
- **math**: `{ label, left: Operand, op: "add"|"subtract"|"multiply"|"divide", right: Operand, outputKey }`.
- **condition**: `{ label, left: Operand, op: "gt"|"lt"|"eq"|"gte"|"lte"|"neq", right: Operand }`. Writes nothing to the context. It selects a branch. Its outgoing edges use sourceHandle `"true"` or `"false"`.
- **transform**: `{ label, input: Operand, operation: "add"|"multiply"|"round"|"toString", param (number, only for add and multiply), outputKey }`.
- **delay**: `{ label, ms }` with a hard maximum of 5000. Passes through, writes nothing.
- **output**: `{ label, fields: [ { key: string, value: Operand } ] }`. Builds a `finalOutput` object from its fields.

## C. Edges
`{ id, source, target, sourceHandle (optional, "true"/"false" for condition nodes) }`.

## D. Branching rule
A node is Skipped when every path that could reach it passes through an unselected condition branch. Only output nodes that actually ran contribute to `finalOutput`.

## E. Statuses
- Node: `pending` | `running` | `success` | `failed` | `skipped`
- Run: `pending` | `running` | `success` | `failed`

## F. SSE event schema (same on server and client)
- **node event**:
  ```json
  {
    "type": "node",
    "runId": "string",
    "nodeId": "string",
    "status": "pending|running|success|failed|skipped",
    "inputs": {},
    "outputs": {},
    "error": null,
    "durationMs": 0,
    "timestamp": 1700000000000
  }
  ```
- **run event**:
  ```json
  {
    "type": "run",
    "runId": "string",
    "status": "pending|running|success|failed",
    "finalOutput": {},
    "errorSummary": null,
    "timestamp": 1700000000000
  }
  ```
*Note: Inputs for a node event means the resolved operand values actually used, not the raw config.*

## G. Error response shape for every API error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "human readable text",
    "details": []
  }
}
```
*Validation errors should name the node id and the field.*

## H. Limits
- Max 50 nodes
- Max 100 edges
- Delay max 5000 ms
- Whole run timeout 30 seconds

## I. Worked example: Discount Workflow

### Complete JSON Example
```json
{
  "workflow": {
    "nodes": [
      {
        "id": "node-1",
        "type": "input",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "Input Prices",
          "values": {
            "originalPrice": 1500,
            "discountRate": 0.1
          }
        }
      },
      {
        "id": "node-2",
        "type": "math",
        "position": { "x": 350, "y": 100 },
        "data": {
          "label": "Calculate Discount",
          "left": { "source": "ref", "key": "originalPrice" },
          "op": "multiply",
          "right": { "source": "ref", "key": "discountRate" },
          "outputKey": "discount"
        }
      },
      {
        "id": "node-3",
        "type": "math",
        "position": { "x": 600, "y": 100 },
        "data": {
          "label": "Calculate Discounted Price",
          "left": { "source": "ref", "key": "originalPrice" },
          "op": "subtract",
          "right": { "source": "ref", "key": "discount" },
          "outputKey": "discountedPrice"
        }
      },
      {
        "id": "node-4",
        "type": "condition",
        "position": { "x": 850, "y": 100 },
        "data": {
          "label": "Check Price Threshold",
          "left": { "source": "ref", "key": "discountedPrice" },
          "op": "gt",
          "right": { "source": "literal", "value": 1000 }
        }
      },
      {
        "id": "node-5",
        "type": "output",
        "position": { "x": 1100, "y": 50 },
        "data": {
          "label": "Premium Tier Output",
          "fields": [
            { "key": "originalPrice", "value": { "source": "ref", "key": "originalPrice" } },
            { "key": "discount", "value": { "source": "ref", "key": "discount" } },
            { "key": "discountedPrice", "value": { "source": "ref", "key": "discountedPrice" } },
            { "key": "category", "value": { "source": "literal", "value": "Premium" } }
          ]
        }
      },
      {
        "id": "node-6",
        "type": "output",
        "position": { "x": 1100, "y": 250 },
        "data": {
          "label": "Standard Tier Output",
          "fields": [
            { "key": "originalPrice", "value": { "source": "ref", "key": "originalPrice" } },
            { "key": "discount", "value": { "source": "ref", "key": "discount" } },
            { "key": "discountedPrice", "value": { "source": "ref", "key": "discountedPrice" } },
            { "key": "category", "value": { "source": "literal", "value": "Standard" } }
          ]
        }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "node-1",
        "target": "node-2"
      },
      {
        "id": "e2-3",
        "source": "node-2",
        "target": "node-3"
      },
      {
        "id": "e3-4",
        "source": "node-3",
        "target": "node-4"
      },
      {
        "id": "e4-5",
        "source": "node-4",
        "target": "node-5",
        "sourceHandle": "true"
      },
      {
        "id": "e4-6",
        "source": "node-4",
        "target": "node-6",
        "sourceHandle": "false"
      }
    ]
  }
}
```

### Expected Context After the Run
```json
{
  "originalPrice": 1500,
  "discountRate": 0.1,
  "discount": 150,
  "discountedPrice": 1350
}
```

### Expected finalOutput
```json
{
  "originalPrice": 1500,
  "discount": 150,
  "discountedPrice": 1350,
  "category": "Premium"
}
```
*Explanation: `discountedPrice` (1350) > 1000 evaluates to `true`. Node `node-5` runs and produces the final output. Node `node-6` is skipped as its incoming edge originates from the unselected `"false"` handle of `node-4`.*

---

## J. REST Endpoints

### 1. Health & Diagnostics
| Method | Path | Purpose | Success Status | Error Codes |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Health check verifying server responsiveness and MongoDB connection state | `200` (`503` if degraded) | - |

### 2. Workflows (`/api/workflows`)
| Method | Path | Purpose | Success Status | Error Codes |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/workflows` | Create a new workflow definition with graph validation | `201` | `VALIDATION_ERROR` (400) |
| `GET` | `/api/workflows` | List all saved workflows sorted by last update date | `200` | - |
| `GET` | `/api/workflows/:id` | Retrieve a single workflow definition by ID | `200` | `NOT_FOUND` (404) |
| `PUT` | `/api/workflows/:id` | Update workflow metadata, nodes, and edges | `200` | `VALIDATION_ERROR` (400), `NOT_FOUND` (404) |
| `DELETE` | `/api/workflows/:id` | Delete workflow and cascade delete associated runs and node executions | `200` | `NOT_FOUND` (404) |
| `POST` | `/api/workflows/:id/execute` | Execute workflow synchronously or stream live SSE execution events (`?stream=true` or `Accept: text/event-stream`). Rate limited. | `200` | `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `CONCURRENT_RUN_CONFLICT` (409), `RATE_LIMIT_EXCEEDED` (429) |
| `POST` | `/api/workflows/:id/run` | Execution alias for `POST /api/workflows/:id/execute`. Rate limited. | `200` | `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `CONCURRENT_RUN_CONFLICT` (409), `RATE_LIMIT_EXCEEDED` (429) |
| `GET` | `/api/workflows/:id/runs` | Retrieve execution run history for a workflow (latest 50 runs) | `200` | `NOT_FOUND` (404) |

### 3. Runs (`/api/runs`)
| Method | Path | Purpose | Success Status | Error Codes |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/runs/:id` | Retrieve run details including individual persisted node executions | `200` | `NOT_FOUND` (404) |
| `POST` | `/api/runs/:id/retry` | Re-run workflow associated with a past run ID (creates a new run record). Supports synchronous or SSE stream. Rate limited. | `201` (sync) / `200` (SSE) | `NOT_FOUND` (404), `CONCURRENT_RUN_CONFLICT` (409), `RATE_LIMIT_EXCEEDED` (429) |

