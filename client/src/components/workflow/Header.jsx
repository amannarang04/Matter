import React, { useState, useEffect, useRef } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { TEMPLATES } from '../../utils/templates';
import * as api from '../../services/api';
import {
  Play,
  Save,
  Plus,
  Clock,
  Layers,
  FolderOpen,
  Loader2,
  Sparkles,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  X,
} from 'lucide-react';

export default function Header() {
  const {
    name,
    description,
    workflowId,
    nodes,
    edges,
    updateWorkflowMeta,
    saveWorkflow,
    runWorkflow,
    deleteCurrentWorkflow,
    isSaving,
    isRunning,
    newWorkflow,
    loadTemplate,
    loadWorkflow,
    openHistory,
    allWorkflows,
    fetchWorkflowsList,
    initApp,
    setErrorMessage,
  } = useWorkflowStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(name);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      updateWorkflowMeta(tempTitle.trim(), description);
    } else {
      setTempTitle(name);
    }
  };

  const handleExport = () => {
    // Strip database ids, workspaceId, run data or internal fields
    const cleanNodes = (nodes || []).map((node) => {
      const { _id, workspaceId, __v, createdAt, updatedAt, ...rest } = node || {};
      return rest;
    });

    const cleanEdges = (edges || []).map((edge) => {
      const { _id, workspaceId, __v, createdAt, updatedAt, ...rest } = edge || {};
      return rest;
    });

    const exportData = {
      format: 'matter-workflow',
      version: 1,
      name: name || 'Untitled Workflow',
      description: description || '',
      nodes: cleanNodes,
      edges: cleanEdges,
      exportedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (name || 'workflow').replace(/[/\\?%*:|"<>]/g, '_');
    link.href = url;
    link.download = `${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // 1. Reject files larger than 1 MB
      if (file.size > 1024 * 1024) {
        throw new Error('File exceeds maximum size of 1 MB');
      }

      // 2. Reject files that are not valid JSON
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('File is not valid JSON');
      }

      // 3. Reject files whose format field is not "matter-workflow"
      if (!parsed || typeof parsed !== 'object' || parsed.format !== 'matter-workflow') {
        throw new Error('Invalid workflow format: format field must be "matter-workflow"');
      }

      // 4. Strip unknown top-level fields - keep only name, description, nodes, edges
      const rawName =
        typeof parsed.name === 'string' && parsed.name.trim()
          ? parsed.name.trim()
          : 'Imported Workflow';
      const rawDescription = typeof parsed.description === 'string' ? parsed.description : '';
      const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : [];

      const cleanNodes = rawNodes.map((n) => {
        const { _id, workspaceId, __v, createdAt, updatedAt, ...rest } = n || {};
        return rest;
      });

      const cleanEdges = rawEdges.map((e) => {
        const { _id, workspaceId, __v, createdAt, updatedAt, ...rest } = e || {};
        return rest;
      });

      // 5. If the name already exists, add " (imported)" to it
      let targetName = rawName;
      const existingNames = (allWorkflows || []).map((w) => w.name);
      if (existingNames.includes(targetName)) {
        targetName = `${targetName} (imported)`;
      }

      // 6. Send nodes and edges through server validator path (createWorkflow on server enforces validator)
      const created = await api.createWorkflow({
        name: targetName,
        description: rawDescription,
        nodes: cleanNodes,
        edges: cleanEdges,
      });

      // 7. Successful import creates a NEW workflow in current workspace and opens it
      await fetchWorkflowsList();
      loadWorkflow(created);
    } catch (err) {
      setImportError(err.message || 'Import failed');
      setErrorMessage(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <div className="relative">
          {allWorkflows.length > 0 ? (
            <>
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
            </>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/40 border border-slate-700/40 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none"
              title="No saved workflows in database"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>No saved workflows</span>
            </div>
          )}
        </div>

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

        {/* Export Workflow JSON */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-300 transition"
          title="Export current workflow as JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Import Workflow JSON */}
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-300 transition disabled:opacity-50"
          title="Import workflow from JSON file"
        >
          {isImporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{isImporting ? 'Importing...' : 'Import'}</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
        />

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

        {/* Delete Workflow */}
        {workflowId && (
          <button
            onClick={() => {
              if (window.confirm('Delete this workflow from database?')) {
                deleteCurrentWorkflow();
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-rose-950/60 border border-slate-700/60 hover:border-rose-800/80 text-xs font-medium text-slate-400 hover:text-rose-300 transition"
            title="Delete this workflow from database"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}

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

      {/* Import Error Modal */}
      {importError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-800/80 rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Import Failed</span>
              </div>
              <button
                onClick={() => setImportError(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-rose-200 font-mono bg-rose-950/60 p-3 rounded-lg border border-rose-900/60 break-words whitespace-pre-wrap">
              {importError}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setImportError(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
