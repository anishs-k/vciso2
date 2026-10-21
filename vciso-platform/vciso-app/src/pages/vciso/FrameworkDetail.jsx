import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { ALL_FRAMEWORKS, getControls } from './frameworks.js';
import { getControlDetail } from './controlDetails.js';
import { th } from '../../theme';

const STATUS_OPTIONS = ['not_started', 'in_progress', 'compliant', 'not_applicable'];
const STATUS_STYLE = {
  compliant:      { label: 'Compliant',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_progress:    { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  not_started:    { label: 'Not Started', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  not_applicable: { label: 'N/A',         cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function downloadTemplate(control, fw) {
  const detail = getControlDetail(fw.id, control.id);
  const lines = [
    `SAMPLE TEMPLATE: ${control.id} — ${control.name}`,
    `Framework: ${fw.name}`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    `Prepared by: [vCISO Name]`,
    ``,
    `=== CONTROL DESCRIPTION ===`,
    detail.desc,
    ``,
    `=== IMPLEMENTATION GUIDANCE ===`,
    detail.guidance,
    ``,
    `=== EVIDENCE CHECKLIST ===`,
    ...(detail.evidence || []).map((e, i) => `${i + 1}. [ ] ${e}`),
    ``,
    `=== ASSESSMENT NOTES ===`,
    `Current Status: [Not Started / In Progress / Compliant / N/A]`,
    `Assessment Date: [DD-MM-YYYY]`,
    `Assessor: [Name]`,
    ``,
    `Observations:`,
    `[Describe current state of the control]`,
    ``,
    `Gaps Identified:`,
    `[List any gaps or deficiencies]`,
    ``,
    `Remediation Plan:`,
    `[Steps to achieve compliance]`,
    ``,
    `Target Completion Date: [DD-MM-YYYY]`,
    ``,
    `Evidence References:`,
    `[List documents / files attached as evidence]`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fw.id}_${control.id}_template.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function ControlEvidencePanel({ control, fw, token }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    fetch(`/api/vciso/control-evidence?framework_id=${fw.id}&control_id=${control.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(d => setFiles(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [control.id]);

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);
    const fd = new FormData();
    selected.forEach(f => fd.append('files', f));
    fd.append('framework_id', fw.id);
    fd.append('control_id', control.id);
    try {
      const r = await fetch('/api/vciso/control-evidence', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (d.uploaded) setFiles(prev => [...prev, ...d.uploaded]);
    } catch {}
    setUploading(false);
    inputRef.current.value = '';
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Evidence Files</span>
        <div className="flex gap-2">
          <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
          <button
            onClick={() => inputRef.current.click()}
            disabled={uploading}
            className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Upload Evidence'}
          </button>
        </div>
      </div>
      {files.length === 0 ? (
        <p className="text-[10px] text-slate-400">No evidence uploaded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-blue-600">📎</span>
              <span className="truncate text-slate-800 font-medium">{f.original_name || f.filename}</span>
              <span className="flex-shrink-0 text-slate-400 text-[10px] ml-auto">{f.size ? `${Math.round(f.size / 1024)}KB` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ControlRow({ control, fw, state, onUpdate, saving, token }) {
  const [expanded, setExpanded] = useState(false);
  const detail = getControlDetail(fw.id, control.id);
  const statusInfo = STATUS_STYLE[state.status] || STATUS_STYLE.not_started;

  return (
    <div className="border-b border-slate-100 last:border-none">
      {/* Summary row */}
      <div
        className={`px-5 py-3.5 flex items-center gap-3 cursor-pointer transition-all ${expanded ? 'bg-blue-50/40 border-l-4 border-l-blue-600' : 'bg-white hover:bg-slate-50/80 border-l-4 border-l-transparent'}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status dot + compliant toggle */}
        <button
          onClick={e => { e.stopPropagation(); onUpdate(control.id, 'status', state.status === 'compliant' ? 'not_started' : 'compliant'); }}
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2 ${
            state.status === 'compliant'
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-transparent border-slate-300 hover:border-slate-400'
          }`}
        >
          {state.status === 'compliant' && <span className="text-white text-[10px] font-black">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold font-mono text-blue-600 flex-shrink-0">{control.id}</span>
            <span className="text-xs font-bold text-slate-900">{control.name}</span>
          </div>
        </div>

        {/* Status dropdown */}
        <select
          value={state.status}
          onChange={e => { e.stopPropagation(); onUpdate(control.id, 'status', e.target.value); }}
          onClick={e => e.stopPropagation()}
          className={`text-[10px] font-bold rounded-xl px-3 py-1.5 outline-none flex-shrink-0 cursor-pointer border shadow-sm ${statusInfo.cls}`}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
          ))}
        </select>

        {saving ? <span className="text-[10px] flex-shrink-0 text-slate-400">saving…</span> : null}
        <span className="text-[10px] flex-shrink-0 text-slate-400">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 space-y-3 bg-slate-50 border-t border-slate-100">
          {/* Description */}
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">What this control means</div>
            <p className="text-xs leading-relaxed text-slate-700">{detail.desc}</p>
          </div>

          {/* Guidance */}
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">How to implement</div>
            <p className="text-xs leading-relaxed text-slate-700">{detail.guidance}</p>
          </div>

          {/* Evidence required */}
          {detail.evidence && detail.evidence.length > 0 && (
            <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">Evidence required</div>
              <ul className="space-y-1.5">
                {detail.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <span className="flex-shrink-0 text-amber-600 font-bold">✓</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes field */}
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Assessment Notes</div>
            <textarea
              rows={2}
              value={state.notes || ''}
              onChange={e => onUpdate(control.id, 'notes', e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Add your implementation notes…"
              className="w-full text-xs rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Download template + evidence upload */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={e => { e.stopPropagation(); downloadTemplate(control, fw); }}
              className="text-xs px-4 py-2 rounded-xl font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              ⬇ Download Sample Template
            </button>
          </div>

          <ControlEvidencePanel control={control} fw={fw} token={token} />
        </div>
      )}
    </div>
  );
}

export default function FrameworkDetail() {
  const { category, frameworkId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const token = getToken();

  const fw = ALL_FRAMEWORKS.find(f => f.id === frameworkId);
  const controls = fw ? getControls(frameworkId, fw.controls) : [];

  const [controlStates, setControlStates] = useState({});
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch(`/api/vciso/frameworks/${frameworkId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(data => {
        const map = {};
        (data.controls || []).forEach(c => { map[c.control_id] = { status: c.status, notes: c.notes || '' }; });
        setControlStates(map);
      })
      .catch(() => {});
  }, [frameworkId]);

  const getState = (controlId) => controlStates[controlId] || { status: 'not_started', notes: '' };

  const updateControl = async (controlId, field, value) => {
    const current = getState(controlId);
    const updated = { ...current, [field]: value };
    setControlStates(prev => ({ ...prev, [controlId]: updated }));

    setSaving(s => ({ ...s, [controlId]: true }));
    try {
      await fetch(`/api/vciso/frameworks/${frameworkId}/controls/${controlId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setToast('Saved');
      setTimeout(() => setToast(''), 2000);
    } catch {}
    setSaving(s => ({ ...s, [controlId]: false }));
  };

  if (!fw) return <div className="p-6 text-slate-500 font-medium">Framework not found.</div>;

  const compliantCount = controls.filter(c => getState(c.id).status === 'compliant').length;
  const score = controls.length ? Math.round((compliantCount / controls.length) * 100) : 0;
  const scoreColor = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';

  const filtered = filter === 'all' ? controls : controls.filter(c => getState(c.id).status === filter);
  const filteredGrouped = filtered.reduce((acc, c) => {
    if (!acc[c.domain]) acc[c.domain] = [];
    acc[c.domain].push(c);
    return acc;
  }, {});

  return (
    <div className="p-6 font-sans bg-slate-50 min-h-full text-slate-900 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-lg">
          ✓ {toast}
        </div>
      )}

      <button onClick={() => navigate(-1)} className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition">
        ← Back to frameworks
      </button>

      <div className="flex items-start justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{fw.name}</h1>
          <p className="text-xs mt-1 text-slate-500">{fw.desc} · {fw.controls} controls</p>
        </div>
        <div className="flex flex-col items-center flex-shrink-0 ml-6">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#E2E8F0" strokeWidth="8" />
              <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="8"
                strokeDasharray={`${(score / 100) * 201} 201`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-black text-slate-900">{score}%</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 mt-1">{compliantCount}/{controls.length} compliant</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm w-fit">
        {[['all', 'All'], ['compliant', 'Compliant'], ['in_progress', 'In Progress'], ['not_started', 'Not Started']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filter === val ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Controls by domain */}
      <div className="space-y-4">
        {Object.entries(filteredGrouped).map(([domain, domainControls], idx) => {
          const DOMAIN_ACCENTS = [th('#2563EB', { dark: '#60A5FA' }),'#7C3AED','#0284C7','#059669','#D97706'];
          const acc = DOMAIN_ACCENTS[idx % DOMAIN_ACCENTS.length];
          const domainCompliant = domainControls.filter(c => getState(c.id).status === 'compliant').length;
          const domPct = domainControls.length > 0 ? Math.round((domainCompliant / domainControls.length) * 100) : 0;
          return (
            <div key={domain} className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="px-5 py-3.5 flex items-center justify-between bg-slate-50 border-b border-slate-200" style={{ borderLeft: `4px solid ${acc}` }}>
                <div>
                  <h3 className="text-slate-900 font-bold text-sm">{domain}</h3>
                  <div className="text-[10px] mt-0.5 text-slate-500">{domainControls.length} controls — click any row to expand</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-2 rounded-full overflow-hidden bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${domPct}%`, background: acc }} />
                  </div>
                  <span className="text-xs font-bold font-mono" style={{ color: acc }}>{domPct}%</span>
                </div>
              </div>
              <div>
                {domainControls.map(control => (
                  <ControlRow
                    key={control.id}
                    control={control}
                    fw={fw}
                    state={getState(control.id)}
                    onUpdate={updateControl}
                    saving={saving[control.id]}
                    token={token}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">No controls match the current filter.</div>
        )}
      </div>
    </div>
  );
}
