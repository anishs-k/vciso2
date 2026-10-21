import React from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { th } from '../../theme';

function fmt$(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

function RegisterSummaryCard({ icon, label, value, color, mono }) {
  return (
    <div className="reg-gauge" style={{ textAlign: 'left', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span className="reg-label" style={{ margin: 0, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{label}</span>
      </div>
      <div className="reg-gauge-val" style={{ color: color || th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontFamily: mono ? 'JetBrains Mono, monospace' : 'Source Serif 4, serif', fontSize: '22px' }}>
        {value}
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { engineData, loading } = useAdminData();

  if (loading) return <Loader />;

  const cl = engineData?.clients || [];

  const totalClients     = cl.length;
  const totalUsers       = cl.reduce((a, c) => a + (c.users?.total || 0), 0);
  const dashboardRev     = cl.reduce((a, c) => a + (c.costs?.dashboardCost    || 0), 0);
  const frameworkRev     = cl.reduce((a, c) => a + (c.costs?.frameworkCost    || 0), 0);
  const auditRev         = cl.reduce((a, c) => a + (c.costs?.auditCost        || 0), 0);
  const securityToolRev  = cl.reduce((a, c) => a + (c.costs?.securityToolCost || 0), 0);
  const integrationRev   = cl.reduce((a, c) => a + (c.costs?.integrationCost  || 0), 0);
  const grandTotalRev    = cl.reduce((a, c) => a + (c.costs?.grandTotal        || 0), 0);

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="reg-doc-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>Platform Owner Cockpit</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            Real-time financial overview, service revenues, and client portfolio metrics.
          </p>
        </div>
      </div>

      {/* Row 1 — Clients & Users */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <RegisterSummaryCard icon="🏢" label="Total Active Clients" value={totalClients} color={th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })} />
        <RegisterSummaryCard icon="👥" label="Managed Platform Users" value={totalUsers} color={th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })} />
        <RegisterSummaryCard icon="💰" label="Grand Total Revenue" value={fmt$(grandTotalRev)} color={th('#065F46', { dark: '#34D399' })} mono />
      </div>

      {/* Row 2 — Revenue breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <RegisterSummaryCard icon="💻" label="Dashboard Revenue" value={fmt$(dashboardRev)} mono />
        <RegisterSummaryCard icon="📋" label="Framework Revenue" value={fmt$(frameworkRev)} mono />
        <RegisterSummaryCard icon="🔍" label="Audit Revenue" value={fmt$(auditRev)} mono />
        <RegisterSummaryCard icon="🛡️" label="Security Tool Revenue" value={fmt$(securityToolRev)} mono />
        <RegisterSummaryCard icon="🔗" label="Integration Revenue" value={fmt$(integrationRev)} mono />
      </div>

      {/* Client list in Register Card */}
      <div className="reg-doc" style={{ margin: 0 }}>
        <div className="reg-doc-head" style={{ padding: '20px 24px 14px' }}>
          <div>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
              Client Organizations &amp; Onboarding Progress
            </h2>
            <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
              Live status across all {cl.length} enterprise accounts
            </div>
          </div>
        </div>
        <div className="reg-body" style={{ padding: '0 24px 20px' }}>
          {cl.length === 0 ? (
            <Empty msg="No clients onboarded yet." />
          ) : (
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Industry &amp; Users</th>
                  <th>Onboarding Status</th>
                  <th style={{ textAlign: 'right' }}>Total Contract Revenue</th>
                </tr>
              </thead>
              <tbody>
                {cl.map((c) => {
                  const pct = c.onboarding?.progressPercent ?? (c.status === 'active' ? 100 : 0);
                  const users = c.users?.total || 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar name={c.companyName || c.name} />
                          <div>
                            <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13.5px' }}>{c.companyName || c.name}</div>
                            <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>ID: {c.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{c.industry || 'Technology'}</span>
                        <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{users} active users</div>
                      </td>
                      <td style={{ minWidth: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Progress</span>
                          <span style={{ fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{pct}%</span>
                        </div>
                        <div style={{ height: '5px', background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), borderRadius: th('2px', { classic: '3px', dark: '3px' }), overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: pct >= 100 ? '#065F46' : pct > 0 ? th('#1A202C', { classic: '#0F172A', dark: '#1E293B' }) : th('#CBD5E0', { classic: '#475569', dark: '#C9CCC2' })
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13.5px' }}>
                          {fmt$(c.costs?.grandTotal || 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared helpers
export function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <div style={{ width: '28px', height: '28px', border: `3px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderTopColor: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

export function PageTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

export function SectionHeading({ children }) {
  return <div className="reg-label" style={{ marginBottom: '8px' }}>{children}</div>;
}

export function Empty({ msg }) {
  return <div style={{ padding: '32px', textAlign: 'center', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '12.5px' }}>{msg}</div>;
}

export function Avatar({ name, size = 32 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: th('2px', { classic: '3px', dark: '3px' }),
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Source Serif 4, serif',
        fontWeight: 700,
        fontSize: '13px',
        background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }),
        color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }),
        border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
      }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    completed:   { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    not_started: { label: 'Not Started', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
    paid:        { label: 'Paid',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    overdue:     { label: 'Overdue',     cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const s = map[status] || { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}
