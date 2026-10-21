import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { FRAMEWORK_CATALOG } from './frameworkCatalog';
import { C, STATUS_CONFIG, STATUSES, ISO_CONTROL_GUIDANCE } from './AuditConstants';
import { th } from '../../theme';

// Custom sleek toggle switch component
function ToggleSwitch({ enabled, onChange, label, badgeText, disabled = false }) {
  return (
    <div 
      onClick={() => !disabled && onChange(!enabled)} 
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all select-none bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
      style={{ borderColor: enabled ? '#059669' : th('#E2E8F0', { dark: '#334155' }) }}
    >
      <div className="flex items-center gap-3">
        <div className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
            {label}
            {badgeText && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {badgeText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ControlDetailView() {
  const { frameworkSlug, controlId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const token = getToken();
  const fw = FRAMEWORK_CATALOG?.[frameworkSlug];

  const [controlStatus, setControlStatus] = useState({});
  const [controlInputs, setControlInputs] = useState({});
  const [evidence, setEvidence] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  
  const fileInputRef = useRef();
  const activeRequirementRef = useRef(null);

  // Find the control metadata from the framework catalog
  const domain = fw?.domains?.find(d => d.controls.some(c => c.id === controlId));
  const ctrl = domain?.controls.find(c => c.id === controlId);
  const guidance = ISO_CONTROL_GUIDANCE?.[controlId];

  // Identify if Annex A control (A.5 through A.8) vs Clause 4-10
  const isAnnexAControl = controlId?.startsWith('A.') || controlId?.startsWith('A5') || controlId?.startsWith('A6') || controlId?.startsWith('A7') || controlId?.startsWith('A8') || !guidance?.mandatory;

  const loadData = useCallback(async () => {
    if (!frameworkSlug || !controlId) return;
    setLoading(true);
    try {
      const [res, evRes] = await Promise.all([
        fetch(`/api/vciso/audit/${encodeURIComponent(frameworkSlug)}/controls`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        fetch(`/api/vciso/control-evidence?framework_id=${encodeURIComponent(frameworkSlug)}&control_id=${encodeURIComponent(controlId)}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        })
      ]);
      
      const rows = await res.json();
      const controlData = (Array.isArray(rows) ? rows : []).find(r => r.control_id === controlId) || {};
      
      const evRows = await evRes.json();
      
      setControlStatus(controlData);
      setEvidence(Array.isArray(evRows) ? evRows : []);
      
      if (controlData.inputs_json) {
        try {
          setControlInputs(JSON.parse(controlData.inputs_json));
        } catch (err) {
          setControlInputs({});
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [frameworkSlug, controlId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateControlField = async (fieldOrPatch, value) => {
    setSaving(true);
    const patch = typeof fieldOrPatch === 'string' ? { [fieldOrPatch]: value } : fieldOrPatch;
    const updated = { ...controlStatus, ...patch };
    setControlStatus(updated);
    
    try {
      await fetch(`/api/vciso/audit/${encodeURIComponent(frameworkSlug)}/controls/${encodeURIComponent(controlId)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: updated.status || 'not_assessed', 
          notes: updated.notes || '', 
          assignee: updated.control_owner || updated.assignee || '', 
          target_date: updated.target_date || '',
          mandatory: updated.mandatory || (isAnnexAControl ? 'N' : 'Y'),
          applicable: updated.applicable || (isAnnexAControl ? 'N' : 'Y'),
          justification: updated.justification || '',
          implementation_status: updated.implementation_status || updated.status || 'Not Assessed',
          keyword: updated.keyword || '',
          objective_evidence: updated.objective_evidence || '',
          control_owner: updated.control_owner || updated.assignee || '',
          review_frequency: updated.review_frequency || 'Annual',
          remarks: updated.remarks || updated.notes || '',
          active: updated.active || 'Y',
          effective_date_from: updated.effective_date_from || '',
          effective_date_to: updated.effective_date_to || '',
          inputs_json: JSON.stringify(controlInputs)
        }),
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const saveInputs = async (inputs) => {
    setSaving(true);
    setControlInputs(inputs);
    const inputsStr = JSON.stringify(inputs);
    const updated = { ...controlStatus, inputs_json: inputsStr };
    setControlStatus(updated);
    
    try {
      await fetch(`/api/vciso/audit/${encodeURIComponent(frameworkSlug)}/controls/${encodeURIComponent(controlId)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: updated.status || 'not_assessed', 
          notes: updated.notes || '', 
          assignee: updated.control_owner || updated.assignee || '', 
          target_date: updated.target_date || '',
          mandatory: updated.mandatory || (isAnnexAControl ? 'N' : 'Y'),
          applicable: updated.applicable || 'Y',
          justification: updated.justification || '',
          implementation_status: updated.implementation_status || updated.status || 'Not Assessed',
          keyword: updated.keyword || '',
          objective_evidence: updated.objective_evidence || '',
          control_owner: updated.control_owner || updated.assignee || '',
          review_frequency: updated.review_frequency || 'Annual',
          remarks: updated.remarks || updated.notes || '',
          active: updated.active || 'Y',
          effective_date_from: updated.effective_date_from || '',
          effective_date_to: updated.effective_date_to || '',
          inputs_json: inputsStr
        }),
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const [uploadStatus, setUploadStatus] = useState('');

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    setUploadStatus('Uploading...');
    
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    fd.append('framework_id', frameworkSlug);
    fd.append('control_id', controlId);
    if (activeRequirementRef.current) {
      fd.append('requirement_name', activeRequirementRef.current);
    }

    try {
      const res = await fetch('/api/vciso/control-evidence', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (res.ok) {
        setUploadStatus('Upload successful!');
        const evRes = await fetch(`/api/vciso/control-evidence?framework_id=${encodeURIComponent(frameworkSlug)}&control_id=${encodeURIComponent(controlId)}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const evRows = await evRes.json();
        setEvidence(Array.isArray(evRows) ? evRows : []);
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setUploadStatus(`Upload failed: ${errorData.error || res.statusText}`);
      }
    } catch (error) {
      console.error('Upload failed', error);
      setUploadStatus(`Error: ${error.message}`);
    }
    setUploading(false);
    e.target.value = ''; // reset input
    activeRequirementRef.current = null;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this attached file?")) return;
    try {
      const res = await fetch(`/api/vciso/control-evidence/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setEvidence(prev => prev.filter(ev => ev.id !== id));
      } else {
        alert("Failed to delete file");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting file");
    }
  };

  if (!fw || !ctrl) return (
    <div className="flex items-center justify-center h-full bg-slate-50">
      <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-4xl mb-3">📋</div>
        <div className="text-slate-900 font-bold">Control not found</div>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
          ← Back
        </button>
      </div>
    </div>
  );

  const status = controlStatus.status || 'not_assessed';
  const isApplicable = (controlStatus.applicable !== 'N');
  const isActive = (controlStatus.active !== 'N');

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Hidden File Input restricted to PDF, Word, Excel */}
      <input 
        ref={fileInputRef} 
        type="file" 
        multiple 
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        className="hidden" 
        onChange={handleUpload} 
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} 
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{fw.name} • {domain?.name}</span>
              {isAnnexAControl ? (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                  Annex A Control (Non-Mandatory)
                </span>
              ) : (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                  Mandatory ISMS Clause
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-3">
              <span>{ctrl.id} - {ctrl.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {saving && <div className="text-xs font-semibold text-blue-600 animate-pulse flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"/> Saving changes...</div>}
          
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase px-2 text-slate-500">Audit Assessment:</span>
            <select value={status} onChange={e => updateControlField('status', e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer transition-colors bg-white border border-slate-200 text-slate-800 shadow-sm">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Single Vertical Workflow Container */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8 pb-12">

          {/* SECTION 1: CONTROL SCOPE & DESCRIPTION */}
          <div className="rounded-2xl p-6 relative overflow-hidden transition-all bg-white border border-slate-200 shadow-sm">
            
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Control Statement & Description</div>
              <p className="text-base text-slate-800 font-medium leading-relaxed">{ctrl.desc}</p>
            </div>

            {/* Justification Box */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-700">
                Statement of Applicability (SoA) Justification <span className="text-slate-500 font-normal">(Required for Audit Compliance)</span>
              </label>
              <textarea 
                value={controlStatus.justification || ''} 
                onChange={e => updateControlField({ justification: e.target.value })}
                rows={3} 
                placeholder={isApplicable ? "State why this control is mandated and how it mitigates security risks..." : "State justification for exclusion (e.g. no cloud infrastructure used, out of organizational scope)..."}
                className="w-full text-xs p-3.5 rounded-xl outline-none resize-none transition-all bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
              />
            </div>
          </div>

          {/* SECTION 2: IMPLEMENTATION GUIDANCE & REQUIRED DOCUMENTS */}
          {guidance && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="text-lg">📘</span>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Implementation Guidance & Required Documentation</h3>
              </div>

              {/* Guidance Explanation Box */}
              <div className="rounded-xl p-5 bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2">How To Implement This Control</div>
                <div className="text-sm leading-relaxed text-slate-700">{guidance.guidance}</div>
              </div>

              {/* Document Lists Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Required Documents */}
                <div className="rounded-xl p-5 flex flex-col justify-between bg-slate-50 border border-slate-200">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span>📄</span> REQUIRED DOCUMENTS
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">PDF, WORD, EXCEL</span>
                    </div>
                    <ul className="space-y-3">
                      {guidance.docs.map((d, i) => (
                        <li key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <span className="text-slate-800 font-medium truncate pr-2">{d}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setPreviewDoc(d)}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                              Example
                            </button>
                            <button onClick={() => { activeRequirementRef.current = d; fileInputRef.current.click(); }} disabled={uploading}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                              Attach
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Common Supporting Documents */}
                <div className="rounded-xl p-5 flex flex-col justify-between bg-slate-50 border border-slate-200">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span>✓</span> COMMON SUPPORTING DOCUMENTS
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">PDF, WORD, EXCEL</span>
                    </div>
                    <ul className="space-y-3">
                      {guidance.evidence.map((e, i) => (
                        <li key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <span className="text-slate-800 font-medium truncate pr-2">{e}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setPreviewDoc(e)}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                              Example
                            </button>
                            <button onClick={() => { activeRequirementRef.current = e; fileInputRef.current.click(); }} disabled={uploading}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50">
                              Attach
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

              {/* Upload Feedback */}
              {uploadStatus && (
                <div className={`text-xs font-bold p-3 rounded-xl text-center border ${uploadStatus.includes('failed') || uploadStatus.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {uploadStatus}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: CONTROL GOVERNANCE & METADATA */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-lg">⚙️</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Control Governance & Audit Parameters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Implementation Status */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Implementation Status</label>
                <select 
                  value={controlStatus.implementation_status || 'Not Assessed'} 
                  onChange={e => updateControlField({ implementation_status: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm">
                  <option value="Not Assessed">Not Assessed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Implemented">Implemented</option>
                  <option value="Not Implemented">Not Implemented</option>
                  <option value="Exception">Exception</option>
                </select>
              </div>

              {/* Control Owner */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Control Owner / Assignee</label>
                <input 
                  type="text" 
                  placeholder="e.g. CISO / IT Security Lead"
                  value={controlStatus.control_owner || controlStatus.assignee || ''}
                  onChange={e => updateControlField({ control_owner: e.target.value, assignee: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm" 
                />
              </div>

              {/* Review Frequency */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Review Frequency</label>
                <select 
                  value={controlStatus.review_frequency || 'Annual'} 
                  onChange={e => updateControlField({ review_frequency: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm">
                  <option value="Annual">Annual</option>
                  <option value="Semi-Annual">Semi-Annual</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Continuous">Continuous</option>
                </select>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Active Toggle */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Active State</label>
                <ToggleSwitch 
                  enabled={isActive} 
                  onChange={val => updateControlField({ active: val ? 'Y' : 'N' })} 
                  label={isActive ? "Active Control" : "Inactive Control"}
                  badgeText={isActive ? "ACTIVE" : "INACTIVE"}
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Keywords / Tags</label>
                <input 
                  type="text" 
                  placeholder="e.g. Access control, Passwords, MFA"
                  value={controlStatus.keyword || ''}
                  onChange={e => updateControlField({ keyword: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm" 
                />
              </div>

              {/* Effective Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Effective From</label>
                  <input 
                    type="date" 
                    value={controlStatus.effective_date_from || ''}
                    onChange={e => updateControlField({ effective_date_from: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 transition shadow-sm" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Effective To</label>
                  <input 
                    type="date" 
                    value={controlStatus.effective_date_to || ''}
                    onChange={e => updateControlField({ effective_date_to: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 transition shadow-sm" 
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Objective Evidence Summary</label>
                <textarea 
                  value={controlStatus.objective_evidence || ''} 
                  onChange={e => updateControlField({ objective_evidence: e.target.value })}
                  rows={3} 
                  placeholder="Notes on objective evidence verified during assessment..."
                  className="w-full text-xs p-3 rounded-xl outline-none resize-none bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition shadow-sm" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-600">Audit Remarks & Assessment Notes</label>
                <textarea 
                  value={controlStatus.notes || controlStatus.remarks || ''} 
                  onChange={e => updateControlField({ notes: e.target.value, remarks: e.target.value })}
                  rows={3} 
                  placeholder="Add audit notes, findings, or auditor observations..."
                  className="w-full text-xs p-3 rounded-xl outline-none resize-none bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition shadow-sm" 
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: ATTACHED EVIDENCE & AUDIT FOOTER */}
          {evidence.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="text-lg">📎</span>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Attached Evidence Files</h3>
              </div>

              <div className="space-y-4">
                {Object.entries(
                  evidence.reduce((acc, ev) => {
                    const req = ev.requirement_name || 'General Uploads';
                    if (!acc[req]) acc[req] = [];
                    acc[req].push(ev);
                    return acc;
                  }, {})
                ).map(([reqName, files], idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-[11px] font-bold uppercase text-blue-600 tracking-wider">{reqName}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {files.map((ev, i) => (
                        <div key={i} className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex items-center gap-3 truncate pr-2">
                            <span className="text-slate-400">📎</span>
                            <span className="truncate font-semibold text-slate-800">{ev.original_name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[10px] text-slate-500 font-medium">{Math.round(ev.size / 1024)} KB</span>
                            <button onClick={() => handleDelete(ev.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Remove file">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Footer Metadata */}
          <div className="rounded-xl p-4 text-xs flex items-center justify-between text-slate-500 bg-slate-50 border border-slate-200">
            <div>Created By: <span className="text-slate-800 font-semibold">{controlStatus.created_by || 'System Admin'}</span></div>
            <div>Last Updated: <span className="text-slate-800 font-semibold">{controlStatus.updated_at ? new Date(controlStatus.updated_at).toLocaleString() : 'Just now'}</span> ({controlStatus.updated_by || 'Current User'})</div>
          </div>

        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="sticky bottom-0 left-0 right-0 z-30 p-4 border-t border-slate-200 bg-white shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
              isApplicable 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {isAnnexAControl ? (isApplicable ? '✓ Currently Mandated' : '✕ Currently Excluded') : '🔒 Mandatory Clause'}
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {isAnnexAControl ? 'Complete details and click Mandate Control & Exit to finalize.' : 'Review details & click Save & Exit Clause.'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {isAnnexAControl && (
              <button
                type="button"
                onClick={async () => {
                  if (controlStatus?.mandated_by_admin) return;
                  await updateControlField({ applicable: 'N', mandatory: 'N' });
                  navigate(-1);
                }}
                disabled={controlStatus?.mandated_by_admin}
                title={controlStatus?.mandated_by_admin ? "This control is mandated by Admin and cannot be excluded." : ""}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                  controlStatus?.mandated_by_admin
                  ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:scale-95 cursor-pointer'
                }`}
              >
                <span>{controlStatus?.mandated_by_admin ? '🔒' : '✕'}</span> {controlStatus?.mandated_by_admin ? 'Admin Mandated' : 'Exclude Control & Exit'}
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                if (isAnnexAControl) {
                  await updateControlField({ applicable: 'Y', mandatory: 'Y' });
                } else {
                  await updateControlField({});
                }
                navigate(-1);
              }}
              className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
            >
              <span>{isAnnexAControl ? 'Mandate Control & Exit' : 'Save & Exit Clause'}</span>
              <span className="text-sm font-bold">➔</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl flex flex-col shadow-2xl bg-white border border-slate-200 text-slate-900" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 p-4 border-b border-slate-200 bg-white flex items-center justify-between z-10">
              <div className="font-bold text-base text-slate-900">Document Format Template</div>
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {/* Modal Body (Paper-like view) */}
            <div className="p-8 font-serif leading-relaxed">
              <div className="text-center mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-2xl font-bold mb-2 text-slate-900">{previewDoc.toUpperCase()}</h1>
                <div className="text-xs font-semibold text-slate-500 tracking-widest uppercase">ABC Company</div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h2 className="text-base font-bold mb-1.5 text-slate-900">1. Document Purpose</h2>
                  <p className="text-slate-700">The purpose of this <strong>{previewDoc}</strong> is to establish the formal guidelines, procedures, and responsibilities for ABC Company to ensure compliance with our security framework and protect organizational assets.</p>
                </div>

                <div>
                  <h2 className="text-base font-bold mb-1.5 text-slate-900">2. Scope & Applicability</h2>
                  <p className="text-slate-700">This document applies to all full-time employees, contractors, consultants, and third-party vendors operating within ABC Company's network, physical premises, or accessing company data.</p>
                </div>

                <div>
                  <h2 className="text-base font-bold mb-1.5 text-slate-900">3. Detailed Policy / Procedure</h2>
                  <ul className="list-disc pl-5 space-y-2 text-slate-700">
                    <li><strong>Standard Requirement:</strong> ABC Company mandates adherence to the strict guidelines outlined by the executive management.</li>
                    <li><strong>Implementation:</strong> [Insert specific technical or administrative controls related to {previewDoc}].</li>
                    <li><strong>Monitoring:</strong> Continuous monitoring will be conducted to ensure compliance.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-base font-bold mb-1.5 text-slate-900">4. Enforcement</h2>
                  <p className="text-slate-700">Violations of this policy may result in disciplinary action up to and including termination of employment or legal action. The Information Security team reserves the right to audit systems for compliance.</p>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-200 flex items-end justify-between">
                  <div className="text-xs text-slate-500">
                    <strong>Version:</strong> 1.0<br/>
                    <strong>Date:</strong> {new Date().toLocaleDateString()}<br/>
                    <strong>Author:</strong> Security & Compliance Team
                  </div>
                  <div className="w-48 text-center">
                    <div className="border-b border-slate-400 mb-1 h-8"></div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Management Approval</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
