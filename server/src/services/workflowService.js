import Workflow from '../models/Workflow.js';
import Run from '../models/Run.js';
import NodeExecution from '../models/NodeExecution.js';
import { ExecutionEngine } from './executionEngine.js';
import { validateWorkflowDefinition } from '../utils/validator.js';
import { NotFoundError } from '../utils/errors.js';

export async function createWorkflow(data, workspaceId) {
  validateWorkflowDefinition(data);
  const workflow = new Workflow({
    workspaceId,
    name: data.name || 'Untitled Workflow',
    description: data.description || '',
    nodes: data.nodes || [],
    edges: data.edges || [],
  });
  return await workflow.save();
}

export async function getAllWorkflows(workspaceId) {
  const query = workspaceId ? { workspaceId } : {};
  return await Workflow.find(query).sort({ updatedAt: -1 });
}

export async function getWorkflowById(id, workspaceId) {
  const query = { _id: id };
  if (workspaceId) {
    query.workspaceId = workspaceId;
  }
  const workflow = await Workflow.findOne(query);
  if (!workflow) {
    throw new NotFoundError(`Workflow with id ${id} not found`);
  }
  return workflow;
}

export async function updateWorkflow(id, data, workspaceId) {
  validateWorkflowDefinition(data);
  const workflow = await getWorkflowById(id, workspaceId);

  if (data.name !== undefined) workflow.name = data.name;
  if (data.description !== undefined) workflow.description = data.description;
  if (data.nodes !== undefined) workflow.nodes = data.nodes;
  if (data.edges !== undefined) workflow.edges = data.edges;

  return await workflow.save();
}

export async function deleteWorkflow(id, workspaceId) {
  const workflow = await getWorkflowById(id, workspaceId);
  const effectiveWorkspaceId = workflow.workspaceId;
  await Workflow.deleteOne({ _id: id, workspaceId: effectiveWorkspaceId });
  // Also clean up associated runs and node executions
  await Run.deleteMany({ workflowId: id, workspaceId: effectiveWorkspaceId });
  await NodeExecution.deleteMany({ workflowId: id, workspaceId: effectiveWorkspaceId });
  return { success: true, message: `Workflow ${id} deleted` };
}

export async function getActiveRun(workflowId) {
  return await Run.findOne({
    workflowId,
    status: { $in: ['pending', 'running'] },
  });
}

export async function recoverStuckRuns() {
  const now = new Date();
  const runResult = await Run.updateMany(
    { status: { $in: ['pending', 'running'] } },
    {
      $set: {
        status: 'failed',
        errorSummary: 'Run was interrupted by a server restart',
        completedAt: now,
      },
    }
  );

  const nodeResult = await NodeExecution.updateMany(
    { status: { $in: ['pending', 'running'] } },
    {
      $set: {
        status: 'failed',
        error: 'Run was interrupted by a server restart',
        completedAt: now,
      },
    }
  );

  return { recoveredRuns: runResult.modifiedCount, recoveredNodes: nodeResult.modifiedCount };
}

export async function executeWorkflow(id, workspaceId, onEventCallback = null, options = {}) {
  // If third argument is an options object without callback
  if (typeof onEventCallback === 'object' && onEventCallback !== null && !options.runId && !options.timeoutMs) {
    options = onEventCallback;
    onEventCallback = null;
  }

  const workflow = await getWorkflowById(id, workspaceId);
  validateWorkflowDefinition(workflow);

  // Duplicate-run guard: check if a run is already in progress
  const activeRun = await getActiveRun(workflow._id);
  if (activeRun) {
    const error = new Error(`A run is already in progress for this workflow (active run id: ${activeRun._id})`);
    error.statusCode = 409;
    error.code = 'CONCURRENT_RUN_CONFLICT';
    error.details = [{ activeRunId: activeRun._id.toString() }];
    throw error;
  }

  // Initialize Run document
  const run = new Run({
    workflowId: workflow._id,
    workspaceId: workflow.workspaceId,
    status: 'running',
    startedAt: new Date(),
  });
  await run.save();

  const engine = new ExecutionEngine(workflow, {
    runId: run._id.toString(),
    ...options,
  });

  if (onEventCallback) {
    engine.on('event', onEventCallback);
  }

  let result = null;
  let executionError = null;

  try {
    result = await engine.run();
  } catch (err) {
    executionError = err;
    result = {
      status: 'failed',
      runContext: engine.context || {},
      finalOutput: engine.finalOutput || {},
      errorSummary: err.message || 'Execution failed unexpectedly',
      durationMs: Date.now() - run.startedAt.getTime(),
      nodeEvents: engine.nodeEvents || [],
      nodeExecutions: engine.nodeExecutions || [],
    };
  } finally {
    const finalStatus = (result && result.status) || 'failed';
    const finalErrorSummary = (result && result.errorSummary) || (executionError ? executionError.message : null);

    run.status = finalStatus;
    run.runContext = (result && result.runContext) || {};
    run.finalOutput = (result && result.finalOutput) || {};
    run.errorSummary = finalErrorSummary;
    run.nodeEvents = (result && result.nodeEvents) || [];
    run.durationMs = (result && typeof result.durationMs === 'number') ? result.durationMs : (Date.now() - run.startedAt.getTime());
    run.completedAt = new Date();

    try {
      await run.save();
    } catch (saveErr) {
      console.error('Failed to save finalized run state:', saveErr);
    }

    if (result && result.nodeExecutions && result.nodeExecutions.length > 0) {
      try {
        await NodeExecution.insertMany(
          result.nodeExecutions.map((ne) => ({
            runId: run._id,
            workflowId: workflow._id,
            workspaceId: workflow.workspaceId,
            ...ne,
          }))
        );
      } catch (insertErr) {
        console.error('Failed to persist node executions:', insertErr);
      }
    }
  }

  if (executionError) {
    throw executionError;
  }

  return {
    runId: run._id,
    status: run.status,
    runContext: run.runContext,
    finalOutput: run.finalOutput,
    errorSummary: run.errorSummary,
    durationMs: run.durationMs,
    nodeEvents: run.nodeEvents,
  };
}

export async function getWorkflowRuns(workflowId, workspaceId) {
  await getWorkflowById(workflowId, workspaceId);
  const query = { workflowId };
  if (workspaceId) {
    query.workspaceId = workspaceId;
  }
  return await Run.find(query).sort({ startedAt: -1 }).limit(50);
}

export async function getRunById(runId, workspaceId) {
  const query = { _id: runId };
  if (workspaceId) {
    query.workspaceId = workspaceId;
  }
  const run = await Run.findOne(query);
  if (!run) {
    throw new NotFoundError(`Run with id ${runId} not found`);
  }
  const nodeExecutionsQuery = { runId };
  if (workspaceId) {
    nodeExecutionsQuery.workspaceId = workspaceId;
  }
  const nodeExecutions = await NodeExecution.find(nodeExecutionsQuery).sort({ startedAt: 1 });
  const runObj = run.toObject();
  runObj.nodeExecutions = nodeExecutions;
  return runObj;
}

export async function retryRun(runId, workspaceId, onEventCallback = null) {
  const previousRun = await getRunById(runId, workspaceId);
  return await executeWorkflow(previousRun.workflowId, workspaceId, onEventCallback);
}
