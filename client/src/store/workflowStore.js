import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import * as api from '../services/api.js';
import { TEMPLATES } from '../utils/templates.js';

const DEFAULT_WORKFLOW = TEMPLATES[0];

function getStoredLastWorkflowId() {
  try {
    return localStorage.getItem('matter_last_workflow_id');
  } catch {
    return null;
  }
}

function setStoredLastWorkflowId(id) {
  try {
    localStorage.setItem('matter_last_workflow_id', id);
  } catch {
    // ignore
  }
}

function removeStoredLastWorkflowId() {
  try {
    localStorage.removeItem('matter_last_workflow_id');
  } catch {
    // ignore
  }
}

export const useWorkflowStore = create((set, get) => ({
  workflowId: null,
  name: DEFAULT_WORKFLOW.name,
  description: DEFAULT_WORKFLOW.description,
  nodes: DEFAULT_WORKFLOW.nodes,
  edges: DEFAULT_WORKFLOW.edges,
  selectedNodeId: null,

  isSaving: false,
  isRunning: false,
  runStatus: 'idle', // 'idle' | 'running' | 'success' | 'failed'
  runContext: {},
  finalOutput: {},
  nodeStates: {}, // nodeId -> { status, inputs, outputs, error, durationMs }
  liveLogs: [],
  activeBottomTab: 'logs', // 'logs' | 'context' | 'output'
  isHistoryOpen: false,
  isHistoryLoading: false,
  historyError: null,
  runsList: [],
  allWorkflows: [],
  errorMessage: null,
  isServerWaking: false,

  replayingRun: null,
  cachedLiveState: null,
  runStartedAt: null,
  runDurationMs: 0,
  workflowUpdatedAt: null,
  lastEditedAt: null,

  setNodes: (nodes) => set({ nodes, lastEditedAt: Date.now() }),
  setEdges: (edges) => set({ edges, lastEditedAt: Date.now() }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      lastEditedAt: Date.now(),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      lastEditedAt: Date.now(),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          id: `e_${connection.source}_${connection.target}_${Date.now()}`,
          animated: true,
          style: { strokeWidth: 2 },
        },
        get().edges
      ),
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeData: (id, partialData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...partialData,
            },
          };
        }
        return node;
      }),
    });
  },

  updateWorkflowMeta: (name, description) => {
    set({ name, description });
  },

  addNode: (type) => {
    const existing = get().nodes;
    const id = `node-${Date.now().toString().slice(-4)}`;
    const position = {
      x: 200 + (existing.length % 5) * 60,
      y: 120 + (existing.length % 5) * 60,
    };

    let data = { label: `New ${type.toUpperCase()}` };
    switch (type) {
      case 'input':
        data = { label: 'Input Data', values: { variable1: 10 } };
        break;
      case 'math':
        data = {
          label: 'Math Operation',
          left: { source: 'literal', value: 10 },
          op: 'add',
          right: { source: 'literal', value: 5 },
          outputKey: `result_${Date.now().toString().slice(-3)}`,
        };
        break;
      case 'condition':
        data = {
          label: 'Condition Check',
          left: { source: 'literal', value: 10 },
          op: 'gt',
          right: { source: 'literal', value: 5 },
        };
        break;
      case 'transform':
        data = {
          label: 'Data Transform',
          input: { source: 'literal', value: 'hello' },
          operation: 'toString',
          outputKey: `str_${Date.now().toString().slice(-3)}`,
        };
        break;
      case 'delay':
        data = { label: 'Wait Delay', ms: 1000 };
        break;
      case 'output':
        data = {
          label: 'Final Output',
          fields: [{ key: 'finalResult', value: { source: 'literal', value: 100 } }],
        };
        break;
      default:
        break;
    }

    const newNode = {
      id,
      type,
      position,
      data,
    };

    set({
      nodes: [...existing, newNode],
      selectedNodeId: id,
    });
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  loadTemplate: (templateId) => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    set({
      workflowId: null,
      name: tmpl.name,
      description: tmpl.description,
      nodes: JSON.parse(JSON.stringify(tmpl.nodes)),
      edges: JSON.parse(JSON.stringify(tmpl.edges)),
      selectedNodeId: null,
      runStatus: 'idle',
      runStartedAt: null,
      runDurationMs: 0,
      runContext: {},
      finalOutput: {},
      nodeStates: {},
      liveLogs: [],
      errorMessage: null,
    });
  },

  newWorkflow: () => {
    set({
      workflowId: null,
      name: 'Untitled Workflow',
      description: 'A new custom workflow pipeline',
      nodes: [
        {
          id: 'node-start',
          type: 'input',
          position: { x: 100, y: 150 },
          data: { label: 'Initial Inputs', values: { count: 1 } },
        },
      ],
      edges: [],
      selectedNodeId: 'node-start',
      runStatus: 'idle',
      runStartedAt: null,
      runDurationMs: 0,
      runContext: {},
      finalOutput: {},
      nodeStates: {},
      liveLogs: [],
      errorMessage: null,
    });
  },

  loadWorkflow: (workflow) => {
    if (workflow._id) {
      setStoredLastWorkflowId(workflow._id);
    }
    set({
      workflowId: workflow._id,
      name: workflow.name,
      description: workflow.description || '',
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      workflowUpdatedAt: workflow.updatedAt || null,
      lastEditedAt: null,
      replayingRun: null,
      cachedLiveState: null,
      selectedNodeId: null,
      runStatus: 'idle',
      runStartedAt: null,
      runDurationMs: 0,
      runContext: {},
      finalOutput: {},
      nodeStates: {},
      liveLogs: [],
      errorMessage: null,
    });
  },

  deleteCurrentWorkflow: async () => {
    const { workflowId } = get();
    if (!workflowId) return;
    try {
      await api.deleteWorkflow(workflowId);
      removeStoredLastWorkflowId();
      const list = await get().fetchWorkflowsList();
      if (list.length > 0) {
        get().loadWorkflow(list[0]);
      } else {
        get().loadTemplate('discount-tier');
      }
    } catch (err) {
      set({ errorMessage: err.message });
    }
  },

  initApp: async () => {
    // If backend takes longer than 2.5s to respond, show cold-start waking banner
    const slowTimer = setTimeout(() => {
      set({ isServerWaking: true });
    }, 2500);

    const maxRetries = 20;
    let list = [];
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        list = await api.fetchWorkflows();
        success = true;
        break;
      } catch (err) {
        set({ isServerWaking: true, errorMessage: null });
        if (attempt === maxRetries) {
          set({
            isServerWaking: false,
            errorMessage: 'Server took too long to wake up. Please refresh the page.',
          });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    clearTimeout(slowTimer);
    set({ isServerWaking: false, allWorkflows: list });

    if (!success) {
      get().loadTemplate('discount-tier');
      return;
    }

    const lastId = getStoredLastWorkflowId();
    if (lastId) {
      const match = list.find((w) => w._id === lastId);
      if (match) {
        get().loadWorkflow(match);
        return;
      }
      try {
        const remote = await api.fetchWorkflow(lastId);
        if (remote) {
          get().loadWorkflow(remote);
          return;
        }
      } catch {
        removeStoredLastWorkflowId();
      }
    }
    if (list.length > 0) {
      get().loadWorkflow(list[0]);
    } else {
      get().loadTemplate('discount-tier');
    }
  },

  fetchWorkflowsList: async () => {
    try {
      const list = await api.fetchWorkflows();
      set({ allWorkflows: list });
      return list;
    } catch (err) {
      console.error('Failed to load workflows:', err);
      return [];
    }
  },

  saveWorkflow: async () => {
    const { workflowId, name, description, nodes, edges } = get();
    set({ isSaving: true, errorMessage: null });
    try {
      let saved;
      if (workflowId) {
        saved = await api.updateWorkflow(workflowId, { name, description, nodes, edges });
      } else {
        saved = await api.createWorkflow({ name, description, nodes, edges });
      }
      setStoredLastWorkflowId(saved._id);
      set({
        workflowId: saved._id,
        isSaving: false,
        workflowUpdatedAt: saved.updatedAt || new Date().toISOString(),
        lastEditedAt: null,
      });
      get().fetchWorkflowsList();
      return saved;
    } catch (err) {
      set({ isSaving: false, errorMessage: err.message });
      throw err;
    }
  },

  runWorkflow: async () => {
    // Starting a new run exits replay mode
    if (get().replayingRun) {
      set({ replayingRun: null, cachedLiveState: null });
    }

    // Save first to ensure server has current nodes/edges
    let currentId = get().workflowId;
    set({
      isRunning: true,
      runStatus: 'running',
      runStartedAt: Date.now(),
      runDurationMs: 0,
      runContext: {},
      finalOutput: {},
      nodeStates: {},
      liveLogs: [],
      errorMessage: null,
      activeBottomTab: 'logs',
    });

    try {
      const saved = await get().saveWorkflow();
      currentId = saved._id;
    } catch (err) {
      set({ isRunning: false, runStatus: 'failed', errorMessage: err.message });
      return;
    }

    // Stream SSE events from server
    await api.executeWorkflowStream(currentId, {
      onEvent: (event) => {
        const state = get();
        const logs = [...state.liveLogs, event];

        if (event.type === 'node') {
          const currentNodes = { ...state.nodeStates };
          const prev = currentNodes[event.nodeId];
          const startedAt = event.status === 'running'
            ? event.timestamp
            : (prev?.startedAt || (event.timestamp && typeof event.durationMs === 'number' ? event.timestamp - event.durationMs : undefined));

          currentNodes[event.nodeId] = {
            status: event.status,
            inputs: event.inputs,
            outputs: event.outputs,
            error: event.error,
            durationMs: event.durationMs,
            timestamp: event.timestamp,
            startedAt,
            completedAt: event.status !== 'running' ? event.timestamp : undefined,
          };

          // Accumulate outputs in live run context if node succeeded
          let updatedContext = { ...state.runContext };
          if (event.status === 'success' && event.outputs) {
            updatedContext = { ...updatedContext, ...event.outputs };
          }

          set({
            nodeStates: currentNodes,
            runContext: updatedContext,
            liveLogs: logs,
          });
        } else if (event.type === 'run') {
          set({
            runStatus: event.status,
            finalOutput: event.finalOutput || state.finalOutput,
            errorMessage: event.errorSummary || null,
            liveLogs: logs,
            runStartedAt: event.status === 'running' ? (event.timestamp || state.runStartedAt) : state.runStartedAt,
            runDurationMs: typeof event.durationMs === 'number' ? event.durationMs : (state.runStartedAt ? Date.now() - state.runStartedAt : state.runDurationMs),
          });
        }
      },
      onDone: () => {
        set({ isRunning: false });
        // Refresh past runs list
        get().loadRuns();
      },
      onError: (err) => {
        set({
          isRunning: false,
          runStatus: 'failed',
          errorMessage: err.message || 'Stream connection error',
        });
      },
    });
  },

  replayRun: async (run) => {
    let fullRun = run;
    try {
      fullRun = await api.fetchRun(run._id);
    } catch {
      fullRun = run;
    }

    // Cache current live state if not already replaying
    if (!get().replayingRun) {
      set({
        cachedLiveState: {
          nodeStates: get().nodeStates,
          runStatus: get().runStatus,
          runStartedAt: get().runStartedAt,
          runDurationMs: get().runDurationMs,
          runContext: get().runContext,
          finalOutput: get().finalOutput,
          liveLogs: get().liveLogs,
          errorMessage: get().errorMessage,
        },
      });
    }

    const fullRunStartedAt = fullRun.startedAt ? new Date(fullRun.startedAt).getTime() : Date.now();
    const fullRunDurationMs = typeof fullRun.durationMs === 'number' ? fullRun.durationMs : 0;

    const newNodeStates = {};
    if (Array.isArray(fullRun.nodeExecutions) && fullRun.nodeExecutions.length > 0) {
      fullRun.nodeExecutions.forEach((ne) => {
        newNodeStates[ne.nodeId] = {
          status: ne.status,
          inputs: ne.inputs || {},
          outputs: ne.outputs || {},
          error: ne.error || null,
          durationMs: ne.durationMs || 0,
          startedAt: ne.startedAt ? new Date(ne.startedAt).getTime() : undefined,
          completedAt: ne.completedAt ? new Date(ne.completedAt).getTime() : undefined,
          timestamp: ne.completedAt ? new Date(ne.completedAt).getTime() : Date.now(),
        };
      });
    } else if (Array.isArray(fullRun.nodeEvents)) {
      fullRun.nodeEvents.forEach((ev) => {
        if (ev && ev.type === 'node') {
          const prev = newNodeStates[ev.nodeId];
          const startedAt = ev.status === 'running'
            ? ev.timestamp
            : (prev?.startedAt || (ev.timestamp && typeof ev.durationMs === 'number' ? ev.timestamp - ev.durationMs : undefined));
          newNodeStates[ev.nodeId] = {
            status: ev.status,
            inputs: ev.inputs || {},
            outputs: ev.outputs || {},
            error: ev.error || null,
            durationMs: ev.durationMs || 0,
            startedAt,
            completedAt: ev.status !== 'running' ? ev.timestamp : undefined,
            timestamp: ev.timestamp || Date.now(),
          };
        }
      });
    }

    set({
      replayingRun: fullRun,
      isHistoryOpen: false,
      nodeStates: newNodeStates,
      runStatus: fullRun.status,
      runStartedAt: fullRunStartedAt,
      runDurationMs: fullRunDurationMs,
      runContext: fullRun.runContext || {},
      finalOutput: fullRun.finalOutput || {},
      errorMessage: fullRun.errorSummary || null,
      liveLogs: fullRun.nodeEvents || [],
    });
  },

  exitReplay: () => {
    const cached = get().cachedLiveState;
    set({
      replayingRun: null,
      cachedLiveState: null,
      nodeStates: cached ? cached.nodeStates : {},
      runStatus: cached ? cached.runStatus : 'idle',
      runStartedAt: cached ? cached.runStartedAt : null,
      runDurationMs: cached ? cached.runDurationMs : 0,
      runContext: cached ? cached.runContext : {},
      finalOutput: cached ? cached.finalOutput : {},
      liveLogs: cached ? cached.liveLogs : [],
      errorMessage: cached ? cached.errorMessage : null,
    });
  },

  loadRuns: async () => {
    const id = get().workflowId;
    if (!id) return;
    set({ isHistoryLoading: true, historyError: null });
    try {
      const runs = await api.fetchWorkflowRuns(id);
      set({ runsList: runs, isHistoryLoading: false, historyError: null });
    } catch (err) {
      console.error('Failed to load runs:', err);
      set({ isHistoryLoading: false, historyError: err.message || 'Failed to load run history' });
    }
  },

  openHistory: async () => {
    set({ isHistoryOpen: true });
    await get().loadRuns();
  },

  closeHistory: () => set({ isHistoryOpen: false }),

  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
}));
