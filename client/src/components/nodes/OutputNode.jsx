import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileOutput } from 'lucide-react';
import BaseNode from './BaseNode';

function formatOperand(op) {
  if (!op) return 'null';
  if (op.source === 'ref') return `$${op.key}`;
  return String(op.value);
}

export default function OutputNode({ id, data, selected }) {
  const fields = data.fields || [];

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={data.label || 'Workflow Output'}
      icon={FileOutput}
      typeColor="emerald"
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-950 transition hover:!scale-125"
      />

      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Payload Fields</span>
        {fields.length === 0 ? (
          <p className="text-slate-500 italic text-[11px]">No fields defined</p>
        ) : (
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 space-y-1 font-mono max-h-32 overflow-y-auto">
            {fields.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-300 truncate max-w-[80px]">{f.key}:</span>
                <span className="text-slate-300 truncate max-w-[90px]">{formatOperand(f.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
