import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { THEME, th, isDark } from '../../theme';

// ── Theme icons ──────────────────────────────────────────────────────────────
// new: no nav icons · classic: Material Symbols · dark: Heroicons outline paths
// Each nav item passes an icon key per theme: icon={{ classic: '...', dark: '...' }}.
const DARK_ICON_PATHS = {
  implementation: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  audit: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  documents: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  workspace: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  overview: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  checkCircle: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  fingerprint: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11a7.96 7.96 0 00.99 3.868',
  cloud: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z',
  server: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  swap: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  scale: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  stack: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

const SECURITY_ICONS = {
  grc: { classic: 'balance', dark: 'scale' },
  'incident-response': { classic: 'warning', dark: 'warning' },
  'soc-siem': { classic: 'lan', dark: 'stack' },
  'cloud-security': { classic: 'cloud', dark: 'cloud' },
  iam: { classic: 'badge', dark: 'key' },
  tprm: { classic: 'handshake', dark: 'link' },
};

function NavItem({ active, onClick, icon = {}, label, children }) {
  const text = <span className="reg-nav-item-text">{label}</span>;
  return (
    <div className={`reg-nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {THEME === 'dark' ? (
        <span className="reg-nav-item-lead">
          <svg className="reg-nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d={DARK_ICON_PATHS[icon.dark] || DARK_ICON_PATHS.shield} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          {text}
        </span>
      ) : (
        <>
          {THEME === 'classic' && <span className="material-symbols-outlined">{icon.classic || 'security'}</span>}
          {text}
        </>
      )}
      {children}
    </div>
  );
}

function SectionHeader({ label, open, onToggle }) {
  return (
    <div className="reg-nav-section-hdr" onClick={onToggle}>
      <span>{label}</span>
      <span className="reg-nav-section-chevron">{open ? th('⌄', { classic: '−' }) : th('›', { classic: '+' })}</span>
    </div>
  );
}

export default function VCISOSidebar({
  clientName,
  onboardingFrameworks = [],
  selectedFramework,
  onSelectFramework,
  activeNav,
  onSelectNav,
  documentsCount = 20,
  vulnCount = 0,
  threatAlerts = 0,
  auditItems = [],
  securityItems = [],
  hasCSPM = false,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Collapsible sections state
  const [openSections, setOpenSections] = useState({
    compliance: true,
    platform: true,
    audit: true,
    operations: true,
    security: true,
    reporting: false,
  });

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentTab = searchParams.get('tab') || activeNav || 'implementation';
  const isMainPage = location.pathname === '/dashboard/vciso' ||
                     location.pathname === '/dashboard/vciso/' ||
                     location.pathname.endsWith('vcisomainpage');

  const handleNavClick = (tab) => {
    if (onSelectNav) {
      onSelectNav(tab);
    }
    const currentFw = selectedFramework || localStorage.getItem('vciso_selected_framework') || 'iso-27001';
    navigate(`/dashboard/vciso/vcisomainpage?tab=${encodeURIComponent(tab)}&framework=${encodeURIComponent(currentFw)}`);
  };

  const handleFrameworkChange = (newFw) => {
    localStorage.setItem('vciso_selected_framework', newFw);
    if (onSelectFramework) {
      onSelectFramework(newFw);
    }
    if (isMainPage) {
      navigate(`/dashboard/vciso/vcisomainpage?tab=${encodeURIComponent(currentTab)}&framework=${encodeURIComponent(newFw)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'VC';

  // Fallback audit items if none passed
  const displayAuditItems = auditItems && auditItems.length > 0 ? auditItems : [
    { slug: 'iso-27001', name: 'ISO/IEC 27001:2022' },
    { slug: 'dpdp', name: 'DPDP Act, 2023' }
  ];

  // Fallback security domain items if none passed
  const displaySecurityItems = securityItems && securityItems.length > 0 ? securityItems : [
    { slug: 'grc', name: 'GRC & Risk' },
    { slug: 'incident-response', name: 'Incident Response' },
    { slug: 'soc-siem', name: 'SOC / SIEM' },
    { slug: 'cloud-security', name: 'Cloud Security' },
    { slug: 'iam', name: 'Identity & Access' },
    { slug: 'tprm', name: 'Third-Party Risk' },
  ];

  const isCSPM = selectedFramework === 'cspm' || String(selectedFramework).toLowerCase().includes('cspm');

  const frameworkOptions = onboardingFrameworks.map(fw => (
    <option key={fw.id} value={fw.id} style={isDark ? undefined : { background: th('#1A202C', { classic: '#FFFFFF' }), color: th('#FFFFFF', { classic: '#0F172A' }) }}>
      {fw.name}
    </option>
  ));

  return (
    <aside className="reg-side">
      {/* ── Brand & standard selector (Fetched from Supabase Onboarding) ── */}
      {isDark ? (
        <div className="reg-brand">
          <div className="reg-brand-row">
            <div className="reg-brand-logo">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="reg-brand-name">vCISO</div>
          </div>
          <div className="reg-brand-sub" title={clientName || 'Compliance register'}>Compliance register</div>
          <div className="reg-select">
            <select
              value={selectedFramework || 'iso-27001'}
              onChange={(e) => handleFrameworkChange(e.target.value)}
            >
              {frameworkOptions}
            </select>
            <svg className="reg-select-chevron" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
        </div>
      ) : (
        <>
          <div className="reg-brand">
            <div className="reg-brand-name">
              {THEME === 'classic' && <span className="material-symbols-outlined">verified_user</span>}
              vCISO
            </div>
            <div className="reg-brand-sub" title={clientName || 'Compliance register'}>
              Compliance register · {clientName || 'Organization'}
            </div>
          </div>

          <div className="reg-select" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedFramework || 'iso-27001'}
              onChange={(e) => handleFrameworkChange(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                fontFamily: th('Source Serif 4, serif', { classic: 'Inter, sans-serif' }),
                fontSize: '13.5px',
                fontWeight: 600,
                color: th('#FFFFFF', { classic: '#0F172A' }),
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {frameworkOptions}
            </select>
          </div>
        </>
      )}

      {/* ── Scrollable Navigation Sections ── */}
      <div className="reg-nav-scroll">
        {/* 1. Compliance Register */}
        {!isCSPM && (
          <>
            <SectionHeader label="Compliance Register" open={openSections.compliance} onToggle={() => toggleSection('compliance')} />
            {openSections.compliance && (
              <div>
                <NavItem icon={{ classic: 'format_list_numbered', dark: 'implementation' }} label="Implementation steps"
                  active={isMainPage && currentTab === 'implementation'} onClick={() => handleNavClick('implementation')} />
                <NavItem icon={{ classic: 'fact_check', dark: 'audit' }} label="Audit & evidence"
                  active={isMainPage && currentTab === 'audit'} onClick={() => handleNavClick('audit')} />
                <NavItem icon={{ classic: 'description', dark: 'documents' }} label="Documents"
                  active={isMainPage && currentTab === 'documents'} onClick={() => handleNavClick('documents')}>
                  <span className="tag">{documentsCount}</span>
                </NavItem>
                <NavItem icon={{ classic: 'edit_document', dark: 'workspace' }} label="Draft workspace"
                  active={isMainPage && currentTab === 'workspace'} onClick={() => handleNavClick('workspace')}>
                  <span className="reg-badge-live">Live</span>
                </NavItem>
              </div>
            )}
          </>
        )}

        {/* 2. Platform Views */}
        <SectionHeader label="Platform Views" open={openSections.platform} onToggle={() => toggleSection('platform')} />
        {openSections.platform && (
          <div>
            <NavItem icon={{ classic: 'dashboard', dark: 'overview' }} label="Overview"
              active={location.pathname.includes('/overview')} onClick={() => navigate('/dashboard/vciso/overview')} />
            <NavItem icon={{ classic: 'shield', dark: 'shield' }} label="Security Center"
              active={location.pathname.includes('/security-dashboard')} onClick={() => navigate('/dashboard/vciso/security-dashboard')} />
          </div>
        )}

        {/* 3. Audit & Assessments */}
        <SectionHeader label="Audits & Assessments" open={openSections.audit} onToggle={() => toggleSection('audit')} />
        {openSections.audit && (
          <div>
            <NavItem icon={{ classic: 'assignment_turned_in', dark: 'clipboard' }} label="Audit Management"
              active={location.pathname.includes('/audits')} onClick={() => navigate('/dashboard/vciso/audits')} />
            <NavItem icon={{ classic: 'quiz', dark: 'users' }} label="Client Assessments"
              active={location.pathname.includes('/assessments')} onClick={() => navigate('/dashboard/vciso/assessments')} />
            {hasCSPM && (
              <NavItem icon={{ classic: 'cloud_done', dark: 'cloud' }} label="CSPM Assessment"
                active={location.pathname.includes('/vciso/cspm')} onClick={() => navigate('/dashboard/vciso/cspm')}>
                <span className="tag">60Q</span>
              </NavItem>
            )}
            {displayAuditItems.map(item => (
              <NavItem key={item.slug} icon={{ classic: 'gavel', dark: item.slug === 'dpdp' ? 'fingerprint' : 'checkCircle' }} label={`${item.name} Audit`}
                active={location.pathname.includes(`/audit/${item.slug}`)} onClick={() => navigate(`/dashboard/vciso/audit/${item.slug}`)} />
            ))}
          </div>
        )}

        {/* 4. Operations & Threat */}
        <SectionHeader label="Operations & Threat" open={openSections.operations} onToggle={() => toggleSection('operations')} />
        {openSections.operations && (
          <div>
            <NavItem icon={{ classic: 'inventory_2', dark: 'server' }} label="Asset Registry"
              active={location.pathname.includes('/assets')} onClick={() => navigate('/dashboard/vciso/assets')} />
            <NavItem icon={{ classic: 'bug_report', dark: 'warning' }} label="Vulnerabilities"
              active={location.pathname.includes('/vulnerabilities') || location.pathname.includes('/security/vulnerability-management')}
              onClick={() => navigate('/dashboard/vciso/vulnerabilities')}>
              {vulnCount > 0 && <span className="reg-badge-crimson">{vulnCount}</span>}
            </NavItem>
            <NavItem icon={{ classic: 'radar', dark: 'bolt' }} label="Threat Intelligence"
              active={location.pathname.includes('/threat-intel')} onClick={() => navigate('/dashboard/vciso/threat-intel')}>
              {threatAlerts > 0 && <span className={th('reg-badge-crimson', { dark: 'tag' })}>{threatAlerts}</span>}
            </NavItem>
            <NavItem icon={{ classic: 'sync_alt', dark: 'swap' }} label="Scanner Integrations"
              active={location.pathname.includes('/scanners')} onClick={() => navigate('/dashboard/vciso/scanners')} />
          </div>
        )}

        {/* 5. Security Domains */}
        <SectionHeader label="Security Domains" open={openSections.security} onToggle={() => toggleSection('security')} />
        {openSections.security && (
          <div>
            {displaySecurityItems.map(item => (
              <NavItem key={item.slug} icon={SECURITY_ICONS[item.slug]} label={item.name}
                active={location.pathname.includes(`/security/${item.slug}`)} onClick={() => navigate(`/dashboard/vciso/security/${item.slug}`)} />
            ))}
          </div>
        )}

        {/* 6. Reporting & Governance */}
        <SectionHeader label="Reporting & Governance" open={openSections.reporting} onToggle={() => toggleSection('reporting')} />
        {openSections.reporting && (
          <div>
            <NavItem icon={{ classic: 'summarize', dark: 'chart' }} label="Executive Reports"
              active={location.pathname.includes('/reporting')} onClick={() => navigate('/dashboard/vciso/reporting')} />
            <NavItem icon={{ classic: 'settings', dark: 'cog' }} label="Platform Settings"
              active={location.pathname.includes('/settings')} onClick={() => navigate('/dashboard/vciso/settings')} />
          </div>
        )}
      </div>

      {/* ── Footer with User Profile & Logout ── */}
      <div className="reg-user-footer">
        <div className="reg-user-row">
          <div className="reg-user-avatar">
            {initials}
          </div>
          <div className="reg-user-info">
            <div className="reg-user-name">{user?.name || clientName || 'Security Lead'}</div>
            <div className="reg-user-email">{user?.email || 'vCISO Portal'}</div>
          </div>
        </div>
        {isDark ? (
          <button onClick={handleLogout} className="reg-logout-icon" title="Logout">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        ) : (
          <button onClick={handleLogout} className="reg-logout-btn">
            {THEME === 'classic'
              ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              : <span>⏻</span>} Logout
          </button>
        )}
      </div>
    </aside>
  );
}
