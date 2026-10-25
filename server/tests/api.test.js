import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Workflow from '../src/models/Workflow.js';

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

  it('executes a workflow with SSE streaming', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${createdWorkflowId}/execute?stream=true`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

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
});
