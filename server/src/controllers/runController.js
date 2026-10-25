import * as workflowService from '../services/workflowService.js';
import { initSSE } from '../utils/sse.js';

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
    const sse = initSSE(req, res);

    const onEvent = (event) => {
      sse.sendEvent(event);
    };

    try {
      await workflowService.retryRun(req.params.id, onEvent);
      sse.sendEvent({}, 'done');
      sse.closeStream();
    } catch (err) {
      const errorEvent = {
        type: 'run',
        status: 'failed',
        errorSummary: err.message,
        timestamp: Date.now(),
      };
      sse.sendEvent(errorEvent);
      sse.closeStream();
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
