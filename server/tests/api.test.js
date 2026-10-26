import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Workflow from '../src/models/Workflow.js';
import { recoverStuckRuns, executeWorkflow } from '../src/services/workflowService.js';

describe('Workflow API Integration Tests', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/matter_test');
    await Workflow.deleteMany({});

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const sampleWorkflow = {
    name: 'Discount Workflow Test',
    description: 'Contract sample workflow test',
    nodes: [
      {
        id: 'node-1',
        type: 'input',
        position: { x: 100, y: 100 },
        data: {
          label: 'Input Prices',
          values: { originalPrice: 1500, discountRate: 0.1 },
        },
      },
      {
        id: 'node-2',
        type: 'math',
        position: { x: 350, y: 100 },
        data: {
          label: 'Calculate Discount',
          left: { source: 'ref', key: 'originalPrice' },
          op: 'multiply',
          right: { source: 'ref', key: 'discountRate' },
          outputKey: 'discount',
        },
      },
      {
        id: 'node-3',
        type: 'output',
        position: { x: 600, y: 100 },
        data: {
          label: 'Output',
          fields: [
            { key: 'discount', value: { source: 'ref', key: 'discount' } },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e2-3', source: 'node-2', target: 'node-3' },
    ],
  };

  let createdWorkflowId;

  it('creates a new workflow', async () => {
    const res = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleWorkflow),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data._id).toBeDefined();
    expect(data.name).toBe('Discount Workflow Test');
    createdWorkflowId = data._id;
  });

  it('returns validation error format when invalid node structure is submitted', async () => {
    const invalidWorkflow = {
      name: 'Invalid',
      nodes: [
        {
          id: 'bad-1',
          type: 'math',
          data: {
            left: { source: 'literal', value: 10 },
            op: 'invalid_op',
            right: { source: 'literal', value: 5 },
            outputKey: '123invalid_key',
          },
        },
      ],
      edges: [],
    };

    const res = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidWorkflow),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(data.error.details)).toBe(true);
    expect(data.error.details.length).toBeGreaterThan(0);
  });

  it('lists workflows', async () => {
    const res = await fetch(`${baseUrl}/api/workflows`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('gets a single workflow by ID', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data._id).toBe(createdWorkflowId);
  });

  it('executes a workflow synchronously', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/execute`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.runContext.discount).toBe(150);
    expect(data.finalOutput.discount).toBe(150);
    expect(data.nodeEvents.length).toBeGreaterThan(0);
  });

  it('executes a workflow with hardened SSE streaming headers', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/execute?stream=true`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('connection')).toBe('keep-alive');
    expect(res.headers.get('x-accel-buffering')).toBe('no');

    const bodyText = await res.text();
    expect(bodyText).toContain('"type":"run"');
    expect(bodyText).toContain('"type":"node"');
  });

  it('retrieves runs history for a workflow', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/runs`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2); // One synchronous, one SSE
  });

  it('retrieves run details with persisted node executions linked to the run', async () => {
    const runsRes = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/runs`);
    const runs = await runsRes.json();
    const runId = runs[0]._id;

    const res = await fetch(`${baseUrl}/api/runs/${runId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data._id).toBe(runId);
    expect(data.status).toBe('success');
    expect(Array.isArray(data.nodeExecutions)).toBe(true);
    expect(data.nodeExecutions.length).toBeGreaterThan(0);
    const firstNode = data.nodeExecutions[0];
    expect(firstNode.nodeId).toBeDefined();
    expect(firstNode.nodeType).toBeDefined();
    expect(firstNode.status).toBeDefined();
    expect(firstNode.startedAt).toBeDefined();
    expect(firstNode.completedAt).toBeDefined();
  });

  it('retries a run creating a new run via POST /api/runs/:id/retry', async () => {
    const runsRes = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/runs`);
    const runs = await runsRes.json();
    const runId = runs[0]._id;

    const res = await fetch(`${baseUrl}/api/runs/${runId}/retry`, { method: 'POST' });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.runId).toBeDefined();
    expect(data.runId).not.toBe(runId);
    expect(data.status).toBe('success');
  });

  it('allows starting a run via POST /api/workflows/:id/run alias', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/run`, { method: 'POST' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
  });

  it('rejects workflow if missing an input node', async () => {
    const workflowWithoutInput = {
      name: 'No Input',
      nodes: [
        {
          id: 'math-1',
          type: 'math',
          data: {
            left: { source: 'literal', value: 1 },
            op: 'add',
            right: { source: 'literal', value: 2 },
            outputKey: 'res',
          },
        },
      ],
      edges: [],
    };

    const res = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowWithoutInput),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.details.some((d) => d.message.includes('at least one input node'))).toBe(true);
  });

  it('returns 409 CONCURRENT_RUN_CONFLICT when a run is already in progress', async () => {
    // Import Run model to simulate an active run
    const RunModel = mongoose.model('Run');
    const activeRun = await RunModel.create({
      workflowId: createdWorkflowId,
      status: 'running',
      startedAt: new Date(),
    });

    try {
      const res = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/run`, {
        method: 'POST',
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.code).toBe('CONCURRENT_RUN_CONFLICT');
      expect(data.error.message).toContain(activeRun._id.toString());
      expect(data.error.details[0].activeRunId).toBe(activeRun._id.toString());
    } finally {
      // Clean up the active run to release the guard for other tests
      await RunModel.findByIdAndDelete(activeRun._id);
    }
  });

  it('recovers stuck pending and running runs and node executions on server startup', async () => {
    const RunModel = mongoose.model('Run');
    const NodeExecutionModel = mongoose.model('NodeExecution');

    const stuckRun = await RunModel.create({
      workflowId: createdWorkflowId,
      status: 'running',
      startedAt: new Date(Date.now() - 60000),
    });

    const stuckNode = await NodeExecutionModel.create({
      runId: stuckRun._id,
      workflowId: createdWorkflowId,
      nodeId: 'node-delay-test',
      nodeType: 'delay',
      status: 'running',
      startedAt: new Date(Date.now() - 60000),
    });

    const recoveryResult = await recoverStuckRuns();
    expect(recoveryResult.recoveredRuns).toBeGreaterThanOrEqual(1);
    expect(recoveryResult.recoveredNodes).toBeGreaterThanOrEqual(1);

    const updatedRun = await RunModel.findById(stuckRun._id);
    expect(updatedRun.status).toBe('failed');
    expect(updatedRun.errorSummary).toBe('Run was interrupted by a server restart');
    expect(updatedRun.completedAt).toBeDefined();

    const updatedNode = await NodeExecutionModel.findById(stuckNode._id);
    expect(updatedNode.status).toBe('failed');
    expect(updatedNode.error).toBe('Run was interrupted by a server restart');
    expect(updatedNode.completedAt).toBeDefined();
  });

  it('handles execution timeout in finally block and releases concurrent run guard', async () => {
    // Create a workflow with a delay node
    const timeoutWorkflow = await Workflow.create({
      name: 'Timeout Test Workflow',
      nodes: [
        {
          id: 'n-in',
          type: 'input',
          data: { label: 'Input', values: { val: 1 } },
        },
        {
          id: 'n-delay',
          type: 'delay',
          data: { label: 'Slow Delay', ms: 500 },
        },
        {
          id: 'n-out',
          type: 'output',
          data: { label: 'Output', fields: [{ key: 'out', value: { source: 'ref', key: 'val' } }] },
        },
      ],
      edges: [
        { id: 'e1', source: 'n-in', target: 'n-delay' },
        { id: 'e2', source: 'n-delay', target: 'n-out' },
      ],
    });

    // Execute with a short timeout (50ms)
    const result = await executeWorkflow(timeoutWorkflow._id, null, { timeoutMs: 50 });
    expect(result.status).toBe('failed');
    expect(result.errorSummary).toContain('timed out after 50ms');

    // Verify Run record was finalized with completedAt
    const RunModel = mongoose.model('Run');
    const savedRun = await RunModel.findById(result.runId);
    expect(savedRun.status).toBe('failed');
    expect(savedRun.completedAt).toBeDefined();

    // Verify duplicate-run guard is released by immediately running again without 409
    const secondRun = await executeWorkflow(timeoutWorkflow._id, null, { timeoutMs: 2000 });
    expect(secondRun.status).toBe('success');
  });
});

