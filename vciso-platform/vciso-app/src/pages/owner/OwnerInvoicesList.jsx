import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { fmtDate, Loader, Empty, ClientAvatar, StatusPill } from './OwnerShared';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
    <div className="flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50/50">
      <div className="text-xs text-slate-500">Showing {from}–{to} of {total} invoices</div>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition shadow-sm"
        >
          ← Prev
        </button>
        {pages.map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === 'number' && onPage(p)}
            disabled={p === '…'}
            className={`min-w-[32px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
              p === page
                ? 'bg-blue-600 text-white'
                : p === '…'
                ? 'bg-transparent text-slate-400 border-none'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition shadow-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function OwnerInvoicesList() {
  const { fmt } = useCurrency();
  const { allClients, loading } = useAdminData();
  const navigate = useNavigate();

  const [search, setSearch]       = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [page, setPage]           = useState(1);
  const perPage                   = 25;

  const allInvoices = useMemo(() => {
    const list = [];
    (allClients || []).forEach(c => {
      (c.invoices || []).forEach(inv => {
        list.push({
          id:      `INV-${c.id}-${inv.year}-${String(inv.month).padStart(2,'0')}`,
          client:   c,
          period:  `${MONTHS[(inv.month || 1) - 1]} ${inv.year}`,
          amount:   inv.amount || 0,
          status:   inv.status || 'pending',
          dueDate:  inv.dueDate || null,
        });
      });
    });
    return list.sort((a, b) => b.id.localeCompare(a.id));
  }, [allClients]);

  const counts = useMemo(() => ({
    all:     allInvoices.length,
    paid:    allInvoices.filter(i => i.status === 'paid').length,
    pending: allInvoices.filter(i => i.status === 'pending').length,
    overdue: allInvoices.filter(i => i.status === 'overdue').length,
  }), [allInvoices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allInvoices.filter(inv => {
      const matchStatus = statusTab === 'all' || inv.status === statusTab;
      const matchSearch = !q || inv.id.toLowerCase().includes(q) || (inv.client.companyName || inv.client.name || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [allInvoices, search, statusTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages);
  const slice      = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const fromIdx    = filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const toIdx      = Math.min(safePage * perPage, filtered.length);

  const summaryPaid    = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const summaryPending = allInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const summaryOverdue = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  if (loading) return <Loader />;

  const tabs = [
    { key: 'all',     label: 'All',     count: counts.all     },
    { key: 'paid',    label: 'Paid',    count: counts.paid    },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
  ];

  return (
    <div className="font-sans text-slate-900 max-w-5xl space-y-6">
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => navigate('/owner-portal/invoices')}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl px-3.5 py-2 shadow-sm transition"
        >
          ← Billing
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Archive</h1>
          <p className="text-xs text-slate-500 mt-0.5">{counts.all} invoices across {(allClients || []).length} clients</p>
        </div>
      </div>

      {/* Summary boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Paid',    value: summaryPaid,    border: 'border-l-emerald-500', text: 'text-emerald-700' },
          { label: 'Total Pending', value: summaryPending, border: 'border-l-amber-500',   text: 'text-amber-700'   },
          { label: 'Total Overdue', value: summaryOverdue, border: 'border-l-red-500',     text: 'text-red-700'     },
        ].map((s, i) => (
          <div key={i} className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 ${s.border}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{s.label}</div>
            <div className={`text-2xl font-black font-mono tracking-tight ${s.text}`}>{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
          <div className="flex gap-2">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setStatusTab(t.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                  statusTab === t.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusTab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search client or invoice ID…"
            className="bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm min-w-[240px]"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Invoice ID</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Due Date</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No invoices match your filter.</td>
                </tr>
              ) : slice.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/owner-portal/clients?id=${inv.client.id}`)}
                  className="hover:bg-slate-50/70 transition cursor-pointer"
                >
                  <td className="px-6 py-3.5 text-blue-600 font-bold text-xs font-mono">{inv.id}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <ClientAvatar name={inv.client.companyName || inv.client.name} size={24} />
                      <span className="text-slate-900 font-bold text-xs">
                        {inv.client.companyName || inv.client.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 text-xs font-medium">{inv.period}</td>
                  <td className="px-6 py-3.5 text-right text-slate-900 font-bold text-xs font-mono">{fmt(inv.amount)}</td>
                  <td className="px-6 py-3.5 text-center text-slate-500 text-xs">{inv.dueDate ? fmtDate(inv.dueDate) : '—'}</td>
                  <td className="px-6 py-3.5 text-center"><StatusPill status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={safePage} totalPages={totalPages} total={filtered.length}
          from={fromIdx} to={toIdx} onPage={p => setPage(p)}
        />
      </div>
    </div>
  );
}
