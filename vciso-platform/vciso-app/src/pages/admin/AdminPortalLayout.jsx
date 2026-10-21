import React from 'react';
import { NavLink, useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { AdminDataProvider } from '../../contexts/AdminDataContext';
import OwnerDashboard    from './OwnerDashboard';
import OwnerOnboarding   from './OwnerOnboarding';
import OwnerUserSummary  from './OwnerUserSummary';
import OwnerCostCenter   from './OwnerCostCenter';
import OwnerInvoices     from './OwnerInvoices';
import OwnerIntegrations from './OwnerIntegrations';
import AdminSettings     from './AdminSettings';

import NotificationBell from '../../components/NotificationBell';
import { th } from '../../theme';

// TODO: implement role-based access control before production launch

const NAV = [
  { icon: '🏠', label: 'Dashboard',                path: 'dashboard'    },
  { icon: '📋', label: 'Onboarding Status',        path: 'onboarding'   },
  { icon: '👥', label: 'User Summary',             path: 'user-summary' },
  { icon: '💰', label: 'Cost Center',              path: 'cost-center'  },
  { icon: '📄', label: 'Invoices',                 path: 'invoices'     },
  { icon: '🔗', label: 'Integrations & Compliance', path: 'integrations' },
  null,
  { icon: '⚙️', label: 'Settings',                path: 'settings'     },
];

const PAGE_TITLES = {
  dashboard:    'Dashboard',
  onboarding:   'Onboarding Status',
  'user-summary': 'User Summary',
  'cost-center':  'Cost Center',
  invoices:     'Invoices',
  integrations: 'Integrations & Compliance',
  settings:     'Settings',
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminPortalLayout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const seg       = location.pathname.split('/').filter(Boolean).pop();
  const pageTitle = PAGE_TITLES[seg] || 'Owner Portal';

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="reg-wrap" style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Sidebar (Register Style #1A202C) ── */}
      <aside className="reg-side" style={{ height: '100vh', position: 'sticky', top: 0 }}>

        {/* Brand */}
        <div className="reg-brand" style={{ padding: '0 20px 16px', borderBottom: `1px solid ${th('#3A475C', { classic: '#E2E8F0', dark: '#333B42' })}` }}>
          <div className="reg-brand-name" style={{ fontFamily: 'Source Serif 4, serif', fontSize: '18px', color: th('#FFFFFF', { dark: '#F2EFE6' }), fontWeight: 600 }}>
            SecureIQ
          </div>
          <div style={{ fontSize: '11px', color: th('#A0AEC0', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            Platform Admin &amp; Owner
          </div>
        </div>

        {/* Switch View Quick Link */}
        <div style={{ padding: '12px 16px 6px' }}>
          <button
            onClick={() => navigate('/dashboard/vciso/main')}
            style={{
              width: '100%',
              padding: '7px 10px',
              background: th('#3A475C', { classic: '#F1F5F9', dark: '#262B32' }),
              border: `1px solid ${th('#4A5568', { classic: '#CBD5E1', dark: '#3A4048' })}`,
              borderRadius: th('2px', { classic: '3px', dark: '3px' }),
              color: th('#CBD5E0', { classic: '#475569', dark: '#C9CCC2' }),
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = th('#3A475C', { classic: '#E2E8F0', dark: '#333B42' }); e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = th('#3A475C', { classic: '#F1F5F9', dark: '#262B32' }); e.currentTarget.style.color = th('#CBD5E0', { classic: '#475569', dark: '#C9CCC2' }); }}
          >
            <span>🛡️ vCISO Register</span>
            <span style={{ fontSize: '10px', color: '#9AE6B4' }}>Switch →</span>
          </button>
        </div>

        {/* Nav Section Header */}
        <div className="reg-nav-section-hdr" style={{ padding: '14px 20px 6px', fontSize: '10px', fontWeight: 700, color: th('#A0AEC0', { classic: '#64748B', dark: '#94A3B8' }), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Owner Management
        </div>

        {/* Nav links */}
        <nav className="reg-nav-scroll" style={{ flex: 1, padding: '4px 0' }}>
          {NAV.map((item, i) =>
            item === null
              ? <div key={`sep${i}`} style={{ height: '1px', background: th('#3A475C', { classic: '#E2E8F0', dark: '#333B42' }), margin: '8px 16px' }} />
              : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `reg-nav-item ${isActive ? 'active' : ''}`}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 20px',
                    textDecoration: 'none',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#FFFFFF' : th('#CBD5E0', { classic: '#475569', dark: '#C9CCC2' }),
                    background: isActive ? th('#3A475C', { classic: '#F1F5F9', dark: '#262B32' }) : 'transparent',
                    borderLeft: isActive ? `3px solid ${th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' })}` : '3px solid transparent',
                    transition: 'all 0.15s',
                  })}
                >
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                  <span className="reg-nav-item-text">{item.label}</span>
                </NavLink>
              )
          )}
        </nav>

        {/* User Footer + Logout */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${th('#3A475C', { classic: '#E2E8F0', dark: '#333B42' })}`, background: th('#283141', { classic: '#0F172A', dark: '#171B21' }) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: th('#3A475C', { classic: '#F1F5F9', dark: '#262B32' }),
              border: `1px solid ${th('#4B5563', { dark: '#CBD5E1' })}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: th('#FFFFFF', { dark: '#F2EFE6' }),
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: th('#FFFFFF', { dark: '#F2EFE6' }), fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Platform Admin'}
              </div>
              <div style={{ color: th('#A0AEC0', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '11px' }}>Executive Owner</div>
            </div>
          </div>
          <button
            onClick={() => { if (logout) logout(); navigate('/login'); }}
            style={{
              width: '100%',
              padding: '6px 10px',
              background: th('#3A475C', { classic: '#F8FAFC', dark: '#21262D' }),
              border: `1px solid ${th('#3A475C', { classic: '#E2E8F0', dark: '#333B42' })}`,
              borderRadius: th('2px', { classic: '3px', dark: '3px' }),
              color: th('#CBD5E0', { classic: '#475569', dark: '#C9CCC2' }),
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = th('#3A475C', { classic: '#E2E8F0', dark: '#333B42' }); e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = th('#3A475C', { classic: '#F8FAFC', dark: '#21262D' }); e.currentTarget.style.color = th('#CBD5E0', { classic: '#475569', dark: '#C9CCC2' }); }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area (Register #EDF2F7 Paper Canvas) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }) }}>

        {/* Top bar (Register Clean Header) */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
          borderBottom: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
          padding: '0 36px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: 'Source Serif 4, serif', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 700, fontSize: '18px' }}>
            {pageTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '12px', fontFamily: 'JetBrains Mono' }}>{fmtDate(new Date())}</span>
            <NotificationBell />
            <span style={{
              background: th('#E2E8F0', { dark: '#334155' }),
              color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }),
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '2px',
              border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
              textTransform: 'uppercase',
              letterSpacing: '0.03em'
            }}>Owner Scope</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '32px 36px' }}>
          <AdminDataProvider>
            <Routes>
              <Route path="dashboard"    element={<OwnerDashboard />}    />
              <Route path="onboarding"   element={<OwnerOnboarding />}   />
              <Route path="user-summary" element={<OwnerUserSummary />}  />
              <Route path="cost-center"  element={<OwnerCostCenter />}   />
              <Route path="invoices"     element={<OwnerInvoices />}     />
              <Route path="integrations" element={<OwnerIntegrations />} />
              <Route path="settings"     element={<AdminSettings />}     />
              <Route path="*"            element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AdminDataProvider>
        </main>
      </div>
    </div>
  );
}
