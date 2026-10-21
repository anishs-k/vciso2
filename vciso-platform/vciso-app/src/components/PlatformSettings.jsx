import React, { useState, useEffect } from 'react';
import { th } from '../theme';

const SMTP_FIELDS = [
  { key: 'smtp_host',     label: 'SMTP Host',     placeholder: 'smtp.gmail.com',   type: 'text' },
  { key: 'smtp_port',     label: 'SMTP Port',     placeholder: '587',               type: 'text' },
  { key: 'smtp_username', label: 'Username',      placeholder: 'you@gmail.com',     type: 'text' },
  { key: 'smtp_password', label: 'Password',      placeholder: '••••••••',          type: 'password' },
  { key: 'smtp_from',     label: 'From Address',  placeholder: 'vciso@company.com', type: 'email' },
];

const JIRA_FIELDS = [
  { key: 'jira_url',         label: 'Jira URL',      placeholder: 'https://company.atlassian.net', type: 'text' },
  { key: 'jira_project_key', label: 'Project Key',   placeholder: 'SEC',                           type: 'text' },
  { key: 'jira_email',       label: 'Jira Email',    placeholder: 'admin@company.com',             type: 'email' },
  { key: 'jira_api_token',   label: 'API Token',     placeholder: '••••••••••••••••',              type: 'password' },
];

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-6 w-11 items-center transition-colors flex-shrink-0"
      style={{ background: enabled ? '#7c3aed' : th('#e5e7eb', { dark: '#334155' }) }}
    >
      <span
        className="inline-block h-4 w-4 transform bg-white transition-transform"
        style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)', boxShadow: th('none', { classic: '0 1px 3px rgba(0,0,0,0.2)', dark: '0 1px 3px rgba(0,0,0,0.2)' }) }}
      />
    </button>
  );
}

function SettingsSection({ title, icon, enabledKey, fields, settings, onSave, saving }) {
  const enabled = settings[enabledKey] === 'true';
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localValues, setLocalValues] = useState({});

  useEffect(() => {
    setLocalEnabled(settings[enabledKey] === 'true');
    const vals = {};
    fields.forEach(f => { vals[f.key] = settings[f.key] || ''; });
    setLocalValues(vals);
  }, [settings]);

  const handleSave = () => {
    const toSave = { [enabledKey]: String(localEnabled), ...localValues };
    onSave(toSave);
  };

  return (
    <div className="admin-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div style={{ width:36, height:36, background:'#f3f0ff', border:`1px solid ${th('#ede9fe', { dark: '#2E1065' })}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>
            {icon}
          </div>
          <h3 className="text-gray-900 font-bold text-base">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-medium">{localEnabled ? 'Enabled' : 'Disabled'}</span>
          <Toggle enabled={localEnabled} onChange={setLocalEnabled} />
        </div>
      </div>

      {!localEnabled && (
        <div className="p-4 text-gray-400 text-sm text-center" style={{ background: th('#fafafa', { dark: '#0F172A' }), border: `1px dashed ${th('#e5e7eb', { dark: '#334155' })}` }}>
          Enable this integration to configure settings
        </div>
      )}

      {localEnabled && (
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
              <input
                type={f.type}
                value={localValues[f.key] || ''}
                onChange={e => setLocalValues(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm text-gray-900"
                style={{ background: th('#fafafa', { dark: '#0F172A' }), border: `1px solid ${th('#e5e7eb', { dark: '#334155' })}`, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = th('#e5e7eb', { dark: '#334155' })}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
        style={{ background: '#8b5cf6' }}
        onMouseEnter={e => e.target.style.background = '#7c3aed'}
        onMouseLeave={e => e.target.style.background = '#8b5cf6'}
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}

export default function PlatformSettings({ activeClient }) {
  const [settings, setSettings] = useState({
    smtp_enabled: 'false', smtp_host: '', smtp_port: '587', smtp_username: '', smtp_password: '', smtp_from: '',
    jira_enabled: 'false', jira_url: '', jira_project_key: '', jira_email: '', jira_api_token: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const clientId = activeClient?.id || null;

  useEffect(() => {
    fetch(`/api/settings?client_id=${clientId || ''}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(d => setSettings(s => ({ ...s, ...d })))
      .catch(() => {});
  }, [clientId]);

  const saveSettings = async (values) => {
    const token = localStorage.getItem('vciso_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/settings/batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ client_id: clientId, settings: values }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      await saveSettings(values);
      setSettings(s => ({ ...s, ...values }));
      setToast('Settings saved!');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Error saving settings');
      setTimeout(() => setToast(''), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="p-6">
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2.5 text-sm font-bold text-white shadow-lg"
          style={{ background: toast.includes('Error') ? '#dc2626' : '#16a34a' }}
        >
          {toast.includes('Error') ? '✕' : '✓'} {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {activeClient ? `Configuring for: ${activeClient.name}` : 'Global settings (all clients)'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsSection
          title="Email / SMTP"
          icon="✉️"
          enabledKey="smtp_enabled"
          fields={SMTP_FIELDS}
          settings={settings}
          onSave={handleSave}
          saving={saving}
        />
        <SettingsSection
          title="Jira Integration"
          icon="🎯"
          enabledKey="jira_enabled"
          fields={JIRA_FIELDS}
          settings={settings}
          onSave={handleSave}
          saving={saving}
        />
      </div>

      <div className="mt-6 p-4 text-sm" style={{ background: th('#fefce8', { dark: '#3A2A0A' }), border: `1px solid ${th('#fde68a', { dark: '#78350F' })}` }}>
        <span className="text-amber-600 font-bold">Note:</span>
        <span className="text-amber-700 ml-1">Email and Jira buttons on the Vulnerabilities page are only visible to vCISO users when the respective integration is enabled here and credentials are saved.</span>
      </div>
    </div>
  );
}
