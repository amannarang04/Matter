import * as workflowService from '../services/workflowService.js';

export async function createWorkflow(req, res, next) {
  try {
    const workflow = await workflowService.createWorkflow(req.body);
    res.status(201).json(workflow);
  } catch (err) {
    next(err);
  }
}

export async function listWorkflows(req, res, next) {
  try {
    const workflows = await workflowService.getAllWorkflows();
    res.status(200).json(workflows);
  } catch (err) {
    next(err);
  }
}

export async function getWorkflow(req, res, next) {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id);
    res.status(200).json(workflow);
  } catch (err) {
    next(err);
  }
}

export async function updateWorkflow(req, res, next) {
  try {
    const updated = await workflowService.updateWorkflow(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkflow(req, res, next) {
  try {
    const result = await workflowService.deleteWorkflow(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function executeWorkflow(req, res, next) {
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
      await workflowService.executeWorkflow(req.params.id, onEvent);
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
      const result = await workflowService.executeWorkflow(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export async function getWorkflowRuns(req, res, next) {
  try {
    const runs = await workflowService.getWorkflowRuns(req.params.id);
    res.status(200).json(runs);
  } catch (err) {
    next(err);
  }
}
