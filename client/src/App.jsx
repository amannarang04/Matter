import React from 'react';
import Header from './components/workflow/Header';
import WorkflowCanvas from './components/canvas/WorkflowCanvas';
import NodeInspector from './components/inspector/NodeInspector';
import ExecutionPanel from './components/workflow/ExecutionPanel';
import RunHistoryModal from './components/history/RunHistoryModal';
import { useWorkflowStore } from './store/workflowStore';
import { Loader2 } from 'lucide-react';

export default function App() {
  const isServerWaking = useWorkflowStore((state) => state.isServerWaking);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Header />

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
