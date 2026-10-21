import React, { useState } from 'react';
import { th } from '../../theme';

const REPORTS = [
  {
    id: 'cost',
    icon: '💰',
    label: 'Cost Report',
    description: 'Monthly and annual cost breakdown per client. Includes dashboard licensing, integrations, frameworks, security tools, and audit costs.',
    color: '#059669',
    tags: ['Billing', 'Finance'],
  },
  {
    id: 'invoice',
    icon: '📄',
    label: 'Invoice Report',
    description: 'Complete invoice history — paid, pending, and overdue invoices with client details, amounts, and issue dates.',
    color: th('#2563EB', { dark: '#60A5FA' }),
    tags: ['Invoices', 'Billing'],
  },
  {
    id: 'employee',
    icon: '👥',
    label: 'Employee Report',
    description: 'Full employee roster broken down by type: Internal, External, Partner, vCISO, and Directors across all clients.',
    color: '#7C3AED',
    tags: ['Employees', 'HR'],
  },
  {
    id: 'onboarding',
    icon: '📋',
    label: 'Onboarding Report',
    description: 'Client onboarding progress, completion percentages, expected dates, and assigned team members.',
    color: '#0284C7',
    tags: ['Clients', 'Progress'],
  },
  {
    id: 'revenue',
    icon: '📈',
    label: 'Revenue Report',
    description: 'Revenue summary by client and period. Monthly recurring revenue, annual projections, and billing trends.',
    color: '#F97316',
    tags: ['Revenue', 'Finance'],
  },
];

function ReportCard({ report, onExport, generating }) {
  const isGen = generating === report.id;
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4"
      style={{ borderLeft: `4px solid ${report.color}` }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">{report.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-slate-900 font-bold text-sm mb-1">{report.label}</div>
          <div className="text-slate-500 text-xs leading-relaxed">{report.description}</div>
          <div className="flex gap-1.5 mt-3">
            {report.tags.map(t => (
              <span key={t} className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        {['PDF', 'Excel', 'CSV'].map(fmt => (
          <button
            key={fmt}
            onClick={() => onExport(report.id, fmt)}
            disabled={isGen}
            className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-sm disabled:opacity-50"
          >
            {isGen ? '...' : `↓ ${fmt}`}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [generating, setGenerating] = useState(null);
  const [toast, setToast]           = useState(null);

  function handleExport(reportId, format) {
    setGenerating(reportId);
    setTimeout(() => {
      setGenerating(null);
      const label = REPORTS.find(r => r.id === reportId)?.label || reportId;
      setToast(`${label} (${format}) export ready`);
      setTimeout(() => setToast(null), 3000);
    }, 1200);
  }

  return (
    <div className="font-sans text-slate-900 max-w-5xl space-y-6">
      {/* Page intro */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports Centre</h1>
        <p className="text-xs text-slate-500 mt-0.5">Generate and export administrative, financial, and client intelligence reports.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '📊', label: 'Report Types',    value: REPORTS.length, color: th('#2563EB', { dark: '#60A5FA' }) },
          { icon: '📤', label: 'Export Formats',  value: 3,              color: '#7C3AED' },
          { icon: '🔄', label: 'Auto-Generated',  value: 'Live Data',    color: '#059669' },
        ].map(k => (
          <div
            key={k.label}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
            style={{ borderLeft: `4px solid ${k.color}` }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(r => (
          <ReportCard key={r.id} report={r} onExport={handleExport} generating={generating} />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-200 rounded-2xl p-4 text-xs font-bold text-slate-900 shadow-xl flex items-center gap-2.5">
          <span className="text-base text-emerald-600">✅</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
