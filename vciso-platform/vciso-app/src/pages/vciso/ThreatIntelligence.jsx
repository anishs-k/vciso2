import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../AuthContext';

const SEV_BADGE = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high:     'bg-orange-50 text-orange-700 border-orange-200',
  medium:   'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  info:     'bg-blue-50 text-blue-700 border-blue-200',
};

function SevBadge({ s }) {
  const cls = SEV_BADGE[s] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wider ${cls}`}>
      {s}
    </span>
  );
}

function getAgeDays(dateStr) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function ThreatIntelligence() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Global feed state
  const [kevItems, setKevItems] = useState([]);
  const [kevFilter, setKevFilter] = useState('');
  const [kevPage, setKevPage] = useState(0);
  const PAGE_SIZE = 20;

  // Asset-mapped state
  const [assetData, setAssetData] = useState(null);
  const [mappedAlerts, setMappedAlerts] = useState([]);
  const [mapping, setMapping] = useState(false);

  // OTX state
  const [otxPulses, setOtxPulses] = useState([]);
  const [otxKey, setOtxKey] = useState('');

  const token = getToken();

  // Load cached data from backend
  const loadCache = useCallback(async () => {
    try {
      const res = await fetch('/api/vciso/threat-intel', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAssetData(data.assets);
      setMappedAlerts(data.alerts || []);
      const cached = data.cache || {};
      if (cached.cisa_kev?.data?.length) {
        setKevItems(cached.cisa_kev.data);
      }
      if (cached.otx_pulses?.data?.length) setOtxPulses(cached.otx_pulses.data);
      return !!cached.cisa_kev?.data?.length;
    } catch {}
    return false;
  }, [token]);

  // Fetch CISA KEV via backend proxy (avoids CORS issues)
  const fetchCisaKev = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setFetchError('');
    try {
      const res = await fetch('/api/vciso/threat-intel/fetch-cisa', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (json.items?.length) setKevItems(json.items);
      else if (json.error) setFetchError(json.error);
    } catch (e) {
      setFetchError(e.message || 'Failed to fetch CISA KEV feed');
    }
    if (!silent) setRefreshing(false);
  }, [token]);

  useEffect(() => {
    (async () => {
      const hasCached = await loadCache();
      // Auto-fetch if no cached data
      if (!hasCached) await fetchCisaKev(true);
      setLoading(false);
    })();
  }, [loadCache, fetchCisaKev]);

  // Fetch OTX pulses (browser → OTX; OTX supports CORS)
  const fetchOtx = async () => {
    if (!otxKey.trim()) return;
    setRefreshing(true);
    try {
      const res = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20', {
        headers: { 'X-OTX-API-KEY': otxKey.trim() }
      });
      const json = await res.json();
      const pulses = (json.results || []).map(p => ({
        id: p.id, name: p.name, description: p.description, created: p.created,
        tags: p.tags || [], tlp: p.tlp, adversary: p.adversary,
        industries: p.industries || [], references: p.references || [],
        indicators_count: p.indicators_count,
        severity: p.tlp === 'red' ? 'critical' : p.tlp === 'amber' ? 'high' : 'medium',
      }));
      setOtxPulses(pulses);
      await fetch('/api/vciso/threat-intel/cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'otx_pulses', data: pulses }),
      });
    } catch (e) {
      setFetchError('OTX fetch failed: ' + (e.message || 'unknown error'));
    }
    setRefreshing(false);
  };

  // Map assets to KEV threats
  const runAssetMapping = async () => {
    if (!assetData || kevItems.length === 0) return;
    setMapping(true);
    const allAssets = [...(assetData.ips || []), ...(assetData.hostnames || [])];
    const alerts = [];
    for (const item of kevItems.slice(0, 50)) {
      const ageDays = getAgeDays(item.dateAdded);
      if (ageDays > 90) continue;
      for (const asset of allAssets.slice(0, 10)) {
        alerts.push({
          asset_value: asset,
          cve_id: item.cveID,
          threat_title: item.vulnerabilityName || item.cveID,
          severity: item.severity,
          source: 'cisa_kev',
          details: { product: item.product, vendor: item.vendorProject, dueDate: item.dueDate, dateAdded: item.dateAdded },
        });
      }
      if (alerts.length >= 30) break;
    }
    try {
      await fetch('/api/vciso/threat-intel/alerts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts }),
      });
      setMappedAlerts(alerts);
    } catch {}
    setMapping(false);
  };

  // Filtered KEV
  const filteredKev = kevItems.filter(v =>
    !kevFilter || v.cveID?.toLowerCase().includes(kevFilter.toLowerCase())
      || v.vulnerabilityName?.toLowerCase().includes(kevFilter.toLowerCase())
      || v.product?.toLowerCase().includes(kevFilter.toLowerCase())
  );
  const pagedKev = filteredKev.slice(kevPage * PAGE_SIZE, (kevPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredKev.length / PAGE_SIZE);
  const critCount = mappedAlerts.filter(a => a.severity === 'critical').length;
  const highCount = mappedAlerts.filter(a => a.severity === 'high').length;

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-slate-50 min-h-[400px]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-xs text-slate-500 font-semibold">Loading threat intelligence...</div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 font-sans bg-slate-50 min-h-full text-slate-900">

      {/* Refreshing overlay */}
      {refreshing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-slate-900 font-bold text-sm">Fetching latest threat intelligence...</div>
            <div className="text-xs text-slate-500">Pulling CISA KEV feed · Cross-referencing environment assets</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Threat Intelligence</h1>
          <p className="text-xs mt-0.5 text-slate-500">
            Global threat feeds + asset-mapped alerts for your environment
          </p>
        </div>
        <div className="flex gap-2.5 items-center flex-wrap">
          {mappedAlerts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
              ⚠️ {critCount} Critical · {highCount} High alerts mapped
            </div>
          )}
          <button onClick={() => fetchCisaKev(false)} disabled={refreshing}
            className="text-xs font-bold px-4 py-2 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50">
            {refreshing ? '⟳ Refreshing...' : '↻ Refresh Feeds'}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="px-4 py-3 rounded-2xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shadow-sm">
          ⚠️ {fetchError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm w-fit">
        {[
          { id: 'global', label: `🌐 Global Feed (${kevItems.length} KEV)` },
          { id: 'assets', label: `🎯 Asset Mapped (${mappedAlerts.length} alerts)` },
          { id: 'otx', label: `📡 OTX Pulses (${otxPulses.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Global Feed Tab ── */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          {kevItems.length === 0 ? (
            <div className="rounded-2xl p-12 text-center bg-white border border-slate-200 shadow-sm">
              <div className="text-4xl mb-3">📡</div>
              <div className="text-slate-900 font-bold mb-1">No threat feed loaded</div>
              <div className="text-xs mb-4 text-slate-500">
                {refreshing ? 'Fetching CISA KEV catalog from server...' : 'Click "Refresh Feeds" to load the latest CISA KEV catalog'}
              </div>
              {!refreshing && (
                <button onClick={() => fetchCisaKev(false)}
                  className="text-xs font-bold px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition">
                  Fetch CISA Known Exploited Vulnerabilities
                </button>
              )}
              {refreshing && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Fetching from CISA...
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total KEVs', val: kevItems.length, color: 'text-blue-600' },
                  { label: 'Critical', val: kevItems.filter(v => v.severity === 'critical').length, color: 'text-red-600' },
                  { label: 'Added Last 7d', val: kevItems.filter(v => getAgeDays(v.dateAdded) <= 7).length, color: 'text-orange-600' },
                  { label: 'Added Last 30d', val: kevItems.filter(v => getAgeDays(v.dateAdded) <= 30).length, color: 'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm text-center sm:text-left">
                    <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <input
                  value={kevFilter}
                  onChange={e => { setKevFilter(e.target.value); setKevPage(0); }}
                  placeholder="Search CVE ID, product, vulnerability..."
                  className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-500 px-2">{filteredKev.length} results</span>
              </div>

              <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      {['CVE ID', 'Vendor / Product', 'Vulnerability', 'Date Added', 'Due Date', 'Severity'].map(h => (
                        <th key={h} className="text-left px-4 py-3.5 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedKev.map((v) => (
                      <tr key={v.cveID} className="border-b border-slate-100 hover:bg-slate-50/80 transition text-slate-900">
                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600">{v.cveID}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{v.vendorProject}</div>
                          <div className="text-slate-500 text-[10px]">{v.product}</div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[240px] font-medium text-slate-800">
                          <div className="truncate" title={v.vulnerabilityName}>{v.vulnerabilityName}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-medium">{v.dateAdded}</td>
                        <td className={`px-4 py-3.5 whitespace-nowrap font-medium ${v.dueDate && getAgeDays(v.dueDate) < 0 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          {v.dueDate}
                        </td>
                        <td className="px-4 py-3.5"><SevBadge s={v.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-3 justify-center pt-2">
                  <button disabled={kevPage === 0} onClick={() => setKevPage(p => p - 1)}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-sm transition">← Prev</button>
                  <span className="text-xs font-semibold text-slate-500">Page {kevPage + 1} of {totalPages}</span>
                  <button disabled={kevPage >= totalPages - 1} onClick={() => setKevPage(p => p + 1)}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-sm transition">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Asset Mapped Tab ── */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
              <div>
                <div className="text-slate-900 font-bold text-sm">Your Environment Assets</div>
                <div className="text-xs mt-0.5 text-slate-500">
                  {assetData?.total || 0} assets · {assetData?.ips?.length || 0} IPs · {assetData?.hostnames?.length || 0} hostnames
                </div>
                {assetData?.ips?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[...(assetData.ips || []), ...(assetData.hostnames || [])].map(a => (
                      <span key={a} className="text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={runAssetMapping} disabled={mapping || kevItems.length === 0}
                className="text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                {mapping ? '⟳ Mapping...' : '🎯 Run Asset Mapping'}
              </button>
            </div>
            {assetData?.total === 0 && (
              <div className="text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                No assets registered. Add IPs/hostnames in the asset inventory to enable threat mapping.
              </div>
            )}
            {kevItems.length === 0 && assetData?.total > 0 && (
              <div className="text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                Load the CISA KEV feed first (Global Feed tab → Refresh Feeds), then run mapping.
              </div>
            )}
          </div>

          {mappedAlerts.length === 0 ? (
            <div className="rounded-2xl p-12 text-center bg-white border border-slate-200 shadow-sm">
              <div className="text-4xl mb-3">🎯</div>
              <div className="text-slate-900 font-bold mb-1">No asset alerts yet</div>
              <div className="text-xs text-slate-500">
                Run Asset Mapping to cross-reference CISA KEV threats against your registered assets.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {mappedAlerts.map((a, i) => (
                <div key={i} className="rounded-2xl p-4 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
                  <SevBadge s={a.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900">{a.threat_title}</div>
                    <div className="text-[10px] mt-0.5 text-slate-500">
                      Asset: <span className="text-blue-600 font-mono font-semibold">{a.asset_value}</span> · {a.cve_id} · {a.details?.vendor} {a.details?.product}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500">Added {a.details?.dateAdded}</div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    {a.source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OTX Tab ── */}
      {activeTab === 'otx' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="text-slate-900 font-bold text-sm mb-1">AlienVault OTX</div>
            <div className="text-xs mb-3 text-slate-500">
              Free API key at <span className="text-blue-600 font-medium">otx.alienvault.com</span> → Settings → API Integration
            </div>
            <div className="flex gap-2.5 items-center">
              <input type="password" value={otxKey} onChange={e => setOtxKey(e.target.value)}
                placeholder="Paste your OTX API key..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button onClick={fetchOtx} disabled={!otxKey.trim() || refreshing}
                className="text-xs font-bold px-5 py-2.5 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50">
                Fetch Pulses
              </button>
            </div>
          </div>

          {otxPulses.length === 0 ? (
            <div className="rounded-2xl p-12 text-center bg-white border border-slate-200 shadow-sm">
              <div className="text-4xl mb-3">📡</div>
              <div className="text-slate-900 font-bold mb-1">No OTX pulses loaded</div>
              <div className="text-xs text-slate-500">Enter your OTX API key above to fetch threat intelligence pulses</div>
            </div>
          ) : (
            <div className="space-y-3">
              {otxPulses.map(p => (
                <div key={p.id} className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{p.name}</div>
                      <div className="text-[10px] mt-0.5 text-slate-500">
                        {p.adversary && <span>Adversary: {p.adversary} · </span>}
                        {p.indicators_count} indicators · Created {new Date(p.created).toLocaleDateString()}
                      </div>
                    </div>
                    <SevBadge s={p.severity} />
                  </div>
                  <p className="text-xs mb-3 line-clamp-2 text-slate-600">{p.description}</p>
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 6).map(tag => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
