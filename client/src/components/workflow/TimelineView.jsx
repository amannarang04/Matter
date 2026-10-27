import React from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  CircleDashed,
  PauseCircle,
} from 'lucide-react';

export default function TimelineView() {
  const {
    nodes,
    nodeStates,
    runStartedAt,
    runDurationMs,
    liveLogs,
    selectedNodeId,
    setSelectedNodeId,
    isRunning,
  } = useWorkflowStore();

  const nodeStatesKeys = Object.keys(nodeStates || {});

  // Empty state: No node state recorded yet
  if (nodeStatesKeys.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 text-slate-500 font-sans text-xs">
        <Clock className="w-7 h-7 mb-2 text-slate-600 stroke-[1.5]" />
        <p className="font-medium text-slate-400">Run the workflow to see the timeline</p>
        <span className="text-[11px] text-slate-600 mt-0.5">
          Live streaming waterfall will appear here during execution.
        </span>
      </div>
    );
  }

  // Determine chronological execution order from liveLogs or nodeStates
  const orderedNodeIds = [];
  (liveLogs || []).forEach((log) => {
    if (log && log.type === 'node' && log.nodeId && !orderedNodeIds.includes(log.nodeId)) {
      orderedNodeIds.push(log.nodeId);
    }
  });

  // Include any node states that weren't captured in liveLogs order
  nodeStatesKeys.forEach((id) => {
    if (!orderedNodeIds.includes(id)) {
      orderedNodeIds.push(id);
    }
  });

  // Build item list for all executed or executing nodes
  const executedItems = orderedNodeIds.map((id) => {
    const node = (nodes || []).find((n) => n.id === id);
    const state = nodeStates[id] || {};
    return {
      nodeId: id,
      label: node?.data?.label || id,
      type: node?.type || 'unknown',
      state,
      status: state.status || 'pending',
      durationMs: typeof state.durationMs === 'number' ? state.durationMs : 0,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
    };
  });

  // Append remaining workflow nodes as pending if currently running or failed before reaching them
  (nodes || []).forEach((n) => {
    if (!orderedNodeIds.includes(n.id)) {
      executedItems.push({
        nodeId: n.id,
        label: n.data?.label || n.id,
        type: n.type,
        state: { status: 'pending' },
        status: 'pending',
        durationMs: 0,
        startedAt: null,
        completedAt: null,
      });
    }
  });

  // Total run duration calculation
  let totalDuration = runDurationMs;
  if (!totalDuration || totalDuration <= 0) {
    if (runStartedAt) {
      totalDuration = Date.now() - runStartedAt;
    } else {
      totalDuration = executedItems.reduce((acc, i) => acc + (i.durationMs || 0), 0);
    }
  }
  const effectiveTotalDuration = Math.max(1, totalDuration);

  // Check if relative startedAt timestamps are present for all executed nodes
  const hasLiveStartTimes =
    Boolean(runStartedAt) &&
    executedItems.some((i) => i.status !== 'pending' && i.startedAt != null);

  let itemsWithPositions = [];
  if (hasLiveStartTimes) {
    // Waterfall layout based on true startedAt relative to run start
    itemsWithPositions = executedItems.map((item) => {
      if (item.status === 'pending') {
        return { ...item, leftPercent: 100, widthPercent: 0 };
      }
      const nodeStart = item.startedAt ?? runStartedAt;
      const offsetMs = Math.max(0, nodeStart - runStartedAt);
      const leftPercent = Math.min(98, Math.max(0, (offsetMs / effectiveTotalDuration) * 100));
      const widthPercent = (item.durationMs / effectiveTotalDuration) * 100;
      return { ...item, leftPercent, widthPercent, offsetMs };
    });
  } else {
    // If startedAt is not available in the live events, order nodes by execution order and stack the durations instead.
    let cumulativeOffsetMs = 0;
    itemsWithPositions = executedItems.map((item) => {
      if (item.status === 'pending') {
        return { ...item, leftPercent: 100, widthPercent: 0 };
      }
      const offsetMs = cumulativeOffsetMs;
      cumulativeOffsetMs += item.durationMs;
      const leftPercent = Math.min(98, Math.max(0, (offsetMs / effectiveTotalDuration) * 100));
      const widthPercent = (item.durationMs / effectiveTotalDuration) * 100;
      return { ...item, leftPercent, widthPercent, offsetMs };
    });
  }

  return (
    <div className="space-y-3 font-sans">
      {/* Top metrics summary */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Execution Waterfall</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {executedItems.filter((i) => i.status !== 'pending').length} of {nodes.length} nodes
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-400 text-[11px]">Total Duration:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 font-bold text-xs">
            {totalDuration} ms
          </span>
        </div>
      </div>

      {/* Waterfall Rows */}
      <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
        {itemsWithPositions.map((item) => {
          const isSelected = selectedNodeId === item.nodeId;
          const isSkipped = item.status === 'skipped';
          const isRunningNode = item.status === 'running';

          let statusColor = 'bg-slate-700 text-slate-300';
          let statusBadgeClass = 'text-slate-400 bg-slate-800/80 border-slate-700';
          let barBg = 'bg-slate-700 hover:bg-slate-600';

          if (item.status === 'success') {
            statusBadgeClass = 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80';
            barBg = 'bg-emerald-500 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20';
          } else if (item.status === 'failed') {
            statusBadgeClass = 'text-rose-400 bg-rose-950/80 border-rose-800/80';
            barBg = 'bg-rose-500 hover:bg-rose-400 shadow-sm shadow-rose-500/20';
          } else if (item.status === 'running') {
            statusBadgeClass = 'text-amber-400 bg-amber-950/80 border-amber-800/80 animate-pulse';
            barBg = 'bg-amber-500 hover:bg-amber-400 animate-pulse';
          } else if (isSkipped) {
            statusBadgeClass = 'text-slate-400 bg-slate-800/60 border-slate-700/60';
          }

          return (
            <div
              key={item.nodeId}
              onClick={() => setSelectedNodeId(item.nodeId)}
              className={`group flex items-center gap-3 p-1 rounded-lg transition cursor-pointer ${
                isSelected
                  ? 'bg-indigo-950/50 ring-1 ring-indigo-500/50'
                  : 'hover:bg-slate-900/80'
              }`}
              title={`Click to focus node "${item.label}" on canvas`}
            >
              {/* Node info label */}
              <div className="w-48 shrink-0 flex items-center justify-between gap-1.5 truncate">
                <div className="flex items-center gap-1.5 truncate">
                  {item.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : item.status === 'failed' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : item.status === 'running' ? (
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                  ) : isSkipped ? (
                    <CircleDashed className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  ) : (
                    <PauseCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-200 truncate group-hover:text-indigo-300 transition">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}
                  >
                    {item.status}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 min-w-[42px] text-right">
                    {isSkipped ? '—' : `${item.durationMs}ms`}
                  </span>
                </div>
              </div>

              {/* Waterfall Track */}
              <div className="flex-1 h-5 bg-slate-900/90 rounded border border-slate-800/70 relative overflow-hidden">
                {isSkipped ? (
                  // Skipped nodes show a thin dashed marker with no duration
                  <div
                    style={{ left: `${item.leftPercent}%` }}
                    className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-slate-400/80"
                    title={`${item.label} (skipped)`}
                  />
                ) : item.status === 'pending' ? (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 italic">
                    pending
                  </div>
                ) : (
                  // Active execution bar - minimum width ensures sub-millisecond durations are always visible
                  <div
                    style={{
                      left: `${item.leftPercent}%`,
                      width: `max(${item.widthPercent}%, 8px)`,
                    }}
                    className={`absolute top-0.5 bottom-0.5 rounded transition-all duration-150 ${barBg}`}
                    title={`${item.label}: ${item.durationMs}ms`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
