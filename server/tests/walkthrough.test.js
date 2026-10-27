import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Workflow from '../src/models/Workflow.js';
import Run from '../src/models/Run.js';
import NodeExecution from '../src/models/NodeExecution.js';

describe('Step 3 Walkthrough Verification', () => {
  let server;
  let baseUrl;

  const workspace1 = '11111111-1111-4111-8111-111111111111';
  const workspace2 = '22222222-2222-4222-8222-222222222222';
  let savedWorkflowId;

  const sampleTemplateWorkflow = {
    name: 'Discount & Tier Evaluation (Contract Example)',
    description: 'Calculates discount rate, evaluates threshold, and routes to Premium or Standard tier.',
    nodes: [
      {
        id: 'node-1',
        type: 'input',
        position: { x: 80, y: 160 },
        data: {
          label: 'Input Prices',
          values: { originalPrice: 1500, discountRate: 0.1 },
        },
      },
      {
        id: 'node-2',
        type: 'math',
        position: { x: 380, y: 160 },
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
        type: 'math',
        position: { x: 680, y: 160 },
        data: {
          label: 'Calculate Discounted Price',
          left: { source: 'ref', key: 'originalPrice' },
          op: 'subtract',
          right: { source: 'ref', key: 'discount' },
          outputKey: 'discountedPrice',
        },
      },
      {
        id: 'node-4',
        type: 'condition',
        position: { x: 980, y: 160 },
        data: {
          label: 'Check Price Threshold',
          left: { source: 'ref', key: 'discountedPrice' },
          op: 'gt',
          right: { source: 'literal', value: 1000 },
        },
      },
      {
        id: 'node-5',
        type: 'output',
        position: { x: 1300, y: 60 },
        data: {
          label: 'Premium Tier Output',
          fields: [
            { key: 'originalPrice', value: { source: 'ref', key: 'originalPrice' } },
            { key: 'discount', value: { source: 'ref', key: 'discount' } },
            { key: 'discountedPrice', value: { source: 'ref', key: 'discountedPrice' } },
            { key: 'category', value: { source: 'literal', value: 'Premium' } },
          ],
        },
      },
      {
        id: 'node-6',
        type: 'output',
        position: { x: 1300, y: 320 },
        data: {
          label: 'Standard Tier Output',
          fields: [
            { key: 'originalPrice', value: { source: 'ref', key: 'originalPrice' } },
            { key: 'discount', value: { source: 'ref', key: 'discount' } },
            { key: 'discountedPrice', value: { source: 'ref', key: 'discountedPrice' } },
            { key: 'category', value: { source: 'literal', value: 'Standard' } },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e2-3', source: 'node-2', target: 'node-3' },
      { id: 'e3-4', source: 'node-3', target: 'node-4' },
      { id: 'e4-5', source: 'node-4', target: 'node-5', sourceHandle: 'true' },
      { id: 'e4-6', source: 'node-4', target: 'node-6', sourceHandle: 'false' },
    ],
  };

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/matter_walkthrough_test');
    await Workflow.deleteMany({});
    await Run.deleteMany({});
    await NodeExecution.deleteMany({});

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('Step 3.1: Normal window (workspace 1) - create and save workflow', async () => {
    const listRes = await fetch(`${baseUrl}/api/workflows`, {
      headers: { 'X-Workspace-Id': workspace1 },
    });
    expect(listRes.status).toBe(200);
    const initialList = await listRes.json();
    expect(initialList.length).toBe(0);

    const createRes = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspace1,
      },
      body: JSON.stringify(sampleTemplateWorkflow),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created._id).toBeDefined();
    expect(created.workspaceId).toBe(workspace1);
    savedWorkflowId = created._id;
  });

  it('Step 3.2: Incognito window (workspace 2) - confirms it does not see workspace 1 workflow', async () => {
    const listRes = await fetch(`${baseUrl}/api/workflows`, {
      headers: { 'X-Workspace-Id': workspace2 },
    });
    expect(listRes.status).toBe(200);
    const list2 = await listRes.json();
    expect(list2.some((w) => w._id === savedWorkflowId)).toBe(false);

    const getRes = await fetch(`${baseUrl}/api/workflows/${savedWorkflowId}`, {
      headers: { 'X-Workspace-Id': workspace2 },
    });
    expect(getRes.status).toBe(404);
  });

  it('Step 3.3: Workspace 1 - load example, run it successfully', async () => {
    const execRes = await fetch(`${baseUrl}/api/workflows/${savedWorkflowId}/execute?stream=true`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'X-Workspace-Id': workspace1,
      },
    });
    expect(execRes.status).toBe(200);
    const body = await execRes.text();
    expect(body).toContain('"status":"success"');
    expect(body).toContain('"category":"Premium"');
  });

  it('Step 3.4: Break it with divide by zero - checks new message uses label Node "Calculate Discount" (math): cannot divide by zero', async () => {
    const brokenNodes = JSON.parse(JSON.stringify(sampleTemplateWorkflow.nodes));
    const mathNode = brokenNodes.find((n) => n.id === 'node-2');
    mathNode.data.op = 'divide';
    mathNode.data.right = { source: 'literal', value: 0 };

    const updateRes = await fetch(`${baseUrl}/api/workflows/${savedWorkflowId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspace1,
      },
      body: JSON.stringify({ nodes: brokenNodes, edges: sampleTemplateWorkflow.edges }),
    });
    expect(updateRes.status).toBe(200);

    const execRes = await fetch(`${baseUrl}/api/workflows/${savedWorkflowId}/execute?stream=true`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'X-Workspace-Id': workspace1,
      },
    });
    const body = await execRes.text();
    expect(body).toContain('"status":"failed"');
    expect(body).toContain('Node \\"Calculate Discount\\" (math): cannot divide by zero');
  });

  it('Step 3.5: Fix and rerun - returns to success', async () => {
    const fixRes = await fetch(`${baseUrl}/api/workflows/${savedWorkflowId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspace1,
      },
      body: JSON.stringify(sampleTemplateWorkflow),
    });
    expect(fixRes.status).toBe(200);

    const execRes = await fetch(`${baseUrl}/api/workflows/${savedWorkflowId}/execute?stream=true`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'X-Workspace-Id': workspace1,
      },
    });
    const body = await execRes.text();
    expect(body).toContain('"status":"success"');
  });

  it('Step 3.6: Refresh, open history, replay', async () => {
    const historyRes = await fetch(`${baseUrl}/api/workflows/${savedWorkflowId}/runs`, {
      headers: { 'X-Workspace-Id': workspace1 },
    });
    expect(historyRes.status).toBe(200);
    const history = await historyRes.json();
    expect(history.length).toBe(3); // 1 initial success, 1 divide-by-zero failed, 1 fixed success

    const failedRun = history.find((r) => r.status === 'failed');
    expect(failedRun).toBeDefined();
    expect(failedRun.errorSummary).toBe('Node "Calculate Discount" (math): cannot divide by zero');

    // Replay failed run
    const replayFailedRes = await fetch(`${baseUrl}/api/runs/${failedRun._id}`, {
      headers: { 'X-Workspace-Id': workspace1 },
    });
    expect(replayFailedRes.status).toBe(200);
    const replayedFailed = await replayFailedRes.json();
    expect(replayedFailed.errorSummary).toBe('Node "Calculate Discount" (math): cannot divide by zero');
    expect(replayedFailed.nodeExecutions.length).toBeGreaterThan(0);

    // Replay successful run
    const successRun = history.find((r) => r.status === 'success');
    expect(successRun).toBeDefined();
    const replaySuccessRes = await fetch(`${baseUrl}/api/runs/${successRun._id}`, {
      headers: { 'X-Workspace-Id': workspace1 },
    });
    expect(replaySuccessRes.status).toBe(200);
    const replayedSuccess = await replaySuccessRes.json();
    expect(replayedSuccess.status).toBe('success');
    expect(replayedSuccess.finalOutput.category).toBe('Premium');
  });
});
