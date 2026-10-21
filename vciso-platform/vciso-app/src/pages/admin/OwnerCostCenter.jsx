import React, { useState } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { Loader, Empty, Avatar } from './OwnerDashboard';
import { th } from '../../theme';

function fmt$(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

function RegisterRevenueCard({ label, value }) {
  return (
    <div className="reg-gauge" style={{ textAlign: 'left', padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <span className="reg-label" style={{ margin: 0, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{label}</span>
      <div className="reg-gauge-val" style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', marginTop: '6px' }}>
        {fmt$(value)}
      </div>
    </div>
  );
}

function LineItem({ label, value, divider, grand, sub }) {
  if (divider) return <div style={{ borderTop: grand ? `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}` : `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, margin: grand ? '8px 0' : '6px 0' }} />;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: grand ? '6px 0' : sub ? '3px 0 3px 12px' : '4px 0' }}>
      <span style={{ fontSize: grand ? '13px' : '12.5px', fontWeight: grand ? 700 : 500, color: grand ? th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) : sub ? th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) : th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>
        {label}
      </span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: grand ? '15px' : '12.5px', fontWeight: grand ? 800 : 600, color: grand ? th('#065F46', { dark: '#34D399' }) : th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
        {value}
      </span>
    </div>
  );
}

function DetailSection({ title, items, unitLabel }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      <div className="reg-label" style={{ marginBottom: '6px', fontSize: '10.5px' }}>{title}</div>
      <div style={{ background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }), borderRadius: th('2px', { classic: '3px', dark: '3px' }), padding: '10px 14px', border: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: '12px', borderBottom: i < items.length - 1 ? `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` : 'none' }}>
            <span style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 500 }}>{item.name}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), fontWeight: 600 }}>{fmt$(item.unitCost)}{unitLabel || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OwnerCostCenter() {
  const { engineData, loading } = useAdminData();
  const [expanded, setExpanded] = useState(null);

  if (loading) return <Loader />;

  const cl = engineData?.clients || [];

  const grandTotalAll    = cl.reduce((a, c) => a + (c.costs?.grandTotal        || 0), 0);
  const dashboardRevAll  = cl.reduce((a, c) => a + (c.costs?.dashboardCost     || 0), 0);
  const frameworkRevAll  = cl.reduce((a, c) => a + (c.costs?.frameworkCost     || 0), 0);
  const auditRevAll      = cl.reduce((a, c) => a + (c.costs?.auditCost         || 0), 0);
  const toolRevAll       = cl.reduce((a, c) => a + (c.costs?.securityToolCost  || 0), 0);
  const intRevAll        = cl.reduce((a, c) => a + (c.costs?.integrationCost   || 0), 0);

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="reg-doc-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>Platform Cost Center</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            Estimated monthly billings and contracted service tiers across client portfolios.
          </p>
        </div>
      </div>

      {/* Revenue summary hero */}
      <div className="reg-doc" style={{ margin: 0, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div className="reg-label" style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Aggregate Monthly Revenue</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 800, color: th('#065F46', { dark: '#34D399' }), marginTop: '2px' }}>
              {fmt$(grandTotalAll)}
            </div>
          </div>
          <span style={{ fontSize: '32px', opacity: 0.3 }}>💰</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <RegisterRevenueCard label="Dashboards" value={dashboardRevAll} />
          <RegisterRevenueCard label="Frameworks" value={frameworkRevAll} />
          <RegisterRevenueCard label="Audits" value={auditRevAll} />
          <RegisterRevenueCard label="Security Tools" value={toolRevAll} />
          <RegisterRevenueCard label="Integrations" value={intRevAll} />
        </div>
      </div>

      {/* Per-client cost breakdowns */}
      <div className="reg-doc" style={{ margin: 0 }}>
        <div className="reg-doc-head" style={{ padding: '20px 24px 14px' }}>
          <div>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
              Cost Breakdown by Client Organization
            </h2>
            <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
              Detailed itemized services and subscription amounts
            </div>
          </div>
        </div>
        <div className="reg-body" style={{ padding: '0 24px 20px' }}>
          {cl.length === 0 ? (
            <Empty msg="No client cost records available." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {cl.map((c, i) => {
                const costs      = c.costs || {};
                const users      = c.users  || {};
                const totalUsers = users.total || 0;
                const dashboard  = costs.dashboardCost    || 0;
                const framework  = costs.frameworkCost    || 0;
                const audit      = costs.auditCost        || 0;
                const tools      = costs.securityToolCost || 0;
                const integration= costs.integrationCost  || 0;
                const total      = costs.grandTotal       || (dashboard + framework + audit + tools + integration);

                const isOpen = expanded === (c.id || i);

                const frameworkItems = (c.frameworks || []).map(f => ({ name: f.name, unitCost: f.monthlyCost || 0 }));
                const auditItems     = (c.audits     || []).map(a => ({ name: a.name, unitCost: a.cost        || 0 }));
                const toolItems      = (c.securityTools || []).map(t => ({ name: t.name, unitCost: t.totalCost || 0 }));
                const intItems       = (c.integrations  || []).map(n => ({ name: n.name, unitCost: n.cost      || 0 }));

                return (
                  <div
                    key={c.id || i}
                    style={{
                      background: th('#FFFFFF', { dark: '#1E293B' }),
                      border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                      borderRadius: th('2px', { classic: '3px', dark: '3px' }),
                      overflow: 'hidden'
                    }}
                  >
                    {/* Client header */}
                    <div
                      onClick={() => setExpanded(isOpen ? null : (c.id || i))}
                      style={{
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isOpen ? th('#F8FAFC', { dark: '#0F172A' }) : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                        borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`,
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={c.companyName || c.name} />
                        <div>
                          <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13.5px' }}>{c.companyName || c.name}</div>
                          <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                            {totalUsers} users ({users.internal || 0} int · {users.external || 0} ext · {users.vciso || 0} vCISO)
                            {c.industry ? ` · ${c.industry}` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: th('#065F46', { dark: '#34D399' }), fontSize: '15px' }}>
                            {fmt$(total)}
                          </div>
                          <div style={{ fontSize: '10.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>monthly bill</div>
                        </div>
                        <span style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontWeight: 700 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Cost lines */}
                    <div style={{ padding: '16px 20px' }}>
                      <LineItem label="Dashboard Platform Base" value={fmt$(dashboard)}   />
                      <LineItem label="Compliance Frameworks"  value={fmt$(framework)}   />
                      <LineItem label="Audits & Assurance"      value={fmt$(audit)}       />
                      <LineItem label="Security Tools & Feeds"  value={fmt$(tools)}       />
                      <LineItem label="Enterprise Integrations" value={fmt$(integration)} />
                      <LineItem divider grand />
                      <LineItem label="Total Estimated Recurring" value={fmt$(total)} grand />
                    </div>

                    {/* Detailed breakdown */}
                    {isOpen && (
                      <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                        <DetailSection title="Selected Compliance Frameworks" items={frameworkItems} />
                        <DetailSection title="Scheduled Audits"               items={auditItems}     />
                        <DetailSection title="Security Connectors & Tools"   items={toolItems}      />
                        <DetailSection title="System Integrations"            items={intItems}       />
                        {frameworkItems.length === 0 && auditItems.length === 0 && toolItems.length === 0 && intItems.length === 0 && (
                          <div style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '12px', marginTop: '10px' }}>No modular services selected.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
