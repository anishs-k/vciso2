import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  const { getToken } = useAuth();
  const [allClients, setAllClients] = useState([]);
  const [engineData, setEngineData] = useState({ summary: {}, clients: [], invoices: [] });
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken ? getToken() : localStorage.getItem('vciso_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/clients', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const clients = await res.json();
      const list = Array.isArray(clients) ? clients : [];
      setAllClients(list);
      setEngineData({ summary: {}, clients: list, invoices: [] });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const currentClient = allClients.find(c => c.id === selectedClientId) || null;
  const userCounts = {
    total: allClients.length,
    active: allClients.filter(c => c.status === 'active').length,
    inactive: allClients.filter(c => c.status !== 'active').length,
  };

  return (
    <AdminDataContext.Provider value={{
      engineData,
      allClients,
      selectedClientId,
      setSelectedClientId,
      currentClient,
      loading,
      error,
      refresh,
      lastUpdated,
      userCounts,
    }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
}
