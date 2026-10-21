import React from 'react';
import { NavLink, useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useOwnerAuth } from '../../contexts/OwnerAuthContext';
import { AdminDataProvider, useAdminData } from '../../contexts/AdminDataContext';
import { CurrencyProvider, useCurrency, CURRENCIES } from '../../contexts/CurrencyContext';

import OwnerPortalDashboard from './OwnerPortalDashboard';
import OwnerPortalClients   from './OwnerPortalClients';
import AdminSettings        from '../admin/AdminSettings';
import { th } from '../../theme';

const NAV_PRIMARY = [
  { icon: '▦',  label: 'Dashboard', path: 'dashboard' },
  { icon: '◉',  label: 'Clients',   path: 'clients'   },
];
const NAV_SYSTEM = [
  { icon: '◎',  label: 'Settings',  path: 'settings'  },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  clients:   'Clients',
  settings:  'Settings',
};

function fmtTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ── Currency Selector ── */
function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: open ? th('#eff6ff', { dark: '#172554' }) : th('#ffffff', { dark: '#1E293B' }),
        border: `1px solid ${th('#e5e7eb', { dark: '#334155' })}`, borderRadius: th('2px', { classic: '10px', dark: '10px' }),
        color: th('#2563eb', { dark: '#60A5FA' }), fontSize: '12px', fontWeight: 700,
        padding: '6px 12px', cursor: 'pointer',
      }}>
        <span>{currency.flag}</span>
        <span>{currency.code}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          background: th('#ffffff', { dark: '#1E293B' }), border: `1px solid ${th('#e5e7eb', { dark: '#334155' })}`, borderRadius: th('2px', { classic: '12px', dark: '12px' }),
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)', overflow: 'hidden', minWidth: '170px',
        }}>
          {CURRENCIES.map(c => (
            <div key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', cursor: 'pointer',
              background: currency.code === c.code ? th('#eff6ff', { dark: '#172554' }) : 'transparent',
              borderBottom: `1px solid ${th('#f1f5f9', { dark: '#172033' })}`,
            }}
              onMouseEnter={e => { if (currency.code !== c.code) e.currentTarget.style.background = th('#f8fafc', { dark: '#0F172A' }); }}
              onMouseLeave={e => { if (currency.code !== c.code) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>{c.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: th('#0f172a', { dark: '#F1F5F9' }) }}>{c.code}</div>
                <div style={{ fontSize: '10px', color: th('#64748b', { dark: '#94A3B8' }) }}>{c.label}</div>
              </div>
              {currency.code === c.code && <span style={{ color: th('#2563eb', { dark: '#60A5FA' }), fontWeight: 800 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── TopBar ── */
function TopBar({ pageTitle }) {
  const { refresh, loading, lastUpdated } = useAdminData();
  const [syncing, setSyncing] = React.useState(false);
  const [pulse, setPulse]     = React.useState(false);
  const prevUpdated = React.useRef(null);

  React.useEffect(() => {
    if (lastUpdated && lastUpdated !== prevUpdated.current) {
      prevUpdated.current = lastUpdated;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1400);
      return () => clearTimeout(t);
    }
  }, [lastUpdated]);

  function handleRefresh() { setSyncing(true); refresh(); setTimeout(() => setSyncing(false), 1000); }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: th('#ffffff', { dark: '#1E293B' }),
      borderBottom: `1px solid ${th('#e5e7eb', { dark: '#334155' })}`, padding: '0 32px', height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ color: th('#0f172a', { dark: '#F1F5F9' }), fontWeight: 800, fontSize: '16px', letterSpacing: '-0.01em' }}>
        {pageTitle}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {lastUpdated && (
          <span style={{ color: pulse ? '#059669' : '#94a3b8', fontSize: '11px', transition: 'color 0.4s' }}>
            {pulse ? '● Live' : `Updated ${fmtTime(lastUpdated)}`}
          </span>
        )}
        <button onClick={handleRefresh} disabled={syncing || loading} style={{
          background: syncing ? th('#eff6ff', { dark: '#172554' }) : th('#ffffff', { dark: '#1E293B' }), border: `1px solid ${th('#e5e7eb', { dark: '#334155' })}`, borderRadius: th('2px', { classic: '10px', dark: '10px' }),
          color: th('#2563eb', { dark: '#60A5FA' }), fontSize: '12px', fontWeight: 700,
          padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          opacity: syncing ? 0.6 : 1,
        }}>
          <span style={{ display: 'inline-block', animation: syncing ? 'spin 0.6s linear infinite' : 'none' }}>⟳</span>
          {syncing ? 'Syncing…' : 'Refresh'}
        </button>
        <CurrencySelector />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: pulse ? th('#ecfdf5', { dark: '#0B2E24' }) : th('#eff6ff', { dark: '#172554' }),
          border: `1px solid ${pulse ? th('#a7f3d0', { dark: '#065F46' }) : th('#bfdbfe', { dark: '#1E40AF' })}`,
          borderRadius: th('2px', { classic: '20px', dark: '20px' }), padding: '4px 12px',
          fontSize: '11px', fontWeight: 700, color: pulse ? '#059669' : th('#2563eb', { dark: '#60A5FA' }), transition: 'all 0.4s',
        }}>
          <span style={{ fontSize: '8px' }}>●</span>
          {pulse ? 'Synced' : 'Live'}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </header>
  );
}

