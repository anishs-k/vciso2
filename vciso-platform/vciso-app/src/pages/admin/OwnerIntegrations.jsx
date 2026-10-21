import React from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { Loader, Empty, Avatar } from './OwnerDashboard';
import { th } from '../../theme';

function fmt$(n) {
  const v = Math.round(Number(n) || 0);
  return v > 0 ? '$' + v.toLocaleString('en-US') : null;
}

function ItemRow({ label, price }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: th('#065F46', { dark: '#34D399' }), fontWeight: 700, fontSize: '12px' }}>✓</span>
        <span style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '12.5px', fontWeight: 500 }}>{label}</span>
      </div>
      {price && <span style={{ fontFamily: 'JetBrains Mono, monospace', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '12px', fontWeight: 600 }}>{price}</span>}
    </div>
  );
}

function ItemGroup({ title, icon, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span style={{ fontFamily: 'Source Serif 4, serif', fontWeight: 600, fontSize: '13.5px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{title}</span>
        <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '1px 7px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
          {items.length}
        </span>
      </div>
      <div style={{ background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }), borderRadius: th('2px', { classic: '3px', dark: '3px' }), padding: '10px 14px', border: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
        {items.map((item, i) => (
          <ItemRow key={i} label={item.name} price={fmt$(item.unitCost)} />
        ))}
      </div>
    </div>
  );
}

export default function OwnerIntegrations() {
  const { engineData, loading } = useAdminData();

  if (loading) return <Loader />;

  const cl = engineData?.clients || [];

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="reg-doc-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>Integrations &amp; Compliance</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            Active connectors, compliance modules, audit routines, and security feeds configured per tenant.
          </p>
        </div>
      </div>

      {cl.length === 0 ? (
        <div className="reg-doc" style={{ margin: 0, padding: '32px' }}>
          <Empty msg="No client integration records available." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cl.map((c, i) => {
            const frameworks   = (c.frameworks    || []).map(f => ({ name: f.name, unitCost: f.monthlyCost || 0 }));
            const tools        = (c.securityTools || []).map(t => ({ name: t.name, unitCost: t.totalCost  || 0 }));
            const integrations = (c.integrations  || []).map(n => ({ name: n.name, unitCost: n.cost       || 0 }));
            const audits       = (c.audits        || []).map(a => ({ name: a.name, unitCost: a.cost       || 0 }));

            const total = frameworks.length + tools.length + integrations.length + audits.length;

            return (
              <div
                key={c.id || i}
                className="reg-doc"
                style={{ margin: 0 }}
              >
                {/* Client header */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' })
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={c.companyName || c.name} />
                    <div>
                      <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '14px' }}>{c.companyName || c.name}</div>
                      <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                        {(c.users?.total || 0)} users · {c.industry || 'Enterprise'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '12.5px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                      {total} services enabled
                    </div>
                    <div style={{ fontSize: '10.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                      {frameworks.length} fw · {tools.length} tools · {integrations.length} int · {audits.length} audits
                    </div>
                  </div>
                </div>

                {/* Items */}
                {total === 0 ? (
                  <div style={{ padding: '24px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '12.5px', fontStyle: 'italic' }}>
                    No add-on security modules or frameworks active yet.
                  </div>
                ) : (
                  <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <ItemGroup title="Compliance Frameworks" icon="📋" items={frameworks}   />
                    <ItemGroup title="Security Tools & Feeds" icon="🛡️" items={tools}        />
                    <ItemGroup title="Enterprise Connectors" icon="🔗" items={integrations} />
                    <ItemGroup title="Audits & Assurance"    icon="🔍" items={audits}       />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
