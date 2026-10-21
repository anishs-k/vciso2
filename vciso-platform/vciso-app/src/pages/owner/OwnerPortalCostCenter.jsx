import React, { useState, useMemo } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Loader, Empty, ClientAvatar } from './OwnerShared';
import { th } from '../../theme';

/* ─── Palette ─── */
const C = {
  purple:  '#7c3aed', purpleL: th('#f5f3ff', { dark: '#2E1065' }), purpleM: th('#ede9fe', { dark: '#2E1065' }),
  green:   '#16a34a', greenL:  th('#f0fdf4', { dark: '#0B2E24' }),
  blue:    th('#2563eb', { dark: '#60A5FA' }), blueL:   th('#eff6ff', { dark: '#172554' }),
  orange:  '#ea580c', orangeL: th('#fff7ed', { dark: '#3A1F0A' }),
  ink:     th('#0f172a', { dark: '#F1F5F9' }), mid:     th('#334155', { dark: '#CBD5E1' }), muted:   th('#64748b', { dark: '#94A3B8' }),
  border:  th('#e2e8f0', { dark: '#334155' }), bg:      th('#f8fafc', { dark: '#0F172A' }), card:    th('#ffffff', { dark: '#1E293B' }),
  shadow:  '0 1px 4px rgba(0,0,0,0.05)',
  shadowM: '0 4px 6px -1px rgba(0,0,0,0.07)',
};

/* ─── Cost column definitions ─── */
const COST_COLS = [
  { key: 'dashboardCost',     label: 'Dashboard'    },
  { key: 'frameworkCost',     label: 'Frameworks'   },
  { key: 'auditCost',         label: 'Audits'       },
  { key: 'securityToolCost',  label: 'Security Tools' },
  { key: 'integrationCost',   label: 'Integrations' },
  { key: 'grandTotal',        label: 'Grand Total'  },
];

/* ─── Helpers ─── */
function costs(client) {
  const c = client?.costs || {};
  return {
    dashboardCost:    Number(c.dashboardCost)    || 0,
    frameworkCost:    Number(c.frameworkCost)    || 0,
    auditCost:        Number(c.auditCost)        || 0,
    securityToolCost: Number(c.securityToolCost) || 0,
    integrationCost:  Number(c.integrationCost)  || 0,
    grandTotal:       Number(c.grandTotal)       || 0,
  };
}

