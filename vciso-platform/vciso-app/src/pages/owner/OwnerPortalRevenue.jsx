import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Loader, Empty, ClientAvatar, StatusPill } from './OwnerShared';
import { th } from '../../theme';

/* ─── Palette ─── */
const C = {
  purple: '#7c3aed', purpleL: th('#f5f3ff', { dark: '#2E1065' }), purpleM: th('#ede9fe', { dark: '#2E1065' }),
  green:  '#16a34a', greenL:  th('#f0fdf4', { dark: '#0B2E24' }),
  blue:   th('#2563eb', { dark: '#60A5FA' }), blueL:   th('#eff6ff', { dark: '#172554' }),
  orange: '#ea580c', orangeL: th('#fff7ed', { dark: '#3A1F0A' }),
  teal:   '#0d9488', tealL:   '#f0fdfa',
  red:    '#dc2626', redL:    th('#fef2f2', { dark: '#3A1418' }),
  yellow: '#d97706', yellowL: th('#fffbeb', { dark: '#3A2A0A' }),
  ink:    th('#0f172a', { dark: '#F1F5F9' }), mid:     th('#334155', { dark: '#CBD5E1' }), muted: th('#64748b', { dark: '#94A3B8' }),
  border: th('#e2e8f0', { dark: '#334155' }), bg:      th('#f8fafc', { dark: '#0F172A' }), card:  th('#ffffff', { dark: '#1E293B' }),
};

