import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';

const STATUS_STYLES = {
  open:        { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Open' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'In Progress' },
  closed:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Closed' },
};

export default function AuditManagement() {
  const { getToken } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', framework: '', status: 'open' });
  const [saving, setSaving] = useState(false);

  const fetchAudits = () => {
    const token = getToken();
    fetch('/api/vciso/audits', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(d => { setAudits(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAudits(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = getToken();
    await fetch('/api/vciso/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ title: '', framework: '', status: 'open' });
    fetchAudits();
  };

  const activeAudits = audits.filter(a => a.status !== 'closed');
  const totalFindings = audits.reduce((s, a) => s + (a.findings || 0), 0);
  const totalOverdue = audits.reduce((s, a) => s + (a.overdue_cars || 0), 0);

  return (
    <div className="p-6 font-sans bg-slate-50 min-h-full text-slate-900 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage cyber audits, findings, and corrective action reports</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          + New Audit
        </button>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Audits', value: activeAudits.length, color: 'text-amber-600' },
          { label: 'Total Findings', value: totalFindings, color: 'text-red-600' },
          { label: 'Overdue CARs', value: totalOverdue, color: 'text-amber-600' },
          { label: 'Total Audits', value: audits.length, color: 'text-slate-900' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Audit cards */}
      {loading ? (
        <div className="text-slate-400 text-xs py-12 text-center">Loading audits...</div>
      ) : (
        <div className="space-y-3">
          {audits.map(audit => {
            const stat = STATUS_STYLES[audit.status] || STATUS_STYLES.open;
            return (
              <div
                key={audit.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-slate-900 font-bold text-sm">{audit.title}</h3>
                    </div>
                    <div className="text-slate-500 text-xs mb-3">
                      Framework: <span className="text-slate-800 font-semibold">{audit.framework || 'N/A'}</span>
                      {' · '}
                      Created: {new Date(audit.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{audit.findings || 0} findings</span>
                      {(audit.overdue_cars || 0) > 0 && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{audit.overdue_cars} overdue CARs</span>
                      )}
                      {(audit.critical || 0) > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          {audit.critical} critical
                        </span>
                      )}
                      {(audit.major || 0) > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {audit.major} major
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border flex-shrink-0 ${stat.bg} ${stat.text} ${stat.border}`}
                  >
                    {stat.label}
                  </span>
                </div>
              </div>
            );
          })}
          {audits.length === 0 && (
            <div className="text-center text-slate-400 text-xs py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">No audits found</div>
          )}
        </div>
      )}

      {/* New Audit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">New Audit</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Audit Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder="e.g. ISO 27001 Gap Assessment"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Framework</label>
                <input
                  value={form.framework}
                  onChange={e => setForm(f => ({ ...f, framework: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder="e.g. ISO 27001"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
