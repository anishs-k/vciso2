import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { th } from '../../theme';

const MOCK_ADMINS = [
  { name: 'Vikram Sharma', email: 'vikram.9554@gmail.com', role: 'Super Admin', addedOn: '2025-01-01', status: 'active' },
  { name: 'Ajay Kumar', email: 'ajay@vciso.io', role: 'Admin', addedOn: '2025-02-15', status: 'active' },
  { name: 'Mahesh Patel', email: 'mahesh@vciso.io', role: 'Admin', addedOn: '2025-03-01', status: 'active' },
];

const MOCK_AUDIT = [
  { action: 'Logged in to Admin Portal', user: 'Vikram Sharma', timestamp: '2026-06-12T10:30:00Z', ip: '192.168.1.1' },
  { action: 'Generated Executive Summary Report', user: 'Vikram Sharma', timestamp: '2026-06-12T09:15:00Z', ip: '192.168.1.1' },
  { action: 'Updated alert: Contract Expiry resolved', user: 'Ajay Kumar', timestamp: '2026-06-11T16:00:00Z', ip: '10.0.0.5' },
  { action: 'Added new admin user: Mahesh Patel', user: 'Vikram Sharma', timestamp: '2026-06-10T14:00:00Z', ip: '192.168.1.1' },
  { action: 'Exported Cost Report (PDF)', user: 'Mahesh Patel', timestamp: '2026-06-10T11:30:00Z', ip: '10.0.0.8' },
  { action: 'Updated system notification settings', user: 'Vikram Sharma', timestamp: '2026-06-09T15:00:00Z', ip: '192.168.1.1' },
];

const MOCK_ACTIVITY = [
  { event: 'New client onboarded: HealthFirst Medical', type: 'onboarding', timestamp: '2026-06-10T09:00:00Z' },
  { event: 'Integration failure: Okta SSO disconnected', type: 'error', timestamp: '2026-06-11T10:00:00Z' },
  { event: 'SOC 2 audit tasks updated (72% complete)', type: 'framework', timestamp: '2026-06-11T14:00:00Z' },
  { event: 'Scheduled report sent: Weekly Executive Summary', type: 'report', timestamp: '2026-06-09T07:00:00Z' },
  { event: 'User login from new IP: Priya Singh', type: 'security', timestamp: '2026-06-08T19:30:00Z' },
  { event: 'Policy uploaded: Incident Response Policy', type: 'policy', timestamp: '2026-06-08T11:00:00Z' },
];

function fmtDate(s) { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtDt(s) { return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function Toggle({ on, onChange, label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
      <span style={{ fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 500 }}>{label}</span>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: '38px',
          height: '22px',
          borderRadius: th('2px', { classic: '11px', dark: '11px' }),
          padding: '2px',
          background: on ? th('#1A202C', { classic: '#0F172A', dark: '#1E293B' }) : th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' }),
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: on ? 'flex-end' : 'flex-start'
        }}
      >
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: th('#FFFFFF', { dark: '#1E293B' }), boxShadow: th('none', { classic: '0 1px 2px rgba(0,0,0,0.2)', dark: '0 1px 2px rgba(0,0,0,0.2)' }) }} />
      </button>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: th('2px', { classic: '3px', dark: '3px' }),
        fontSize: '12.5px',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        border: active ? `1px solid ${th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })}` : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
        background: active ? th('#1A202C', { classic: '#0F172A', dark: '#1E293B' }) : th('#FFFFFF', { dark: '#1E293B' }),
        color: active ? '#FFFFFF' : th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }),
        transition: 'all 0.15s ease'
      }}
    >
      {label}
    </button>
  );
}

