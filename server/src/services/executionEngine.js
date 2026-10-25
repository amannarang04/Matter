import { EventEmitter } from 'events';
import { ExecutionError } from '../utils/errors.js';

export function resolveOperand(operand, context) {
  if (!operand || typeof operand !== 'object') {
    throw new ExecutionError(`Invalid operand: ${JSON.stringify(operand)}`);
  }

  if (operand.source === 'literal') {
    return operand.value;
  }

  if (operand.source === 'ref') {
    if (!Object.prototype.hasOwnProperty.call(context, operand.key)) {
      throw new ExecutionError(`Context reference key "${operand.key}" not found in run context`);
    }
    return context[operand.key];
  }

  throw new ExecutionError(`Unknown operand source: "${operand.source}"`);
}

export function topologicalSort(nodes, edges) {
  const inDegree = new Map();
  const adj = new Map();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source).push(e.target);
      inDegree.set(e.target, inDegree.get(e.target) + 1);
    }
  });

  const queue = [];
  inDegree.forEach((deg, nodeId) => {
    if (deg === 0) queue.push(nodeId);
  });

  const sortedIds = [];
  while (queue.length > 0) {
    const u = queue.shift();
    sortedIds.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      inDegree.set(v, inDegree.get(v) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  if (sortedIds.length !== nodes.length) {
    throw new ExecutionError('Workflow graph has a cycle or unreachable nodes');
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sortedIds.map((id) => nodeMap.get(id));
}

export class ExecutionEngine extends EventEmitter {
  constructor(workflow, options = {}) {
    super();
    this.workflow = workflow;
    this.runId = options.runId || `run_${Date.now()}`;
    this.timeoutMs = options.timeoutMs || 30000;
    this.context = {};
    this.finalOutput = {};
    this.nodeEvents = [];
    this.nodeExecutions = [];
    this.isAborted = false;
  }

  emitEvent(event) {
    this.emit('event', event);
  }

  async run() {
    const startedAt = Date.now();
    const nodes = this.workflow.nodes || [];
    const edges = this.workflow.edges || [];

    // Emit initial run event
    const initialRunEvent = {
      type: 'run',
      runId: this.runId,
      status: 'running',
      finalOutput: {},
      errorSummary: null,
      timestamp: startedAt,
    };
    this.emitEvent(initialRunEvent);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ExecutionError(`Workflow execution timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });

    try {
      const executionPromise = this.executeWorkflow(nodes, edges);
      await Promise.race([executionPromise, timeoutPromise]);

      const completedAt = Date.now();
      const finalRunEvent = {
        type: 'run',
        runId: this.runId,
        status: 'success',
        finalOutput: this.finalOutput,
        errorSummary: null,
        timestamp: completedAt,
      };
      this.emitEvent(finalRunEvent);

      return {
        runId: this.runId,
        status: 'success',
        runContext: this.context,
        finalOutput: this.finalOutput,
        errorSummary: null,
        nodeEvents: this.nodeEvents,
        nodeExecutions: this.nodeExecutions,
        durationMs: completedAt - startedAt,
      };
    } catch (error) {
      const failedAt = Date.now();
      const errorMsg = error.message || 'Execution error';
      const failedRunEvent = {
        type: 'run',
        runId: this.runId,
        status: 'failed',
        finalOutput: this.finalOutput,
        errorSummary: errorMsg,
        timestamp: failedAt,
      };
      this.emitEvent(failedRunEvent);

      return {
        runId: this.runId,
        status: 'failed',
        runContext: this.context,
        finalOutput: this.finalOutput,
        errorSummary: errorMsg,
        nodeEvents: this.nodeEvents,
        nodeExecutions: this.nodeExecutions,
        durationMs: failedAt - startedAt,
      };
    }
  }

  async executeWorkflow(nodes, edges) {
    if (nodes.length === 0) return;

    const sortedNodes = topologicalSort(nodes, edges);

    // Track active status for edges: edge.id -> boolean (true = active, false = unselected)
    const activeEdges = new Map();
    // Track node status: nodeId -> 'success' | 'failed' | 'skipped'
    const nodeStatus = new Map();

    const incomingEdgesByNode = new Map();
    const outgoingEdgesByNode = new Map();

    nodes.forEach((n) => {
      incomingEdgesByNode.set(n.id, []);
      outgoingEdgesByNode.set(n.id, []);
    });

    edges.forEach((e) => {
      if (incomingEdgesByNode.has(e.target)) {
        incomingEdgesByNode.get(e.target).push(e);
      }
      if (outgoingEdgesByNode.has(e.source)) {
        outgoingEdgesByNode.get(e.source).push(e);
      }
    });

    for (const node of sortedNodes) {
      if (this.isAborted) {
        throw new ExecutionError('Workflow execution aborted');
      }

      const incoming = incomingEdgesByNode.get(node.id) || [];
      const outgoing = outgoingEdgesByNode.get(node.id) || [];

      // Branching rule:
      // A node is Skipped when every path that could reach it passes through an unselected condition branch.
      // If node has incoming edges, it is skipped if NO incoming edge is active.
      let isSkipped = false;
      if (incoming.length > 0) {
        const hasActiveIncoming = incoming.some((edge) => activeEdges.get(edge.id) === true);
        if (!hasActiveIncoming) {
          isSkipped = true;
        }
      }

      if (isSkipped) {
        nodeStatus.set(node.id, 'skipped');
        // Mark all outgoing edges as inactive
        outgoing.forEach((edge) => activeEdges.set(edge.id, false));

        const skippedEvent = {
          type: 'node',
          runId: this.runId,
          nodeId: node.id,
          status: 'skipped',
          inputs: {},
          outputs: {},
          error: null,
          durationMs: 0,
          timestamp: Date.now(),
        };
        this.nodeEvents.push(skippedEvent);
        this.nodeExecutions.push({
          nodeId: node.id,
          nodeType: node.type,
          status: 'skipped',
          inputs: {},
          outputs: {},
          error: null,
          startedAt: new Date(),
          completedAt: new Date(),
          durationMs: 0,
        });
        this.emitEvent(skippedEvent);
        continue;
      }

      // Execute the node
      const nodeStartTime = Date.now();
      const runningEvent = {
        type: 'node',
        runId: this.runId,
        nodeId: node.id,
        status: 'running',
        inputs: {},
        outputs: {},
        error: null,
        durationMs: 0,
        timestamp: nodeStartTime,
      };
      this.emitEvent(runningEvent);

      try {
        const { inputs, outputs, conditionResult } = await this.executeNodeLogic(node);
        const nodeDuration = Date.now() - nodeStartTime;

        nodeStatus.set(node.id, 'success');

        // Configure outgoing edges
        if (node.type === 'condition') {
          outgoing.forEach((edge) => {
            const isMatch = String(conditionResult) === edge.sourceHandle;
            activeEdges.set(edge.id, isMatch);
          });
        } else {
          outgoing.forEach((edge) => {
            activeEdges.set(edge.id, true);
          });
        }

        const successEvent = {
          type: 'node',
          runId: this.runId,
          nodeId: node.id,
          status: 'success',
          inputs,
          outputs,
          error: null,
          durationMs: nodeDuration,
          timestamp: Date.now(),
        };
        this.nodeEvents.push(successEvent);
        this.nodeExecutions.push({
          nodeId: node.id,
          nodeType: node.type,
          status: 'success',
          inputs,
          outputs,
          error: null,
          startedAt: new Date(nodeStartTime),
          completedAt: new Date(),
          durationMs: nodeDuration,
        });
        this.emitEvent(successEvent);
      } catch (err) {
        const nodeDuration = Date.now() - nodeStartTime;
        nodeStatus.set(node.id, 'failed');
        outgoing.forEach((edge) => activeEdges.set(edge.id, false));

        const failedEvent = {
          type: 'node',
          runId: this.runId,
          nodeId: node.id,
          status: 'failed',
          inputs: {},
          outputs: {},
          error: err.message,
          durationMs: nodeDuration,
          timestamp: Date.now(),
        };
        this.nodeEvents.push(failedEvent);
        this.nodeExecutions.push({
          nodeId: node.id,
          nodeType: node.type,
          status: 'failed',
          inputs: {},
          outputs: {},
          error: err.message,
          startedAt: new Date(nodeStartTime),
          completedAt: new Date(),
          durationMs: nodeDuration,
        });
        this.emitEvent(failedEvent);

        throw err;
      }
    }
  }

  async executeNodeLogic(node) {
    const data = node.data || {};
    let inputs = {};
    let outputs = {};
    let conditionResult = null;

    switch (node.type) {
      case 'input': {
        const values = data.values || {};
        inputs = {};
        outputs = { ...values };
        for (const [key, val] of Object.entries(values)) {
          this.context[key] = val;
        }
        break;
      }

      case 'math': {
        const leftVal = resolveOperand(data.left, this.context);
        const rightVal = resolveOperand(data.right, this.context);

        if (typeof leftVal !== 'number' || typeof rightVal !== 'number') {
          throw new ExecutionError(
            `Math node "${node.id}" operands must evaluate to numbers (received left: ${typeof leftVal}, right: ${typeof rightVal})`
          );
        }

        inputs = { left: leftVal, right: rightVal, op: data.op };
        let result;
        switch (data.op) {
          case 'add':
            result = leftVal + rightVal;
            break;
          case 'subtract':
            result = leftVal - rightVal;
            break;
          case 'multiply':
            result = leftVal * rightVal;
            break;
          case 'divide':
            if (rightVal === 0) {
              throw new ExecutionError(`Division by zero in math node "${node.id}"`);
            }
            result = leftVal / rightVal;
            break;
          default:
            throw new ExecutionError(`Unknown math operation "${data.op}" in node "${node.id}"`);
        }

        this.context[data.outputKey] = result;
        outputs = { [data.outputKey]: result };
        break;
      }

      case 'condition': {
        const leftVal = resolveOperand(data.left, this.context);
        const rightVal = resolveOperand(data.right, this.context);

        inputs = { left: leftVal, right: rightVal, op: data.op };

        switch (data.op) {
          case 'gt':
            conditionResult = leftVal > rightVal;
            break;
          case 'lt':
            conditionResult = leftVal < rightVal;
            break;
          case 'eq':
            conditionResult = leftVal === rightVal;
            break;
          case 'gte':
            conditionResult = leftVal >= rightVal;
            break;
          case 'lte':
            conditionResult = leftVal <= rightVal;
            break;
          case 'neq':
            conditionResult = leftVal !== rightVal;
            break;
          default:
            throw new ExecutionError(`Unknown condition operation "${data.op}" in node "${node.id}"`);
        }

        outputs = { conditionResult };
        break;
      }

      case 'transform': {
        const inputVal = resolveOperand(data.input, this.context);
        inputs = { input: inputVal, operation: data.operation };
        if (data.param !== undefined) {
          inputs.param = data.param;
        }

        let result;
        switch (data.operation) {
          case 'add': {
            if (typeof inputVal !== 'number' || typeof data.param !== 'number') {
              throw new ExecutionError(`Transform add operation requires numeric input and param in node "${node.id}"`);
            }
            result = inputVal + data.param;
            break;
          }
          case 'multiply': {
            if (typeof inputVal !== 'number' || typeof data.param !== 'number') {
              throw new ExecutionError(`Transform multiply operation requires numeric input and param in node "${node.id}"`);
            }
            result = inputVal * data.param;
            break;
          }
          case 'round': {
            const num = Number(inputVal);
            if (isNaN(num)) {
              throw new ExecutionError(`Transform round operation requires numeric input in node "${node.id}"`);
            }
            result = Math.round(num);
            break;
          }
          case 'toString': {
            result = String(inputVal);
            break;
          }
          default:
            throw new ExecutionError(`Unknown transform operation "${data.operation}" in node "${node.id}"`);
        }

        this.context[data.outputKey] = result;
        outputs = { [data.outputKey]: result };
        break;
      }

      case 'delay': {
        const ms = Number(data.ms) || 0;
        if (ms < 0 || ms > 5000) {
          throw new ExecutionError(`Delay node "${node.id}" ms must be between 0 and 5000`);
        }
        inputs = { ms };
        outputs = {};
        if (ms > 0) {
          await new Promise((resolve) => setTimeout(resolve, ms));
        }
        break;
      }

      case 'output': {
        const fields = data.fields || [];
        inputs = {};
        outputs = {};

        for (const field of fields) {
          const val = resolveOperand(field.value, this.context);
          inputs[field.key] = val;
          outputs[field.key] = val;
          this.finalOutput[field.key] = val;
        }
        break;
      }

      default:
        throw new ExecutionError(`Unsupported node type "${node.type}" in node "${node.id}"`);
    }

    return { inputs, outputs, conditionResult };
  }
}
