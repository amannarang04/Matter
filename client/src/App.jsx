import React from 'react';
import Header from './components/workflow/Header';
import WorkflowCanvas from './components/canvas/WorkflowCanvas';
import NodeInspector from './components/inspector/NodeInspector';
import ExecutionPanel from './components/workflow/ExecutionPanel';
import RunHistoryModal from './components/history/RunHistoryModal';
import { useWorkflowStore } from './store/workflowStore';
import { Loader2, Clock, RotateCcw, AlertTriangle } from 'lucide-react';

export default function App() {
  const { isServerWaking, replayingRun, exitReplay, workflowUpdatedAt, lastEditedAt } =
    useWorkflowStore();

  const isWorkflowModifiedAfterRun =
    replayingRun &&
    ((workflowUpdatedAt && new Date(workflowUpdatedAt).getTime() > new Date(replayingRun.startedAt).getTime()) ||
      (lastEditedAt && lastEditedAt > new Date(replayingRun.startedAt).getTime()));

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Header />

      {/* Past Run Replay Banner */}
      {replayingRun && (
        <div className="bg-indigo-950/95 border-b border-indigo-500/40 px-4 py-2.5 flex items-center justify-between text-indigo-200 text-xs sm:text-sm font-medium z-30 transition-all shadow-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              Viewing past run from {new Date(replayingRun.startedAt).toLocaleString()}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                replayingRun.status === 'success'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {replayingRun.status} ({replayingRun.durationMs}ms)
            </span>
            {isWorkflowModifiedAfterRun && (
              <span className="text-amber-400 text-xs flex items-center gap-1.5 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-normal">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Workflow was edited after this run; graph may differ from run execution.
              </span>
            )}
          </div>
          <button
            onClick={exitReplay}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Back to live canvas</span>
          </button>
        </div>
      )}

      {/* Cold Start Waking Server Banner */}
      {isServerWaking && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-amber-200 text-xs sm:text-sm font-medium z-30 transition-all">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span>Waking up the server, this can take up to a minute...</span>
          </div>
          <span className="text-amber-400/80 text-xs hidden sm:inline">Connecting to backend service</span>
        </div>
      )}

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* React Flow Canvas */}
        <div className="flex-1 h-full relative">
          <WorkflowCanvas />
        </div>

        {/* Right Node Configuration Inspector */}
        <NodeInspector />
      </div>

      {/* Bottom Live Execution & Context Logs */}
      <ExecutionPanel />

      {/* Run History Modal */}
      <RunHistoryModal />
    </div>
  );
}