export default function AdminSettings() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState('admins');
  const [admins, setAdmins] = useState(MOCK_ADMINS);
  const [loading, setLoading] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'Admin' });
  const [saved, setSaved] = useState(false);

  const [costConfig, setCostConfig]       = useState([]);
  const [costLoading, setCostLoading]     = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [editValue, setEditValue]         = useState('');
  const [costSaving, setCostSaving]       = useState(false);
  const [costFilter, setCostFilter]       = useState('all');
  const [costSavedId, setCostSavedId]     = useState(null);

  const [notifs, setNotifs] = useState({
    emailAlerts: true, slackAlerts: false, weeklyDigest: true,
    contractExpiry: true, criticalRisks: true, mfaAlerts: true,
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: 'smtp.sendgrid.net', smtpPort: '587',
    fromEmail: 'noreply@vciso.io', fromName: 'vCISO Admin',
  });

  useEffect(() => {
    fetch('/api/admin-portal/admins', { headers: { 'Authorization': `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setAdmins)
      .catch(() => setAdmins(MOCK_ADMINS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'costs') return;
    setCostLoading(true);
    fetch('/api/admin-portal/cost-config', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setCostConfig)
      .catch(() => {})
      .finally(() => setCostLoading(false));
  }, [tab]);

  function startEdit(row) {
    setEditingId(row.id);
    setEditValue(String(row.monthly_cost));
  }

  async function saveEdit(row) {
    setCostSaving(true);
    try {
      await fetch(`/api/admin-portal/cost-config/${row.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_cost: Number(editValue), description: row.description || '' }),
      });
      setCostConfig(prev => prev.map(r => r.id === row.id ? { ...r, monthly_cost: Number(editValue) } : r));
      setCostSavedId(row.id);
      setTimeout(() => setCostSavedId(null), 2000);
    } catch {}
    setEditingId(null);
    setCostSaving(false);
  }

  const addAdmin = () => {
    if (!newAdmin.name || !newAdmin.email) return;
    setAdmins(prev => [...prev, { ...newAdmin, addedOn: new Date().toISOString().split('T')[0], status: 'active' }]);
    setNewAdmin({ name: '', email: '', role: 'Admin' });
    setShowAddAdmin(false);
  };

  const removeAdmin = (email) => {
    setAdmins(prev => prev.filter(a => a.email !== email));
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="reg-doc-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="reg-title" style={{ fontSize: '22px', margin: 0 }}>Platform Administration &amp; Settings</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            System configuration, admin user authority, unit cost schedules, and security audit logs.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'admins',   label: '👤 Admin Operators' },
          { id: 'costs',    label: '💰 Cost Schedules' },
          { id: 'system',   label: '⚙️ System Config' },
          { id: 'audit',    label: '📋 Audit Trail' },
          { id: 'activity', label: '📡 Activity Stream' },
        ].map(t => <Tab key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </div>

      {tab === 'admins' && (
        <div className="reg-doc" style={{ margin: 0 }}>
          <div className="reg-doc-head" style={{ padding: '20px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
                Authorized Administrators ({admins.length})
              </h2>
              <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
                Manage team members with privileged access to the platform owner portal
              </div>
            </div>
            <button
              onClick={() => setShowAddAdmin(true)}
              className="reg-btn-primary"
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              + Add Admin User
            </button>
          </div>

          {showAddAdmin && (
            <div style={{ margin: '0 24px 20px', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }), border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), padding: '16px 20px' }}>
              <div style={{ fontFamily: 'Source Serif 4, serif', fontWeight: 600, fontSize: '14px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '12px' }}>
                Provision New Administrator
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="reg-label" style={{ display: 'block', marginBottom: '4px' }}>Full Name</label>
                  <input
                    value={newAdmin.name}
                    onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Vikram Sharma"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="reg-label" style={{ display: 'block', marginBottom: '4px' }}>Email Address</label>
                  <input
                    value={newAdmin.email}
                    onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
                    placeholder="admin@company.com"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="reg-label" style={{ display: 'block', marginBottom: '4px' }}>Role</label>
                  <select
                    value={newAdmin.role}
                    onChange={e => setNewAdmin(p => ({ ...p, role: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), outline: 'none', background: th('#FFFFFF', { dark: '#1E293B' }) }}
                  >
                    <option>Admin</option>
                    <option>Super Admin</option>
                    <option>Auditor</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addAdmin} className="reg-btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>Save Admin</button>
                <button onClick={() => setShowAddAdmin(false)} className="reg-btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="reg-body" style={{ padding: '0 24px 20px' }}>
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Added On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}` }}>
                          {a.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13px' }}>{a.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>{a.email}</td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '10.5px', fontWeight: 700, background: a.role === 'Super Admin' ? th('#1A202C', { classic: '#0F172A', dark: '#1E293B' }) : th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: a.role === 'Super Admin' ? '#FFFFFF' : th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                        {a.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{fmtDate(a.addedOn)}</td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '10.5px', fontWeight: 700, background: th('#ECFDF5', { dark: '#0B2E24' }), color: th('#065F46', { dark: '#34D399' }), border: `1px solid ${th('#A7F3D0', { dark: '#065F46' })}` }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {a.role !== 'Super Admin' && (
                        <button onClick={() => removeAdmin(a.email)} className="reg-btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'costs' && (
        <div className="reg-doc" style={{ margin: 0 }}>
          <div className="reg-doc-head" style={{ padding: '20px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
                Service Unit Cost Schedules
              </h2>
              <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
                Define default monthly pricing for modules, compliance frameworks, and connectors
              </div>
            </div>
            <select
              value={costFilter}
              onChange={e => setCostFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px', border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), background: th('#FFFFFF', { dark: '#1E293B' }), outline: 'none' }}
            >
              <option value="all">All Service Categories</option>
              <option value="dashboard">Platform Dashboard</option>
              <option value="framework">Compliance Frameworks</option>
              <option value="integration">Connectors &amp; APIs</option>
              <option value="security_tool">Security Feeds</option>
              <option value="audit">Audits &amp; Assurance</option>
            </select>
          </div>

          <div className="reg-body" style={{ padding: '0 24px 20px' }}>
            {costLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Loading cost schedule...</div>
            ) : (
              <table className="reg-table">
                <thead>
                  <tr>
                    <th>Module / Service</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Monthly Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(costFilter === 'all' ? costConfig : costConfig.filter(r => r.category === costFilter)).map((row) => {
                    const isEditing = editingId === row.id;
                    const isSaved   = costSavedId === row.id;
                    return (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13px' }}>{row.name}</div>
                          {row.description && <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{row.description}</div>}
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), textTransform: 'capitalize' }}>
                            {row.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <input
                                type="number"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(row); if (e.key === 'Escape') setEditingId(null); }}
                                autoFocus
                                style={{ width: '90px', padding: '4px 8px', fontSize: '12px', border: `1px solid ${th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), outline: 'none', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}
                              />
                              <button onClick={() => saveEdit(row)} disabled={costSaving} className="reg-btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }}>✓</button>
                              <button onClick={() => setEditingId(null)} className="reg-btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: isSaved ? th('#065F46', { dark: '#34D399' }) : th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                                {isSaved ? '✓ ' : ''}${Number(row.monthly_cost).toLocaleString('en-US')}
                              </span>
                              <button onClick={() => startEdit(row)} className="reg-btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="reg-doc" style={{ margin: 0, padding: '24px' }}>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: '0 0 16px' }}>
              🔔 Notification Preferences
            </h2>
            {[
              { key: 'emailAlerts', label: 'Email Security Alerts' },
              { key: 'slackAlerts', label: 'Slack Webhook Dispatches' },
              { key: 'weeklyDigest', label: 'Weekly Executive Digest' },
              { key: 'contractExpiry', label: 'Contract Expiry Warnings' },
              { key: 'criticalRisks', label: 'Critical Gap & Penalty Alerts' },
              { key: 'mfaAlerts', label: 'Tenant MFA Status Changes' },
            ].map(n => (
              <Toggle key={n.key} label={n.label} on={notifs[n.key]} onChange={v => setNotifs(p => ({ ...p, [n.key]: v }))} />
            ))}
          </div>

          <div className="reg-doc" style={{ margin: 0, padding: '24px' }}>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: '0 0 16px' }}>
              📧 SMTP &amp; Dispatch Configuration
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'smtpHost', label: 'SMTP Relay Host' },
                { key: 'smtpPort', label: 'SMTP Port' },
                { key: 'fromEmail', label: 'Sender From Address' },
                { key: 'fromName', label: 'Sender Display Name' },
              ].map(f => (
                <div key={f.key}>
                  <label className="reg-label" style={{ display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input
                    value={emailConfig[f.key]}
                    onChange={e => setEmailConfig(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: th('2px', { classic: '3px', dark: '3px' }), outline: 'none' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={handleSave} className="reg-btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                  Save Configuration
                </button>
                <button className="reg-btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                  Send Test Email
                </button>
              </div>
              {saved && <div style={{ color: th('#065F46', { dark: '#34D399' }), fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>✅ Configuration saved successfully!</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="reg-doc" style={{ margin: 0 }}>
          <div className="reg-doc-head" style={{ padding: '20px 24px 14px' }}>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: 0 }}>
              Administrative Audit Trail
            </h2>
            <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
              Immutable records of privileged admin actions and configuration changes
            </div>
          </div>
          <div className="reg-body" style={{ padding: '0 24px 20px' }}>
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Event Action</th>
                  <th>Admin Operator</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Source IP</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_AUDIT.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13px' }}>{l.action}</td>
                    <td style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>{l.user}</td>
                    <td style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{fmtDt(l.timestamp)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="reg-doc" style={{ margin: 0, padding: '24px' }}>
          <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: '0 0 16px' }}>
            📡 Real-Time System Activity Stream
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MOCK_ACTIVITY.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                  border: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`,
                  borderRadius: th('2px', { classic: '3px', dark: '3px' })
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13px' }}>{a.event}</div>
                  <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>{fmtDt(a.timestamp)}</div>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), textTransform: 'uppercase' }}>
                  {a.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
