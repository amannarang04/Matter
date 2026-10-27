import { z } from 'zod';
import { ValidationError, formatNodeError, getNodeLabel } from './errors.js';

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const operandSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('literal'),
    value: z.union([z.number(), z.string(), z.boolean()]),
  }),
  z.object({
    source: z.literal('ref'),
    key: z
      .string()
      .regex(IDENTIFIER_REGEX, 'Context reference key must be a valid identifier (letters, digits, underscore, not starting with digit)'),
  }),
]);

export const inputNodeDataSchema = z.object({
  label: z.string().optional(),
  values: z.record(
    z.string().regex(IDENTIFIER_REGEX, 'Input key must be a valid identifier'),
    z.union([z.number(), z.string(), z.boolean()])
  ),
});

export const mathNodeDataSchema = z.object({
  label: z.string().optional(),
  left: operandSchema,
  op: z.enum(['add', 'subtract', 'multiply', 'divide']),
  right: operandSchema,
  outputKey: z
    .string()
    .regex(IDENTIFIER_REGEX, 'outputKey must be a valid identifier'),
});

export const conditionNodeDataSchema = z.object({
  label: z.string().optional(),
  left: operandSchema,
  op: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'neq']),
  right: operandSchema,
});

export const transformNodeDataSchema = z
  .object({
    label: z.string().optional(),
    input: operandSchema,
    operation: z.enum(['add', 'multiply', 'round', 'toString']),
    param: z.number().optional(),
    outputKey: z
      .string()
      .regex(IDENTIFIER_REGEX, 'outputKey must be a valid identifier'),
  })
  .refine(
    (data) => {
      if (['add', 'multiply'].includes(data.operation)) {
        return typeof data.param === 'number';
      }
      return true;
    },
    {
      message: 'param (number) is required for add and multiply transform operations',
      path: ['param'],
    }
  );

export const delayNodeDataSchema = z.object({
  label: z.string().optional(),
  ms: z
    .number()
    .min(0, 'Delay cannot be negative')
    .max(5000, 'Delay ms has a hard maximum of 5000'),
});

export const outputNodeDataSchema = z.object({
  label: z.string().optional(),
  fields: z.array(
    z.object({
      key: z.string().min(1, 'Output field key cannot be empty'),
      value: operandSchema,
    })
  ),
});

export const nodeSchema = z.object({
  id: z.string().min(1, 'Node id is required'),
  type: z.enum(['input', 'math', 'condition', 'transform', 'delay', 'output']),
  position: z
    .object({
      x: z.number().optional().default(0),
      y: z.number().optional().default(0),
    })
    .optional(),
  data: z.record(z.any()),
});

export const edgeSchema = z.object({
  id: z.string().min(1, 'Edge id is required'),
  source: z.string().min(1, 'Edge source is required'),
  target: z.string().min(1, 'Edge target is required'),
  sourceHandle: z.enum(['true', 'false']).optional().nullable(),
});

