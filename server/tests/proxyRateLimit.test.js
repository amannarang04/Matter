import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createRunLimiter } from '../src/middleware/rateLimiter.js';

describe('Proxy Rate Limiting with trust proxy', () => {
  let app;
  let server;
  let baseUrl;
  const consoleWarnings = [];
  const originalWarn = console.warn;

  beforeAll(async () => {
    // Intercept console.warn to verify express-rate-limit doesn't throw X-Forwarded-For validation warnings
    console.warn = (...args) => {
      consoleWarnings.push(args.join(' '));
      originalWarn(...args);
    };

    app = express();
    app.set('trust proxy', 1);

    // Rate limiter configured with max 2 requests per window for testing
    const testLimiter = createRunLimiter({
      max: 2,
      windowMs: 60 * 1000,
      skip: () => false, // enforce even in test environment
    });

    app.get('/test-limit', testLimiter, (req, res) => {
      res.status(200).json({ ok: true, ip: req.ip });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    console.warn = originalWarn;
    await new Promise((resolve) => server.close(resolve));
  });

  it('separates rate limit buckets for different X-Forwarded-For client IPs', async () => {
    const clientA = '198.51.100.10';
    const clientB = '198.51.100.20';

    // Client A request 1
    const resA1 = await fetch(`${baseUrl}/test-limit`, {
      headers: { 'X-Forwarded-For': clientA },
    });
    expect(resA1.status).toBe(200);
    const dataA1 = await resA1.json();
    expect(dataA1.ip).toBe(clientA);

    // Client A request 2
    const resA2 = await fetch(`${baseUrl}/test-limit`, {
      headers: { 'X-Forwarded-For': clientA },
    });
    expect(resA2.status).toBe(200);

    // Client A request 3 -> should be throttled (429)
    const resA3 = await fetch(`${baseUrl}/test-limit`, {
      headers: { 'X-Forwarded-For': clientA },
    });
    expect(resA3.status).toBe(429);
    const errData = await resA3.json();
    expect(errData.error.code).toBe('RATE_LIMIT_EXCEEDED');

    // Client B should NOT be blocked even though Client A is throttled
    const resB1 = await fetch(`${baseUrl}/test-limit`, {
      headers: { 'X-Forwarded-For': clientB },
    });
    expect(resB1.status).toBe(200);
    const dataB1 = await resB1.json();
    expect(dataB1.ip).toBe(clientB);

    // Verify express-rate-limit did not emit validation warnings about X-Forwarded-For
    const xForwardedWarnings = consoleWarnings.filter((msg) =>
      msg.includes('X-Forwarded-For') || msg.includes('trust proxy')
    );
    expect(xForwardedWarnings.length).toBe(0);
  });
});
