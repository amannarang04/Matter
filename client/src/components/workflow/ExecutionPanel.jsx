import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Terminal,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  Play,
  BarChart2,
} from 'lucide-react';
import TimelineView from './TimelineView';

export default function ExecutionPanel() {
  const {
    runStatus,
    runContext,
    finalOutput,
    liveLogs,
    activeBottomTab,
    setActiveBottomTab,
    errorMessage,
    runWorkflow,
    isRunning,
    nodes,
    nodeStates,
  } = useWorkflowStore();

  const failedNodeId = Object.keys(nodeStates || {}).find(
    (id) => nodeStates[id]?.status === 'failed'
  );
  const failedNode = (nodes || []).find((n) => n.id === failedNodeId);
  const failedNodeLabel = failedNode?.data?.label || (failedNodeId ? `Node "${failedNodeId}"` : null);
  const displayError = (failedNodeId && nodeStates[failedNodeId]?.error) || errorMessage;

  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex flex-col shadow-2xl transition-all duration-300">
      {/* Panel Top Bar / Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/70">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveBottomTab('logs');
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeBottomTab === 'logs' && isExpanded
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Execution Logs</span>
            {liveLogs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded-full font-mono">
                {liveLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveBottomTab('timeline');
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeBottomTab === 'timeline' && isExpanded
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Timeline</span>
            {Object.keys(nodeStates || {}).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded-full font-mono">
                {Object.keys(nodeStates || {}).length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveBottomTab('context');
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeBottomTab === 'context' && isExpanded
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Run Context</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded-full font-mono">
              {Object.keys(runContext).length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveBottomTab('output');
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeBottomTab === 'output' && isExpanded
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Final Output</span>
            {Object.keys(finalOutput).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded-full font-mono border border-emerald-800/60">
                Ready
              </span>
            )}
          </button>
        </div>

        {/* Status indicator and collapse toggle */}
        <div className="flex items-center gap-3">
          {runStatus !== 'idle' && (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400">Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                  runStatus === 'running'
                    ? 'bg-amber-950/80 text-amber-400 border border-amber-800/80 animate-pulse'
                    : runStatus === 'success'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                }`}
              >
                {runStatus}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Drawer */}
      {isExpanded && (
        <div className="h-48 overflow-y-auto p-3 font-mono text-xs text-slate-300 bg-slate-950/90">
          {/* Logs Tab */}
          {activeBottomTab === 'logs' && (
            <div className="space-y-1.5">
              {liveLogs.length === 0 ? (
                <p className="text-slate-500 italic py-4 text-center font-sans">
                  No execution logs yet. Click "Run Workflow" to trigger execution with live streaming.
                </p>
              ) : (
                liveLogs.map((log, index) => {
                  const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
                  if (log.type === 'run') {
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-1.5 rounded ${
                          log.status === 'success'
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                            : log.status === 'failed'
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
                            : 'bg-indigo-950/30 text-indigo-300'
                        }`}
                      >
                        <span className="text-slate-500 text-[11px]">[{time}]</span>
                        <span className="font-semibold uppercase tracking-wider text-[11px]">RUN {log.status}</span>
                        {log.errorSummary && <span className="text-rose-400 truncate">: {log.errorSummary}</span>}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1 rounded hover:bg-slate-900/80 transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500 text-[11px]">[{time}]</span>
                        <span className="text-indigo-400 font-semibold">{log.nodeId}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                            log.status === 'success'
                              ? 'text-emerald-400 bg-emerald-950/60'
                              : log.status === 'failed'
                              ? 'text-rose-400 bg-rose-950/60'
                              : log.status === 'skipped'
                              ? 'text-slate-400 bg-slate-800/60'
                              : 'text-amber-400 bg-amber-950/60'
                          }`}
                        >
                          {log.status}
                        </span>
                        {log.outputs && Object.keys(log.outputs).length > 0 && (
                          <span className="text-slate-400 text-[11px] truncate">
                            &rarr; {JSON.stringify(log.outputs)}
                          </span>
                        )}
                        {log.error && <span className="text-rose-400 text-[11px] truncate">: {log.error}</span>}
                      </div>
                      {log.durationMs !== undefined && log.durationMs > 0 && (
                        <span className="text-slate-500 text-[10px] shrink-0">{log.durationMs}ms</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeBottomTab === 'timeline' && <TimelineView />}

          {/* Context Tab */}
          {activeBottomTab === 'context' && (
            <div className="relative">
              <button
                onClick={() => handleCopy(runContext)}
                className="absolute top-0 right-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition shadow"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {Object.keys(runContext).length === 0 ? (
                <p className="text-slate-500 italic py-4 text-center font-sans">
                  Run context is empty. Run the workflow to inspect populated variables.
                </p>
              ) : (
                <pre className="text-indigo-300 overflow-x-auto p-2 bg-slate-900 rounded-lg border border-slate-800">
                  {JSON.stringify(runContext, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Output Tab */}
          {activeBottomTab === 'output' && (
            <div className="relative">
              <button
                onClick={() => handleCopy(finalOutput)}
                className="absolute top-0 right-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition shadow"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {Object.keys(finalOutput).length === 0 ? (
                <p className="text-slate-500 italic py-4 text-center font-sans">
                  No finalOutput recorded. Ensure your workflow contains reachable Output nodes that execute.
                </p>
              ) : (
                <pre className="text-emerald-300 overflow-x-auto p-2 bg-slate-900 rounded-lg border border-slate-800">
                  {JSON.stringify(finalOutput, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {(runStatus === 'failed' || errorMessage) && (
        <div className="px-4 py-2.5 bg-rose-950/95 border-t border-rose-800/80 text-xs text-rose-200 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex items-center gap-2 truncate">
              {failedNodeLabel && (
                <span className="px-1.5 py-0.5 rounded bg-rose-900/80 border border-rose-700/80 text-[11px] font-bold text-rose-200 shrink-0">
                  {failedNodeLabel}
                </span>
              )}
              <span className="font-sans font-medium truncate">
                {displayError || 'Workflow execution failed'}
              </span>
            </div>
          </div>
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 shrink-0"
            title="Fix configuration and trigger a new run"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Fix and rerun</span>
          </button>
        </div>
      )}
    </div>
  );
}
