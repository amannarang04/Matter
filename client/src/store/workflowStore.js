import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import * as api from '../services/api.js';
import { TEMPLATES } from '../utils/templates.js';

const DEFAULT_WORKFLOW = TEMPLATES[0];

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
  runsList: [],
  allWorkflows: [],
  errorMessage: null,
  isServerWaking: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
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
      runContext: {},
      finalOutput: {},
      nodeStates: {},
      liveLogs: [],
      errorMessage: null,
    });
  },

  loadWorkflow: (workflow) => {
    if (workflow._id) {
      localStorage.setItem('matter_last_workflow_id', workflow._id);
    }
    set({
      workflowId: workflow._id,
      name: workflow.name,
      description: workflow.description || '',
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      selectedNodeId: null,
      runStatus: 'idle',
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
      localStorage.removeItem('matter_last_workflow_id');
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

    const lastId = localStorage.getItem('matter_last_workflow_id');
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
        localStorage.removeItem('matter_last_workflow_id');
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
      localStorage.setItem('matter_last_workflow_id', saved._id);
      set({ workflowId: saved._id, isSaving: false });
      get().fetchWorkflowsList();
      return saved;
    } catch (err) {
      set({ isSaving: false, errorMessage: err.message });
      throw err;
    }
  },

  runWorkflow: async () => {
    // Save first to ensure server has current nodes/edges
    let currentId = get().workflowId;
    set({
      isRunning: true,
      runStatus: 'running',
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
          currentNodes[event.nodeId] = {
            status: event.status,
            inputs: event.inputs,
            outputs: event.outputs,
            error: event.error,
            durationMs: event.durationMs,
            timestamp: event.timestamp,
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

  loadRuns: async () => {
    const id = get().workflowId;
    if (!id) return;
    try {
      const runs = await api.fetchWorkflowRuns(id);
      set({ runsList: runs });
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
  },

  openHistory: async () => {
    set({ isHistoryOpen: true });
    await get().loadRuns();
  },

  closeHistory: () => set({ isHistoryOpen: false }),

  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
}));
