// Sign-in, with the look of the client platform's login page (vciso-platform/vciso-app/src/pages/LoginPage.jsx).
// Step 1: email / login ID + password. Step 2, only for an admin who has MFA on: the authenticator code
// (or a recovery code). SSO, magic link, "Forgot?" and "Request Access" are shown as on that page; CTW Admin
// has no SSO or mail, so they explain what to do instead.
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/source-serif-4/700.css';
import './login.css';

const NOTICES = {
  sso: (p) => `${p} single sign-on is not set up for CTW Admin. Sign in with your email or login ID and password.`,
  magic: 'Magic links need e-mail delivery, which CTW Admin does not have. Sign in with your password.',
  forgot: 'Ask another CTW admin to reset your password (Admins page → Reset password).',
  request: 'Ask a CTW admin to add you (Admins page → Add admin).',
};

export default function LoginPage() {
  const { admin, signIn, verifyCode } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState('credentials'); // 'credentials' | 'mfa'
  const [authMode, setAuthMode] = useState('password'); // 'password' | 'magic_link'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (admin) return <Navigate to={location.state?.from || '/clients'} replace />;

  const say = (text) => {
    setError('');
    setNotice(text);
  };

  const handleCredentials = async (e) => {
    e?.preventDefault?.();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const next = await signIn(email.trim(), password);
      if (next) {
        setChallenge(next.challenge);
        setCode('');
        setStep('mfa');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyCode(challenge, useRecovery ? { recovery_code: code.trim() } : { code });
    } catch (err) {
      if (err.status === 401 && /password again|took too long/i.test(err.message)) {
        setStep('credentials');
        setPassword('');
      }
      setError(err.message);
      setCode('');
      setLoading(false);
    }
  };

  return (
    <div className="vl">
      {/* ── Top Navigation Bar ── */}
      <header className="vl-head">
        <div className="vl-brand">
          <div className="vl-logo">🛡️</div>
          <div>
            <div className="vl-brand-name">vCISO Platform</div>
            <div className="vl-brand-sub">Enterprise Security OS</div>
          </div>
        </div>
        <div className="vl-head-right">
          <div className="vl-status">
            <i />
            All Systems Operational
          </div>
          <a href="mailto:support@vciso.io" className="vl-help">
            Need Help?
          </a>
        </div>
      </header>

      {/* ── Main Centered Card ── */}
      <main className="vl-main">
        <div className="vl-card">
          {step === 'credentials' ? (
            <>
              <div className="vl-title">
                <div className="vl-icon">🔒</div>
                <h1>Welcome to vCISO Portal</h1>
                <p>Enter your credentials or authenticate via your organization identity provider</p>
              </div>

              {notice && (
                <div className="vl-note info">
                  <span>ℹ️</span>
                  <span>{notice}</span>
                </div>
              )}
              {error && (
                <div className="vl-note error" role="alert">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="vl-sso">
                <button type="button" className="vl-btn-sso" onClick={() => say(NOTICES.sso('Google Workspace'))}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google Workspace</span>
                </button>
                <button type="button" className="vl-btn-sso" onClick={() => say(NOTICES.sso('Microsoft 365'))}>
                  <svg viewBox="0 0 23 23" aria-hidden="true">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  <span>Continue with Microsoft 365</span>
                </button>
                <button type="button" className="vl-btn-sso" onClick={() => say(NOTICES.sso('SAML / Okta'))}>
                  <span>🔑</span>
                  <span>Single Sign-On (SAML / Okta)</span>
                </button>
              </div>

              <div className="vl-divider">
                <span>{authMode === 'password' ? 'or sign in with password' : 'or sign in with magic link'}</span>
              </div>

              {authMode === 'password' ? (
                <form onSubmit={handleCredentials} className="vl-form">
                  <div>
                    <label className="vl-label" htmlFor="vl-email">
                      Email Address
                    </label>
                    <input
                      id="vl-email"
                      className="vl-input"
                      required
                      autoFocus
                      autoComplete="username"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="vl-label" htmlFor="vl-password">
                      Password
                    </label>
                    <div className="vl-pw">
                      <input
                        id="vl-password"
                        className="vl-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="vl-eye"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div className="vl-row">
                    <label className="vl-check">
                      <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />
                      <span>Trust this device</span>
                    </label>
                    <button type="button" className="vl-link" onClick={() => say(NOTICES.forgot)}>
                      Forgot?
                    </button>
                  </div>
                  <button type="submit" className="vl-primary" disabled={loading}>
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form
                  className="vl-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    say(NOTICES.magic);
                  }}
                >
                  <div>
                    <label className="vl-label" htmlFor="vl-email-magic">
                      Email Address
                    </label>
                    <input
                      id="vl-email-magic"
                      className="vl-input"
                      type="email"
                      required
                      autoFocus
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="vl-hint">We&apos;ll send a passwordless verification link to your work inbox.</p>
                  </div>
                  <button type="submit" className="vl-primary">
                    Email Me a Magic Link →
                  </button>
                </form>
              )}

              <div className="vl-toggle">
                <button
                  type="button"
                  className="vl-muted-link"
                  onClick={() => {
                    setAuthMode((m) => (m === 'password' ? 'magic_link' : 'password'));
                    setError('');
                    setNotice('');
                  }}
                >
                  {authMode === 'password' ? '✨ Email me a magic link instead' : '🔑 Sign in with password instead'}
                </button>
              </div>

              <div className="vl-request">
                Don&apos;t have an account?{' '}
                <button type="button" className="vl-link" onClick={() => say(NOTICES.request)}>
                  Request Access
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="vl-back"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                  setCode('');
                }}
              >
                ← Back to Login
              </button>

              <div className="vl-title">
                <div className="vl-icon">📱</div>
                <h2>Two-Factor Authentication</h2>
                <p>
                  {useRecovery ? 'Enter one of your recovery codes' : 'Enter the 6-digit code from your authenticator app'}
                </p>
              </div>

              {error && (
                <div className="vl-note error" role="alert">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCode} className="vl-form">
                <div>
                  <label className="vl-label center" htmlFor="vl-code">
                    {useRecovery ? 'Recovery Code' : '6-Digit Verification Code'}
                  </label>
                  {useRecovery ? (
                    <input
                      id="vl-code"
                      className="vl-input vl-code"
                      style={{ letterSpacing: '0.1em' }}
                      required
                      autoFocus
                      autoComplete="off"
                      placeholder="xxxx-xxxx"
                      value={code}
                      onChange={(e) => setCode(e.target.value.slice(0, 12))}
                    />
                  ) : (
                    <input
                      id="vl-code"
                      className="vl-input vl-code"
                      required
                      autoFocus
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  )}
                  <p className="vl-center-note">{useRecovery ? 'Each recovery code works once' : 'A new code every 30 seconds'}</p>
                </div>
                <button type="submit" className="vl-primary" disabled={loading || (useRecovery ? !code.trim() : code.length !== 6)}>
                  {loading ? 'Verifying Code...' : 'Verify & Continue'}
                </button>
              </form>

              <div className="vl-toggle">
                <button
                  type="button"
                  className="vl-link"
                  style={{ fontWeight: 600 }}
                  onClick={() => {
                    setUseRecovery(!useRecovery);
                    setCode('');
                    setError('');
                  }}
                >
                  {useRecovery ? 'Use the app code instead' : 'Lost your phone? Use a recovery code'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="vl-foot">
        <p>
          © {new Date().getFullYear()} vCISO Platform. All rights reserved. · <span>🔒 256-bit TLS Encrypted &amp; SOC 2 Compliant</span>
        </p>
      </footer>
    </div>
  );
}
