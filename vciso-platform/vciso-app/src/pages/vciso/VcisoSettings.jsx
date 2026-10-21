import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import { FRAMEWORK_CATALOG, PERMISSION_TO_FRAMEWORK, PERMISSION_TO_SECURITY_TOOL } from './frameworkCatalog';

const SECURITY_TOOL_INTEGRATIONS = {
  'vulnerability-management': ['Tenable.io', 'Qualys', 'Rapid7 InsightVM', 'Nessus', 'OpenVAS', 'Wiz'],
  'grc': ['ServiceNow GRC', 'Archer', 'LogicGate', 'Vanta', 'Drata', 'Sprinto'],
  'incident-response': ['PagerDuty', 'Jira', 'ServiceNow ITSM', 'Splunk SOAR', 'IBM QRadar SOAR'],
  'iam': ['Microsoft Entra ID', 'Okta', 'CyberArk', 'SailPoint', 'Active Directory'],
  'dlp': ['Symantec DLP', 'Forcepoint', 'Microsoft Purview', 'Nightfall', 'Varonis'],
  'pam': ['CyberArk PAM', 'BeyondTrust', 'Delinea', 'HashiCorp Vault'],
  'soc-siem': ['Splunk', 'Microsoft Sentinel', 'IBM QRadar', 'Elastic SIEM', 'Sumo Logic'],
  'cloud-security': ['Wiz', 'Orca Security', 'Prisma Cloud', 'AWS Security Hub', 'Microsoft Defender for Cloud'],
  'appsec': ['Snyk', 'Veracode', 'Checkmarx', 'SonarQube', 'OWASP ZAP'],
  'tprm': ['BitSight', 'SecurityScorecard', 'ProcessUnity', 'Prevalent', 'UpGuard'],
  'network-security': ['Palo Alto Networks', 'Cisco Firepower', 'Fortinet', 'Check Point', 'Darktrace'],
  'endpoint': ['CrowdStrike Falcon', 'SentinelOne', 'Microsoft Defender', 'Carbon Black', 'Jamf'],
  'pentest': ['Cobalt Strike', 'Metasploit', 'Burp Suite Pro', 'Nmap'],
  'bcp-dr': ['Zerto', 'Veeam', 'AWS Backup', 'Azure Site Recovery', 'Rubrik'],
  'awareness': ['KnowBe4', 'Proofpoint Security Awareness', 'Cofense', 'Hoxhunt'],
  'asset-management': ['ServiceNow CMDB', 'Lansweeper', 'Qualys Asset Inventory', 'Axonius', 'Runzero'],
  'threat-intelligence': ['AlienVault OTX', 'MISP', 'Recorded Future', 'ThreatConnect'],
};

const AUDIT_FRAMEWORK_INTEGRATIONS = ['Vanta', 'Drata', 'Sprinto', 'Secureframe', 'Archer', 'ServiceNow GRC', 'Tenable.io', 'Confluence', 'Jira', 'SharePoint'];

function Field({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-slate-50 transition border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-slate-900">{title}</span>
        </div>
        <span className="text-slate-400 font-bold">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="p-6 space-y-4 bg-slate-50/40">{children}</div>}
    </div>
  );
}

function SaveBtn({ onClick, saved, label = 'Save Changes' }) {
  return (
    <button onClick={onClick} className="text-xs font-bold px-4 py-2.5 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
      {saved ? '✓ Saved' : label}
    </button>
  );
}

