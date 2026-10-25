/**
 * Hardened SSE helper for streaming workflow events
 * Sets required proxy-safe headers, flushes immediately, sends heartbeats,
 * and cleans up timers on client disconnection.
 */
export function initSSE(req, res, heartbeatMs = 15000) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const pingInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': ping\n\n');
    }
  }, heartbeatMs);

  const cleanup = () => {
    clearInterval(pingInterval);
  };

  req.on('close', cleanup);
  res.on('finish', cleanup);

  const sendEvent = (event, eventName = null) => {
    if (res.writableEnded) return;
    if (eventName) {
      res.write(`event: ${eventName}\n`);
    }
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const closeStream = () => {
    cleanup();
    if (!res.writableEnded) {
      res.end();
    }
  };

  return { sendEvent, closeStream, cleanup };
}
