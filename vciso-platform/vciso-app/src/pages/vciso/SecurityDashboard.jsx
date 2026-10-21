import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import { th } from '../../theme';

const C = {
  bg: th('#F8FAFC', { dark: '#0F172A' }), card: th('#FFFFFF', { dark: '#1E293B' }), border: th('#E5E7EB', { dark: '#334155' }), accent: th('#2563EB', { dark: '#60A5FA' }),
  critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#059669',
  muted: th('#64748B', { dark: '#94A3B8' }), text: th('#0F172A', { dark: '#F1F5F9' }),
};

const TABS = [
  { id: 'all',     label: 'All Sources' },
  { id: 'network', label: 'Network' },
  { id: 'webapp',  label: 'Web Application' },
  { id: 'mobile',  label: 'Mobile' },
  { id: 'api',     label: 'API' },
  { id: 'cloud',   label: 'Cloud' },
];

// Tools per category with their module_slug for DB lookup
const TOOL_CATALOG = {
  network: [
    { name: 'Nessus',            slug: 'vulnerability-management' },
    { name: 'Qualys',            slug: 'vulnerability-management' },
    { name: 'OpenVAS',           slug: 'vulnerability-management' },
    { name: 'Tenable.io',        slug: 'vulnerability-management' },
    { name: 'Rapid7 InsightVM',  slug: 'vulnerability-management' },
  ],
  webapp: [
    { name: 'Burp Suite Pro', slug: 'appsec' },
    { name: 'OWASP ZAP',      slug: 'appsec' },
    { name: 'Acunetix',       slug: 'appsec' },
    { name: 'Invicti',        slug: 'appsec' },
    { name: 'Veracode',       slug: 'appsec' },
  ],
  mobile: [
    { name: 'MobSF',    slug: 'appsec' },
    { name: 'Ostorlab', slug: 'appsec' },
  ],
  api: [
    { name: 'APIsec',    slug: 'appsec' },
    { name: '42Crunch',  slug: 'appsec' },
    { name: 'StackHawk', slug: 'appsec' },
  ],
  cloud: [
    { name: 'Wiz',                          slug: 'cloud-security' },
    { name: 'Prisma Cloud',                 slug: 'cloud-security' },
    { name: 'AWS Security Hub',             slug: 'cloud-security' },
    { name: 'Microsoft Defender for Cloud', slug: 'cloud-security' },
    { name: 'Orca Security',                slug: 'cloud-security' },
  ],
};

const ALL_TOOLS = Object.entries(TOOL_CATALOG).flatMap(([cat, tools]) =>
  tools.map(t => ({ ...t, category: cat }))
);

const MOCK_VULNS = [
  { id: 'CVE-2024-1234', title: 'SQL Injection in Login Form',      severity: 'critical', asset: 'web-app-prod',    cvss: 9.8, status: 'Open',        firstSeen: '2024-01-15', lastSeen: '2024-01-20', source: 'Burp Suite Pro', category: 'webapp' },
  { id: 'CVE-2024-5678', title: 'Outdated SSL/TLS Protocol',        severity: 'high',     asset: '192.168.1.50',   cvss: 7.5, status: 'Open',        firstSeen: '2024-01-10', lastSeen: '2024-01-18', source: 'Nessus',         category: 'network' },
  { id: 'CVE-2024-9012', title: 'Missing Security Headers',         severity: 'medium',   asset: 'api.client.com', cvss: 5.3, status: 'In Progress', firstSeen: '2024-01-08', lastSeen: '2024-01-15', source: 'OWASP ZAP',      category: 'webapp' },
  { id: 'CVE-2024-3456', title: 'Insecure Direct Object Reference', severity: 'high',     asset: 'mobile-v2.1',   cvss: 7.8, status: 'Open',        firstSeen: '2024-01-12', lastSeen: '2024-01-19', source: 'MobSF',          category: 'mobile' },
  { id: 'CVE-2024-7890', title: 'S3 Bucket Public Access',          severity: 'critical', asset: 'aws-prod',       cvss: 9.1, status: 'Open',        firstSeen: '2024-01-05', lastSeen: '2024-01-20', source: 'AWS Security Hub', category: 'cloud' },
  { id: 'CVE-2024-2222', title: 'Unauthenticated API Endpoint',     severity: 'high',     asset: 'api.internal',   cvss: 8.2, status: 'Open',        firstSeen: '2024-01-14', lastSeen: '2024-01-21', source: 'APIsec',         category: 'api' },
  { id: 'CVE-2024-3333', title: 'Hardcoded Credentials in App',     severity: 'critical', asset: 'android-app',   cvss: 9.3, status: 'Open',        firstSeen: '2024-01-13', lastSeen: '2024-01-20', source: 'MobSF',          category: 'mobile' },
];

const tabSourceMap = {
  network: 'network', webapp: 'webapp', mobile: 'mobile', api: 'api', cloud: 'cloud', all: null,
};

