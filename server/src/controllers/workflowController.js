import * as workflowService from '../services/workflowService.js';
import { initSSE } from '../utils/sse.js';

export async function createWorkflow(req, res, next) {
  try {
    const workflow = await workflowService.createWorkflow(req.body, req.workspaceId);
    res.status(201).json(workflow);
  } catch (err) {
    next(err);
  }
}

export async function listWorkflows(req, res, next) {
  try {
    const workflows = await workflowService.getAllWorkflows(req.workspaceId);
    res.status(200).json(workflows);
  } catch (err) {
    next(err);
  }
}

export async function getWorkflow(req, res, next) {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id, req.workspaceId);
    res.status(200).json(workflow);
  } catch (err) {
    next(err);
  }
}

export async function updateWorkflow(req, res, next) {
  try {
    const updated = await workflowService.updateWorkflow(req.params.id, req.body, req.workspaceId);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkflow(req, res, next) {
  try {
    const result = await workflowService.deleteWorkflow(req.params.id, req.workspaceId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function executeWorkflow(req, res, next) {
  const isSSE = req.query.stream === 'true' || req.headers.accept?.includes('text/event-stream');

  try {
    // Ensure workflow exists in this workspace first
    await workflowService.getWorkflowById(req.params.id, req.workspaceId);

    const activeRun = await workflowService.getActiveRun(req.params.id);
    if (activeRun) {
      return res.status(409).json({
        error: {
          code: 'CONCURRENT_RUN_CONFLICT',
          message: `A run is already in progress for this workflow (active run id: ${activeRun._id})`,
          details: [{ activeRunId: activeRun._id.toString() }],
        },
      });
    }

    if (isSSE) {
      const sse = initSSE(req, res);

      const onEvent = (event) => {
        sse.sendEvent(event);
      };

      try {
        await workflowService.executeWorkflow(req.params.id, req.workspaceId, onEvent);
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
      const result = await workflowService.executeWorkflow(req.params.id, req.workspaceId);
      res.status(200).json(result);
    }
  } catch (err) {
    next(err);
  }
}

export async function getWorkflowRuns(req, res, next) {
  try {
    const runs = await workflowService.getWorkflowRuns(req.params.id, req.workspaceId, req.query);
    res.status(200).json(runs);
  } catch (err) {
    next(err);
  }
}
