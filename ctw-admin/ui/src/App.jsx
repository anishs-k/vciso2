import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Loading } from './components/ui';
import LoginPage from './pages/Login';
import ClientsPage from './pages/Clients';
import OnboardingPage from './pages/Onboarding';
import ClientEditPage from './pages/ClientEdit';
import ClientDetailPage from './pages/ClientDetail';
import BuildPage from './pages/Build';
import AccountPage from './pages/Account';
import AdminsPage from './pages/Admins';
import AuditPage from './pages/Audit';

const icon = (d) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const ICONS = {
  clients: icon(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17 13.6A5.5 5.5 0 0 1 20.5 19" /></>),
  onboarding: icon(<><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></>),
  admins: icon(<><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><circle cx="12" cy="10.5" r="2.3" /><path d="M8.6 16a3.6 3.6 0 0 1 6.8 0" /></>),
  audit: icon(<><path d="M8 4h11v16H8z" /><path d="M5 7v13h11" /><path d="M11 9h5M11 12.5h5M11 16h3" /></>),
};

// Which menu entry a page belongs to: the client form is part of onboarding, a client's page and its builds of Clients.
function section(pathname) {
  if (pathname.startsWith('/onboarding') || /^\/clients\/(new|[^/]+\/edit)$/.test(pathname)) return 'onboarding';
  if (pathname.startsWith('/clients') || pathname.startsWith('/builds')) return 'clients';
  if (pathname.startsWith('/admins')) return 'admins';
  if (pathname.startsWith('/audit')) return 'audit';
  return null;
}

const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

function Shell({ children }) {
  const { admin, pending, signOut } = useAuth();
  const { pathname } = useLocation();
  const setUp = pending.length === 0;
  const current = section(pathname);
  const wide = /^\/clients\/(new|[^/]+\/edit)$/.test(pathname);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  const menu = [
    ['clients', '/clients', 'Clients'],
    ['onboarding', '/onboarding', 'Onboarding'],
    ['admins', '/admins', 'Admins'],
    ['audit', '/audit', 'Audit log'],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to={setUp ? '/clients' : '/account'} className="side-brand" aria-label="CTW Admin home">
          <span className="side-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.5 4.5 5.5v5.8c0 4.7 3.2 8.8 7.5 10.2 4.3-1.4 7.5-5.5 7.5-10.2V5.5L12 2.5Z" fill="#bfdbfe" />
              <path d="M12 2.5v19c4.3-1.4 7.5-5.5 7.5-10.2V5.5L12 2.5Z" fill="#60a5fa" />
            </svg>
          </span>
          <span>
            <strong>vCISO</strong>
            <small>Admin Dashboard</small>
          </span>
        </Link>
        {setUp && (
          <>
            <div className="side-label">Menu</div>
            <nav className="side-menu">
              {menu.map(([key, to, label]) => (
                <Link key={key} to={to} className={current === key ? 'active' : ''} aria-current={current === key ? 'page' : undefined}>
                  {ICONS[key]}
                  {label}
                </Link>
              ))}
            </nav>
          </>
        )}
        <div className="side-foot">
          <Link to="/account" className="side-user" title="My account">
            <span className="initials">{initialsOf(admin.full_name)}</span>
            <div>
              <strong>{admin.full_name}</strong>
              <small>{admin.email}</small>
            </div>
          </Link>
          <button type="button" className="logout" onClick={signOut}>
            Logout
          </button>
        </div>
      </aside>
      <div className="workarea">
        <header className="mainbar">
          <div className="title">Admin Dashboard</div>
          <div className="date">{today}</div>
          {setUp && (
            <Link to="/audit" className="bell" title="Recent activity (audit log)" aria-label="Recent activity">
              🔔
            </Link>
          )}
        </header>
        <main className={`page${wide ? ' wide' : ''}`}>{children}</main>
      </div>
    </div>
  );
}

// Signed in, and (except on My account) done with any required set-up.
function Protected({ children, setupPage = false }) {
  const { admin, me, pending, signedOutByUser } = useAuth();
  const location = useLocation();
  if (admin === undefined || (admin && !me)) return <Loading what="Checking your session" />;
  // An expired session comes back to this page after signing in again; a chosen sign-out does not.
  if (!admin) return <Navigate to="/login" replace state={signedOutByUser ? null : { from: location.pathname }} />;
  if (pending.length && !setupPage) return <Navigate to="/account" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<Protected setupPage><AccountPage /></Protected>} />
          <Route path="/clients" element={<Protected><ClientsPage /></Protected>} />
          <Route path="/onboarding" element={<Protected><OnboardingPage /></Protected>} />
          <Route path="/clients/new" element={<Protected><ClientEditPage /></Protected>} />
          <Route path="/clients/:id" element={<Protected><ClientDetailPage /></Protected>} />
          <Route path="/clients/:id/edit" element={<Protected><ClientEditPage /></Protected>} />
          <Route path="/builds/:id" element={<Protected><BuildPage /></Protected>} />
          <Route path="/admins" element={<Protected><AdminsPage /></Protected>} />
          <Route path="/audit" element={<Protected><AuditPage /></Protected>} />
          <Route path="*" element={<Navigate to="/clients" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
