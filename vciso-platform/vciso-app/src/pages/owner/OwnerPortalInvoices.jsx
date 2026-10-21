import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { fmtDate, Loader, Empty, ClientAvatar, StatusPill } from './OwnerShared';
import { readBillingDetails } from './OwnerPortalBilling';
import { th } from '../../theme';

const C = {
  purple:'#7c3aed', purpleL:th('#f5f3ff', { dark: '#2E1065' }), purpleM:th('#ede9fe', { dark: '#2E1065' }),
  green:'#16a34a',  greenL:th('#f0fdf4', { dark: '#0B2E24' }),
  blue:th('#2563eb', { dark: '#60A5FA' }),   blueL:th('#eff6ff', { dark: '#172554' }),
  orange:'#ea580c', orangeL:th('#fff7ed', { dark: '#3A1F0A' }),
  teal:'#0d9488',   tealL:'#f0fdfa',
  red:'#dc2626',    redL:th('#fef2f2', { dark: '#3A1418' }),
  yellow:'#d97706', yellowL:th('#fffbeb', { dark: '#3A2A0A' }),
  ink:th('#0f172a', { dark: '#F1F5F9' }),    mid:th('#334155', { dark: '#CBD5E1' }),    muted:th('#64748b', { dark: '#94A3B8' }),
  border:th('#e2e8f0', { dark: '#334155' }), bg:th('#f8fafc', { dark: '#0F172A' }),     card:th('#ffffff', { dark: '#1E293B' }),
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PER_PAGE = 25;

/* ─── Shared UI ─── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: th('2px', { classic: '14px', dark: '14px' }), boxShadow: th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }), ...style,
    }}>{children}</div>
  );
}

function KpiCard({ icon, label, value, sub, accent, alert: isAlert }) {
  return (
    <div style={{
      background: isAlert ? `${C.red}06` : C.card,
      border: `1px solid ${isAlert ? C.red+'35' : C.border}`,
      borderRadius: th('2px', { classic: '14px', dark: '14px' }), padding: '18px 20px',
      boxShadow: th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }), position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: isAlert ? C.red : (accent || C.purple), borderRadius: '14px 14px 0 0',
      }} />
      <div style={{
        width: '32px', height: '32px', borderRadius: th('2px', { classic: '8px', dark: '8px' }),
        background: isAlert ? `${C.red}15` : `${accent || C.purple}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', marginBottom: '10px',
      }}>{icon}</div>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: isAlert ? C.red : C.ink, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

/* ─── Payment Status SVG Donut ─── */
function PaymentDonut({ paid, pending, overdue }) {
  const total = paid + pending + overdue || 1;
  const slices = [
    { value: paid,    color: C.green,  label: 'Paid'    },
    { value: pending, color: C.yellow, label: 'Pending' },
    { value: overdue, color: C.red,    label: 'Overdue' },
  ];
  const R = 40, cx = 50, cy = 50, stroke = 16;
  const circumference = 2 * Math.PI * R;
  let offset = 0;
  const segments = slices.map(s => {
    const pct = s.value / total;
    const dash = pct * circumference;
    const seg = { ...s, dash, gap: circumference - dash, offset };
    offset += dash;
    return seg;
  });
  const collectionRate = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" width="110" height="110">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.border} strokeWidth={stroke} />
          {segments.map((s, i) => s.dash > 0 && (
            <circle key={i} cx={cx} cy={cy} r={R} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset + circumference * 0.25}
              style={{ transition: 'all 0.4s' }}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.ink }}>{collectionRate}%</div>
          <div style={{ fontSize: '9px', color: C.muted, fontWeight: 600 }}>Collected</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: C.mid }}>{s.label}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: C.ink, marginLeft: 'auto' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Pagination ─── */
