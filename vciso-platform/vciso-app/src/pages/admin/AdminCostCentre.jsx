import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { useAdminData } from '../../contexts/AdminDataContext';
import { th } from '../../theme';

/* ─── Design tokens ─────────────────────────────────────── */
const C = {
  bg: th('#F8FAFC', { dark: '#0F172A' }), card: th('#FFFFFF', { dark: '#1E293B' }), border: th('#E2E8F0', { dark: '#334155' }),
  teal: th('#2563EB', { dark: '#60A5FA' }), purple: '#7C3AED', muted: th('#64748B', { dark: '#94A3B8' }), white: th('#0F172A', { dark: '#F1F5F9' }),
  red: '#EF4444', yellow: '#F59E0B', green: '#10B981', blue: '#0284C7',
  orange: '#F97316',
};

/* ─── Helpers ───────────────────────────────────────────── */
const f$ = (n) => '$' + Math.floor(Number(n || 0)).toLocaleString('en-US');
const fmtDate = (s) => {
  try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
};
const genInvNum = () => `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TABS = ['Cost Summary', 'Cost Breakdown', 'Invoice Generator', 'Framework Costing', 'Integration Costing', 'User Licensing', 'Billing History'];

/* ─── Tiny components ───────────────────────────────────── */
function Badge({ label, color }) {
  return (
    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wider capitalize" style={{ background: `${color}15`, color, borderColor: `${color}30` }}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center items-center h-52">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function KpiCard({ icon, label, value, borderColor }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
      style={{ borderLeft: borderColor ? `4px solid ${borderColor}` : undefined }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    </div>
  );
}

/* ─── SVG: Horizontal bar chart (Cost Distribution) ─────── */
function CostDistributionChart({ costs }) {
  const items = [
    { label: 'Dashboard', value: Math.floor(costs.dashboardCost || 0), color: th('#2563EB', { dark: '#60A5FA' }) },
    { label: 'Integrations', value: Math.floor(costs.integrationCost || 0), color: '#7C3AED' },
    { label: 'Frameworks', value: Math.floor(costs.frameworkCost || 0), color: '#F97316' },
    { label: 'Security Tools', value: Math.floor(costs.securityToolCost || 0), color: '#EF4444' },
    { label: 'Audits', value: Math.floor(costs.auditCost || 0), color: '#F59E0B' },
  ];
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const W = 480, H = 200, lw = 110, rp = 120, barH = 18, gap = 22;

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      {items.map((item, i) => {
        const pct = item.value / total;
        const maxBarW = W - lw - rp - 20;
        const bw = Math.max(pct * maxBarW, 2);
        const y = 20 + i * (barH + gap);
        return (
          <g key={item.label}>
            <text x={lw - 8} y={y + barH / 2 + 5} fill={th('#64748B', { dark: '#94A3B8' })} fontSize="12" fontWeight="500" textAnchor="end">{item.label}</text>
            <rect x={lw} y={y} width={maxBarW} height={barH} rx="4" fill="#F1F5F9" />
            <rect x={lw} y={y} width={bw} height={barH} rx="4" fill={item.color} />
            <text x={lw + maxBarW + 8} y={y + barH / 2 + 5} fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="12" fontWeight="700">{f$(item.value)}</text>
            <text x={lw + maxBarW + 75} y={y + barH / 2 + 5} fill={th('#64748B', { dark: '#94A3B8' })} fontSize="11">{Math.round(pct * 100)}%</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── SVG: Monthly cost trend line chart ─────────────────── */
function TrendLineChart({ grandTotal }) {
  const now = new Date();
  const points = Array.from({ length: 6 }, (_, i) => {
    const mIdx = (now.getMonth() - 5 + i + 12) % 12;
    const variation = 0.85 + Math.random() * 0.3;
    return { month: MONTHS[mIdx], value: Math.floor(grandTotal * variation) };
  });
  const W = 420, H = 180;
  const pad = { top: 20, right: 20, bottom: 30, left: 55 };
  const w = W - pad.left - pad.right;
  const h = H - pad.top - pad.bottom;
  const vals = points.map(p => p.value);
  const minV = Math.min(...vals) * 0.9;
  const maxV = Math.max(...vals) * 1.05;
  const range = maxV - minV || 1;
  const scaleX = (i) => pad.left + (i / (points.length - 1)) * w;
  const scaleY = (v) => pad.top + h - ((v - minV) / range) * h;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.value)}`).join(' ');
  const areaD = `${pathD} L ${scaleX(points.length - 1)} ${pad.top + h} L ${pad.left} ${pad.top + h} Z`;

  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={th('#2563EB', { dark: '#60A5FA' })} stopOpacity="0.2" />
          <stop offset="100%" stopColor={th('#2563EB', { dark: '#60A5FA' })} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f, i) => {
        const v = Math.floor(minV + f * range);
        const y = pad.top + (1 - f) * h;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + w} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4,4" />
            <text x={pad.left - 6} y={y + 4} fill="#94A3B8" fontSize="10" textAnchor="end">{v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#trendGrad)" />
      <path d={pathD} fill="none" stroke={th('#2563EB', { dark: '#60A5FA' })} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={scaleX(i)} cy={scaleY(p.value)} r="4" fill={th('#2563EB', { dark: '#60A5FA' })} stroke="#FFFFFF" strokeWidth="2" />
          <text x={scaleX(i)} y={pad.top + h + 18} fill={th('#64748B', { dark: '#94A3B8' })} fontSize="10" textAnchor="middle">{p.month}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── SVG: Donut chart ───────────────────────────────────── */
function DonutChart({ users }) {
  const segments = [
    { label: 'Internal', value: users.internal, color: th('#2563EB', { dark: '#60A5FA' }) },
    { label: 'External', value: users.external, color: '#7C3AED' },
    { label: 'Partner', value: users.partner, color: '#F97316' },
    { label: 'vCISO', value: users.vciso, color: '#0284C7' },
    { label: 'Directors', value: users.directors, color: '#10B981' },
  ];
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const cx = 90, cy = 90, R = 70, r = 42;
  let startAngle = -Math.PI / 2;
  const arcs = segments.map(seg => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(startAngle + angle);
    const y2 = cy + R * Math.sin(startAngle + angle);
    const xi1 = cx + r * Math.cos(startAngle);
    const yi1 = cy + r * Math.sin(startAngle);
    const xi2 = cx + r * Math.cos(startAngle + angle);
    const yi2 = cy + r * Math.sin(startAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;
    const result = { ...seg, d, startAngle };
    startAngle += angle;
    return result;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="180" height="180">
        {arcs.map(arc => <path key={arc.label} d={arc.d} fill={arc.color} />)}
        <text x={cx} y={cy - 4} fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="20" fontWeight="800" textAnchor="middle">{total}</text>
        <text x={cx} y={cy + 14} fill={th('#64748B', { dark: '#94A3B8' })} fontSize="11" fontWeight="500" textAnchor="middle">total users</text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600 text-xs min-w-[60px] font-medium">{s.label}</span>
            <span className="text-slate-900 font-bold text-xs">{s.value}</span>
            <span className="text-slate-400 text-[11px]">({Math.round(s.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Collapsible section ───────────────────────────────── */
function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 overflow-hidden">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex justify-between items-center px-5 py-4 cursor-pointer select-none bg-white hover:bg-slate-50 transition border-b border-slate-100"
      >
        <span className="font-bold text-sm text-slate-900">{title}</span>
        <span className={`text-slate-400 font-bold text-base transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}>▾</span>
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

/* ─── TABLE helper ──────────────────────────────────────── */
function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map(h => (
              <th key={h} className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/70 transition">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-xs text-slate-700 align-middle font-medium">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Toast ─────────────────────────────────────────────── */
function Toast({ msg, color = '#10B981', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-center gap-3 text-xs font-bold text-slate-900">
      <span style={{ color }}>{msg}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-base">×</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function AdminCostCentre() {
  const { getToken, user } = useAuth();
  const hdr = () => ({ Authorization: `Bearer ${getToken()}` });

  const { engineData, userCounts, loading: engineLoading, error: engineError, selectedClientId, setSelectedClientId, currentClient, allClients } = useAdminData();

  const [activeTab, setActiveTab] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Integration quantities (keyed by name, for interactive adjustment)
  const [qtys, setQtys] = useState({});

  // Invoice fields
  const [invNum] = useState(genInvNum);
  const [taxRate, setTaxRate] = useState(18);
  const [invoiceAddr, setInvoiceAddr] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Billing history filters
  const [billFilter, setBillFilter] = useState('All');
  const [billSearch, setBillSearch] = useState('');
  const [billPage, setBillPage] = useState(1);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState(-1);

  // Seed qtys from currentClient integrations when client changes
  useEffect(() => {
    if (currentClient?.integrations) {
      const q = {};
      currentClient.integrations.forEach(i => { q[i.name] = i.qty; });
      setQtys(q);
    }
  }, [currentClient]);

  /* ── Fetch billing history ── */
  useEffect(() => {
    if (activeTab !== 6 || !selectedClientId) return;
    setInvoicesLoading(true);
    fetch(`/api/admin-portal/invoices?client_id=${selectedClientId}`, { headers: hdr() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  }, [activeTab, selectedClientId]);

  /* ── Derived values ── */
  const clients = allClients.length ? allClients : (engineData?.clients || []);

  if (!engineLoading && !currentClient) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-xl mx-auto">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-base font-bold text-slate-900 mb-1">No onboarding data available</div>
        <div className="text-xs text-slate-500">Clients need to complete onboarding before cost data is available.</div>
        {engineError && <div className="text-xs text-red-600 mt-2 font-medium">{engineError}</div>}
      </div>
    );
  }

  const d = currentClient || {
    users: { internal: 0, external: 0, partner: 0, vciso: 0, directors: 0, total: 0 },
    costs: { dashboardPerUser: 100, dashboardCost: 0, integrationPerUnit: 35, integrationCount: 0, integrationCost: 0, frameworkCost: 0, securityModuleCost: 0, securityToolCost: 0, auditCost: 0, grandTotal: 0 },
    frameworks: [], integrations: [], securityTools: [], audits: [],
    companyName: '',
  };

  // Live integration total (from qtys state)
  const liveIntegrations = (d.integrations || []).map(i => ({
    ...i,
    qty: qtys[i.name] !== undefined ? qtys[i.name] : i.qty,
    total: (qtys[i.name] !== undefined ? qtys[i.name] : i.qty) * 35,
  }));
  const liveIntegrationCount = liveIntegrations.reduce((a, i) => a + i.qty, 0);
  const liveIntegrationCost = liveIntegrations.reduce((a, i) => a + i.total, 0);

  const liveGrandTotal = Math.floor(
    (d.costs.dashboardCost || 0) +
    liveIntegrationCost +
    (d.costs.frameworkCost || 0) +
    (d.costs.securityModuleCost || 0) +
    (d.costs.securityToolCost || 0) +
    (d.costs.auditCost || 0)
  );

  /* ══ TAB 1: COST SUMMARY ══════════════════════════════════ */
  function TabCostSummary() {
    return (
      <div className="space-y-6">
        {/* Row 1: 4 KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="👥" label="Total Users" value={d.users.total} borderColor={th('#2563EB', { dark: '#60A5FA' })} />
          <KpiCard icon="💻" label="Dashboard Cost" value={f$(d.costs.dashboardCost)} borderColor="#7C3AED" />
          <KpiCard icon="🔗" label="Integration Cost" value={f$(liveIntegrationCost)} borderColor="#0284C7" />
          <KpiCard icon="📋" label="Framework Cost" value={f$(d.costs.frameworkCost)} borderColor="#F97316" />
        </div>
        {/* Row 2: 3 KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard icon="🛡️" label="Security Tool Cost" value={f$(d.costs.securityToolCost)} borderColor="#EF4444" />
          <KpiCard icon="🔍" label="Audit Cost" value={f$(d.costs.auditCost)} borderColor="#F59E0B" />
          {/* Grand total card */}
          <div className="bg-emerald-50/70 border border-emerald-200 border-l-4 border-l-emerald-500 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Grand Total (Monthly)</span>
              <span className="text-xl">💰</span>
            </div>
            <div className="text-3xl font-black text-emerald-900 tracking-tight">{f$(liveGrandTotal)}</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">All categories combined</div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="font-bold text-sm text-slate-900 mb-4">📊 Cost Distribution</div>
            <CostDistributionChart costs={{ ...d.costs, integrationCost: liveIntegrationCost, grandTotal: liveGrandTotal }} />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="font-bold text-sm text-slate-900 mb-4">📈 Monthly Cost Trend</div>
            <TrendLineChart grandTotal={liveGrandTotal} />
          </div>
        </div>
      </div>
    );
  }

  /* ══ TAB 2: COST BREAKDOWN ════════════════════════════════ */
  function TabCostBreakdown() {
    return (
      <div className="space-y-4">
        {/* Dashboard Licensing */}
        <Collapsible title="💻 Dashboard Licensing">
          <DataTable
            headers={['User Type', 'Count', 'Cost Per User', 'Total']}
            rows={[
              [<span className="font-bold text-slate-900">Internal Users</span>, d.users.internal, '$100', f$(d.users.internal * 100)],
              [<span className="font-bold text-slate-900">External Users</span>, d.users.external, '$100', f$(d.users.external * 100)],
              [<span className="font-bold text-slate-900">Partner Users</span>, d.users.partner, '$100', f$(d.users.partner * 100)],
              [<span className="font-bold text-slate-900">vCISO Users</span>, d.users.vciso, '$100', f$(d.users.vciso * 100)],
              [<span className="font-bold text-slate-900">Directors</span>, d.users.directors, '$100', f$(d.users.directors * 100)],
            ]}
          />
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between font-bold text-xs">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-500">{d.users.total} users</span>
            <span className="text-slate-500">$100/user</span>
            <span className="text-blue-600">{f$(d.costs.dashboardCost)}</span>
          </div>
        </Collapsible>

        {/* Integration Costs */}
        <Collapsible title="🔗 Integration Costs">
          <DataTable
            headers={['Integration Name', 'Category', 'Qty', 'Cost/Unit', 'Total']}
            rows={liveIntegrations.map(i => [
              <span className="font-bold text-slate-900">{i.name}</span>,
              <Badge label={i.category} color="#0284C7" />,
              i.qty,
              f$(i.cost),
              <span className="text-blue-600 font-bold">{f$(i.total)}</span>,
            ])}
          />
          <div className="text-slate-500 text-xs mt-3 border-t border-slate-100 pt-2 font-medium">
            Total Integrations: <strong className="text-slate-900">{liveIntegrationCount}</strong> · Total Cost: <strong className="text-blue-600">{f$(liveIntegrationCost)}</strong>
          </div>
        </Collapsible>

        {/* Framework Costs */}
        <Collapsible title="📋 Framework Costs">
          <div className="text-slate-500 text-xs mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            ℹ️ Floor rounded — e.g. 5.6 → 5, 2.9 → 2
          </div>
          <DataTable
            headers={['Framework', 'Monthly Cost', 'Annual Cost', 'Audit Cost', 'Maintenance', 'Total Annual']}
            rows={(d.frameworks || []).map(fw => [
              <span className="font-bold text-slate-900">{fw.name}</span>,
              f$(Math.floor(fw.monthlyCost)),
              f$(Math.floor(fw.monthlyCost * 12)),
              f$(Math.floor(fw.auditCost)),
              f$(Math.floor(fw.maintenance)),
              <span className="text-blue-600 font-bold">{f$(Math.floor(fw.totalAnnual))}</span>,
            ])}
          />
        </Collapsible>

        {/* Security Tools */}
        <Collapsible title="🛡️ Security Tools">
          <DataTable
            headers={['Tool', 'Module', 'Licenses', 'Cost/License', 'Total', 'Status']}
            rows={(d.securityTools || []).map(t => [
              <span className="font-bold text-slate-900">{t.name}</span>,
              t.module,
              t.licenses,
              f$(t.costPerLicense),
              <span className="text-blue-600 font-bold">{f$(t.totalCost)}</span>,
              <Badge label={t.status} color={t.status === 'active' ? '#10B981' : '#94A3B8'} />,
            ])}
          />
        </Collapsible>

        {/* Audit Costs */}
        <Collapsible title="🔍 Audit Costs">
          <DataTable
            headers={['Audit Name', 'Cost', 'Status']}
            rows={(d.audits || []).map(a => [
              <span className="font-bold text-slate-900">{a.name}</span>,
              <span className="text-blue-600 font-bold">{f$(a.cost)}</span>,
              <Badge label={a.status} color={a.status === 'completed' ? '#10B981' : a.status === 'overdue' ? '#EF4444' : '#0284C7'} />,
            ])}
          />
        </Collapsible>
      </div>
    );
  }

  /* ══ TAB 3: INVOICE GENERATOR ════════════════════════════ */
  function TabInvoiceGenerator() {
    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + 30);
    const fmtInvDate = (dt) => dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const lineItems = [
      { desc: `Dashboard Licensing (${d.users.total} users)`, qty: d.users.total, unit: 100, amount: Math.floor(d.costs.dashboardCost) },
      { desc: `Integration Suite (${liveIntegrationCount} integrations)`, qty: liveIntegrationCount, unit: 35, amount: Math.floor(liveIntegrationCost) },
      ...(d.frameworks || []).map(fw => ({
        desc: `${fw.name} — Monthly`,
        qty: 1,
        unit: Math.floor(fw.monthlyCost),
        amount: Math.floor(fw.monthlyCost),
      })),
      { desc: 'Security Tools', qty: 1, unit: Math.floor(d.costs.securityToolCost), amount: Math.floor(d.costs.securityToolCost) },
      { desc: 'Audit Services', qty: 1, unit: Math.floor(d.costs.auditCost), amount: Math.floor(d.costs.auditCost) },
    ];
    const subtotal = lineItems.reduce((a, l) => a + l.amount, 0);
    const tax = Math.floor(subtotal * taxRate / 100);
    const grandTotal = subtotal + tax;

    async function saveInvoice() {
      const body = {
        invoice_number: invNum,
        company_name: d.companyName || currentClient?.name || '',
        client_id: selectedClientId,
        address: invoiceAddr,
        email: invoiceEmail,
        notes: invoiceNotes,
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate,
        tax,
        grand_total: grandTotal,
        due_date: due.toISOString().split('T')[0],
        status: 'pending',
      };
      try {
        const r = await fetch('/api/admin-portal/invoices', {
          method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (r.ok) setToast({ msg: `Invoice ${invNum} saved!`, color: '#10B981' });
        else setToast({ msg: 'Save failed. Please try again.', color: '#EF4444' });
      } catch {
        setToast({ msg: 'Network error.', color: '#EF4444' });
      }
    }

    function exportCSV() {
      const rows = [
        ['Description', 'Qty', 'Unit Price', 'Amount'],
        ...lineItems.map(l => [l.desc, l.qty, l.unit, l.amount]),
        ['', '', 'Subtotal', subtotal],
        ['', '', `Tax (${taxRate}%)`, tax],
        ['', '', 'Grand Total', grandTotal],
      ];
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `${invNum}.csv`;
      a.click();
    }

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-3xl space-y-6">
        {/* Invoice header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>🛡️</span> <span>vCISO Platform</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Managed Security Services</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-blue-600 font-mono">{invNum}</div>
            <div className="text-xs text-slate-500 mt-1">Date: {fmtInvDate(today)}</div>
            <div className="text-xs text-slate-500">Due: {fmtInvDate(due)}</div>
            <div className="mt-1.5"><Badge label="PENDING" color="#F59E0B" /></div>
          </div>
        </div>

        {/* Bill To */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bill To</div>
          <div className="text-sm font-bold text-slate-900">{d.companyName || currentClient?.name || 'Select a client'}</div>
          <textarea
            value={invoiceAddr}
            onChange={e => setInvoiceAddr(e.target.value)}
            placeholder="Company Address"
            rows={2}
            className="w-full bg-white border border-slate-300 rounded-xl text-slate-900 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm"
          />
          <input
            type="email"
            value={invoiceEmail}
            onChange={e => setInvoiceEmail(e.target.value)}
            placeholder="Contact Email"
            className="w-full bg-white border border-slate-300 rounded-xl text-slate-900 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        {/* Line items */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 text-xs font-bold text-slate-900">{l.desc}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{l.qty}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{f$(l.unit)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-blue-600">{f$(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="min-w-[280px] space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900 font-bold">{f$(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                Tax (
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  className="w-12 bg-white border border-slate-300 rounded-md text-slate-900 text-center py-0.5 text-xs outline-none"
                />
                %)
              </span>
              <span className="text-slate-900 font-bold">{f$(tax)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="font-bold text-slate-900">Grand Total</span>
              <span className="text-xl font-black text-emerald-600">{f$(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</div>
          <textarea
            value={invoiceNotes}
            onChange={e => setInvoiceNotes(e.target.value)}
            placeholder="Payment terms, notes for client..."
            rows={3}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl text-slate-900 p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        {/* Action buttons */}
        <div className="no-print flex gap-3 pt-2">
          <button
            onClick={saveInvoice}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition"
          >
            💾 Save Invoice
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition"
          >
            🖨️ Print / Export PDF
          </button>
          <button
            onClick={exportCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition"
          >
            📊 Export Excel
          </button>
        </div>
      </div>
    );
  }

  /* ══ TAB 4: FRAMEWORK COSTING ════════════════════════════ */
  function TabFrameworkCosting() {
    const fws = d.frameworks || [];
    const totalMonthly = fws.reduce((a, f) => a + Math.floor(f.monthlyCost), 0);
    const totalAnnual = fws.reduce((a, f) => a + Math.floor(f.totalAnnual), 0);
    const totalAudit = fws.reduce((a, f) => a + Math.floor(f.auditCost), 0);

    return (
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Framework Costing</h2>
            <Badge label={`${fws.length} frameworks`} color={th('#2563EB', { dark: '#60A5FA' })} />
          </div>
          <div className="text-base font-bold text-blue-600">Total: {f$(totalMonthly)}/mo</div>
        </div>

        {fws.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs font-medium">
            No frameworks enabled for this client.
          </div>
        ) : (
          <>
            {/* Framework cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fws.map((fw, i) => {
                const pct = Math.round((Math.floor(fw.monthlyCost) / (liveGrandTotal || 1)) * 100);
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-slate-900">{fw.name}</span>
                      <Badge label="Active" color="#10B981" />
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { label: 'Monthly Cost', value: f$(Math.floor(fw.monthlyCost)), big: true },
                        { label: 'Annual Cost', value: f$(Math.floor(fw.monthlyCost * 12)) },
                        { label: 'Audit Cost', value: f$(Math.floor(fw.auditCost)) },
                        { label: 'Maintenance', value: f$(Math.floor(fw.maintenance)) },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">{row.label}</span>
                          <span className={row.big ? 'text-base font-bold text-slate-900' : 'text-slate-700 font-semibold'}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Total Annual</span>
                      <span className="text-base font-bold text-blue-600">{f$(Math.floor(fw.totalAnnual))}</span>
                    </div>
                    {/* progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>% of grand total</span>
                        <span className="text-blue-600">{pct}%</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary footer */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Frameworks', value: fws.length, color: 'text-blue-600' },
                { label: 'Total Monthly', value: f$(totalMonthly), color: 'text-slate-900' },
                { label: 'Total Annual', value: f$(totalAnnual), color: 'text-purple-600' },
                { label: 'Total Audit', value: f$(totalAudit), color: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="text-xs text-slate-400 font-medium">ℹ️ All costs are floor-rounded. Example: $5,631.6 → $5,631</div>
      </div>
    );
  }

  /* ══ TAB 5: INTEGRATION COSTING ══════════════════════════ */
  function TabIntegrationCosting() {
    const ALL_INTEGRATIONS = [
      { name: 'Vanta', category: 'Compliance Tools' },
      { name: 'Drata', category: 'Compliance Tools' },
      { name: 'Sprinto', category: 'Compliance Tools' },
      { name: 'Secureframe', category: 'Compliance Tools' },
      { name: 'CrowdStrike', category: 'Security Tools' },
      { name: 'Qualys', category: 'Security Tools' },
      { name: 'Tenable.io', category: 'Security Tools' },
      { name: 'Jira', category: 'Ticketing' },
      { name: 'ServiceNow', category: 'Ticketing' },
      { name: 'Slack', category: 'Communications' },
      { name: 'Microsoft Teams', category: 'Communications' },
      { name: 'Email', category: 'Communications' },
    ];

    // Merge live data qtys
    const mergedIntegrations = ALL_INTEGRATIONS.map(ai => {
      const existing = (d.integrations || []).find(i => i.name === ai.name);
      const q = qtys[ai.name] !== undefined ? qtys[ai.name] : (existing ? existing.qty : 0);
      return { ...ai, qty: q, cost: 35, total: q * 35 };
    });

    const categories = [...new Set(mergedIntegrations.map(i => i.category))];
    const totalQty = mergedIntegrations.reduce((a, i) => a + i.qty, 0);
    const totalCost = mergedIntegrations.reduce((a, i) => a + i.total, 0);

    const changeQty = (name, delta) => {
      setQtys(prev => ({ ...prev, [name]: Math.max(0, (prev[name] !== undefined ? prev[name] : 0) + delta) }));
    };

    const catColors = { 'Compliance Tools': th('#2563EB', { dark: '#60A5FA' }), 'Security Tools': '#EF4444', 'Ticketing': '#0284C7', 'Communications': '#10B981' };

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard icon="🔗" label="Total Integrations" value={totalQty} borderColor={th('#2563EB', { dark: '#60A5FA' })} />
          <KpiCard icon="💲" label="Cost Per Integration" value="$35" borderColor="#7C3AED" />
          <KpiCard icon="💰" label="Total Cost" value={f$(totalCost)} borderColor="#10B981" />
        </div>

        {/* Category groups */}
        {categories.map(cat => {
          const items = mergedIntegrations.filter(i => i.category === cat);
          const color = catColors[cat] || th('#2563EB', { dark: '#60A5FA' });
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-1 rounded-full" style={{ background: color }} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{cat}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(item => (
                  <div key={item.name} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-900">{item.name}</span>
                      <Badge label={item.category} color={color} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">Qty</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => changeQty(item.name, -1)} className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center justify-center transition">−</button>
                        <span className="text-slate-900 font-bold text-xs min-w-[16px] text-center">{item.qty}</span>
                        <button onClick={() => changeQty(item.name, 1)} className="w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold text-xs flex items-center justify-center transition">+</button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500">$35 × {item.qty}</span>
                      <span className="text-blue-600 font-bold">{f$(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Live formula */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-center">
          <span className="text-slate-600 text-xs font-medium">Total Integrations: </span>
          <span className="text-slate-900 font-bold text-sm">{totalQty}</span>
          <span className="text-slate-600 text-xs font-medium">  ×  $35  = </span>
          <span className="text-blue-600 font-black text-base">{f$(totalCost)}</span>
        </div>
      </div>
    );
  }

  /* ══ TAB 6: USER LICENSING ═══════════════════════════════ */
  function TabUserLicensing() {
    const u = d.users;
    const pct = (v) => u.total ? Math.round(v / u.total * 100) : 0;
    const userTypes = [
      { label: 'Internal', value: u.internal, color: th('#2563EB', { dark: '#60A5FA' }), icon: '🏢' },
      { label: 'External', value: u.external, color: '#7C3AED', icon: '🌐' },
      { label: 'Partner', value: u.partner, color: '#F97316', icon: '🤝' },
      { label: 'vCISO', value: u.vciso, color: '#0284C7', icon: '🔐' },
      { label: 'Directors', value: u.directors, color: '#10B981', icon: '👔' },
    ];
    const hasEmployees = u.total > 0;

    return (
      <div className="space-y-6">
        {!hasEmployees && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-amber-900 font-bold text-sm mb-1">No employee records found</div>
            <div className="text-amber-700 text-xs">Add employees in User Management → Onboarding to see user counts here.</div>
          </div>
        )}
        {/* Formula display */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">User Count Formula</div>
          <div className="text-slate-800 text-xs font-mono space-y-1">
            <div>Total Users = Internal + External + Partner + vCISO + Directors</div>
            <div className="text-blue-600 font-semibold">
              = {u.internal} + {u.external} + {u.partner} + {u.vciso} + {u.directors}
            </div>
            <div className="text-slate-900 font-bold text-base">= {u.total}</div>
          </div>
        </div>

        {/* User type cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {userTypes.map(ut => (
            <div key={ut.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center" style={{ borderBottom: `3px solid ${ut.color}` }}>
              <div className="text-2xl mb-1">{ut.icon}</div>
              <div className="text-xl font-black text-slate-900">{ut.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{ut.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard cost formula */}
        <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-5">
          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-2">Dashboard Cost Formula</div>
          <div className="text-slate-800 text-xs font-mono space-y-1">
            <div>Dashboard Cost = Total Users × $100/user</div>
            <div className="text-purple-600 font-semibold">= {u.total} × $100</div>
            <div className="text-slate-900 font-bold text-base">= {f$(d.costs.dashboardCost)}</div>
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm inline-block">
          <div className="font-bold text-sm text-slate-900 mb-4">User Type Distribution</div>
          <DonutChart users={u} />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <DataTable
            headers={['User Type', 'Count', '% of Total', 'Cost Contribution']}
            rows={userTypes.map(ut => [
              <span className="font-bold text-slate-900">{ut.icon} {ut.label}</span>,
              ut.value,
              `${pct(ut.value)}%`,
              <span className="text-blue-600 font-bold">{f$(ut.value * 100)}</span>,
            ])}
          />
        </div>
      </div>
    );
  }

  /* ══ TAB 7: BILLING HISTORY ══════════════════════════════ */
  function TabBillingHistory() {
    const engineInvoices = engineData?.invoices?.list || [];
    const clientInvoices = engineInvoices.filter(i => !selectedClientId || i.client_id === selectedClientId);
    const display = invoices.length ? invoices : clientInvoices;

    const totalPaid = display.filter(i => i.status === 'paid').reduce((a, i) => a + (i.amount || i.total || 0), 0);
    const totalPending = display.filter(i => i.status === 'pending').reduce((a, i) => a + (i.amount || i.total || 0), 0);
    const totalOverdue = display.filter(i => i.status === 'overdue').reduce((a, i) => a + (i.amount || i.total || 0), 0);

    const filtered = display
      .filter(i => billFilter === 'All' || i.status === billFilter.toLowerCase())
      .filter(i => !billSearch || (i.invoice_number || '').toLowerCase().includes(billSearch.toLowerCase()))
      .sort((a, b) => {
        const va = a[sortCol] || '', vb = b[sortCol] || '';
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      });

    const pages = Math.max(1, Math.ceil(filtered.length / 10));
    const paged = filtered.slice((billPage - 1) * 10, billPage * 10);

    const SortBtn = ({ col, label }) => (
      <th
        onClick={() => { if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(-1); } }}
        className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-slate-900"
      >
        {label} {sortCol === col ? (sortDir === -1 ? '↓' : '↑') : ''}
      </th>
    );

    async function markPaid(id) {
      try {
        await fetch(`/api/admin-portal/invoices/${id}`, {
          method: 'PATCH', headers: { ...hdr(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' }),
        });
        setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i));
        setToast({ msg: 'Invoice marked as paid!', color: '#10B981' });
      } catch {
        setToast({ msg: 'Update failed.', color: '#EF4444' });
      }
    }

    if (invoicesLoading) return <Spinner />;

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="📄" label="Total Invoices" value={display.length} borderColor={th('#2563EB', { dark: '#60A5FA' })} />
          <KpiCard icon="✅" label="Paid" value={f$(totalPaid)} borderColor="#10B981" />
          <KpiCard icon="⏳" label="Pending" value={f$(totalPending)} borderColor="#F59E0B" />
          <KpiCard icon="⚠️" label="Overdue" value={f$(totalOverdue)} borderColor="#EF4444" />
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={billFilter}
            onChange={e => { setBillFilter(e.target.value); setBillPage(1); }}
            className="bg-white border border-slate-300 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {['All', 'Paid', 'Pending', 'Overdue'].map(s => <option key={s}>{s}</option>)}
          </select>
          <input
            value={billSearch}
            onChange={e => { setBillSearch(e.target.value); setBillPage(1); }}
            placeholder="Search invoice #..."
            className="bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm flex-1 max-w-xs"
          />
        </div>

        {display.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-sm font-bold text-slate-900 mb-1">No invoices yet.</div>
            <div className="text-xs text-slate-500">Generate your first invoice in the Invoice Generator tab.</div>
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <SortBtn col="invoice_number" label="Invoice #" />
                    <SortBtn col="company_name" label="Company" />
                    <SortBtn col="date" label="Date" />
                    <SortBtn col="due_date" label="Due Date" />
                    <SortBtn col="amount" label="Amount" />
                    <SortBtn col="status" label="Status" />
                    <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-xs font-bold text-blue-600 font-mono">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">{inv.company_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(inv.date || inv.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">{f$(inv.amount || inv.total || 0)}</td>
                      <td className="px-4 py-3">
                        <Badge label={inv.status} color={inv.status === 'paid' ? '#10B981' : inv.status === 'overdue' ? '#EF4444' : '#F59E0B'} />
                      </td>
                      <td className="px-4 py-3">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => markPaid(inv.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-3 py-1 text-xs font-bold transition shadow-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-center gap-1.5 pt-2">
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setBillPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                      billPage === p ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ─── Render tabs ─────────────────────────────────────── */
  const TAB_COMPONENTS = [
    <TabCostSummary />,
    <TabCostBreakdown />,
    <TabInvoiceGenerator />,
    <TabFrameworkCosting />,
    <TabIntegrationCosting />,
    <TabUserLicensing />,
    <TabBillingHistory />,
  ];

  return (
    <div className="font-sans text-slate-900 space-y-6 max-w-6xl">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      {/* Page header */}
      <div className="no-print flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cost Centre</h1>
          <p className="text-xs text-slate-500 mt-0.5">Executive financial overview for managed security services</p>
        </div>
        {/* Client selector */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client</label>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[220px]"
          >
            {clients.map(c => {
              const row = userCounts?.perClient?.find(r => r.id === c.id);
              const empCount = row?.total ?? c.users?.total ?? 0;
              return (
                <option key={c.id} value={c.id}>
                  {c.name}{empCount > 0 ? ` (${empCount} users)` : ''}
                </option>
              );
            })}
          </select>
          {currentClient && (
            <span className={`text-[11px] font-bold ${currentClient.users?.total > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {currentClient.users?.total > 0 ? `✓ ${currentClient.users.total} users` : 'No employees'}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="no-print flex gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm w-fit overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === i ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {engineLoading ? <Spinner /> : TAB_COMPONENTS[activeTab]}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} color={toast.color} onClose={() => setToast(null)} />}
    </div>
  );
}
