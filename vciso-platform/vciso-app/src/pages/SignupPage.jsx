import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [method, setMethod] = useState(inviteToken ? 'invite' : null); // null | 'invite' | 'code'
  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteError, setInviteError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  // Validate invite token on mount
  useEffect(() => {
    if (inviteToken) {
      fetch(`/api/auth/invite/${inviteToken}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('Invalid invite')))
        .then(data => {
          if (data.valid) {
            setInviteInfo(data);
            setEmail(data.email);
          } else {
            setInviteError(data.error || 'Invalid invite link');
          }
        })
        .catch(() => setInviteError('Could not validate invite link'));
    }
  }, [inviteToken]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const body = { name: name.trim(), email: email.trim(), password };
      if (method === 'invite') body.inviteToken = inviteToken;
      else body.companyCode = companyCode.trim();

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Invalid invite token
  if (inviteToken && inviteError) {
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
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-md p-8 sm:p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-2xl mx-auto mb-4">
              🚫
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Invalid Invite Link</h2>
            <p className="text-xs text-slate-500 mb-4">{inviteError}</p>
            <p className="text-xs text-slate-400 mb-6">Please contact your administrator for a new invitation.</p>
            <Link to="/login" className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition text-center shadow-sm">
              Go to Login
            </Link>
          </div>
        </main>

        <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
          <p>© {new Date().getFullYear()} vCISO Platform. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // Success
  if (done) {
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
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-md p-8 sm:p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-2xl mx-auto mb-4">
              🎉
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Account Created!</h2>
            <p className="text-xs text-slate-500 mb-3">{done.message}</p>
            <div className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-6 capitalize">
              Role: {done.role}
            </div>
            <Link to="/login" className="block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition text-center shadow-sm">
              Sign In Now →
            </Link>
          </div>
        </main>

        <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
          <p>© {new Date().getFullYear()} vCISO Platform. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // Method selection (no invite token present)
  if (!method) {
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
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition">
              ← Back to login
            </Link>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
                🛡️
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
              <p className="text-xs text-slate-500 mt-1">Choose how you were given access to this platform</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setMethod('invite')}
                className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition group"
              >
                <span className="text-2xl">📩</span>
                <div>
                  <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-700">I have an invite email</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">I received an invitation link from my administrator</div>
                </div>
              </button>
              <button
                onClick={() => setMethod('code')}
                className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition group"
              >
                <span className="text-2xl">🔑</span>
                <div>
                  <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-700">I have a company code</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">My company gave me a registration code</div>
                </div>
              </button>
            </div>
            <div className="mt-6 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <strong>Note:</strong> Self-registration is restricted. You must have an invite link or company code from your administrator to create an account.
            </div>
          </div>
        </main>

        <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
          <p>© {new Date().getFullYear()} vCISO Platform. All rights reserved.</p>
        </footer>
      </div>
    );
  }

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
          <button onClick={() => setMethod(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition">
            ← Back
          </button>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{method === 'invite' ? '📩' : '🔑'}</span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
            </div>
            {inviteInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                ✓ Valid invite for <strong>{inviteInfo.email}</strong> as <strong className="capitalize">{inviteInfo.role}</strong>
              </div>
            )}
            {method === 'code' && (
              <p className="text-xs text-slate-500">Enter your company registration code provided by your administrator.</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-start gap-2">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                required
                autoFocus
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                readOnly={!!inviteInfo}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition shadow-sm ${inviteInfo ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {inviteInfo && <p className="text-[11px] text-slate-400 mt-1">Email is locked to your invite address</p>}
            </div>

            {method === 'code' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company Registration Code *</label>
                <input
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                  placeholder="e.g. VCISO-2024"
                  value={companyCode}
                  onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                />
                <p className="text-[11px] text-slate-400 mt-1">Demo codes: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">VCISO-2024</code> or <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">CLIENT-2024</code></p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password *</label>
              <input
                type="password"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs">
            <span className="text-slate-500">Already have an account? </span>
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
          </div>
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} vCISO Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
