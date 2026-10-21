import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../contexts/AdminDataContext';
import { th } from '../../theme';

function fmt$(n) {
  if (!n) return '$0';
  return '$' + Math.floor(Number(n)).toLocaleString('en-US');
}

function KpiCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''
      }`}
      style={{ borderLeft: color ? `4px solid ${color}` : undefined }}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      {sub && <div className="text-xs font-medium text-slate-500 mt-2">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { engineData, loading, error } = useAdminData();

  if (loading) return (
    <div className="flex justify-center items-center h-72">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (error || !engineData) return (
    <div className="flex justify-center items-center h-72 flex-col gap-3 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
      <div className="text-4xl">📊</div>
      <div className="text-slate-500 text-sm font-medium">No data available — clients need to complete onboarding.</div>
    </div>
  );

  const s   = engineData.summary || {};
  const cl  = engineData.clients || [];
  const inv = engineData.invoices || {};

  const monthlyRev = s.totalMonthlyRevenue  || cl.reduce((a, c) => a + (c.costs?.grandTotal || 0), 0);
  const annualRev  = s.totalAnnualRevenue   || monthlyRev * 12;
  const totalCl    = s.totalClients         ?? cl.length;
  const activeCl   = s.activeClients        ?? cl.filter(c => c.status === 'active').length;
  const pendingOnb = s.onboardingInProgress  ?? cl.filter(c => {
    const prog = c.onboarding?.progressPercent ?? (c.status === 'active' ? 100 : 0);
    return prog > 0 && prog < 100;
  }).length;
  const pendingInv = inv.pending ?? 0;

  const kpis = [
    {
      icon: '💵', label: 'Monthly Revenue',    value: fmt$(monthlyRev),
      color: '#10B981', sub: `${cl.filter(c => (c.costs?.grandTotal || 0) > 0).length} billable clients`,
    },
    {
      icon: '💰', label: 'Annual Revenue',     value: fmt$(annualRev),
      color: '#10B981', sub: 'Projected from current monthly',
    },
    {
      icon: '🏢', label: 'Total Clients',      value: totalCl,
      color: th('#2563EB', { dark: '#60A5FA' }), sub: `${activeCl} active`,
    },
    {
      icon: '✅', label: 'Active Clients',     value: activeCl,
      color: '#10B981', sub: `${totalCl - activeCl} inactive`,
    },
    {
      icon: '📋', label: 'Pending Onboarding', value: pendingOnb,
      color: '#F59E0B', sub: 'Clients in progress',
      onClick: () => navigate('../onboarding'),
    },
    {
      icon: '⏳', label: 'Pending Invoices',   value: pendingInv,
      color: '#7C3AED', sub: 'Click to view →',
      onClick: () => navigate('../cost-centre'),
    },
  ];

  return (
    <div className="font-sans text-slate-900 max-w-5xl space-y-6">
      {/* Page intro */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Overview</h1>
        <p className="text-xs text-slate-500 mt-0.5">Revenue, clients, and operational status at a glance.</p>
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard {...kpis[0]} />
        <KpiCard {...kpis[1]} />
      </div>

      {/* Business row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard {...kpis[2]} />
        <KpiCard {...kpis[3]} />
        <KpiCard {...kpis[4]} />
        <KpiCard {...kpis[5]} />
      </div>
    </div>
  );
}
