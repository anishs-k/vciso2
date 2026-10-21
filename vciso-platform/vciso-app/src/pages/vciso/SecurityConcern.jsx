import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Vulnerabilities from './Vulnerabilities';

// ── Tool metadata ──────────────────────────────────────────────────────────────
const TOOL_META = {
  'vulnerability-management': {
    icon: '🐛', name: 'Vulnerability Management',
    integrations: ['Tenable.io', 'Qualys', 'Rapid7 InsightVM', 'Nessus', 'OpenVAS', 'Wiz'],
    desc: 'Centralized vulnerability lifecycle — discovery, prioritization, remediation tracking, and SLA management.',
  },
  'grc': {
    icon: '⚖️', name: 'GRC & Risk Management',
    integrations: ['ServiceNow GRC', 'Archer', 'LogicGate', 'Vanta', 'Drata'],
    desc: 'Governance, Risk and Compliance — risk register, risk treatment, policy management, and audit coordination.',
  },
  'incident-response': {
    icon: '🚨', name: 'Incident Response',
    integrations: ['PagerDuty', 'Jira', 'ServiceNow ITSM', 'Splunk SOAR', 'IBM QRadar SOAR'],
    desc: 'Incident lifecycle management — detection, containment, eradication, recovery, and post-mortem.',
  },
  'iam': {
    icon: '🔑', name: 'Identity & Access Management',
    integrations: ['Microsoft Entra ID', 'Okta', 'CyberArk', 'SailPoint', 'Active Directory'],
    desc: 'Identity governance — user provisioning, SSO, MFA enforcement, access reviews, and role management.',
  },
  'dlp': {
    icon: '🛡️', name: 'Data Loss Prevention',
    integrations: ['Symantec DLP', 'Forcepoint', 'Microsoft Purview', 'Nightfall', 'Varonis'],
    desc: 'Data protection — sensitive data discovery, classification, policy enforcement, and exfiltration prevention.',
  },
  'pam': {
    icon: '🔐', name: 'Privileged Access Management',
    integrations: ['CyberArk PAM', 'BeyondTrust', 'Delinea', 'HashiCorp Vault'],
    desc: 'Privileged account management — vaulting, session recording, just-in-time access, and credential rotation.',
  },
  'soc-siem': {
    icon: '📡', name: 'SOC / SIEM',
    integrations: ['Splunk', 'Microsoft Sentinel', 'IBM QRadar', 'Elastic SIEM', 'Sumo Logic'],
    desc: 'Security operations — log aggregation, correlation rules, real-time alerting, and threat hunting.',
  },
  'cloud-security': {
    icon: '☁️', name: 'Cloud Security / CSPM',
    integrations: ['Wiz', 'Orca Security', 'Prisma Cloud', 'AWS Security Hub', 'Microsoft Defender for Cloud'],
    desc: 'Cloud posture management — misconfiguration detection, compliance benchmarks, and workload protection.',
  },
  'appsec': {
    icon: '🔒', name: 'Application Security',
    integrations: ['Snyk', 'Veracode', 'Checkmarx', 'SonarQube', 'OWASP ZAP', 'Burp Suite'],
    desc: 'Secure SDLC — SAST, DAST, SCA, secrets detection, and CI/CD security gate enforcement.',
  },
  'tprm': {
    icon: '🤝', name: 'Third-Party Risk Management',
    integrations: ['BitSight', 'SecurityScorecard', 'ProcessUnity', 'Prevalent', 'UpGuard'],
    desc: 'Vendor risk — questionnaire management, continuous monitoring, SLA tracking, and contract risk analysis.',
  },
  'network-security': {
    icon: '🌐', name: 'Network Security',
    integrations: ['Palo Alto Networks', 'Cisco Firepower', 'Fortinet', 'Check Point', 'Darktrace'],
    desc: 'Network protection — firewall management, IDS/IPS monitoring, segmentation, and lateral movement detection.',
  },
  'endpoint': {
    icon: '💻', name: 'Endpoint Security',
    integrations: ['CrowdStrike Falcon', 'SentinelOne', 'Microsoft Defender', 'Carbon Black', 'Jamf'],
    desc: 'Endpoint protection — EDR/XDR, device compliance, MDM, and threat detection on all endpoints.',
  },
  'pentest': {
    icon: '🔍', name: 'Penetration Testing',
    integrations: ['Cobalt Strike', 'Metasploit', 'Burp Suite Pro', 'Nmap', 'Kali Linux toolchain'],
    desc: 'Security assessment — internal/external pentest tracking, findings management, and re-test verification.',
  },
  'bcp-dr': {
    icon: '🔄', name: 'Business Continuity / DR',
    integrations: ['Zerto', 'Veeam', 'AWS Backup', 'Azure Site Recovery', 'Rubrik'],
    desc: 'Resilience management — BIA, RTO/RPO tracking, DR plan testing, and recovery runbooks.',
  },
  'awareness': {
    icon: '📚', name: 'Security Awareness',
    integrations: ['KnowBe4', 'Proofpoint Security Awareness', 'Cofense', 'Hoxhunt'],
    desc: 'Phishing simulation, security training campaigns, completion tracking, and risk scoring by department.',
  },
  'asset-management': {
    icon: '📦', name: 'Asset Management',
    integrations: ['ServiceNow CMDB', 'Lansweeper', 'Qualys Asset Inventory', 'Axonius', 'Runzero'],
    desc: 'Asset lifecycle — hardware, software, and cloud asset inventory, ownership, and classification.',
  },
  'threat-intelligence': {
    icon: '🌐', name: 'Threat Intelligence',
    integrations: ['AlienVault OTX', 'MISP', 'Recorded Future', 'ThreatConnect', 'CISA KEV'],
    desc: 'CTI — threat feed aggregation, IOC management, adversary tracking, and intelligence-driven alerting.',
  },
};