/* ─── Sub-components ─── */

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: th('2px', { classic: '14px', dark: '14px' }), padding: '20px 22px',
      boxShadow: C.shadow, ...style,
    }}>
      {children}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent = C.purple }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: th('2px', { classic: '14px', dark: '14px' }), padding: '18px 20px',
      boxShadow: C.shadow, position: 'relative', overflow: 'hidden',
      flex: '1 1 200px', minWidth: 0,
    }}>
      {/* top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: accent, borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: th('2px', { classic: '9px', dark: '9px' }),
          background: `${accent}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
        }}>{icon}</div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: C.muted, letterSpacing: '0.02em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: C.ink, lineHeight: 1 }}>{value}</div>
      {sub && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted }}>{sub}</div>
      )}
    </div>
  );
}

/* Sort chevron indicator */
function SortIcon({ active, dir }) {
  if (!active) return <span style={{ opacity: 0.25, marginLeft: '4px', fontSize: '10px' }}>⇅</span>;
  return <span style={{ marginLeft: '4px', fontSize: '10px', color: C.purple }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

/* Horizontal bar for top-5 breakdown */
function BarRow({ label, name, value, maxValue, fmt, rank }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const rankColors = [C.purple, th('#2563eb', { dark: '#60A5FA' }), '#0d9488', '#d97706', '#dc2626'];
  const color = rankColors[rank] || C.purple;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%',
        background: `${color}15`, color, fontSize: '11px', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {rank + 1}
      </div>
      <div style={{ width: '140px', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: '11px', color: C.muted }}>{label}</div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ height: '8px', background: C.border, borderRadius: th('2px', { classic: '4px', dark: '4px' }), overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: color,
            borderRadius: th('2px', { classic: '4px', dark: '4px' }),
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{pct.toFixed(1)}% of highest</div>
      </div>
      <div style={{ width: '90px', textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color }}>{fmt(value)}</div>
        <div style={{ fontSize: '11px', color: C.muted }}>/ mo</div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function OwnerPortalCostCenter() {
  const { allClients, loading } = useAdminData();
  const { fmt } = useCurrency();

  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('grandTotal');
  const [sortDir, setSortDir] = useState('desc');

  /* Derived client rows with cost data */
  const clientRows = useMemo(() =>
    (allClients || []).map(c => ({ ...c, _costs: costs(c) })),
  [allClients]);

  /* KPI aggregates */
  const kpis = useMemo(() => {
    if (!clientRows.length) return { total: 0, avg: 0, highest: 0, annual: 0 };
    const totals = clientRows.map(c => c._costs.grandTotal);
    const total  = totals.reduce((s, v) => s + v, 0);
    return {
      total,
      avg:     clientRows.length ? total / clientRows.length : 0,
      highest: Math.max(...totals, 0),
      annual:  total * 12,
    };
  }, [clientRows]);

  /* Top 5 by grandTotal for bar chart */
  const top5 = useMemo(() =>
    [...clientRows]
      .sort((a, b) => b._costs.grandTotal - a._costs.grandTotal)
      .slice(0, 5),
  [clientRows]);

  /* Filtered + sorted table rows */
  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? clientRows.filter(c => (c.name || '').toLowerCase().includes(q))
      : clientRows;

    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sortKey === 'name') {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = a._costs[sortKey] ?? 0;
      bv = b._costs[sortKey] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [clientRows, search, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  /* Table header cell */
  function Th({ colKey, children, right = false }) {
    const active = sortKey === colKey;
    return (
      <th
        onClick={() => toggleSort(colKey)}
        style={{
          padding: '10px 14px', fontSize: '11px', fontWeight: 700,
          color: active ? C.purple : C.muted,
          textAlign: right ? 'right' : 'left',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          cursor: 'pointer', userSelect: 'none',
          whiteSpace: 'nowrap',
          background: C.bg, borderBottom: `2px solid ${active ? C.purple : C.border}`,
        }}
      >
        {children}<SortIcon active={active} dir={sortDir} />
      </th>
    );
  }

  /* Table data cell */
  function Td({ children, right = false, bold = false, accent }) {
    return (
      <td style={{
        padding: '12px 14px', fontSize: '13px',
        fontWeight: bold ? 700 : 400,
        color: accent || C.mid,
        textAlign: right ? 'right' : 'left',
        borderBottom: `1px solid ${C.border}`,
        whiteSpace: 'nowrap',
      }}>
        {children}
      </td>
    );
  }

  if (loading) return <Loader />;

  const hasData = clientRows.length > 0;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 24px' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>
          Cost Center
        </h1>
        <p style={{ fontSize: '13px', color: C.muted, margin: '4px 0 0' }}>
          Per-client cost breakdown across all billing components
        </p>
      </div>

      {!hasData ? (
        <Empty msg="No client data available." />
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <KpiCard
              icon="💰"
              label="Total Monthly Cost"
              value={fmt(kpis.total)}
              sub={`across ${clientRows.length} client${clientRows.length !== 1 ? 's' : ''}`}
              accent={C.purple}
            />
            <KpiCard
              icon="📊"
              label="Avg Cost per Client"
              value={fmt(kpis.avg)}
              sub="monthly average"
              accent={C.blue}
            />
            <KpiCard
              icon="🏆"
              label="Highest Single Client"
              value={fmt(kpis.highest)}
              sub="most expensive client"
              accent={C.orange}
            />
            <KpiCard
              icon="📅"
              label="Annual Run Rate"
              value={fmt(kpis.annual)}
              sub="projected 12-month total"
              accent={C.green}
            />
          </div>

          {/* ── Cost Table ── */}
          <Card style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
            {/* Card header with search */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
              flexWrap: 'wrap', gap: '10px',
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>Client Cost Breakdown</div>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                  {tableRows.length} of {clientRows.length} clients
                </div>
              </div>
              <input
                type="text"
                placeholder="Search clients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '8px 12px', fontSize: '13px',
                  border: `1px solid ${C.border}`, borderRadius: th('2px', { classic: '8px', dark: '8px' }),
                  outline: 'none', width: '200px', color: C.ink,
                  background: C.bg,
                }}
                onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = `0 0 0 3px ${C.purple}20`; }}
                onBlur={e  => { e.target.style.borderColor = C.border;  e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <Th colKey="name">Client</Th>
                    <Th colKey="dashboardCost"    right>Dashboard</Th>
                    <Th colKey="frameworkCost"    right>Frameworks</Th>
                    <Th colKey="auditCost"        right>Audits</Th>
                    <Th colKey="securityToolCost" right>Security Tools</Th>
                    <Th colKey="integrationCost"  right>Integrations</Th>
                    <Th colKey="grandTotal"       right>Grand Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>
                        No clients match your search.
                      </td>
                    </tr>
                  ) : tableRows.map((client, i) => {
                    const c = client._costs;
                    return (
                      <tr
                        key={client.id || i}
                        style={{ background: i % 2 === 0 ? C.card : `${C.bg}` }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.purpleL; }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? C.card : C.bg; }}
                      >
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ClientAvatar name={client.name} size={32} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>{client.name || '—'}</div>
                              {client.industry && (
                                <div style={{ fontSize: '11px', color: C.muted }}>{client.industry}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <Td right>{fmt(c.dashboardCost)}</Td>
                        <Td right>{fmt(c.frameworkCost)}</Td>
                        <Td right>{fmt(c.auditCost)}</Td>
                        <Td right>{fmt(c.securityToolCost)}</Td>
                        <Td right>{fmt(c.integrationCost)}</Td>
                        <Td right bold accent={C.purple}>{fmt(c.grandTotal)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Footer totals row */}
                {tableRows.length > 0 && (() => {
                  const sumKey = k => tableRows.reduce((s, c) => s + (c._costs[k] || 0), 0);
                  return (
                    <tfoot>
                      <tr style={{ background: C.purpleL }}>
                        <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: `2px solid ${C.purpleM}` }}>
                          Totals ({tableRows.length})
                        </td>
                        {['dashboardCost','frameworkCost','auditCost','securityToolCost','integrationCost','grandTotal'].map(k => (
                          <td key={k} style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', fontWeight: 800, color: C.purple, borderTop: `2px solid ${C.purpleM}` }}>
                            {fmt(sumKey(k))}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          </Card>

          {/* ── Top 5 Bar Chart ── */}
          {top5.length > 0 && (
            <Card>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>Top 5 Most Expensive Clients</div>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Ranked by monthly grand total cost</div>
              </div>

              <div>
                {top5.map((client, i) => (
                  <BarRow
                    key={client.id || i}
                    rank={i}
                    name={client.name || '—'}
                    label={client.industry || 'Client'}
                    value={client._costs.grandTotal}
                    maxValue={top5[0]._costs.grandTotal}
                    fmt={fmt}
                  />
                ))}
              </div>

              {/* Cost component breakdown for top client */}
              {top5[0] && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '12px' }}>
                    Cost composition — {top5[0].name}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {COST_COLS.filter(col => col.key !== 'grandTotal').map(col => {
                      const val = top5[0]._costs[col.key] || 0;
                      const pct = top5[0]._costs.grandTotal > 0
                        ? ((val / top5[0]._costs.grandTotal) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <div key={col.key} style={{
                          background: C.bg, border: `1px solid ${C.border}`,
                          borderRadius: th('2px', { classic: '10px', dark: '10px' }), padding: '10px 14px',
                          flex: '1 1 100px', minWidth: 0,
                        }}>
                          <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px' }}>{col.label}</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: C.ink }}>{fmt(val)}</div>
                          <div style={{ fontSize: '11px', color: C.purple, fontWeight: 600 }}>{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
