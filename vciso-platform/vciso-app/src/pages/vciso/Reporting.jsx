import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';

const REPORT_TYPES = [
  { id: 'executive', icon: '📊', name: 'Executive Summary', desc: 'High-level security posture overview for C-suite and board. Shows risk score, critical findings, compliance status, and key metrics.' },
  { id: 'vulnerability', icon: '🐛', name: 'Vulnerability Report', desc: 'Detailed vulnerability inventory with CVSS scores, asset mapping, remediation status, SLA tracking, and owner accountability.' },
  { id: 'audit', icon: '📋', name: 'Audit & Compliance Report', desc: 'Framework compliance status across assigned audit modules — controls assessed, gaps identified, CARs raised, and evidence collected.' },
  { id: 'risk', icon: '⚖️', name: 'Risk Assessment Report', desc: 'Inherent vs residual risk analysis, risk heatmap, top risks by business impact, and risk treatment plan status.' },
  { id: 'sla', icon: '⏱️', name: 'SLA Performance Report', desc: 'Vulnerability remediation SLA tracking — overdue vs on-track, MTTR per severity, owner accountability, and trend analysis.' },
  { id: 'custom', icon: '✏️', name: 'Custom Report', desc: 'Build a tailored report by selecting sections, date ranges, frameworks, and severity filters.' },
];

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</div>}
    </div>
  );
}

function SevBar({ label, count, total, color, bg }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 font-medium">
        <span className="text-slate-600">{label}</span>
        <span className={color}>{count} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-slate-100">
        <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Reporting() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);

  useEffect(() => {
    fetch('/api/vciso/reports/data', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const generateReport = async (typeId) => {
    setGenerating(true);
    setSelectedType(typeId);
    await new Promise(r => setTimeout(r, 1500));
    setGenerated(typeId);
    setGenerating(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-slate-50 min-h-[400px]">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const vulns = data?.vulns || [];
  const openVulns = vulns.filter(v => v.status !== 'remediated').length;
  const critCount = vulns.filter(v => v.severity === 'critical' && v.status !== 'remediated').length;
  const highCount = vulns.filter(v => v.severity === 'high' && v.status !== 'remediated').length;
  const medCount = vulns.filter(v => v.severity === 'medium' && v.status !== 'remediated').length;
  const lowCount = vulns.filter(v => v.severity === 'low' && v.status !== 'remediated').length;
  const remediatedCount = vulns.filter(v => v.status === 'remediated').length;

  const audits = data?.audits || [];
  const cars = data?.cars || [];
  const openCars = cars.filter(c => c.status === 'open').length;

  const clientName = data?.client?.name || 'Client';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 space-y-6 font-sans bg-slate-50 min-h-full text-slate-900">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reporting</h1>
        <p className="text-xs mt-0.5 text-slate-500">Generate and export security reports for {clientName}</p>
      </div>

      {/* Live metrics summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="text-sm font-bold text-slate-900 mb-4">Live Dashboard Snapshot · {today}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Open Vulnerabilities" value={openVulns} color="text-red-600" sub={`${remediatedCount} remediated`} />
          <MetricCard label="Critical Findings" value={critCount} color="text-red-600" sub={`${highCount} high severity`} />
          <MetricCard label="Active Audits" value={audits.filter(a => a.status !== 'closed').length} color="text-blue-600" sub={`${audits.length} total`} />
          <MetricCard label="Open CARs" value={openCars} color="text-orange-600" sub={`${cars.length} total raised`} />
        </div>
        <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Vulnerability Breakdown (Open)</div>
          <SevBar label="Critical" count={critCount} total={openVulns} color="text-red-600 font-bold" bg="bg-red-600" />
          <SevBar label="High" count={highCount} total={openVulns} color="text-orange-600 font-bold" bg="bg-orange-500" />
          <SevBar label="Medium" count={medCount} total={openVulns} color="text-amber-600 font-bold" bg="bg-amber-500" />
          <SevBar label="Low" count={lowCount} total={openVulns} color="text-emerald-600 font-bold" bg="bg-emerald-500" />
        </div>
      </div>

      {/* Report type cards */}
      <div>
        <div className="text-sm font-bold text-slate-900 mb-4">Generate Report</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map(rt => (
            <div key={rt.id} className={`rounded-2xl p-5 flex flex-col gap-3 bg-white border transition shadow-sm ${selectedType === rt.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{rt.icon}</span>
                <div className="font-bold text-sm text-slate-900">{rt.name}</div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 flex-1">{rt.desc}</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => generateReport(rt.id)}
                  disabled={generating && selectedType === rt.id}
                  className="flex-1 text-xs font-bold py-2.5 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60">
                  {generating && selectedType === rt.id ? '⟳ Generating...' : '⬇ Generate PDF'}
                </button>
                <button className="text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition">
                  Preview
                </button>
              </div>
              {generated === rt.id && (
                <div className="text-xs text-center py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  ✓ Report ready — download will start shortly
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent audits table */}
      {audits.length > 0 && (
        <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <span className="text-sm font-bold text-slate-900">Audit Summary</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {['Audit', 'Framework', 'Status', 'Findings', 'Critical', 'CARs'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audits.slice(0, 8).map((a) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition text-slate-900">
                  <td className="px-4 py-3.5 font-semibold text-slate-900">{a.title}</td>
                  <td className="px-4 py-3.5 text-slate-600">{a.framework}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      a.status === 'closed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : a.status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">{a.findings || 0}</td>
                  <td className="px-4 py-3.5 font-bold text-red-600">{a.critical || 0}</td>
                  <td className="px-4 py-3.5 font-bold text-orange-600">{a.overdue_cars || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
