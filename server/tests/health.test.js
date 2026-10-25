import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
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
  });

  it('returns status ok', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ status: 'ok' });
  });
});
