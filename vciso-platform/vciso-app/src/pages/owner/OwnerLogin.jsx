import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerAuth } from '../../contexts/OwnerAuthContext';

export default function OwnerLogin() {
  const { ownerLogin } = useOwnerAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ownerLogin(username.trim(), password);
      navigate('/owner-portal/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = () => {
    setUsername('owner');
    setPassword('Owner@123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200 px-6 sm:px-10 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
            💼
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm tracking-tight leading-none">vCISO Owner Portal</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Executive Governance &amp; Administration</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Owner Authentication Active
          </div>
          <a href="mailto:support@vciso.io" className="text-xs font-medium text-slate-500 hover:text-slate-800 transition">
            Need Help?
          </a>
        </div>
      </header>

      {/* Centered Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
              💼
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Owner Portal Access
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized Executive Personnel Only
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                autoComplete="username"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
              />
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo Callout */}
          <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>🔑</span>
                <span>Demo Owner Access</span>
              </div>
              <button type="button" onClick={fillDemo} className="text-[10px] text-blue-600 font-medium hover:underline">
                Click to fill
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-600">
              owner / Owner@123
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p>
          © {new Date().getFullYear()} vCISO Platform. All rights reserved. · <span className="text-slate-500 font-medium">🔒 Restricted Super-Admin Zone</span>
        </p>
      </footer>
    </div>
  );
}