function IntegrationCard({ name, integration }) {
  const connected = integration?.enabled === 1 && (integration?.api_url || integration?.username);
  return (
    <div className={`rounded-2xl p-3.5 flex items-center gap-3 bg-white border transition ${connected ? 'border-emerald-200 shadow-sm' : 'border-slate-200'}`}>
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate text-slate-900">{name}</div>
        <div className={`text-[10px] truncate mt-0.5 ${connected ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
          {connected ? `Connected${integration.api_url ? ` · ${integration.api_url}` : ''}` : 'Not configured — configure in Settings → Integrations'}
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
        {connected ? 'Active' : 'Not set up'}
      </span>
    </div>
  );
}

// ── Vulnerability Management view ─────────────────────────────────────────────
function VulnMgmtView() {
  return <Vulnerabilities />;
}

// ── GRC view ──────────────────────────────────────────────────────────────────
function GRCView() {
  const risks = [
    { id: 'R001', category: 'Cyber', title: 'Ransomware attack on production systems', likelihood: 'High', impact: 'Critical', inherent: 'Critical', treatment: 'Mitigate', residual: 'High', owner: 'CISO', due: '2026-09-30' },
    { id: 'R002', category: 'Data', title: 'Unauthorized access to customer PII', likelihood: 'Medium', impact: 'High', inherent: 'High', treatment: 'Mitigate', residual: 'Medium', owner: 'DPO', due: '2026-08-31' },
    { id: 'R003', category: 'Third-Party', title: 'Critical vendor data breach', likelihood: 'Medium', impact: 'High', inherent: 'High', treatment: 'Transfer', residual: 'Low', owner: 'Procurement', due: '2026-07-31' },
    { id: 'R004', category: 'Operational', title: 'Insider threat / data exfiltration', likelihood: 'Low', impact: 'Critical', inherent: 'High', treatment: 'Mitigate', residual: 'Medium', owner: 'HR+CISO', due: '2026-10-31' },
    { id: 'R005', category: 'Compliance', title: 'GDPR/DPDP non-compliance penalty', likelihood: 'Low', impact: 'High', inherent: 'Medium', treatment: 'Mitigate', residual: 'Low', owner: 'Legal', due: '2026-09-30' },
  ];
  const sevBadge = {
    Critical: 'bg-red-50 text-red-700 border-red-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-slate-900">Risk Register</div>
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              {['ID', 'Category', 'Risk Title', 'Likelihood', 'Impact', 'Inherent', 'Treatment', 'Residual', 'Owner', 'Due'].map(h => (
                <th key={h} className="text-left px-3.5 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition text-slate-900">
                <td className="px-3.5 py-3 font-mono font-bold text-blue-600">{r.id}</td>
                <td className="px-3.5 py-3 text-slate-600 font-medium">{r.category}</td>
                <td className="px-3.5 py-3 max-w-[200px] font-semibold text-slate-900"><div className="truncate" title={r.title}>{r.title}</div></td>
                <td className="px-3.5 py-3 font-medium text-slate-700">{r.likelihood}</td>
                <td className="px-3.5 py-3 font-medium text-slate-700">{r.impact}</td>
                <td className="px-3.5 py-3"><span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${sevBadge[r.inherent] || 'bg-slate-100 text-slate-700'}`}>{r.inherent}</span></td>
                <td className="px-3.5 py-3 text-slate-600 font-medium">{r.treatment}</td>
                <td className="px-3.5 py-3"><span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${sevBadge[r.residual] || 'bg-slate-100 text-slate-700'}`}>{r.residual}</span></td>
                <td className="px-3.5 py-3 text-slate-700 font-medium">{r.owner}</td>
                <td className="px-3.5 py-3 whitespace-nowrap text-slate-500">{r.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Incident Response view ─────────────────────────────────────────────────────
function IRView() {
  const incidents = [
    { id: 'INC-001', title: 'Phishing email campaign targeting finance', severity: 'high', status: 'in_progress', reported: '2026-06-05', assignee: 'SOC Team' },
    { id: 'INC-002', title: 'Suspicious login from unknown IP – admin account', severity: 'critical', status: 'open', reported: '2026-06-07', assignee: 'Unassigned' },
    { id: 'INC-003', title: 'Malware detected on workstation WS-042', severity: 'high', status: 'contained', reported: '2026-06-01', assignee: 'Endpoint Team' },
    { id: 'INC-004', title: 'Data exfiltration attempt via USB', severity: 'medium', status: 'resolved', reported: '2026-05-28', assignee: 'DLP Team' },
  ];
  const sBadge = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const stBadge = {
    open: 'bg-red-50 text-red-700 border-red-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    contained: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-900">Incident Tracker</div>
        <button className="text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition">+ New Incident</button>
      </div>
      <div className="space-y-2.5">
        {incidents.map(inc => (
          <div key={inc.id} className="rounded-2xl p-4 flex items-center gap-3.5 bg-white border border-slate-200 shadow-sm">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${sBadge[inc.severity]}`}>{inc.severity}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900">{inc.title}</div>
              <div className="text-[10px] mt-0.5 text-slate-500">{inc.id} · Reported {inc.reported} · {inc.assignee}</div>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${stBadge[inc.status]}`}>{inc.status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generic tool placeholder ───────────────────────────────────────────────────
function GenericToolView({ meta, toolSlug, integrations }) {
  const connectedCount = integrations.filter(i => i.module_slug === toolSlug && i.enabled === 1 && (i.api_url || i.username)).length;
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-slate-900">Integration Status</div>
          {connectedCount > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {connectedCount} active
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-5">{meta.desc}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {meta.integrations.map(name => (
            <IntegrationCard key={name} name={name}
              integration={integrations.find(i => i.module_slug === toolSlug && i.tool_name === name)} />
          ))}
        </div>
        {connectedCount === 0 && (
          <div className="mt-4 text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
            💡 Go to <strong className="text-blue-600 font-semibold">Settings → Integrations → {meta.name}</strong> to configure connections.
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="text-4xl mb-2">{meta.icon}</div>
        <div className="text-slate-900 font-bold text-base mb-1">{meta.name}</div>
        <p className="text-xs max-w-sm mx-auto text-slate-500">
          {connectedCount > 0
            ? `${connectedCount} integration(s) connected. Live data sync coming soon.`
            : `Connect an integration in Settings to start seeing live data from your ${meta.name.toLowerCase()} tools.`}
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['Total Events (30d)', 'Open Alerts', 'Last Sync'].map(l => (
            <div key={l} className="rounded-xl p-4 bg-slate-50 border border-slate-200">
              <div className="text-2xl font-black text-slate-400">—</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main SecurityConcern page ─────────────────────────────────────────────────
export default function SecurityConcern() {
  const { toolSlug } = useParams();
  const { getToken } = useAuth();
  const [integrations, setIntegrations] = useState([]);

  const token = getToken();

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/vciso/integrations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setIntegrations(data);
    } catch {}
  }, [token]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const meta = TOOL_META[toolSlug] || {
    icon: '🔧', name: toolSlug?.replace(/-/g, ' ') || 'Security Tool',
    integrations: [], desc: 'Configure this security tool integration.',
  };

  return (
    <div className="p-6 space-y-6 font-sans bg-slate-50 min-h-full text-slate-900">
      <div className="flex items-center gap-3.5 mb-2">
        <span className="text-3xl">{meta.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{meta.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
        </div>
      </div>


      {toolSlug === 'vulnerability-management' && <VulnMgmtView />}
      {toolSlug === 'grc' && <GRCView />}
      {toolSlug === 'incident-response' && <IRView />}
      {toolSlug !== 'vulnerability-management' && toolSlug !== 'grc' && toolSlug !== 'incident-response' && (
        <GenericToolView meta={meta} toolSlug={toolSlug} integrations={integrations} />
      )}
    </div>
  );
}