const TOOL_FIELD_CONFIG = {
  'Tenable.io':     { urlLabel: 'Access Key',           urlPlaceholder: 'Paste Access Key',                 keyLabel: 'Secret Key',              userLabel: 'Username (optional)',  notesPlaceholder: 'Optional notes' },
  'Jira':           { urlLabel: 'Instance URL',          urlPlaceholder: 'https://yourorg.atlassian.net',     keyLabel: 'API Token',               userLabel: 'Email Address',        notesPlaceholder: 'Project key, e.g. SEC' },
  'Confluence':     { urlLabel: 'Instance URL',          urlPlaceholder: 'https://yourorg.atlassian.net',     keyLabel: 'API Token',               userLabel: 'Email Address',        notesPlaceholder: 'Space key or scope' },
  'ServiceNow GRC': { urlLabel: 'Instance URL',          urlPlaceholder: 'https://yourorg.service-now.com',   keyLabel: 'Password',                userLabel: 'Username',             notesPlaceholder: 'e.g. scope or table name' },
  'Vanta':          { urlLabel: 'Client ID (OAuth)',      urlPlaceholder: 'client_id from Vanta app',         keyLabel: 'Client Secret',           userLabel: 'N/A (leave blank)',    notesPlaceholder: 'OAuth scope or org name' },
  'Drata':          { urlLabel: 'API Base URL',           urlPlaceholder: 'https://api.drata.com',            keyLabel: 'API Key',                 userLabel: 'N/A (leave blank)',    notesPlaceholder: 'Optional notes' },
  'Sprinto':        { urlLabel: 'API Base URL',           urlPlaceholder: 'https://api.sprinto.com',          keyLabel: 'Bearer Token',            userLabel: 'N/A (leave blank)',    notesPlaceholder: 'Optional notes' },
  'Secureframe':    { urlLabel: 'API Base URL',           urlPlaceholder: 'https://api.secureframe.com',      keyLabel: 'API Key (X-API-KEY)',     userLabel: 'N/A (leave blank)',    notesPlaceholder: 'Optional notes' },
  'Archer':         { urlLabel: 'Instance URL',           urlPlaceholder: 'https://archer.yourorg.com',       keyLabel: 'Password',                userLabel: 'Username',             notesPlaceholder: 'Instance name, e.g. Default' },
  'SharePoint':     { urlLabel: 'Tenant ID',              urlPlaceholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', keyLabel: 'Client Secret',       userLabel: 'Client ID (App)',      notesPlaceholder: 'Site path, e.g. /sites/Security' },
};

function IntegrationConfigCard({ moduleSlug, toolName, existing, token, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [apiUrl, setApiUrl] = useState(existing?.api_url || '');
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(existing?.webhook_url || '');
  const [username, setUsername] = useState(existing?.username || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const isConnected = existing?.enabled === 1 && (existing?.api_url || existing?.username);
  const testStatus = existing?.test_status;
  const lastTested = existing?.last_tested_at;
  const cfg = TOOL_FIELD_CONFIG[toolName] || {
    urlLabel: 'API / Instance URL', urlPlaceholder: 'https://app.tool.com',
    keyLabel: 'API Key / Token', userLabel: 'Username / Email', notesPlaceholder: 'e.g. project key, region, scope...',
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/vciso/integrations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_slug: moduleSlug, tool_name: toolName, api_url: apiUrl, api_key: apiKey, webhook_url: webhookUrl, username, notes, enabled: 1 }),
      });
      setSaved(true);
      setTestResult(null);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
      setExpanded(false);
    } catch {}
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/vciso/integrations/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: toolName }),
      });
      const data = await res.json();
      setTestResult(data);
      onSaved();
    } catch (e) {
      setTestResult({ ok: false, detail: e.message });
    }
    setTesting(false);
  };

  const disconnect = async () => {
    await fetch('/api/vciso/integrations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_slug: moduleSlug, tool_name: toolName, api_url: '', api_key: '', webhook_url: '', username: '', notes: '', enabled: 0 }),
    });
    setTestResult(null);
    onSaved();
  };

  const statusLabel = testStatus === 'ok' ? '✓ Connected' : testStatus === 'failed' ? '✗ Failed' : null;

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm transition bg-white ${isConnected ? 'border-emerald-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isConnected ? (testStatus === 'failed' ? 'bg-red-500' : 'bg-emerald-500') : 'bg-slate-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900 truncate">{toolName}</div>
          <div className="text-[10px] text-slate-500">
            {isConnected
              ? (statusLabel ? `${statusLabel}${lastTested ? ` · ${new Date(lastTested).toLocaleDateString()}` : ''}` : `Connected${existing.api_url ? ` · ${existing.api_url.slice(0, 30)}` : ''}`)
              : 'Not configured'}
          </div>
        </div>
        <div className="flex gap-1.5">
          {isConnected && (
            <>
              <button onClick={testConnection} disabled={testing} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition">
                {testing ? '...' : 'Test'}
              </button>
              <button onClick={disconnect} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition">
                Disconnect
              </button>
            </>
          )}
          <button onClick={() => setExpanded(e => !e)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition">
            {expanded ? 'Close' : isConnected ? 'Edit' : 'Connect'}
          </button>
        </div>
      </div>
      {testResult && (
        <div className={`px-4 py-2 text-xs font-semibold border-t ${testResult.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {testResult.ok ? `✓ ${testResult.detail || 'Connection successful'}` : `✗ ${testResult.detail || 'Connection failed'}`}
        </div>
      )}
      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-3">
            <Field label={cfg.urlLabel} value={apiUrl} onChange={setApiUrl} placeholder={cfg.urlPlaceholder} />
            <Field label={cfg.userLabel} value={username} onChange={setUsername} placeholder="admin@company.com" />
            <Field label={cfg.keyLabel} type="password" value={apiKey} onChange={setApiKey} placeholder="Leave blank to keep existing" />
            <Field label="Webhook URL (optional)" value={webhookUrl} onChange={setWebhookUrl} placeholder="https://" />
          </div>
          <Field label="Notes" value={notes} onChange={setNotes} placeholder={cfg.notesPlaceholder} />
          <div className="flex justify-end pt-1">
            <button onClick={save} disabled={saving}
              className="text-xs font-bold px-4 py-2 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Connection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VcisoSettings() {
  const { getToken, user } = useAuth();
  const [modules, setModules] = useState([]);
  const [saved, setSaved] = useState({});
  const [integrations, setIntegrations] = useState([]);

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraProject, setJiraProject] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');

  const [otxKey, setOtxKey] = useState('');

  const [notifCritical, setNotifCritical] = useState(true);
  const [notifHigh, setNotifHigh] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);

  const token = getToken();

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/vciso/integrations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setIntegrations(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetch('/api/vciso/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.client?.id) {
          fetch(`/api/settings?client_id=${d.client.id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
            .then(s => {
              setSmtpHost(s.smtp_host || '');
              setSmtpPort(s.smtp_port || '587');
              setSmtpUser(s.smtp_username || '');
              setSmtpFrom(s.smtp_from || '');
              setJiraUrl(s.jira_url || '');
              setJiraProject(s.jira_project_key || '');
              setJiraEmail(s.jira_email || '');
            }).catch(() => {});
        }
      }).catch(() => {});
  }, [token]);

  useEffect(() => {
    fetch('/api/auth/me/permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(perms => setModules(Array.isArray(perms) ? perms : []))
      .catch(() => {});
  }, [token]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const saveSection = async (key, pairs) => {
    try {
      for (const [k, v] of Object.entries(pairs)) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: k, value: v }),
        });
      }
      setSaved(s => ({ ...s, [key]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000);
    } catch {}
  };

  // Build module list
  const isAdmin = user?.role === 'admin';
  const auditModules = [];
  const securityModules = [];

  const addAudit = (slug) => {
    const meta = FRAMEWORK_CATALOG[slug];
    if (meta && !auditModules.find(a => a.slug === slug))
      auditModules.push({ slug, name: meta.shortName || meta.name, icon: meta.icon });
  };
  const addSecurity = (tool) => {
    if (!securityModules.find(s => s.slug === tool.slug)) securityModules.push(tool);
  };

  if (isAdmin || modules.length === 0) {
    ['iso-27001', 'soc-2-type-ii', 'nist-csf', 'pci-dss', 'hipaa'].forEach(addAudit);
    [
      { slug: 'vulnerability-management', name: 'Vuln Management', icon: '🐛' },
      { slug: 'grc', name: 'GRC & Risk', icon: '⚖️' },
      { slug: 'incident-response', name: 'Incident Response', icon: '🚨' },
      { slug: 'soc-siem', name: 'SOC / SIEM', icon: '📡' },
      { slug: 'cloud-security', name: 'Cloud Security', icon: '☁️' },
    ].forEach(addSecurity);
  } else {
    modules.forEach(perm => {
      const fw = PERMISSION_TO_FRAMEWORK[perm];
      if (fw) addAudit(fw);
      const tool = PERMISSION_TO_SECURITY_TOOL[perm];
      if (tool) addSecurity(tool);
    });
  }

  const getIntegration = (moduleSlug, toolName) =>
    integrations.find(i => i.module_slug === moduleSlug && i.tool_name === toolName);

  return (
    <div className="p-6 space-y-6 font-sans bg-slate-50 min-h-full text-slate-900">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs mt-0.5 text-slate-500">Configure integrations and preferences for your vCISO workspace</p>
      </div>

      {/* Assigned Modules */}
      <Section title="Assigned Modules" icon="📋">
        <p className="text-xs text-slate-500">
          Modules assigned by your administrator. Contact your admin to change assignments.
        </p>
        {modules.length === 0 ? (
          <div className="text-xs text-slate-400">No modules assigned yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {modules.map(m => (
              <span key={m} className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{m}</span>
            ))}
          </div>
        )}
      </Section>

      {/* INTEGRATIONS */}
      <Section title="Integrations" icon="🔌">
        <p className="text-xs text-slate-500">
          Connect your existing security tools to each module. Once connected, live data from these tools
          will populate the respective dashboard views automatically.
        </p>

        {auditModules.length > 0 && (
          <div className="space-y-4 mt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Audit Frameworks
            </div>
            {auditModules.map(mod => (
              <div key={mod.slug} className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-base">{mod.icon}</span>
                  <span className="text-xs font-bold text-slate-900">{mod.name}</span>
                  <span className="ml-auto text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {integrations.filter(i => i.module_slug === mod.slug && i.enabled === 1 && (i.api_url || i.username)).length} connected
                  </span>
                </div>
                <div className="p-4 space-y-2.5">
                  {AUDIT_FRAMEWORK_INTEGRATIONS.map(toolName => (
                    <IntegrationConfigCard key={toolName} moduleSlug={mod.slug} toolName={toolName}
                      existing={getIntegration(mod.slug, toolName)} token={token} onSaved={loadIntegrations} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {securityModules.length > 0 && (
          <div className="space-y-4 mt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Security Tools
            </div>
            {securityModules.map(mod => {
              const toolList = SECURITY_TOOL_INTEGRATIONS[mod.slug] || [];
              if (toolList.length === 0) return null;
              return (
                <div key={mod.slug} className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-base">{mod.icon}</span>
                    <span className="text-xs font-bold text-slate-900">{mod.name}</span>
                    <span className="ml-auto text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {integrations.filter(i => i.module_slug === mod.slug && i.enabled === 1 && (i.api_url || i.username)).length} connected
                    </span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {toolList.map(toolName => (
                      <IntegrationConfigCard key={toolName} moduleSlug={mod.slug} toolName={toolName}
                        existing={getIntegration(mod.slug, toolName)} token={token} onSaved={loadIntegrations} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Email / SMTP */}
      <Section title="Email Notifications (SMTP)" icon="📧">
        <div className="grid grid-cols-2 gap-3">
          <Field label="SMTP Host" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.example.com" />
          <Field label="SMTP Port" value={smtpPort} onChange={setSmtpPort} placeholder="587" />
          <Field label="Username" value={smtpUser} onChange={setSmtpUser} placeholder="alerts@company.com" />
          <Field label="Password" type="password" value={smtpPass} onChange={setSmtpPass} placeholder="••••••••" />
        </div>
        <Field label="From Address" value={smtpFrom} onChange={setSmtpFrom} placeholder="vciso-alerts@company.com" />
        <div className="flex justify-end pt-1">
          <SaveBtn onClick={() => saveSection('smtp', { smtp_host: smtpHost, smtp_port: smtpPort, smtp_username: smtpUser, smtp_from: smtpFrom })} saved={saved.smtp} />
        </div>
      </Section>

      {/* Notification Preferences */}
      <Section title="Notification Preferences" icon="🔔">
        <div className="space-y-3">
          {[
            { label: 'Alert on Critical vulnerabilities', val: notifCritical, set: setNotifCritical },
            { label: 'Alert on High vulnerabilities', val: notifHigh, set: setNotifHigh },
            { label: 'Weekly summary digest', val: notifWeekly, set: setNotifWeekly },
          ].map(({ label, val, set }) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => set(v => !v)} className={`w-10 h-5 rounded-full relative transition-all ${val ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
                  style={{ left: val ? 'calc(100% - 18px)' : '2px' }} />
              </div>
              <span className="text-xs font-medium text-slate-700">{label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end pt-1">
          <SaveBtn onClick={() => saveSection('notif', {})} saved={saved.notif} />
        </div>
      </Section>

      {/* Jira */}
      <Section title="Jira Integration" icon="🔗">
        <p className="text-xs text-slate-500">Create Jira tickets automatically when vulnerabilities or CARs are raised.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Jira URL" value={jiraUrl} onChange={setJiraUrl} placeholder="https://yourorg.atlassian.net" />
          </div>
          <Field label="Project Key" value={jiraProject} onChange={setJiraProject} placeholder="VCISO" />
          <Field label="Email" value={jiraEmail} onChange={setJiraEmail} placeholder="you@company.com" />
          <div className="col-span-2">
            <Field label="API Token" type="password" value={jiraToken} onChange={setJiraToken} placeholder="Jira API token from id.atlassian.com" />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <SaveBtn onClick={() => saveSection('jira', { jira_url: jiraUrl, jira_project_key: jiraProject, jira_email: jiraEmail })} saved={saved.jira} />
        </div>
      </Section>

      {/* Threat Intel APIs */}
      <Section title="Threat Intelligence APIs" icon="🌐">
        <p className="text-xs text-slate-500">API keys for the Threat Intelligence page.</p>
        <Field label="AlienVault OTX API Key" type="password" value={otxKey} onChange={setOtxKey} placeholder="Paste your OTX API key" />
        <div className="flex justify-end pt-1">
          <SaveBtn onClick={() => saveSection('otx', { otx_api_key: otxKey })} saved={saved.otx} />
        </div>
      </Section>

      {/* Profile */}
      <Section title="My Profile" icon="👤">
        <div className="grid grid-cols-2 gap-3">
          {[['Name', user?.name, 'text-slate-900'], ['Email', user?.email, 'text-slate-900'], ['Role', user?.role?.toUpperCase(), 'text-blue-600']].map(([label, val, color]) => (
            <div key={label} className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">{label}</div>
              <div className={`text-sm font-bold mt-1 ${color}`}>{val || '—'}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">To change your name or password, contact your administrator.</p>
      </Section>
    </div>
  );
}
