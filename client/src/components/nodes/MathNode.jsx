import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Calculator } from 'lucide-react';
import BaseNode from './BaseNode';

function formatOperand(op) {
  if (!op) return 'null';
  if (op.source === 'ref') return `$${op.key}`;
  return String(op.value);
}

const OP_SYMBOLS = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
};

export default function MathNode({ id, data, selected }) {
  const symbol = OP_SYMBOLS[data.op] || data.op || '+';

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={data.label || 'Math Operation'}
      icon={Calculator}
      typeColor="cyan"
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-950 transition hover:!scale-125"
      />

      <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 font-mono text-[11px] flex items-center justify-between gap-1">
        <span className="text-cyan-300 truncate max-w-[70px]">{formatOperand(data.left)}</span>
        <span className="text-amber-400 font-bold px-1">{symbol}</span>
        <span className="text-cyan-300 truncate max-w-[70px]">{formatOperand(data.right)}</span>
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
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-slate-950 shadow-md transition hover:!scale-125"
      />
    </BaseNode>
  );
}
