import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { th } from '../theme';

// ─── Partner Tab ──────────────────────────────────────────────────────────────
function PartnerTab({ authHeader }) {
  const [partners, setPartners]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showAdd, setShowAdd]             = useState(false);
  const [editPartner, setEditPartner]     = useState(null);
  const [assignPartner, setAssignPartner] = useState(null);
  const [toast, setToast]                 = useState('');
  const [clients, setClients]             = useState([]);

  useEffect(() => {
    fetchPartners();
    fetch('/api/clients', { headers: authHeader })
      .then(r => r.ok ? r.json() : [])
      .then(d => setClients(Array.isArray(d) ? d : []));
  }, []);

  async function fetchPartners() {
    setLoading(true);
    const res = await fetch('/api/auth/admin/partners', { headers: authHeader });
    const data = res.ok ? await res.json() : [];
    setPartners(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function savePartner(form, isEdit) {
    const url    = isEdit ? `/api/auth/admin/partners/${editPartner.id}` : '/api/auth/admin/partners';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); showToast('Error: ' + (d.error || 'Failed')); return; }
    showToast(isEdit ? 'Partner updated' : 'Partner created');
    setShowAdd(false); setEditPartner(null); fetchPartners();
  }

  async function toggleStatus(p) {
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    await fetch(`/api/auth/admin/partners/${p.id}`, { method: 'PATCH', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    fetchPartners();
  }

  async function sendInviteToPartner(p) {
    const res = await fetch(`/api/auth/admin/partners/${p.id}/send-invite`, { method: 'POST', headers: authHeader });
    const d = await res.json();
    showToast(res.ok ? 'Invite sent to partner' : ('Error: ' + (d.error || 'Failed')));
    fetchPartners();
  }

  const PartnerFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState(initial || { name: '', email: '', organization_name: '', contact_number: '' });
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">{initial ? 'Edit Partner' : 'Add Partner'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="space-y-3">
            {[['name','Partner Name *','text'],['email','Email *','email'],['organization_name','Organization Name','text'],['contact_number','Contact Number','text']].map(([k,label,type]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input type={type} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                  disabled={initial && k==='email'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSave(form, !!initial)} className="flex-1 py-2 bg-purple-100 text-purple-800 font-semibold rounded-lg text-sm hover:bg-purple-200">Save</button>
          </div>
        </div>
      </div>
    );
  };

  const AssignCompaniesModal = ({ partner, onClose }) => {
    const [assigned, setAssigned] = useState([]);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
      fetch(`/api/auth/admin/partners/${partner.id}/companies`, { headers: authHeader })
        .then(r => r.ok ? r.json() : [])
        .then(d => setAssigned((d||[]).map(c => c.id)));
    }, []);
    async function toggle(clientId) {
      setSaving(true);
      if (assigned.includes(clientId)) {
        await fetch(`/api/auth/admin/partners/${partner.id}/companies/${clientId}`, { method: 'DELETE', headers: authHeader });
        setAssigned(a => a.filter(x => x !== clientId));
      } else {
        await fetch(`/api/auth/admin/partners/${partner.id}/companies`, { method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: clientId }) });
        setAssigned(a => [...a, clientId]);
      }
      setSaving(false);
    }
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Assign Companies — {partner.name}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <p className="text-sm text-gray-400 mb-4">Select companies this partner referred / manages.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {clients.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-purple-50 cursor-pointer">
                <input type="checkbox" checked={assigned.includes(c.id)} onChange={() => toggle(c.id)} disabled={saving} className="accent-purple-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.industry}</div>
                </div>
              </label>
            ))}
            {!clients.length && <p className="text-sm text-gray-400 text-center py-4">No companies available.</p>}
          </div>
          <button onClick={onClose} className="mt-4 w-full py-2 bg-purple-100 text-purple-800 font-semibold rounded-lg text-sm hover:bg-purple-200">Done</button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>}
      {showAdd && <PartnerFormModal onSave={savePartner} onClose={() => setShowAdd(false)} />}
      {editPartner && <PartnerFormModal initial={editPartner} onSave={savePartner} onClose={() => setEditPartner(null)} />}
      {assignPartner && <AssignCompaniesModal partner={assignPartner} onClose={() => { setAssignPartner(null); fetchPartners(); }} />}

      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Partners</h2>
          <span className="text-sm text-gray-400">{partners.length} partner{partners.length !== 1 ? 's' : ''}</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg hover:bg-purple-200 transition">+ Add Partner</button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Partner', 'Organization', 'Contact', 'Status', 'Companies', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-purple-50/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                        {p.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.organization_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.contact_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {p.status === 'active' ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-gray-700">{p.company_count || 0} companies</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setEditPartner(p)} className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded hover:bg-gray-200">✏ Edit</button>
                      <button onClick={() => setAssignPartner(p)} className="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded hover:bg-purple-200">🏢 Companies</button>
                      <button onClick={() => sendInviteToPartner(p)} className="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded hover:bg-purple-200">📩 Invite</button>
                      <button onClick={() => toggleStatus(p)} className={`px-2.5 py-1 text-xs font-semibold rounded ${p.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                        {p.status === 'active' ? '⊘ Disable' : '✓ Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!partners.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No partners yet. Click "+ Add Partner" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const MODULE_META = {
  // Audit & Compliance
  'SOC 2 (Type I & II)':            { icon: '🏢', desc: 'Service organization controls audit' },
  'ISO 27001':                       { icon: '🌍', desc: 'International ISMS standard' },
  'ISO 27017 / ISO 27018':           { icon: '☁️', desc: 'Cloud security and privacy standards' },
  'NIST CSF':                        { icon: '🇺🇸', desc: 'NIST Cybersecurity Framework' },
  'NIST 800-53':                     { icon: '📚', desc: 'NIST security and privacy controls' },
  'NIST 800-171 / CMMC':             { icon: '🎖️', desc: 'CUI protection and CMMC assessment' },
  'PCI DSS':                         { icon: '💳', desc: 'Payment card security standard' },
  'HIPAA':                           { icon: '🏥', desc: 'Health data privacy and security' },
  'GDPR Compliance':                 { icon: '🇪🇺', desc: 'EU data protection regulation' },
  'CCPA Compliance':                 { icon: '🏛️', desc: 'California privacy act compliance' },
  'FedRAMP':                         { icon: '🏛️', desc: 'Federal cloud security program' },
  'CIS Controls':                    { icon: '🛡️', desc: 'CIS top security controls' },
  'COBIT 2019':                      { icon: '📊', desc: 'IT governance framework' },
  'SOX Compliance':                  { icon: '📈', desc: 'Sarbanes-Oxley financial controls' },
  'HITRUST CSF':                     { icon: '⚕️', desc: 'Healthcare trust framework' },
  'DORA Compliance':                 { icon: '🇪🇺', desc: 'EU digital resilience act' },
  'NIS2 Directive':                  { icon: '🌐', desc: 'EU network security directive' },
  'India IT Act & CERT-In':          { icon: '🇮🇳', desc: 'India IT Act and CERT-In rules' },
  'SEBI Cybersecurity Framework':    { icon: '📉', desc: 'SEBI security guidelines' },
  'RBI Cybersecurity Guidelines':    { icon: '🏦', desc: 'RBI cybersecurity framework' },
  // Security Frameworks
  'Vulnerability Management':        { icon: '🔍', desc: 'Scan and remediate vulnerabilities' },
  'Risk Management':                 { icon: '⚠️', desc: 'Identify and manage security risks' },
  'Incident Response':               { icon: '🚨', desc: 'Respond to security incidents' },
  'Identity & Access Management':    { icon: '🔑', desc: 'Identity and access governance' },
  'Data Protection & Privacy':       { icon: '🔒', desc: 'Data classification and privacy' },
  'Security Awareness & Training':   { icon: '🎓', desc: 'Employee security education' },
  'Threat Intelligence':             { icon: '🕵️', desc: 'Monitor emerging threats' },
  'Security Operations (SOC)':       { icon: '🖥️', desc: 'SOC monitoring and operations' },
  'Cloud Security & CSPM':           { icon: '☁️', desc: 'Cloud posture management' },
  'Application Security':            { icon: '🖧', desc: 'Secure software development' },
  'Endpoint Protection':             { icon: '💻', desc: 'Endpoint threat protection' },
  'Email Security':                  { icon: '📧', desc: 'Email threat filtering' },
  'Network Security':                { icon: '🌐', desc: 'Network monitoring and protection' },
  'Third-Party & Vendor Risk':       { icon: '🤝', desc: 'Vendor risk assessments' },
  'Business Continuity & DR':        { icon: '🔄', desc: 'Business resilience planning' },
  'Physical Security':               { icon: '🏢', desc: 'Physical access controls' },
  'Supply Chain Security':           { icon: '📦', desc: 'Supply chain risk management' },
  'Penetration Testing':             { icon: '🔓', desc: 'Authorized security testing' },
  // Security Tools
  'Asset Inventory & CMDB':          { icon: '🗄️', desc: 'Track all IT assets' },
  'SIEM & Log Management':           { icon: '📡', desc: 'Security log analytics' },
  'DLP (Data Loss Prevention)':      { icon: '🚫', desc: 'Prevent data exfiltration' },
  'PAM (Privileged Access Management)': { icon: '👑', desc: 'Privileged account security' },
  'MDM & Endpoint Management':       { icon: '📱', desc: 'Mobile and endpoint management' },
  'Patch Management':                { icon: '🔧', desc: 'Security patch deployment' },
  'Security Policy Management':      { icon: '📜', desc: 'Policy creation and enforcement' },
  'Forensics & Investigation':       { icon: '🔬', desc: 'Digital forensics capabilities' },
  'Security Reporting & Dashboards': { icon: '📊', desc: 'Security metrics and KPIs' },
  'DevSecOps & Secure SDLC':         { icon: '⚙️', desc: 'Security in dev pipelines' },
  'Backup & Recovery':               { icon: '💾', desc: 'Data backup and restoration' },
  'Zero Trust Architecture':         { icon: '🔐', desc: 'Zero trust security model' },
  'Container & Kubernetes Security': { icon: '🐳', desc: 'Container workload security' },
  'OT / IoT Security':               { icon: '🏭', desc: 'OT and IoT device security' },
};
const ALL_MODULES = Object.keys(MODULE_META);

const SUBROLE_PANELS = [
  {
    id: 'auditor',
    icon: '🔎',
    label: 'Auditor',
    color: 'orange',
    headerCls: 'border-orange-700/60 bg-orange-900/10',
    activeCls: 'border-orange-500 bg-orange-900/30',
    modules: [
      'SOC 2 (Type I & II)',
      'ISO 27001',
      'ISO 27017 / ISO 27018',
      'NIST CSF',
      'PCI DSS',
      'HIPAA',
      'GDPR Compliance',
      'HITRUST CSF',
      'DORA Compliance',
      'NIS2 Directive',
      'India IT Act & CERT-In',
      'SEBI Cybersecurity Framework',
      'RBI Cybersecurity Guidelines',
      'Risk Management',
      'Security Policy Management',
    ],
  },
  {
    id: 'framework',
    icon: '📋',
    label: 'Framework Specialist',
    color: 'cyan',
    headerCls: 'border-cyan-700/60 bg-cyan-900/10',
    activeCls: 'border-cyan-500 bg-cyan-900/30',
    modules: [
      'NIST CSF',
      'NIST 800-53',
      'NIST 800-171 / CMMC',
      'CIS Controls',
      'COBIT 2019',
      'SOX Compliance',
      'FedRAMP',
      'Risk Management',
      'Security Policy Management',
      'Business Continuity & DR',
      'Backup & Recovery',
      'Incident Response',
      'Data Protection & Privacy',
    ],
  },
  {
    id: 'cybersecurity',
    icon: '🛡️',
    label: 'Cyber Security',
    color: 'blue',
    headerCls: 'border-blue-700/60 bg-blue-900/10',
    activeCls: 'border-violet-500 bg-blue-900/30',
    modules: [
      'Vulnerability Management',
      'Threat Intelligence',
      'Security Operations (SOC)',
      'Incident Response',
      'Penetration Testing',
      'Endpoint Protection',
      'Email Security',
      'Cloud Security & CSPM',
      'Asset Inventory & CMDB',
      'Identity & Access Management',
      'Data Protection & Privacy',
      'Network Security',
      'SIEM & Log Management',
      'Zero Trust Architecture',
    ],
  },
];

// Roles that use the multi-panel sub-role selector
const PANEL_ROLES = new Set(['client', 'external_client']);

const DEPARTMENTS = [
  'C-Suite / Executive',
  'IT Department',
  'Security Team',
  'Compliance & Legal',
  'Finance',
  'Operations',
  'Risk Management',
  'Human Resources',
  'Other',
];

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}-${part()}`;
}

