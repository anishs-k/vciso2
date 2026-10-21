import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtUSD(n) { return n != null && n !== '' && Number(n) > 0 ? `$${Number(n).toLocaleString()}` : '—'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }

function contractStatus(c) {
  const dr = Number(c.days_remaining);
  if (!c.contract_end) return { label: 'No Date',       cls: 'bg-gray-100 text-gray-500' };
  if (dr < 0)          return { label: 'Expired',       cls: 'bg-red-100 text-red-700' };
  if (dr <= 30)        return { label: 'Expiring Soon', cls: 'bg-orange-100 text-orange-700' };
  if (dr <= 90)        return { label: 'Renewing Soon', cls: 'bg-yellow-100 text-yellow-700' };
  return                      { label: 'Active',        cls: 'bg-green-100 text-green-700' };
}

function UtilBar({ used, purchased }) {
  const pct = purchased > 0 ? Math.min(100, Math.round((used / purchased) * 100)) : 0;
  const barCls = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-purple-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${barCls} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{pct}%</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    green:  'bg-green-50  border-green-200  text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red:    'bg-red-50    border-red-200    text-red-800',
    gray:   'bg-gray-50   border-gray-200   text-gray-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.purple}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-0.5 opacity-90">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'companies', icon: '🏢', label: 'My Companies' },
  { id: 'contracts', icon: '📄', label: 'Contracts' },
  { id: 'licenses',  icon: '🔑', label: 'License Usage' },
  { id: 'reports',   icon: '📈', label: 'Reports' },
  { id: 'profile',   icon: '👤', label: 'Profile' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PartnerDashboard() {
  const { logout } = useAuth();
  const [page, setPage]       = useState('dashboard');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/auth/partner/dashboard', { headers })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Failed to load')))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🤝</div>
        <div className="text-gray-400 font-medium">Loading Partner Dashboard…</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-3">⚠️</div>
        <div className="text-red-600 font-semibold mb-2">Could not load dashboard</div>
        <div className="text-sm text-gray-400 mb-4">{error}</div>
        <button onClick={logout} className="text-sm text-gray-400 underline hover:text-gray-600">Sign Out</button>
      </div>
    </div>
  );

  const { partner, companies, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
              {partner.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{partner.name}</div>
              <div className="text-[10px] text-gray-400 truncate">{partner.organization_name || 'Partner Portal'}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition text-left ${
                page === n.id
                  ? 'bg-purple-100 text-purple-800 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
              <span className="text-base">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition">
            ← Sign Out
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-auto">
        {page === 'dashboard' && <PageDashboard stats={stats} companies={companies} setPage={setPage} />}
        {page === 'companies' && <PageCompanies companies={companies} />}
        {page === 'contracts' && <PageContracts companies={companies} />}
        {page === 'licenses'  && <PageLicenses companies={companies} />}
        {page === 'reports'   && <PageReports companies={companies} stats={stats} />}
        {page === 'profile'   && <PageProfile partner={partner} />}
      </main>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function PageDashboard({ stats, companies, setPage }) {
  const total = Math.max(1, stats.total_companies);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of your referred companies and contract health.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        <StatCard icon="🏢" label="Total Companies"       value={stats.total_companies}          color="purple" />
        <StatCard icon="✅" label="Active Contracts"      value={stats.active_contracts}          color="green" />
        <StatCard icon="⏰" label="Expiring (30 days)"    value={stats.expiring_30}               color="orange" />
        <StatCard icon="💰" label="Total Contract Value"  value={fmtUSD(stats.total_value)}       color="purple" />
        <StatCard icon="🔑" label="Total Purchased Lic."  value={fmt(stats.total_purchased)}      color="purple" />
        <StatCard icon="👥" label="Active License Users"  value={fmt(stats.total_active_users)}   color="green" />
      </div>

      {/* Health + Renewal side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Contract Health</h2>
          <div className="space-y-4">
            {[
              { label: 'Active',          val: stats.active_contracts,  cls: 'bg-green-500' },
              { label: 'Expiring ≤ 90d',  val: stats.expiring_90,       cls: 'bg-yellow-400' },
              { label: 'Expired',         val: stats.expired,           cls: 'bg-red-400' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{row.label}</span>
                  <span className="font-semibold text-gray-800">{row.val}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`${row.cls} h-2.5 rounded-full`} style={{ width: `${(row.val / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Renewal Pipeline</h2>
          <div className="space-y-4">
            {[
              { label: 'Expiring ≤ 30 days', val: stats.expiring_30, cls: 'bg-red-400' },
              { label: 'Expiring ≤ 60 days', val: stats.expiring_60, cls: 'bg-orange-400' },
              { label: 'Expiring ≤ 90 days', val: stats.expiring_90, cls: 'bg-yellow-400' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{row.label}</span>
                  <span className="font-semibold text-gray-800">{row.val}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`${row.cls} h-2.5 rounded-full`} style={{ width: `${(row.val / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Licence utilisation summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-1">Licence Utilisation Summary</h2>
        <p className="text-xs text-gray-400 mb-5">Across all assigned companies</p>
        <div className="grid grid-cols-3 gap-6 mb-5">
          {[
            { label: 'Purchased',    value: stats.total_purchased,    icon: '🛒' },
            { label: 'Active Users', value: stats.total_active_users, icon: '👥' },
            { label: 'Available',    value: Math.max(0, stats.total_purchased - stats.total_used), icon: '✅' },
          ].map(item => (
            <div key={item.label} className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{fmt(item.value)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
        {stats.total_purchased > 0 && (
          <>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Overall utilisation</span>
              <span className="font-semibold">{Math.round((stats.total_used / stats.total_purchased) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-purple-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.total_used / stats.total_purchased) * 100)}%` }} />
            </div>
          </>
        )}
      </div>

      {/* Expiring soon alert */}
      {stats.expiring_30 > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-orange-800">⚠ Contracts Expiring Within 30 Days</h2>
            <button onClick={() => setPage('contracts')} className="text-xs text-orange-700 underline hover:text-orange-900">
              View all contracts →
            </button>
          </div>
          <div className="space-y-2">
            {companies
              .filter(c => Number(c.days_remaining) >= 0 && Number(c.days_remaining) <= 30)
              .map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-orange-100">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                    {c.industry && <span className="text-xs text-gray-400 ml-2">{c.industry}</span>}
                  </div>
                  <span className="text-xs font-semibold text-orange-700">{c.days_remaining}d left · ends {fmtDate(c.contract_end)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Companies ──────────────────────────────────────────────────────────────
function PageCompanies({ companies }) {
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filter, setFilter]   = useState('all');

  const rows = useMemo(() => {
    let r = [...companies];
    if (search) r = r.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase())
    );
    if (filter === 'active')   r = r.filter(c => Number(c.days_remaining) > 30);
    if (filter === 'expiring') r = r.filter(c => Number(c.days_remaining) >= 0 && Number(c.days_remaining) <= 90);
    if (filter === 'expired')  r = r.filter(c => Number(c.days_remaining) < 0);
    r.sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return r;
  }, [companies, search, sortKey, sortDir, filter]);

  function toggleSort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  function Th({ k, label }) {
    const active = sortKey === k;
    return (
      <th onClick={() => toggleSort(k)}
        className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-800 select-none">
        {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Companies</h1>
          <p className="text-gray-400 text-sm mt-0.5">{rows.length} of {companies.length} companies</p>
        </div>
        <button onClick={() => exportCSV(rows.map(c => ({
          Company: c.name, Industry: c.industry || '',
          Status: contractStatus(c).label,
          'Contract Value': c.contract_value || '',
          'Billing Cycle': c.billing_cycle || '',
          'Start Date': c.contract_start || '',
          'End Date': c.contract_end || '',
          'Days Remaining': c.days_remaining ?? '',
          'Purchased Licenses': c.purchased_licenses || 0,
          'Active Users': c.active_users || 0,
          'Utilization %': c.purchased_licenses > 0 ? Math.round(((c.used_licenses||0) / c.purchased_licenses) * 100) : 0,
          'Last Activity': c.last_activity ? new Date(c.last_activity).toLocaleDateString() : '',
        })), 'partner-companies.csv')}
          className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg hover:bg-purple-200 transition">
          ⬇ Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search companies…"
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 w-64" />
        {[
          ['all',      'All'],
          ['active',   '✅ Active'],
          ['expiring', '⏰ Expiring'],
          ['expired',  '🔴 Expired'],
        ].map(([f, lbl]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
              filter === f ? 'bg-purple-100 text-purple-800' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'
            }`}>{lbl}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <Th k="name"               label="Company" />
              <Th k="industry"           label="Industry" />
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Contract Status</th>
              <Th k="contract_value"     label="Contract Value" />
              <Th k="billing_cycle"      label="Billing" />
              <Th k="contract_end"       label="Renewal Date" />
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Days Left</th>
              <Th k="purchased_licenses" label="Purchased Lic." />
              <Th k="active_users"       label="Active Users" />
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Utilisation</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(c => {
              const cs = contractStatus(c);
              const purchased = Number(c.purchased_licenses) || 0;
              const used = Number(c.used_licenses) || 0;
              const dr = Number(c.days_remaining);
              return (
                <tr key={c.id} className="hover:bg-purple-50/20">
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.industry || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cs.cls}`}>{cs.label}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmtUSD(c.contract_value)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{c.billing_cycle || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(c.contract_end)}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {c.days_remaining != null ? (dr < 0 ? <span className="text-red-600">Expired</span> : <span className="text-gray-700">{dr}d</span>) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{fmt(purchased)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(c.active_users)}</td>
                  <td className="px-4 py-3 w-40"><UtilBar used={used} purchased={purchased} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {c.last_activity ? new Date(c.last_activity).toLocaleDateString() : '—'}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={11} className="px-4 py-16 text-center text-gray-400">No companies match your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Contracts ─────────────────────────────────────────────────────────────────
function PageContracts({ companies }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    let r = [...companies];
    if (search) r = r.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'active')   r = r.filter(c => Number(c.days_remaining) > 30);
    if (filter === 'expiring') r = r.filter(c => Number(c.days_remaining) >= 0 && Number(c.days_remaining) <= 90);
    if (filter === 'expired')  r = r.filter(c => Number(c.days_remaining) < 0);
    return r;
  }, [companies, search, filter]);

  function tenure(c) {
    if (!c.contract_start || !c.contract_end) return '—';
    const months = Math.round((new Date(c.contract_end) - new Date(c.contract_start)) / (1000 * 60 * 60 * 24 * 30.44));
    return months >= 12 ? `${(months / 12).toFixed(1)} yr` : `${months} mo`;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-400 text-sm mt-0.5">Contract tenure and status for all your companies</p>
        </div>
        <button onClick={() => exportCSV(rows.map(c => ({
          Company: c.name,
          'Start Date': c.contract_start || '',
          'End Date': c.contract_end || '',
          Tenure: tenure(c),
          'Days Remaining': c.days_remaining ?? '',
          Status: contractStatus(c).label,
          Notes: c.notes || '',
        })), 'partner-contracts.csv')}
          className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg hover:bg-purple-200 transition">
          ⬇ Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search…"
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 w-60" />
        {[['all','All'],['active','✅ Active'],['expiring','⏰ Expiring'],['expired','🔴 Expired']].map(([f,lbl]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
              filter === f ? 'bg-purple-100 text-purple-800' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'
            }`}>{lbl}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Company','Contract Start','Contract End','Tenure','Days Remaining','Contract Status','Notes'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(c => {
              const cs = contractStatus(c);
              const dr = Number(c.days_remaining);
              return (
                <tr key={c.id} className="hover:bg-purple-50/20">
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(c.contract_start)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(c.contract_end)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{tenure(c)}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {c.days_remaining != null
                      ? dr < 0 ? <span className="text-red-600">Expired</span> : <span className="text-gray-700">{dr} days</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cs.cls}`}>{cs.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{c.notes || '—'}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-400">No contracts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── License Usage ─────────────────────────────────────────────────────────────
function PageLicenses({ companies }) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!search) return companies;
    return companies.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  }, [companies, search]);

  const totals = useMemo(() => ({
    purchased: rows.reduce((s, c) => s + (Number(c.purchased_licenses) || 0), 0),
    assigned:  rows.reduce((s, c) => s + (Number(c.used_licenses) || 0), 0),
    active:    rows.reduce((s, c) => s + (Number(c.active_users) || 0), 0),
  }), [rows]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Usage</h1>
          <p className="text-gray-400 text-sm mt-0.5">Software adoption and utilisation across your companies</p>
        </div>
        <button onClick={() => exportCSV(rows.map(c => ({
          Company: c.name,
          'Purchased Licenses': c.purchased_licenses || 0,
          'Assigned Licenses': c.used_licenses || 0,
          'Active Users': c.active_users || 0,
          'Available': Math.max(0, (c.purchased_licenses || 0) - (c.used_licenses || 0)),
          'Utilization %': c.purchased_licenses > 0 ? Math.round(((c.used_licenses||0) / c.purchased_licenses) * 100) : 0,
        })), 'partner-licenses.csv')}
          className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg hover:bg-purple-200 transition">
          ⬇ Export CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Purchased',   value: totals.purchased,                                  icon: '🛒' },
          { label: 'Assigned Licenses', value: totals.assigned,                                   icon: '📋' },
          { label: 'Active Users',      value: totals.active,                                     icon: '👥' },
          { label: 'Available',         value: Math.max(0, totals.purchased - totals.assigned),   icon: '✅' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="text-2xl">{s.icon}</div>
            <div>
              <div className="text-xl font-bold text-gray-900">{fmt(s.value)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍  Search companies…"
        className="border border-gray-200 rounded-lg px-4 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-purple-300 w-64" />

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Company','Purchased','Assigned','Active Users','Available','Utilisation'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(c => {
              const purchased = Number(c.purchased_licenses) || 0;
              const assigned  = Number(c.used_licenses) || 0;
              const active    = Number(c.active_users) || 0;
              return (
                <tr key={c.id} className="hover:bg-purple-50/20">
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(purchased)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(assigned)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(active)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(Math.max(0, purchased - assigned))}</td>
                  <td className="px-4 py-3 w-44"><UtilBar used={assigned} purchased={purchased} /></td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-400">No companies found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────
function PageReports({ companies, stats }) {
  const reports = [
    {
      icon: '📊', title: 'Full Portfolio Report',
      desc: 'All companies — contracts, values, licence usage',
      action: () => exportCSV(companies.map(c => ({
        Company: c.name, Industry: c.industry || '',
        Status: contractStatus(c).label,
        'Contract Start': c.contract_start || '',
        'Contract End': c.contract_end || '',
        'Days Remaining': c.days_remaining ?? '',
        'Contract Value': c.contract_value || '',
        'Billing Cycle': c.billing_cycle || '',
        'Purchased Licenses': c.purchased_licenses || 0,
        'Assigned Licenses': c.used_licenses || 0,
        'Active Users': c.active_users || 0,
        'Utilization %': c.purchased_licenses > 0 ? Math.round(((c.used_licenses||0) / c.purchased_licenses) * 100) : 0,
        'Last Activity': c.last_activity ? new Date(c.last_activity).toLocaleDateString() : '',
      })), 'partner-full-report.csv'),
    },
    {
      icon: '📄', title: 'Contracts Report',
      desc: 'Contract dates, tenure and status per company',
      action: () => exportCSV(companies.map(c => ({
        Company: c.name,
        Start: c.contract_start || '',
        End: c.contract_end || '',
        Status: contractStatus(c).label,
        'Days Left': c.days_remaining ?? '',
      })), 'partner-contracts.csv'),
    },
    {
      icon: '🔑', title: 'Licence Utilisation Report',
      desc: 'Purchased vs used licences per company',
      action: () => exportCSV(companies.map(c => ({
        Company: c.name,
        Purchased: c.purchased_licenses || 0,
        Assigned: c.used_licenses || 0,
        Active: c.active_users || 0,
        'Util %': c.purchased_licenses > 0 ? Math.round(((c.used_licenses||0)/c.purchased_licenses)*100) : 0,
      })), 'partner-licenses.csv'),
    },
    {
      icon: '⏰', title: 'Expiring Contracts Report',
      desc: 'Contracts expiring within 90 days',
      action: () => exportCSV(
        companies.filter(c => Number(c.days_remaining) >= 0 && Number(c.days_remaining) <= 90).map(c => ({
          Company: c.name,
          'End Date': c.contract_end || '',
          'Days Left': c.days_remaining,
          Status: contractStatus(c).label,
          Value: c.contract_value || '',
        })), 'partner-expiring.csv'),
    },
  ];

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
      <p className="text-gray-400 text-sm mb-8">Download reports for your portfolio in CSV format.</p>

      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.title} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{r.icon}</div>
              <div>
                <div className="font-semibold text-gray-900">{r.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
              </div>
            </div>
            <button onClick={r.action}
              className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg hover:bg-purple-200 transition flex-shrink-0">
              ⬇ Download
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Portfolio Summary</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Total Companies',     stats.total_companies],
            ['Active Contracts',    stats.active_contracts],
            ['Expiring (30d)',      stats.expiring_30],
            ['Expired',            stats.expired],
            ['Total Value',        fmtUSD(stats.total_value)],
            ['Total Purchased Lic.', fmt(stats.total_purchased)],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-gray-500">{k}</span>
              <span className="font-semibold text-gray-900">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
function PageProfile({ partner }) {
  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 pb-5 mb-5 border-b border-gray-100">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-xl">
            {partner.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg">{partner.name}</div>
            <div className="text-sm text-gray-400">{partner.organization_name || 'Partner'}</div>
            <div className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
              partner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {partner.status === 'active' ? '✓ Active' : '✗ Inactive'}
            </div>
          </div>
        </div>
        <div className="space-y-0">
          {[
            ['Email',        partner.email],
            ['Organization', partner.organization_name || '—'],
            ['Contact',      partner.contact_number || '—'],
            ['Member Since', partner.created_at ? new Date(partner.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">To update your profile details, contact your administrator.</p>
    </div>
  );
}
