import React from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Trash2, X, Plus, AlertTriangle } from 'lucide-react';

function OperandEditor({ label, operand, onChange, availableKeys = [] }) {
  const current = operand || { source: 'literal', value: 0 };

  const handleSourceChange = (newSource) => {
    if (newSource === 'ref') {
      onChange({ source: 'ref', key: availableKeys[0] || 'inputKey' });
    } else {
      onChange({ source: 'literal', value: 0 });
    }
  };

  return (
    <div className="space-y-1.5 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
      <div className="flex items-center justify-between text-xs font-medium text-slate-300">
        <span>{label}</span>
        <div className="flex rounded bg-slate-900 border border-slate-700/60 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => handleSourceChange('literal')}
            className={`px-2 py-0.5 rounded transition ${
              current.source === 'literal' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Literal
          </button>
          <button
            type="button"
            onClick={() => handleSourceChange('ref')}
            className={`px-2 py-0.5 rounded transition ${
              current.source === 'ref' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ref ($)
          </button>
        </div>
      </div>

      {current.source === 'literal' ? (
        <input
          type="text"
          value={current.value ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = !isNaN(Number(raw)) && raw.trim() !== '' ? Number(raw) : raw === 'true' ? true : raw === 'false' ? false : raw;
            onChange({ source: 'literal', value: parsed });
          }}
          placeholder="e.g. 10, 'hello', true"
          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/70 rounded-md text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
        />
      ) : (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={current.key || ''}
            onChange={(e) => onChange({ source: 'ref', key: e.target.value })}
            placeholder="Context variable key"
            className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700/70 rounded-md text-xs text-indigo-300 font-mono focus:border-indigo-500 focus:outline-none"
          />
          {availableKeys.length > 0 && (
            <select
              value={availableKeys.includes(current.key) ? current.key : ''}
              onChange={(e) => {
                if (e.target.value) onChange({ source: 'ref', key: e.target.value });
              }}
              className="px-2 py-1 bg-slate-900 border border-slate-700/70 rounded-md text-[11px] text-slate-300"
            >
              <option value="">Known Keys</option>
              {availableKeys.map((k) => (
                <option key={k} value={k}>
                  ${k}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export default function NodeInspector() {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNodeData, deleteNode } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Extract known output keys from other nodes
  const availableKeys = React.useMemo(() => {
    const keys = new Set();
    nodes.forEach((n) => {
      if (n.type === 'input' && n.data?.values) {
        Object.keys(n.data.values).forEach((k) => keys.add(k));
      } else if (n.data?.outputKey) {
        keys.add(n.data.outputKey);
      }
    });
    return Array.from(keys);
  }, [nodes]);

  if (!selectedNode) {
    return (
      <div className="w-80 h-full bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-500">
        <p className="text-sm font-medium">No node selected</p>
        <p className="text-xs mt-1 text-slate-600">Click any node on the canvas to inspect and configure its parameters.</p>
      </div>
    );
  }

  const { id, type, data } = selectedNode;

  return (
    <div className="w-84 h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col overflow-hidden text-slate-200 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {type}
          </span>
          <span className="text-xs font-mono text-slate-400 truncate max-w-[120px]">{id}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => deleteNode(id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title="Delete Node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedNodeId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Node Label</label>
          <input
            type="text"
            value={data.label || ''}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            placeholder="Display label"
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Input Node Form */}
        {type === 'input' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Context Values</label>
              <button
                type="button"
                onClick={() => {
                  const currentValues = data.values || {};
                  const newKey = `key_${Object.keys(currentValues).length + 1}`;
                  updateNodeData(id, {
                    values: { ...currentValues, [newKey]: 10 },
                  });
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="w-3 h-3" /> Add Value
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(data.values || {}).map(([key, val]) => (
                <div key={key} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      defaultValue={key}
                      onBlur={(e) => {
                        const newKey = e.target.value.trim();
                        if (newKey && newKey !== key) {
                          const updated = { ...data.values };
                          const currentVal = updated[key];
                          delete updated[key];
                          updated[newKey] = currentVal;
                          updateNodeData(id, { values: updated });
                        }
                      }}
                      className="px-2 py-1 bg-slate-900 border border-slate-700/60 rounded text-xs text-indigo-300 font-mono flex-1 focus:outline-none"
                      placeholder="key_name"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...data.values };
                        delete updated[key];
                        updateNodeData(id, { values: updated });
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = !isNaN(Number(raw)) && raw.trim() !== '' ? Number(raw) : raw === 'true' ? true : raw === 'false' ? false : raw;
                      updateNodeData(id, {
                        values: { ...data.values, [key]: parsed },
                      });
                    }}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700/60 rounded text-xs text-amber-300 font-mono focus:outline-none"
                    placeholder="Value (e.g. 1500, 0.1, text)"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Math Node Form */}
        {type === 'math' && (
          <div className="space-y-3">
            <OperandEditor
              label="Left Operand"
              operand={data.left}
              onChange={(op) => updateNodeData(id, { left: op })}
              availableKeys={availableKeys}
            />

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Operation</label>
              <select
                value={data.op || 'add'}
                onChange={(e) => updateNodeData(id, { op: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="add">Add (+)</option>
                <option value="subtract">Subtract (−)</option>
                <option value="multiply">Multiply (×)</option>
                <option value="divide">Divide (÷)</option>
              </select>
            </div>

            <OperandEditor
              label="Right Operand"
              operand={data.right}
              onChange={(op) => updateNodeData(id, { right: op })}
              availableKeys={availableKeys}
            />

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Output Key</label>
              <input
                type="text"
                value={data.outputKey || ''}
                onChange={(e) => updateNodeData(id, { outputKey: e.target.value })}
                placeholder="e.g. discount, finalPrice"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-emerald-400 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Condition Node Form */}
        {type === 'condition' && (
          <div className="space-y-3">
            <OperandEditor
              label="Left Operand"
              operand={data.left}
              onChange={(op) => updateNodeData(id, { left: op })}
              availableKeys={availableKeys}
            />

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Comparison Operator</label>
              <select
                value={data.op || 'eq'}
                onChange={(e) => updateNodeData(id, { op: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="gt">Greater Than (&gt;)</option>
                <option value="lt">Less Than (&lt;)</option>
                <option value="eq">Equal (==)</option>
                <option value="gte">Greater Than or Equal (&gt;=)</option>
                <option value="lte">Less Than or Equal (&lt;=)</option>
                <option value="neq">Not Equal (!=)</option>
              </select>
            </div>

            <OperandEditor
              label="Right Operand"
              operand={data.right}
              onChange={(op) => updateNodeData(id, { right: op })}
              availableKeys={availableKeys}
            />

            <div className="p-2.5 bg-amber-950/20 border border-amber-800/40 rounded-lg text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Connect this node's Green handle for True condition, and Red handle for False condition.</span>
            </div>
          </div>
        )}

        {/* Transform Node Form */}
        {type === 'transform' && (
          <div className="space-y-3">
            <OperandEditor
              label="Input Operand"
              operand={data.input}
              onChange={(op) => updateNodeData(id, { input: op })}
              availableKeys={availableKeys}
            />

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Operation</label>
              <select
                value={data.operation || 'toString'}
                onChange={(e) => updateNodeData(id, { operation: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="toString">toString</option>
                <option value="round">round</option>
                <option value="add">add (with param)</option>
                <option value="multiply">multiply (with param)</option>
              </select>
            </div>

            {['add', 'multiply'].includes(data.operation) && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Parameter (Number)</label>
                <input
                  type="number"
                  value={data.param ?? 0}
                  onChange={(e) => updateNodeData(id, { param: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-cyan-300 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Output Key</label>
              <input
                type="text"
                value={data.outputKey || ''}
                onChange={(e) => updateNodeData(id, { outputKey: e.target.value })}
                placeholder="e.g. transformedKey"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-emerald-400 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Delay Node Form */}
        {type === 'delay' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="uppercase tracking-wider">Delay (ms)</span>
                <span className="text-amber-300 font-mono">{data.ms || 0} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={data.ms ?? 1000}
                onChange={(e) => updateNodeData(id, { ms: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <input
                type="number"
                min="0"
                max="5000"
                value={data.ms ?? 1000}
                onChange={(e) => updateNodeData(id, { ms: Math.min(5000, Math.max(0, Number(e.target.value))) })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 font-mono focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">Hard maximum 5000 ms per contract.</p>
            </div>
          </div>
        )}

        {/* Output Node Form */}
        {type === 'output' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payload Fields</label>
              <button
                type="button"
                onClick={() => {
                  const fields = data.fields || [];
                  updateNodeData(id, {
                    fields: [
                      ...fields,
                      { key: `field_${fields.length + 1}`, value: { source: 'literal', value: 'example' } },
                    ],
                  });
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3 h-3" /> Add Field
              </button>
            </div>

            <div className="space-y-3">
              {(data.fields || []).map((f, index) => (
                <div key={index} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={f.key}
                      onChange={(e) => {
                        const fields = [...data.fields];
                        fields[index].key = e.target.value;
                        updateNodeData(id, { fields });
                      }}
                      className="px-2 py-1 bg-slate-900 border border-slate-700/60 rounded text-xs text-emerald-300 font-mono flex-1 focus:outline-none"
                      placeholder="Field name"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const fields = data.fields.filter((_, i) => i !== index);
                        updateNodeData(id, { fields });
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <OperandEditor
                    label="Value Mapping"
                    operand={f.value}
                    onChange={(op) => {
                      const fields = [...data.fields];
                      fields[index].value = op;
                      updateNodeData(id, { fields });
                    }}
                    availableKeys={availableKeys}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