const ROLE_STYLE = {
  admin:           'bg-red-100 text-red-700 border border-red-200',
  vciso:           'bg-purple-100 text-purple-700 border border-purple-200',
  client:          'bg-green-100 text-green-700 border border-green-200',
  external_client: 'bg-amber-100 text-amber-700 border border-amber-200',
};

const STATUS_STYLE_LIGHT = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending:  'bg-yellow-100 text-yellow-700',
};

const INVITE_STATUS_STYLE = {
  not_sent: 'bg-gray-100 text-gray-500 border border-gray-200',
  sent:     'bg-purple-100 text-purple-700 border border-purple-200',
  accepted: 'bg-green-100 text-green-700 border border-green-200',
  expired:  'bg-orange-100 text-orange-700 border border-orange-200',
  failed:   'bg-red-100 text-red-600 border border-red-200',
};
const INVITE_STATUS_LABEL = {
  not_sent: '— Not Sent',
  sent:     '📨 Sent',
  accepted: '✓ Accepted',
  expired:  '⏰ Expired',
  failed:   '✗ Failed',
};
const EMP_TYPE_STYLE = {
  internal: 'bg-purple-100 text-purple-700 border border-purple-200',
  external: 'bg-amber-100 text-amber-700 border border-amber-200',
};

const ROLE_CARDS = [
  { id: 'vciso',           icon: '👨‍💼', label: 'vCISO / Analyst',   desc: 'Security consultant managing all modules' },
  { id: 'client',          icon: '🏢',  label: 'Client User',         desc: 'Internal client employee accessing their company portal' },
  { id: 'external_client', icon: '🤝',  label: 'External Client',     desc: 'External auditor, framework specialist, or security partner' },
];
const STATUS_STYLE = {
  active:   'bg-green-900/40 text-green-400',
  inactive: 'bg-gray-700 text-gray-400',
  pending:  'bg-yellow-900/40 text-yellow-400',
};

