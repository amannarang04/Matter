let inMemoryWorkspaceId = null;

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getWorkspaceId() {
  try {
    let wsId = localStorage.getItem('matter_workspace_id');
    if (!wsId || typeof wsId !== 'string') {
      wsId = generateUUID();
      localStorage.setItem('matter_workspace_id', wsId);
    }
    return wsId;
  } catch {
    if (!inMemoryWorkspaceId) {
      inMemoryWorkspaceId = generateUUID();
    }
    return inMemoryWorkspaceId;
  }
}