/* ── Nav item ── */
function NavItem({ item }) {
  return (
    <NavLink
      to={item.path}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', borderRadius: th('2px', { classic: '10px', dark: '10px' }), marginBottom: '2px',
        textDecoration: 'none', fontSize: '13px',
        fontWeight: isActive ? 700 : 500,
        color: isActive ? th('#2563eb', { dark: '#60A5FA' }) : th('#64748b', { dark: '#94A3B8' }),
        background: isActive ? th('#eff6ff', { dark: '#172554' }) : 'transparent',
        border: isActive ? `1px solid ${th('#bfdbfe', { dark: '#1E40AF' })}` : '1px solid transparent',
        transition: 'all 0.12s',
      })}
    >
      <span style={{ fontSize: '14px', opacity: 0.85 }}>{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );
}

/* ── Inner layout ── */
function PortalInner({ pageTitle }) {
  const { allClients } = useAdminData();
  return (
    <CurrencyProvider clients={allClients}>
      <TopBar pageTitle={pageTitle} />
      <main style={{ flex: 1, padding: '28px 32px', minHeight: 0, background: th('#f8fafc', { dark: '#0F172A' }) }}>
        <Routes>
          <Route path="dashboard" element={<OwnerPortalDashboard />} />
          <Route path="clients"   element={<OwnerPortalClients />}   />
          <Route path="settings"  element={<AdminSettings />}        />
          <Route path="*"         element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </CurrencyProvider>
  );
}

export default function OwnerPortalLayout() {
  const { ownerUser, ownerLogout, getOwnerToken } = useOwnerAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const seg       = location.pathname.split('/').filter(Boolean).pop();
  const pageTitle = PAGE_TITLES[seg] || 'Owner Portal';

  function handleLogout() { ownerLogout(); navigate('/login', { replace: true }); }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: th('#f8fafc', { dark: '#0F172A' }),
      fontFamily: "'Inter', 'Nunito Sans', system-ui, sans-serif",
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '220px', minWidth: '220px',
        background: th('#ffffff', { dark: '#1E293B' }),
        borderRight: `1px solid ${th('#e5e7eb', { dark: '#334155' })}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50,
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${th('#f1f5f9', { dark: '#172033' })}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: th('2px', { classic: '10px', dark: '10px' }), flexShrink: 0,
              background: '#2563eb', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>💼</div>
            <div>
              <div style={{ color: th('#0f172a', { dark: '#F1F5F9' }), fontWeight: 800, fontSize: '13px', letterSpacing: '-0.01em' }}>
                Owner Portal
              </div>
              <div style={{ color: th('#64748b', { dark: '#94A3B8' }), fontSize: '10px', marginTop: '1px', fontWeight: 600 }}>
                Business Console
              </div>
            </div>
          </div>
        </div>

        {/* Primary nav */}
        <nav style={{ flex: 1, padding: '14px 10px 0' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', padding: '0 14px', marginBottom: '6px' }}>
            Main
          </div>
          {NAV_PRIMARY.map(item => <NavItem key={item.path} item={item} />)}

          <div style={{ height: '1px', background: th('#f1f5f9', { dark: '#172033' }), margin: '16px 8px 14px' }} />

          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', padding: '0 14px', marginBottom: '6px' }}>
            System
          </div>
          {NAV_SYSTEM.map(item => <NavItem key={item.path} item={item} />)}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 14px 18px', borderTop: `1px solid ${th('#f1f5f9', { dark: '#172033' })}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: th('2px', { classic: '8px', dark: '8px' }), flexShrink: 0,
              background: th('#eff6ff', { dark: '#172554' }),
              border: `1px solid ${th('#bfdbfe', { dark: '#1E40AF' })}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: th('#2563eb', { dark: '#60A5FA' }), fontWeight: 800, fontSize: '13px',
            }}>
              {ownerUser?.name ? ownerUser.name[0].toUpperCase() : 'O'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ color: th('#0f172a', { dark: '#F1F5F9' }), fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ownerUser?.name || 'Owner'}
              </div>
              <div style={{ color: th('#64748b', { dark: '#94A3B8' }), fontSize: '10px', fontWeight: 600 }}>Business Owner</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px', background: th('#f8fafc', { dark: '#0F172A' }),
            border: `1px solid ${th('#e2e8f0', { dark: '#334155' })}`, borderRadius: th('2px', { classic: '8px', dark: '8px' }),
            color: th('#64748b', { dark: '#94A3B8' }), fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>Sign out</button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminDataProvider tokenGetter={getOwnerToken}>
          <PortalInner pageTitle={pageTitle} />
        </AdminDataProvider>
      </div>
    </div>
  );
}
