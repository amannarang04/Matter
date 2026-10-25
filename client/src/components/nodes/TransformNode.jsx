import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { RefreshCw } from 'lucide-react';
import BaseNode from './BaseNode';

function formatOperand(op) {
  if (!op) return 'null';
  if (op.source === 'ref') return `$${op.key}`;
  return String(op.value);
}

export default function TransformNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      title={data.label || 'Transform Data'}
      icon={RefreshCw}
      typeColor="violet"
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-950 transition hover:!scale-125"
      />

      <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 space-y-1 font-mono text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Operation:</span>
          <span className="text-violet-300 font-semibold">{data.operation || 'none'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Input:</span>
          <span className="text-amber-300 truncate max-w-[100px]">{formatOperand(data.input)}</span>
        </div>
        {data.param !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Param:</span>
            <span className="text-cyan-300">{String(data.param)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
        <span>Output key:</span>
        <span className="font-mono text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
          {data.outputKey || 'none'}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-slate-950 shadow-md transition hover:!scale-125"
      />
    </BaseNode>
  );
}
