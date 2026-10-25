import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';
import BaseNode from './BaseNode';

export default function DelayNode({ id, data, selected }) {
  const ms = data.ms !== undefined ? data.ms : 1000;

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={data.label || 'Delay Timer'}
      icon={Clock}
      typeColor="amber"
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-950 transition hover:!scale-125"
      />

      <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/60 flex items-center justify-between font-mono text-[11px]">
        <span className="text-slate-400">Sleep:</span>
        <span className="text-amber-300 font-semibold">{ms} ms</span>
      </div>

      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-amber-400 h-full transition-all"
          style={{ width: `${Math.min(100, (ms / 5000) * 100)}%` }}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-950 shadow-md transition hover:!scale-125"
      />
    </BaseNode>
  );
}
