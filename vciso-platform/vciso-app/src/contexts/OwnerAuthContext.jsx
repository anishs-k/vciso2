import React, { createContext, useContext } from 'react';
import { useAuth } from '../AuthContext';

const OwnerAuthContext = createContext(null);

export function OwnerAuthProvider({ children }) {
  const auth = useAuth();
  const value = {
    ownerUser: auth.user,
    ownerLogout: auth.logout,
    getOwnerToken: auth.getToken,
  };
  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error('useOwnerAuth must be used within OwnerAuthProvider');
  return ctx;
}
