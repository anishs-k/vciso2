import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Demo mode: with VITE_SKIP_LOGIN=true and no real session, the app runs as this demo vCISO user so
// the vCISO pages open without a backend. Off by default: users sign in against the client database.
export const SKIP_LOGIN = import.meta.env.VITE_SKIP_LOGIN === 'true';
const DEMO_USER = { id: "demo-vciso", name: "Anish N.", email: "vciso@demo.local", role: "vciso" };

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(SKIP_LOGIN ? DEMO_USER : null);
  const setUser = (u) => setUserState(u || (SKIP_LOGIN ? DEMO_USER : null));
  const [loading, setLoading] = useState(true);

  const getStoredToken = () =>
    localStorage.getItem('vciso_token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('owner_token') ||
    sessionStorage.getItem('vciso_token') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    '';

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(u => setUser(u))
        .catch(() => {
          localStorage.removeItem('vciso_token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('vciso_token', token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = async () => {
    const token = getStoredToken();
    if (token) {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    localStorage.removeItem('vciso_token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('owner_token');
    setUser(null);
  };

  const getToken = () => getStoredToken();

  // Re-reads the signed-in user from the server and drops the result into the
  // same state the session was loaded with, so a change made server-side (a
  // vCISO claiming their client, say) reaches the UI without a page reload.
  // A failed refresh leaves the current user in place rather than signing
  // anyone out — this is a refresh, not an auth check.
  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const u = await res.json();
      setUser(u);
      return u;
    } catch {
      return null;
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
