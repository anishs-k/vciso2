import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setTokenError('No invite token found in this link. Please use the link from your invitation email.'); setTokenLoading(false); return; }
    fetch(`/api/auth/set-password/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok && data.valid) setTokenInfo(data);
        else setTokenError(data.error || 'Invalid or expired link.');
      })
      .catch(() => setTokenError('Could not validate the invite link. Please try again.'))
      .finally(() => setTokenLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function getStrength(pw) {
    if (!pw) return { level: 0, label: '', color: 'bg-slate-200', text: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500', width: '25%', textColor: 'text-red-600' };
    if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-amber-500', width: '50%', textColor: 'text-amber-600' };
    if (score <= 3) return { level: 3, label: 'Good', color: 'bg-blue-500', width: '75%', textColor: 'text-blue-600' };
    return { level: 4, label: 'Strong', color: 'bg-emerald-500', width: '100%', textColor: 'text-emerald-600' };
  }

  const strength = getStrength(password);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 font-sans">
      <header className="w-full bg-white border-b border-slate-200 px-6 sm:px-10 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
            🛡️
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm tracking-tight leading-none">vCISO Platform</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Enterprise Security OS</div>
          </div>
        </div>
        <a href="mailto:support@vciso.io" className="text-xs font-medium text-slate-500 hover:text-slate-800 transition">
          Need Help?
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-md p-8 sm:p-10">
          {tokenLoading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Validating invite link...
            </div>
          ) : tokenError ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-2xl mx-auto mb-4">
                ⚠️
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Invalid Link</h2>
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 mb-6">
                {tokenError}
              </div>
              <Link to="/login" className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm text-center">
                ← Back to Login
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-2xl mx-auto mb-4">
                ✓
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Password Set!
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Your account is now active. You can log in with your email and new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-sm"
              >
                Go to Login →
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
                  🔐
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Set Your Password
                </h1>
                <p className="text-xs text-slate-500 mt-1">Create a secure password to activate your account</p>
              </div>

              {/* Pre-filled identity info */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Account</div>
                <div className="text-sm font-semibold text-slate-900">{tokenInfo.name}</div>
                <div className="text-xs text-slate-500">{tokenInfo.email}</div>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm focus:outline-none"
                    >
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-slate-400 text-[11px]">Strength</span>
                        <span className={`text-[11px] font-semibold ${strength.textColor}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} rounded-full transition-all`} style={{ width: strength.width }} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                  />
                  {confirm && password !== confirm && (
                    <div className="text-red-600 text-xs font-medium mt-1">⚠️ Passwords do not match</div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || password.length < 8 || password !== confirm}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50 mt-2"
                >
                  {loading ? 'Activating...' : 'Activate Account'}
                </button>
              </form>

              <div className="mt-5 text-center text-xs">
                <span className="text-slate-500">Already have access? </span>
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Login here</Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} vCISO Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
