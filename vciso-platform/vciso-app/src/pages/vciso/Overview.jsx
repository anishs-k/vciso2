import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { th } from '../../theme';

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg:       th('#F8FAFC', { dark: '#0F172A' }),
  card:     th('#FFFFFF', { dark: '#1E293B' }),
  cardSubtle: th('#F8FAFC', { dark: '#0F172A' }),
  border:   th('#E5E7EB', { dark: '#334155' }),
  accent:   th('#2563EB', { dark: '#60A5FA' }),
  critical: '#DC2626',
  high:     '#EA580C',
  medium:   '#D97706',
  low:      '#059669',
  muted:    th('#64748B', { dark: '#94A3B8' }),
  text:     th('#0F172A', { dark: '#F1F5F9' }),
};

// ── Business asset mock data ──────────────────────────────────────────────────
const BUSINESS_ASSETS = [
  { name: 'Employee Information',  rank: 1, likelihood: 0.80, cost: 5.0,  color: C.critical },
  { name: 'Customer Privacy',      rank: 2, likelihood: 0.33, cost: 9.5,  color: C.high     },
  { name: 'Business Continuity',   rank: 3, likelihood: 0.56, cost: 7.0,  color: C.high     },
  { name: 'Sensitive Data',        rank: 4, likelihood: 0.80, cost: 1.0,  color: C.medium   },
  { name: 'Intellectual Property', rank: 5, likelihood: 0.58, cost: 1.6,  color: C.medium   },
  { name: 'Financial Information', rank: 6, likelihood: 0.73, cost: 1.1,  color: C.low      },
];

const SANKEY_CONNECTIONS = [
  { threat: 'External Attacker',  asset: 'Employee Information',  value: 0.8 },
  { threat: 'External Attacker',  asset: 'Customer Privacy',      value: 0.4 },
  { threat: 'External Attacker',  asset: 'Business Continuity',   value: 0.6 },
  { threat: 'External Attacker',  asset: 'Financial Information', value: 0.7 },
  { threat: 'Insider Dev',        asset: 'Sensitive Data',        value: 0.9 },
  { threat: 'Insider Dev',        asset: 'Intellectual Property', value: 0.8 },
  { threat: 'Insider Dev',        asset: 'Business Continuity',   value: 0.5 },
  { threat: 'Insider Employee',   asset: 'Employee Information',  value: 0.6 },
  { threat: 'Insider Employee',   asset: 'Financial Information', value: 0.5 },
  { threat: 'Third Party Vendor', asset: 'Business Continuity',   value: 0.7 },
  { threat: 'Third Party Vendor', asset: 'Customer Privacy',      value: 0.6 },
];

const THREATS = ['External Attacker', 'Insider Dev', 'Insider Employee', 'Third Party Vendor'];
const ASSET_NAMES = BUSINESS_ASSETS.map(a => a.name);

function StatCard({ label, value, color, sub, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl p-5 text-left w-full hover:shadow-md transition-all bg-white border border-slate-200 shadow-sm group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{label}</span>
      </div>
      <div className="text-3xl font-black mb-1 tabular-nums" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </button>
  );
}

function DonutChart({ segments }) {
  const size = 160, r = 58, cx = 80, cy = 80;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + (d.value || 0), 0);
  let offset = 0;
  const arcs = segments.map(seg => {
    const len = total > 0 ? (seg.value / total) * circ : 0;
    const arc = { ...seg, dashOffset: circ / 4 - offset, dashLen: len };
    offset += len;
    return arc;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={20} />
      {arcs.map((arc, i) => arc.dashLen > 1 ? (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth={20}
          strokeDasharray={`${arc.dashLen} ${circ}`} strokeDashoffset={arc.dashOffset} strokeLinecap="butt" />
      ) : null)}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="22" fontWeight="800">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={th('#64748B', { dark: '#94A3B8' })} fontSize="11" fontWeight="500">Total</text>
    </svg>
  );
}

function VBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-3 h-36">
      {data.map(d => {
        const pct = Math.max(4, Math.round((d.value / maxVal) * 100));
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-black tabular-nums" style={{ color: d.color }}>{d.value}</span>
            <div className="w-full rounded-t-lg transition-all duration-700"
              style={{ height: `${pct}%`, background: d.color }} />
            <span className="text-[10px] font-semibold text-slate-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function HBar({ label, value, max, color }) {
  const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const pct = max > 0 ? Math.max(3, Math.round((numVal / max) * 100)) : 3;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium truncate max-w-[170px] text-slate-800">{label}</span>
        <span className="text-xs font-bold ml-2 tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function TrendArea({ data, color, compact }) {
  if (!data || data.length < 2) {
    return <div className="h-24 flex items-center justify-center text-xs text-slate-400">No trend data yet</div>;
  }
  const W = 320, H = compact ? 50 : 80;
  const vals = data.map(d => parseFloat(d.value) || 0);
  const maxV = Math.max(...vals, 1);
  const minV = Math.min(...vals, 0);
  const range = maxV - minV || 1;
  const pts = vals.map((v, i) => [10 + (i / (vals.length - 1)) * (W - 20), H - 8 - ((v - minV) / range) * (H - 20)]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  const gId = `tg-${color.replace('#','')}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {!compact && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={color} stroke="#ffffff" strokeWidth="1.5" />)}
      </svg>
      {!compact && (
        <div className="flex justify-between mt-1">
          {data.map((d, i) => (
            <div key={i} className="text-center flex-1">
              <div className="text-[10px] font-bold text-slate-800">{d.value}</div>
              <div className="text-[9px] text-slate-400">{d.month}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NistBar({ label, score, target = 3.5 }) {
  const max = 5;
  const pct = (score / max) * 100;
  const tpct = (target / max) * 100;
  const color = score >= target ? C.low : score >= target - 0.7 ? C.medium : C.high;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-slate-800">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Target {target}</span>
          <span className="text-xs font-black tabular-nums" style={{ color }}>{score.toFixed(1)}</span>
        </div>
      </div>
      <div className="relative h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
        <div className="absolute top-0 h-2 w-0.5 rounded-full bg-slate-400" style={{ left: `${tpct}%` }} />
      </div>
    </div>
  );
}

function RiskRow({ rank, label, likelihood, exposure, color }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl mb-1.5 bg-slate-50 border border-slate-200">
      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{ background: `${color}15`, color }}>{rank}</span>
      <span className="flex-1 text-xs font-semibold truncate text-slate-800">{label}</span>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{likelihood}% likely</span>
      <span className="text-[10px] font-bold tabular-nums text-slate-900">{exposure}</span>
    </div>
  );
}

function ScatterPlot({ assets }) {
  const W = 400, H = 260, PL = 50, PR = 20, PT = 20, PB = 40;
  const iW = W - PL - PR, iH = H - PT - PB;
  const toX = (l) => PL + l * iW;
  const toY = (c) => PT + iH - (c / 10) * iH;
  const yTicks = [0, 2, 4, 6, 8, 10];
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PL} y1={toY(t)} x2={W - PR} y2={toY(t)} stroke="#F1F5F9" strokeWidth="1" />
          <text x={PL - 6} y={toY(t) + 4} textAnchor="end" fill={th('#64748B', { dark: '#94A3B8' })} fontSize="9">${t}M</text>
        </g>
      ))}
      {xTicks.map(t => (
        <g key={t}>
          <line x1={toX(t)} y1={PT} x2={toX(t)} y2={H - PB} stroke="#F1F5F9" strokeWidth="1" />
          <text x={toX(t)} y={H - PB + 14} textAnchor="middle" fill={th('#64748B', { dark: '#94A3B8' })} fontSize="9">{t.toFixed(2)}</text>
        </g>
      ))}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="#CBD5E1" strokeWidth="1" />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#CBD5E1" strokeWidth="1" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fill={th('#64748B', { dark: '#94A3B8' })} fontSize="9" fontWeight="600">Likelihood</text>
      <text transform={`rotate(-90 14 ${H / 2})`} x="14" y={H / 2} textAnchor="middle" fill={th('#64748B', { dark: '#94A3B8' })} fontSize="9" fontWeight="600">Cost of Breach</text>
      {assets.map((a, i) => (
        <g key={i}>
          <circle cx={toX(a.likelihood)} cy={toY(a.cost)} r="10" fill={a.color} fillOpacity="0.2" stroke={a.color} strokeWidth="2" />
          <text x={toX(a.likelihood) + 12} y={toY(a.cost) + 4} fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="8" fontWeight="600">
            {a.name.split(' ')[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SankeyViz({ connections, threats, assets }) {
  const W = 580, H = 280;
  const tSpacing = H / (threats.length + 1);
  const aSpacing = H / (assets.length + 1);
  const threatY = (i) => tSpacing * (i + 1);
  const assetY  = (i) => aSpacing * (i + 1);
  const tX = 120, aX = 460;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {connections.map((conn, i) => {
        const ti = threats.indexOf(conn.threat);
        const ai = assets.indexOf(conn.asset);
        if (ti < 0 || ai < 0) return null;
        const x1 = tX + 80, y1 = threatY(ti);
        const x2 = aX - 80, y2 = assetY(ai);
        const mx = (x1 + x2) / 2;
        const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
        const color = conn.value > 0.6 ? C.critical : conn.value >= 0.4 ? C.high : '#94A3B8';
        return <path key={i} d={d} fill="none" stroke={color} strokeWidth={conn.value * 3 + 1} strokeOpacity={0.6} />;
      })}
      {threats.map((t, i) => (
        <g key={t}>
          <rect x="4" y={threatY(i) - 12} width="110" height="24" rx="6" fill="#F8FAFC" stroke="#CBD5E1" />
          <text x="59" y={threatY(i) + 4} textAnchor="middle" fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="9" fontWeight="600">{t}</text>
        </g>
      ))}
      {assets.map((a, i) => (
        <g key={a}>
          <rect x={aX - 6} y={assetY(i) - 12} width="120" height="24" rx="6" fill="#F8FAFC" stroke="#CBD5E1" />
          <text x={aX + 54} y={assetY(i) + 4} textAnchor="middle" fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="9" fontWeight="600">{a}</text>
        </g>
      ))}
    </svg>
  );
}

function MitigationFunnel() {
  const W = 280, H = 200;
  const levels = [
    { label: 'Total Findings', value: 800, width: 240, color: '#EFF6FF', stroke: '#BFDBFE', text: '#1E40AF', subText: '#60A5FA' },
    { label: 'Attack Route Findings', value: 40, width: 160, color: '#DBEAFE', stroke: '#93C5FD', text: th('#1D4ED8', { dark: '#93C5FD' }), subText: '#3B82F6', note: 'Refined by 50%' },
    { label: 'Critical to Block', value: 10, width: 90, color: th('#2563EB', { dark: '#60A5FA' }), stroke: th('#1D4ED8', { dark: '#93C5FD' }), text: '#FFFFFF', subText: '#DBEAFE', note: 'Refined by 25%' },
  ];
  const levelH = H / levels.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {levels.map((lv, i) => {
        const x = (W - lv.width) / 2;
        const y = i * levelH + 4;
        const h = levelH - 8;
        return (
          <g key={i}>
            <rect x={x} y={y} width={lv.width} height={h} rx="8" fill={lv.color} stroke={lv.stroke} />
            <text x={W / 2} y={y + h / 2 - 4} textAnchor="middle" fill={lv.text} fontSize="9" fontWeight="700">{lv.label}</text>
            <text x={W / 2} y={y + h / 2 + 10} textAnchor="middle" fill={lv.text} fontSize="12" fontWeight="900">{lv.value}</text>
            {lv.note && <text x={W / 2} y={y + h / 2 + 22} textAnchor="middle" fill={lv.subText} fontSize="8" fontWeight="600">{lv.note}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function Overview({ clientName }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const dashboardRef = useRef();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [myPermissions, setMyPermissions] = useState(null);

  const SECTION_META = {
    frameworks:     { label: 'Framework Selection', icon: '📐' },
    domains:        { label: 'Security Domains',    icon: '🌐' },
    controls:       { label: 'Controls Review',     icon: '🔒' },
    security_tools: { label: 'Security Tools',      icon: '⚙️'  },
    integrations:   { label: 'Integrations',        icon: '🔗' },
    evidence:       { label: 'Evidence',            icon: '📄' },
    assessments:    { label: 'Assessments',         icon: '📊' },
    risks:          { label: 'Risks',               icon: '⚠️'  },
    reports:        { label: 'Reports',             icon: '📈' },
  };

  useEffect(() => {
    const token = getToken();
    fetch('/api/vciso/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setApiError(true); setLoading(false); });
    // Fetch permissions once on mount
    fetch('/api/auth/me/permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { permissions: [] })
      .then(d => setMyPermissions(d.permissions || []))
      .catch(() => setMyPermissions([]));
  }, []);

  async function toggleCompany() {
    const next = !companyOpen;
    setCompanyOpen(next);
    if (!next || companyInfo !== null) return;
    const clientId = data?.client?.id;
    if (!clientId) return;
    setCompanyLoading(true);
    try {
      const r = await fetch(`/api/company-info/${clientId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      setCompanyInfo(await r.json() || {});
    } catch { setCompanyInfo({}); }
    setCompanyLoading(false);
  }

  function toggleAccess() { setAccessOpen(v => !v); }

  async function toggleEscalation() {
    const next = !escalationOpen;
    setEscalationOpen(next);
    if (!next || contacts !== null) return;
    const clientId = data?.client?.id;
    if (!clientId) return;
    setContactsLoading(true);
    try {
      const r = await fetch(`/api/contacts/${clientId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      setContacts(Array.isArray(d) ? d : []);
    } catch { setContacts([]); }
    setContactsLoading(false);
  }

  async function exportPDF() {
    if (exporting) return;
    setExporting(true);
    try {
      const el = dashboardRef.current;
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#070d1f' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgH = pdfW / ratio;
      pdf.setFillColor(7, 13, 31);
      pdf.rect(0, 0, pdfW, pdfH, 'F');
      pdf.setTextColor(0, 194, 199);
      pdf.setFontSize(8);
      const dn = displayName || 'CLIENT';
      pdf.text(`EXECUTIVE RISK REPORT — ${dn} — ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 10, 8);
      const safeImgH = imgH > pdfH - 12 ? pdfH - 12 : imgH;
      pdf.addImage(imgData, 'PNG', 0, 12, pdfW, safeImgH);
      let yOffset = safeImgH;
      while (yOffset < canvas.height * (pdfW / canvas.width)) {
        pdf.addPage();
        pdf.setFillColor(7, 13, 31);
        pdf.rect(0, 0, pdfW, pdfH, 'F');
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfW / ratio);
        yOffset += pdfH;
      }
      pdf.save(`risk-report-${(dn).toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('PDF export error:', e); }
    setExporting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-slate-50 min-h-[500px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <div className="text-xs font-medium text-slate-500">Loading dashboard…</div>
      </div>
    </div>
  );

  if (apiError) return (
    <div className="flex items-center justify-center h-full bg-slate-50 min-h-[500px]">
      <div className="text-center px-8 max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-3xl mb-3">⚠️</div>
        <div className="text-slate-900 font-bold text-base mb-1">Backend connection issue</div>
        <div className="text-xs mb-4 text-slate-500">
          The API could not be reached. Please ensure the backend is deployed and
          <code className="mx-1 px-1 py-0.5 rounded text-[11px] bg-slate-100 text-blue-700 font-mono">DATABASE_URL</code>
          is set in environment variables.
        </div>
        <button onClick={() => { setApiError(false); setLoading(true); window.location.reload(); }}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition">
          Retry
        </button>
      </div>
    </div>
  );

  const vulns    = data?.stats?.vulnerabilities || {};
  const audits   = data?.stats?.audits          || {};
  const sla      = data?.stats?.sla             || {};
  const servers  = data?.topServers             || [];
  const trend    = data?.monthlyTrend           || [];
  const contract = data?.contract;
  const displayName = clientName || data?.client?.name || '';

  const contractStr = (() => {
    if (!contract) return null;
    const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const sd = contract.start_date || contract.startDate;
    const ed = contract.end_date   || contract.endDate;
    if (!sd && !ed) return null;
    return `${fmt(sd)} → ${fmt(ed)}`;
  })();

  const critical = vulns.critical || 0, high = vulns.high || 0, medium = vulns.medium || 0, low = vulns.low || 0;
  const totalOpen = critical + high + medium + low;

  const breachBase = critical * 500000 + high * 150000 + medium * 50000;
  const breachLow  = breachBase * 0.8, breachHigh = breachBase * 1.2;
  const fmtMillion = v => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

  const sevData = [
    { label: 'Critical', value: critical, color: C.critical },
    { label: 'High',     value: high,     color: C.high     },
    { label: 'Medium',   value: medium,   color: C.medium   },
    { label: 'Low',      value: low,      color: C.low      },
  ];

  const slaSegments = [
    { label: 'Overdue',    value: sla.overdue    || 0, color: C.critical },
    { label: 'On Track',   value: sla.on_track   || 0, color: C.accent   },
    { label: 'Remediated', value: sla.remediated || 0, color: C.low      },
  ];

  const maxSrv = Math.max(...servers.map(s => parseInt(s.total, 10)), 1);
  const recentAudits = data?.recentAudits || [];

  const slaTargets = [
    { label: 'Critical', detectTarget: 1,  mitigateTarget: 7,  detectActual: 2,  mitigateActual: 10, color: C.critical },
    { label: 'High',     detectTarget: 3,  mitigateTarget: 14, detectActual: 4,  mitigateActual: 18, color: C.high     },
    { label: 'Medium',   detectTarget: 7,  mitigateTarget: 30, detectActual: 9,  mitigateActual: 28, color: C.medium   },
    { label: 'Low',      detectTarget: 14, mitigateTarget: 60, detectActual: 12, mitigateActual: 55, color: C.low      },
  ];

  const maxExposure = Math.max(...BUSINESS_ASSETS.map(a => a.likelihood * a.cost), 1);
  const selAsset = BUSINESS_ASSETS[selectedAsset];
  const likelihoodColor = (l) => l > 0.7 ? C.critical : l >= 0.4 ? C.high : C.medium;

  const maturityTrend = [
    { month: 'Nov', value: 2.4 }, { month: 'Dec', value: 2.5 }, { month: 'Jan', value: 2.6 },
    { month: 'Feb', value: 2.7 }, { month: 'Mar', value: 2.8 }, { month: 'Apr', value: 3.0 },
    { month: 'May', value: 3.1 }, { month: 'Jun', value: 3.2 },
  ];
  const breachTrend = [
    { month: 'Nov', value: 8.5 }, { month: 'Dec', value: 8.1 }, { month: 'Jan', value: 7.8 },
    { month: 'Feb', value: 7.2 }, { month: 'Mar', value: 6.9 }, { month: 'Apr', value: 6.4 },
    { month: 'May', value: 5.9 }, { month: 'Jun', value: 5.5 },
  ];
  const exposureTrend = [
    { month: 'Nov', value: 18.2 }, { month: 'Dec', value: 17.5 }, { month: 'Jan', value: 16.8 },
    { month: 'Feb', value: 15.9 }, { month: 'Mar', value: 15.2 }, { month: 'Apr', value: 14.0 },
    { month: 'May', value: 13.1 }, { month: 'Jun', value: 12.5 },
  ];

  return (
    <div ref={dashboardRef} className="p-6 space-y-6 bg-slate-50 min-h-full font-sans text-slate-900">

      {/* Section A: Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">Security Overview</div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{displayName || 'vCISO Dashboard'}</div>
          {contractStr && (
            <div className="text-xs mt-1.5 flex items-center gap-1.5 text-slate-500">
              <span>📅</span>
              <span>Contract: <strong className="text-slate-800 font-semibold">{contractStr}</strong></span>
            </div>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Open Vulns',    value: totalOpen,        color: C.critical, bg: 'bg-red-50', border: 'border-red-200' },
            { label: 'Active Audits', value: audits.active||0, color: C.accent,   bg: 'bg-blue-50', border: 'border-blue-200' },
            { label: 'Overdue SLA',   value: sla.overdue||0,   color: C.high,     bg: 'bg-amber-50', border: 'border-amber-200' },
          ].map(item => (
            <div key={item.label} className={`text-center px-4 py-2.5 rounded-xl border ${item.bg} ${item.border}`}>
              <div className="text-xl font-bold tabular-nums" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section A2: Info Accordion Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Company Details Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={toggleCompany}
            className={`w-full flex items-center justify-between px-5 py-4 transition text-left ${companyOpen ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🏢</span>
              <span className="font-bold text-slate-900 text-sm">Company Details</span>
            </div>
            <span className="text-xs font-bold text-slate-400 transition-transform duration-200" style={{ transform: companyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {companyOpen && (
            <div className="px-5 pb-5 pt-2 space-y-3 border-t border-slate-100 bg-white">
              {companyLoading ? (
                <div className="text-xs py-3 text-center text-slate-400">Loading…</div>
              ) : companyInfo && Object.keys(companyInfo).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
                  {[
                    ['Company Name',    companyInfo.company_name],
                    ['Legal Name',      companyInfo.legal_name],
                    ['Industry',        companyInfo.industry],
                    ['Company Size',    companyInfo.company_size],
                    ['Headquarters',    companyInfo.headquarters],
                    ['Timezone',        companyInfo.timezone],
                    ['Website',         companyInfo.website],
                    ['Primary Domain',  companyInfo.primary_domain],
                    ['Cloud Provider',  companyInfo.cloud_provider],
                    ['Description',     companyInfo.description],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</div>
                      <div className="text-xs font-semibold text-slate-800 break-words">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs py-3 text-center text-slate-400">No company details on file yet.</div>
              )}
            </div>
          )}
        </div>

        {/* Escalation Matrix Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={toggleEscalation}
            className={`w-full flex items-center justify-between px-5 py-4 transition text-left ${escalationOpen ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              <span className="font-bold text-slate-900 text-sm">Escalation Matrix</span>
            </div>
            <span className="text-xs font-bold text-slate-400 transition-transform duration-200" style={{ transform: escalationOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {escalationOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-white">
              {contactsLoading ? (
                <div className="text-xs py-3 text-center text-slate-400">Loading…</div>
              ) : contacts && contacts.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {contacts.map((c, i) => (
                    <div key={i} className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {c.contact_type?.replace(/_/g, ' ') || 'Contact'}
                        </span>
                        {(c.full_name || c.name) && <span className="font-bold text-xs text-slate-900">{c.full_name || c.name}</span>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {[
                          ['Designation', c.designation || c.title],
                          ['Department',  c.department],
                          ['Email',       c.email],
                          ['Mobile',      c.mobile || c.phone],
                          ['Availability',c.availability],
                          ['Notes',       c.notes],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}: </span>
                            <span className="text-xs font-medium text-slate-700">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs py-3 text-center text-slate-400">No contacts on file yet.</div>
              )}
            </div>
          )}
        </div>

        {/* My Dashboard Access Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={toggleAccess}
            className={`w-full flex items-center justify-between px-5 py-4 transition text-left ${accessOpen ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🔑</span>
              <span className="font-bold text-slate-900 text-sm">My Dashboard Access</span>
            </div>
            <span className="text-xs font-bold text-slate-400 transition-transform duration-200" style={{ transform: accessOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {accessOpen && (
            <div className="pb-3 border-t border-slate-100 bg-white">
              {myPermissions === null ? (
                <div className="text-xs py-4 text-center text-slate-400">Loading…</div>
              ) : myPermissions.length > 0 ? (() => {
                const grouped = {};
                myPermissions.forEach(p => {
                  const [sec, ...rest] = p.split(':');
                  const item = rest.join(':');
                  if (!grouped[sec]) grouped[sec] = [];
                  if (item) grouped[sec].push(item);
                });
                return (
                  <div className="divide-y divide-slate-100">
                    {Object.entries(grouped).map(([sec, items]) => {
                      const meta = SECTION_META[sec] || { label: sec, icon: '📌' };
                      return (
                        <div key={sec} className="px-5 py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{meta.icon}</span>
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{meta.label}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto bg-blue-50 text-blue-700 border border-blue-200">
                              {items.length} item{items.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map(item => (
                              <span key={item} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                <div className="text-xs py-4 text-center text-slate-400">
                  No sections assigned yet. Contact your admin to configure access.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section B: KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <StatCard label="Critical" value={critical} color={C.critical}
          sub={`${Math.round(totalOpen > 0 ? (critical / totalOpen) * 100 : 0)}% of open findings`}
          onClick={() => navigate('/dashboard/vciso/vulnerabilities')} />
        <StatCard label="High" value={high} color={C.high}
          sub={`MTTR: ${vulns.mttr_days || 14} days`}
          onClick={() => navigate('/dashboard/vciso/vulnerabilities')} />
        <StatCard label="Medium" value={medium} color={C.medium}
          sub="Requires attention"
          onClick={() => navigate('/dashboard/vciso/vulnerabilities')} />
        <StatCard label="Low" value={low} color={C.low}
          sub="Monitor and track"
          onClick={() => navigate('/dashboard/vciso/vulnerabilities')} />
        <div className="bg-white rounded-2xl p-5 text-left border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Cost of Breach</div>
          <div className="text-xl font-black tabular-nums text-blue-600">
            {fmtMillion(breachLow)}–{fmtMillion(breachHigh)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Estimated range ±20%</div>
        </div>
        <div className="bg-white rounded-2xl p-5 text-left border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Total Exposure</div>
          <div className="text-3xl font-black tabular-nums text-slate-900">{totalOpen}</div>
          <div className="text-xs text-slate-400 mt-1">All severities</div>
        </div>
      </div>

      {/* Section C: Row of 3 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Vulnerability by Severity</div>
          <div className="flex items-center gap-4">
            <DonutChart segments={sevData} />
            <div className="flex-1 space-y-2.5">
              {sevData.map(seg => {
                const pct = totalOpen > 0 ? Math.round((seg.value / totalOpen) * 100) : 0;
                return (
                  <div key={seg.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
                      <span className="text-xs font-medium text-slate-700">{seg.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: seg.color }}>{seg.value} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Vulnerability Trend</div>
          <TrendArea data={trend} color={C.accent} />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">By Application / Asset</div>
          {servers.slice(0, 5).map(s => {
            const total = parseInt(s.total, 10) || 0;
            const crit  = parseInt(s.critical, 10) || 0;
            const h     = parseInt(s.high, 10) || 0;
            const color = crit > 0 ? C.critical : h > 0 ? C.high : C.accent;
            return <HBar key={s.asset} label={s.asset} value={total} max={maxSrv} color={color} />;
          })}
        </div>
      </div>

      {/* Section D: Row of 2 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Time to Detect vs Mitigate (days)
          </div>
          <div className="space-y-4">
            {slaTargets.map(item => {
              const maxD = Math.max(item.detectTarget, item.detectActual) * 1.2;
              const maxM = Math.max(item.mitigateTarget, item.mitigateActual) * 1.2;
              return (
                <div key={item.label}>
                  <div className="text-xs font-bold mb-1" style={{ color: item.color }}>{item.label}</div>
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-500">Detect: actual {item.detectActual}d / target {item.detectTarget}d</span>
                        <span className="font-bold" style={{ color: item.detectActual <= item.detectTarget ? C.low : C.critical }}>
                          {item.detectActual <= item.detectTarget ? '✓ On-track' : '✗ Overdue'}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full" style={{ width: `${(item.detectActual / maxD) * 100}%`, background: item.color }} />
                        <div className="absolute top-0 h-2 w-0.5 rounded-full bg-slate-400" style={{ left: `${(item.detectTarget / maxD) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-500">Mitigate: actual {item.mitigateActual}d / target {item.mitigateTarget}d</span>
                        <span className="font-bold" style={{ color: item.mitigateActual <= item.mitigateTarget ? C.low : C.critical }}>
                          {item.mitigateActual <= item.mitigateTarget ? '✓ On-track' : '✗ Overdue'}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full" style={{ width: `${(item.mitigateActual / maxM) * 100}%`, background: item.color }} />
                        <div className="absolute top-0 h-2 w-0.5 rounded-full bg-slate-400" style={{ left: `${(item.mitigateTarget / maxM) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">SLA Compliance</div>
          <div className="flex items-center gap-5">
            <DonutChart segments={slaSegments} />
            <div className="flex-1 space-y-3.5">
              {slaSegments.map(seg => {
                const tot = slaSegments.reduce((s, x) => s + x.value, 0);
                const pct = tot > 0 ? Math.round((seg.value / tot) * 100) : 0;
                return (
                  <div key={seg.label}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
                        <span className="text-xs font-medium text-slate-700">{seg.label}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: seg.color }}>
                        {seg.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: seg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section E: Exposure Distribution */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Exposure Distribution</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><ScatterPlot assets={BUSINESS_ASSETS} /></div>
          <div className="space-y-2.5">
            {BUSINESS_ASSETS.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.color }} />
                <span className="font-medium text-slate-800">{a.name}</span>
                <span className="ml-auto font-bold text-[11px]" style={{ color: a.color }}>L:{(a.likelihood * 100).toFixed(0)}% · C:${a.cost}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section F: Business Assets Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Business Assets by Importance</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {['Business Asset', 'Importance', 'Likelihood', 'Cost of Breach', 'Exposure ($)'].map(h => (
                  <th key={h} className="pb-3 text-left font-bold uppercase tracking-wider text-slate-400 text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BUSINESS_ASSETS.map((a, i) => {
                const exposure = a.likelihood * a.cost;
                const lColor = likelihoodColor(a.likelihood);
                return (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-semibold text-slate-900">{a.name}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${a.color}15`, color: a.color }}>#{a.rank}</span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${lColor}15`, color: lColor }}>
                        {(a.likelihood * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-800">${a.cost}M</td>
                    <td className="py-3 font-black text-blue-600">${exposure.toFixed(2)}M</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section G: Asset Exposure bars + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Business Asset Exposure</div>
          {BUSINESS_ASSETS.map((a, i) => {
            const exposure = a.likelihood * a.cost;
            return (
              <button key={i} onClick={() => setSelectedAsset(i)} className="w-full text-left focus:outline-none">
                <HBar label={a.name} value={`$${exposure.toFixed(2)}M`} max={maxExposure} color={a.color} />
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Asset Detail</div>
          {selAsset && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-slate-900">{selAsset.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Importance Rank #{selAsset.rank}</div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${selAsset.color}15`, color: selAsset.color, border: `1px solid ${selAsset.color}30` }}>
                  {likelihoodColor(selAsset.likelihood) === C.critical ? 'Critical Risk' : likelihoodColor(selAsset.likelihood) === C.high ? 'High Risk' : 'Medium Risk'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Likelihood</div>
                  <div className="text-2xl font-black" style={{ color: likelihoodColor(selAsset.likelihood) }}>
                    {(selAsset.likelihood * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cost of Breach</div>
                  <div className="text-2xl font-black text-amber-600">${selAsset.cost}M</div>
                </div>
              </div>
              <div className="rounded-xl p-4 bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Total Exposure</div>
                <div className="text-3xl font-black text-blue-700">${(selAsset.likelihood * selAsset.cost).toFixed(2)}M</div>
                <div className="text-xs text-slate-500 mt-1">Likelihood × Cost of Breach</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section H: Threat → Asset Sankey */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Threat → Asset Likelihood</div>
        <div className="flex items-center gap-4 mb-3">
          {[{ label: 'High (>0.6)', color: C.critical }, { label: 'Medium (0.4–0.6)', color: C.high }, { label: 'Low (<0.4)', color: '#94A3B8' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-4 h-1 rounded" style={{ background: l.color }} />
              <span className="text-[11px] text-slate-500 font-medium">{l.label}</span>
            </div>
          ))}
        </div>
        <SankeyViz connections={SANKEY_CONNECTIONS} threats={THREATS} assets={ASSET_NAMES} />
      </div>

      {/* Section I: Business Value / Risk Quantification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Organization Maturity</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              NIST CSF v2.0
            </span>
          </div>
          {[
            { label: 'Identify', score: data?.stats?.nist?.identify || 2.7, target: 3.5 },
            { label: 'Protect',  score: data?.stats?.nist?.protect  || 2.8, target: 3.5 },
            { label: 'Detect',   score: data?.stats?.nist?.detect   || 2.7, target: 3.5 },
            { label: 'Respond',  score: data?.stats?.nist?.respond  || 4.0, target: 3.5 },
            { label: 'Recover',  score: data?.stats?.nist?.recover  || 3.2, target: 3.5 },
          ].map(n => <NistBar key={n.label} {...n} />)}
          <div className="mt-3 pt-3 flex justify-between text-[10px] border-t border-slate-100 text-slate-400 font-medium">
            <span>0</span><span>Industry avg: 2.7</span><span>Target: 3.5</span><span>5</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Mitigation Optimization</div>
          <MitigationFunnel />
          <div className="mt-3 text-xs text-center text-slate-500 font-medium">
            Focus on <span className="font-bold text-blue-600">10 critical attack paths</span> to eliminate maximum risk
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Trends</div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-700">Organization Maturity</span>
                <span className="text-xs font-black text-emerald-600">3.2</span>
              </div>
              <TrendArea data={maturityTrend} color={C.low} compact />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-700">Cost of Breach ($M)</span>
                <span className="text-xs font-black text-amber-600">5.5M</span>
              </div>
              <TrendArea data={breachTrend} color={C.high} compact />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-700">Exposure ($M)</span>
                <span className="text-xs font-black text-blue-600">12.5M</span>
              </div>
              <TrendArea data={exposureTrend} color={C.accent} compact />
            </div>
          </div>
        </div>
      </div>

      {/* Audit + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Audit Summary</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active Audits',  value: audits.active       || 0, color: C.accent,   bg: 'bg-blue-50', border: 'border-blue-200' },
              { label: 'Total Findings', value: audits.findings      || 0, color: C.high,     bg: 'bg-orange-50', border: 'border-orange-200' },
              { label: 'Overdue CARs',   value: audits.overdue_cars  || 0, color: C.critical, bg: 'bg-red-50', border: 'border-red-200' },
              { label: 'Critical Items', value: audits.critical      || 0, color: C.medium,   bg: 'bg-amber-50', border: 'border-amber-200' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate('/dashboard/vciso/audits')}
                className={`rounded-xl p-3.5 text-left hover:shadow-sm transition ${item.bg} border ${item.border}`}>
                <div className="text-2xl font-black tabular-nums" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Business Assets Risk Ranking</div>
          {BUSINESS_ASSETS.map(a => (
            <RiskRow key={a.rank} rank={a.rank} label={a.name}
              likelihood={Math.round(a.likelihood * 100)}
              exposure={`$${(a.likelihood * a.cost).toFixed(2)}M`}
              color={a.color} />
          ))}
        </div>
      </div>

      {recentAudits.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Compliance Health by Framework</div>
          <div className="space-y-3.5">
            {recentAudits.map(audit => {
              const total = (parseInt(audit.findings, 10) || 0) + (parseInt(audit.critical, 10) || 0) + (parseInt(audit.major, 10) || 0) + 10;
              const passed = Math.max(0, total - (parseInt(audit.findings, 10) || 0) - (parseInt(audit.critical, 10) || 0));
              const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
              const color = pct >= 70 ? C.low : pct >= 40 ? C.medium : C.critical;
              return (
                <div key={audit.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[200px]">{audit.framework}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{audit.status}</span>
                      <span className="text-xs font-black tabular-nums" style={{ color }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Quick Actions</div>
        <div className="flex flex-wrap gap-3">
          {[
            { icon: '🐛', label: 'Log Vulnerability', path: 'security/vulnerability-management', bg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
            { icon: '📋', label: 'Start Audit',        path: 'audit/iso-27001',                  bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
            { icon: '🚨', label: 'Raise Incident',     path: 'security/incident-response',        bg: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
            { icon: '📄', label: 'Generate Report',    path: 'reporting',                         bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
          ].map(action => (
            <button key={action.label} onClick={() => navigate(`/dashboard/vciso/${action.path}`)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border shadow-sm ${action.bg}`}>
              <span className="text-sm">{action.icon}</span>{action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section J: Export PDF button */}
      <button onClick={exportPDF} disabled={exporting}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition z-50 disabled:opacity-50">
        {exporting ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📄'}
        {exporting ? 'Exporting…' : 'Export PDF Report'}
      </button>
    </div>
  );
}
