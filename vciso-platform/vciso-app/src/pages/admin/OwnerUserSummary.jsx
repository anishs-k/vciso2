import React from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { Loader, Empty, Avatar } from './OwnerDashboard';
import { th } from '../../theme';

const USER_TYPES = [
  { key: 'internal',  label: 'Internal Users',  icon: '🏢', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) },
  { key: 'external',  label: 'External Users',  icon: '🌐', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) },
  { key: 'partner',   label: 'Partner Users',   icon: '🤝', color: '#8C5810' },
  { key: 'directors', label: 'Directors',        icon: '👔', color: th('#065F46', { dark: '#34D399' }) },
  { key: 'vciso',     label: 'vCISO Users',     icon: '🛡️', color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) },
];

function RegisterUserCard({ icon, label, value, color }) {
  return (
    <div className="reg-gauge" style={{ textAlign: 'left', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span className="reg-label" style={{ margin: 0, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{label}</span>
      </div>
      <div className="reg-gauge-val" style={{ color: color || th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontFamily: 'JetBrains Mono, monospace', fontSize: '22px' }}>
        {value}
      </div>
    </div>
  );
}

export default function OwnerUserSummary() {
  const { engineData, userCounts, loading } = useAdminData();
  if (loading) return <Loader />;

  const cl = engineData?.clients || [];
  const s  = engineData?.summary || {};
  const t  = userCounts?.totals  || {};

  const totals = {
    internal:  t.internal  ?? s.internalUsers  ?? 0,
    external:  t.external  ?? s.externalUsers  ?? 0,
    partner:   t.partner   ?? s.partnerUsers   ?? 0,
    directors: t.directors ?? s.directors      ?? 0,
    vciso:     t.vciso     ?? s.vcisoUsers     ?? 0,
    total:     t.total     ?? s.totalUsers     ?? 0,
  };

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="reg-doc-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>Client User Ecosystem</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            Aggregated seat allocation, licensed seat capacity, and user type distribution across all tenants.
          </p>
        </div>
      </div>

      {/* Hero total gauge & breakdown row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="reg-gauge" style={{ gridColumn: 'span 2', textAlign: 'left', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="reg-label" style={{ margin: 0, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Total Licensed Users</div>
            <div className="reg-gauge-val" style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontFamily: 'Source Serif 4, serif', fontSize: '32px', marginTop: '4px' }}>
              {totals.total}
            </div>
            <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
              Across {cl.length} active enterprise client{cl.length !== 1 ? 's' : ''}
            </div>
          </div>
          <span style={{ fontSize: '42px', opacity: 0.25 }}>👥</span>
        </div>
        <RegisterUserCard icon="🏢" label="Internal Users" value={totals.internal} color={th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })} />
        <RegisterUserCard icon="🌐" label="External Users" value={totals.external} color={th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })} />
        <RegisterUserCard icon="🤝" label="Partner Users" value={totals.partner} color="#8C5810" />
        <RegisterUserCard icon="👔" label="Executive Directors" value={totals.directors} color={th('#065F46', { dark: '#34D399' })} />
        <RegisterUserCard icon="🛡️" label="vCISO Consultants" value={totals.vciso} color={th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' })} />
      </div>

      {/* Per-client user distribution table */}
      <div className="reg-doc" style={{ margin: 0 }}>
        <div className="reg-doc-head" style={{ padding: '20px 24px 14px' }}>
          <div>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
              User Allocation by Organization
            </h2>
            <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
              Granular role and identity seat counts
            </div>
          </div>
        </div>
        <div className="reg-body" style={{ padding: '0 24px 20px' }}>
          {cl.length === 0 ? (
            <Empty msg="No client user records found." />
          ) : (
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Client Organization</th>
                  <th style={{ textAlign: 'center' }}>Total Seats</th>
                  <th style={{ textAlign: 'center' }}>Internal</th>
                  <th style={{ textAlign: 'center' }}>External</th>
                  <th style={{ textAlign: 'center' }}>Partner</th>
                  <th style={{ textAlign: 'center' }}>Directors</th>
                  <th style={{ textAlign: 'center' }}>vCISO</th>
                </tr>
              </thead>
              <tbody>
                {cl.map((c) => {
                  const row = userCounts?.perClient?.find(r => r.id === c.id);
                  const cu  = c.users || {};
                  const vals = [
                    row?.total     ?? cu.total     ?? 0,
                    row?.internal  ?? cu.internal  ?? 0,
                    row?.external  ?? cu.external  ?? 0,
                    row?.partner   ?? cu.partner   ?? 0,
                    row?.directors ?? cu.directors ?? 0,
                    row?.vciso     ?? cu.vciso     ?? 0,
                  ];
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
                      {vals.map((v, j) => (
                        <td
                          key={j}
                          style={{
                            textAlign: 'center',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '13px',
                            fontWeight: j === 0 ? 700 : v > 0 ? 600 : 400,
                            color: j === 0 ? th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) : v > 0 ? th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) : th('#4A5568', { classic: '#94A3B8', dark: '#94A3B8' })
                          }}
                        >
                          {v}
                        </td>
                      ))}
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
