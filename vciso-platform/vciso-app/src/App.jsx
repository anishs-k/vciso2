import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, SKIP_LOGIN } from './AuthContext';
import { OwnerAuthProvider, useOwnerAuth } from './contexts/OwnerAuthContext';
// Auth pages
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SignupPage from './pages/SignupPage';
import SetPasswordPage from './pages/SetPasswordPage';
import VCISOLayout from './pages/vciso/VCISOLayout';
import ClientDashboard from './pages/ClientDashboard';
import ISO27001QuestionnairePage from './pages/ISO27001QuestionnairePage';
import DPDPQuestionnairePage from './pages/DPDPQuestionnairePage';
import CSPMQuestionnairePage from './pages/CSPMQuestionnairePage';

import PartnerDashboard from './pages/PartnerDashboard';

// Owner Portal — dedicated executive area (access via main login page)
import OwnerPortalLayout from './pages/owner/OwnerPortalLayout';

// Admin app components
import OnboardingWizard from './components/OnboardingWizard';
import AdminEmployees   from './pages/admin/AdminEmployees';
import AdminReports     from './pages/admin/AdminReports';
import AdminFinancialHub from './pages/admin/AdminFinancialHub';
import AdminSettings    from './pages/admin/AdminSettings';
import OwnerUserSummary from './pages/admin/OwnerUserSummary';
import OwnerInvoices    from './pages/admin/OwnerInvoices';
import OwnerIntegrations from './pages/admin/OwnerIntegrations';
import ClientSwitcher from './components/ClientSwitcher';
import NotificationBell from './components/NotificationBell';
import { th } from './theme';

// ─── Owner Route guard ────────────────────────────────────────────────────────
function OwnerRoute({ children }) {
  const { ownerUser, ownerLoading } = useOwnerAuth();
  if (ownerLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Loading…</div>;
  if (!ownerUser)   return <Navigate to="/login" replace />;
  return children;
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRole, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const roles = allowedRoles || (allowedRole ? [allowedRole] : null);
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    if (user.role === 'vciso') return <Navigate to="/dashboard/vciso" replace />;
    if (user.role === 'partner') return <Navigate to="/dashboard/partner" replace />;
    return <Navigate to="/dashboard/client" replace />;
  }
  return children;
}

