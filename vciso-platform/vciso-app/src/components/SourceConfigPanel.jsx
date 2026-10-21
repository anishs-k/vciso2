import React, { useEffect, useRef, useState } from 'react';

// ─── File source configuration (WS3) ──────────────────────────────────────────
// Scanner exports arrive as files in a folder, not over an API. The path is
// typed once in the Path popup and every method then works from that same
// string — Path uses it as given, Search and Metadata work in it (or in the
// folder holding it, when the path points at a file), and Auto chains all three.
// Findings land in the isolated scanner store, not the vCISO tables.

const S = {
  bg: '#070d1f', card: '#0c1528', border: '#162840',
  accent: '#00c2c7', muted: '#8892a4', bad: '#ef4444',
};

const METHODS = [
  { id: 'path',     label: 'Path-Based', hint: 'Use the path exactly as given — a file, or the newest file in a folder' },
  { id: 'search',   label: 'File Search', hint: 'Search that folder and its subfolders by name / pattern / extension' },
  { id: 'metadata', label: 'Metadata',    hint: 'Newest valid file in that folder, judged on size, type and age' },
  { id: 'auto',     label: 'Auto (Fallback Chain)', hint: 'Path → Search → Metadata, in order, all from the same path' },
];

const METHOD_STEP = { path: 'Method 1 (Path)', search: 'Method 2 (Search)', metadata: 'Method 3 (Metadata)' };

const inputStyle = { background: S.bg, border: `1px solid ${S.border}`, color: '#e5e7eb' };

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold" style={{ color: S.muted }}>{label}</span>
      {children}
      {hint && <span className="block text-[11px] mt-1" style={{ color: '#5b6577' }}>{hint}</span>}
    </label>
  );
}

// ─── Path popup ───────────────────────────────────────────────────────────────
// One small dialog, one input. Escape closes it, Enter saves — the path is
// typed often enough that reaching for the mouse each time would grate.
function PathModal({ open, initial, allowedRoot, onSave, onClose }) {
  const [value, setValue] = useState(initial || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setValue(initial || '');
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, initial]);

  if (!open) return null;

  const save = () => onSave(value.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3, 7, 18, 0.75)' }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl p-5" onClick={e => e.stopPropagation()}
        style={{ background: S.card, border: `1px solid ${S.accent}`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h3 className="text-white font-bold text-base">Source path</h3>
        <p className="text-xs mt-1 mb-3" style={{ color: S.muted }}>
          A file or a folder. Every method works from this one path.
        </p>

        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
          placeholder="C:\\Users\\you\\Downloads\\scan.xlsx"
          className="w-full text-sm rounded-lg px-3 py-2 font-mono" style={inputStyle} />

        <div className="text-[11px] mt-2 space-y-0.5" style={{ color: '#5b6577' }}>
          <div>Examples: <span className="font-mono">C:\Users\you\Downloads</span> · <span className="font-mono">C:/scans/incoming/report.csv</span> · <span className="font-mono">incoming/report.csv</span></div>
          {allowedRoot && (
            <div>
              Must sit under <span className="font-mono" style={{ color: S.muted }}>{allowedRoot}</span>
              {' '}— change it with <span className="font-mono">SCANS_BASE_DIR</span> in the backend .env
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose}
            className="text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: S.bg, border: `1px solid ${S.border}`, color: '#cbd5e1' }}>
            Cancel
          </button>
          <button type="button" onClick={save}
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: S.accent }}>
            Use this path
          </button>
        </div>
      </div>
    </div>
  );
}

