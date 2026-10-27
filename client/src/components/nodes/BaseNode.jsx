import React from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { CheckCircle2, AlertCircle, Loader2, MinusCircle } from 'lucide-react';

export default function BaseNode({
  id,
  selected,
  title,
  icon: Icon,
  typeColor = 'indigo',
  children,
}) {
  const nodeState = useWorkflowStore((state) => state.nodeStates[id]);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const isSelected = selected || selectedNodeId === id;
  const status = nodeState?.status || 'idle';

  let statusBorder = 'border-slate-800 hover:border-slate-700';
  let statusBadge = null;

  if (status === 'running') {
    statusBorder = 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/20 animate-pulse';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
        <Loader2 className="w-3 h-3 animate-spin" /> running
      </span>
    );
  } else if (status === 'success') {
    statusBorder = 'border-emerald-500 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/10';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
        <CheckCircle2 className="w-3 h-3" /> success
        {nodeState?.durationMs !== undefined && (
          <span className="text-[10px] text-emerald-300/70 font-mono">({nodeState.durationMs}ms)</span>
        )}
      </span>
    );
  } else if (status === 'failed') {
    statusBorder = 'border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/20';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
        <AlertCircle className="w-3 h-3" /> error
      </span>
    );
  } else if (status === 'skipped') {
    statusBorder = 'border-slate-700/60 border-dashed opacity-60';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/40">
        <MinusCircle className="w-3 h-3" /> skipped
      </span>
    );
  }

  const colorMap = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  const badgeClass = colorMap[typeColor] || colorMap.indigo;

  return (
    <div
      className={`min-w-[240px] max-w-[320px] rounded-xl bg-slate-900/95 backdrop-blur-md border text-slate-100 transition-all duration-200 select-none shadow-xl ${statusBorder} ${
        isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 outline-none shadow-indigo-500/30' : ''
      }`}
    >
      {/* Node Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-950/40 rounded-t-xl">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`p-1.5 rounded-lg border ${badgeClass}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-xs font-semibold tracking-wide text-slate-200">{title}</span>
        </div>
        {statusBadge}
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-2 text-xs">{children}</div>

      {nodeState?.error && (
        <div className="px-3 pb-2.5 pt-0 text-[11px] text-rose-400 bg-rose-950/20 border-t border-rose-900/40 rounded-b-xl">
          <p className="line-clamp-2">{nodeState.error}</p>
        </div>
      )}
    </div>
  );
}