// ─── Contract Expiry Popup ────────────────────────────────────────────────────
function ContractExpiryPopup({ contract, clientId, onDismiss }) {
  if (!contract?.contract_end) return null;
  const end = new Date(contract.contract_end);
  const now = new Date();
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (daysLeft > 30 || daysLeft <= 0) return null;

  const key = `expiry_dismissed_${clientId}_${contract.contract_end}`;
  if (localStorage.getItem(key)) return null;

  const isUrgent = daysLeft <= 5;
  const isWarning = daysLeft <= 15;

  function dismiss() {
    localStorage.setItem(key, '1');
    onDismiss();
  }

  return (
    <div className={`fixed top-5 right-5 z-50 max-w-sm w-full bg-white border ${isUrgent ? 'border-red-200' : isWarning ? 'border-amber-200' : 'border-blue-200'} shadow-lg rounded-xl p-4 transition-all`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{isUrgent ? '🚨' : isWarning ? '⚠️' : '⏰'}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${isUrgent ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-blue-700'}`}>Contract Expiring Soon</div>
          <div className="text-xs mt-1 text-slate-600">
            Contract for this client expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> on{' '}
            <strong>{new Date(contract.contract_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.
          </div>
          {contract.renewal_tracking === 'auto' && (
            <div className="text-[11px] mt-1 text-slate-500 font-medium">Auto-renewal is enabled.</div>
          )}
        </div>
        <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0">×</button>
      </div>
      <div className="flex justify-end mt-3">
        <button onClick={dismiss} className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition">
          Dismiss for this session
        </button>
      </div>
    </div>
  );
}

// ─── Grace Period Overlay ─────────────────────────────────────────────────────
function GracePeriodOverlay({ contract, clientName }) {
  if (!contract?.contract_end) return null;
  const end = new Date(contract.contract_end);
  const now = new Date();
  if (now <= end) return null; // not expired

  const graceDays = contract.grace_period_days || 30;
  const graceEnd = new Date(end.getTime() + graceDays * 24 * 60 * 60 * 1000);
  const inGrace = now <= graceEnd;
  const daysOverdue = Math.ceil((now - end) / (1000 * 60 * 60 * 24));
  const daysRemainingInGrace = Math.max(0, Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24)));

  if (inGrace) {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none">
        <div className="absolute inset-0 bg-amber-900/5 pointer-events-none" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white border border-amber-300 px-6 py-3.5 rounded-xl shadow-lg pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-amber-800 font-bold text-sm">Contract Expired — Grace Period Active</div>
              <div className="text-slate-600 text-xs mt-0.5">
                <strong>{clientName}</strong>'s contract expired {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} ago.
                Grace period ends in <strong>{daysRemainingInGrace} day{daysRemainingInGrace !== 1 ? 's' : ''}</strong>.
                Platform is in <strong>read-only</strong> mode.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fully locked
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-xl">
        <div className="text-5xl mb-3">🔒</div>
        <div className="text-slate-900 text-xl font-bold mb-2">Account Locked</div>
        <div className="text-slate-600 text-sm mb-4">
          The contract for <strong className="text-slate-900">{clientName}</strong> expired on{' '}
          <strong className="text-red-600">{end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>,
          and the {graceDays}-day grace period has also passed.
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs font-medium">
          Please renew the contract to restore access. Contact your vCISO administrator.
        </div>
      </div>
    </div>
  );
}

// ─── Admin dashboard shell ────────────────────────────────────────────────────
const NAV = [
  { path: '/dashboard/admin/clients',    icon: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>
  ), label: 'Clients' },
  { path: '/dashboard/admin/onboarding', icon: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
  ), label: 'Onboarding' },
];


function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeClient, setActiveClient] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [expiryDismissed, setExpiryDismissed] = useState(false);

  useEffect(() => {
    if (!activeClient?.id) { setContractData(null); return; }
    setExpiryDismissed(false);
    fetch(`/api/contract-tenure/${activeClient.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setContractData(d))
      .catch(() => setContractData(null));
  }, [activeClient?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'A';

  return (
    <div className="flex h-screen overflow-hidden relative bg-slate-50">
      <style>{`
        .admin-nav-link { display:flex; align-items:center; gap:10px; padding:10px 14px; font-size:0.875rem; font-weight:600; color:#64748b; transition:all 0.15s ease; cursor:pointer; text-decoration:none; border-radius:${th(`2px`, { dark: `10px` })}; }
        .admin-nav-link svg { stroke: #64748b; transition: stroke 0.15s ease; }
        .admin-nav-link:hover { background:#f1f5f9; color:#0f172a; }
        .admin-nav-link:hover svg { stroke: #0f172a; }
        .admin-nav-link.active { background:#eff6ff; color:#2563eb; font-weight:700; }
        .admin-nav-link.active svg { stroke: #2563eb; }
        .admin-card { background:#fff; border-radius:${th(`2px`, { dark: `12px` })}; border:1px solid #e5e7eb; box-shadow:${th(`none`, { dark: `0 1px 3px rgba(16,24,40,0.06)` })}; padding:24px; }
      `}</style>

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-slate-200">

        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
              🛡️
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 tracking-tight">vCISO</div>
              <div className="text-[11px] text-slate-500 font-medium">Admin Dashboard</div>
            </div>
          </div>
        </div>

        {/* Active client badge */}
        {activeClient && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active Client
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">{activeClient.name}</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">{activeClient.industry}</div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 mt-2">Menu</div>
          {NAV.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
            >
              <span className="flex-shrink-0">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl py-2 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-7 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div className="text-base font-bold text-slate-900">
            Admin Dashboard
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' })}
            </div>
            <NotificationBell />
            <div className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
        </div>

        <div className="p-7">
          <Routes>
            <Route path="clients"      element={<ClientSwitcher activeClient={activeClient} setActiveClient={setActiveClient} />} />
            <Route path="onboarding"   element={<OnboardingWizard activeClient={activeClient} />} />
            <Route path="employees"    element={<AdminEmployees activeClient={activeClient} />} />
            <Route path="users"        element={<OwnerUserSummary activeClient={activeClient} />} />
            <Route path="financials"   element={<AdminFinancialHub activeClient={activeClient} />} />
            <Route path="invoices"     element={<OwnerInvoices activeClient={activeClient} />} />
            <Route path="reports"      element={<AdminReports activeClient={activeClient} />} />
            <Route path="integrations" element={<OwnerIntegrations activeClient={activeClient} />} />
            <Route path="settings"     element={<AdminSettings activeClient={activeClient} />} />
            <Route path="*"            element={<Navigate to="clients" replace />} />
          </Routes>
        </div>
      </main>

      {/* Contract expiry notifications & grace period */}
      {contractData && !expiryDismissed && (
        <ContractExpiryPopup
          contract={contractData}
          clientId={activeClient?.id}
          onDismiss={() => setExpiryDismissed(true)}
        />
      )}
      {contractData && activeClient && (
        <GracePeriodOverlay contract={contractData} clientName={activeClient.name} />
      )}
    </div>
  );
}

// ─── Root redirect ────────────────────────────────────────────────────────────
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
  if (user.role === 'vciso') return <Navigate to="/dashboard/vciso" replace />;
  if (user.role === 'partner') return <Navigate to="/dashboard/partner" replace />;
  return <Navigate to="/dashboard/client" replace />;
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <OwnerAuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={SKIP_LOGIN ? <Navigate to="/dashboard/vciso" replace /> : <LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/questionnaire/iso27001" element={<ISO27001QuestionnairePage />} />
            <Route path="/questionnaire" element={<ISO27001QuestionnairePage />} />
            <Route path="/assessment/iso27001" element={<ISO27001QuestionnairePage />} />
            <Route path="/questionnaire/dpdp" element={<DPDPQuestionnairePage />} />
            <Route path="/assessment/dpdp" element={<DPDPQuestionnairePage />} />
            <Route path="/questionnaire/cspm" element={<CSPMQuestionnairePage />} />
            <Route path="/assessment/cspm" element={<CSPMQuestionnairePage />} />

            {/* Owner Portal — protected executive area, accessed via main login */}
            <Route path="/owner-portal/*" element={
              <OwnerRoute>
                <OwnerPortalLayout />
              </OwnerRoute>
            } />

            <Route path="/dashboard/admin/*" element={
              <ProtectedRoute allowedRole="admin">
                <AdminShell />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/vciso/*" element={
              <ProtectedRoute allowedRoles={['vciso', 'admin']}>
                <VCISOLayout />
              </ProtectedRoute>
            } />

            <Route path="/vcisomainpage" element={
              <ProtectedRoute allowedRoles={['vciso', 'admin']}>
                <Navigate to="/dashboard/vciso/vcisomainpage" replace />
              </ProtectedRoute>
            } />

          <Route path="/dashboard/partner" element={
            <ProtectedRoute allowedRole="partner">
              <PartnerDashboard />
            </ProtectedRoute>
          } />

            <Route path="/dashboard/client" element={
              <ProtectedRoute allowedRole="client">
                <ClientDashboard />
              </ProtectedRoute>
            } />

<Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </OwnerAuthProvider>
    </AuthProvider>
  );
}
