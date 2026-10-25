import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore } from '../../store/workflowStore';
import InputNode from '../nodes/InputNode';
import MathNode from '../nodes/MathNode';
import ConditionNode from '../nodes/ConditionNode';
import TransformNode from '../nodes/TransformNode';
import DelayNode from '../nodes/DelayNode';
import OutputNode from '../nodes/OutputNode';

import {
  FileInput,
  Calculator,
  GitBranch,
  RefreshCw,
  Clock,
  FileOutput,
  Plus,
} from 'lucide-react';

export default function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    addNode,
  } = useWorkflowStore();

  const nodeTypes = useMemo(
    () => ({
      input: InputNode,
      math: MathNode,
      condition: ConditionNode,
      transform: TransformNode,
      delay: DelayNode,
      output: OutputNode,
    }),
    []
  );

  const nodePaletteItems = [
    { type: 'input', label: 'Input', icon: FileInput, color: 'hover:border-indigo-500 hover:text-indigo-400' },
    { type: 'math', label: 'Math', icon: Calculator, color: 'hover:border-cyan-500 hover:text-cyan-400' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: 'hover:border-amber-500 hover:text-amber-400' },
    { type: 'transform', label: 'Transform', icon: RefreshCw, color: 'hover:border-violet-500 hover:text-violet-400' },
    { type: 'delay', label: 'Delay', icon: Clock, color: 'hover:border-amber-500 hover:text-amber-400' },
    { type: 'output', label: 'Output', icon: FileOutput, color: 'hover:border-emerald-500 hover:text-emerald-400' },
  ];

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Node Palette floating toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
          <Plus className="w-3 h-3 text-indigo-400" /> Add Node:
        </span>
        {nodePaletteItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              onClick={() => addNode(item.type)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-xs font-medium text-slate-300 transition shadow-sm ${item.color}`}
              title={`Add ${item.label} Node`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-slate-950"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color="#334155"
        />
        <Controls
          className="!bg-slate-900 !border-slate-800 !rounded-xl !shadow-xl !fill-slate-300 [&>button]:!border-slate-800 [&>button]:!bg-slate-900 hover:[&>button]:!bg-slate-800"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            switch (n.type) {
              case 'input':
                return '#6366f1';
              case 'math':
                return '#06b6d4';
              case 'condition':
                return '#f59e0b';
              case 'transform':
                return '#8b5cf6';
              case 'delay':
                return '#eab308';
              case 'output':
                return '#10b981';
              default:
                return '#64748b';
            }
          }}
          className="!bg-slate-900/90 !border !border-slate-800 !rounded-xl !shadow-xl"
        />
      </ReactFlow>
    </div>
  );
}
