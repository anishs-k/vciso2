import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Overview from './Overview';
import AuditFramework from './AuditFramework';
import ControlDetailView from './ControlDetailView';
import SecurityConcern from './SecurityConcern';
import ThreatIntelligence from './ThreatIntelligence';
import Reporting from './Reporting';
import VcisoSettings from './VcisoSettings';
import Vulnerabilities from './Vulnerabilities';
import Assets from './Assets';
import SecurityDashboard from './SecurityDashboard';
import GapAnalysisPage from './GapAnalysisPage';
import ImplementationStepDetailView from './ImplementationStepDetailView';
import ClientAssessmentsView from './ClientAssessmentsView';
import CSPMAssessmentView from './CSPMAssessmentView';
import AuditManagement from './AuditManagement';
import ScannerIntegration from './ScannerIntegration';
import VCISOMainPage from './VCISOMainPage';
import VCISOSidebar from './VCISOSidebar';
import { FRAMEWORK_CATALOG } from './frameworkCatalog';
import { th } from '../../theme';

export default function VCISOLayout() {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [clientName, setClientName] = useState('');
  const [clientInfo, setClientInfo] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [vulnCount, setVulnCount] = useState(0);
  const [threatAlerts, setThreatAlerts] = useState(0);
  const [clientFeatures, setClientFeatures] = useState(null);
  const [clientFrameworks, setClientFrameworks] = useState([]);
  // Licensed frameworks with their UI slugs, from the client database (null until loaded / in demo mode).
  const [licensedFrameworks, setLicensedFrameworks] = useState(null);
  // Bumped once the client's own catalogue has replaced the built-in one, so pages re-render with it.
  const [catalogVersion, setCatalogVersion] = useState(0);

  const [selectedFramework, setSelectedFramework] = useState(() => {
    return localStorage.getItem('vciso_selected_framework') || 'iso-27001';
  });

  useEffect(() => {
    const token = getToken();
    fetch('/api/vciso/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setClientName(data.client?.name || '');
        setVulnCount(data.stats?.vulnerabilities?.open || 0);
        setContractData(data.contract || null);
        if (Array.isArray(data.framework_selections) && data.framework_selections.length > 0) {
          setClientFrameworks(data.framework_selections);
        }
        if (Array.isArray(data.frameworks)) setLicensedFrameworks(data.frameworks);
        if (data.company_info) {
          setClientInfo({
            industry: data.company_info.industry || data.client?.industry || '',
            location: data.company_info.location || '',
            website: data.company_info.website || '',
            size: data.company_info.size || '',
          });
        } else if (data.client?.industry) {
          setClientInfo({ industry: data.client.industry, location: '', website: '', size: '' });
        }
      })
      .catch(() => {});
  }, []);

  // The client's licensed frameworks and controls (from the master workbook, via the client database)
  // replace the built-in FRAMEWORK_CATALOG entries, so control lists and IDs match the control register.
  useEffect(() => {
    const token = getToken();
    fetch('/api/vciso/frameworks', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ frameworks }) => {
        (frameworks || []).forEach(f => {
          if (!f.domains?.length) return;
          FRAMEWORK_CATALOG[f.slug] = { ...(FRAMEWORK_CATALOG[f.slug] || {}), name: f.name, shortName: FRAMEWORK_CATALOG[f.slug]?.shortName || f.shortName, domains: f.domains };
        });
        setCatalogVersion(v => v + 1);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = getToken();
    fetch('/api/vciso/client-features', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setClientFeatures(d || { threat_feeds_enabled: true, vuln_scanning_enabled: true, sla_tracking_enabled: true, asset_discovery_enabled: true }))
      .catch(() => setClientFeatures({ threat_feeds_enabled: true, vuln_scanning_enabled: true, sla_tracking_enabled: true, asset_discovery_enabled: true }));
  }, []);

  useEffect(() => {
    const token = getToken();
    fetch('/api/vciso/threat-intel', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setThreatAlerts(d?.alerts?.filter(a => a.severity === 'critical' || a.severity === 'high').length || 0))
      .catch(() => {});
  }, []);

  // Dynamic onboarding frameworks
  const onboardingFrameworks = useMemo(() => {
    if (licensedFrameworks?.length) {
      return licensedFrameworks.map(f => ({ id: f.slug, name: f.standard, shortName: FRAMEWORK_CATALOG[f.slug]?.shortName || f.standard }));
    }
    const rawList = [
      ...(Array.isArray(clientFrameworks) ? clientFrameworks : (clientFrameworks ? [clientFrameworks] : [])),
      'ISO/IEC 27001:2022',
      'DPDP Act, 2023'
    ];

    const validItems = rawList.filter(Boolean);
    const seen = new Set();
    const result = [];

    validItems.forEach(item => {
      const str = String(item).trim();
      const lower = str.toLowerCase();
      let fwObj;
      if (lower.includes('iso') || lower.includes('27001')) {
        fwObj = { id: 'iso-27001', name: 'ISO/IEC 27001:2022', shortName: 'ISO 27001' };
      } else if (lower.includes('dpdp') || lower.includes('dpdpa')) {
        fwObj = { id: 'dpdp', name: 'DPDP Act, 2023', shortName: 'DPDP Act, 2023' };
      } else if (lower.includes('cspm') || lower.includes('cloud security posture')) {
        fwObj = { id: 'cspm', name: 'CSPM', shortName: 'CSPM' };
      } else if (lower.includes('soc 2') || lower.includes('soc2')) {
        fwObj = { id: 'soc-2-type-ii', name: 'SOC 2 Type II', shortName: 'SOC 2 Type II' };
      } else if (lower.includes('pci') || lower.includes('dss')) {
        fwObj = { id: 'pci-dss', name: 'PCI DSS v4.0', shortName: 'PCI DSS v4.0' };
      } else if (lower.includes('nist')) {
        fwObj = { id: 'nist-csf', name: 'NIST CSF 2.0', shortName: 'NIST CSF' };
      } else if (lower.includes('hipaa')) {
        fwObj = { id: 'hipaa', name: 'HIPAA', shortName: 'HIPAA' };
      } else if (lower.includes('gdpr')) {
        fwObj = { id: 'gdpr', name: 'GDPR', shortName: 'GDPR' };
      } else {
        fwObj = { id: lower.replace(/[^a-z0-9]/g, '-'), name: str, shortName: str };
      }

      if (!seen.has(fwObj.id)) {
        seen.add(fwObj.id);
        result.push(fwObj);
      }
    });

    if (result.length === 0) {
      return [
        { id: 'iso-27001', name: 'ISO/IEC 27001:2022', shortName: 'ISO 27001' },
        { id: 'dpdp', name: 'DPDP Act, 2023', shortName: 'DPDP Act, 2023' }
      ];
    }
    return result;
  }, [clientFrameworks, licensedFrameworks, catalogVersion]);

  // Dynamic audit items & security items
  const { auditItems, securityItems } = useMemo(() => {
    const fwMap = {
      'iso 27001': { slug: 'iso-27001', name: 'ISO/IEC 27001:2022' },
      'iso 27001:2022': { slug: 'iso-27001', name: 'ISO/IEC 27001:2022' },
      'iso27001': { slug: 'iso-27001', name: 'ISO/IEC 27001:2022' },
      'dpdpa 2023': { slug: 'dpdp', name: 'DPDP Act, 2023' },
      'dpdp act 2023': { slug: 'dpdp', name: 'DPDP Act, 2023' },
      'dpdp': { slug: 'dpdp', name: 'DPDP Act, 2023' },
      'soc 2 type ii': { slug: 'soc-2-type-ii', name: 'SOC 2 Type II' },
      'soc 2 type i': { slug: 'soc-2-type-i', name: 'SOC 2 Type I' },
      'pci dss v4.0': { slug: 'pci-dss', name: 'PCI DSS v4.0' },
      'pci dss': { slug: 'pci-dss', name: 'PCI DSS v4.0' },
      'hipaa': { slug: 'hipaa', name: 'HIPAA' },
      'gdpr': { slug: 'gdpr', name: 'GDPR' },
      'nist csf 2.0': { slug: 'nist-csf', name: 'NIST CSF 2.0' },
      'nist csf': { slug: 'nist-csf', name: 'NIST CSF 2.0' },
      'nist 800-53 rev 5': { slug: 'nist-800-53', name: 'NIST 800-53' },
      'cis controls v8': { slug: 'cis-controls', name: 'CIS Controls' },
      'cmmc 2.0': { slug: 'cmmc', name: 'CMMC 2.0' },
      'fedramp': { slug: 'fedramp', name: 'FedRAMP' },
      'sox': { slug: 'sox', name: 'SOX IT Controls' },
      'hitrust csf': { slug: 'hitrust', name: 'HITRUST CSF' },
      'dora': { slug: 'dora', name: 'DORA' },
      'nis2 directive': { slug: 'nis2', name: 'NIS2 Directive' },
      'essential eight': { slug: 'essential-eight', name: 'Essential Eight' },
      'iso 27701': { slug: 'iso-27701', name: 'ISO 27701' },
      'mas trm': { slug: 'mas-trm', name: 'MAS TRM' },
      'sama csf': { slug: 'sama-csf', name: 'SAMA CSF' },
      'cobit 2019': { slug: 'cobit', name: 'COBIT 2019' },
    };

    const auditSeen = new Set();
    const auditItems = [];

    if (licensedFrameworks?.length) {
      licensedFrameworks.forEach(f => {
        if (!auditSeen.has(f.slug)) {
          auditSeen.add(f.slug);
          auditItems.push({ slug: f.slug, name: FRAMEWORK_CATALOG[f.slug]?.shortName || f.standard });
        }
      });
    } else if (clientFrameworks && clientFrameworks.length > 0) {
      clientFrameworks.forEach(fwName => {
        const key = String(fwName).toLowerCase().trim();
        const match = fwMap[key] || Object.entries(fwMap).find(([k]) => key.includes(k) || k.includes(key))?.[1];
        if (match && !auditSeen.has(match.slug)) {
          auditSeen.add(match.slug);
          auditItems.push(match);
        }
      });
    } else {
      const defaultAudit = ['iso-27001', 'dpdp', 'soc-2-type-ii', 'nist-csf', 'pci-dss', 'hipaa'];
      defaultAudit.forEach(slug => {
        const meta = FRAMEWORK_CATALOG[slug];
        if (meta) auditItems.push({ slug, name: meta.shortName || meta.name });
      });
    }

    const defaultSecurity = [
      { slug: 'grc', name: 'GRC & Risk' },
      { slug: 'incident-response', name: 'Incident Response' },
      { slug: 'soc-siem', name: 'SOC / SIEM' },
      { slug: 'cloud-security', name: 'Cloud Security' },
      { slug: 'iam', name: 'Identity & Access' },
      { slug: 'tprm', name: 'Third-Party Risk' },
    ];

    return { auditItems, securityItems: defaultSecurity };
  }, [clientFrameworks, licensedFrameworks, catalogVersion]);

  const isDPDP = selectedFramework === 'dpdp' || String(selectedFramework).toLowerCase().includes('dpdp');

  // The CSPM review console is only offered once the framework has actually
  // been selected for this organisation during admin onboarding.
  const hasCSPM = (clientFrameworks || []).some(f => String(f).toLowerCase().includes('cspm'));

  return (
    <div className="reg-wrap" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* ── UNIFIED VCISO SIDEBAR (PERMANENT ACROSS ALL VIEWS) ── */}
      <VCISOSidebar
        clientName={clientName}
        onboardingFrameworks={onboardingFrameworks}
        selectedFramework={selectedFramework}
        onSelectFramework={(fw) => setSelectedFramework(fw)}
        documentsCount={isDPDP ? 18 : 20}
        vulnCount={vulnCount}
        threatAlerts={threatAlerts}
        auditItems={auditItems}
        securityItems={securityItems}
        hasCSPM={hasCSPM}
      />

      {/* ── MAIN CONTENT OUTLET ── */}
      <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }) }}>
        <Routes key={catalogVersion}>
          <Route index element={<VCISOMainPage standalone={false} selectedFramework={selectedFramework} setSelectedFramework={setSelectedFramework} />} />
          <Route path="vcisomainpage" element={<VCISOMainPage standalone={false} selectedFramework={selectedFramework} setSelectedFramework={setSelectedFramework} />} />
          <Route path="overview" element={<Overview clientName={clientName} />} />
          <Route path="security-dashboard" element={<SecurityDashboard />} />
          <Route path="audits" element={<AuditManagement />} />
          <Route path="gap-analysis" element={<GapAnalysisPage />} />
          <Route path="assessments" element={<ClientAssessmentsView />} />
          <Route path="cspm" element={<CSPMAssessmentView />} />
          <Route path="audit/:frameworkSlug" element={<AuditFramework />} />
          <Route path="audit/:frameworkSlug/control/:controlId" element={<ControlDetailView />} />
          <Route path="audit/:frameworkSlug/implementation/:stepId" element={<ImplementationStepDetailView />} />
          <Route path="security/:toolSlug" element={<SecurityConcern />} />
          <Route path="threat-intel" element={<ThreatIntelligence />} />
          <Route path="reporting" element={<Reporting />} />
          <Route path="settings" element={<VcisoSettings />} />
          <Route path="assets" element={<Assets />} />
          <Route path="vulnerabilities" element={<Vulnerabilities />} />
          <Route path="scanners" element={<ScannerIntegration />} />
          <Route path="*" element={<Navigate to="vcisomainpage" replace />} />
        </Routes>
      </div>
    </div>
  );
}
