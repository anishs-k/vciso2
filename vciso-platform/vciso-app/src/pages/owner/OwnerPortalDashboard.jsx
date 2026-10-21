import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Loader } from './OwnerShared';
import { th } from '../../theme';

const C = {
  purple:'#7c3aed', purpleL:th('#f5f3ff', { dark: '#2E1065' }), purpleM:th('#ede9fe', { dark: '#2E1065' }),
  green:'#16a34a',  greenL:th('#f0fdf4', { dark: '#0B2E24' }),
  blue:th('#2563eb', { dark: '#60A5FA' }),   blueL:th('#eff6ff', { dark: '#172554' }),
  orange:'#ea580c', orangeL:th('#fff7ed', { dark: '#3A1F0A' }),
  teal:'#0d9488',   tealL:'#f0fdfa',
  red:'#dc2626',    redL:th('#fef2f2', { dark: '#3A1418' }),
  yellow:'#d97706', yellowL:th('#fffbeb', { dark: '#3A2A0A' }),
  ink:th('#0f172a', { dark: '#F1F5F9' }), mid:th('#334155', { dark: '#CBD5E1' }), muted:th('#64748b', { dark: '#94A3B8' }),
  border:th('#e2e8f0', { dark: '#334155' }), bg:th('#f8fafc', { dark: '#0F172A' }), card:th('#ffffff', { dark: '#1E293B' }),
};

const card = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: th('2px', { classic: '14px', dark: '14px' }),
  boxShadow: th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }),
};

