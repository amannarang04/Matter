const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

/**
 * Execute workflow with SSE streaming via fetch
 */
export async function executeWorkflowStream(workflowId, { onEvent, onDone, onError }) {
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
            onEvent?.(event);
          } catch {
            // ignore non-json ping/keepalive
          }
        }
      }
    }

    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}
