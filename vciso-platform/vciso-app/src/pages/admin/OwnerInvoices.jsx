import React, { useState } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { Loader, Empty } from './OwnerDashboard';
import { th } from '../../theme';

function fmt$(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RegisterInvoiceCard({ label, value, color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className="reg-gauge"
      style={{
        textAlign: 'left',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        border: active ? `1.5px solid ${th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })}` : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
        background: active ? th('#F8FAFC', { dark: '#0F172A' }) : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' })
      }}
    >
      <span className="reg-label" style={{ margin: 0, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{label}</span>
      <div className="reg-gauge-val" style={{ color: color || th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', marginTop: '6px' }}>
        {value}
      </div>
    </div>
  );
}

export default function OwnerInvoices() {
  const { engineData, loading } = useAdminData();
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast]       = useState(null);

  if (loading) return <Loader />;

  const cl  = engineData?.clients || [];
  const now = new Date();

  const invoices = cl.map((c, i) => {
    const costs      = c.costs || {};
    const users      = c.users || {};
    const totalUsers = users.total || 0;
    const dashboard  = costs.dashboardCost    || 0;
    const framework  = costs.frameworkCost    || 0;
    const audit      = costs.auditCost        || 0;
    const tools      = costs.securityToolCost || 0;
    const integration= costs.integrationCost  || 0;
    const total      = costs.grandTotal       || (dashboard + framework + audit + tools + integration);

    const pct      = c.onboarding?.progressPercent ?? 0;
    const due      = new Date(now.getTime() + (pct >= 100 ? -10 : 25) * 86400000);
    const isOverdue= pct < 100 && due < now;
    const status   = pct >= 100 ? 'paid' : isOverdue ? 'overdue' : 'pending';
    const num      = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(4,'0')}`;

    return {
      num, status, due,
      client:   c.companyName || c.name,
      industry: c.industry,
      totalUsers,
      users: {
        internal:  users.internal  || 0,
        external:  users.external  || 0,
        partner:   users.partner   || 0,
        vciso:     users.vciso     || 0,
        directors: users.directors || 0,
      },
      total,
      breakdown: { dashboard, framework, audit, tools, integration },
    };
  });

  const filtered = filter === 'all' ? invoices : invoices.filter(inv => inv.status === filter);
  const counts   = {
    all:     invoices.length,
    paid:    invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  };

  function download(inv) {
    setToast(`${inv.num} — download initiated`);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="reg-doc-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>Invoices &amp; Billing</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            Auto-generated enterprise invoices based on real-time client configurations and active service tiers.
          </p>
        </div>
      </div>

      {/* Summary Filter Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <RegisterInvoiceCard label="All Invoices" value={counts.all} color={th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })} active={filter === 'all'} onClick={() => setFilter('all')} />
        <RegisterInvoiceCard label="Paid Invoices" value={counts.paid} color={th('#065F46', { dark: '#34D399' })} active={filter === 'paid'} onClick={() => setFilter('paid')} />
        <RegisterInvoiceCard label="Pending Invoices" value={counts.pending} color="#8C5810" active={filter === 'pending'} onClick={() => setFilter('pending')} />
        <RegisterInvoiceCard label="Overdue Invoices" value={counts.overdue} color={th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' })} active={filter === 'overdue'} onClick={() => setFilter('overdue')} />
      </div>

      {/* Table */}
      <div className="reg-doc" style={{ margin: 0 }}>
        <div className="reg-doc-head" style={{ padding: '20px 24px 14px' }}>
          <div>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
              Billing Ledgers
            </h2>
            <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
              Showing {filtered.length} invoice record{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="reg-body" style={{ padding: '0 24px 20px' }}>
          {filtered.length === 0 ? (
            <Empty msg="No invoices found matching selected filter." />
          ) : (
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Client Organization</th>
                  <th style={{ textAlign: 'center' }}>Users</th>
                  <th style={{ textAlign: 'center' }}>Total Amount</th>
                  <th style={{ textAlign: 'center' }}>Due Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <React.Fragment key={inv.num}>
                    <tr
                      onClick={() => setExpanded(expanded === inv.num ? null : inv.num)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13px' }}>
                          {inv.num}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13.5px' }}>{inv.client}</div>
                        <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{inv.industry || 'Enterprise'}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                        {inv.totalUsers}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13.5px' }}>
                        {fmt$(inv.total)}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '12.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>
                        {fmtDate(inv.due)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: th('2px', { classic: '3px', dark: '3px' }),
                            fontSize: '10.5px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background: inv.status === 'paid' ? th('#ECFDF5', { dark: '#0B2E24' }) : inv.status === 'pending' ? th('#FEF3C7', { dark: '#3A2A0A' }) : th('#FEF2F2', { dark: '#3A1418' }),
                            color: inv.status === 'paid' ? th('#065F46', { dark: '#34D399' }) : inv.status === 'pending' ? '#8C5810' : th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }),
                            border: `1px solid ${inv.status === 'paid' ? th('#A7F3D0', { dark: '#065F46' }) : inv.status === 'pending' ? th('#FDE68A', { dark: '#78350F' }) : th('#FECACA', { dark: '#7F1D1D' })}`
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontWeight: 700 }}>{expanded === inv.num ? '▲' : '▼'}</span>
                          <button
                            onClick={e => { e.stopPropagation(); download(inv); }}
                            className="reg-btn-secondary"
                            style={{ padding: '3px 9px', fontSize: '11px' }}
                          >
                            PDF ↓
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable breakdown */}
                    {expanded === inv.num && (
                      <tr>
                        <td colSpan={7} style={{ background: th('#F8FAFC', { dark: '#0F172A' }), padding: '16px 20px', borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                          <div style={{ background: th('#FFFFFF', { dark: '#1E293B' }), border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), padding: '16px' }}>
                            {/* User breakdown */}
                            <div style={{ paddingBottom: '12px', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                              <div className="reg-label" style={{ marginBottom: '8px', fontSize: '10.5px' }}>Licensed Seat Breakdown</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                {[
                                  { label: 'Internal',  value: inv.users.internal  },
                                  { label: 'External',  value: inv.users.external  },
                                  { label: 'Partner',   value: inv.users.partner   },
                                  { label: 'vCISO',     value: inv.users.vciso     },
                                  { label: 'Directors', value: inv.users.directors },
                                ].map(({ label, value }) => (
                                  <div key={label} style={{ textAlign: 'center', padding: '8px', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }), border: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }) }}>
                                    <div style={{ fontSize: '10.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{label}</div>
                                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginTop: '2px' }}>{value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Cost breakdown */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', padding: '12px 0', fontSize: '12.5px' }}>
                              {[
                                { label: 'Dashboard Platform Base', value: inv.breakdown.dashboard   },
                                { label: 'Compliance Frameworks',   value: inv.breakdown.framework   },
                                { label: 'Scheduled Audits',        value: inv.breakdown.audit       },
                                { label: 'Security Tools & Feeds',  value: inv.breakdown.tools       },
                                { label: 'Enterprise Integrations', value: inv.breakdown.integration },
                              ].map(({ label, value }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                                  <span style={{ color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>{label}</span>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{fmt$(value)}</span>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}` }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>Grand Total Invoiced</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '16px', color: th('#065F46', { dark: '#34D399' }) }}>{fmt$(inv.total)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100, background: th('#FFFFFF', { dark: '#1E293B' }), border: `1px solid ${th('#A7F3D0', { dark: '#065F46' })}`, borderRadius: th('2px', { classic: '4px', dark: '4px' }), padding: '12px 18px', fontSize: '13px', fontWeight: 600, color: th('#065F46', { dark: '#34D399' }), boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✅</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