function Avatar({ name, size = 36 }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,60%)`,
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{initials}</div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    active:   { bg: C.greenL,  color: C.green,  label: 'Active' },
    inactive: { bg: C.redL,    color: C.red,     label: 'Inactive' },
    pending:  { bg: C.yellowL, color: C.yellow,  label: 'Pending' },
    overdue:  { bg: C.redL,    color: C.red,     label: 'Overdue' },
    paid:     { bg: C.greenL,  color: C.green,   label: 'Paid' },
  };
  const s = cfg[status] || cfg.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: '99px', padding: '2px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
    }}>{s.label}</span>
  );
}

function KpiCard({ accent, icon, value, label, sub, trend }) {
  return (
    <div style={{ ...card, padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 3, background: accent, borderRadius: '14px 14px 0 0' }} />
      <div style={{ padding: '16px 18px 18px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: th('2px', { classic: '10px', dark: '10px' }),
            background: accent + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>{icon}</div>
          {trend && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.green,
              background: C.greenL, borderRadius: '99px', padding: '2px 8px',
            }}>{trend}</span>
          )}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function RevenueTrendChart({ mrr }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data = useMemo(() => {
    const pts = [];
    for (let i = 11; i >= 0; i--) {
      const factor = 1 - i * 0.055 + (i % 3) * 0.01;
      pts.push(Math.max(mrr * factor, 0));
    }
    return pts;
  }, [mrr]);

  const W = 1060, H = 160, padL = 60, padR = 20, padT = 16, padB = 30;
  const maxVal = Math.max(...data) * 1.1 || 1;
  const minVal = Math.min(...data) * 0.9;
  const xStep = (W - padL - padR) / 11;

  const pts = data.map((v, i) => ({
    x: padL + i * xStep,
    y: padT + (H - padT - padB) * (1 - (v - minVal) / (maxVal - minVal)),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x},${H - padB} L${pts[0].x},${H - padB} Z`;

  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minVal + (maxVal - minVal) * (i / yTicks);
    return { y: padT + (H - padT - padB) * (1 - i / yTicks), v };
  });

  const ytd = data.reduce((a, b) => a + b, 0);
  const mom = data.length >= 2 ? ((data[11] - data[10]) / (data[10] || 1)) * 100 : 0;

  return (
    <div style={{ ...card, padding: '20px 24px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Revenue Trend — Last 12 Months</div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', minWidth: 340 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.purple} stopOpacity="0.18" />
              <stop offset="100%" stopColor={C.purple} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {yLabels.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke={C.border} strokeWidth="1" />
              <text x={padL - 8} y={t.y + 4} textAnchor="end" fontSize="9" fill={C.muted}>
                ${(t.v / 1000).toFixed(1)}k
              </text>
            </g>
          ))}
          {months.map((m, i) => (
            <text key={i} x={padL + i * xStep} y={H - 6} textAnchor="middle" fontSize="9" fill={C.muted}>{m}</text>
          ))}
          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linePath} fill="none" stroke={C.purple} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={C.card} stroke={C.purple} strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
        {[
          { label: 'Current MRR', value: `$${mrr.toLocaleString()}` },
          { label: 'ARR', value: `$${(mrr * 12).toLocaleString()}` },
          { label: 'Growth MoM', value: `+${mom.toFixed(1)}%`, color: C.green },
          { label: 'YTD Total', value: `$${Math.round(ytd).toLocaleString()}` },
        ].map((s, i) => (
          <div key={i} style={{ background: C.purpleL, borderRadius: th(2, { classic: 10, dark: 10 }), padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color || C.purple }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndustryChart({ data }) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div style={{ ...card, padding: '20px 24px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Revenue by Industry</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((d, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.mid, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{d.industry}</span>
              <span style={{ color: C.muted }}>${d.amount.toLocaleString()}</span>
            </div>
            <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(d.amount / max) * 100}%`,
                background: C.purple,
                borderRadius: 99,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ activities, fmt }) {
  const dotColor = { green: C.green, yellow: C.yellow, red: C.red };
  const timeLabels = ['Recently', '1 day ago', '2 days ago', '3 days ago', '4 days ago', '5 days ago', 'Last week', 'Last week', '2 weeks ago', '2 weeks ago'];
  return (
    <div style={{ ...card, padding: '20px 24px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Recent Activity</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {activities.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < activities.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor[a.color] || C.muted, marginTop: 3, flexShrink: 0 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{a.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 11, color: C.muted }}>{timeLabels[i] || 'Recently'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: a.color === 'green' ? C.green : C.mid }}>{fmt(a.amount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutstandingInvoices({ clients, fmt, navigate }) {
  const atRisk = clients.filter(c =>
    (c.invoices || []).some(inv => inv.status === 'pending' || inv.status === 'overdue')
  ).map(c => {
    const invs = (c.invoices || []).filter(inv => inv.status === 'pending' || inv.status === 'overdue');
    const total = invs.reduce((s, inv) => s + (inv.amount || 0), 0);
    const hasOverdue = invs.some(inv => inv.status === 'overdue');
    return { ...c, dueTotal: total, worstStatus: hasOverdue ? 'overdue' : 'pending' };
  });

  return (
    <div style={{ ...card, padding: '20px 24px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Outstanding Invoices</div>
      {atRisk.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 10 }}>
          <div style={{ fontSize: 32 }}>✅</div>
          <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>All invoices are current</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {atRisk.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.bg, borderRadius: th(2, { classic: 10, dark: 10 }) }}>
              <Avatar name={c.companyName || c.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.companyName || c.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{fmt(c.dueTotal)}</div>
              </div>
              <StatusBadge status={c.worstStatus} />
              <button
                onClick={() => navigate('/owner-portal/clients?id=' + c.id)}
                style={{
                  background: C.orange, color: '#fff', border: 'none',
                  borderRadius: th(2, { classic: 8, dark: 8 }), padding: '5px 10px', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >Collect →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DistributionBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.mid, marginBottom: 4 }}>
        <span>{label}</span><span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 7, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color || C.purple, borderRadius: 99 }} />
      </div>
    </div>
  );
}

export default function OwnerPortalDashboard() {
  const { allClients, loading } = useAdminData();
  const { fmt } = useCurrency();
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    if (!allClients || allClients.length === 0) return null;

    const total = allClients.length;
    const active = allClients.filter(c => c.status === 'active').length;

    const mrr = allClients.reduce((s, c) => s + ((c.costs && c.costs.grandTotal) || 0), 0);
    const arr = mrr * 12;

    const totalUsers = allClients.reduce((s, c) => s + ((c.users && c.users.total) || 0), 0);

    const allInvoices = allClients.flatMap(c => (c.invoices || []).map(inv => ({ ...inv, clientId: c.id, clientName: c.companyName || c.name })));
    const outstanding = allInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue');
    const outstandingCount = outstanding.length;
    const outstandingAmount = outstanding.reduce((s, inv) => s + (inv.amount || 0), 0);

    const byIndustry = {};
    allClients.forEach(c => {
      const ind = c.industry || 'Other';
      byIndustry[ind] = (byIndustry[ind] || 0) + ((c.costs && c.costs.grandTotal) || 0);
    });
    const industryData = Object.entries(byIndustry)
      .map(([industry, amount]) => ({ industry, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const topClients = [...allClients]
      .sort((a, b) => ((b.costs && b.costs.grandTotal) || 0) - ((a.costs && a.costs.grandTotal) || 0))
      .slice(0, 8);

    const activities = [];
    allInvoices.forEach(inv => {
      if (inv.status === 'paid') activities.push({ description: `Invoice Paid — ${inv.clientName}`, amount: inv.amount || 0, color: 'green', sort: 1 });
      else if (inv.status === 'pending') activities.push({ description: `Invoice Pending — ${inv.clientName}`, amount: inv.amount || 0, color: 'yellow', sort: 2 });
      else if (inv.status === 'overdue') activities.push({ description: `Invoice Overdue — ${inv.clientName}`, amount: inv.amount || 0, color: 'red', sort: 0 });
    });
    activities.sort((a, b) => a.sort - b.sort);
    const recentActivities = activities.slice(0, 10);

    const tiers = { '< $1k': 0, '$1k–$5k': 0, '$5k–$10k': 0, '$10k+': 0 };
    allClients.forEach(c => {
      const v = (c.costs && c.costs.grandTotal) || 0;
      if (v < 1000) tiers['< $1k']++;
      else if (v < 5000) tiers['$1k–$5k']++;
      else if (v < 10000) tiers['$5k–$10k']++;
      else tiers['$10k+']++;
    });

    const byIndustryCount = {};
    allClients.forEach(c => {
      const ind = c.industry || 'Other';
      byIndustryCount[ind] = (byIndustryCount[ind] || 0) + 1;
    });
    const topIndustriesByCount = Object.entries(byIndustryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total, active, mrr, arr, totalUsers,
      outstandingCount, outstandingAmount,
      industryData, topClients, recentActivities,
      tiers, topIndustriesByCount,
      inactive: total - active,
    };
  }, [allClients]);

  if (loading) return <Loader />;
  if (!metrics) return <div style={{ padding: 40, color: C.muted, textAlign: 'center' }}>No client data available.</div>;

  const { total, active, inactive, mrr, arr, totalUsers, outstandingCount, outstandingAmount, industryData, topClients, recentActivities, tiers, topIndustriesByCount } = metrics;

  const kpis = [
    { accent: C.purple, icon: '🏢', value: total, label: 'Total Clients', sub: `${active} active` },
    { accent: C.green,  icon: '💵', value: fmt(mrr), label: 'Monthly Revenue', sub: 'recurring', trend: '+6%' },
    { accent: C.blue,   icon: '📈', value: fmt(arr), label: 'Annual Revenue', sub: 'projected', trend: '+6%' },
    { accent: C.teal,   icon: '👥', value: totalUsers.toLocaleString(), label: 'Total Users', sub: 'across all clients' },
    { accent: C.orange, icon: '🧾', value: outstandingCount, label: 'Outstanding Invoices', sub: fmt(outstandingAmount) },
    { accent: C.green,  icon: '📊', value: '+6%', label: 'Revenue Growth', sub: 'month over month', trend: '+6%' },
    { accent: C.purple, icon: '✅', value: active, label: 'Active Clients', sub: `${inactive} inactive` },
    { accent: C.red,    icon: '⚠️', value: fmt(outstandingAmount), label: 'Pending Collections', sub: `${outstandingCount} invoices` },
  ];

  const maxTier = Math.max(...Object.values(tiers), 1);
  const maxIndCount = Math.max(...topIndustriesByCount.map(([, c]) => c), 1);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 40px' }}>
      {/* Row 0: Header */}
      <div style={{ padding: '28px 0 20px' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: '-0.5px' }}>Business Overview</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Real-time intelligence across all clients</div>
      </div>

      {/* Row 1: KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      {/* Row 2: Revenue Trend Chart */}
      <div style={{ marginBottom: 20 }}>
        <RevenueTrendChart mrr={mrr} />
      </div>

      {/* Row 3: Top Clients + Industry Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 16, marginBottom: 20 }}>
        <div style={{ ...card, padding: '20px 24px', overflow: 'hidden' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Top Clients by Revenue</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['#', 'Client', 'Industry', 'MRR', 'Status', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? 'center' : 'left', padding: '6px 8px', color: C.muted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ textAlign: 'center', padding: '10px 8px', color: C.muted, fontSize: 12, fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={c.companyName || c.name} size={30} />
                        <span style={{ fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>{c.companyName || c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', color: C.muted, whiteSpace: 'nowrap' }}>{c.industry || '—'}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: C.purple, whiteSpace: 'nowrap' }}>{fmt((c.costs && c.costs.grandTotal) || 0)}</td>
                    <td style={{ padding: '10px 8px' }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        onClick={() => navigate('/owner-portal/clients?id=' + c.id)}
                        style={{ background: C.purpleL, color: C.purple, border: `1px solid ${C.purpleM}`, borderRadius: th(2, { classic: 7, dark: 7 }), padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <IndustryChart data={industryData} />
      </div>

      {/* Row 4: Activity Feed + Outstanding Invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <ActivityFeed activities={recentActivities} fmt={fmt} />
        <OutstandingInvoices clients={allClients} fmt={fmt} navigate={navigate} />
      </div>

      {/* Row 5: Client Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {/* By Status */}
        <div style={{ ...card, padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>By Status</div>
          <DistributionBar label="Active" value={active} max={total} color={C.green} />
          <DistributionBar label="Inactive" value={inactive} max={total} color={C.red} />
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: C.greenL, borderRadius: th(2, { classic: 10, dark: 10 }), padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{total > 0 ? Math.round((active / total) * 100) : 0}%</div>
              <div style={{ fontSize: 10, color: C.muted }}>Active Rate</div>
            </div>
            <div style={{ flex: 1, background: C.redL, borderRadius: th(2, { classic: 10, dark: 10 }), padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{total > 0 ? Math.round((inactive / total) * 100) : 0}%</div>
              <div style={{ fontSize: 10, color: C.muted }}>Inactive Rate</div>
            </div>
          </div>
        </div>

        {/* By Industry */}
        <div style={{ ...card, padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>By Industry</div>
          {topIndustriesByCount.map(([ind, count], i) => (
            <DistributionBar key={i} label={ind} value={count} max={maxIndCount} color={C.blue} />
          ))}
        </div>

        {/* By Revenue Tier */}
        <div style={{ ...card, padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 16 }}>By Revenue Tier</div>
          {Object.entries(tiers).map(([tier, count], i) => (
            <DistributionBar key={i} label={tier} value={count} max={maxTier} color={C.orange} />
          ))}
        </div>
      </div>
    </div>
  );
}
