import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { TEMPLATES } from '../../utils/templates';
import {
  Play,
  Save,
  Plus,
  Clock,
  Layers,
  FolderOpen,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function Header() {
  const {
    name,
    description,
    updateWorkflowMeta,
    saveWorkflow,
    runWorkflow,
    isSaving,
    isRunning,
    newWorkflow,
    loadTemplate,
    loadWorkflow,
    openHistory,
    allWorkflows,
    fetchWorkflowsList,
  } = useWorkflowStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(name);

  useEffect(() => {
    fetchWorkflowsList();
  }, [fetchWorkflowsList]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      updateWorkflowMeta(tempTitle.trim(), description);
    } else {
      setTempTitle(name);
    }
  };

  return (
    <header className="h-16 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between text-slate-100 z-20 shadow-md">
      {/* Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              MATTER
            </span>
            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Engine
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        {/* Workflow Title */}
        <div className="flex flex-col">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="px-2 py-0.5 bg-slate-950 border border-indigo-500 rounded text-xs font-semibold text-slate-100 focus:outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setTempTitle(name);
                setIsEditingTitle(true);
              }}
              className="text-left text-xs font-semibold text-slate-200 hover:text-indigo-400 transition flex items-center gap-1.5 group"
              title="Click to rename"
            >
              <span>{name}</span>
              <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition">
                (rename)
              </span>
            </button>
          )}
          <span className="text-[10px] text-slate-400 truncate max-w-sm">
            {description || 'Matter Workflow Visual Pipeline'}
          </span>
        </div>
      </div>

      {/* Actions & Controls */}
      <div className="flex items-center gap-2.5">
        {/* Preset Templates */}
        <div className="relative">
          <select
            onChange={(e) => {
              if (e.target.value) {
                loadTemplate(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="appearance-none px-3 py-1.5 pr-7 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-xs font-medium text-slate-300 focus:outline-none transition cursor-pointer"
          >
            <option value="" disabled>
              Templates...
            </option>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Load Saved Workflows */}
        {allWorkflows.length > 0 && (
          <div className="relative">
            <select
              onChange={(e) => {
                const wf = allWorkflows.find((w) => w._id === e.target.value);
                if (wf) loadWorkflow(wf);
                e.target.value = '';
              }}
              defaultValue=""
              className="appearance-none px-3 py-1.5 pr-7 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-xs font-medium text-slate-300 focus:outline-none transition cursor-pointer"
            >
              <option value="" disabled>
                Open Workflow...
              </option>
              {allWorkflows.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>
            <FolderOpen className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* New Workflow */}
        <button
          onClick={newWorkflow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-300 transition"
          title="Create New Blank Workflow"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>

        {/* History */}
        <button
          onClick={openHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-300 transition"
          title="View Past Run History"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History</span>
        </button>

        {/* Save */}
        <button
          onClick={saveWorkflow}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition disabled:opacity-50"
          title="Save Workflow to MongoDB"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        {/* Run Workflow CTA */}
        <button
          onClick={runWorkflow}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition shadow-lg ${
            isRunning
              ? 'bg-amber-600 animate-pulse'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20 hover:shadow-emerald-500/30'
          }`}
          title="Execute Workflow Live via SSE"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Workflow</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
