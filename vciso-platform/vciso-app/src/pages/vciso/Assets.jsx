import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../AuthContext';

const ASSET_TYPES = ['IP', 'Hostname', 'Domain', 'URL', 'Server', 'Database', 'Cloud Resource', 'Other'];

export default function Assets() {
  const { getToken } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form state
  const [form, setForm] = useState({ asset_type: 'IP', value: '', internet_facing: false, tags: '' });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');

  // Inline edit state: { id, field, value }
  const [editCell, setEditCell] = useState(null);

  const token = getToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchAssets = useCallback(() => {
    setLoading(true);
    fetch('/api/vciso/assets', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(rows => { setAssets(rows); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [token]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleAdd = async () => {
    if (!form.value.trim()) { setFormError('Value is required'); return; }
    setAdding(true); setFormError('');
    try {
      const r = await fetch('/api/vciso/assets', {
        method: 'POST', headers,
        body: JSON.stringify({ ...form, tags: form.tags }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || r.statusText); }
      setForm({ asset_type: 'IP', value: '', internet_facing: false, tags: '' });
      fetchAssets();
    } catch (e) { setFormError(e.message); }
    setAdding(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    await fetch(`/api/vciso/assets/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchAssets();
  };

  const startEdit = (id, field, value) => setEditCell({ id, field, value });

  const commitEdit = async () => {
    if (!editCell) return;
    const { id, field, value } = editCell;
    setEditCell(null);
    await fetch(`/api/vciso/assets/${id}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ [field]: value }),
    });
    fetchAssets();
  };

  const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-6 space-y-6 font-sans bg-slate-50 min-h-full text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track IPs, hostnames, domains, and cloud infrastructure</p>
        </div>
        <div className="text-xs px-3.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
          {assets.length} assets
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Add New Asset
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Type</label>
            <select
              value={form.asset_type}
              onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}
              className="rounded-xl px-3 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
              style={{ minWidth: 140 }}>
              {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Value / Name</label>
            <input
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. 192.168.1.1 or api.example.com"
              className="rounded-xl px-3.5 py-2 text-xs bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Tags (comma separated)</label>
            <input
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. prod, web, dmz"
              className="rounded-xl px-3.5 py-2 text-xs bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Internet Facing</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer bg-slate-50 border border-slate-200">
              <input type="checkbox" checked={form.internet_facing}
                onChange={e => setForm(f => ({ ...f, internet_facing: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-xs font-semibold text-slate-700">Yes</span>
            </label>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-5 py-2 rounded-xl text-xs font-bold transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50">
            {adding ? 'Adding…' : '+ Add Asset'}
          </button>
        </div>
        {formError && <div className="text-xs font-semibold mt-3 text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-xl">{formError}</div>}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-center font-semibold text-red-600 bg-red-50">{error}</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-2">🖥️</div>
            <div className="text-sm font-bold text-slate-900">No assets yet</div>
            <div className="text-xs mt-1 text-slate-500">Add your first asset using the form above</div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {['Type', 'Value / Name', 'Internet Facing', 'Tags', 'Added Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition border-b border-slate-100 text-slate-900">
                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {a.asset_type}
                    </span>
                  </td>
                  {/* Value */}
                  <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">
                    {editCell?.id === a.id && editCell.field === 'value' ? (
                      <input
                        autoFocus
                        value={editCell.value}
                        onChange={e => setEditCell(ec => ({ ...ec, value: e.target.value }))}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                        className="rounded-lg px-2 py-1 text-xs w-full bg-white border border-blue-500 text-slate-900 outline-none shadow-sm"
                      />
                    ) : (
                      <span className="cursor-pointer hover:text-blue-600 transition"
                        title="Click to edit"
                        onClick={() => startEdit(a.id, 'value', a.value)}>
                        {a.value}
                      </span>
                    )}
                  </td>
                  {/* Internet Facing */}
                  <td className="px-4 py-3.5">
                    {a.internet_facing ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        Yes
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        No
                      </span>
                    )}
                  </td>
                  {/* Tags */}
                  <td className="px-4 py-3.5 text-slate-600">
                    {editCell?.id === a.id && editCell.field === 'tags' ? (
                      <input
                        autoFocus
                        value={editCell.value}
                        onChange={e => setEditCell(ec => ({ ...ec, value: e.target.value }))}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                        className="rounded-lg px-2 py-1 text-xs w-full bg-white border border-blue-500 text-slate-900 outline-none shadow-sm"
                      />
                    ) : (
                      <span className="cursor-pointer hover:text-blue-600 transition"
                        title="Click to edit tags"
                        onClick={() => startEdit(a.id, 'tags', a.tags || '')}>
                        {a.tags
                          ? a.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                            <span key={t} className="inline-block mr-1 mb-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {t}
                            </span>
                          ))
                          : <span className="italic text-slate-400">—</span>
                        }
                      </span>
                    )}
                  </td>
                  {/* Added Date */}
                  <td className="px-4 py-3.5 text-slate-500 font-medium">
                    {fmt(a.created_at)}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-xl transition bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
