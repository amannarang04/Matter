import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileInput } from 'lucide-react';
import BaseNode from './BaseNode';

export default function InputNode({ id, data, selected }) {
  const values = data.values || {};
  const keys = Object.keys(values);

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={data.label || 'Input Node'}
      icon={FileInput}
      typeColor="indigo"
    >
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Values</span>
        {keys.length === 0 ? (
          <p className="text-slate-500 italic text-[11px]">No values configured</p>
        ) : (
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 space-y-1 font-mono">
            {keys.map((k) => (
              <div key={k} className="flex items-center justify-between text-[11px]">
                <span className="text-indigo-300">{k}:</span>
                <span className="text-amber-300 font-semibold">{String(values[k])}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-slate-950 shadow-md transition hover:!scale-125"
      />
    </BaseNode>
  );
}
