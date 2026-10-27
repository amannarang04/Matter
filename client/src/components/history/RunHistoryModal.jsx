import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { X, Clock, Calendar, Eye, Loader2, RefreshCw, AlertCircle, Play } from 'lucide-react';

export default function RunHistoryModal() {
  const {
    isHistoryOpen,
    closeHistory,
    runsList,
    replayRun,
    retryHistoricalRun,
    isHistoryLoading,
    historyError,
    loadRuns,
    hasMoreRuns,
    isHistoryLoadingMore,
    loadMoreError,
    loadMoreRuns,
  } = useWorkflowStore();
  const [selectedRun, setSelectedRun] = useState(null);

  if (!isHistoryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[600px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold">Workflow Run History</h2>
          </div>
          <button
            onClick={closeHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Runs Sidebar List */}
          <div className="w-1/3 border-r border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
            {isHistoryLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <span className="text-xs">Loading execution history...</span>
              </div>
            ) : historyError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-3">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <p className="text-xs text-rose-300 font-medium">{historyError}</p>
                <button
                  type="button"
                  onClick={loadRuns}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : runsList.length === 0 ? (
              <p className="text-slate-500 text-xs italic text-center py-8">
                No past runs recorded for this workflow yet.
              </p>
            ) : (
              <>
                {runsList.map((run) => {
                  const date = new Date(run.startedAt).toLocaleString();
                  const isSelected = selectedRun?._id === run._id;

                  return (
                    <div
                      key={run._id}
                      onClick={() => setSelectedRun(run)}
                      className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            run.status === 'success'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                          }`}
                        >
                          {run.status}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{run.durationMs}ms</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            replayRun(run);
                          }}
                          className="flex items-center justify-center gap-1.5 flex-1 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-semibold transition shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View on canvas</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            retryHistoricalRun(run);
                          }}
                          className="flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition shadow-sm"
                          title="Rerun this workflow"
                        >
                          <Play className="w-3 h-3 text-emerald-400 fill-current" />
                          <span>Rerun</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Load More Button when page limit was returned */}
                {hasMoreRuns && (
                  <div className="pt-2 pb-1 text-center">
                    <button
                      type="button"
                      onClick={loadMoreRuns}
                      disabled={isHistoryLoadingMore}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition disabled:opacity-50 shadow-sm"
                    >
                      {isHistoryLoadingMore ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading older runs...</span>
                        </>
                      ) : (
                        <span>Load more</span>
                      )}
                    </button>
                    {loadMoreError && (
                      <p className="text-[11px] text-rose-400 mt-1.5 font-medium">{loadMoreError}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Run Details Panel */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60 space-y-6">
            {selectedRun ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300">Execution Summary</h3>
                    <span className="text-xs text-slate-500 font-mono">{selectedRun._id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => replayRun(selectedRun)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View on canvas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => retryHistoricalRun(selectedRun)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Rerun this run</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Status</span>
                      <p className="font-semibold text-emerald-400 mt-1 capitalize">{selectedRun.status}</p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Duration</span>
                      <p className="font-semibold text-indigo-300 font-mono mt-1">{selectedRun.durationMs} ms</p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Node Steps</span>
                      <p className="font-semibold text-slate-200 font-mono mt-1">
                        {selectedRun.nodeEvents?.length || 0}
                      </p>
                    </div>
                  </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Final Output</h3>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                    {JSON.stringify(selectedRun.finalOutput || {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Run Context Snapshot</h3>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto">
                    {JSON.stringify(selectedRun.runContext || {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <p>Select a run from the list to inspect its snapshot and outputs.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
