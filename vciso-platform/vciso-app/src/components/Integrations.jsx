import React, { useEffect, useState } from 'react';

const INTEGRATION_ICONS = {
  vulnerability_scanner: '🔍',
  identity_provider: '🔑',
  edr: '🛡️',
};

const CONFIG_FIELDS = {
  'integration-001': [
    { key: 'host', label: 'Tenable Host', placeholder: 'https://cloud.tenable.com' },
    { key: 'api_key', label: 'API Key', placeholder: 'Enter your Tenable API key', type: 'password' },
    { key: 'scan_policy', label: 'Scan Policy', placeholder: 'Basic Network Scan' },
  ],
  'integration-002': [
    { key: 'domain', label: 'Domain', placeholder: 'corp.example.com' },
    { key: 'ldap_url', label: 'LDAP URL', placeholder: 'ldap://dc01.corp.example.com' },
    { key: 'username', label: 'Service Account', placeholder: 'svc_vciso' },
    { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
  ],
  'integration-003': [
    { key: 'client_id', label: 'Client ID', placeholder: 'CrowdStrike OAuth2 Client ID' },
    { key: 'client_secret', label: 'Client Secret', placeholder: 'CrowdStrike OAuth2 Secret', type: 'password' },
    { key: 'base_url', label: 'Base URL', placeholder: 'https://api.crowdstrike.com' },
  ],
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [configValues, setConfigValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(data => { setIntegrations(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openConfig = (integration) => {
    setActive(integration);
    setConfigValues(integration.config || {});
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/integrations/${active.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configValues),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setIntegrations(prev => prev.map(i => i.id === data.id ? data : i));
      setActive(null);
      showToast(`${data.name} connected successfully!`);
    } catch (e) {
      showToast('Connection failed: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async (id) => {
    try {
      const res = await fetch(`/api/integrations/${id}/disconnect`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setIntegrations(prev => prev.map(i => i.id === data.id ? data : i));
      showToast(`${data.name} disconnected.`, 'info');
    } catch (e) {
      showToast('Disconnect failed: ' + e.message, 'error');
    }
  };

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}
          className={`px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-green-600'
          }`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integration Configuration</h1>
        <p className="text-gray-500 mt-1">Connect your security tools to centralize data in the vCISO platform</p>
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 text-center">Loading integrations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {integrations.map(integ => {
            const connected = integ.status === 'connected';
            return (
              <div key={integ.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                      {INTEGRATION_ICONS[integ.type] || '🔧'}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {connected ? '● Connected' : '○ Disconnected'}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base mb-1">{integ.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">{integ.description}</p>

                  {connected && integ.connected_at && (
                    <div className="text-xs text-gray-400 mb-4">
                      Connected {new Date(integ.connected_at).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openConfig(integ)}
                      className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {connected ? '⚙️ Reconfigure' : '🔌 Connect'}
                    </button>
                    {connected && (
                      <button
                        onClick={() => disconnect(integ.id)}
                        className="px-3 py-2 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                        title="Disconnect"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Config preview */}
                {connected && (
                  <div className="px-6 pb-5">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Config Preview</div>
                      {Object.entries(integ.config || {}).map(([k, v]) => (
                        v ? (
                          <div key={k} className="flex justify-between text-xs py-0.5">
                            <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                            <span className="text-gray-800 font-medium truncate max-w-32">
                              {k.toLowerCase().includes('secret') || k.toLowerCase().includes('key') || k.toLowerCase().includes('password') ? '••••••' : v}
                            </span>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Config Modal */}
      {active && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{INTEGRATION_ICONS[active.type] || '🔧'}</span>
                <div>
                  <h2 className="font-bold text-gray-900">{active.name}</h2>
                  <p className="text-xs text-gray-500">Configure connection settings</p>
                </div>
              </div>
              <button onClick={() => setActive(null)} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {(CONFIG_FIELDS[active.id] || []).map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={field.placeholder}
                    value={configValues[field.key] || ''}
                    onChange={e => setConfigValues(v => ({ ...v, [field.key]: e.target.value }))}
                  />
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>Demo Mode:</strong> Credentials are stored locally and no real connection is made.
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setActive(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? 'Connecting...' : '✓ Save & Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
