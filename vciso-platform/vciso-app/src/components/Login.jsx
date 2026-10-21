import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed. Please check your credentials.');
      }

      // Store token and call onLogin callback
      localStorage.setItem('authToken', data.token || data.ownerToken);
      localStorage.setItem('vciso_token', data.token || data.ownerToken);
      localStorage.setItem('token', data.token || data.ownerToken);
      if (onLogin) onLogin(data.user || { name: data.ownerName });

    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('admin@vciso.io');
    setPassword('Admin@123');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
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

        <div className="flex items-center gap-4">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </div>
          <a href="mailto:support@vciso.io" className="text-xs font-medium text-slate-500 hover:text-slate-800 transition">
            Need Help?
          </a>
        </div>
      </header>

      {/* Main Centered Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 sm:p-10 border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
              🔒
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Welcome to vCISO Portal</h1>
            <p className="text-slate-500 text-xs mt-1">Enter your organizational credentials to authenticate</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@vciso.io"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
              />
            </div>

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
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-normal transition">
                Forgot?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm shadow-sm mt-4 flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials callout */}
          <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>🔑</span>
                <span>Demo Access</span>
              </div>
              <button type="button" onClick={fillDemo} className="text-[10px] text-blue-600 font-medium hover:underline">
                Click to fill
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-600">
              admin@vciso.io / Admin@123
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p>
          © {new Date().getFullYear()} vCISO Platform. All rights reserved. · <span className="text-slate-500 font-medium">🔒 256-bit TLS Encrypted &amp; SOC 2 Compliant</span>
        </p>
      </footer>
    </div>
  );
}

