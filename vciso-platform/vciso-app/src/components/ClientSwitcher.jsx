import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { th } from '../theme';

// ─── Constants ─────────────────────────────────────────────────────────────────
const INDUSTRIES = [
  'IT Services','SaaS','Finance','Banking','Healthcare','Manufacturing',
  'Education','Government','Telecom','E-commerce','Retail','Logistics',
  'Energy','Hospitality','Other',
];

const MODULE_BADGE = {
  'Vulnerability Management': 'bg-red-500/10 text-red-400 border-red-500/30',
  'Identity & Access':        'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Compliance':               'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Compliance Management':    'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Incident Response':        'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Asset Management':         'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};
const BADGE_DEFAULT = 'bg-violet-500/10 text-violet-500 border-violet-500/30';

// ─── Add / Edit Client Modal ───────────────────────────────────────────────────
function ClientModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name:     existing?.name     || '',
    industry: existing?.industry || '',
    status:   existing?.status   || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Company name is required'); return; }
    setSaving(true); setError('');
    try {
      const url    = isEdit ? `/api/clients/${existing.id}` : '/api/clients';
      const method = isEdit ? 'PATCH' : 'POST';
      const token  = localStorage.getItem('vciso_token');
      const res    = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-white border border-gray-200 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Client' : 'Add New Client'}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{isEdit ? 'Update client details' : 'Create a new client account'}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl leading-none transition">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5">
              ⚠ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 placeholder-gray-400"
              placeholder="e.g. Acme Corporation"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Industry</label>
            <select
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 cursor-pointer"
              value={form.industry}
              onChange={set('industry')}
            >
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
            <div className="flex gap-3">
              {['active','inactive'].map(s => (
                <label key={s} className={`flex-1 flex items-center gap-2 px-3 py-2.5 border cursor-pointer transition ${
                  form.status === s ? 'border-violet-500 bg-violet-500/10' : 'border-gray-200 hover:border-gray-500'
                }`}>
                  <input type="radio" name="status" value={s} checked={form.status === s} onChange={set('status')} className="accent-violet-500" />
                  <span className="text-sm text-gray-900 capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-gray-50 border border-gray-200 hover:border-gray-500 text-gray-700 text-sm font-semibold transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-semibold transition">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : '+ Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Client Profile View ───────────────────────────────────────────────────────
function ClientProfile({ client, onBack, onEdit, navigate }) {
  const [company,      setCompany]      = useState(null);
  const [contacts,     setContacts]     = useState([]);
  const [modules,      setModules]      = useState([]);
  const [assets,       setAssets]       = useState([]);
  const [files,        setFiles]        = useState([]);
  const [integs,       setIntegs]       = useState([]);
  const [branding,     setBranding]     = useState([]);
  const [contract,     setContract]     = useState(null);
  const [assetReg,     setAssetReg]     = useState([]);
  const [platSettings, setPlatSettings] = useState({});
  const [users,        setUsers]        = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [frameworks,   setFrameworks]   = useState([]);
  const [domains,      setDomains]      = useState([]);
  const [controls,     setControls]     = useState([]);
  const [tools,        setTools]        = useState([]);
  const [onbStatus,    setOnbStatus]    = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('vciso_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('owner_token') ||
      '';
    const ah = token ? { Authorization: `Bearer ${token}` } : {};
    const safeGet = (url, fallback) =>
      fetch(url, { headers: ah }).then(r => r.ok ? r.json() : fallback).catch(() => fallback);

    Promise.all([
      safeGet(`/api/company-info/${client.id}`, {}),
      safeGet(`/api/contacts/${client.id}`, []),
      safeGet(`/api/onboarding-modules/${client.id}`, []),
      safeGet(`/api/asset-inventory/${client.id}`, []),
      safeGet(`/api/repository/${client.id}`, []),
      safeGet(`/api/integrations-stack/${client.id}`, []),
      safeGet(`/api/branding/${client.id}`, []),
      safeGet(`/api/contract-tenure/${client.id}`, null),
      safeGet(`/api/assets?client_id=${client.id}`, []),
      safeGet(`/api/settings?client_id=${client.id}`, {}),
      safeGet(`/api/users?client_id=${client.id}`, []),
      safeGet(`/api/employees/${client.id}`, []),
      safeGet(`/api/framework-selections/${client.id}`, { framework_ids: [] }),
      safeGet(`/api/domain-selections/${client.id}`, { domain_ids: [] }),
      safeGet(`/api/control-selections/${client.id}`, { control_ids: [] }),
      safeGet(`/api/tool-selections/${client.id}`, { tool_names: [] }),
      safeGet(`/api/onboarding-status/${client.id}`, null),
    ]).then(([co, ct, mo, as, fi, ig, br, cn, ar, ps, us, em, fw, dm, cl, tl, obs]) => {
      setCompany(co);
      setContacts(Array.isArray(ct) ? ct : []);
      setModules(Array.isArray(mo) ? mo : []);
      setAssets(Array.isArray(as) ? as : []);
      setFiles(Array.isArray(fi) ? fi : []);
      setIntegs(Array.isArray(ig) ? ig : []);
      setBranding(Array.isArray(br) ? br : []);
      setContract(cn && cn.contract_start ? cn : null);
      setAssetReg(Array.isArray(ar) ? ar : []);
      setPlatSettings(ps || {});
      setUsers(Array.isArray(us) ? us : us?.users || []);
      setEmployees(Array.isArray(em) ? em : []);
      setFrameworks(fw?.framework_ids || []);
      setDomains(dm?.domain_ids || []);
      setControls(cl?.control_ids || []);
      setTools(tl?.tool_names || []);
      setOnbStatus(obs || null);
      setLoading(false);
    });
  }, [client.id]);

  const enabledMods      = modules.filter(m => m.enabled);
  const displayMods      = tools.length > 0 ? tools : (enabledMods.length > 0 ? enabledMods.map(m => m.module_name || m.name) : (client.modules || []));
  const activeIntegs     = integs.filter(i => i.enabled);
  const activeSettings   = Object.entries(platSettings || {}).filter(([k, v]) => k.endsWith('_enabled') && (v === 'true' || v === true));
  const itAssetRegCount  = assetReg.filter(a => a.host || a.ip_address || a.dns_name).length;
  const hostnamesCount   = assets.filter(a => a.asset_type === 'hostname').length + assetReg.filter(a => !!a.host).length;
  const ipsCount         = assets.filter(a => a.asset_type === 'ip').length + assetReg.filter(a => !!a.ip_address).length;
  const domainsCount     = assets.filter(a => a.asset_type === 'domain').length + assetReg.filter(a => !!a.dns_name && !a.host).length;
  const subdomainsCount  = assets.filter(a => a.asset_type === 'subdomain').length;
  const totalAssets      = assets.length + itAssetRegCount;
  const internetFacing   = assets.filter(a => a.internet_facing).length + assetReg.filter(a => (a.facing === 'external' || a.facing === 'internet_facing') && (a.host || a.ip_address || a.dns_name)).length;

  const allDocs = [
    ...branding.map(b => ({ id: b.id || b.doc_type, name: b.file_name || b.doc_type?.replace(/_/g, ' '), category: 'Branding & Legal', date: b.uploaded_at || b.created_at })),
    ...files.map(f => ({ id: f.id, name: f.original_name || f.file_name, category: f.category || 'Repository', date: f.uploaded_at })),
  ];
  const totalFiles = allDocs.length;
  const totalContactsAndUsers = contacts.length + users.length + employees.length;
  const hasInfo = company?.company_name;

  const assetTypes = [
    { label:'Hostnames',   type:'hostname',  count: hostnamesCount, icon:'🖥️' },
    { label:'IP Addresses',type:'ip',        count: ipsCount,       icon:'🔢' },
    { label:'Domains',     type:'domain',    count: domainsCount,   icon:'🌐' },
    { label:'Subdomains',  type:'subdomain', count: subdomainsCount,icon:'🔗' },
  ];

  // User Management rule: complete if has >=1 client employee user and >=1 vCISO user
  const hasClientEmp = (employees.length >= 1) || users.some(u => u.role === 'client' || u.employee_type === 'internal' || u.employee_type === 'external');
  const hasVcisoUser = users.some(u => u.role === 'vciso' || u.role === 'admin' || u.role === 'owner' || u.role === 'vciso_admin');
  const userMgmtDone = hasClientEmp && hasVcisoUser;

  // Use DB onboarding status flags (from wizard) when available, else fall back to data checks
  // Note: "Review & Complete" is excluded from the progress bar
  const s = onbStatus || {};
  const checklist = [
    { label: 'Company Details',           done: s.company_details_completed   ?? !!hasInfo },
    { label: 'Escalation Matrix',         done: s.escalation_completed        ?? contacts.length > 0 },
    { label: 'Branding & Legal',          done: s.branding_completed          ?? branding.length > 0 },
    { label: 'Contract Tenure',           done: s.contract_completed          ?? !!contract },
    { label: 'Asset Inventory',           done: s.asset_inventory_completed   ?? (assets.length > 0 || assetReg.length > 0) },
    { label: 'Asset & Employee Registry', done: s.asset_registry_completed    ?? assetReg.length > 0 },
    { label: 'Platform Config',           done: s.platform_config_completed   ?? (Object.keys(platSettings).length > 0 || activeSettings.length > 0) },
    { label: 'Framework Selection',       done: s.framework_completed         ?? frameworks.length > 0 },
    { label: 'Security Domains',          done: s.domains_completed           ?? domains.length > 0 },
    { label: 'Controls Review',           done: s.controls_completed          ?? controls.length > 0 },
    { label: 'Security Tools',            done: s.tools_completed             ?? (tools.length > 0 || displayMods.length > 0) },
    { label: 'Integrations',              done: s.integrations_completed      ?? (activeIntegs.length > 0 || activeSettings.length > 0) },
    { label: 'User Management',           done: userMgmtDone },
  ];
  const completedSteps = checklist.filter(c => c.done).length;
  const progressPct    = Math.round((completedSteps / checklist.length) * 100);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">⏳</div>
        <div className="text-sm">Loading client profile…</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition font-medium">
          ← Back to Clients
        </button>
        <div className="flex gap-2">
          <button onClick={onEdit}
            className="px-3.5 py-1.5 text-xs font-semibold border border-gray-200 hover:border-violet-500 text-gray-700 hover:text-gray-900 rounded-lg transition">
            ✏ Edit Client
          </button>
          <button onClick={() => navigate('/dashboard/admin/onboarding')}
            className="px-3.5 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition shadow-sm">
            🚀 Onboarding Wizard
          </button>
        </div>
      </div>

      {/* ── Client header card ── */}
      <div className={`${th('bg-white', { classic: 'bg-gradient-to-r from-violet-50 to-purple-50', dark: 'bg-gradient-to-r from-violet-50 to-purple-50' })} border border-gray-200 p-6 rounded-xl shadow-sm`}>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-white border-2 border-violet-200 flex items-center justify-center text-violet-600 font-black text-3xl flex-shrink-0 shadow-sm rounded-xl">
            {client.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{hasInfo ? company.company_name : client.name}</h1>
              <span className={`text-xs px-2.5 py-1 font-semibold rounded-full border ${
                client.status === 'active'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {client.status === 'active' ? '● Active' : '○ Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {(hasInfo ? company.industry : client.industry) && <span>🏭 {hasInfo ? company.industry : client.industry}</span>}
              {hasInfo && company.city    && <span>📍 {company.city}{company.country ? `, ${company.country}` : ''}</span>}
              {hasInfo && company.company_size && <span>👥 {company.company_size} employees</span>}
              {hasInfo && company.website && (
                <a href={company.website} target="_blank" rel="noreferrer"
                  className="text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-1 max-w-xs truncate"
                  title={company.website}>
                  🌐 <span className="truncate">{(() => { try { return new URL(company.website).hostname.replace(/^www\./, ''); } catch { return company.website.length > 40 ? company.website.slice(0, 40) + '…' : company.website; } })()}</span>
                </a>
              )}
            </div>
            {hasInfo && company.description && (
              <p className="text-gray-500 text-xs mt-2 line-clamp-2">{company.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon:'🛡️', label:'Security Tools & Frameworks', value: tools.length + frameworks.length || displayMods.length, sub:`${frameworks.length} frameworks · ${controls.length} controls`, border:'border-violet-200', bg:'bg-violet-50/50', text:'text-violet-600' },
          { icon:'👥', label:'Contacts & Team',             value: totalContactsAndUsers,                                 sub:`${contacts.length} contacts · ${users.length + employees.length} users`,    border:'border-green-200',  bg:'bg-green-50/50',  text:'text-green-600'  },
          { icon:'🗺️', label:'Assets',                      value: totalAssets,                                           sub:`${internetFacing} internet-facing`,                                         border:'border-orange-200', bg:'bg-orange-50/50', text:'text-orange-600' },
          { icon:'📁', label:'Files & Documents',           value: totalFiles,                                            sub:`${branding.length} legal docs · ${files.length} repo files`,               border:'border-purple-200', bg:'bg-purple-50/50', text:'text-purple-600' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border ${c.border} p-4 rounded-xl shadow-sm`}>
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className={`text-3xl font-black ${c.text}`}>{c.value}</div>
            <div className="text-gray-900 text-xs font-semibold mt-0.5">{c.label}</div>
            <div className="text-gray-500 text-xs">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Onboarding progress ── */}
      <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">📋 Onboarding Progress</h3>
          <span className="text-xs text-gray-500 font-semibold">
            <span className={progressPct === 100 ? 'text-green-600 font-bold' : 'text-violet-600 font-bold'}>{completedSteps}</span>/{checklist.length} steps complete
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${progressPct === 100 ? 'bg-green-500' : 'bg-violet-600'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Step pills — horizontal scroll on small screens */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            {checklist.map((step, i) => (
              <div key={step.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                step.done
                  ? 'bg-green-50 text-green-700 border-green-200 font-medium'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step.done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.done ? '✓' : i + 1}
                </span>
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Detail cards grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Company info */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">🏢 Company Profile</h3>
          {hasInfo ? (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                ['Legal Name',   company.legal_name],
                ['Address',      company.address],
                ['State / City', [company.city, company.state].filter(Boolean).join(', ')],
                ['Country',      company.country],
                ['Timezone',     company.timezone],
                ['Employees',    company.num_employees],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k}>
                  <div className="text-gray-500 text-xs">{k}</div>
                  <div className="text-gray-700 text-xs font-medium mt-0.5 truncate">{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🏗️</div>
              <p className="text-gray-500 text-sm mb-3">No company info filled in yet</p>
              <button onClick={() => navigate('/dashboard/admin/onboarding')}
                className="text-xs px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition font-semibold">
                Start Onboarding →
              </button>
            </div>
          )}
        </div>

        {/* Contacts */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">👤 Contacts</h3>
          {contacts.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-gray-500 text-sm">No contacts added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600 text-xs font-bold flex-shrink-0">
                    {(c.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 text-xs font-semibold truncate">{c.full_name || '—'}</div>
                    <div className="text-gray-500 text-xs truncate">{[c.designation, c.email].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-white text-gray-600 border border-gray-200 rounded capitalize flex-shrink-0">
                    {c.contact_type}
                  </span>
                </div>
              ))}
              {contacts.length > 4 && <p className="text-gray-500 text-xs text-center">+{contacts.length - 4} more contacts</p>}
            </div>
          )}
        </div>

        {/* Security tools & modules */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
            <span>🛡️ Security Stack & Tools ({tools.length + frameworks.length || displayMods.length})</span>
            {controls.length > 0 && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-normal border border-indigo-200">
                {controls.length} Controls · {domains.length} Domains
              </span>
            )}
          </h3>
          {displayMods.length === 0 && frameworks.length === 0 && tools.length === 0 ? (
            <p className="text-gray-500 text-sm">No modules or tools selected</p>
          ) : (
            <div className="space-y-3">
              {frameworks.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Compliance Frameworks ({frameworks.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {frameworks.map(f => (
                      <span key={f} className="text-xs px-2.5 py-1 border font-medium rounded-lg bg-purple-50 text-purple-700 border-purple-200">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tools.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Security Tools ({tools.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tools.map(name => (
                      <span key={name} className={`text-xs px-2.5 py-1 border font-medium rounded-lg ${MODULE_BADGE[name] || BADGE_DEFAULT}`}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tools.length === 0 && displayMods.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {displayMods.map(name => (
                    <span key={name} className={`text-xs px-2.5 py-1 border font-medium rounded-lg ${MODULE_BADGE[name] || BADGE_DEFAULT}`}>
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Integrations */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">🔌 Integrations & Stack</h3>
          {activeIntegs.length === 0 && activeSettings.length === 0 && tools.length === 0 ? (
            <p className="text-gray-500 text-sm">No integrations configured</p>
          ) : (
            <div className="space-y-3">
              {activeIntegs.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Connected Integrations ({activeIntegs.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeIntegs.map(t => (
                      <span key={t.name || t.id} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded">{t.name || t.id}</span>
                    ))}
                  </div>
                </div>
              )}
              {activeSettings.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Platform Services ({activeSettings.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSettings.map(([k]) => (
                      <span key={k} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded capitalize">
                        {k.replace('_enabled', '').replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeIntegs.length === 0 && activeSettings.length === 0 && tools.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Security Stack ({tools.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tools.slice(0, 8).map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded">{t}</span>
                    ))}
                    {tools.length > 8 && <span className="text-xs text-gray-500">+{tools.length - 8} more</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Asset inventory */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
            <span>🗺️ Asset Inventory ({totalAssets})</span>
            {internetFacing > 0 && (
              <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-normal border border-orange-200">
                {internetFacing} Exposed
              </span>
            )}
          </h3>
          {totalAssets === 0 ? (
            <p className="text-gray-500 text-sm">No assets tracked yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {assetTypes.map(({ label, type, count, icon }) => (
                <div key={type} className="bg-gray-50 p-3 rounded-lg flex items-center gap-3 border border-gray-100">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <div className="text-gray-900 font-bold text-lg leading-none">{count}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent files */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">📁 Recent Files & Legal Documents ({totalFiles})</h3>
          {totalFiles === 0 ? (
            <p className="text-gray-500 text-sm">No files uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {allDocs.slice(0, 6).map((f, idx) => (
                <div key={f.id || idx} className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  <span className="text-base">{f.category === 'Branding & Legal' ? '📜' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 text-xs font-medium truncate">{f.name}</div>
                    <div className="text-gray-500 text-[10px]">{f.category} {f.date ? `· ${String(f.date).slice(0, 10)}` : ''}</div>
                  </div>
                </div>
              ))}
              {allDocs.length > 6 && <p className="text-gray-500 text-xs text-center">+{allDocs.length - 6} more files</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Main ClientSwitcher ───────────────────────────────────────────────────────
export default function ClientSwitcher({ activeClient, setActiveClient }) {
  const [clients,    setClients]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all'); // all | active | inactive | delete
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelected, setDeleteSelected] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setLoading(true);
    const token = localStorage.getItem('vciso_token');
    const ah = token ? { Authorization: `Bearer ${token}` } : {};
    const data = await fetch('/api/clients', { headers: ah }).then(r => r.ok ? r.json() : []).catch(() => []);
    setClients(data);
    setLoading(false);
  }

  function handleSaved(client) {
    setClients(cs => {
      const exists = cs.find(c => c.id === client.id);
      return exists ? cs.map(c => c.id === client.id ? client : c) : [...cs, client];
    });
    setShowModal(false);
    setEditTarget(null);
    // Auto-select newly created client
    if (!editTarget) setActiveClient(client);
  }

  async function handleDelete(client, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${client.name}"? This will permanently remove the client and all associated data.`)) return;
    const token = localStorage.getItem('vciso_token');
    await fetch(`/api/clients/${client.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => {});
    setClients(cs => cs.filter(c => c.id !== client.id));
    if (activeClient?.id === client.id) setActiveClient(null);
  }

  function openEdit(client, e) {
    e.stopPropagation();
    setEditTarget(client);
    setShowModal(true);
  }

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.industry || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const activeCount   = clients.filter(c => c.status === 'active').length;
  const inactiveCount = clients.filter(c => c.status === 'inactive').length;

  // Show profile if client selected
  if (activeClient) {
    return (
      <div className="p-6 max-w-5xl mx-auto min-h-screen">
        <ClientProfile
          client={activeClient}
          onBack={() => setActiveClient(null)}
          onEdit={() => { setEditTarget(activeClient); setShowModal(true); }}
          navigate={navigate}
        />
        {showModal && (
          <ClientModal
            existing={editTarget}
            onClose={() => { setShowModal(false); setEditTarget(null); }}
            onSaved={c => { handleSaved(c); setActiveClient(c); }}
          />
        )}
      </div>
    );
  }

  // Client list
  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">

      {showModal && (
        <ClientModal
          existing={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your vCISO client accounts and security programs</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition shadow-lg shadow-violet-500/20"
        >
          + Add New Client
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label:'Total Clients', value: clients.length, icon:'🏢', color:'text-gray-900'         },
          { label:'Active',        value: activeCount,    icon:'✅', color:'text-green-400'      },
          { label:'Inactive',      value: inactiveCount,  icon:'⏸️', color:'text-gray-500'       },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 px-5 py-4 flex items-center gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + filter ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          className="flex-1 min-w-[200px] max-w-sm bg-white border border-gray-200 text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 placeholder-gray-400"
          placeholder="🔍  Search by name or industry…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1 bg-white border border-gray-200 p-1">
          {['all','active','inactive'].map(f => (
            <button key={f}
              onClick={() => { setFilter(f); setDeleteMode(false); setDeleteSelected(new Set()); }}
              className={`px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === f && !deleteMode ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-900'
              }`}>
              {f}
            </button>
          ))}
          <button
            onClick={() => { setDeleteMode(d => !d); setDeleteSelected(new Set()); }}
            className={`px-3 py-1.5 text-xs font-semibold capitalize transition ${
              deleteMode ? 'bg-red-600 text-gray-900' : 'text-gray-500 hover:text-red-400'
            }`}>
            🗑 Delete
          </button>
        </div>

        {/* Bulk delete action bar */}
        {deleteMode && (
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 px-4 py-2">
            <span className="text-red-300 text-xs font-semibold">
              {deleteSelected.size === 0 ? 'Select clients to delete' : `${deleteSelected.size} selected`}
            </span>
            {deleteSelected.size > 0 && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete ${deleteSelected.size} client(s)? This cannot be undone.`)) return;
                  const token = localStorage.getItem('vciso_token');
                  await Promise.all([...deleteSelected].map(id =>
                    fetch(`/api/clients/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} })
                  ));
                  setClients(cs => cs.filter(c => !deleteSelected.has(c.id)));
                  if (deleteSelected.has(activeClient?.id)) setActiveClient(null);
                  setDeleteSelected(new Set());
                  setDeleteMode(false);
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-gray-900 text-xs font-semibold transition"
              >
                Delete Selected
              </button>
            )}
            <button
              onClick={() => { setDeleteMode(false); setDeleteSelected(new Set()); }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition ml-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── Client cards grid ── */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <div>Loading clients…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏢</div>
          <div className="text-gray-900 font-semibold text-lg mb-1">No clients found</div>
          <div className="text-gray-500 text-sm mb-6">
            {clients.length === 0 ? 'Get started by adding your first client' : 'Try adjusting your search or filters'}
          </div>
          {clients.length === 0 && (
            <button onClick={() => { setEditTarget(null); setShowModal(true); }}
              className="px-6 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-semibold transition text-sm">
              + Add Your First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => {
            const isChecked = deleteSelected.has(client.id);
            return (
            <div
              key={client.id}
              onClick={() => {
                if (deleteMode) {
                  setDeleteSelected(s => { const n = new Set(s); n.has(client.id) ? n.delete(client.id) : n.add(client.id); return n; });
                } else {
                  setActiveClient(client);
                }
              }}
              className={`admin-card p-5 rounded-xl cursor-pointer transition-all group relative ${
                deleteMode
                  ? isChecked ? 'border-red-500 bg-red-900/10 hover:border-red-400' : 'border-gray-200 hover:border-red-500/50'
                  : 'border-gray-200 hover:border-violet-500/60 hover:shadow-blue-500/5'
              }`}
            >
              {/* Delete mode checkbox */}
              {deleteMode ? (
                <div className="absolute top-4 right-4 w-5 h-5 border-2 flex items-center justify-center transition"
                  style={{ background: isChecked ? '#dc2626' : 'transparent', borderColor: isChecked ? '#dc2626' : th('#6b7280', { dark: '#94A3B8' }) }}>
                  {isChecked && <span className="text-gray-900 text-xs font-bold">✓</span>}
                </div>
              ) : (
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={e => openEdit(client, e)}
                  className="w-7 h-7 bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-500 flex items-center justify-center text-xs transition"
                  title="Edit client"
                >
                  ✏
                </button>
                <button
                  onClick={e => handleDelete(client, e)}
                  className="w-7 h-7 bg-gray-50 border border-red-900/50 text-red-500 hover:text-red-300 hover:border-red-500 hover:bg-red-900/20 flex items-center justify-center text-xs transition"
                  title="Delete client"
                >
                  🗑
                </button>
              </div>
              )}

              {/* Card header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white border-2 border-violet-200 flex items-center justify-center text-violet-600 font-black text-xl shadow-sm flex-shrink-0">
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-violet-400 transition truncate pr-16">
                    {client.name}
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5">{client.industry || 'Industry not set'}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2.5 py-0.5 font-semibold border ${
                  client.status === 'active'
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-gray-500/10 text-gray-500 border-gray-500/30'
                }`}>
                  {client.status === 'active' ? '● Active' : '○ Inactive'}
                </span>
                <span className="text-gray-500 text-xs">{(client.modules || []).length} modules</span>
              </div>

              {/* Module badges */}
              {(client.modules || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(client.modules || []).slice(0, 3).map(mod => (
                    <span key={mod} className={`text-xs px-2 py-0.5 border font-medium ${MODULE_BADGE[mod] || BADGE_DEFAULT}`}>
                      {mod}
                    </span>
                  ))}
                  {(client.modules || []).length > 3 && (
                    <span className="text-xs text-gray-500 py-0.5">+{client.modules.length - 3} more</span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Since {client.created_at?.slice(0,10) || '—'}
                </span>
                <span className="text-xs text-violet-500 font-semibold group-hover:text-violet-400 flex items-center gap-1">
                  View Profile <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                </span>
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}
