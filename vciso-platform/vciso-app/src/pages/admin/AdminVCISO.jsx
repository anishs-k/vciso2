import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { th } from '../../theme';

const MOCK = {
  overallSecurityScore: 74,
  risks: { critical: 8, high: 15, medium: 23, low: 31 },
  compliance: { readiness: 68, auditReadiness: 71, frameworkCompletion: 64 },
  policies: { total: 24, approved: 18, draft: 4, missing: 2 },
  integrations: { connected: 12, failed: 2, pending: 3 },
  securityTools: { total: 15, active: 12, inactive: 3 },
  frameworks: [
    { name: 'SOC 2', status: 'in_progress', completion: 72, auditReadiness: 68, openGaps: 8, tasks: 12 },
    { name: 'ISO 27001', status: 'in_progress', completion: 65, auditReadiness: 61, openGaps: 14, tasks: 18 },
    { name: 'HIPAA', status: 'not_started', completion: 0, auditReadiness: 0, openGaps: 0, tasks: 0 },
    { name: 'PCI DSS', status: 'in_progress', completion: 45, auditReadiness: 40, openGaps: 22, tasks: 30 },
    { name: 'NIST CSF', status: 'in_progress', completion: 58, auditReadiness: 55, openGaps: 18, tasks: 24 },
    { name: 'CIS Controls', status: 'completed', completion: 91, auditReadiness: 88, openGaps: 2, tasks: 3 },
  ],
};

function statusBadge(s) {
  switch (s) {
    case 'completed': return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Completed</span>;
    case 'in_progress': return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">In Progress</span>;
    case 'not_started': return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Not Started</span>;
    default: return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">{s}</span>;
  }
}

function ProgressBar({ value, colorClass = 'bg-blue-600' }) {
  return (
    <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden flex-1">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
    </div>
  );
}

// SVG Donut score ring
function ScoreRing({ score, size = 180 }) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 16;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626';
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="12" />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="34" fontWeight="800">{score}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill={th('#64748B', { dark: '#94A3B8' })} fontSize="11" fontWeight="500">Security Score</text>
    </svg>
  );
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
      style={{ borderLeft: color ? `4px solid ${color}` : undefined }}
    >
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</span>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      {sub && <div className="text-slate-400 text-[11px] font-medium mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminVCISO() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-portal/vciso', { headers: { 'Authorization': `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-52">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const d = data || MOCK;

  return (
    <div className="font-sans text-slate-900 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">vCISO Executive Cockpit</h1>
        <p className="text-xs text-slate-500 mt-0.5">Global security posture, cross-framework compliance, risk distribution, and tool connectivity.</p>
      </div>

      {/* Row 1: Score + Risk breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-2">
          <ScoreRing score={d.overallSecurityScore} size={170} />
          <div className="text-xs font-bold mt-1 text-slate-600">
            {d.overallSecurityScore >= 80 ? '✅ Good posture' : d.overallSecurityScore >= 60 ? '⚠️ Needs improvement' : '🚨 Critical attention required'}
          </div>
        </div>
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-sm text-slate-900">🚨 Risk Breakdown</div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Critical Risks" value={d.risks.critical} color="#DC2626" icon="🔴" />
            <MetricCard label="High Risks" value={d.risks.high} color="#EA580C" icon="🟠" />
            <MetricCard label="Medium Risks" value={d.risks.medium} color="#D97706" icon="🟡" />
            <MetricCard label="Low Risks" value={d.risks.low} color="#059669" icon="🟢" />
          </div>
        </div>
      </div>

      {/* Row 2: Compliance + Policy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-sm text-slate-900">📊 Compliance Metrics</div>
          {[
            { label: 'Compliance Readiness', value: d.compliance.readiness, barCls: 'bg-blue-600' },
            { label: 'Audit Readiness', value: d.compliance.auditReadiness, barCls: 'bg-purple-600' },
            { label: 'Framework Completion', value: d.compliance.frameworkCompletion, barCls: 'bg-emerald-600' },
          ].map(m => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">{m.label}</span>
                <span className="text-slate-900 font-bold">{m.value}%</span>
              </div>
              <ProgressBar value={m.value} colorClass={m.barCls} />
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-sm text-slate-900">📋 Policy Status</div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Total Policies" value={d.policies.total} color={th('#2563EB', { dark: '#60A5FA' })} />
            <MetricCard label="Approved" value={d.policies.approved} color="#059669" />
            <MetricCard label="Draft" value={d.policies.draft} color="#D97706" />
            <MetricCard label="Missing" value={d.policies.missing} color="#DC2626" />
          </div>
        </div>
      </div>

      {/* Row 3: Integration + Security Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-sm text-slate-900">🔗 Integration Health</div>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Connected" value={d.integrations.connected} color="#059669" icon="✅" />
            <MetricCard label="Failed" value={d.integrations.failed} color="#DC2626" icon="❌" />
            <MetricCard label="Pending" value={d.integrations.pending} color="#D97706" icon="⏳" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-sm text-slate-900">🔒 Security Tool Health</div>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Total Tools" value={d.securityTools.total} color={th('#2563EB', { dark: '#60A5FA' })} icon="🛡️" />
            <MetricCard label="Active" value={d.securityTools.active} color="#059669" icon="✅" />
            <MetricCard label="Inactive" value={d.securityTools.inactive} color="#DC2626" icon="⚠️" />
          </div>
        </div>
      </div>

      {/* Framework table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-900 bg-slate-50/50">
          🛡️ Framework Status
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Framework</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 min-w-[160px]">Completion</th>
                <th className="px-6 py-3 min-w-[160px]">Audit Readiness</th>
                <th className="px-6 py-3">Open Gaps</th>
                <th className="px-6 py-3">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.frameworks.map((f, i) => {
                const compBar = f.completion >= 80 ? 'bg-emerald-500' : f.completion >= 50 ? 'bg-amber-500' : f.completion === 0 ? 'bg-slate-300' : 'bg-red-500';
                return (
                  <tr key={i} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-3.5 text-slate-900 font-bold text-xs">{f.name}</td>
                    <td className="px-6 py-3.5">{statusBadge(f.status)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={f.completion} colorClass={compBar} />
                        <span className="text-slate-900 text-xs font-bold w-9 text-right">{f.completion}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={f.auditReadiness} colorClass="bg-purple-600" />
                        <span className="text-purple-700 text-xs font-bold w-9 text-right">{f.auditReadiness}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-bold ${f.openGaps > 10 ? 'text-red-600' : f.openGaps > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {f.openGaps}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 text-xs font-medium">{f.tasks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
