import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, session } from './api';

const AuthContext = createContext(null);

// admin: undefined = still checking a stored token, null = signed out.
// pending: set-up steps the API still requires ('password_change_required', 'mfa_setup_required').
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(undefined);
  const [me, setMe] = useState(null);

  const refresh = useCallback(async () => {
    if (!session.token) {
      setAdmin(null);
      setMe(null);
      return;
    }
    try {
      const r = await api('/auth/me');
      setAdmin(r.admin);
      setMe(r);
    } catch {
      setAdmin(null);
      setMe(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const out = () => {
      setAdmin(null);
      setMe(null);
    };
    const pendingNow = () => refresh();
    window.addEventListener('ctw-signed-out', out);
    window.addEventListener('ctw-pending', pendingNow);
    return () => {
      window.removeEventListener('ctw-signed-out', out);
      window.removeEventListener('ctw-pending', pendingNow);
    };
  }, [refresh]);

  // Stores a session the API handed out (sign-in, password change, MFA set-up) and reloads who we are.
  const adoptSession = useCallback(
    async (token) => {
      session.set(token);
      await refresh();
    },
    [refresh],
  );

  // -> null when signed in, or { challenge } when a code is needed next.
  const signIn = useCallback(
    async (login_id, password) => {
      const r = await api('/auth/login', { method: 'POST', body: { login_id, password } });
      if (r.mfa_required) return { challenge: r.challenge };
      await adoptSession(r.token);
      return null;
    },
    [adoptSession],
  );

  const verifyCode = useCallback(
    async (challenge, { code, recovery_code }) => {
      const r = await api('/auth/login/mfa', { method: 'POST', body: { challenge, code, recovery_code } });
      await adoptSession(r.token);
    },
    [adoptSession],
  );

  // A chosen sign-out starts the next sign-in from the clients list, not the page left behind.
  const [signedOutByUser, setSignedOutByUser] = useState(false);
  const signOut = useCallback(() => {
    setSignedOutByUser(true);
    session.clear();
    setAdmin(null);
    setMe(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ admin, me, pending: me?.pending || [], signedOutByUser, signIn, verifyCode, signOut, adoptSession, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