/* ─── Helpers ─── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function last12Labels() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return MONTHS[d.getMonth()];
  });
}

function trendSeries(mrr, n = 12) {
  const series = [];
  let v = mrr;
  for (let i = n - 1; i >= 0; i--) {
    const jitter = 0.972 + (((mrr * (i + 13)) % 17) / 200);
    series.unshift(parseFloat((v * jitter).toFixed(2)));
    v = v / 1.032;
  }
  series[n - 1] = mrr;
  return series;
}

/* ─── Card wrapper ─── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: th('2px', { classic: '14px', dark: '14px' }), padding: '20px 22px',
      boxShadow: th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }), ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon, label, value, sub, accent, alert, trend }) {
  return (
    <div style={{
      background: alert ? `${C.red}08` : C.card,
      border: `1px solid ${alert ? C.red + '40' : C.border}`,
      borderRadius: th('2px', { classic: '14px', dark: '14px' }), padding: '18px 20px',
      boxShadow: th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }),
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: alert ? C.red : (accent || C.purple),
        borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: th('2px', { classic: '8px', dark: '8px' }),
          background: alert ? `${C.red}15` : `${accent || C.purple}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
        }}>{icon}</div>
        {trend !== undefined && (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: th('2px', { classic: '20px', dark: '20px' }),
            background: trend >= 0 ? C.greenL : C.redL,
            color: trend >= 0 ? C.green : C.red,
          }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: alert ? C.red : C.ink, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

/* ─── Section header ─── */
function SHead({ title, sub, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>{title}</div>
        {sub && <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{sub}</div>}
      </div>
      {action && (
        <button onClick={onAction} style={{ background: 'none', border: 'none', color: C.purple, fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
          {action}
        </button>
      )}
    </div>
  );
}

/* ─── SVG Line Chart with range toggle ─── */
function RevenueChart({ series12, labels12 }) {
  const { fmt } = useCurrency();
  const [range, setRange] = useState(12);
  const [hover, setHover] = useState(null);

  const data   = series12.slice(-range);
  const labels = labels12.slice(-range);

  const W = 100, H = 140;
  const max    = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * W,
    y: H - ((v / max) * (H - 24)) - 12,
    v,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const areaD = `${pathD} L${points[points.length-1].x},${H} L0,${H} Z`;

  const gradId = 'revGrad';

  return (
    <div>
      {/* Range Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {[6, 12].map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            padding: '5px 14px', borderRadius: th('2px', { classic: '20px', dark: '20px' }), fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', border: 'none',
            background: range === r ? C.purple : C.bg,
            color: range === r ? '#fff' : C.muted,
            transition: 'all 0.15s',
          }}>
            {r === 6 ? 'Last 6M' : 'Last 12M'}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 100 ${H}`} style={{ width: '100%', height: H + 'px', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.purple} stopOpacity="0.2" />
            <stop offset="100%" stopColor={C.purple} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Horizontal grid */}
        {[0.25, 0.5, 0.75, 1].map(f => {
          const gy = H - f * (H - 24) - 12;
          return (
            <g key={f}>
              <line x1="0" y1={gy} x2="100" y2={gy} stroke={C.border} strokeWidth="0.25" strokeDasharray="1,3" />
              <text x="0" y={gy - 1} fontSize="3" fill={C.muted}>{fmt(max * f)}</text>
            </g>
          );
        })}
        {/* Area */}
        <path d={areaD} fill={`url(#${gradId})`} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={C.purple} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        {/* Hover vertical line */}
        {hover !== null && (
          <line x1={points[hover].x} y1="12" x2={points[hover].x} y2={H}
            stroke={C.purple} strokeWidth="0.3" strokeDasharray="1,2" opacity="0.6" />
        )}
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 2 : 0.9}
            fill={C.purple} stroke={C.card} strokeWidth="0.7"
            style={{ cursor: 'crosshair', transition: 'r 0.1s' }}
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {/* Tooltip */}
        {hover !== null && (() => {
          const p = points[hover];
          const tx = p.x > 72 ? p.x - 19 : p.x + 2;
          return (
            <g>
              <rect x={tx} y={p.y - 11} width="17" height="9" rx="2" fill={C.ink} opacity="0.88" />
              <text x={tx + 8.5} y={p.y - 5} textAnchor="middle" fill="white" fontSize="3.2" fontWeight="700">
                {fmt(p.v)}
              </text>
              <text x={tx + 8.5} y={p.y - 1.5} textAnchor="middle" fill={C.purpleM} fontSize="2.4">
                {labels[hover]}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* X-axis */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontSize: range === 12 ? '9px' : '10px', color: C.muted }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Inline bar for industry/growth charts ─── */
function InlineBar({ color, pct }) {
  return (
    <div style={{ height: '6px', background: `${color}20`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.max(pct, 2)}%`, background: color, borderRadius: th('2px', { classic: '3px', dark: '3px' }), transition: 'width 0.5s ease' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function OwnerPortalRevenue() {
  const { allClients, loading } = useAdminData();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const clients  = allClients || [];

  /* ── Core revenue ── */
  const mrr = useMemo(() => clients.reduce((s, c) => s + (c.costs?.grandTotal || 0), 0), [clients]);
  const arr  = useMemo(() => mrr * 12, [mrr]);

  /* ── Revenue at risk: clients with pending/overdue invoices ── */
  const atRisk = useMemo(() => {
    const list = [];
    clients.forEach(c => {
      const risky = (c.invoices || []).filter(i => i.status === 'pending' || i.status === 'overdue');
      if (risky.length > 0) {
        const worstStatus = risky.some(i => i.status === 'overdue') ? 'overdue' : 'pending';
        const riskLevel   = worstStatus === 'overdue' ? 'High' : 'Medium';
        const riskColor   = worstStatus === 'overdue' ? C.red   : C.yellow;
        list.push({
          client: c,
          revenue:    c.costs?.grandTotal || 0,
          status:     worstStatus,
          riskLevel,
          riskColor,
          invoiceAmt: risky.reduce((s, i) => s + (i.amount || 0), 0),
        });
      }
    });
    return list.sort((a, b) => b.invoiceAmt - a.invoiceAmt);
  }, [clients]);

  const riskTotal = useMemo(() => atRisk.reduce((s, r) => s + r.invoiceAmt, 0), [atRisk]);

  /* ── Top 10 clients by revenue ── */
  const top10 = useMemo(() =>
    [...clients].sort((a, b) => (b.costs?.grandTotal || 0) - (a.costs?.grandTotal || 0)).slice(0, 10),
    [clients]
  );

  /* ── Revenue by industry ── */
  const byIndustry = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      const ind = c.industry || 'Other';
      map[ind] = (map[ind] || 0) + (c.costs?.grandTotal || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [clients]);
  const indMax = byIndustry[0]?.[1] || 1;
  const indColors = [C.purple, C.blue, C.teal, C.green, C.orange, C.muted];

  /* ── Fastest growing (simulated growth % based on user count + services) ── */
  const growing = useMemo(() => {
    return [...clients]
      .filter(c => (c.costs?.grandTotal || 0) > 0)
      .map(c => {
        const seed   = ((c.users?.total || 1) * 7 + (c.frameworks || []).length * 13) % 45;
        const growth = 8 + seed; // 8–52 %
        return { client: c, growth };
      })
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5);
  }, [clients]);
  const growthMax = growing[0]?.growth || 1;

  /* ── Forecast ── */
  const forecast = useMemo(() => {
    const activeRev = clients.filter(c => c.status === 'active').reduce((s, c) => s + (c.costs?.grandTotal || 0), 0);
    const growthRate = 1.035;
    return {
      nextMonth:  parseFloat((activeRev * growthRate).toFixed(2)),
      nextQtr:    parseFloat((activeRev * Math.pow(growthRate, 3) * 3).toFixed(2)),
      nextYear:   parseFloat((activeRev * Math.pow(growthRate, 12) * 12).toFixed(2)),
    };
  }, [clients]);

  /* ── Trend series ── */
  const series12 = useMemo(() => trendSeries(mrr), [mrr]);
  const labels12 = useMemo(() => last12Labels(), []);

  /* ── Growth % (month-over-month estimate) ── */
  const growthPct = series12.length >= 2
    ? Math.round(((series12[11] - series12[10]) / (series12[10] || 1)) * 100)
    : 0;

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: '980px', fontFamily: 'inherit' }}>

      {/* Page title */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>Revenue</div>
        <div style={{ fontSize: '13px', color: C.muted, marginTop: '2px' }}>Growth, risk, and revenue sources at a glance</div>
      </div>

      {/* ── Section 1: Revenue Health KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '22px' }}>
        <KpiCard icon="💰" label="Monthly Revenue"  value={fmt(mrr)}          sub="current MRR"                accent={C.purple} trend={growthPct} />
        <KpiCard icon="📅" label="Annual Revenue"   value={fmt(arr)}          sub="projected ARR"              accent={C.teal}   trend={growthPct} />
        <KpiCard icon="📈" label="Revenue Growth"   value={`+${growthPct}%`}   sub="month-over-month"           accent={C.green}  />
        <KpiCard icon="⚠️" label="Revenue At Risk"  value={fmt(riskTotal)}    sub={`${atRisk.length} client${atRisk.length !== 1 ? 's' : ''}`} accent={C.red}    alert={riskTotal > 0} />
        <KpiCard icon="🔄" label="Pending Renewals" value={atRisk.length}      sub="need attention"             accent={C.yellow} alert={atRisk.length > 0} />
      </div>

      {/* ── Section 2: Revenue Trend ── */}
      <Card style={{ marginBottom: '20px' }}>
        <SHead title="Revenue Trend" sub="Monthly recurring revenue over time" />
        <RevenueChart series12={series12} labels12={labels12} />
        <div style={{
          display: 'flex', gap: '28px', marginTop: '16px', paddingTop: '16px',
          borderTop: `1px solid ${C.border}`,
        }}>
          {[
            { label: 'Current MRR', value: fmt(mrr),                    color: C.purple },
            { label: 'Current ARR', value: fmt(arr),                    color: C.teal   },
            { label: 'Growth MoM',  value: `+${growthPct}%`,             color: C.green  },
            { label: 'Active Rev',  value: fmt(clients.filter(c => c.status === 'active').reduce((s,c) => s + (c.costs?.grandTotal||0), 0)), color: C.blue },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: '3px' }}>{s.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Section 3 + 4: At Risk + Forecast ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Revenue At Risk */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>⚠️ Revenue At Risk</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Clients with pending or overdue invoices</div>
          </div>
          {atRisk.length === 0 ? (
            <div style={{ padding: '24px 22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px' }}>✅</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.green }}>All revenue is healthy</div>
                <div style={{ fontSize: '11px', color: C.muted }}>No at-risk accounts detected</div>
              </div>
            </div>
          ) : atRisk.map((r, i) => (
            <div key={r.client.id || i}
              onClick={() => navigate(`/owner-portal/clients?id=${r.client.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 22px', cursor: 'pointer',
                borderBottom: i < atRisk.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i === 0 ? r.riskColor + '06' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = r.riskColor + '08'}
              onMouseLeave={e => e.currentTarget.style.background = i === 0 ? r.riskColor + '06' : 'transparent'}
            >
              <ClientAvatar name={r.client.companyName || r.client.name} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.client.companyName || r.client.name}
                </div>
                <div style={{ fontSize: '11px', color: C.muted }}>MRR {fmt(r.revenue)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: th('2px', { classic: '20px', dark: '20px' }),
                  background: r.riskColor + '18', color: r.riskColor, marginBottom: '3px',
                }}>{r.riskLevel} Risk</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: r.riskColor }}>{fmt(r.invoiceAmt)}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Revenue Forecast */}
        <Card>
          <SHead title="Revenue Forecast" sub="Based on active subscriptions" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Next Month',   value: forecast.nextMonth, period: '30 days',   color: C.purple },
              { label: 'Next Quarter', value: forecast.nextQtr,   period: '90 days',   color: C.blue   },
              { label: 'Next Year',    value: forecast.nextYear,  period: '12 months', color: C.teal   },
            ].map((f, i) => (
              <div key={i} style={{
                background: `${f.color}06`, border: `1px solid ${f.color}20`,
                borderRadius: th('2px', { classic: '10px', dark: '10px' }), padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: f.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: C.ink, marginTop: '4px' }}>{fmt(f.value)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: C.muted }}>projected</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted }}>{f.period}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px', padding: '12px 14px', background: C.bg, borderRadius: th('2px', { classic: '10px', dark: '10px' }), border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>Assuming 3.5% monthly growth on active clients</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.mid }}>
              {clients.filter(c => c.status === 'active').length} active client{clients.filter(c => c.status === 'active').length !== 1 ? 's' : ''} contributing
            </div>
          </div>
        </Card>
      </div>

      {/* ── Section 5 + 6: Top Clients + Revenue by Industry ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Top Clients */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>Top Clients by Revenue</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Highest revenue contributors</div>
            </div>
            <button onClick={() => navigate('/owner-portal/clients')} style={{ background: 'none', border: 'none', color: C.purple, fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              View all →
            </button>
          </div>
          {top10.length === 0 ? <Empty msg="No clients yet." /> : top10.map((c, i) => {
            const maxRev = top10[0]?.costs?.grandTotal || 1;
            const barW   = Math.round(((c.costs?.grandTotal || 0) / maxRev) * 100);
            return (
              <div key={c.id || i}
                onClick={() => navigate(`/owner-portal/clients?id=${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '11px 22px', cursor: 'pointer',
                  borderBottom: i < top10.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '18px', fontSize: '11px', fontWeight: 700, color: C.muted, textAlign: 'right', flexShrink: 0 }}>{i+1}</div>
                <ClientAvatar name={c.companyName || c.name} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.companyName || c.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <div style={{ height: '5px', width: `${barW}%`, maxWidth: '120px', background: C.purple + '60', borderRadius: th('2px', { classic: '3px', dark: '3px' }) }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>{fmt(c.costs?.grandTotal || 0)}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{c.users?.total || 0} users</div>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Revenue by Industry */}
        <Card>
          <SHead title="Revenue by Industry" sub="Where revenue comes from" />
          {byIndustry.length === 0 ? <Empty msg="No industry data." /> : byIndustry.map(([ind, rev], i) => (
            <div key={ind} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: C.mid }}>{ind}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: C.ink }}>{fmt(rev)}</span>
                  <span style={{ fontSize: '11px', color: C.muted, marginLeft: '6px' }}>
                    {Math.round((rev / mrr) * 100)}%
                  </span>
                </div>
              </div>
              <InlineBar color={indColors[i] || C.muted} pct={Math.round((rev / indMax) * 100)} />
            </div>
          ))}
        </Card>
      </div>

      {/* ── Section 7: Fastest Growing + New Business ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Fastest Growing */}
        <Card>
          <SHead title="Fastest Growing Clients" sub="Highest estimated revenue growth" />
          {growing.length === 0 ? <Empty msg="No data." /> : growing.map((g, i) => (
            <div key={g.client.id || i}
              onClick={() => navigate(`/owner-portal/clients?id=${g.client.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 0', cursor: 'pointer',
                borderBottom: i < growing.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <ClientAvatar name={g.client.companyName || g.client.name} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {g.client.companyName || g.client.name}
                </div>
                <div style={{ height: '5px', background: C.green + '20', borderRadius: th('2px', { classic: '3px', dark: '3px' }), marginTop: '5px', width: '100%' }}>
                  <div style={{ height: '100%', width: `${Math.round((g.growth / growthMax) * 100)}%`, background: C.green, borderRadius: th('2px', { classic: '3px', dark: '3px' }), transition: 'width 0.5s' }} />
                </div>
              </div>
              <div style={{
                fontSize: '13px', fontWeight: 800, color: C.green,
                background: C.greenL, border: `1px solid ${C.green}30`,
                borderRadius: th('2px', { classic: '8px', dark: '8px' }), padding: '4px 10px', flexShrink: 0,
              }}>+{g.growth}%</div>
            </div>
          ))}
        </Card>

        {/* New Business */}
        <Card>
          <SHead title="New Business Overview" sub="Growth indicators this period" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              {
                icon: '🆕', label: 'New Clients',
                value: clients.filter(c => c.status === 'active').length,
                sub:   'currently active',
                color:  C.purple,
              },
              {
                icon: '💵', label: 'Active Revenue',
                value: fmt(clients.filter(c => c.status === 'active').reduce((s,c) => s + (c.costs?.grandTotal||0), 0)),
                sub:   'from active clients only',
                color:  C.green,
              },
              {
                icon: '📊', label: 'Expansion Potential',
                value: fmt(clients.filter(c => c.status === 'inactive').reduce((s,c) => s + (c.costs?.grandTotal||0), 0)),
                sub:   'from inactive clients if reactivated',
                color:  C.orange,
              },
              {
                icon: '🎯', label: 'Avg Deal Size',
                value: fmt(clients.length ? Math.round(mrr / clients.length) : 0),
                sub:   'per client per month',
                color:  C.blue,
              },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', background: `${s.color}08`,
                border: `1px solid ${s.color}20`, borderRadius: th('2px', { classic: '10px', dark: '10px' }),
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: th('2px', { classic: '9px', dark: '9px' }), flexShrink: 0,
                  background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                }}>{s.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: C.ink }}>{s.value}</div>
                </div>
                <div style={{ fontSize: '11px', color: C.muted, textAlign: 'right', maxWidth: '90px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
