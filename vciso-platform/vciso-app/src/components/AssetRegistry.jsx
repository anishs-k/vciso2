import React, { useState, useEffect } from 'react';
import { th } from '../theme';

const EMPTY_FORM = {
  name: '', email: '', phone: '', department: '', role: '',
  host: '', ip_address: '', dns_name: '', facing: 'internal',
};

export default function AssetRegistry({ activeClient }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // asset object or null
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [search, setSearch] = useState('');

  const fetchAssets = () => {
    if (!activeClient) return;
    setLoading(true);
    fetch(`/api/assets?client_id=${activeClient.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setAssets(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAssets(); }, [activeClient?.id]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (asset) => {
    setEditing(asset);
    setForm({
      name: asset.name || '', email: asset.email || '', phone: asset.phone || '',
      department: asset.department || '', role: asset.role || '',
      host: asset.host || '', ip_address: asset.ip_address || '',
      dns_name: asset.dns_name || '', facing: asset.facing || 'internal',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const body = { ...form, client_id: activeClient.id };
    const url = editing ? `/api/assets/${editing.id}` : '/api/assets';
    const method = editing ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      setShowModal(false);
      fetchAssets();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      fetchAssets();
    } catch {
      alert('Failed to delete asset. Please try again.');
    }
  };

  const displayed = assets.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ['name', 'email', 'department', 'role', 'host', 'ip_address', 'dns_name'].some(f =>
      (a[f] || '').toLowerCase().includes(q)
    );
  });

  if (!activeClient) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🗂️</div>
          <div className="text-gray-900 font-semibold text-lg mb-2">No Client Selected</div>
          <div className="text-gray-500 text-sm">Please select a client from the Clients tab first.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset & Employee Registry</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeClient.name} · {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets…"
            className="text-sm px-3 py-1.5 text-slate-300 w-56"
            style={{ background: '#1f2937', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
          />
          <button
            onClick={openAdd}
            className="bg-violet-100 hover:bg-blue-500 text-gray-900 text-sm font-medium px-4 py-2 transition"
          >
            + Add Asset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden" style={{ background: '#1f2937', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}>
                {['Name', 'Department', 'Role', 'Email', 'Phone', 'Host', 'IP Address', 'DNS Name', 'Facing', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-10">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-10">No assets found</td></tr>
              ) : displayed.map(a => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 flex items-center justify-center text-xs font-bold text-gray-900 flex-shrink-0"
                        style={{ background: '#1d4ed8' }}>
                        {(a.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-gray-900 font-medium whitespace-nowrap">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{a.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{a.role || '—'}</td>
                  <td className="px-4 py-3 text-violet-500 text-xs">
                    {a.email ? <a href={`mailto:${a.email}`} className="hover:underline">{a.email}</a> : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{a.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{a.host || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.ip_address || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.dns_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 ${
                      a.facing === 'external'
                        ? 'bg-orange-900/60 text-orange-300 border border-orange-700'
                        : 'bg-green-900/40 text-green-400 border border-green-800'
                    }`}>
                      {a.facing || 'internal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 transition text-gray-500 hover:text-gray-900 hover:bg-slate-700"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 transition text-gray-500 hover:text-red-400 hover:bg-red-900/30"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="px-4 py-2 text-gray-400 text-xs" style={{ borderTop: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}>
            {displayed.length} asset{displayed.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="rounded w-full max-w-xl max-h-[90vh] overflow-y-auto"
            style={{ background: '#1f2937', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
              style={{ background: '#1f2937', borderBottom: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}>
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Asset' : 'Add Asset'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              {saveError && (
                <div className="px-3 py-2 text-sm text-red-400 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  ⚠ {saveError}
                </div>
              )}
              {/* Identity */}
              <div>
                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Identity</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="Rahul Sharma" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Role</label>
                    <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="Sr. Engineer" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Department</label>
                    <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="Infrastructure" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="rahul@company.com" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="+91-98765-43210" />
                  </div>
                </div>
              </div>

              {/* Infrastructure */}
              <div>
                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Infrastructure</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Host</label>
                    <input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900 font-mono"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="web-server-01" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">IP Address</label>
                    <input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900 font-mono"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="192.168.1.10" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">DNS Name</label>
                    <input value={form.dns_name} onChange={e => setForm(f => ({ ...f, dns_name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900 font-mono"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}
                      placeholder="web01.internal.com" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Facing</label>
                    <select value={form.facing} onChange={e => setForm(f => ({ ...f, facing: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-900"
                      style={{ background: '#111827', border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}>
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1 pb-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm text-gray-500 transition hover:text-gray-900"
                  style={{ border: `1px solid ${th('#374151', { dark: '#CBD5E1' })}` }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 text-sm font-medium text-gray-900 bg-violet-100 hover:bg-blue-500 transition disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