function PaginationBar({ page, totalPages, total, from, to, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '12px', color: C.muted }}>Showing {from}–{to} of {total}</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} style={{
          padding: '6px 12px', borderRadius: th('2px', { classic: '6px', dark: '6px' }), border: `1px solid ${C.border}`,
          background: C.card, color: page === 1 ? C.muted : C.mid,
          cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px', fontWeight: 600,
        }}>← Prev</button>
        {pages.map((p, i) => (
          <button key={i} onClick={() => typeof p === 'number' && onPage(p)} disabled={p === '…'} style={{
            padding: '6px 10px', borderRadius: th('2px', { classic: '6px', dark: '6px' }),
            border: `1px solid ${p === page ? C.purple : C.border}`,
            background: p === page ? C.purple : C.card,
            color: p === page ? '#fff' : p === '…' ? C.muted : C.mid,
            cursor: p === '…' ? 'default' : 'pointer', fontSize: '12px', fontWeight: 600, minWidth: '32px',
          }}>{p}</button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={{
          padding: '6px 12px', borderRadius: th('2px', { classic: '6px', dark: '6px' }), border: `1px solid ${C.border}`,
          background: C.card, color: page === totalPages ? C.muted : C.mid,
          cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px', fontWeight: 600,
        }}>Next →</button>
      </div>
    </div>
  );
}

/* ─── Risk badge ─── */
function RiskBadge({ days }) {
  if (days <= 7)  return <span style={{ background: C.redL,    color: C.red,    fontWeight: 700, fontSize: '10px', padding: '2px 8px', borderRadius: th('2px', { classic: '20px', dark: '20px' }) }}>Critical</span>;
  if (days <= 30) return <span style={{ background: C.yellowL, color: C.yellow, fontWeight: 700, fontSize: '10px', padding: '2px 8px', borderRadius: th('2px', { classic: '20px', dark: '20px' }) }}>High</span>;
  return               <span style={{ background: C.greenL,  color: C.green,  fontWeight: 700, fontSize: '10px', padding: '2px 8px', borderRadius: th('2px', { classic: '20px', dark: '20px' }) }}>Normal</span>;
}

/* ─── Action button helper ─── */
function ActionBtn({ label, color, bg, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: bg, color, border: `1px solid ${color}30`,
      borderRadius: th('2px', { classic: '6px', dark: '6px' }), padding: '4px 11px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
    }}>{label}</button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function OwnerPortalInvoices() {
  const { fmt } = useCurrency();
  const { allClients, loading } = useAdminData();
  const navigate = useNavigate();

  const [search,    setSearch]    = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [page,      setPage]      = useState(1);

  /* Build flat invoice list */
  const allInvoices = useMemo(() => {
    const list = [];
    (allClients || []).forEach(c => {
      (c.invoices || []).forEach(inv => {
        const monthIdx = (inv.month || 1) - 1;
        list.push({
          id:      `INV-${c.id}-${inv.year}-${String(inv.month).padStart(2, '0')}`,
          client:   c,
          period:  `${MONTHS[monthIdx]} ${inv.year}`,
          amount:   inv.amount || 0,
          status:   inv.status || 'pending',
          dueDate:  inv.dueDate || null,
        });
      });
    });
    return list.sort((a, b) => b.id.localeCompare(a.id));
  }, [allClients]);

  /* KPI aggregates */
  const totalInvoiced  = allInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid      = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending   = allInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue   = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const countPaid      = allInvoices.filter(i => i.status === 'paid').length;
  const countPending   = allInvoices.filter(i => i.status === 'pending').length;
  const countOverdue   = allInvoices.filter(i => i.status === 'overdue').length;
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  /* Outstanding receivables (non-paid) */
  const outstanding = useMemo(() =>
    allInvoices.filter(i => i.status !== 'paid').map(i => {
      const daysDue = i.dueDate
        ? Math.max(0, Math.round((new Date() - new Date(i.dueDate)) / 86400000))
        : 0;
      return { ...i, daysDue };
    }).sort((a, b) => b.daysDue - a.daysDue)
  , [allInvoices]);

  /* Upcoming collections (filter to pending with due dates in future) */
  const upcomingThisWeek  = useMemo(() => allInvoices.filter(i => {
    if (i.status !== 'pending' || !i.dueDate) return false;
    const diff = (new Date(i.dueDate) - new Date()) / 86400000;
    return diff >= 0 && diff <= 7;
  }), [allInvoices]);

  const upcomingThisMonth = useMemo(() => allInvoices.filter(i => {
    if (i.status !== 'pending' || !i.dueDate) return false;
    const diff = (new Date(i.dueDate) - new Date()) / 86400000;
    return diff > 7 && diff <= 30;
  }), [allInvoices]);

  const upcomingNextMonth = useMemo(() => allInvoices.filter(i => {
    if (i.status !== 'pending' || !i.dueDate) return false;
    const diff = (new Date(i.dueDate) - new Date()) / 86400000;
    return diff > 30 && diff <= 60;
  }), [allInvoices]);

  /* Filtered + paginated invoice table */
  const tabs = [
    { key: 'all',     label: 'All',     count: allInvoices.length },
    { key: 'paid',    label: 'Paid',    count: countPaid          },
    { key: 'pending', label: 'Pending', count: countPending        },
    { key: 'overdue', label: 'Overdue', count: countOverdue        },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allInvoices.filter(inv => {
      const matchStatus = statusTab === 'all' || inv.status === statusTab;
      const matchSearch = !q
        || inv.id.toLowerCase().includes(q)
        || (inv.client.companyName || inv.client.name || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [allInvoices, search, statusTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const slice      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const fromIdx    = filtered.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const toIdx      = Math.min(safePage * PER_PAGE, filtered.length);

  if (loading) return <Loader />;

  const weekAmt  = upcomingThisWeek.reduce((s, i) => s + i.amount, 0);
  const monthAmt = upcomingThisMonth.reduce((s, i) => s + i.amount, 0);
  const nextAmt  = upcomingNextMonth.reduce((s, i) => s + i.amount, 0);

  const bd = readBillingDetails();

  return (
    <div style={{ maxWidth: '1040px', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>Invoices</div>
          <div style={{ fontSize: '13px', color: C.muted, marginTop: '2px' }}>Payment & Collection Center · {allInvoices.length} invoices across {(allClients || []).length} clients</div>
        </div>
        {/* Billing From block */}
        {bd.companyName && (
          <div style={{ background: `${C.purple}06`, border: `1px solid ${C.purple}20`, borderRadius: th('2px', { classic: '12px', dark: '12px' }), padding: '12px 16px', minWidth: '240px', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.purple, marginBottom: '6px' }}>Billing From</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>{bd.companyName}</div>
            {bd.contactPerson && <div style={{ fontSize: '11px', color: C.mid, marginTop: '2px' }}>{bd.contactPerson}</div>}
            {bd.billingEmail  && <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>✉ {bd.billingEmail}</div>}
            {(bd.gstNumber||bd.panNumber) && (
              <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                {bd.gstNumber&&`GST: ${bd.gstNumber}`}{bd.gstNumber&&bd.panNumber?' · ':''}{bd.panNumber&&`PAN: ${bd.panNumber}`}
              </div>
            )}
            {bd.city && <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{[bd.city,bd.country].filter(Boolean).join(', ')}</div>}
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <KpiCard icon="💰" label="Total Invoiced"   value={fmt(totalInvoiced)}  sub={`${allInvoices.length} invoices`}     accent={C.purple} />
        <KpiCard icon="✅" label="Total Collected"  value={fmt(totalPaid)}      sub={`${countPaid} paid`}                  accent={C.green}  />
        <KpiCard icon="⏳" label="Pending"           value={fmt(totalPending)}   sub={`${countPending} invoices`}           accent={C.yellow} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <KpiCard icon="🚨" label="Overdue"           value={fmt(totalOverdue)}   sub={`${countOverdue} overdue`}            accent={C.red}    alert={countOverdue > 0} />
        <KpiCard icon="📊" label="Collection Rate"  value={`${collectionRate}%`} sub="paid / total invoiced"               accent={C.teal}   />
        <KpiCard icon="📅" label="Avg Invoice Value" value={fmt(allInvoices.length ? Math.round(totalInvoiced / allInvoices.length) : 0)} sub="per invoice" accent={C.blue} />
      </div>

      {/* ── Payment Status + Upcoming Collections ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Payment Status Donut */}
        <Card style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '16px' }}>Payment Status</div>
          <PaymentDonut paid={countPaid} pending={countPending} overdue={countOverdue} />
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '16px' }}>
            {[
              { label: 'Paid',    value: fmt(totalPaid),    color: C.green  },
              { label: 'Pending', value: fmt(totalPending), color: C.yellow },
              { label: 'Overdue', value: fmt(totalOverdue), color: C.red    },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Collections */}
        <Card style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '14px' }}>Upcoming Collections</div>
          {[
            { label: 'Due This Week',  count: upcomingThisWeek.length,  amount: weekAmt,  color: C.red,    bg: C.redL    },
            { label: 'Due This Month', count: upcomingThisMonth.length, amount: monthAmt, color: C.yellow, bg: C.yellowL },
            { label: 'Next Month',     count: upcomingNextMonth.length, amount: nextAmt,  color: C.blue,   bg: C.blueL   },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderRadius: th('2px', { classic: '10px', dark: '10px' }), background: row.bg,
              border: `1px solid ${row.color}20`, marginBottom: i < 2 ? '8px' : 0,
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: row.color }}>{row.label}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{row.count} invoice{row.count !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: C.ink }}>{fmt(row.amount)}</div>
            </div>
          ))}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Total Expected</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: C.purple }}>{fmt(weekAmt + monthAmt + nextAmt)}</div>
          </div>
        </Card>
      </div>

      {/* ── Invoice Table ── */}
      <Card style={{ padding: 0 }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setStatusTab(t.key); setPage(1); }} style={{
                padding: '6px 14px', borderRadius: th('2px', { classic: '20px', dark: '20px' }), fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', border: 'none',
                background: statusTab === t.key ? C.purple : C.bg,
                color: statusTab === t.key ? '#fff' : C.muted,
                transition: 'all 0.12s',
              }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    marginLeft: '4px', fontSize: '10px', fontWeight: 700,
                    background: statusTab === t.key ? 'rgba(255,255,255,0.25)' : `${C.purple}20`,
                    color: statusTab === t.key ? '#fff' : C.purple,
                    borderRadius: th('2px', { classic: '10px', dark: '10px' }), padding: '1px 6px',
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search client or invoice ID…"
            style={{
              flex: 1, minWidth: '200px', padding: '8px 14px', fontSize: '13px',
              border: `1px solid ${C.border}`, borderRadius: th('2px', { classic: '8px', dark: '8px' }),
              background: C.bg, color: C.ink, outline: 'none',
            }}
          />
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.8fr 1.6fr 0.9fr 100px 110px 90px 180px',
          padding: '10px 22px', background: C.bg, borderBottom: `1px solid ${C.border}`,
        }}>
          {['Invoice ID', 'Client', 'Period', 'Amount', 'Due Date', 'Status', 'Actions'].map(h => (
            <div key={h} style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {slice.length === 0 ? (
          <div style={{ padding: '32px' }}><Empty msg="No invoices match your filter." /></div>
        ) : slice.map((inv, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1.6fr 0.9fr 100px 110px 90px 180px',
            padding: '12px 22px',
            borderBottom: i < slice.length - 1 ? `1px solid ${C.border}` : 'none',
            alignItems: 'center',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.mid, fontFamily: 'monospace' }}>{inv.id}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <ClientAvatar name={inv.client.companyName || inv.client.name} size={22} />
              <span style={{ fontSize: '12px', color: C.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {inv.client.companyName || inv.client.name}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: C.mid }}>{inv.period}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>{fmt(inv.amount)}</div>
            <div style={{ fontSize: '12px', color: C.mid }}>{inv.dueDate ? fmtDate(inv.dueDate) : '—'}</div>
            <StatusPill status={inv.status} />
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <ActionBtn label="View"     color={C.blue}   bg={C.blueL}   onClick={() => navigate(`/owner-portal/clients?id=${inv.client.id}`)} />
              <ActionBtn label="PDF"      color={C.muted}  bg={C.bg}      onClick={() => alert('PDF download coming soon')} />
              {inv.status !== 'paid' && (
                <ActionBtn label="Remind" color={C.orange} bg={C.orangeL} onClick={() => alert(`Reminder sent for ${inv.id}`)} />
              )}
            </div>
          </div>
        ))}

        <PaginationBar
          page={safePage} totalPages={totalPages} total={filtered.length}
          from={fromIdx} to={toIdx} onPage={p => setPage(p)}
        />
      </Card>

      {/* ── Outstanding Receivables ── */}
      {outstanding.length > 0 && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>Outstanding Receivables</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Unpaid invoices ordered by overdue risk</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Client', 'Invoice', 'Amount', 'Due Date', 'Days Overdue', 'Risk', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 18px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outstanding.slice(0, 15).map((inv, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? C.bg : th('white', { dark: '#1E293B' }) }}>
                    <td style={{ padding: '11px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClientAvatar name={inv.client.companyName || inv.client.name} size={22} />
                        <span style={{ fontSize: '12px', color: C.ink, fontWeight: 500 }}>{inv.client.companyName || inv.client.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 18px', fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>{inv.id}</td>
                    <td style={{ padding: '11px 18px', fontSize: '13px', fontWeight: 700, color: C.ink }}>{fmt(inv.amount)}</td>
                    <td style={{ padding: '11px 18px', fontSize: '12px', color: C.mid }}>{inv.dueDate ? fmtDate(inv.dueDate) : '—'}</td>
                    <td style={{ padding: '11px 18px', fontSize: '12px', color: inv.daysDue > 0 ? C.red : C.muted, fontWeight: inv.daysDue > 0 ? 700 : 400 }}>
                      {inv.daysDue > 0 ? `${inv.daysDue}d` : 'Not yet due'}
                    </td>
                    <td style={{ padding: '11px 18px' }}><RiskBadge days={inv.daysDue} /></td>
                    <td style={{ padding: '11px 18px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <ActionBtn label="View"   color={C.blue}   bg={C.blueL}   onClick={() => navigate(`/owner-portal/clients?id=${inv.client.id}`)} />
                        <ActionBtn label="Remind" color={C.orange} bg={C.orangeL} onClick={() => alert(`Reminder sent to ${inv.client.companyName || inv.client.name}`)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