// "Method 1 (Path): ❌ file nahi mili → Method 2 (Search): ✅ mil gayi (report.csv)"
function AttemptsLog({ attempts }) {
  if (!attempts || attempts.length === 0) return null;
  return (
    <div className="rounded-lg p-3 mt-3 space-y-1.5" style={{ background: S.bg, border: `1px solid ${S.border}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: S.muted }}>Attempts</div>
      {attempts.map((a, i) => (
        <div key={i} className="text-xs flex gap-2">
          <span style={{ color: a.success ? S.accent : S.bad }}>{a.success ? '✅' : '❌'}</span>
          <span className="font-semibold text-slate-200 flex-shrink-0">{METHOD_STEP[a.method] || a.method}:</span>
          <span style={{ color: S.muted }}>
            {a.message}
            {a.filePath && <span className="text-slate-300"> ({a.filePath.split(/[\\/]/).pop()})</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ result }) {
  if (!result) return null;
  const bad = result.error;
  return (
    <div className="rounded-lg p-3 mt-3" style={{ background: S.bg, border: `1px solid ${bad ? S.bad : S.accent}` }}>
      <div className="text-sm font-bold mb-1" style={{ color: bad ? S.bad : S.accent }}>
        {bad ? '✕ ' : '✓ '}{result.headline}
      </div>
      {result.lines.map((line, i) => (
        <div key={i} className="text-xs" style={{ color: S.muted }}>{line}</div>
      ))}
    </div>
  );
}

export default function SourceConfigPanel({ token, clientId }) {
  const [method, setMethod] = useState('auto');
  const [sourcePath, setSourcePath] = useState('');   // the one path, set in the popup
  const [pathOpen, setPathOpen] = useState(false);
  const [pattern, setPattern] = useState('');
  const [extension, setExtension] = useState('');
  const [sourceTool, setSourceTool] = useState('tenable');
  const [moveProcessed, setMoveProcessed] = useState(false);

  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState('');          // 'resolve' | 'ingest' | ''
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(null);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  // The scans root and the adapter list come from the server — the panel never
  // hardcodes a path the backend might not allow.
  useEffect(() => {
    fetch('/api/sources/config', { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(c => {
        if (!c) return;
        setConfig(c);
        setMoveProcessed(!!c.moveProcessedDefault);
        if (c.adapters?.length) setSourceTool(c.adapters[0].name);
      })
      .catch(() => { /* the panel still works, it just shows no root hint */ });
  }, []);

  // The same path goes into both fields: the path method reads inputPath, the
  // search and metadata methods read baseDir and step up to the folder itself
  // when the path names a file.
  const body = () => ({
    sourceType: method,
    inputPath: sourcePath || undefined,
    baseDir: sourcePath || undefined,
    pattern: pattern.trim() || undefined,
    extension: extension || undefined,
  });

  const call = async (endpoint, extra, kind) => {
    setBusy(kind); setResult(null); setAttempts(null);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ ...body(), ...extra }) });
      const data = await res.json().catch(() => ({}));
      setAttempts(data.attempts || null);
      return { res, data };
    } catch (err) {
      setResult({ error: true, headline: 'Request failed', lines: [err.message] });
      return null;
    } finally {
      setBusy('');
    }
  };

  const needsPath = () => {
    if (sourcePath) return false;
    setResult({ error: true, headline: 'No path set', lines: ['Click the Path button and enter a file or folder first.'] });
    setPathOpen(true);
    return true;
  };

  const onResolve = async () => {
    if (needsPath()) return;
    const out = await call('/api/sources/resolve', {}, 'resolve');
    if (!out) return;
    const { res, data } = out;
    if (!res.ok || !data.success) {
      setResult({ error: true, headline: 'No file found', lines: [data.message || data.error || `HTTP ${res.status}`] });
      return;
    }
    setResult({
      headline: `${METHOD_STEP[data.methodUsed] || data.methodUsed} matched`,
      lines: [
        `File: ${data.fileMeta.name}`,
        `Path: ${data.filePath}`,
        `${(data.fileMeta.size / 1024).toFixed(1)} KB · modified ${new Date(data.fileMeta.modifiedAt).toLocaleString()}`,
      ],
    });
  };

  const onIngest = async () => {
    if (needsPath()) return;
    if (!clientId) {
      setResult({ error: true, headline: 'No client selected', lines: ['Findings need a client_id to be stored against.'] });
      return;
    }
    const out = await call('/api/sources/ingest', { source_tool: sourceTool, client_id: clientId, moveProcessed }, 'ingest');
    if (!out) return;
    const { res, data } = out;
    if (!res.ok) {
      setResult({ error: true, headline: 'Ingest failed', lines: [data.error || `HTTP ${res.status}`] });
      return;
    }
    setResult({
      headline: data.message,
      lines: [
        `Method: ${METHOD_STEP[data.methodUsed] || data.methodUsed} · File: ${data.fileProcessed.name} (${data.format})`,
        `Rows parsed: ${data.rowsParsed} · stored: ${data.findingsIngested} (${data.created} new, ${data.updated} updated)`,
        // What landed in the table the Vulnerability Management page reads.
        data.stored
          ? (data.stored.error
              ? `Not saved to vciso_vulnerabilities: ${data.stored.error}`
              : `Saved to vciso_vulnerabilities: ${data.stored.created} new, ${(data.stored.updated || 0) + (data.stored.skipped || 0)} already there`)
          : null,
        data.rejected ? `Rejected by the schema: ${data.rejected}` : 'No rows rejected',
        data.moved?.moved ? `Moved to ${data.moved.to}` : null,
      ].filter(Boolean),
    });
  };

  return (
    <div className="rounded-xl p-5" style={{ background: S.card, border: `1px solid ${S.border}` }}>
      <div className="mb-4">
        <h2 className="text-white font-bold text-base">File Source Configuration</h2>
        <p className="text-xs mt-0.5" style={{ color: S.muted }}>
          Point the ingester at a scanner export on disk. Findings go to the isolated scanner store.
        </p>
      </div>

      {/* The path — set once, used by every method */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: S.bg, border: `1px solid ${sourcePath ? S.accent : S.border}` }}>
        <button type="button" onClick={() => setPathOpen(true)}
          className="text-sm font-semibold px-4 py-2 rounded-lg flex-shrink-0 transition-all"
          style={{ background: 'rgba(0, 194, 199, 0.15)', border: `1px solid ${S.accent}`, color: S.accent }}>
          📁 Path
        </button>
        <div className="min-w-0 flex-1">
          {sourcePath ? (
            <>
              <div className="text-sm text-white font-mono truncate" title={sourcePath}>{sourcePath}</div>
              <div className="text-[11px]" style={{ color: '#5b6577' }}>Used by all four methods</div>
            </>
          ) : (
            <div className="text-sm" style={{ color: S.muted }}>No path set — click Path to enter a file or folder</div>
          )}
        </div>
        {sourcePath && (
          <button type="button" onClick={() => setSourcePath('')}
            className="text-xs flex-shrink-0" style={{ color: S.muted }}>✕ Clear</button>
        )}
      </div>

      {/* Method selector */}
      <div className="flex flex-wrap gap-2 mb-1">
        {METHODS.map(m => {
          const active = method === m.id;
          return (
            <button key={m.id} type="button" onClick={() => setMethod(m.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: active ? 'rgba(0, 194, 199, 0.15)' : S.bg,
                border: `1px solid ${active ? S.accent : S.border}`,
                color: active ? S.accent : '#cbd5e1',
              }}>
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] mb-4" style={{ color: '#5b6577' }}>
        {METHODS.find(m => m.id === method).hint}
      </p>

      {/* Only the non-path settings each method still needs */}
      <div className="space-y-3">
        {(method === 'search' || method === 'auto') && (
          <Field label="Search pattern" hint={method === 'auto'
            ? 'Optional in Auto — leave blank to skip straight from Path to Metadata'
            : 'e.g. *qualys*.csv, scan_*.xlsx, or just .csv'}>
            <input value={pattern} onChange={e => setPattern(e.target.value)}
              placeholder="*qualys*.csv"
              className="w-full text-sm rounded-lg px-3 py-1.5 mt-1" style={inputStyle} />
          </Field>
        )}

        {(method === 'metadata' || method === 'auto') && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Field label="Extension (optional)" hint={method === 'auto'
                ? 'Narrows the Metadata step of the chain — pick .xlsx when the folder also holds files you do not want'
                : undefined}>
                <select value={extension} onChange={e => setExtension(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-1.5 mt-1" style={inputStyle}>
                  <option value="">Any supported</option>
                  {(config?.supportedExtensions || ['.csv', '.xlsx', '.xml', '.json']).map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <span className="text-xs pb-2" style={{ color: S.muted }}>Newest first — always on</span>
          </div>
        )}
      </div>

      {/* Ingest-only settings */}
      <div className="flex flex-wrap items-end gap-4 mt-4 pt-4" style={{ borderTop: `1px solid ${S.border}` }}>
        <div className="w-40">
          <Field label="Scanner">
            <select value={sourceTool} onChange={e => setSourceTool(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-1.5 mt-1" style={inputStyle}>
              {(config?.adapters || [{ name: 'tenable', label: 'Tenable' }, { name: 'qualys', label: 'Qualys' }]).map(a => (
                <option key={a.name} value={a.name}>{a.label || a.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs pb-2" style={{ color: S.muted }}>
          <input type="checkbox" checked={moveProcessed} onChange={e => setMoveProcessed(e.target.checked)} />
          Move file to processed/ after ingest
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <button type="button" onClick={onResolve} disabled={!!busy}
          className="text-sm font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          style={{ background: S.bg, border: `1px solid ${S.accent}`, color: S.accent }}>
          {busy === 'resolve' ? 'Resolving…' : 'Resolve / Test'}
        </button>
        <button type="button" onClick={onIngest} disabled={!!busy}
          className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50"
          style={{ background: S.accent }}>
          {busy === 'ingest' ? 'Ingesting…' : 'Ingest Now'}
        </button>
      </div>

      <ResultCard result={result} />
      <AttemptsLog attempts={attempts} />

      <PathModal
        open={pathOpen}
        initial={sourcePath}
        allowedRoot={config?.baseDir}
        onSave={(v) => { setSourcePath(v); setPathOpen(false); }}
        onClose={() => setPathOpen(false)}
      />
    </div>
  );
}
