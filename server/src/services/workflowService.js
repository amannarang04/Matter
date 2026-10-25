import Workflow from '../models/Workflow.js';
import Run from '../models/Run.js';
import NodeExecution from '../models/NodeExecution.js';
import { ExecutionEngine } from './executionEngine.js';
import { validateWorkflowDefinition } from '../utils/validator.js';
import { NotFoundError } from '../utils/errors.js';

export async function createWorkflow(data) {
  validateWorkflowDefinition(data);
  const workflow = new Workflow({
    name: data.name || 'Untitled Workflow',
    description: data.description || '',
    nodes: data.nodes || [],
    edges: data.edges || [],
  });
  return await workflow.save();
}

export async function getAllWorkflows() {
  return await Workflow.find().sort({ updatedAt: -1 });
}

export async function getWorkflowById(id) {
  const workflow = await Workflow.findById(id);
  if (!workflow) {
    throw new NotFoundError(`Workflow with id ${id} not found`);
  }
  return workflow;
}

export async function updateWorkflow(id, data) {
  validateWorkflowDefinition(data);
  const workflow = await Workflow.findById(id);
  if (!workflow) {
    throw new NotFoundError(`Workflow with id ${id} not found`);
  }

  if (data.name !== undefined) workflow.name = data.name;
  if (data.description !== undefined) workflow.description = data.description;
  if (data.nodes !== undefined) workflow.nodes = data.nodes;
  if (data.edges !== undefined) workflow.edges = data.edges;

  return await workflow.save();
}

export async function deleteWorkflow(id) {
  const workflow = await Workflow.findById(id);
  if (!workflow) {
    throw new NotFoundError(`Workflow with id ${id} not found`);
  }
  await Workflow.findByIdAndDelete(id);
  // Also clean up associated runs and node executions
  await Run.deleteMany({ workflowId: id });
  await NodeExecution.deleteMany({ workflowId: id });
  return { success: true, message: `Workflow ${id} deleted` };
}

export async function executeWorkflow(id, onEventCallback = null) {
  const workflow = await getWorkflowById(id);
  validateWorkflowDefinition(workflow);

  // Initialize Run document
  const run = new Run({
    workflowId: workflow._id,
    status: 'pending',
    startedAt: new Date(),
  });
  await run.save();

  const engine = new ExecutionEngine(workflow, { runId: run._id.toString() });

  if (onEventCallback) {
    engine.on('event', onEventCallback);
  }

  const result = await engine.run();

  // Update Run document
  run.status = result.status;
  run.runContext = result.runContext;
  run.finalOutput = result.finalOutput;
  run.errorSummary = result.errorSummary;
  run.nodeEvents = result.nodeEvents;
  run.durationMs = result.durationMs;
  run.completedAt = new Date();
  await run.save();

  // Persist each individual node execution
  if (result.nodeExecutions && result.nodeExecutions.length > 0) {
    await NodeExecution.insertMany(
      result.nodeExecutions.map((ne) => ({
        runId: run._id,
        workflowId: workflow._id,
        ...ne,
      }))
    );
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

export async function getWorkflowRuns(workflowId) {
  return await Run.find({ workflowId }).sort({ startedAt: -1 }).limit(50);
}

export async function getRunById(runId) {
  const run = await Run.findById(runId);
  if (!run) {
    throw new NotFoundError(`Run with id ${runId} not found`);
  }
  const nodeExecutions = await NodeExecution.find({ runId }).sort({ startedAt: 1 });
  const runObj = run.toObject();
  runObj.nodeExecutions = nodeExecutions;
  return runObj;
}

export async function retryRun(runId, onEventCallback = null) {
  const previousRun = await getRunById(runId);
  return await executeWorkflow(previousRun.workflowId, onEventCallback);
}
