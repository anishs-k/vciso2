import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { useAdminData } from '../../contexts/AdminDataContext';
import { th } from '../../theme';

const TYPE_CONFIG = {
  internal: { color: th('#2563EB', { dark: '#60A5FA' }), badgeCls: 'bg-blue-50 text-blue-700 border-blue-200' },
  external: { color: '#0284C7', badgeCls: 'bg-sky-50 text-sky-700 border-sky-200' },
  partner:  { color: '#7C3AED', badgeCls: 'bg-purple-50 text-purple-700 border-purple-200' },
  vciso:    { color: '#D97706', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
  director: { color: '#059669', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Badge({ label, type }) {
  const cfg = TYPE_CONFIG[type] || { badgeCls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wider capitalize whitespace-nowrap ${cfg.badgeCls}`}>
      {label}
    </span>
  );
}

function KCard({ icon, label, value, color }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
      style={{ borderLeft: color ? `4px solid ${color}` : undefined }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    </div>
  );
}

function MiniSection({ title, icon, items, emptyMsg }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <span className="text-slate-500 text-xs font-medium">{items.length} employee{items.length !== 1 ? 's' : ''}</span>
      </div>
      {items.length === 0
        ? <div className="p-6 text-center text-slate-400 text-xs font-medium">{emptyMsg}</div>
        : (
          <div className="divide-y divide-slate-100">
            {items.map((e, i) => {
              const cfg = TYPE_CONFIG[e.emp_type] || { color: th('#64748B', { dark: '#94A3B8' }) };
              return (
                <div key={e.id || i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/70 transition">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {(e.name || e.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-slate-900 text-xs font-bold">{e.name || e.email}</div>
                      {e.name && <div className="text-slate-500 text-[11px]">{e.email}</div>}
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    {e.company && <span className="text-slate-500 text-xs font-medium">{e.company}</span>}
                    <Badge label={e.emp_type || 'unknown'} type={e.emp_type} />
                    {e.created_at && <span className="text-slate-400 text-[11px]">{fmtDate(e.created_at)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

export default function AdminEmployees() {
  const { getToken } = useAuth();
  const { userCounts, allClients, engineData } = useAdminData();
  const [empData, setEmpData]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage]           = useState(0);
  const PER_PAGE = 12;

  useEffect(() => {
    fetch('/api/admin-portal/employees', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setEmpData)
      .catch(() => setEmpData(null))
      .finally(() => setLoading(false));
  }, [getToken]);

  // Use userCounts.totals when available, fall back to engine summary
  const s        = engineData?.summary || {};
  const totals   = userCounts?.totals  || {};
  const totalUsers = totals.total     ?? s.totalUsers    ?? 0;
  const internal   = totals.internal  ?? s.internalUsers ?? 0;
  const external   = totals.external  ?? s.externalUsers ?? 0;
  const partner    = totals.partner   ?? s.partnerUsers  ?? 0;
  const vciso      = totals.vciso     ?? s.vcisoUsers    ?? 0;
  const directors  = totals.directors ?? s.directors     ?? 0;

  // Build employee list
  const engineEmps = engineData?.clients?.flatMap(c =>
    (c.empList || []).map(e => ({ ...e, company: c.companyName || c.name }))
  ) || [];
  const allEmps       = empData?.all           || engineEmps;
  const recentlyAdded = empData?.recentlyAdded || [];
  const pendingInv    = empData?.pendingInvites || [];
  const inactive      = empData?.inactive       || [];

  const kpis = [
    { icon: '👥', label: 'Total Users', value: totalUsers, color: th('#2563EB', { dark: '#60A5FA' }) },
    { icon: '🏢', label: 'Internal',    value: internal,   color: '#7C3AED' },
    { icon: '🌐', label: 'External',    value: external,   color: '#0284C7' },
    { icon: '🤝', label: 'Partner',     value: partner,    color: '#F97316' },
    { icon: '🛡️', label: 'vCISO',      value: vciso,      color: '#D97706' },
    { icon: '👔', label: 'Directors',   value: directors,  color: '#059669' },
  ];

  const filtered = allEmps.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (e.name  || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.emp_type || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || e.emp_type === typeFilter;
    return matchSearch && matchType;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  if (loading) return (
    <div className="flex justify-center items-center h-52">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="font-sans text-slate-900 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">Directory of employees, licensing tiers, and client assignment.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => <KCard key={k.label} {...k} />)}
      </div>

      {/* Per-client breakdown */}
      {allClients.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 font-bold text-sm text-slate-900 bg-slate-50/50">
            📊 Users by Client
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Client</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Internal</th>
                  <th className="px-4 py-3 text-center">External</th>
                  <th className="px-4 py-3 text-center">Partner</th>
                  <th className="px-4 py-3 text-center">vCISO</th>
                  <th className="px-4 py-3 text-center">Directors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allClients.map((c) => {
                  const row = userCounts?.perClient?.find(r => r.id === c.id);
                  const cu  = c.users || {};
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="text-slate-900 font-bold text-xs">{c.companyName || c.name}</div>
                        <div className="text-slate-400 text-[11px]">{c.industry || '—'}</div>
                      </td>
                      {[
                        row?.total     ?? cu.total     ?? 0,
                        row?.internal  ?? cu.internal  ?? 0,
                        row?.external  ?? cu.external  ?? 0,
                        row?.partner   ?? cu.partner   ?? 0,
                        row?.vciso     ?? cu.vciso     ?? 0,
                        row?.directors ?? cu.directors ?? 0,
                      ].map((v, j) => (
                        <td key={j} className={`px-4 py-3.5 text-center text-xs ${v > 0 ? 'font-bold text-slate-900' : 'text-slate-400 font-medium'}`}>{v}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Full employee table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3 bg-slate-50/50">
          <span className="font-bold text-sm text-slate-900">👥 All Employees</span>
          <div className="flex gap-2.5 items-center">
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
              className="bg-white border border-slate-300 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">All Types</option>
              <option value="internal">Internal</option>
              <option value="external">External</option>
              <option value="partner">Partner</option>
              <option value="vciso">vCISO</option>
              <option value="director">Director</option>
            </select>
            <input
              type="text" placeholder="Search name, email, type..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">User Type</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-medium">
                    {allEmps.length === 0 ? 'No employee records found.' : 'No employees match the filter.'}
                  </td>
                </tr>
              ) : (
                paginated.map((e, i) => (
                  <tr key={e.id || i} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {(e.name || e.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-900 text-xs font-bold">{e.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs font-medium">{e.email || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs capitalize font-medium">{e.emp_type || '—'}</td>
                    <td className="px-5 py-3.5"><Badge label={e.emp_type || 'unknown'} type={e.emp_type} /></td>
                    <td className="px-5 py-3.5"><span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-slate-500 text-xs font-medium">
              {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Three sections */}
      <div className="space-y-4">
        <MiniSection title="Recently Added"      icon="🆕" items={recentlyAdded} emptyMsg="No new employees in the last 30 days." />
        <MiniSection title="Pending Invitations" icon="✉️" items={pendingInv}    emptyMsg="No pending invitations." />
        <MiniSection title="Inactive Employees"  icon="💤" items={inactive}      emptyMsg="No inactive employees." />
      </div>
    </div>
  );
}
