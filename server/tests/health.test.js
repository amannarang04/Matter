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
    expect(data.status).toBe('ok');
  });

  it('allows configured origin and handles preflight OPTIONS request', async () => {
    const preflight = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(preflight.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('blocks disallowed origin', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://malicious-site.com',
      },
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.message).toContain('CORS blocked');
  });
});
