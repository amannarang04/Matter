import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';
import BaseNode from './BaseNode';

function formatOperand(op) {
  if (!op) return 'null';
  if (op.source === 'ref') return `$${op.key}`;
  return String(op.value);
}

const CMP_SYMBOLS = {
  gt: '>',
  lt: '<',
  eq: '==',
  gte: '>=',
  lte: '<=',
  neq: '!=',
};

export default function ConditionNode({ id, data, selected }) {
  const symbol = CMP_SYMBOLS[data.op] || data.op || '==';

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={data.label || 'Condition Branch'}
      icon={GitBranch}
      typeColor="amber"
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-950 transition hover:!scale-125"
      />

      <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 font-mono text-[11px] flex items-center justify-center gap-1.5 text-center">
        <span className="text-amber-300 truncate max-w-[80px]">{formatOperand(data.left)}</span>
        <span className="text-purple-400 font-bold px-1">{symbol}</span>
        <span className="text-amber-300 truncate max-w-[80px]">{formatOperand(data.right)}</span>
      </div>

      {/* Branch Outputs Indicators */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-end text-[10px] text-emerald-400 font-semibold gap-1">
          <span>True Branch</span>
          <Check className="w-3 h-3 text-emerald-400" />
        </div>
        <div className="flex items-center justify-end text-[10px] text-rose-400 font-semibold gap-1">
          <span>False Branch</span>
          <X className="w-3 h-3 text-rose-400" />
        </div>
      </div>

      {/* Two explicit handles with IDs matching CONTRACT.md */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '65%' }}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-950 shadow-md transition hover:!scale-125 hover:!bg-emerald-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '85%' }}
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-slate-950 shadow-md transition hover:!scale-125 hover:!bg-rose-400"
      />
    </BaseNode>
  );
}
