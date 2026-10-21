import React from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { Loader, PageTitle, Empty, Avatar } from './OwnerDashboard';
import { th } from '../../theme';

function RegisterMetricCard({ icon, label, value, color }) {
  return (
    <div className="reg-gauge" style={{ textAlign: 'left', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span className="reg-label" style={{ margin: 0, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{label}</span>
      </div>
      <div className="reg-gauge-val" style={{ color: color || th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontFamily: 'Source Serif 4, serif', fontSize: '22px' }}>
        {value}
      </div>
    </div>
  );
}

export default function OwnerOnboarding() {
  const { engineData, loading } = useAdminData();
  if (loading) return <Loader />;

  const cl = engineData?.clients || [];

  const enriched = cl.map(c => {
    const pct   = c.onboarding?.progressPercent ?? (c.status === 'active' ? 100 : 0);
    const done  = (c.onboarding?.modulesEnabled || 0) + (c.onboarding?.integrationsEnabled || 0);
    const total = Math.max(done, Math.round(done / Math.max(pct, 1) * 100));
    const stat  = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started';
    return { ...c, pct, done, total: total || done, stat };
  });

  const counts = {
    started:   enriched.filter(c => c.pct > 0).length,
    completed: enriched.filter(c => c.pct >= 100).length,
    inProgress: enriched.filter(c => c.pct > 0 && c.pct < 100).length,
  };

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="reg-doc-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>Onboarding Oversight</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            Client implementation trajectory, milestone completion, and provisioning health across all accounts.
          </p>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <RegisterMetricCard icon="🚀" label="Onboarding Started" value={counts.started} color={th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })} />
        <RegisterMetricCard icon="✅" label="Fully Provisioned" value={counts.completed} color={th('#065F46', { dark: '#34D399' })} />
        <RegisterMetricCard icon="⏳" label="In Implementation" value={counts.inProgress} color="#8C5810" />
      </div>

      {/* Client progress table */}
      <div className="reg-doc" style={{ margin: 0 }}>
        <div className="reg-doc-head" style={{ padding: '20px 24px 14px' }}>
          <div>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
              Tenant Onboarding &amp; Milestone Progress
            </h2>
            <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
              Detailed completion percentages and steps verified
            </div>
          </div>
        </div>
        <div className="reg-body" style={{ padding: '0 24px 20px' }}>
          {enriched.length === 0 ? (
            <Empty msg="No clients currently in onboarding." />
          ) : (
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Client Organization</th>
                  <th style={{ textAlign: 'center' }}>Completed Steps</th>
                  <th style={{ minWidth: '180px' }}>Completion Progress</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((c) => {
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar name={c.companyName || c.name} />
                          <div>
                            <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13.5px' }}>{c.companyName || c.name}</div>
                            <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{c.industry || 'Enterprise'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13px' }}>
                          {c.done}/{c.total}
                        </span>
                        <div style={{ fontSize: '10.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>milestones</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Progress</span>
                          <span style={{ fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontFamily: 'JetBrains Mono, monospace' }}>{c.pct}%</span>
                        </div>
                        <div style={{ height: '6px', background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), borderRadius: th('2px', { classic: '3px', dark: '3px' }), overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, c.pct)}%`,
                              background: c.pct >= 100 ? '#065F46' : c.pct > 0 ? th('#1A202C', { classic: '#0F172A', dark: '#1E293B' }) : th('#CBD5E0', { classic: '#475569', dark: '#C9CCC2' }),
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: th('2px', { classic: '3px', dark: '3px' }),
                            fontSize: '10.5px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background: c.stat === 'completed' ? th('#ECFDF5', { dark: '#0B2E24' }) : c.stat === 'in_progress' ? th('#FEF3C7', { dark: '#3A2A0A' }) : '#F4F4F0',
                            color: c.stat === 'completed' ? th('#065F46', { dark: '#34D399' }) : c.stat === 'in_progress' ? '#8C5810' : th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }),
                            border: `1px solid ${c.stat === 'completed' ? th('#A7F3D0', { dark: '#065F46' }) : c.stat === 'in_progress' ? th('#FDE68A', { dark: '#78350F' }) : th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
                          }}
                        >
                          {c.stat === 'completed' ? 'Completed' : c.stat === 'in_progress' ? 'In Progress' : 'Not Started'}
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
