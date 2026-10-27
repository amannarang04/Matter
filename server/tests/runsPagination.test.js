import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Workflow from '../src/models/Workflow.js';
import Run from '../src/models/Run.js';

describe('Workflow Run History Pagination and Scoping Tests', () => {
  let server;
  let baseUrl;

  const workspace1 = '11111111-1111-4111-8111-111111111111';
  const workspace2 = '22222222-2222-4222-8222-222222222222';
  const headersWs1 = { 'Content-Type': 'application/json', 'X-Workspace-Id': workspace1 };
  const headersWs2 = { 'Content-Type': 'application/json', 'X-Workspace-Id': workspace2 };

  let workflowId1;
  const baseTime = Date.now() - 100000;
  const createdRuns = [];

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/matter_test_pagination');
    await Workflow.deleteMany({});
    await Run.deleteMany({});

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create workflow in workspace 1
    const wf = await Workflow.create({
      workspaceId: workspace1,
      name: 'Pagination Workflow',
      description: 'Testing history pagination',
      nodes: [
        {
          id: 'n1',
          type: 'input',
          position: { x: 0, y: 0 },
          data: { label: 'Input', values: { x: 1 } },
        },
      ],
      edges: [],
    });
    workflowId1 = wf._id.toString();

    // Create 6 past runs at spaced intervals (from older to newer)
    for (let i = 0; i < 6; i++) {
      const run = await Run.create({
        workflowId: wf._id,
        workspaceId: workspace1,
        status: 'success',
        startedAt: new Date(baseTime + i * 10000), // i=0 is oldest, i=5 is newest
        completedAt: new Date(baseTime + i * 10000 + 50),
        durationMs: 50,
      });
      createdRuns.push(run);
    }
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('returns runs sorted descending by startedAt with default limit 50', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${workflowId1}/runs`, {
      headers: headersWs1,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(6);

    // Newest run should be first
    for (let i = 0; i < data.length - 1; i++) {
      expect(new Date(data[i].startedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(data[i + 1].startedAt).getTime()
      );
    }
  });

  it('respects custom limit parameter', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${workflowId1}/runs?limit=2`, {
      headers: headersWs1,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    // Should be the 2 most recent runs
    expect(data[0]._id).toBe(createdRuns[5]._id.toString());
    expect(data[1]._id).toBe(createdRuns[4]._id.toString());
  });

  it('supports pagination with before parameter', async () => {
    // Get first page of 2 runs
    const page1Res = await fetch(`${baseUrl}/api/workflows/${workflowId1}/runs?limit=2`, {
      headers: headersWs1,
    });
    expect(page1Res.status).toBe(200);
    const page1 = await page1Res.json();
    expect(page1.length).toBe(2);

    const oldestOnPage1 = page1[page1.length - 1];

    // Get second page with before
    const page2Res = await fetch(
      `${baseUrl}/api/workflows/${workflowId1}/runs?limit=2&before=${encodeURIComponent(
        oldestOnPage1.startedAt
      )}`,
      { headers: headersWs1 }
    );
    expect(page2Res.status).toBe(200);
    const page2 = await page2Res.json();
    expect(page2.length).toBe(2);

    // Page 2 runs should be older than oldestOnPage1
    expect(new Date(page2[0].startedAt).getTime()).toBeLessThan(
      new Date(oldestOnPage1.startedAt).getTime()
    );
    expect(page2[0]._id).toBe(createdRuns[3]._id.toString());
    expect(page2[1]._id).toBe(createdRuns[2]._id.toString());
  });

  it('rejects invalid limit values with 400 and standard error shape', async () => {
    const invalidLimits = ['0', '-5', '101', '2.5', 'invalid'];

    for (const lim of invalidLimits) {
      const res = await fetch(`${baseUrl}/api/workflows/${workflowId1}/runs?limit=${lim}`, {
        headers: headersWs1,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('limit');
    }
  });

  it('rejects invalid before values with 400 and standard error shape', async () => {
    const invalidBefores = ['not-a-date', ''];

    for (const beforeVal of invalidBefores) {
      const res = await fetch(
        `${baseUrl}/api/workflows/${workflowId1}/runs?before=${encodeURIComponent(beforeVal)}`,
        { headers: headersWs1 }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('before');
    }
  });

  it('strictly scopes runs by workspace and rejects unauthorized workspace queries with 404', async () => {
    // Attempt to query runs for workspace 1 workflow from workspace 2
    const res = await fetch(`${baseUrl}/api/workflows/${workflowId1}/runs`, {
      headers: headersWs2,
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('NOT_FOUND');
  });
});