export function validateWorkflowDefinition(workflow) {
  const details = [];

  if (!workflow || typeof workflow !== 'object') {
    throw new ValidationError('Workflow must be an object', [
      { field: 'workflow', message: 'Workflow must be an object' },
    ]);
  }

  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  if (!Array.isArray(nodes)) {
    details.push({ field: 'nodes', message: 'Nodes must be an array' });
  }
  if (!Array.isArray(edges)) {
    details.push({ field: 'edges', message: 'Edges must be an array' });
  }

  if (details.length > 0) {
    throw new ValidationError('Invalid workflow structure', details);
  }

  // Contract Limit Checks
  if (nodes.length > 50) {
    details.push({
      field: 'nodes',
      message: `Workflow exceeds maximum limit of 50 nodes (received ${nodes.length})`,
    });
  }

  if (edges.length > 100) {
    details.push({
      field: 'edges',
      message: `Workflow exceeds maximum limit of 100 edges (received ${edges.length})`,
    });
  }

  if (nodes.length > 0 && !nodes.some((n) => n.type === 'input')) {
    details.push({
      field: 'nodes',
      message: 'Workflow must contain at least one input node',
    });
  }

  const nodeMap = new Map();
  const seenOutputKeys = new Map(); // key -> nodeId

  for (let i = 0; i < nodes.length; i++) {
    const rawNode = nodes[i];
    const nodeRes = nodeSchema.safeParse(rawNode);
    if (!nodeRes.success) {
      const nodeLabel = getNodeLabel(rawNode);
      const nodeType = rawNode?.type || 'unknown';
      nodeRes.error.issues.forEach((issue) => {
        details.push({
          nodeId: rawNode?.id || `node[${i}]`,
          field: issue.path.join('.'),
          message: `Node "${nodeLabel}" (${nodeType}): ${issue.message}`,
        });
      });
      continue;
    }

    const node = nodeRes.data;
    if (nodeMap.has(node.id)) {
      details.push({
        nodeId: node.id,
        field: 'id',
        message: formatNodeError(node, `duplicate node ID "${node.id}"`),
      });
    }
    nodeMap.set(node.id, node);

    // Validate node data according to its type
    let dataRes;
    switch (node.type) {
      case 'input':
        dataRes = inputNodeDataSchema.safeParse(node.data);
        if (dataRes.success && dataRes.data.values) {
          for (const key of Object.keys(dataRes.data.values)) {
            if (seenOutputKeys.has(key)) {
              const prevNodeId = seenOutputKeys.get(key);
              const prevNode = nodeMap.get(prevNodeId);
              const prevLabel = getNodeLabel(prevNode);
              details.push({
                nodeId: node.id,
                field: `data.values.${key}`,
                message: formatNodeError(
                  node,
                  `outputKey / context key "${key}" is already defined by node "${prevLabel}"`
                ),
              });
            } else {
              seenOutputKeys.set(key, node.id);
            }
          }
        }
        break;
      case 'math':
        dataRes = mathNodeDataSchema.safeParse(node.data);
        if (dataRes.success) {
          const key = dataRes.data.outputKey;
          if (seenOutputKeys.has(key)) {
            const prevNodeId = seenOutputKeys.get(key);
            const prevNode = nodeMap.get(prevNodeId);
            const prevLabel = getNodeLabel(prevNode);
            details.push({
              nodeId: node.id,
              field: 'data.outputKey',
              message: formatNodeError(
                node,
                `outputKey "${key}" is already defined by node "${prevLabel}"`
              ),
            });
          } else {
            seenOutputKeys.set(key, node.id);
          }
        }
        break;
      case 'condition':
        dataRes = conditionNodeDataSchema.safeParse(node.data);
        break;
      case 'transform':
        dataRes = transformNodeDataSchema.safeParse(node.data);
        if (dataRes.success) {
          const key = dataRes.data.outputKey;
          if (seenOutputKeys.has(key)) {
            const prevNodeId = seenOutputKeys.get(key);
            const prevNode = nodeMap.get(prevNodeId);
            const prevLabel = getNodeLabel(prevNode);
            details.push({
              nodeId: node.id,
              field: 'data.outputKey',
              message: formatNodeError(
                node,
                `outputKey "${key}" is already defined by node "${prevLabel}"`
              ),
            });
          } else {
            seenOutputKeys.set(key, node.id);
          }
        }
        break;
      case 'delay':
        dataRes = delayNodeDataSchema.safeParse(node.data);
        break;
      case 'output':
        dataRes = outputNodeDataSchema.safeParse(node.data);
        break;
      default:
        details.push({
          nodeId: node.id,
          field: 'type',
          message: formatNodeError(node, `unknown node type "${node.type}"`),
        });
        break;
    }

    if (dataRes && !dataRes.success) {
      dataRes.error.issues.forEach((issue) => {
        details.push({
          nodeId: node.id,
          field: `data.${issue.path.join('.')}`,
          message: formatNodeError(node, issue.message),
        });
      });
    }
  }

  // Validate Edges
  const edgeSet = new Set();
  for (let i = 0; i < edges.length; i++) {
    const rawEdge = edges[i];
    const edgeRes = edgeSchema.safeParse(rawEdge);
    if (!edgeRes.success) {
      edgeRes.error.issues.forEach((issue) => {
        details.push({
          edgeId: rawEdge?.id || `edge[${i}]`,
          field: issue.path.join('.'),
          message: issue.message,
        });
      });
      continue;
    }

    const edge = edgeRes.data;
    if (edgeSet.has(edge.id)) {
      details.push({
        edgeId: edge.id,
        field: 'id',
        message: `Duplicate edge ID: ${edge.id}`,
      });
    }
    edgeSet.add(edge.id);

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode) {
      details.push({
        edgeId: edge.id,
        field: 'source',
        message: `Edge source "${edge.source}" does not exist in nodes`,
      });
    }

    if (!targetNode) {
      details.push({
        edgeId: edge.id,
        field: 'target',
        message: `Edge target "${edge.target}" does not exist in nodes`,
      });
    }

    if (sourceNode && sourceNode.type === 'condition') {
      if (edge.sourceHandle !== 'true' && edge.sourceHandle !== 'false') {
        details.push({
          edgeId: edge.id,
          nodeId: sourceNode.id,
          field: 'sourceHandle',
          message: formatNodeError(
            sourceNode,
            'outgoing edge must have sourceHandle set to "true" or "false"'
          ),
        });
      }
    }
  }

  if (details.length > 0) {
    const summaryMessage = details.length === 1 ? details[0].message : 'Workflow validation failed';
    throw new ValidationError(summaryMessage, details);
  }

  // Check DAG / Cycle detection
  detectCycles(nodes, edges);

  return true;
}

function detectCycles(nodes, edges) {
  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((e) => {
    if (adj.has(e.source)) {
      adj.get(e.source).push(e.target);
    }
  });

  const visited = new Set();
  const recStack = new Set();

  function dfs(nodeId, path = []) {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (recStack.has(neighbor)) {
        const cyclePath = [...path, neighbor].join(' -> ');
        throw new ValidationError(`Workflow contains a cycle: ${cyclePath}`, [
          {
            field: 'edges',
            message: `Cycle detected: ${cyclePath}`,
          },
        ]);
      }
    }

    recStack.delete(nodeId);
    path.pop();
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }
}
