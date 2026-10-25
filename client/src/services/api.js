const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function fetchWorkflows() {
  const res = await fetch(`${API_BASE}/api/workflows`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to fetch workflows');
  }
  return res.json();
}

export async function fetchWorkflow(id) {
  const res = await fetch(`${API_BASE}/api/workflows/${id}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to fetch workflow');
  }
  return res.json();
}

export async function createWorkflow(data) {
  const res = await fetch(`${API_BASE}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to create workflow');
  }
  return res.json();
}

export async function updateWorkflow(id, data) {
  const res = await fetch(`${API_BASE}/api/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to update workflow');
  }
  return res.json();
}

export async function deleteWorkflow(id) {
  const res = await fetch(`${API_BASE}/api/workflows/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to delete workflow');
  }
  return res.json();
}

export async function fetchWorkflowRuns(workflowId) {
  const res = await fetch(`${API_BASE}/api/workflows/${workflowId}/runs`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to fetch runs');
  }
  return res.json();
}

export async function fetchRun(runId) {
  const res = await fetch(`${API_BASE}/api/runs/${runId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to fetch run');
  }
  return res.json();
}

export async function retryRun(runId) {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/retry`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to retry run');
  }
  return res.json();
}

/**
 * Polls GET /api/runs/:id until terminal status ('success' or 'failed')
 */
export async function pollRunUntilComplete(runId, onEvent, maxAttempts = 15, delayMs = 600) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const run = await fetchRun(runId);
      if (run.status === 'success' || run.status === 'failed') {
        // Emit events for all completed node executions
        if (Array.isArray(run.nodeExecutions)) {
          run.nodeExecutions.forEach((ne) => {
            onEvent?.({
              type: 'node',
              runId: run._id,
              nodeId: ne.nodeId,
              status: ne.status,
              inputs: ne.inputs || {},
              outputs: ne.outputs || {},
              error: ne.error || null,
              durationMs: ne.durationMs || 0,
              timestamp: ne.completedAt ? new Date(ne.completedAt).getTime() : Date.now(),
            });
          });
        }

        onEvent?.({
          type: 'run',
          runId: run._id,
          status: run.status,
          finalOutput: run.finalOutput || {},
          errorSummary: run.errorSummary || null,
          timestamp: Date.now(),
        });

        return run;
      }
    } catch {
      // Continue polling on transient network hiccup
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Run ${runId} timed out while polling for final status`);
}

/**
 * Execute workflow with SSE streaming via fetch, falling back to polling on disconnect
 */
export async function executeWorkflowStream(workflowId, { onEvent, onDone, onError }) {
  let activeRunId = null;
  let receivedTerminalEvent = false;

  try {
    const res = await fetch(`${API_BASE}/api/workflows/${workflowId}/execute?stream=true`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to start execution');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.runId) {
              activeRunId = event.runId;
            }
            if (event.type === 'run' && (event.status === 'success' || event.status === 'failed')) {
              receivedTerminalEvent = true;
            }
            onEvent?.(event);
          } catch {
            // ignore non-json ping/keepalive
          }
        }
      }
    }

    // If stream ended before receiving a final terminal event, poll GET /api/runs/:id
    if (!receivedTerminalEvent && activeRunId) {
      console.warn('Stream disconnected before terminal run event; falling back to GET /api/runs/:id');
      await pollRunUntilComplete(activeRunId, onEvent);
    }

    onDone?.();
  } catch (err) {
    // If we have an activeRunId, attempt recovery via polling before failing
    if (activeRunId && !receivedTerminalEvent) {
      try {
        console.warn('Stream error occurred; falling back to polling GET /api/runs/:id');
        await pollRunUntilComplete(activeRunId, onEvent);
        onDone?.();
        return;
      } catch (pollErr) {
        onError?.(pollErr);
        return;
      }
    }
    onError?.(err);
  }
}
