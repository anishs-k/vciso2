import React, { useState } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { th } from '../../theme';

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusInfo(s) {
  switch (s) {
    case 'completed':   return { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', barColor: 'bg-emerald-500' };
    case 'in_progress': return { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200',       barColor: 'bg-blue-600' };
    case 'blocked':     return { label: 'Blocked',     cls: 'bg-red-50 text-red-700 border-red-200',          barColor: 'bg-red-500' };
    case 'not_started': return { label: 'Not Started', cls: 'bg-slate-100 text-slate-700 border-slate-200',  barColor: 'bg-slate-300' };
    case 'active':      return { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', barColor: 'bg-emerald-500' };
    default:            return { label: s || 'Unknown', cls: 'bg-slate-100 text-slate-700 border-slate-200',  barColor: 'bg-slate-300' };
  }
}

function ProgressBar({ value, barColor }) {
  return (
    <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${Math.min(100, value || 0)}%` }}
      />
    </div>
  );
}

function ClientRow({ client }) {
  const progress = client.onboarding?.progressPercent ?? (client.status === 'active' ? 100 : 0);
  const statusKey = client.onboarding?.status ?? (client.status === 'active' ? 'completed' : 'not_started');
  const si = statusInfo(statusKey);
  const barColor = progress === 100 ? 'bg-emerald-500' : statusKey === 'blocked' ? 'bg-red-500' : 'bg-blue-600';
  const team = client.onboarding?.assignedTeam || client.assignedTeam || '—';
  const expected = client.onboarding?.expectedCompletion || client.expectedCompletion || null;

  return (
    <tr className="hover:bg-slate-50/70 transition">
      <td className="px-5 py-4">
        <div className="text-slate-900 font-bold text-xs">{client.companyName || client.name}</div>
        <div className="text-slate-400 text-[11px] mt-0.5">{client.industry || '—'}</div>
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-500 font-medium">Progress</span>
          <span className="text-slate-900 font-bold text-[11px]">{progress}%</span>
        </div>
        <ProgressBar value={progress} barColor={barColor} />
      </td>
      <td className="px-4 py-4 text-center">
        <div className="text-slate-900 font-semibold text-xs">{fmtDate(expected)}</div>
        <div className="text-slate-400 text-[10px] mt-0.5">Expected</div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="text-slate-700 font-medium text-xs">{team}</div>
        <div className="text-slate-400 text-[10px] mt-0.5">Team</div>
      </td>
      <td className="px-5 py-4 text-right">
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wider whitespace-nowrap ${si.cls}`}>
          {si.label}
        </span>
      </td>
    </tr>
  );
}

export default function AdminOnboarding() {
  const { engineData, loading } = useAdminData();
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) return (
    <div className="flex justify-center items-center h-52">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  const clients = engineData?.clients || [];

  const enriched = clients.map(c => {
    const prog = c.onboarding?.progressPercent ?? (c.status === 'active' ? 100 : 0);
    const st   = c.onboarding?.status ?? (c.status === 'active' ? 'completed' : 'not_started');
    return { ...c, _prog: prog, _status: st };
  });

  const filtered = filterStatus === 'all' ? enriched : enriched.filter(c => c._status === filterStatus);

  const counts = {
    total:       enriched.length,
    completed:   enriched.filter(c => c._status === 'completed').length,
    inProgress:  enriched.filter(c => c._status === 'in_progress').length,
    blocked:     enriched.filter(c => c._status === 'blocked').length,
    notStarted:  enriched.filter(c => c._status === 'not_started').length,
  };

  const kpis = [
    { label: 'Total Clients', value: counts.total,      color: th('#2563EB', { dark: '#60A5FA' }) },
    { label: 'Completed',     value: counts.completed,  color: '#059669' },
    { label: 'In Progress',   value: counts.inProgress, color: '#0284C7' },
    { label: 'Blocked',       value: counts.blocked,    color: '#DC2626' },
    { label: 'Not Started',   value: counts.notStarted, color: th('#64748B', { dark: '#94A3B8' }) },
  ];

  return (
    <div className="font-sans text-slate-900 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Onboarding</h1>
        <p className="text-xs text-slate-500 mt-0.5">Track onboarding milestone progress, assigned teams, and activation schedules.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(k => (
          <div
            key={k.label}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
            style={{ borderLeft: `4px solid ${k.color}` }}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{k.label}</div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-wrap gap-3">
          <div className="font-bold text-sm text-slate-900">Client Onboarding Progress</div>
          <div className="flex items-center gap-2.5">
            <span className="text-slate-500 text-xs font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="not_started">Not Started</option>
            </select>
            <span className="text-slate-400 text-xs font-medium">{filtered.length} shown</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3 w-56">Progress</th>
                <th className="px-4 py-3 text-center">Expected Completion</th>
                <th className="px-4 py-3 text-center">Assigned Team</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No clients match the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => <ClientRow key={c.id || i} client={c} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