// Multi-panel selector: all 3 panels visible simultaneously, selections accumulate
function MultiPanelSelector({ selected, onToggle, clientModules, userName }) {
  const totalSelected = selected.length;

  return (
    <div className="space-y-4">
      {SUBROLE_PANELS.map(panel => {
        const panelMods = panel.modules.filter(m => clientModules.includes(m));
        const panelSelected = panelMods.filter(m => selected.includes(m));
        if (panelMods.length === 0) return null;
        return (
          <div key={panel.id} className={`rounded border p-4 ${panel.headerCls}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{panel.icon}</span>
                <div>
                  <span className="text-gray-900 font-semibold text-sm">{panel.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{panelSelected.length}/{panelMods.length} selected</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => panelMods.forEach(m => { if (!selected.includes(m)) onToggle(m); })}
                  className="text-xs px-2.5 py-1 bg-violet-200/60 text-violet-700 hover:bg-violet-100 transition">Select All</button>
                <button type="button" onClick={() => panelMods.forEach(m => { if (selected.includes(m)) onToggle(m); })}
                  className="text-xs px-2.5 py-1 bg-gray-200 text-gray-400 hover:bg-gray-200 transition">Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {panelMods.map(mod => {
                const meta = MODULE_META[mod] || { icon: '📦', desc: '' };
                const checked = selected.includes(mod);
                return (
                  <button key={mod} type="button" onClick={() => onToggle(mod)}
                    className={`text-left p-3 border-2 transition ${checked ? panel.activeCls : `border-gray-200 bg-gray-50 hover:${th('border-[#4b5563]', { dark: 'border-[#CBD5E1]' })}`}`}
                  >
                    <div className="text-xl mb-1">{meta.icon}</div>
                    <div className="text-xs font-semibold text-gray-900 leading-tight">{mod}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{meta.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Running summary */}
      {totalSelected > 0 && (
        <div className="rounded border border-green-700/40 bg-green-900/10 px-4 py-3">
          <div className="text-xs font-semibold text-green-400 mb-1.5">
            ✓ {totalSelected} module{totalSelected !== 1 ? 's' : ''} selected{userName ? ` for ${userName}` : ''}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map(m => (
              <button key={m} type="button" onClick={() => onToggle(m)}
                className="text-[10px] bg-green-900/30 text-green-300 border border-green-700/50 px-2 py-0.5 hover:bg-red-900/30 hover:text-red-300 hover:border-red-700/50 transition"
                title="Click to remove"
              >
                {m} ×
              </button>
            ))}
          </div>
        </div>
      )}

      {totalSelected === 0 && (
        <div className="text-center text-gray-500 text-xs py-2">Nothing selected yet — pick modules from the panels above</div>
      )}
    </div>
  );
}

function ModuleGrid({ selected, onToggle }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ALL_MODULES.map(mod => {
        const meta = MODULE_META[mod];
        const checked = selected.includes(mod);
        return (
          <button
            key={mod}
            type="button"
            onClick={() => onToggle(mod)}
            className={`text-left p-3 border-2 transition ${
              checked
                ? 'border-violet-500 bg-blue-900/30'
                : `border-gray-200 bg-gray-50 hover:${th('border-[#4b5563]', { dark: 'border-[#CBD5E1]' })}`
            }`}
          >
            <div className="text-xl mb-1">{meta.icon}</div>
            <div className="text-xs font-semibold text-gray-900 leading-tight">{mod}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{meta.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── Permissions Modal ────────────────────────────────────────────────────────
function PermissionsModal({ user, authHeader, clientModules, onClose, onSaved }) {
  const [perms, setPerms] = useState([]);
  const [saving, setSaving] = useState(false);

  // Only show modules that were selected during onboarding for this client
  const availableModules = clientModules.length > 0 ? clientModules : ALL_MODULES;

  useEffect(() => {
    fetch(`/api/auth/admin/users/${user.id}/permissions`, { headers: authHeader })
      .then(r => r.ok ? r.json() : [])
      .then(p => {
        const existing = Array.isArray(p) ? p : [];
        if (existing.length === 0 && user.role === 'vciso') {
          setPerms([...availableModules]);
        } else {
          setPerms(existing.filter(m => availableModules.includes(m)));
        }
      })
      .catch(() => {});
  }, [user.id, authHeader, availableModules]);

  const toggle = (mod) => setPerms(prev =>
    prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
  );

  const save = async () => {
    setSaving(true);
    await fetch(`/api/auth/admin/users/${user.id}/permissions`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: perms }),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white border border-gray-200 p-6 w-[760px] max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-gray-900 font-bold text-lg">Module Permissions</h3>
            <p className="text-gray-400 text-sm">{user.name} · {user.email}</p>
            <p className="text-xs text-violet-500 mt-0.5">Showing {availableModules.length} modules from client onboarding agreement</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">×</button>
        </div>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setPerms([...availableModules])}
            className="text-xs px-3 py-1.5 bg-violet-200 text-violet-700 hover:bg-violet-100 transition"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => setPerms([])}
            className="text-xs px-3 py-1.5 bg-gray-200 text-gray-300 hover:bg-gray-200 transition"
          >
            Deselect All
          </button>
          <span className="text-xs text-gray-400 self-center">{perms.length} / {availableModules.length} selected</span>
        </div>
        {/* Only show client's onboarding modules, not all 52 */}
        <div className="grid grid-cols-3 gap-2">
          {availableModules.map(mod => {
            const meta = MODULE_META[mod] || { icon: '📦', desc: '' };
            const checked = perms.includes(mod);
            return (
              <button key={mod} type="button" onClick={() => toggle(mod)}
                className={`text-left p-3 border-2 transition ${checked ? 'border-violet-500 bg-blue-900/30' : `border-gray-200 bg-gray-50 hover:${th('border-[#4b5563]', { dark: 'border-[#CBD5E1]' })}`}`}
              >
                <div className="text-xl mb-1">{meta.icon}</div>
                <div className="text-xs font-semibold text-gray-900 leading-tight">{mod}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{meta.desc}</div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 text-gray-300 hover:bg-gray-200 transition">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Employee Modal ────────────────────────────────────────────────────────
function AddEmployeeModal({ activeClient, authHeader, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'client', employee_type: 'internal' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, client_id: activeClient?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className="bg-white border border-gray-200 p-8 w-[440px] shadow-2xl text-center rounded-xl" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-gray-900 font-bold text-lg mb-1">Employee Added</h3>
          <p className="text-gray-500 text-sm mb-2"><strong>{result.name}</strong> has been added with status <span className="text-yellow-700 font-semibold">Pending</span>.</p>
          {result.companyCode && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3 text-center">
              <div className="text-xs text-purple-500 font-semibold uppercase tracking-wider mb-1">Company Access Code</div>
              <div className="font-mono text-xl font-bold text-purple-800 tracking-widest">{result.companyCode}</div>
              <div className="text-xs text-purple-400 mt-1">Included in the invite email. Save a copy for your records.</div>
            </div>
          )}
          {result.emailSent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-5 text-sm text-green-700">
              ✉ An invitation email has been sent to <strong>{result.email}</strong> with a set-password link (valid 24 hrs) and the company access code above.
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-5 text-sm text-orange-700">
              ⚠ Employee created but the invite email could not be sent. Use the <strong>Send Invite</strong> action in the table to retry.
            </div>
          )}
          <button onClick={onClose} className="px-6 py-2 bg-purple-100 text-purple-800 font-semibold hover:bg-purple-200 transition text-sm rounded-lg">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-white border border-gray-200 w-[480px] shadow-2xl rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-purple-800 font-bold text-base">Add Employee</h3>
            <p className="text-purple-600 text-xs mt-0.5">An invitation email will be sent automatically with a 24-hour set-password link</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">⚠ {error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rahul Sharma"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="rahul@company.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="client">Client User</option>
                <option value="vciso">vCISO / Analyst</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Type *</label>
              <div className="flex gap-2 h-[42px]">
                {['internal', 'external'].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, employee_type: t }))}
                    className={`flex-1 text-sm font-medium rounded-lg border-2 transition capitalize ${
                      form.employee_type === t ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm bg-purple-100 text-purple-800 font-semibold rounded-lg hover:bg-purple-200 disabled:opacity-50 transition">
              {saving ? 'Adding...' : '+ Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Employee Modal ───────────────────────────────────────────────────────
function EditEmployeeModal({ user, authHeader, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || '',
    employee_type: user.employee_type || 'internal',
    status: user.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-white border border-gray-200 w-[440px] shadow-2xl rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-purple-800 font-bold text-base">Edit Employee</h3>
            <p className="text-purple-600 text-xs mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">⚠ {error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input value={user.email} readOnly
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Type</label>
              <div className="flex gap-2 h-[42px]">
                {['internal', 'external'].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, employee_type: t }))}
                    className={`flex-1 text-sm font-medium rounded-lg border-2 transition capitalize ${
                      form.employee_type === t ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Disabled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm bg-purple-100 text-purple-800 font-semibold rounded-lg hover:bg-purple-200 disabled:opacity-50 transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function UserManagement({ activeClient, setActiveClient }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers]           = useState([]);
  const [codes, setCodes]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [tab, setTab]               = useState('users');
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState('');
  const [clientModules, setClientModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  // Permissions modal
  const [editPermUser, setEditPermUser] = useState(null);

  // Employee modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser]         = useState(null);

  // Invite form
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteRole,    setInviteRole]    = useState('vciso');
  const [inviteDept,    setInviteDept]    = useState('');
  const [inviteModules, setInviteModules] = useState([]);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult,  setInviteResult]  = useState(null);

  // Code form
  const [newCode,      setNewCode]      = useState(() => generateCode());
  const [newCodeRole,  setNewCodeRole]  = useState('vciso');
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [codeModules,  setCodeModules]  = useState([]);
  const [codeEmail,    setCodeEmail]    = useState('');
  const [codeName,     setCodeName]     = useState('');
  const [codeSaving,   setCodeSaving]   = useState(false);
  const [codeResult,   setCodeResult]   = useState(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${getToken()}` }), [getToken]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load client's agreed modules from onboarding — these define what's visible everywhere
  useEffect(() => {
    if (!activeClient) { setClientModules([]); return; }
    setModulesLoading(true);
    fetch(`/api/onboarding-modules/${activeClient.id}`, { headers: authHeader })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(data => {
        const mods = Array.isArray(data) ? data.map(m => m.module_name || m) : [];
        // Use onboarding modules if available; fallback to all only if onboarding was never done
        const resolved = mods.length > 0 ? mods : [...ALL_MODULES];
        setClientModules(resolved);
        // vCISO gets all client modules by default; panel roles start empty (chosen per user)
        setInviteModules(resolved);
        setCodeModules(resolved);
      })
      .catch(() => {
        setClientModules([...ALL_MODULES]);
        setInviteModules([...ALL_MODULES]);
        setCodeModules([...ALL_MODULES]);
      })
      .finally(() => setModulesLoading(false));
  }, [activeClient?.id]);

  const fetchAll = async () => {
    if (!activeClient) return;
    setLoading(true);
    const [uRes, cRes] = await Promise.all([
      fetch(`/api/auth/admin/users?client_id=${activeClient.id}`, { headers: authHeader }),
      fetch('/api/auth/admin/company-codes', { headers: authHeader }),
    ]);
    const uData = await uRes.json();
    setUsers(Array.isArray(uData) ? uData : []);
    const cData = await cRes.json();
    setCodes(Array.isArray(cData) ? cData : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [activeClient?.id]);

  // Reset invite modules when role changes: client = nothing selected, others = onboarding modules
  useEffect(() => {
    if (inviteRole === 'client') {
      setInviteModules([]);
    } else {
      setInviteModules([...clientModules]);
    }
    setInviteDept('');
  }, [inviteRole, clientModules]);

  // Reset code form when role changes:
  // - vCISO → pre-fill all client onboarding modules (full access by default)
  // - client/external_client → start empty (admin picks per-user from panels)
  useEffect(() => {
    setCodeModules(PANEL_ROLES.has(newCodeRole) ? [] : [...clientModules]);
    setCodeEmail('');
    setCodeName('');
  }, [newCodeRole, clientModules]);

  const toggleStatus = async (user) => {
    const newStatus = user.status !== 'inactive' ? 'inactive' : 'active';
    await fetch(`/api/auth/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    showToast(`${user.name} ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
  };

  const doSendInvite = async (user) => {
    try {
      const res = await fetch(`/api/auth/admin/users/${user.id}/send-invite`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.invite_status === 'failed') {
        showToast(`Invite token created but email delivery failed for ${user.email}`, 'error');
      } else {
        showToast(`Invite sent to ${user.email}`);
      }
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setInviteSending(true);
    setInviteResult(null);
    try {
      const res = await fetch('/api/auth/admin/invite', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          client_id: activeClient?.id || null,
          modules: inviteModules,
          department: inviteDept || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteResult({ ...data, email: inviteEmail.trim() });
      setInviteEmail('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setInviteSending(false);
    }
  };

  const createCode = async (e) => {
    e.preventDefault();
    if (!codeEmail.trim()) { showToast('Please enter recipient email', 'error'); return; }
    setCodeSaving(true);
    try {
      const res = await fetch('/api/auth/admin/company-codes', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          role: newCodeRole,
          label: newCodeLabel || codeName || '',
          email: codeEmail.trim(),
          name: codeName.trim() || undefined,
          department: undefined,
          modules: codeModules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCodes(prev => [data, ...prev]);
      setCodeResult({ code: newCode.trim().toUpperCase(), email: codeEmail.trim(), role: newCodeRole });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCodeSaving(false);
    }
  };

  const resetCodeForm = () => {
    setCodeResult(null);
    setNewCode(generateCode());
    setCodeEmail('');
    setCodeName('');
    setNewCodeLabel('');
    setNewCodeRole('vciso');
    setCodeModules([...clientModules]);
  };

  const toggleCode = async (code) => {
    const res = await fetch(`/api/auth/admin/company-codes/${code.id}`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !code.active }),
    });
    const data = await res.json();
    setCodes(prev => prev.map(c => c.id === data.id ? data : c));
    showToast(`Code ${code.code} ${data.active ? 'activated' : 'deactivated'}`);
  };

  const toggleInviteModule = (mod) =>
    setInviteModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);

  const toggleCodeModule = (mod) =>
    setCodeModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);

  const filteredUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Guard: require active client
  if (!activeClient) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Client First</h2>
          <p className="text-gray-400 mb-6">User Management is scoped to a specific client. Please go to the Clients tab and select a client to manage their users, send invites, and create access codes.</p>
          <button
            onClick={() => navigate('/dashboard/admin/clients')}
            className="px-6 py-3 bg-violet-100 text-violet-700 font-semibold hover:bg-violet-200 transition text-sm"
          >
            Go to Clients →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 200 }}
          className={`px-5 py-3 shadow-lg text-gray-900 text-sm font-medium ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}
        >
          {toast.msg}
        </div>
      )}

      {editPermUser && (
        <PermissionsModal
          user={editPermUser}
          authHeader={authHeader}
          clientModules={clientModules}
          onClose={() => setEditPermUser(null)}
          onSaved={() => showToast(`Permissions updated for ${editPermUser.name}`)}
        />
      )}

      {showAddModal && (
        <AddEmployeeModal
          activeClient={activeClient}
          authHeader={authHeader}
          onClose={() => setShowAddModal(false)}
          onSaved={() => fetchAll()}
        />
      )}

      {editUser && (
        <EditEmployeeModal
          user={editUser}
          authHeader={authHeader}
          onClose={() => setEditUser(null)}
          onSaved={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
            showToast(`${updated.name} updated`);
          }}
        />
      )}

      {/* Service Agreement Banner */}
      <div className="mb-6 bg-blue-900/20 border border-blue-700/40 px-6 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-violet-200/40 flex items-center justify-center text-xl flex-shrink-0">🏢</div>
        <div className="flex-1 min-w-0">
          <div className="text-gray-900 font-semibold text-sm">{activeClient.name}</div>
          <div className="text-violet-400 text-xs mt-0.5">
            {modulesLoading ? 'Loading service agreement...' : `Service agreement: ${clientModules.length} modules enabled`}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 max-w-md">
          {clientModules.slice(0, 5).map(m => (
            <span key={m} className="text-[10px] bg-violet-100/50 text-violet-400 border border-blue-700/50 px-2 py-0.5">{m}</span>
          ))}
          {clientModules.length > 5 && (
            <span className="text-[10px] bg-violet-100/50 text-violet-500 border border-blue-700/50 px-2 py-0.5">+{clientModules.length - 5} more</span>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-400 mt-1">Manage users, send invites, and control access codes for <span className="text-gray-900 font-medium">{activeClient.name}</span></p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 p-1 mb-6 w-fit">
        {[['users', '👥 Users'], ['codes', '📩 Send Invite to Login on Panel'], ['partners', '🤝 Partners']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2 text-sm font-semibold transition ${tab === id ? 'bg-violet-100 text-violet-700 shadow' : 'text-gray-400 hover:text-gray-900'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ─────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">{activeClient.name} — Employees</h2>
              <span className="text-sm text-gray-400">{filteredUsers.length} employee{filteredUsers.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm px-4 py-2 w-60 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-400"
              />
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg hover:bg-purple-200 transition flex-shrink-0"
              >
                + Add Employee
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Employee', 'Type', 'Role', 'Status', 'Invite Status', 'Last Login', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-purple-50/30 transition">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-sm truncate">{u.name}</div>
                            <div className="text-xs text-gray-400 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Employee Type */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${EMP_TYPE_STYLE[u.employee_type || 'internal']}`}>
                          {(u.employee_type || 'internal') === 'external' ? '🤝 External' : '🏢 Internal'}
                        </span>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 capitalize rounded-full ${ROLE_STYLE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 capitalize rounded-full ${STATUS_STYLE_LIGHT[u.status] || 'bg-gray-100 text-gray-400'}`}>
                          {u.status === 'inactive' ? '⊘ Disabled' : u.status === 'active' ? '● Active' : '○ Pending'}
                        </span>
                      </td>
                      {/* Invite Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${INVITE_STATUS_STYLE[u.invite_status || 'not_sent']}`}>
                          {INVITE_STATUS_LABEL[u.invite_status || 'not_sent']}
                        </span>
                      </td>
                      {/* Last Login */}
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => setEditUser(u)}
                              className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                              title="Edit"
                            >✏️ Edit</button>
                            <button
                              onClick={() => setEditPermUser(u)}
                              className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                              title="Module Permissions"
                            >🔑</button>
                            <button
                              onClick={() => toggleStatus(u)}
                              className={`text-xs px-2.5 py-1.5 rounded-lg transition ${
                                u.status !== 'inactive'
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {u.status !== 'inactive' ? '⊘ Disable' : '✓ Enable'}
                            </button>
                            {/* Send Invite — not yet sent or previously failed */}
                            {(u.invite_status === 'not_sent' || u.invite_status === 'failed') && u.status !== 'inactive' && (
                              <button
                                onClick={() => doSendInvite(u)}
                                className="text-xs px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
                                title="Send Invite"
                              >📩 Send Invite</button>
                            )}
                            {/* Resend Invite — sent but not yet accepted */}
                            {(u.invite_status === 'sent' || u.invite_status === 'expired') && u.status !== 'inactive' && (
                              <button
                                onClick={() => doSendInvite(u)}
                                className="text-xs px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
                                title="Resend Invite"
                              >🔄 Resend</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <div className="text-3xl mb-2">👥</div>
                        <div className="text-gray-500 font-medium text-sm">No employees found</div>
                        <div className="text-gray-400 text-xs mt-1">Click "+ Add Employee" to add your first employee</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Send Invite Tab ───────────────────────────────────────────────────── */}
      {tab === 'codes' && (
        <div className="space-y-6 max-w-3xl">
          {codeResult ? (
            <div className="bg-white border border-green-700 p-8 text-center">
              <div className="text-5xl mb-3">✅</div>
              <div className="text-xl font-bold text-gray-900 mb-2">Code sent to {codeResult.email}</div>
              <p className="text-gray-400 text-sm mb-5">An email has been sent with the access code and signup instructions.</p>
              <div className="bg-gray-50 border border-gray-200 p-4 mb-2">
                <div className="text-gray-400 text-xs mb-1">Access Code</div>
                <div className="font-mono text-2xl font-bold text-violet-500 tracking-widest">{codeResult.code}</div>
              </div>
              <div className="text-gray-500 text-xs mb-6">User should visit <span className="text-violet-500">{window.location.origin}/signup</span> and enter this code</div>
              <button onClick={resetCodeForm} className="px-6 py-2.5 bg-violet-100 text-violet-700 font-semibold hover:bg-violet-200 transition text-sm">
                Create Another Code
              </button>
            </div>
          ) : (
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Generate & Send Access Code</h2>
            <p className="text-sm text-gray-400 mb-5">Generate a unique access code and email it directly to the user. They use this code to self-register.</p>
            <form onSubmit={createCode} className="space-y-5">

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLE_CARDS.map(rc => (
                    <button
                      key={rc.id}
                      type="button"
                      onClick={() => setNewCodeRole(rc.id)}
                      className={`p-4 border-2 text-left transition ${newCodeRole === rc.id ? 'border-violet-500 bg-blue-900/20' : `border-gray-200 hover:${th('border-[#4b5563]', { dark: 'border-[#CBD5E1]' })}`}`}
                    >
                      <div className="text-2xl mb-1">{rc.icon}</div>
                      <div className="text-gray-900 font-semibold text-sm">{rc.label}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{rc.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel-role (Client / External Client): name + email + multi-panel selector */}
              {PANEL_ROLES.has(newCodeRole) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Recipient Name *</label>
                      <input required value={codeName} onChange={e => setCodeName(e.target.value)}
                        placeholder="e.g. Mahesh Kumar"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Recipient Email *</label>
                      <input type="email" required value={codeEmail} onChange={e => setCodeEmail(e.target.value)}
                        placeholder="mahesh@company.com"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Modules — pick from any panel below, selections accumulate
                    </label>
                    <MultiPanelSelector
                      selected={codeModules}
                      onToggle={toggleCodeModule}
                      clientModules={clientModules}
                      userName={codeName}
                    />
                  </div>
                </>
              )}

              {/* vCISO: email + full module list pre-filled */}
              {!PANEL_ROLES.has(newCodeRole) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Send Code To (Email) *</label>
                    <input type="email" required value={codeEmail} onChange={e => setCodeEmail(e.target.value)}
                      placeholder="recipient@company.com"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Module Access</label>
                        <p className="text-xs text-gray-500 mt-0.5">Pre-filled from onboarding service agreement</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-400">{codeModules.length} selected</span>
                        <button type="button" onClick={() => setCodeModules([...clientModules])} className="text-xs px-3 py-1 bg-violet-200 text-violet-700 hover:bg-violet-100 transition">Select All</button>
                        <button type="button" onClick={() => setCodeModules([])} className="text-xs px-3 py-1 bg-gray-200 text-gray-300 hover:bg-gray-200 transition">Clear</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {clientModules.map(mod => {
                        const meta = MODULE_META[mod] || { icon: '📦', desc: '' };
                        const checked = codeModules.includes(mod);
                        return (
                          <button key={mod} type="button" onClick={() => toggleCodeModule(mod)}
                            className={`text-left p-3 border-2 transition ${checked ? 'border-violet-500 bg-blue-900/30' : `border-gray-200 bg-gray-50 hover:${th('border-[#4b5563]', { dark: 'border-[#CBD5E1]' })}`}`}
                          >
                            <div className="text-xl mb-1">{meta.icon}</div>
                            <div className="text-xs font-semibold text-gray-900 leading-tight">{mod}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{meta.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Auto-generated access code */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Access Code (auto-generated)</label>
                <div className="flex gap-2">
                  <input required value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="XXXX-XXXX-XXXX"
                  />
                  <button type="button" onClick={() => setNewCode(generateCode())}
                    className="px-4 py-3 bg-gray-200 text-gray-300 hover:bg-gray-200 transition text-sm"
                  >
                    🔄 Regenerate
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={codeSaving}
                className="w-full py-3 bg-violet-100 text-violet-700 font-semibold hover:bg-violet-200 disabled:opacity-50 transition text-sm"
              >
                {codeSaving ? 'Sending...' : '🔑 Generate & Send Code via Email'}
              </button>
            </form>
          </div>
          )}

          {/* Code list */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Active Company Codes</h2>
            </div>
            <div className={th('divide-y divide-[#374151]', { dark: 'divide-y divide-[#CBD5E1]' })}>
              {codes.map(c => (
                <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50">
                  <code className="font-mono font-bold text-violet-500 text-sm bg-blue-900/30 px-3 py-1 border border-blue-800">{c.code}</code>
                  <span className={`text-xs font-semibold px-2 py-1 capitalize ${ROLE_STYLE[c.role] || 'bg-gray-700 text-gray-300'}`}>{c.role}</span>
                  <span className="text-sm text-gray-400 flex-1">{c.label || '—'}</span>
                  <span className={`text-xs font-semibold px-2 py-1 ${c.active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {c.active ? '● Active' : '○ Inactive'}
                  </span>
                  <button
                    onClick={() => toggleCode(c)}
                    className={`text-xs px-3 py-1.5 font-medium transition ${c.active ? 'bg-red-900/40 text-red-400 hover:bg-red-900/70' : 'bg-green-900/40 text-green-400 hover:bg-green-900/70'}`}
                  >
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
              {codes.length === 0 && <div className="py-10 text-center text-gray-400">No codes created yet</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Partners Tab ─────────────────────────────────────────────────────────── */}
      {tab === 'partners' && (
        <PartnerTab authHeader={authHeader} />
      )}
    </div>
  );
}
