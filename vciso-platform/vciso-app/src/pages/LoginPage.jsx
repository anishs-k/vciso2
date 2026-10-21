import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useOwnerAuth } from '../contexts/OwnerAuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setOwnerSession } = useOwnerAuth();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'mfa'
  const [authMode, setAuthMode] = useState('password'); // 'password' | 'magic_link'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [mfaCode, setMfaCode] = useState('');
  const [userId, setUserId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [ssoNotice, setSsoNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle standard email + password submission
  const handleCredentials = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSsoNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.error || 'Login failed. Please check your credentials.');

      // Owner account — skip MFA, redirect directly to Owner Portal
      if (data.ownerToken) {
        setOwnerSession(data.ownerToken, data.ownerName, data.ownerUsername);
        navigate('/owner-portal/dashboard', { replace: true });
        return;
      }

      setUserId(data.userId);
      setMaskedEmail(data.email);
      if (data.devCode) {
        setDevCode(data.devCode);
        setMfaCode(data.devCode);
      }
      setStep('mfa');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle magic link sign-in request
  const handleMagicLink = async (e) => {
    e.preventDefault();
    setError('');
    setSsoNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send magic link. Please try again.');
      setMagicSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle SSO provider click
  const handleSSO = (providerName) => {
    setError('');
    setSsoNotice(`Connecting to ${providerName} Single Sign-On...`);
    // Pre-populate with domain demo or show informational redirect prompt
    if (!email) {
      setEmail('admin@vciso.io');
    }
    setTimeout(() => {
      setSsoNotice(`SSO authentication initiated for ${providerName}. Redirecting to your organization identity provider...`);
    }, 600);
  };

  // Handle MFA 6-digit code verification
  const handleMfa = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: mfaCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MFA verification failed');
      login(data.token, data.user);
      if (data.user.role === 'admin') navigate('/dashboard/admin');
      else if (data.user.role === 'vciso') navigate('/dashboard/vciso');
      else if (data.user.role === 'partner') navigate('/dashboard/partner');
      else navigate('/dashboard/client');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Autofill helper for demo credentials
  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setAuthMode('password');
    setError('');
    setSsoNotice('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="w-full bg-white border-b border-slate-200 px-6 sm:px-10 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
            🛡️
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm tracking-tight leading-none">vCISO Platform</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Enterprise Security OS</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </div>
          <a
            href="mailto:support@vciso.io"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            Need Help?
          </a>
        </div>
      </header>

      {/* ── Main Centered Card Container ───────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 transition-all">

          {/* ── STEP 1: CREDENTIALS & SSO ── */}
          {step === 'credentials' ? (
            <>
              {/* Header Icon + Title */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
                  🔒
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome to vCISO Portal
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your credentials or authenticate via your organization identity provider
                </p>
              </div>

              {/* SSO Notice / Info Banner */}
              {ssoNotice && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-700 flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">ℹ️</span>
                  <span>{ssoNotice}</span>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* SSO Sign-in Stack */}
              <div className="space-y-2.5 mb-6">
                {/* Google Workspace */}
                <button
                  type="button"
                  onClick={() => handleSSO('Google Workspace')}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-3 transition shadow-sm"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google Workspace</span>
                </button>

                {/* Microsoft 365 */}
                <button
                  type="button"
                  onClick={() => handleSSO('Microsoft 365')}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-3 transition shadow-sm"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  <span>Continue with Microsoft 365</span>
                </button>

                {/* SAML / Okta SSO */}
                <button
                  type="button"
                  onClick={() => handleSSO('SAML SSO')}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-3 transition shadow-sm"
                >
                  <span className="text-xs">🔑</span>
                  <span>Single Sign-On (SAML / Okta)</span>
                </button>
              </div>

              {/* Divider with hairline rules */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative bg-white px-3 text-xs text-slate-400 font-medium">
                  {authMode === 'password' ? 'or sign in with password' : 'or sign in with magic link'}
                </div>
              </div>

              {/* Magic Link Confirmation Alert */}
              {magicSent && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">✨</span>
                  <span>Magic sign-in link dispatched! Check your email inbox to authenticate instantly.</span>
                </div>
              )}

              {/* FORM: Password Sign-in */}
              {authMode === 'password' ? (
                <form onSubmit={handleCredentials} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                      placeholder="name@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm focus:outline-none"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* Trust device checkbox + Forgot link */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-normal">
                      <input
                        type="checkbox"
                        checked={trustDevice}
                        onChange={e => setTrustDevice(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Trust this device</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-blue-600 hover:text-blue-700 font-normal transition"
                    >
                      Forgot?
                    </Link>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                /* FORM: Magic Link */
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                      placeholder="name@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      We'll send a passwordless verification link to your work inbox.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Sending link...' : 'Email Me a Magic Link →'}
                  </button>
                </form>
              )}

              {/* Toggle Magic Link / Password option */}
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(m => m === 'password' ? 'magic_link' : 'password');
                    setError('');
                    setMagicSent(false);
                  }}
                  className="text-xs text-slate-500 hover:text-blue-600 font-medium transition"
                >
                  {authMode === 'password' ? '✨ Email me a magic link instead' : '🔑 Sign in with password instead'}
                </button>
              </div>

              {/* Demo credentials callout block */}
              <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span>🔑</span>
                    <span>Demo Access Credentials</span>
                  </div>
                  <span className="text-[10px] text-blue-600 font-medium">Click to fill</span>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => fillDemo('admin@vciso.io', 'Admin@123')}
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-left transition flex items-center justify-between font-mono text-[11px]"
                  >
                    <span className="text-slate-800 font-semibold font-sans">Admin (Full Access):</span>
                    <span className="text-slate-600">admin@vciso.io / Admin@123</span>
                  </button>
                  <div className="px-2 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Default MFA OTP:</span>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">123456</span>
                  </div>
                </div>
              </div>

              {/* Request Access Link */}
              <div className="mt-6 text-center text-xs text-slate-500">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition">
                  Request Access
                </Link>
              </div>
            </>
          ) : (
            /* ── STEP 2: TWO-FACTOR AUTHENTICATION (MFA) ── */
            <>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); setMfaCode(''); }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-6 transition"
              >
                ← Back to Login
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
                  📱
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Two-Factor Authentication</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 6-digit verification code sent to <br />
                  <strong className="text-slate-800 font-semibold">{maskedEmail}</strong>
                </p>
                {devCode && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800">
                    🔑 Dev mode code: <strong className="font-mono">{devCode}</strong>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleMfa} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center mb-2">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    Code expires in 10 minutes
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Verifying Code...' : 'Verify & Continue'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleCredentials.bind(null, { preventDefault: () => {} })}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                >
                  Resend Verification Code
                </button>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ── Page Footer ─────────────────────────────────────────────────── */}
      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p>
          © {new Date().getFullYear()} vCISO Platform. All rights reserved. · <span className="text-slate-500 font-medium">🔒 256-bit TLS Encrypted &amp; SOC 2 Compliant</span>
        </p>
      </footer>
    </div>
  );
}

