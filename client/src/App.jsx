import React from 'react';
import Header from './components/workflow/Header';
import WorkflowCanvas from './components/canvas/WorkflowCanvas';
import NodeInspector from './components/inspector/NodeInspector';
import ExecutionPanel from './components/workflow/ExecutionPanel';
import RunHistoryModal from './components/history/RunHistoryModal';

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Header />

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
