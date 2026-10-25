import * as workflowService from '../services/workflowService.js';

export async function getRun(req, res, next) {
  try {
    const run = await workflowService.getRunById(req.params.id);
    res.status(200).json(run);
  } catch (err) {
    next(err);
  }
}

export async function retryRun(req, res, next) {
  const isSSE = req.query.stream === 'true' || req.headers.accept?.includes('text/event-stream');

  if (isSSE) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });
    res.flushHeaders?.();

    const onEvent = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await workflowService.retryRun(req.params.id, onEvent);
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (err) {
      const errorEvent = {
        type: 'run',
        status: 'failed',
        errorSummary: err.message,
        timestamp: Date.now(),
      };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      res.end();
    }
  } else {
    try {
      const result = await workflowService.retryRun(req.params.id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}