function sevColor(s) {
  return s === 'critical' ? C.critical : s === 'high' ? C.high : s === 'medium' ? C.medium : C.low;
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500">{label}</div>
      <div className="text-3xl font-black tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-600">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
  );
}

function IntegrationCard({ tool, existing, token, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [apiUrl, setApiUrl]     = useState(existing?.api_url || '');
  const [apiKey, setApiKey]     = useState('');
  const [username, setUsername] = useState(existing?.username || '');
  const [notes, setNotes]       = useState(existing?.notes || '');
  const [saving, setSaving]     = useState(false);
  const [savedOk, setSavedOk]   = useState(false);
  const [error, setError]       = useState('');

  // Sync field defaults when existing changes (after reload)
  useEffect(() => {
    setApiUrl(existing?.api_url || '');
    setUsername(existing?.username || '');
    setNotes(existing?.notes || '');
  }, [existing?.api_url, existing?.username, existing?.notes]);

  const isConnected = existing?.enabled === 1 && (existing?.api_url || existing?.username);

  const save = async () => {
    if (!apiUrl && !username) { setError('API URL or Username is required'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/vciso/integrations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_slug: tool.slug, tool_name: tool.name,
          api_url: apiUrl, api_key: apiKey, username, notes, enabled: 1,
        }),
      });
      if (res.ok) {
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2000);
        setExpanded(false);
        onSaved();
      } else {
        setError('Failed to save — check connection details and try again.');
      }
    } catch { setError('Network error. Please try again.'); }
    setSaving(false);
  };

  const disconnect = async () => {
    await fetch('/api/vciso/integrations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_slug: tool.slug, tool_name: tool.name, api_url: '', api_key: '', username: '', notes: '', enabled: 0 }),
    });
    onSaved();
  };

  return (
    <div className={`rounded-xl overflow-hidden transition-all border ${isConnected ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900">{tool.name}</div>
          <div className="text-[10px] text-slate-500">
            {isConnected ? `Connected${existing.api_url ? ` · ${existing.api_url}` : ''}` : 'Not connected'}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {isConnected && (
            <button onClick={disconnect}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg transition bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
              Disconnect
            </button>
          )}
          <button onClick={() => { setExpanded(e => !e); setError(''); }}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition border shadow-sm ${isConnected ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'}`}>
            {expanded ? 'Close' : isConnected ? 'Edit' : 'Connect'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-slate-200 bg-white">
          <div className="grid grid-cols-2 gap-2">
            <Field label="API / Instance URL" value={apiUrl} onChange={setApiUrl} placeholder="https://app.tool.com" />
            <Field label="Username / Email" value={username} onChange={setUsername} placeholder="admin@company.com" />
            <Field label="API Key / Token" type="password" value={apiKey} onChange={setApiKey} placeholder="Leave blank to keep existing" />
          </div>
          <Field label="Notes (scope, region, project key…)" value={notes} onChange={setNotes} placeholder="e.g. US-East region, project ABC" />
          {error && <div className="text-[10px] font-semibold text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setExpanded(false); setError(''); }}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="text-xs font-semibold px-4 py-1.5 rounded-xl disabled:opacity-50 transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              {saving ? 'Saving…' : savedOk ? '✓ Connected' : 'Save Connection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecurityDashboard() {
  const { getToken } = useAuth();
  const token = getToken();

  const [activeTab, setActiveTab]       = useState('all');
  const [sevFilter, setSevFilter]       = useState('all');
  const [search, setSearch]             = useState('');
  const [integrations, setIntegrations] = useState([]);
  const [liveData, setLiveData]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [expandedCat, setExpandedCat]   = useState(null);

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/vciso/integrations', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setIntegrations(await res.json());
    } catch {}
  }, [token]);

  const fetchLiveData = useCallback(async (tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vciso/security/live-data?source_type=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setLiveData(await res.json()); setLastRefresh(new Date()); }
    } catch (e) { console.error('Live data error:', e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);
  useEffect(() => { fetchLiveData(activeTab); }, [activeTab, fetchLiveData]);

  const getIntegration = (name, slug) =>
    integrations.find(i => i.tool_name?.toLowerCase() === name.toLowerCase() && i.module_slug === slug);

  const connectedNames = integrations
    .filter(i => i.enabled === 1 && (i.api_url || i.username))
    .map(i => i.tool_name?.toLowerCase());

  const anyConnected = connectedNames.length > 0;

  const connectedCount = (cat) =>
    (TOOL_CATALOG[cat] || []).filter(t => connectedNames.includes(t.name.toLowerCase())).length;

  const tabTools = (TOOL_CATALOG[activeTab] || []).map(t => ({ ...t, category: activeTab }));

  const categoryGroups = Object.entries(TOOL_CATALOG).map(([cat, tools]) => ({
    cat,
    label: TABS.find(t => t.id === cat)?.label || cat,
    tools: tools.map(t => ({ ...t, category: cat })),
  }));

  const liveVulns = liveData?.vulnerabilities || [];
  const sourceVulns = anyConnected && liveVulns.length > 0 ? liveVulns : MOCK_VULNS;

  const catFilter = tabSourceMap[activeTab];
  const filteredVulns = sourceVulns
    .filter(v => !catFilter || v.category === catFilter)
    .filter(v => sevFilter === 'all' || v.severity === sevFilter)
    .filter(v => !search || [v.title, v.id, v.asset].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  const filtSummary = {
    total:    filteredVulns.length,
    critical: filteredVulns.filter(v => v.severity === 'critical').length,
    high:     filteredVulns.filter(v => v.severity === 'high').length,
    medium:   filteredVulns.filter(v => v.severity === 'medium').length,
    low:      filteredVulns.filter(v => v.severity === 'low').length,
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">Security Intelligence</div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">Integration Sources &amp; Live Vulnerability Feed</div>
          {lastRefresh && <div className="text-xs text-slate-500 mt-1">Last refreshed: {lastRefresh.toLocaleTimeString()}</div>}
        </div>
        <button onClick={() => fetchLiveData(activeTab)} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50">
          {loading
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : '🔄'}
          {loading ? 'Refreshing…' : 'Refresh Live Data'}
        </button>
      </div>

      {/* Source Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-slate-200 pb-2">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSevFilter('all'); setSearch(''); }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${active ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200 shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {tab.label}
              {tab.id !== 'all' && connectedCount(tab.id) > 0 && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {connectedCount(tab.id)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Integration Tools Panel */}
      {activeTab === 'all' ? (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">All Integration Sources</div>
          {categoryGroups.map(({ cat, label, tools }) => {
            const cc = connectedCount(cat);
            const open = expandedCat === cat;
            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedCat(open ? null : cat)}
                  className="w-full flex items-center justify-between px-5 py-3.5 transition text-left hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">{label}</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${cc > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {cc}/{tools.length} connected
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{open ? '▼' : '▶'}</span>
                </button>
                {open && (
                  <div className="p-4 space-y-2.5 border-t border-slate-100 bg-slate-50/50">
                    {tools.map(tool => (
                      <IntegrationCard key={tool.name} tool={tool}
                        existing={getIntegration(tool.name, tool.slug)}
                        token={token} onSaved={loadIntegrations} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 space-y-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {TABS.find(t => t.id === activeTab)?.label} Tools
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${connectedCount(activeTab) > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {connectedCount(activeTab)}/{tabTools.length} connected
            </span>
          </div>
          <div className="space-y-2">
            {tabTools.map(tool => (
              <IntegrationCard key={tool.name} tool={tool}
                existing={getIntegration(tool.name, tool.slug)}
                token={token} onSaved={loadIntegrations} />
            ))}
          </div>
        </div>
      )}

      {/* Sample data notice */}
      {!anyConnected && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-900">
          <span className="text-lg">⚡</span>
          <div className="text-xs">
            <strong className="text-blue-800">Sample data shown.</strong>{' '}
            Connect a security tool above to pull real-time vulnerability data. No vulnerability data is stored on this platform — all data is fetched live from your connected tools.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <SummaryCard label="Total"    value={filtSummary.total}    color={C.text}     />
        <SummaryCard label="Critical" value={filtSummary.critical} color={C.critical} />
        <SummaryCard label="High"     value={filtSummary.high}     color={C.high}     />
        <SummaryCard label="Medium"   value={filtSummary.medium}   color={C.medium}   />
        <SummaryCard label="Low"      value={filtSummary.low}      color={C.low}      />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'low'].map(sev => {
            const sc = sev === 'all' ? C.accent : sevColor(sev);
            const active = sevFilter === sev;
            return (
              <button key={sev} onClick={() => setSevFilter(sev)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition border ${active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                {sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            );
          })}
        </div>
        <div className="flex-1 relative min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search CVE ID, title, asset…"
            className="w-full text-xs px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>
      </div>

      {/* Vulnerability Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['CVE / ID', 'Title', 'Severity', 'Asset / Host', 'CVSS', 'Status', 'First Seen', 'Last Seen', 'Source Tool'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-500 text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVulns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No vulnerabilities match the selected filters
                  </td>
                </tr>
              ) : filteredVulns.map((v, i) => {
                const sc = sevColor(v.severity);
                return (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-blue-600">{v.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[240px]">{v.title}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${sc}15`, color: sc, border: `1px solid ${sc}30` }}>
                        {v.severity?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{v.asset}</td>
                    <td className="px-4 py-3 font-black tabular-nums" style={{ color: sc }}>{v.cvss}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">{v.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{v.firstSeen}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{v.lastSeen || '—'}</td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-slate-800">{v.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50">
          <span className="text-[11px] text-slate-500 font-medium">
            {anyConnected ? '🟢 Live data' : '⚡ Sample data'} · Showing {filteredVulns.length} of {sourceVulns.length} vulnerabilities
          </span>
          {liveData?.note && <span className="text-[11px] font-semibold text-amber-600">{liveData.note}</span>}
        </div>
      </div>
    </div>
  );
}
