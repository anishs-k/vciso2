import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import NotificationBell from './NotificationBell';
import { th } from '../theme';

// ─── Data Constants ────────────────────────────────────────────────────────────
const INDUSTRIES = ['IT Services','SaaS','Finance','Banking','Healthcare','Manufacturing','Education','Government','Telecom','E-commerce','Retail','Logistics','Energy','Hospitality','Other'];
const COMPANY_SIZES = ['1–10','11–50','51–200','201–500','501–1,000','1,000–5,000','5,000+'];
const TIMEZONES = ['UTC','UTC+5:30 (IST)','UTC+0 (GMT)','UTC-5 (EST)','UTC-6 (CST)','UTC-7 (MST)','UTC-8 (PST)','UTC+1 (CET)','UTC+8 (SGT)','UTC+9 (JST)','UTC+10 (AEST)'];

// ─── Enterprise Security Master Library ────────────────────────────────────────
const MASTER_LIBRARY = [
  {
    id: 'audit', label: 'Audit & Compliance', icon: '📋', color: '#f97316',
    modules: [
      { name: 'SOC 1',                       desc: 'Service org controls for financial reporting' },
      { name: 'SOC 2 Type I',                desc: 'Point-in-time trust services criteria assessment' },
      { name: 'SOC 2 Type II',               desc: 'Period-based trust services criteria assessment' },
      { name: 'SOC 3',                       desc: 'Public-facing trust services summary report' },
      { name: 'ISO 27001',                   desc: 'Information security management system standard' },
      { name: 'ISO 27017',                   desc: 'Cloud security controls and implementation guidance' },
      { name: 'ISO 27018',                   desc: 'Cloud privacy and PII protection standard' },
      { name: 'ISO 27701',                   desc: 'Privacy information management system extension' },
      { name: 'ISO 22301',                   desc: 'Business continuity management system standard' },
      { name: 'ISO 20000',                   desc: 'IT service management international standard' },
      { name: 'ISO 9001',                    desc: 'Quality management systems standard' },
      { name: 'ISO 42001',                   desc: 'AI management system standard' },
      { name: 'PCI DSS v4.0',                desc: 'Payment card industry data security standard' },
      { name: 'HIPAA',                       desc: 'Health information privacy and security rules' },
      { name: 'HITECH',                      desc: 'Health IT for economic and clinical health act' },
      { name: 'HITRUST CSF',                 desc: 'Healthcare information trust alliance framework' },
      { name: 'FedRAMP',                     desc: 'Federal risk and authorization management program' },
      { name: 'FISMA',                       desc: 'Federal information security management act' },
      { name: 'SOX',                         desc: 'Sarbanes-Oxley financial security controls' },
      { name: 'GLBA',                        desc: 'Gramm-Leach-Bliley financial privacy act' },
      { name: 'FERPA',                       desc: 'Family educational rights and privacy act' },
      { name: 'CJIS',                        desc: 'Criminal justice information services security policy' },
      { name: 'NERC CIP',                    desc: 'Critical infrastructure protection for energy sector' },
      { name: 'CSA STAR',                    desc: 'Cloud security alliance trust and assurance registry' },
      { name: 'CMMC 2.0',                    desc: 'Cybersecurity maturity model certification' },
      { name: 'TISAX',                       desc: 'Trusted information security assessment for automotive' },
      { name: 'DORA',                        desc: 'EU digital operational resilience act' },
      { name: 'NIS2 Directive',              desc: 'EU network and information systems directive v2' },
      { name: 'Cyber Essentials',            desc: 'UK baseline cybersecurity certification scheme' },
      { name: 'Cyber Essentials Plus',       desc: 'Enhanced UK cybersecurity with hands-on testing' },
      { name: 'Essential Eight',             desc: 'Australian Cyber Security Centre baseline strategies' },
      { name: 'MAS TRM',                     desc: 'Monetary Authority of Singapore technology risk mgmt' },
      { name: 'SWIFT CSP',                   desc: 'SWIFT customer security program controls' },
      { name: 'RBI Cyber Security Framework',desc: 'Reserve Bank of India cybersecurity guidelines' },
      { name: 'SEBI CSCRF',                  desc: 'Securities and Exchange Board of India cybersecurity' },
      { name: 'DPDP India',                  desc: 'Digital personal data protection act India 2023' },
      { name: 'ENS Spain',                   desc: 'Spanish national security framework' },
      { name: 'NESA UAE',                    desc: 'National Electronic Security Authority UAE standard' },
      { name: 'SAMA CSF',                    desc: 'Saudi Arabian Monetary Authority cybersecurity framework' },
      { name: 'CSA CCM',                     desc: 'Cloud security alliance cloud controls matrix' },
      { name: 'IASME Cyber Assurance',       desc: 'UK SME-focused cyber assurance standard' },
      { name: 'Sarbanes-Oxley IT Controls',  desc: 'IT-specific Sarbanes-Oxley compliance controls' },
      { name: 'COBIT 2019',                  desc: 'IT governance and management framework' },
    ],
  },
  {
    id: 'frameworks', label: 'Security Frameworks', icon: '🛡️', color: '#3b82f6',
    modules: [
      { name: 'NIST CSF 2.0',                desc: 'NIST cybersecurity framework govern identify protect detect respond recover' },
      { name: 'NIST 800-53 Rev 5',           desc: 'Security and privacy controls catalog for federal systems' },
      { name: 'NIST 800-171',                desc: 'Protecting controlled unclassified information' },
      { name: 'NIST 800-172',                desc: 'Enhanced CUI security requirements' },
      { name: 'NIST 800-82',                 desc: 'Industrial control systems security guide' },
      { name: 'NIST AI RMF',                 desc: 'Artificial intelligence risk management framework' },
      { name: 'CIS Controls v8',             desc: 'Center for internet security top 18 controls' },
      { name: 'CIS Benchmarks',              desc: 'Secure configuration guides for 100+ platforms' },
      { name: 'MITRE ATT&CK',               desc: 'Adversarial tactics techniques and common knowledge' },
      { name: 'MITRE D3FEND',               desc: 'Cybersecurity countermeasure knowledge graph' },
      { name: 'COSO ERM',                    desc: 'Enterprise risk management integrated framework' },
      { name: 'ITIL 4',                      desc: 'IT service management best practice framework' },
      { name: 'SABSA',                       desc: 'Sherwood applied business security architecture' },
      { name: 'TOGAF',                       desc: 'The open group enterprise architecture framework' },
      { name: 'FAIR',                        desc: 'Factor analysis of information risk quantification' },
      { name: 'Zero Trust Architecture',     desc: 'Never trust always verify network security model' },
      { name: 'Lockheed Cyber Kill Chain',   desc: 'Attack lifecycle intrusion detection framework' },
      { name: 'Diamond Model',               desc: 'Intrusion analysis framework for threat attribution' },
      { name: 'OCTAVE',                      desc: 'Operationally critical threat asset vulnerability evaluation' },
      { name: 'PASTA',                       desc: 'Process for attack simulation and threat analysis' },
      { name: 'STRIDE',                      desc: 'Threat modeling for spoofing tampering repudiation' },
      { name: 'DREAD',                       desc: 'Risk rating for damage reproducibility exploitability' },
      { name: 'ISA/IEC 62443',               desc: 'Industrial automation and control systems security' },
      { name: 'VERIS',                       desc: 'Vocabulary for event recording and incident sharing' },
      { name: 'Vulnerability Management',    desc: 'Scan track and remediate security vulnerabilities' },
      { name: 'Incident Response',           desc: 'Prepare detect and respond to security incidents' },
      { name: 'Security Operations (SOC)',   desc: '24/7 security monitoring and threat response' },
      { name: 'Threat Intelligence',         desc: 'Monitor and act on emerging threat intelligence' },
      { name: 'Network Security',            desc: 'Firewall IDS/IPS and network monitoring controls' },
      { name: 'Physical Security',           desc: 'Facility access and physical control requirements' },
    ],
  },
  {
    id: 'tools', label: 'Security Tools', icon: '⚙️', color: '#06b6d4',
    modules: [
      { name: 'SIEM & Log Management',       desc: 'Centralize and analyze security events and logs' },
      { name: 'Endpoint Protection',         desc: 'Protect desktops laptops and mobile endpoints' },
      { name: 'MDM & Endpoint Management',   desc: 'Manage and secure mobile and endpoint devices' },
      { name: 'Email Security',              desc: 'Email threat protection filtering and sandboxing' },
      { name: 'DLP (Data Loss Prevention)',  desc: 'Prevent unauthorized data exfiltration' },
      { name: 'PAM (Privileged Access Mgmt)',desc: 'Secure privileged account and session management' },
      { name: 'Patch Management',            desc: 'Systematically apply and track security patches' },
      { name: 'Asset Inventory & CMDB',      desc: 'Track all hardware software and cloud assets' },
      { name: 'Security Policy Management',  desc: 'Create manage and enforce security policies' },
      { name: 'Forensics & Investigation',   desc: 'Digital forensics and incident investigation tools' },
      { name: 'Security Reporting & Dashboards', desc: 'Metrics KPIs and executive security dashboards' },
      { name: 'Backup & Recovery',           desc: 'Protect and restore critical data and systems' },
      { name: 'Security Awareness & Training', desc: 'Employee phishing simulation and security education' },
      { name: 'Nessus',                      desc: 'Industry-standard vulnerability scanner by Tenable' },
      { name: 'Qualys VMDR',                 desc: 'Cloud-based vulnerability management and response' },
      { name: 'Rapid7 InsightVM',            desc: 'Risk-based vulnerability management platform' },
      { name: 'OpenVAS',                     desc: 'Open-source vulnerability scanning framework' },
      { name: 'Splunk SIEM',                 desc: 'Industry-leading SIEM and security analytics' },
      { name: 'IBM QRadar',                  desc: 'Enterprise SIEM with AI-driven threat detection' },
      { name: 'Microsoft Sentinel',          desc: 'Cloud-native SIEM built on Microsoft Azure' },
      { name: 'Elastic SIEM',               desc: 'Open-source SIEM on Elastic Stack platform' },
      { name: 'CrowdStrike Falcon',          desc: 'AI-native endpoint detection and response platform' },
      { name: 'SentinelOne',                 desc: 'Autonomous endpoint security with AI detection' },
      { name: 'Microsoft Defender',          desc: 'Enterprise endpoint security by Microsoft' },
      { name: 'Cortex XDR',                  desc: 'Extended detection and response by Palo Alto' },
      { name: 'Okta',                        desc: 'Identity platform enterprise SSO and MFA' },
      { name: 'CyberArk PAM',               desc: 'Privileged access security and vault platform' },
      { name: 'SailPoint',                   desc: 'Identity governance and administration platform' },
      { name: 'Proofpoint',                  desc: 'Email security and compliance platform' },
      { name: 'Mimecast',                    desc: 'Email security and cyber resilience services' },
      { name: 'Palo Alto NGFW',              desc: 'Next-generation firewall and network security' },
      { name: 'Fortinet FortiGate',          desc: 'Network security and SD-WAN platform' },
      { name: 'Zscaler',                     desc: 'Cloud-native zero trust security platform' },
    ],
  },
  {
    id: 'privacy', label: 'Privacy & Data Protection', icon: '🔒', color: '#8b5cf6',
    modules: [
      { name: 'GDPR',                        desc: 'EU general data protection regulation' },
      { name: 'UK GDPR',                     desc: 'Post-Brexit UK data protection framework' },
      { name: 'CCPA',                        desc: 'California consumer privacy act' },
      { name: 'CPRA',                        desc: 'California privacy rights act enhancement' },
      { name: 'LGPD',                        desc: 'Brazil general data protection law' },
      { name: 'PIPEDA',                      desc: 'Canadian personal information protection law' },
      { name: 'POPIA',                       desc: 'South Africa protection of personal information act' },
      { name: 'PDPA Singapore',              desc: 'Singapore personal data protection act' },
      { name: 'PDPA Thailand',               desc: 'Thailand personal data protection act' },
      { name: 'DPDP India',                  desc: 'India digital personal data protection act' },
      { name: 'Swiss DPA',                   desc: 'Switzerland revised federal data protection act' },
      { name: 'Virginia CDPA',               desc: 'Virginia consumer data protection act' },
      { name: 'Colorado Privacy Act',        desc: 'Colorado consumer data protection framework' },
      { name: 'Connecticut Privacy Act',     desc: 'Connecticut data privacy and online monitoring act' },
      { name: 'Texas Privacy Act',           desc: 'Texas data privacy and security act' },
      { name: 'Data Protection & Privacy',   desc: 'Classify protect and manage sensitive data assets' },
    ],
  },
  {
    id: 'cloud', label: 'Cloud Security', icon: '☁️', color: '#0ea5e9',
    modules: [
      { name: 'Cloud Security & CSPM',       desc: 'Cloud security posture management across providers' },
      { name: 'Container & Kubernetes Security', desc: 'Secure containerized and orchestrated workloads' },
      { name: 'AWS Security',                desc: 'Amazon web services security controls and services' },
      { name: 'Azure Security',              desc: 'Microsoft Azure security posture and controls' },
      { name: 'GCP Security',                desc: 'Google cloud platform security configuration' },
      { name: 'Serverless Security',         desc: 'Security for functions-as-a-service workloads' },
      { name: 'Cloud Native Security',       desc: 'CNAPP security for cloud-native architectures' },
      { name: 'Infrastructure as Code Security', desc: 'Security scanning for Terraform Ansible ARM templates' },
      { name: 'Cloud Access Security Broker', desc: 'CASB visibility and control for cloud services' },
      { name: 'Multi-Cloud Governance',      desc: 'Unified governance across hybrid multi-cloud environments' },
    ],
  },
  {
    id: 'risk', label: 'Risk Management', icon: '⚠️', color: '#ef4444',
    modules: [
      { name: 'Risk Management',             desc: 'Identify assess and treat information security risks' },
      { name: 'Third-Party & Vendor Risk',   desc: 'Assess and monitor vendor security posture' },
      { name: 'Supply Chain Security',       desc: 'Secure the software and hardware supply chain' },
      { name: 'Operational Risk Management', desc: 'Identify and mitigate operational risk events' },
      { name: 'Cyber Risk Quantification',   desc: 'Financial quantification of cyber risk exposure' },
      { name: 'IT Risk Assessment',          desc: 'Structured assessment of IT risk and controls' },
      { name: 'Risk Register Management',    desc: 'Maintain and track enterprise risk register' },
      { name: 'Risk Appetite Framework',     desc: 'Define and manage organizational risk tolerance' },
    ],
  },
  {
    id: 'governance', label: 'Governance', icon: '🏛️', color: '#14b8a6',
    modules: [
      { name: 'Information Security Governance', desc: 'Board-level oversight of information security program' },
      { name: 'Security Policy Management',  desc: 'Create manage and enforce security policies' },
      { name: 'Security Reporting & Dashboards', desc: 'Executive KPI metrics and security reporting' },
      { name: 'Security Awareness & Training', desc: 'Security culture and employee education programs' },
      { name: 'Audit Management',            desc: 'Internal and external audit planning and tracking' },
      { name: 'Compliance Management',       desc: 'Unified compliance obligation tracking and management' },
      { name: 'Security Program Management', desc: 'Manage budget roadmap and strategic security initiatives' },
      { name: 'Vendor Governance',           desc: 'Oversight and controls for third-party relationships' },
    ],
  },
  {
    id: 'bcdr', label: 'Business Continuity & DR', icon: '🔄', color: '#22c55e',
    modules: [
      { name: 'Business Continuity & DR',    desc: 'Ensure organizational resilience and recovery capability' },
      { name: 'Backup & Recovery',           desc: 'Protect and restore critical data and systems' },
      { name: 'Disaster Recovery Planning',  desc: 'IT recovery procedures and RTO/RPO management' },
      { name: 'Business Impact Analysis',    desc: 'Assess operational impact of disruptions' },
      { name: 'Crisis Management',           desc: 'Organizational response to major incidents and crises' },
      { name: 'Resilience Testing',          desc: 'Tabletop exercises and recovery drills' },
      { name: 'Pandemic & Epidemic Planning',desc: 'Workforce continuity for biological threat events' },
      { name: 'Supply Chain Resilience',     desc: 'Continuity planning for critical supply dependencies' },
    ],
  },
  {
    id: 'iam', label: 'Identity & Access Management', icon: '🔑', color: '#f59e0b',
    modules: [
      { name: 'Identity & Access Management', desc: 'Control who can access what resources and when' },
      { name: 'PAM (Privileged Access Mgmt)', desc: 'Secure and audit privileged account access' },
      { name: 'Multi-Factor Authentication', desc: 'Enforce additional verification beyond passwords' },
      { name: 'Single Sign-On (SSO)',         desc: 'Unified authentication across enterprise applications' },
      { name: 'Identity Governance',          desc: 'Access certifications provisioning and lifecycle management' },
      { name: 'Zero Trust Identity',          desc: 'Continuous identity verification for every access request' },
      { name: 'Passwordless Authentication',  desc: 'Eliminate passwords using FIDO2 biometrics and keys' },
      { name: 'Directory Services',           desc: 'LDAP Active Directory and cloud directory management' },
      { name: 'Just-In-Time Access',          desc: 'Temporary elevated access for privileged operations' },
      { name: 'Access Recertification',       desc: 'Periodic review and approval of user access rights' },
    ],
  },
  {
    id: 'devsecops', label: 'DevSecOps', icon: '🔧', color: '#6366f1',
    modules: [
      { name: 'DevSecOps & Secure SDLC',     desc: 'Embed security into development pipelines' },
      { name: 'Application Security',        desc: 'Secure software development and testing practices' },
      { name: 'SAST (Static Analysis)',      desc: 'Source code security scanning and analysis' },
      { name: 'DAST (Dynamic Analysis)',     desc: 'Runtime security testing for running applications' },
      { name: 'SCA (Software Composition)', desc: 'Open-source dependency vulnerability scanning' },
      { name: 'Secrets Management',          desc: 'Secure storage and rotation of credentials and keys' },
      { name: 'Secure Code Review',          desc: 'Manual and automated security-focused code reviews' },
      { name: 'Container Security',          desc: 'Docker and container image vulnerability scanning' },
      { name: 'Pipeline Security',           desc: 'CI/CD pipeline security gates and controls' },
      { name: 'IaC Security Scanning',       desc: 'Infrastructure as code misconfiguration detection' },
    ],
  },
  {
    id: 'appsec', label: 'Application Security', icon: '🖧', color: '#ec4899',
    modules: [
      { name: 'OWASP Top 10',               desc: 'Top ten web application security risk mitigations' },
      { name: 'OWASP ASVS',                 desc: 'Application security verification standard' },
      { name: 'OWASP SAMM',                 desc: 'Software assurance maturity model' },
      { name: 'OWASP API Top 10',           desc: 'Top API security risks and mitigations' },
      { name: 'OWASP MASVS',               desc: 'Mobile application security verification standard' },
      { name: 'Web Application Firewall',   desc: 'Layer-7 protection and application traffic filtering' },
      { name: 'API Security',               desc: 'Authentication authorization and API threat protection' },
      { name: 'Mobile App Security',        desc: 'iOS and Android application security controls' },
      { name: 'Penetration Testing',        desc: 'Authorized offensive security testing and reporting' },
      { name: 'Bug Bounty Program',         desc: 'Crowdsourced vulnerability disclosure and rewards' },
    ],
  },
  {
    id: 'threat', label: 'Threat Intelligence', icon: '🕵️', color: '#84cc16',
    modules: [
      { name: 'Threat Intelligence',        desc: 'Monitor and act on emerging threats and IOCs' },
      { name: 'Threat Hunting',             desc: 'Proactive adversary search across environment' },
      { name: 'Dark Web Monitoring',        desc: 'Monitor dark web for credential and data leaks' },
      { name: 'Forensics & Investigation',  desc: 'Digital forensics and incident investigation' },
      { name: 'Malware Analysis',           desc: 'Static and dynamic malware reverse engineering' },
      { name: 'Attack Surface Management',  desc: 'Discover and reduce external attack surface' },
      { name: 'Brand Protection',           desc: 'Monitor and protect brand from cyber threats' },
      { name: 'Fraud Intelligence',         desc: 'Detect and prevent fraud using threat feeds' },
    ],
  },
  {
    id: 'ot', label: 'Operational Technology (OT)', icon: '🏭', color: '#a16207',
    modules: [
      { name: 'OT / IoT Security',          desc: 'Operational technology and IoT device security' },
      { name: 'ICS Security',               desc: 'Industrial control systems security assessment' },
      { name: 'SCADA Security',             desc: 'SCADA and distributed control systems protection' },
      { name: 'ISA/IEC 62443',              desc: 'Industrial automation and control security standard' },
      { name: 'OT Network Segmentation',    desc: 'Air-gapping and network segmentation for OT' },
      { name: 'Industrial IoT Security',    desc: 'Security for industrial internet of things devices' },
      { name: 'Embedded Systems Security',  desc: 'Security for firmware and embedded devices' },
      { name: 'OT Incident Response',       desc: 'Incident response planning for OT environments' },
    ],
  },
  {
    id: 'ai', label: 'AI Governance & AI Security', icon: '🤖', color: '#7c3aed',
    modules: [
      { name: 'AI Governance',              desc: 'Policies and oversight for responsible AI deployment' },
      { name: 'ISO 42001',                  desc: 'AI management system standard' },
      { name: 'NIST AI RMF',               desc: 'Artificial intelligence risk management framework' },
      { name: 'EU AI Act',                  desc: 'European union artificial intelligence regulation' },
      { name: 'AI Security Testing',        desc: 'Adversarial testing of AI and ML systems' },
      { name: 'LLM Security',               desc: 'Large language model specific security controls' },
      { name: 'Model Risk Management',      desc: 'Governance of ML model risk and validation' },
      { name: 'Algorithmic Bias Assessment',desc: 'Detect and mitigate bias in AI decision systems' },
    ],
  },
  {
    id: 'vendor', label: 'Vendor Risk Management', icon: '🤝', color: '#0891b2',
    modules: [
      { name: 'Third-Party & Vendor Risk',  desc: 'Assess and monitor vendor security posture' },
      { name: 'Supply Chain Security',      desc: 'Secure the software and hardware supply chain' },
      { name: 'Vendor Due Diligence',       desc: 'Pre-contract vendor security assessment process' },
      { name: 'SIG Questionnaire',          desc: 'Standardized information gathering for vendors' },
      { name: 'VSQ (Vendor Security Questionnaire)', desc: 'Customized security questionnaire for suppliers' },
      { name: 'Fourth-Party Risk',          desc: 'Risk management for sub-processors and sub-vendors' },
      { name: 'Vendor Onboarding',          desc: 'Security requirements for vendor onboarding lifecycle' },
      { name: 'Contract Compliance Monitoring', desc: 'Ongoing vendor contract security obligation tracking' },
    ],
  },
  {
    id: 'industry', label: 'Industry Regulations', icon: '🏢', color: '#d97706',
    modules: [
      { name: 'HIPAA',                      desc: 'Health information privacy and security rules' },
      { name: 'PCI DSS v4.0',               desc: 'Payment card industry data security standard' },
      { name: 'GLBA',                       desc: 'Gramm-Leach-Bliley financial services privacy' },
      { name: 'FERPA',                      desc: 'Family educational rights and privacy act' },
      { name: 'CJIS',                       desc: 'Criminal justice information services security' },
      { name: 'NERC CIP',                   desc: 'Critical infrastructure protection energy sector' },
      { name: 'TSA Security Directives',    desc: 'Transportation security administration directives' },
      { name: 'COPPA',                      desc: 'Children online privacy protection act' },
      { name: 'TCPA',                       desc: 'Telephone consumer protection act' },
      { name: 'CAN-SPAM Act',               desc: 'Email marketing compliance requirements' },
      { name: 'AML/KYC Compliance',         desc: 'Anti-money laundering and know your customer' },
      { name: 'FATF Recommendations',       desc: 'Financial action task force AML standards' },
    ],
  },
  {
    id: 'regional', label: 'Regional Regulations', icon: '🌐', color: '#059669',
    modules: [
      { name: 'GDPR',                       desc: 'EU general data protection regulation' },
      { name: 'NIS2 Directive',             desc: 'EU network and information systems directive' },
      { name: 'DORA',                       desc: 'EU digital operational resilience act' },
      { name: 'Cyber Resilience Act',       desc: 'EU cyber resilience act for digital products' },
      { name: 'UK GDPR',                    desc: 'Post-Brexit UK data protection framework' },
      { name: 'UK Cyber Essentials',        desc: 'UK national cybersecurity certification scheme' },
      { name: 'DPDP India',                desc: 'India digital personal data protection act' },
      { name: 'RBI Cyber Security Framework', desc: 'Reserve Bank of India cybersecurity guidelines' },
      { name: 'PDPA Singapore',             desc: 'Singapore personal data protection act' },
      { name: 'Essential Eight Australia',  desc: 'Australian Cyber Security Centre strategies' },
    ],
  },
  {
    id: 'financial', label: 'Financial Regulations', icon: '💰', color: '#ca8a04',
    modules: [
      { name: 'SOX',                        desc: 'Sarbanes-Oxley financial controls and reporting' },
      { name: 'PCI DSS v4.0',               desc: 'Payment card industry data security standard' },
      { name: 'GLBA',                       desc: 'Gramm-Leach-Bliley financial privacy act' },
      { name: 'Basel III / IV',             desc: 'Banking regulation capital and risk requirements' },
      { name: 'DORA',                       desc: 'EU digital operational resilience act for finance' },
      { name: 'MAS TRM',                    desc: 'Monetary Authority of Singapore technology risk' },
      { name: 'SAMA CSF',                   desc: 'Saudi Arabian Monetary Authority cybersecurity' },
      { name: 'SEBI CSCRF',                 desc: 'Securities Board of India cybersecurity framework' },
      { name: 'RBI Cyber Security Framework', desc: 'Reserve Bank of India cybersecurity guidelines' },
      { name: 'SWIFT CSP',                  desc: 'SWIFT customer security programme controls' },
    ],
  },
  {
    id: 'healthcare', label: 'Healthcare Regulations', icon: '⚕️', color: '#dc2626',
    modules: [
      { name: 'HIPAA Security Rule',        desc: 'Technical safeguards for protected health information' },
      { name: 'HIPAA Privacy Rule',         desc: 'Use and disclosure of protected health information' },
      { name: 'HITECH',                     desc: 'Health IT for economic and clinical health act' },
      { name: 'HITRUST CSF',               desc: 'Healthcare information trust alliance framework' },
      { name: '21 CFR Part 11',             desc: 'FDA electronic records and signatures regulation' },
      { name: 'GDPR Health Data',           desc: 'GDPR special category health data processing' },
      { name: 'EU MDR',                     desc: 'EU medical device regulation 2017/745' },
      { name: 'HL7 FHIR Security',          desc: 'Security for healthcare interoperability standard' },
    ],
  },
  {
    id: 'govdef', label: 'Government & Defense', icon: '🎖️', color: th('#374151', { dark: '#CBD5E1' }),
    modules: [
      { name: 'FedRAMP',                    desc: 'Federal risk and authorization management program' },
      { name: 'FISMA',                      desc: 'Federal information security management act' },
      { name: 'NIST 800-53 Rev 5',          desc: 'Security and privacy controls for federal systems' },
      { name: 'NIST 800-171',               desc: 'Protecting controlled unclassified information' },
      { name: 'CMMC 2.0',                   desc: 'Cybersecurity maturity model certification DoD' },
      { name: 'DISA STIG',                  desc: 'Defense information systems agency security guidelines' },
      { name: 'IRS Publication 1075',       desc: 'Tax information security guidelines' },
      { name: 'CJIS Security Policy',       desc: 'Criminal justice information services requirements' },
      { name: 'DoD IL4 / IL5',              desc: 'Department of defense impact level 4 and 5' },
      { name: 'ITAR Compliance',            desc: 'International traffic in arms regulations compliance' },
    ],
  },
];

// Flat list for compatibility with integrations filtering and user management
const ALL_MODULES = MASTER_LIBRARY.flatMap(g => g.modules);

// Module recommendations map
const RECOMMENDATIONS_MAP = {
  'SOC 2 Type II':    ['ISO 27001','NIST CSF 2.0','CIS Controls v8','GDPR','ISO 27701'],
  'ISO 27001':        ['SOC 2 Type II','ISO 27701','NIST CSF 2.0','ISO 27017','ISO 27018'],
  'HIPAA':            ['HITRUST CSF','HITECH','ISO 27001','NIST 800-53 Rev 5','GDPR Health Data'],
  'PCI DSS v4.0':     ['SOC 2 Type II','ISO 27001','NIST CSF 2.0','PA-DSS','P2PE'],
  'FedRAMP':          ['FISMA','NIST 800-53 Rev 5','NIST 800-171','CMMC 2.0','DISA STIG'],
  'GDPR':             ['UK GDPR','ISO 27701','ISO 27001','CCPA','DPDP India'],
  'NIST CSF 2.0':     ['NIST 800-53 Rev 5','CIS Controls v8','ISO 27001','MITRE ATT&CK','Zero Trust Architecture'],
  'CMMC 2.0':         ['NIST 800-171','NIST 800-172','FedRAMP','FISMA','DISA STIG'],
  'DORA':             ['NIS2 Directive','ISO 22301','ISO 27001','Business Continuity & DR','MAS TRM'],
};

// Industry client presets
const CLIENT_PRESETS = [
  { label: 'Healthcare',   icon: '⚕️',  modules: ['HIPAA','HITECH','HITRUST CSF','ISO 27001','GDPR Health Data','21 CFR Part 11'] },
  { label: 'Finance',      icon: '💰',  modules: ['PCI DSS v4.0','SOX','GLBA','DORA','MAS TRM','SWIFT CSP','ISO 27001'] },
  { label: 'Government',   icon: '🏛️',  modules: ['FedRAMP','FISMA','NIST 800-53 Rev 5','CMMC 2.0','CJIS Security Policy','DISA STIG'] },
  { label: 'SaaS / Tech',  icon: '💻',  modules: ['SOC 2 Type II','ISO 27001','NIST CSF 2.0','GDPR','CCPA','CIS Controls v8'] },
  { label: 'Retail',       icon: '🛒',  modules: ['PCI DSS v4.0','GDPR','CCPA','SOC 2 Type II','ISO 27001'] },
  { label: 'Manufacturing',icon: '🏭',  modules: ['ISO 27001','OT / IoT Security','ISA/IEC 62443','ICS Security','NERC CIP'] },
];



const BRANDING_DOCS = [
  { key: 'logo',              label: 'Company Logo',      accept: '.png,.jpg,.jpeg', formats: 'PNG · JPG' },
  { key: 'nda',               label: 'NDA',               accept: '.pdf,.docx',      formats: 'PDF · DOCX' },
  { key: 'client_agreements', label: 'Client Agreements', accept: '.pdf,.docx',      formats: 'PDF · DOCX' },
  { key: 'other',             label: 'Other Documents',   accept: '.pdf,.docx,.png,.jpg,.xlsx', formats: 'PDF · DOCX · PNG · JPG · XLSX' },
];

const DOC_STATUS_CONFIG = {
  uploaded: { label: 'Uploaded',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  icon: '✓' },
  pending:  { label: 'Pending',   cls: 'bg-slate-100 text-slate-600 border-slate-200',         icon: '○' },
  expired:  { label: 'Expired',   cls: 'bg-red-50 text-red-700 border-red-200',         icon: '✕' },
};

const INTEGRATION_CATALOG = [
  {
    id: 'siem',
    label: 'SIEM & Log Management',
    icon: '📡',
    modules: ['Security Operations (SOC)', 'SIEM & Log Management', 'Threat Intelligence', 'Incident Response'],
    tools: [
      { name: 'Splunk', desc: 'Industry-leading SIEM and security analytics' },
      { name: 'IBM QRadar', desc: 'Enterprise SIEM with AI-driven threat detection' },
      { name: 'Microsoft Sentinel', desc: 'Cloud-native SIEM built on Azure' },
      { name: 'Elastic SIEM', desc: 'Open-source SIEM on Elastic Stack' },
      { name: 'Sumo Logic', desc: 'Cloud-based log analytics and SIEM' },
      { name: 'LogRhythm', desc: 'SIEM with UEBA and SOAR capabilities' },
      { name: 'Exabeam', desc: 'AI-driven SIEM and behavioral analytics' },
      { name: 'Securonix', desc: 'Next-gen SIEM with machine learning' },
      { name: 'Graylog', desc: 'Open-source log management platform' },
      { name: 'Wazuh', desc: 'Open-source security monitoring platform' },
    ],
  },
  {
    id: 'vuln',
    label: 'Vulnerability & Scanning',
    icon: '🔍',
    modules: ['Vulnerability Management', 'Penetration Testing', 'Patch Management', 'Application Security'],
    tools: [
      { name: 'Tenable.io / Nessus', desc: 'Industry-standard vulnerability scanner' },
      { name: 'Qualys VMDR', desc: 'Cloud-based vulnerability management' },
      { name: 'Rapid7 InsightVM', desc: 'Risk-based vulnerability management' },
      { name: 'OpenVAS / Greenbone', desc: 'Open-source vulnerability scanner' },
      { name: 'Burp Suite Pro', desc: 'Web application security testing' },
      { name: 'Snyk', desc: 'Developer-focused open-source security' },
      { name: 'Checkmarx', desc: 'SAST/DAST application security testing' },
      { name: 'Veracode', desc: 'Cloud-based AppSec testing platform' },
      { name: 'SonarQube', desc: 'Continuous code quality and security' },
      { name: 'Metasploit', desc: 'Penetration testing framework' },
    ],
  },
  {
    id: 'ticketing',
    label: 'Ticketing & ITSM',
    icon: '🎫',
    modules: ['Incident Response', 'Risk Management', 'Vulnerability Management'],
    tools: [
      { name: 'Jira', desc: 'Project and issue tracking by Atlassian' },
      { name: 'ServiceNow', desc: 'Enterprise ITSM and workflow automation' },
      { name: 'PagerDuty', desc: 'On-call and incident response management' },
      { name: 'Zendesk', desc: 'Customer service and support ticketing' },
      { name: 'Freshservice', desc: 'Cloud-based ITSM solution' },
      { name: 'Opsgenie', desc: 'Alert and on-call management' },
      { name: 'ManageEngine ServiceDesk', desc: 'IT service management platform' },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud Security',
    icon: '☁️',
    modules: ['Cloud Security & CSPM', 'Asset Inventory & CMDB', 'Zero Trust Architecture', 'Container & Kubernetes Security'],
    tools: [
      { name: 'AWS Security Hub', desc: 'Centralized security posture for AWS' },
      { name: 'Microsoft Defender for Cloud', desc: 'Cloud security posture management on Azure' },
      { name: 'Google Cloud Security Command Center', desc: 'Security for GCP workloads' },
      { name: 'Prisma Cloud (Palo Alto)', desc: 'Comprehensive CNAPP platform' },
      { name: 'Wiz', desc: 'Agentless cloud security and CSPM' },
      { name: 'Lacework', desc: 'Cloud security and compliance platform' },
      { name: 'Orca Security', desc: 'Agentless full-stack cloud security' },
      { name: 'Cloudflare', desc: 'Network security and CDN platform' },
    ],
  },
  {
    id: 'iam',
    label: 'Identity & Access Management',
    icon: '🔑',
    modules: ['Identity & Access Management', 'PAM (Privileged Access Management)', 'Zero Trust Architecture'],
    tools: [
      { name: 'Okta', desc: 'Identity platform and enterprise SSO' },
      { name: 'Microsoft Entra ID (Azure AD)', desc: 'Cloud identity and access management' },
      { name: 'CyberArk PAM', desc: 'Privileged access security platform' },
      { name: 'SailPoint', desc: 'Identity governance and administration' },
      { name: 'BeyondTrust', desc: 'PAM and remote access security' },
      { name: 'Ping Identity', desc: 'Enterprise identity security' },
      { name: 'JumpCloud', desc: 'Open directory platform and SSO' },
      { name: 'OneLogin', desc: 'Unified access management platform' },
    ],
  },
  {
    id: 'endpoint',
    label: 'Endpoint Security & MDM',
    icon: '💻',
    modules: ['Endpoint Protection', 'MDM & Endpoint Management', 'Asset Inventory & CMDB'],
    tools: [
      { name: 'CrowdStrike Falcon', desc: 'AI-native endpoint protection platform' },
      { name: 'SentinelOne', desc: 'Autonomous endpoint security' },
      { name: 'Microsoft Defender for Endpoint', desc: 'Enterprise endpoint security' },
      { name: 'VMware Carbon Black', desc: 'Next-gen endpoint security' },
      { name: 'Sophos', desc: 'Synchronized security ecosystem' },
      { name: 'Trend Micro Apex One', desc: 'Hybrid cloud endpoint security' },
      { name: 'Microsoft Intune', desc: 'Cloud-based MDM and MAM' },
      { name: 'Jamf', desc: 'Apple device management platform' },
    ],
  },
  {
    id: 'email',
    label: 'Email Security',
    icon: '📧',
    modules: ['Email Security'],
    tools: [
      { name: 'Proofpoint', desc: 'Email security and compliance platform' },
      { name: 'Mimecast', desc: 'Email security and cyber resilience' },
      { name: 'Microsoft Defender for Office 365', desc: 'Cloud-based email security' },
      { name: 'Barracuda Email Security', desc: 'Email security gateway and filtering' },
      { name: 'Abnormal Security', desc: 'AI-native behavioral email security' },
      { name: 'Avanan (Check Point)', desc: 'Cloud email security solution' },
    ],
  },
  {
    id: 'grc',
    label: 'GRC & Compliance Automation',
    icon: '📊',
    modules: ['Risk Management', 'SOC 2 (Type I & II)', 'ISO 27001', 'GDPR Compliance', 'HIPAA', 'PCI DSS', 'Security Policy Management'],
    tools: [
      { name: 'ServiceNow GRC', desc: 'Enterprise GRC platform' },
      { name: 'RSA Archer', desc: 'Enterprise GRC and risk management' },
      { name: 'OneTrust', desc: 'Trust intelligence and privacy platform' },
      { name: 'Vanta', desc: 'Automated security and compliance' },
      { name: 'Drata', desc: 'Continuous compliance automation' },
      { name: 'Secureframe', desc: 'SOC 2, ISO 27001, HIPAA automation' },
      { name: 'LogicGate', desc: 'Risk and compliance management' },
      { name: 'MetricStream', desc: 'Integrated GRC platform' },
      { name: 'Hyperproof', desc: 'Compliance operations platform' },
    ],
  },
  {
    id: 'threat',
    label: 'Threat Intelligence',
    icon: '🕵️',
    modules: ['Threat Intelligence', 'Security Operations (SOC)'],
    tools: [
      { name: 'Recorded Future', desc: 'Threat intelligence platform' },
      { name: 'ThreatConnect', desc: 'Intelligence-driven security operations' },
      { name: 'Anomali', desc: 'Threat intelligence management' },
      { name: 'VirusTotal Enterprise', desc: 'File and URL security analysis' },
      { name: 'MISP', desc: 'Open-source threat intelligence sharing' },
      { name: 'CrowdStrike Threat Intelligence', desc: 'Adversary and malware intelligence' },
      { name: 'Mandiant Advantage', desc: 'Threat intelligence and response' },
    ],
  },
  {
    id: 'network',
    label: 'Network Security',
    icon: '🌐',
    modules: ['Network Security', 'Cloud Security & CSPM', 'Zero Trust Architecture'],
    tools: [
      { name: 'Palo Alto Networks NGFW', desc: 'Next-generation firewall platform' },
      { name: 'Fortinet FortiGate', desc: 'Network security and SD-WAN' },
      { name: 'Cisco SecureX', desc: 'Integrated Cisco security platform' },
      { name: 'Check Point', desc: 'Cyber security solutions' },
      { name: 'Darktrace', desc: 'AI-powered network detection and response' },
      { name: 'Vectra AI', desc: 'AI-driven NDR platform' },
      { name: 'Zscaler', desc: 'Cloud-native zero trust security' },
    ],
  },
  {
    id: 'devsecops',
    label: 'DevSecOps',
    icon: '⚙️',
    modules: ['Application Security', 'DevSecOps & Secure SDLC', 'Container & Kubernetes Security'],
    tools: [
      { name: 'GitHub Advanced Security', desc: 'Code scanning and secret detection' },
      { name: 'GitLab Security', desc: 'Built-in DevSecOps capabilities' },
      { name: 'HashiCorp Vault', desc: 'Secrets management platform' },
      { name: 'Aqua Security', desc: 'Cloud-native application security' },
      { name: 'Prisma Cloud (Container)', desc: 'Container and Kubernetes security' },
      { name: 'Snyk Container', desc: 'Container image vulnerability scanning' },
    ],
  },
  {
    id: 'backup',
    label: 'Backup & Business Continuity',
    icon: '💾',
    modules: ['Business Continuity & DR', 'Backup & Recovery'],
    tools: [
      { name: 'Veeam', desc: 'Enterprise backup and recovery' },
      { name: 'Commvault', desc: 'Data protection and management' },
      { name: 'Zerto', desc: 'Cloud disaster recovery platform' },
      { name: 'Acronis Cyber Protect', desc: 'Integrated backup and security' },
      { name: 'AWS Backup', desc: 'Centralized backup for AWS services' },
      { name: 'Azure Backup', desc: 'Cloud-based backup service' },
    ],
  },
  {
    id: 'collab',
    label: 'Collaboration & Productivity',
    icon: '💬',
    modules: ['Incident Response', 'Security Awareness & Training'],
    tools: [
      { name: 'Slack', desc: 'Team messaging and incident coordination' },
      { name: 'Microsoft Teams', desc: 'Unified communication platform' },
      { name: 'Google Workspace', desc: 'Cloud productivity and collaboration' },
      { name: 'Confluence', desc: 'Team wiki and documentation' },
    ],
  },
];

const STEPS = [
  { label: 'Company Details',               icon: '🏢', key: 'company_details',       governed: true  },
  { label: 'Escalation Matrix',             icon: '📞', key: 'escalation_matrix',      governed: true  },
  { label: 'Branding & Legal',              icon: '🎨', key: 'branding_legal',         governed: true  },
  { label: 'Contract Tenure',               icon: '📄', key: 'contract_tenure',        governed: true  },
  { label: 'Asset Inventory',               icon: '🗺️', key: 'asset_inventory',        governed: true  },
  { label: 'Asset & Employee Registry',     icon: '🗂️', key: 'asset_registry',         governed: true  },
  { label: 'Platform Configuration',        icon: '⚙️', key: 'platform_config',        governed: true  },
  { label: 'Framework Selection',           icon: '🏗️', key: 'framework_selection',    governed: true  },
  { label: 'Security Domains Review',       icon: '🔐', key: 'security_domains',       governed: true  },
  { label: 'Controls Review',               icon: '📋', key: 'controls_review',        governed: true  },
  { label: 'Security Tools Selection',      icon: '🛠️', key: 'security_tools',         governed: true  },
  { label: 'Integrations',                  icon: '🔌', key: 'integrations',           governed: true  },
  { label: 'User Management',               icon: '👥', key: 'user_management',        governed: false },
  { label: 'Review & Complete',             icon: '✅', key: 'review_complete',        governed: false },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getValidToken() {
  return (
    localStorage.getItem('vciso_token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('owner_token') ||
    sessionStorage.getItem('vciso_token') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    ''
  );
}

function authHeader() {
  const token = getValidToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}


function api(path, opts = {}) {
  return fetch(path, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...opts.headers },
    ...opts,
  }).then(r => r.json());
}

function SaveIndicator({ state }) {
  if (state === 'saving') return <span className="text-xs text-yellow-400 flex items-center gap-1">⏳ Saving…</span>;
  if (state === 'saved')  return <span className="text-xs text-green-400 flex items-center gap-1">✅ Saved</span>;
  return null;
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-slate-400 shadow-sm transition";
const selectCls = inputCls + " cursor-pointer";

// ─── Country Dial Codes ───────────────────────────────────────────────────────
const COUNTRY_DIAL_CODES = [
  { code: '+91', country: 'IN', label: '🇮🇳 +91 (India)' },
  { code: '+1', country: 'US', label: '🇺🇸 +1 (US / Canada)' },
  { code: '+44', country: 'GB', label: '🇬🇧 +44 (UK)' },
  { code: '+971', country: 'AE', label: '🇦🇪 +971 (UAE)' },
  { code: '+65', country: 'SG', label: '🇸🇬 +65 (Singapore)' },
  { code: '+61', country: 'AU', label: '🇦🇺 +61 (Australia)' },
  { code: '+49', country: 'DE', label: '🇩🇪 +49 (Germany)' },
  { code: '+33', country: 'FR', label: '🇫🇷 +33 (France)' },
  { code: '+81', country: 'JP', label: '🇯🇵 +81 (Japan)' },
  { code: '+86', country: 'CN', label: '🇨🇳 +86 (China)' },
  { code: '+966', country: 'SA', label: '🇸🇦 +966 (Saudi Arabia)' },
  { code: '+41', country: 'CH', label: '🇨🇭 +41 (Switzerland)' },
  { code: '+31', country: 'NL', label: '🇳🇱 +31 (Netherlands)' },
  { code: '+353', country: 'IE', label: '🇮🇪 +353 (Ireland)' },
  { code: '+64', country: 'NZ', label: '🇳🇿 +64 (New Zealand)' },
  { code: '+27', country: 'ZA', label: '🇿🇦 +27 (South Africa)' },
  { code: '+55', country: 'BR', label: '🇧🇷 +55 (Brazil)' },
  { code: '+60', country: 'MY', label: '🇲🇾 +60 (Malaysia)' },
  { code: '+62', country: 'ID', label: '🇮🇩 +62 (Indonesia)' },
  { code: '+63', country: 'PH', label: '🇵🇭 +63 (Philippines)' },
  { code: '+974', country: 'QA', label: '🇶🇦 +974 (Qatar)' },
  { code: '+968', country: 'OM', label: '🇴🇲 +968 (Oman)' },
  { code: '+965', country: 'KW', label: '🇰🇼 +965 (Kuwait)' },
  { code: '+973', country: 'BH', label: '🇧🇭 +973 (Bahrain)' },
];

function parsePhoneNumber(rawPhone, defaultCountry = '+91') {
  if (!rawPhone) return { countryCode: defaultCountry, number: '' };
  const str = String(rawPhone).trim();
  const match = str.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    const code = match[1];
    const digits = match[2].replace(/\D/g, '').slice(0, 10);
    return { countryCode: code, number: digits };
  }
  const digits = str.replace(/\D/g, '').slice(0, 10);
  return { countryCode: defaultCountry, number: digits };
}

// ─── Geo Data: Country → State → City ─────────────────────────────────────────
const GEO_DATA = {
  'India': {
    'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Tirupati','Rajahmundry','Kakinada','Eluru','Anantapur'],
    'Arunachal Pradesh': ['Itanagar','Naharlagun','Pasighat','Tezpur','Bomdila'],
    'Assam': ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Tezpur','Bongaigaon'],
    'Bihar': ['Patna','Gaya','Bhagalpur','Muzaffarpur','Darbhanga','Purnia','Arrah','Begusarai','Katihar'],
    'Chhattisgarh': ['Raipur','Bhilai','Durg','Bilaspur','Korba','Rajnandgaon','Jagdalpur'],
    'Goa': ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda'],
    'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Gandhinagar','Bhavnagar','Jamnagar','Anand','Junagadh','Nadiad'],
    'Haryana': ['Faridabad','Gurugram','Panipat','Ambala','Hisar','Rohtak','Karnal','Panchkula','Yamunanagar','Sonipat'],
    'Himachal Pradesh': ['Shimla','Manali','Dharamsala','Solan','Mandi','Kullu','Hamirpur'],
    'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Hazaribagh','Deoghar','Giridih'],
    'Karnataka': ['Bengaluru','Mysuru','Hubli','Mangaluru','Belagavi','Ballari','Davanagere','Shivamogga','Tumkur','Udupi'],
    'Kerala': ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Palakkad','Alappuzha','Kannur','Malappuram','Kottayam'],
    'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Dewas','Satna','Rewa','Burhanpur'],
    'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Solapur','Thane','Amravati','Navi Mumbai','Kolhapur','Pimpri-Chinchwad','Kalyan'],
    'Manipur': ['Imphal','Thoubal','Bishnupur','Churachandpur','Ukhrul'],
    'Meghalaya': ['Shillong','Tura','Jowai','Nongpoh'],
    'Mizoram': ['Aizawl','Lunglei','Champhai','Serchhip'],
    'Nagaland': ['Kohima','Dimapur','Mokokchung','Tuensang'],
    'Odisha': ['Bhubaneswar','Cuttack','Rourkela','Berhampur','Sambalpur','Puri','Balasore','Baripada'],
    'Punjab': ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Hoshiarpur','Phagwara','Moga'],
    'Rajasthan': ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Alwar','Bikaner','Sikar','Bhilwara','Bharatpur','Beawar','Pali'],
    'Sikkim': ['Gangtok','Namchi','Gyalshing','Mangan'],
    'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode','Tiruppur','Dindigul','Thanjavur','Thoothukudi'],
    'Telangana': ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Ramagundam','Mancherial','Suryapet'],
    'Tripura': ['Agartala','Dharmanagar','Kailashahar','Udaipur'],
    'Uttar Pradesh': ['Lucknow','Kanpur','Ghaziabad','Agra','Meerut','Varanasi','Prayagraj','Bareilly','Noida','Moradabad','Aligarh','Gorakhpur','Firozabad','Mathura','Saharanpur'],
    'Uttarakhand': ['Dehradun','Haridwar','Roorkee','Haldwani','Rishikesh','Nainital','Rudrapur','Kashipur'],
    'West Bengal': ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman','Malda','Kharagpur','Haldia'],
    'Delhi': ['New Delhi','Central Delhi','North Delhi','South Delhi','East Delhi','West Delhi','Dwarka','Rohini','Noida Extension'],
    'Jammu and Kashmir': ['Srinagar','Jammu','Anantnag','Baramulla','Sopore','Udhampur','Kathua'],
    'Ladakh': ['Leh','Kargil'],
    'Chandigarh': ['Chandigarh'],
    'Puducherry': ['Puducherry','Karaikal','Yanam','Mahe'],
    'Andaman and Nicobar Islands': ['Port Blair','Diglipur','Rangat'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Daman','Silvassa','Diu'],
    'Lakshadweep': ['Kavaratti','Agatti','Amini'],
  },
  'United States': {
    'Alabama': ['Birmingham','Montgomery','Huntsville','Mobile','Tuscaloosa','Hoover','Auburn'],
    'Alaska': ['Anchorage','Fairbanks','Juneau','Sitka','Ketchikan'],
    'Arizona': ['Phoenix','Tucson','Scottsdale','Tempe','Mesa','Chandler','Gilbert','Glendale','Peoria','Surprise'],
    'Arkansas': ['Little Rock','Fort Smith','Fayetteville','Springdale','Jonesboro'],
    'California': ['Los Angeles','San Francisco','San Diego','San Jose','Sacramento','Oakland','Fresno','Long Beach','Irvine','Santa Ana','Anaheim','Santa Clara','Sunnyvale','Fremont','Riverside','San Bernardino'],
    'Colorado': ['Denver','Colorado Springs','Aurora','Fort Collins','Boulder','Lakewood','Arvada','Westminster'],
    'Connecticut': ['Bridgeport','New Haven','Hartford','Stamford','Waterbury','Norwalk'],
    'Delaware': ['Wilmington','Dover','Newark','Middletown'],
    'Florida': ['Miami','Orlando','Tampa','Jacksonville','Fort Lauderdale','Tallahassee','St. Petersburg','Hialeah','Port St. Lucie','Cape Coral'],
    'Georgia': ['Atlanta','Augusta','Columbus','Savannah','Athens','Sandy Springs','Roswell','Macon'],
    'Hawaii': ['Honolulu','Pearl City','Hilo','Kailua','Kapolei'],
    'Idaho': ['Boise','Nampa','Meridian','Idaho Falls','Pocatello'],
    'Illinois': ['Chicago','Aurora','Rockford','Joliet','Naperville','Springfield','Peoria','Elgin'],
    'Indiana': ['Indianapolis','Fort Wayne','Evansville','South Bend','Carmel','Bloomington','Fishers'],
    'Iowa': ['Des Moines','Cedar Rapids','Davenport','Sioux City','Iowa City'],
    'Kansas': ['Wichita','Overland Park','Kansas City','Topeka','Olathe'],
    'Kentucky': ['Louisville','Lexington','Bowling Green','Owensboro','Covington'],
    'Louisiana': ['New Orleans','Baton Rouge','Shreveport','Metairie','Lafayette'],
    'Maine': ['Portland','Lewiston','Bangor','Augusta','South Portland'],
    'Maryland': ['Baltimore','Frederick','Gaithersburg','Rockville','Bowie','Annapolis'],
    'Massachusetts': ['Boston','Worcester','Springfield','Cambridge','Lowell','Brockton','Quincy'],
    'Michigan': ['Detroit','Grand Rapids','Warren','Sterling Heights','Ann Arbor','Lansing','Dearborn','Flint'],
    'Minnesota': ['Minneapolis','Saint Paul','Rochester','Duluth','Bloomington','Brooklyn Park'],
    'Mississippi': ['Jackson','Gulfport','Southaven','Hattiesburg','Biloxi'],
    'Missouri': ['Kansas City','St. Louis','Springfield','Columbia','Independence','O\'Fallon'],
    'Montana': ['Billings','Missoula','Great Falls','Helena','Bozeman'],
    'Nebraska': ['Omaha','Lincoln','Bellevue','Grand Island','Kearney'],
    'Nevada': ['Las Vegas','Henderson','Reno','North Las Vegas','Paradise'],
    'New Hampshire': ['Manchester','Nashua','Concord','Dover','Rochester'],
    'New Jersey': ['Newark','Jersey City','Paterson','Elizabeth','Trenton','Edison','Clifton','Camden'],
    'New Mexico': ['Albuquerque','Las Cruces','Rio Rancho','Santa Fe','Roswell'],
    'New York': ['New York City','Buffalo','Rochester','Yonkers','Syracuse','Albany','New Rochelle','Mount Vernon'],
    'North Carolina': ['Charlotte','Raleigh','Greensboro','Durham','Winston-Salem','Cary','Fayetteville','High Point'],
    'North Dakota': ['Fargo','Bismarck','Grand Forks','Minot','West Fargo'],
    'Ohio': ['Columbus','Cleveland','Cincinnati','Toledo','Akron','Dayton','Parma','Canton'],
    'Oklahoma': ['Oklahoma City','Tulsa','Norman','Broken Arrow','Edmond','Lawton'],
    'Oregon': ['Portland','Eugene','Salem','Gresham','Hillsboro','Beaverton'],
    'Pennsylvania': ['Philadelphia','Pittsburgh','Allentown','Erie','Reading','Scranton','Bethlehem'],
    'Rhode Island': ['Providence','Cranston','Warwick','Pawtucket','East Providence'],
    'South Carolina': ['Columbia','Charleston','North Charleston','Mount Pleasant','Greenville'],
    'South Dakota': ['Sioux Falls','Rapid City','Aberdeen','Brookings'],
    'Tennessee': ['Nashville','Memphis','Knoxville','Chattanooga','Clarksville','Murfreesboro'],
    'Texas': ['Houston','San Antonio','Dallas','Austin','Fort Worth','El Paso','Arlington','Corpus Christi','Plano','Irving','Lubbock','Laredo','Garland','Frisco','McKinney'],
    'Utah': ['Salt Lake City','West Valley City','Provo','Ogden','St. George','Sandy','Orem'],
    'Vermont': ['Burlington','South Burlington','Rutland','Montpelier','Barre'],
    'Virginia': ['Virginia Beach','Norfolk','Chesapeake','Richmond','Newport News','Arlington','Alexandria'],
    'Washington': ['Seattle','Spokane','Tacoma','Vancouver','Bellevue','Kirkland','Redmond','Kent','Renton'],
    'West Virginia': ['Charleston','Huntington','Morgantown','Parkersburg','Wheeling'],
    'Wisconsin': ['Milwaukee','Madison','Green Bay','Kenosha','Racine','Appleton'],
    'Wyoming': ['Cheyenne','Casper','Laramie','Gillette','Rock Springs'],
    'Washington D.C.': ['Washington D.C.'],
  },
  'United Kingdom': {
    'England': ['London','Birmingham','Leeds','Manchester','Sheffield','Liverpool','Bristol','Leicester','Coventry','Bradford','Nottingham','Newcastle','Reading','Oxford','Cambridge'],
    'Scotland': ['Edinburgh','Glasgow','Aberdeen','Dundee','Inverness','Perth','Stirling'],
    'Wales': ['Cardiff','Swansea','Newport','Wrexham','Bangor','Barry'],
    'Northern Ireland': ['Belfast','Londonderry','Lisburn','Newry','Armagh'],
  },
  'Australia': {
    'New South Wales': ['Sydney','Newcastle','Wollongong','Maitland','Coffs Harbour','Wagga Wagga','Albury','Orange'],
    'Victoria': ['Melbourne','Geelong','Ballarat','Bendigo','Shepparton','Mildura','Warrnambool'],
    'Queensland': ['Brisbane','Gold Coast','Townsville','Cairns','Sunshine Coast','Toowoomba','Rockhampton'],
    'South Australia': ['Adelaide','Mount Gambier','Whyalla','Port Augusta','Gawler'],
    'Western Australia': ['Perth','Mandurah','Bunbury','Geraldton','Albany','Kalgoorlie'],
    'Tasmania': ['Hobart','Launceston','Devonport','Burnie','Ulverstone'],
    'Northern Territory': ['Darwin','Alice Springs','Palmerston','Katherine'],
    'Australian Capital Territory': ['Canberra','Belconnen','Tuggeranong','Gungahlin'],
  },
  'Canada': {
    'Ontario': ['Toronto','Ottawa','Mississauga','Brampton','Hamilton','London','Markham','Kitchener','Windsor','Oakville'],
    'Quebec': ['Montreal','Quebec City','Laval','Gatineau','Longueuil','Sherbrooke','Saguenay'],
    'British Columbia': ['Vancouver','Surrey','Burnaby','Richmond','Kelowna','Victoria','Abbotsford','Coquitlam'],
    'Alberta': ['Calgary','Edmonton','Red Deer','Lethbridge','St. Albert','Medicine Hat','Grande Prairie'],
    'Manitoba': ['Winnipeg','Brandon','Steinbach','Thompson','Portage la Prairie'],
    'Saskatchewan': ['Saskatoon','Regina','Prince Albert','Moose Jaw','Swift Current'],
    'Nova Scotia': ['Halifax','Dartmouth','Sydney','Truro','New Glasgow'],
    'New Brunswick': ['Moncton','Saint John','Fredericton','Dieppe','Miramichi'],
    'Newfoundland and Labrador': ["St. John's",'Mount Pearl','Corner Brook','Conception Bay South'],
    'Prince Edward Island': ['Charlottetown','Summerside','Stratford'],
    'Northwest Territories': ['Yellowknife','Hay River','Inuvik'],
    'Yukon': ['Whitehorse','Dawson City','Watson Lake'],
    'Nunavut': ['Iqaluit','Rankin Inlet','Arviat'],
  },
  'Germany': {
    'Bavaria': ['Munich','Nuremberg','Augsburg','Regensburg','Ingolstadt','Würzburg','Erlangen'],
    'Baden-Württemberg': ['Stuttgart','Karlsruhe','Freiburg','Heidelberg','Mannheim','Heilbronn','Pforzheim'],
    'North Rhine-Westphalia': ['Cologne','Düsseldorf','Dortmund','Essen','Duisburg','Bochum','Wuppertal','Bielefeld','Bonn'],
    'Hesse': ['Frankfurt','Wiesbaden','Kassel','Darmstadt','Offenbach'],
    'Lower Saxony': ['Hanover','Braunschweig','Oldenburg','Osnabrück','Wolfsburg','Göttingen'],
    'Saxony': ['Dresden','Leipzig','Chemnitz','Zwickau','Erfurt'],
    'Berlin': ['Berlin'],
    'Hamburg': ['Hamburg'],
    'Brandenburg': ['Potsdam','Cottbus','Brandenburg an der Havel'],
    'Rhineland-Palatinate': ['Mainz','Ludwigshafen','Koblenz','Trier','Kaiserslautern'],
    'Saxony-Anhalt': ['Magdeburg','Halle','Dessau-Roßlau'],
    'Thuringia': ['Erfurt','Jena','Gera','Weimar'],
    'Schleswig-Holstein': ['Kiel','Lübeck','Flensburg','Neumünster'],
    'Mecklenburg-Vorpommern': ['Schwerin','Rostock','Stralsund','Greifswald'],
    'Saarland': ['Saarbrücken','Neunkirchen','Homburg'],
    'Bremen': ['Bremen','Bremerhaven'],
  },
  'France': {
    'Île-de-France': ['Paris','Versailles','Boulogne-Billancourt','Saint-Denis','Argenteuil','Nanterre'],
    'Auvergne-Rhône-Alpes': ['Lyon','Grenoble','Saint-Étienne','Clermont-Ferrand','Annecy','Chambéry'],
    'Nouvelle-Aquitaine': ['Bordeaux','Limoges','Poitiers','Pau','Bayonne','La Rochelle'],
    'Occitanie': ['Toulouse','Montpellier','Nîmes','Perpignan','Béziers','Narbonne'],
    "Provence-Alpes-Côte d'Azur": ['Marseille','Nice','Toulon','Aix-en-Provence','Cannes','Antibes'],
    'Grand Est': ['Strasbourg','Reims','Metz','Nancy','Colmar','Mulhouse'],
    'Hauts-de-France': ['Lille','Amiens','Roubaix','Tourcoing','Dunkirk','Calais'],
    'Normandie': ['Rouen','Caen','Le Havre','Cherbourg','Alençon'],
    'Bretagne': ['Rennes','Brest','Quimper','Lorient','Saint-Malo'],
    'Pays de la Loire': ['Nantes','Le Mans','Angers','Saint-Nazaire','La Roche-sur-Yon'],
  },
  'Singapore': {
    'Central Region': ['Singapore City','Orchard','Marina Bay','Raffles Place','Tanjong Pagar'],
    'East Region': ['Tampines','Bedok','Pasir Ris','Changi','Geylang'],
    'North Region': ['Woodlands','Sembawang','Yishun','Mandai'],
    'North-East Region': ['Hougang','Punggol','Sengkang','Serangoon','Ang Mo Kio'],
    'West Region': ['Jurong East','Jurong West','Bukit Batok','Clementi','Choa Chu Kang'],
  },
  'United Arab Emirates': {
    'Abu Dhabi': ['Abu Dhabi City','Al Ain','Ruwais','Khalifa City','Yas Island'],
    'Dubai': ['Dubai City','Deira','Bur Dubai','Jumeirah','Business Bay','Jebel Ali','Downtown Dubai'],
    'Sharjah': ['Sharjah City','Khor Fakkan','Kalba','Dhaid'],
    'Ajman': ['Ajman City','Masfut','Manama'],
    'Ras Al Khaimah': ['Ras Al Khaimah City','Digdaga','Al Nakheel'],
    'Fujairah': ['Fujairah City','Dibba Al Fujairah','Masafi'],
    'Umm Al Quwain': ['Umm Al Quwain City'],
  },
  'Japan': {
    'Tokyo': ['Tokyo','Shibuya','Shinjuku','Akihabara','Harajuku','Roppongi','Ginza','Chiyoda'],
    'Osaka': ['Osaka City','Sakai','Toyonaka','Suita','Higashiosaka'],
    'Kanagawa': ['Yokohama','Kawasaki','Sagamihara','Fujisawa','Chigasaki'],
    'Aichi': ['Nagoya','Toyota','Okazaki','Ichinomiya','Toyota City'],
    'Hokkaido': ['Sapporo','Asahikawa','Hakodate','Obihiro','Kushiro'],
    'Fukuoka': ['Fukuoka City','Kitakyushu','Kurume','Omuta','Iizuka'],
    'Hyogo': ['Kobe','Himeji','Nishinomiya','Amagasaki','Akashi'],
    'Kyoto': ['Kyoto City','Uji','Nishikyō-ku','Fushimi','Yamashina'],
  },
  'China': {
    'Beijing': ['Beijing City','Chaoyang','Haidian','Dongcheng','Xicheng'],
    'Shanghai': ['Shanghai City','Pudong','Jing\'an','Xuhui','Changning','Minhang'],
    'Guangdong': ['Guangzhou','Shenzhen','Dongguan','Foshan','Zhuhai','Zhongshan','Huizhou'],
    'Zhejiang': ['Hangzhou','Ningbo','Wenzhou','Jinhua','Shaoxing','Jiaxing'],
    'Jiangsu': ['Nanjing','Suzhou','Wuxi','Changzhou','Nantong','Xuzhou'],
    'Sichuan': ['Chengdu','Mianyang','Leshan','Nanchong','Luzhou'],
    'Hubei': ['Wuhan','Yichang','Xiangyang','Jingzhou'],
    'Shandong': ['Jinan','Qingdao','Zibo','Linyi','Weifang'],
    'Chongqing': ['Chongqing City','Jiulongpo','Yuzhong','Shapingba'],
    'Tianjin': ['Tianjin City','Binhai','Nankai','Hedong'],
  },
  'Brazil': {
    'São Paulo': ['São Paulo City','Campinas','Guarulhos','Santos','Santo André','Ribeirão Preto','Sorocaba'],
    'Rio de Janeiro': ['Rio de Janeiro City','Niterói','Nova Iguaçu','Duque de Caxias','São Gonçalo'],
    'Minas Gerais': ['Belo Horizonte','Uberlândia','Contagem','Juiz de Fora','Betim'],
    'Bahia': ['Salvador','Feira de Santana','Vitória da Conquista','Camaçari'],
    'Paraná': ['Curitiba','Londrina','Maringá','Ponta Grossa','Cascavel'],
    'Rio Grande do Sul': ['Porto Alegre','Caxias do Sul','Canoas','Pelotas','Santa Maria'],
    'Pernambuco': ['Recife','Caruaru','Olinda','Petrolina','Caboatã'],
    'Ceará': ['Fortaleza','Caucaia','Juazeiro do Norte','Maracanaú'],
    'Brasília (DF)': ['Brasília','Taguatinga','Ceilândia','Guará'],
  },
  'South Africa': {
    'Gauteng': ['Johannesburg','Pretoria','Ekurhuleni','Soweto','Centurion','Midrand','Sandton'],
    'Western Cape': ['Cape Town','Stellenbosch','George','Paarl','Bellville'],
    'KwaZulu-Natal': ['Durban','Pietermaritzburg','Newcastle','Richards Bay','Umlazi'],
    'Eastern Cape': ['East London','Port Elizabeth','Mthatha','Uitenhage'],
    'Limpopo': ['Polokwane','Tzaneen','Mokopane','Thohoyandou'],
    'Mpumalanga': ['Mbombela','Witbank','Secunda','Middelburg'],
    'North West': ['Rustenburg','Mahikeng','Klerksdorp','Potchefstroom'],
    'Free State': ['Bloemfontein','Welkom','Phuthaditjhaba','Kroonstad'],
    'Northern Cape': ['Kimberley','Upington','Springbok','De Aar'],
  },
  'Netherlands': {
    'North Holland': ['Amsterdam','Haarlem','Zaandam','Alkmaar','Hilversum'],
    'South Holland': ['The Hague','Rotterdam','Leiden','Delft','Dordrecht'],
    'North Brabant': ['Eindhoven','Tilburg',"'s-Hertogenbosch",'Breda','Helmond'],
    'Utrecht': ['Utrecht','Amersfoort','Veenendaal','Nieuwegein','Houten'],
    'Gelderland': ['Nijmegen','Arnhem','Apeldoorn','Ede','Doetinchem'],
    'Overijssel': ['Enschede','Zwolle','Deventer','Hengelo','Almelo'],
    'Flevoland': ['Almere','Lelystad','Dronten','Zeewolde'],
    'Limburg': ['Maastricht','Heerlen','Sittard-Geleen','Venlo'],
  },
  'Sweden': {
    'Stockholm County': ['Stockholm','Södertälje','Norrtälje','Nacka','Lidingö'],
    'Västra Götaland': ['Gothenburg','Mölndal','Borås','Trollhättan','Skövde'],
    'Skåne': ['Malmö','Helsingborg','Lund','Kristianstad','Trelleborg'],
    'Östergötland': ['Linköping','Norrköping','Motala','Mjölby'],
    'Uppsala': ['Uppsala','Enköping','Sala','Tierp'],
    'Jönköping': ['Jönköping','Huskvarna','Värnamo','Nässjö'],
  },
  'Ireland': {
    'Leinster': ['Dublin','Dún Laoghaire','Swords','Drogheda','Dundalk','Navan','Bray','Naas'],
    'Munster': ['Cork','Limerick','Waterford','Killarney','Tralee','Ennis','Clonmel'],
    'Connacht': ['Galway','Sligo','Castlebar','Ballina','Roscommon'],
    'Ulster': ['Donegal','Monaghan','Cavan','Letterkenny'],
  },
  'New Zealand': {
    'Auckland Region': ['Auckland','Manukau','North Shore','Waitakere','Hamilton'],
    'Wellington Region': ['Wellington','Lower Hutt','Upper Hutt','Porirua'],
    'Canterbury Region': ['Christchurch','Timaru','Ashburton','Rangiora'],
    'Waikato Region': ['Hamilton','Cambridge','Te Awamutu','Tokoroa'],
    'Otago Region': ['Dunedin','Queenstown','Invercargill','Oamaru'],
    'Bay of Plenty': ['Tauranga','Rotorua','Whakatāne','Mount Maunganui'],
  },
  'Malaysia': {
    'Kuala Lumpur': ['Kuala Lumpur City','Chow Kit','Bukit Bintang','Bangsar'],
    'Selangor': ['Petaling Jaya','Shah Alam','Klang','Subang Jaya','Ampang Jaya'],
    'Penang': ['George Town','Butterworth','Bukit Mertajam','Seberang Perai'],
    'Johor': ['Johor Bahru','Skudai','Pasir Gudang','Kulai'],
    'Sarawak': ['Kuching','Miri','Sibu','Bintulu'],
    'Sabah': ['Kota Kinabalu','Sandakan','Tawau','Lahad Datu'],
    'Perak': ['Ipoh','Taiping','Teluk Intan','Manjung'],
    'Pahang': ['Kuantan','Temerloh','Bentong','Raub'],
    'Negeri Sembilan': ['Seremban','Port Dickson','Nilai','Bahau'],
    'Kelantan': ['Kota Bharu','Kuala Krai','Tanah Merah'],
    'Terengganu': ['Kuala Terengganu','Kemaman','Dungun'],
    'Kedah': ['Alor Setar','Sungai Petani','Kulim','Langkawi'],
    'Perlis': ['Kangar','Arau','Padang Besar'],
    'Melaka': ['Melaka City','Ayer Keroh','Merlimau'],
  },
  'Indonesia': {
    'DKI Jakarta': ['Jakarta Pusat','Jakarta Selatan','Jakarta Utara','Jakarta Barat','Jakarta Timur'],
    'West Java': ['Bandung','Bekasi','Bogor','Depok','Cimahi','Tasikmalaya'],
    'East Java': ['Surabaya','Malang','Sidoarjo','Gresik','Kediri','Blitar'],
    'Central Java': ['Semarang','Solo','Yogyakarta','Magelang','Klaten','Pekalongan'],
    'North Sumatra': ['Medan','Binjai','Pematangsiantar','Tebing Tinggi'],
    'South Sulawesi': ['Makassar','Parepare','Palopo','Bone'],
    'Bali': ['Denpasar','Badung','Gianyar','Tabanan','Buleleng'],
    'Riau': ['Pekanbaru','Dumai','Siak','Bengkalis'],
  },
  'Philippines': {
    'Metro Manila': ['Manila','Quezon City','Makati','Taguig','Pasig','Caloocan','Pasay','Mandaluyong'],
    'Cebu': ['Cebu City','Mandaue','Lapu-Lapu','Toledo','Danao'],
    'Davao': ['Davao City','Tagum','Digos','Panabo'],
    'Central Luzon': ['Angeles','San Fernando','Olongapo','Cabanatuan','Malolos'],
    'Calabarzon': ['Antipolo','Bacoor','Imus','Dasmariñas','Santa Rosa'],
    'Western Visayas': ['Iloilo City','Bacolod','Roxas City','Passi'],
  },
  'Pakistan': {
    'Punjab': ['Lahore','Faisalabad','Rawalpindi','Gujranwala','Multan','Sialkot','Bahawalpur','Sargodha'],
    'Sindh': ['Karachi','Hyderabad','Sukkur','Larkana','Nawabshah'],
    'Khyber Pakhtunkhwa': ['Peshawar','Mardan','Mingora','Kohat','Abbottabad'],
    'Balochistan': ['Quetta','Turbat','Khuzdar','Hub','Gwadar'],
    'Islamabad Capital Territory': ['Islamabad'],
  },
  'Bangladesh': {
    'Dhaka Division': ['Dhaka','Narayanganj','Gazipur','Narsingdi','Manikganj'],
    'Chittagong Division': ['Chittagong','Cox\'s Bazar','Comilla','Noakhali','Feni'],
    'Rajshahi Division': ['Rajshahi','Bogura','Pabna','Naogaon','Chapainawabganj'],
    'Khulna Division': ['Khulna','Jessore','Satkhira','Bagerhat','Narail'],
    'Sylhet Division': ['Sylhet','Moulvibazar','Habiganj','Sunamganj'],
    'Barisal Division': ['Barisal','Patuakhali','Bhola','Pirojpur'],
    'Rangpur Division': ['Rangpur','Dinajpur','Thakurgaon','Panchagarh'],
    'Mymensingh Division': ['Mymensingh','Jamalpur','Netrokona','Sherpur'],
  },
  'Sri Lanka': {
    'Western Province': ['Colombo','Sri Jayawardenepura Kotte','Gampaha','Kalutara','Negombo'],
    'Central Province': ['Kandy','Matale','Nuwara Eliya','Hatton'],
    'Southern Province': ['Galle','Matara','Hambantota','Weligama'],
    'Northern Province': ['Jaffna','Vavuniya','Mannar','Mullaitivu'],
    'Eastern Province': ['Trincomalee','Batticaloa','Ampara'],
    'North Western Province': ['Kurunegala','Puttalam','Chilaw'],
    'North Central Province': ['Anuradhapura','Polonnaruwa'],
    'Uva Province': ['Badulla','Monaragala'],
    'Sabaragamuwa Province': ['Ratnapura','Kegalle'],
  },
  'Kenya': {
    'Nairobi': ['Nairobi City','Westlands','Eastleigh','Karen','Kibera'],
    'Mombasa': ['Mombasa City','Mvita','Likoni','Changamwe'],
    'Kisumu': ['Kisumu City','Kondele','Mamboleo'],
    'Nakuru': ['Nakuru City','Naivasha','Gilgil'],
    'Eldoret': ['Eldoret','Turbo','Moiben'],
    'Thika': ['Thika','Ruiru','Juja'],
  },
  'Nigeria': {
    'Lagos': ['Lagos City','Ikeja','Victoria Island','Lekki','Surulere','Apapa'],
    'Abuja FCT': ['Abuja','Garki','Wuse','Maitama','Gwarinpa'],
    'Rivers': ['Port Harcourt','Obio-Akpor','Eleme','Okrika'],
    'Kano': ['Kano City','Fagge','Dala','Gwale'],
    'Oyo': ['Ibadan','Ogbomoso','Oyo Town','Iseyin'],
    'Enugu': ['Enugu City','Nsukka','Oji River','Agbani'],
    'Kaduna': ['Kaduna City','Zaria','Kafanchan','Birnin-Gwari'],
  },
  'Ghana': {
    'Greater Accra': ['Accra','Tema','Madina','Ashaiman','Kasoa'],
    'Ashanti': ['Kumasi','Obuasi','Ejisu','Konongo'],
    'Western': ['Takoradi','Sekondi','Tarkwa','Axim'],
    'Eastern': ['Koforidua','Nkawkaw','Akim Oda'],
    'Central': ['Cape Coast','Mankessim','Winneba','Kasoa'],
    'Northern': ['Tamale','Yendi','Savelugu'],
  },
  'Egypt': {
    'Cairo Governorate': ['Cairo City','Heliopolis','Maadi','Nasr City','6th of October City'],
    'Giza Governorate': ['Giza City','Sheikh Zayed','6th of October','Al Haram'],
    'Alexandria Governorate': ['Alexandria City','Sidi Gaber','Sporting','Smouha'],
    'Dakahlia': ['Mansoura','Talkha','Mit Ghamr'],
    'Sharqia': ['Zagazig','Belbeis','Minya Al-Qamh'],
    'Qalyubia': ['Benha','Shubra Al-Kheima','Qalyub'],
  },
};

const COUNTRIES = Object.keys(GEO_DATA).sort();

// ─── Searchable Select Dropdown ────────────────────────────────────────────────
function SearchableSelect({ value, onChange, options, placeholder, disabled = false }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const ref                 = useRef();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close and clear query when external value changes (e.g. country reset)
  useEffect(() => { if (!value) setQuery(''); }, [value]);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => { if (!disabled) { setOpen(o => !o); setQuery(''); } }}
        className={`${inputCls} flex items-center justify-between cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>{value || placeholder}</span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl">
          <div className="p-2 border-b border-slate-200">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-gray-500 text-sm">No results</div>
            ) : filtered.map(opt => (
              <div
                key={opt}
                onMouseDown={() => { onChange(opt); setOpen(false); setQuery(''); }}
                className={`px-3 py-2.5 text-sm cursor-pointer transition ${
                  opt === value ? 'bg-blue-600 text-white font-medium' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// URL validator
function isValidURL(str) {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// ─── Step 1: Company Details ───────────────────────────────────────────────────
function StepCompanyInfo({ clientId, onSaved }) {
  const [form, setForm] = useState({
    company_name: '', legal_name: '', website: '', industry: '', company_branch: '', company_size: '',
    num_employees: '', country: '', state: '', city: '', address: '', timezone: '', description: '',
  });
  const [errors, setErrors]               = useState({});
  const [save, setSave]                   = useState(null);
  const [industrySearch, setIndustrySearch] = useState('');
  const [showIndustryDrop, setShowIndustryDrop] = useState(false);
  const industryRef = useRef();

  useEffect(() => {
    api(`/api/company-info/${clientId}`).then(d => {
      if (d && d.company_name) setForm(f => ({ ...f, ...d }));
    });
  }, [clientId]);

  useEffect(() => {
    const handler = e => { if (industryRef.current && !industryRef.current.contains(e.target)) setShowIndustryDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Derived geo lists
  const stateOptions = form.country ? Object.keys(GEO_DATA[form.country] || {}).sort() : [];
  const cityOptions  = (form.country && form.state) ? (GEO_DATA[form.country]?.[form.state] || []).sort() : [];

  const setField = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      // Cascade reset: changing country clears state + city; changing state clears city
      if (k === 'country') { next.state = ''; next.city = ''; }
      if (k === 'state')   { next.city  = ''; }
      return next;
    });
    // Clear the error for the field being edited
    setErrors(e => ({ ...e, [k]: '' }));
  };

  function validate() {
    const errs = {};
    if (!form.company_name?.trim())            errs.company_name = 'Company Name is required';
    if (!form.legal_name?.trim())              errs.legal_name = 'Legal Company Name is required';
    else if (form.legal_name.trim().length < 3) errs.legal_name = 'Legal Company Name must be at least 3 characters';
    if (!form.website?.trim())                 errs.website = 'Company Website is required';
    else if (!isValidURL(form.website.trim())) errs.website = 'Please enter a valid website URL (e.g. https://acme.com)';
    if (!form.industry?.trim())                errs.industry = 'Industry is required';
    if (!form.company_branch?.trim())          errs.company_branch = 'Company Branch is required';
    if (!form.company_size?.trim())            errs.company_size = 'Company Size is required';
    if (!String(form.num_employees || '').trim()) errs.num_employees = 'Number of Employees is required';
    else if (isNaN(parseInt(form.num_employees, 10)) || parseInt(form.num_employees, 10) <= 0) errs.num_employees = 'Enter a valid employee count';
    if (!form.country?.trim())                 errs.country = 'Country is required';
    if (!form.state?.trim())                   errs.state = 'State is required';
    if (!form.city?.trim())                    errs.city = 'City is required';
    if (!form.timezone?.trim())                errs.timezone = 'Time Zone is required';
    if (!form.address?.trim())                 errs.address = 'Company Address is required';
    if (!form.description?.trim())             errs.description = 'Company Description is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;
    setSave('saving');
    await api('/api/company-info', { method: 'POST', body: JSON.stringify({ client_id: clientId, ...form }) });
    setSave('saved');
    setTimeout(() => { setSave(null); onSaved(); }, 800);
  }

  const filteredIndustries = INDUSTRIES.filter(i => i.toLowerCase().includes(industrySearch.toLowerCase()));

  const errCls = 'border-red-500 focus:border-red-500 focus:ring-red-500';

  return (
    <form onSubmit={handleSave} className="space-y-6" noValidate>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Company Details</h2>
          <p className="text-slate-500 text-sm mt-0.5">Fill in your organisation's core details</p>
        </div>
        <SaveIndicator state={save} />
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>Please fill in all mandatory fields before proceeding. ({Object.keys(errors).length} incomplete field{Object.keys(errors).length > 1 ? 's' : ''})</span>
        </div>
      )}

      {/* ── Row 1: Company Name + Legal Company Name ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Company Name <span className="text-red-400">*</span>
          </label>
          <input
            className={`${inputCls} ${errors.company_name ? errCls : ''}`}
            value={form.company_name}
            onChange={e => setField('company_name', e.target.value)}
            placeholder="Acme Corporation"
          />
          {errors.company_name && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.company_name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Legal Company Name <span className="text-red-400">*</span>
          </label>
          <input
            className={`${inputCls} ${errors.legal_name ? errCls : ''}`}
            value={form.legal_name}
            onChange={e => setField('legal_name', e.target.value)}
            onBlur={() => {
              if (!form.legal_name.trim()) setErrors(e => ({ ...e, legal_name: 'Legal Company Name is required' }));
              else if (form.legal_name.trim().length < 3) setErrors(e => ({ ...e, legal_name: 'Legal Company Name must be at least 3 characters' }));
              else setErrors(e => ({ ...e, legal_name: '' }));
            }}
            placeholder="Acme Corporation Pvt. Ltd."
          />
          {errors.legal_name && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.legal_name}
            </p>
          )}
        </div>

        {/* ── Company Website ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Company Website <span className="text-red-400">*</span>
          </label>
          <input
            className={`${inputCls} ${errors.website ? errCls : ''}`}
            value={form.website}
            onChange={e => setField('website', e.target.value)}
            onBlur={() => {
              if (!form.website.trim()) setErrors(e => ({ ...e, website: 'Company Website is required' }));
              else if (!isValidURL(form.website.trim())) setErrors(e => ({ ...e, website: 'Please enter a valid website URL (e.g. https://acme.com)' }));
              else setErrors(e => ({ ...e, website: '' }));
            }}
            placeholder="https://acme.com"
          />
          {errors.website && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.website}
            </p>
          )}
        </div>

        {/* ── Industry (searchable) ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Industry <span className="text-red-400">*</span>
          </label>
          <div className="relative" ref={industryRef}>
            <input
              className={`${inputCls} ${errors.industry ? errCls : ''}`}
              value={showIndustryDrop ? industrySearch : form.industry}
              placeholder="Search or select industry…"
              onFocus={() => { setShowIndustryDrop(true); setIndustrySearch(''); }}
              onChange={e => { setIndustrySearch(e.target.value); setShowIndustryDrop(true); }}
              readOnly={!showIndustryDrop}
            />
            {showIndustryDrop && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {filteredIndustries.length === 0
                  ? <div className="px-3 py-2 text-gray-500 text-sm">No match</div>
                  : filteredIndustries.map(ind => (
                    <div key={ind}
                      className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-600 hover:text-white cursor-pointer"
                      onMouseDown={() => { setField('industry', ind); setShowIndustryDrop(false); setIndustrySearch(''); }}
                    >{ind}</div>
                  ))
                }
              </div>
            )}
          </div>
          {errors.industry && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.industry}
            </p>
          )}
        </div>

        {/* ── Company Branch (After Industry) ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Company Branch <span className="text-red-400">*</span>
          </label>
          <input
            className={`${inputCls} ${errors.company_branch ? errCls : ''}`}
            value={form.company_branch || ''}
            onChange={e => setField('company_branch', e.target.value)}
            placeholder="e.g. Headquarters / Mumbai Branch"
          />
          {errors.company_branch && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.company_branch}
            </p>
          )}
        </div>

        {/* ── Company Size ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Company Size <span className="text-red-400">*</span>
          </label>
          <select className={`${selectCls} ${errors.company_size ? errCls : ''}`} value={form.company_size} onChange={e => setField('company_size', e.target.value)}>
            <option value="">Select size…</option>
            {COMPANY_SIZES.map(s => <option key={s}>{s}</option>)}
          </select>
          {errors.company_size && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.company_size}
            </p>
          )}
        </div>

        {/* ── Number of Employees ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Number of Employees <span className="text-red-400">*</span>
          </label>
          <input className={`${inputCls} ${errors.num_employees ? errCls : ''}`} type="number" value={form.num_employees}
            onChange={e => setField('num_employees', e.target.value)} placeholder="350" min="1" />
          {errors.num_employees && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.num_employees}
            </p>
          )}
        </div>

        {/* ── Country (searchable dependent) ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Country <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            value={form.country}
            onChange={v => setField('country', v)}
            options={COUNTRIES}
            placeholder="Select country…"
          />
          {errors.country && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.country}
            </p>
          )}
        </div>

        {/* ── State (depends on country) ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            State <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            value={form.state}
            onChange={v => setField('state', v)}
            options={stateOptions}
            placeholder={form.country ? 'Select state…' : 'Select country first'}
            disabled={!form.country}
          />
          {!form.country && <p className="text-xs text-gray-600 mt-1">Select a country first</p>}
          {errors.state && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.state}
            </p>
          )}
        </div>

        {/* ── City (depends on state) ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            City <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            value={form.city}
            onChange={v => setField('city', v)}
            options={cityOptions}
            placeholder={form.state ? 'Select city…' : 'Select state first'}
            disabled={!form.state}
          />
          {!form.state && <p className="text-xs text-gray-600 mt-1">Select a state first</p>}
          {errors.city && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.city}
            </p>
          )}
        </div>

        {/* ── Time Zone ── */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Time Zone <span className="text-red-400">*</span>
          </label>
          <select className={`${selectCls} ${errors.timezone ? errCls : ''}`} value={form.timezone} onChange={e => setField('timezone', e.target.value)}>
            <option value="">Select timezone…</option>
            {TIMEZONES.map(t => <option key={t}>{t}</option>)}
          </select>
          {errors.timezone && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.timezone}
            </p>
          )}
        </div>
      </div>

      {/* ── Full-width fields ── */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
          Company Address <span className="text-red-400">*</span>
        </label>
        <textarea className={`${inputCls} ${errors.address ? errCls : ''}`} rows={2} value={form.address}
          onChange={e => setField('address', e.target.value)} placeholder="123 Industrial Area, Andheri East…" />
        {errors.address && (
          <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
            <span>❌</span> {errors.address}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
          Company Description <span className="text-red-400">*</span>
        </label>
        <textarea className={`${inputCls} ${errors.description ? errCls : ''}`} rows={3} value={form.description}
          onChange={e => setField('description', e.target.value)} placeholder="Brief description of what the company does…" />
        {errors.description && (
          <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
            <span>❌</span> {errors.description}
          </p>
        )}
      </div>

      {/* ── Mandatory note ── */}
      <p className="text-xs text-gray-500">All fields marked with <span className="text-red-400">*</span> are mandatory</p>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          Save & Continue →
        </button>
      </div>
    </form>
  );
}

// ─── Step 2: Security Modules ──────────────────────────────────────────────────
function StepSecurityModules({ clientId, liveModules, onModulesChange, onSaved }) {
  const [selected, setSelected] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState(MASTER_LIBRARY[0].id);
  const [search, setSearch] = useState('');
  const [save, setSave] = useState(null);
  const [seeded, setSeeded] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModules, setCustomModules] = useState([]);
  const [customForm, setCustomForm] = useState({ name: '', desc: '', category: MASTER_LIBRARY[0].id });
  const [drawerModule, setDrawerModule] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [importError, setImportError] = useState('');
  const fileInputRef = React.useRef();

  useEffect(() => {
    if (!seeded && liveModules && liveModules.size >= 0) {
      setSelected(new Set(liveModules));
      setSeeded(true);
    }
  }, [liveModules, seeded]);

  useEffect(() => { setSeeded(false); }, [clientId]);

  const toggle = name => setSelected(s => {
    const n = new Set(s);
    n.has(name) ? n.delete(name) : n.add(name);
    onModulesChange?.(n);
    return n;
  });

  const toggleFav = (name, e) => { e.stopPropagation(); setFavorites(f => { const n = new Set(f); n.has(name) ? n.delete(name) : n.add(name); return n; }); };

  async function handleSave() {
    setSave('saving');
    const allModules = [...ALL_MODULES, ...customModules];
    await api('/api/onboarding-modules', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, modules: allModules.map(m => ({ name: m.name, enabled: selected.has(m.name) })) }),
    });
    setSave('saved');
    setTimeout(() => { setSave(null); onSaved(); }, 800);
  }

  function applyPreset(preset) {
    const n = new Set(selected);
    preset.modules.forEach(name => n.add(name));
    setSelected(n);
    onModulesChange?.(n);
  }

  function exportCSV() {
    const rows = [['Module', 'Category', 'Selected', 'Favorite']];
    MASTER_LIBRARY.forEach(g => g.modules.forEach(m => rows.push([m.name, g.label, selected.has(m.name) ? 'Yes' : 'No', favorites.has(m.name) ? 'Yes' : 'No'])));
    customModules.forEach(m => rows.push([m.name, 'Custom', selected.has(m.name) ? 'Yes' : 'No', favorites.has(m.name) ? 'Yes' : 'No']));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'security_modules.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = { selected: [...selected], favorites: [...favorites], custom: customModules };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'security_modules.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(ev.target.result);
          if (data.selected) setSelected(new Set(data.selected));
          if (data.favorites) setFavorites(new Set(data.favorites));
          if (data.custom) setCustomModules(data.custom);
          onModulesChange?.(new Set(data.selected || []));
        } else {
          const lines = ev.target.result.split('\n').slice(1);
          const n = new Set(selected);
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts[0] && parts[2]?.replace(/"/g,'').trim() === 'Yes') n.add(parts[0].replace(/"/g,'').trim());
          });
          setSelected(n);
          onModulesChange?.(n);
        }
      } catch { setImportError('Failed to parse import file. Please check the format.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function addCustomModule() {
    if (!customForm.name.trim()) return;
    const m = { name: customForm.name.trim(), desc: customForm.desc.trim(), icon: '🔧', categoryId: customForm.category, isCustom: true };
    setCustomModules(c => [...c, m]);
    const n = new Set(selected); n.add(m.name);
    setSelected(n); onModulesChange?.(n);
    setCustomForm({ name: '', desc: '', category: MASTER_LIBRARY[0].id });
    setShowCustomModal(false);
  }

  // Build module list for current view
  const searchLower = search.toLowerCase().trim();
  let displayModules = [];
  let displayLabel = '';

  if (searchLower) {
    displayModules = ALL_MODULES
      .filter(m => m.name.toLowerCase().includes(searchLower) || (m.desc||'').toLowerCase().includes(searchLower))
      .concat(customModules.filter(m => m.name.toLowerCase().includes(searchLower)));
    displayLabel = `Search results for "${search}"`;
  } else if (activeCategory === '__favorites__') {
    displayModules = ALL_MODULES.filter(m => favorites.has(m.name)).concat(customModules.filter(m => favorites.has(m.name)));
    displayLabel = '⭐ Favorites';
  } else if (activeCategory === '__selected__') {
    displayModules = ALL_MODULES.filter(m => selected.has(m.name)).concat(customModules.filter(m => selected.has(m.name)));
    displayLabel = '✓ Selected Modules';
  } else if (activeCategory === '__custom__') {
    displayModules = customModules;
    displayLabel = '🔧 Custom Modules';
  } else {
    const grp = MASTER_LIBRARY.find(g => g.id === activeCategory);
    const libMods = grp ? grp.modules : [];
    const custMods = customModules.filter(m => m.categoryId === activeCategory);
    displayModules = [...libMods, ...custMods];
    displayLabel = grp ? `${grp.icon} ${grp.label}` : '';
  }

  // Recommendations
  const recsSet = new Set();
  selected.forEach(name => { (RECOMMENDATIONS_MAP[name] || []).forEach(r => { if (!selected.has(r)) recsSet.add(r); }); });
  const recommendations = [...recsSet].slice(0, 8);

  const activeGrp = MASTER_LIBRARY.find(g => g.id === activeCategory);

  return (
    <div className="flex gap-0 h-full" style={{ minHeight: '600px' }}>
      {/* ── Left Sidebar ── */}
      <aside className="w-52 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search modules…"
              className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Special views */}
          {[
            { id: '__selected__', icon: '✓', label: 'Selected', count: selected.size },
            { id: '__favorites__', icon: '⭐', label: 'Favorites', count: favorites.size },
            { id: '__custom__', icon: '🔧', label: 'Custom', count: customModules.length },
          ].map(v => (
            <button key={v.id} onClick={() => { setActiveCategory(v.id); setSearch(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition ${activeCategory === v.id ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'}`}>
              <span>{v.icon} {v.label}</span>
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${activeCategory === v.id ? 'bg-blue-500 text-white font-bold' : 'bg-slate-200 text-slate-600 font-medium'}`}>{v.count}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-widest font-semibold border-t border-slate-200 mt-1">Categories</div>
          {MASTER_LIBRARY.map(g => {
            const count = g.modules.filter(m => selected.has(m.name)).length;
            const custCount = customModules.filter(m => m.categoryId === g.id && selected.has(m.name)).length;
            const total = g.modules.length + customModules.filter(m => m.categoryId === g.id).length;
            const sel = count + custCount;
            const isActive = activeCategory === g.id;
            return (
              <button key={g.id} onClick={() => { setActiveCategory(g.id); setSearch(''); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition ${isActive ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'}`}>
                <span style={{ color: isActive ? '#fff' : g.color }}>{g.icon}</span>
                <span className="flex-1 text-left leading-tight truncate">{g.label}</span>
                {sel > 0 && <span className="text-[10px] rounded-full px-1.5 bg-emerald-600 text-white font-bold">{sel}/{total}</span>}
              </button>
            );
          })}
        </div>

        <div className="p-2 border-t border-slate-200 space-y-1">
          <button onClick={() => setShowCustomModal(true)}
            className="w-full text-xs py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">+ Custom Module</button>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={exportCSV} className="text-[10px] py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded transition shadow-sm font-medium">⬇ CSV</button>
            <button onClick={exportJSON} className="text-[10px] py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded transition shadow-sm font-medium">⬇ JSON</button>
            <button onClick={() => fileInputRef.current?.click()} className="col-span-2 text-[10px] py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded transition shadow-sm font-medium">⬆ Import</button>
            <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleImport} />
          </div>
          {importError && <div className="text-[10px] text-red-400 px-1">{importError}</div>}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Enterprise Security Library</h2>
            <p className="text-gray-500 text-xs mt-0.5">{displayLabel} · {displayModules.length} modules available</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500"><span className="text-emerald-600 font-bold">{selected.size}</span> selected</span>
            <SaveIndicator state={save} />
            <button onClick={handleSave} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition">
              Save & Continue →
            </button>
          </div>
        </div>

        {/* Industry presets */}
        <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider whitespace-nowrap font-semibold">Quick Presets:</span>
          {CLIENT_PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400 transition whitespace-nowrap shadow-sm font-medium">
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>

        {/* Per-category bulk controls */}
        {!searchLower && activeCategory !== '__favorites__' && activeCategory !== '__selected__' && activeCategory !== '__custom__' && activeGrp && (
          <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2 flex-shrink-0 bg-slate-50">
            <span className="text-2xl">{activeGrp.icon}</span>
            <span className="text-sm font-semibold text-slate-900">{activeGrp.label}</span>
            <button onClick={() => { const n = new Set(selected); displayModules.forEach(m => n.add(m.name)); setSelected(n); onModulesChange?.(n); }}
              className="ml-4 text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition">Select All</button>
            <button onClick={() => { const n = new Set(selected); displayModules.forEach(m => n.delete(m.name)); setSelected(n); onModulesChange?.(n); }}
              className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full transition font-medium">Deselect All</button>
          </div>
        )}

        {/* Module grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm">{search ? 'No modules match your search.' : 'No modules here yet.'}</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {displayModules.map(m => {
                const on = selected.has(m.name);
                const isFav = favorites.has(m.name);
                const grp = MASTER_LIBRARY.find(g => g.modules.some(x => x.name === m.name));
                const borderColor = on ? (grp?.color || '#3b82f6') : th('#374151', { dark: '#CBD5E1' });
                return (
                  <div key={m.name} onClick={() => toggle(m.name)}
                    className={`relative p-3 rounded-xl border cursor-pointer transition-all select-none ${on ? 'bg-blue-50/70 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                    style={{ borderColor }}>
                    <button onClick={e => toggleFav(m.name, e)}
                      className={`absolute top-2 left-2 text-xs leading-none transition ${isFav ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}>⭐</button>
                    <div className={`absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center transition ${on ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                      {on && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setDrawerModule(m); }}
                      className="absolute bottom-2 right-2 text-[10px] text-slate-400 hover:text-slate-600 transition" title="View details">ℹ</button>
                    <div className="text-xl mb-1 mt-3 ml-3">{m.icon || '🔧'}</div>
                    <div className="text-slate-900 text-xs font-semibold leading-tight pr-2">{m.name}</div>
                    {m.desc && <div className="text-slate-500 text-[10px] mt-1 leading-tight line-clamp-2">{m.desc}</div>}
                    {m.isCustom && <div className="text-[9px] text-purple-600 font-semibold mt-1">Custom</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendations panel */}
          {recommendations.length > 0 && showRecommendations && !searchLower && (
            <div className="mt-4 bg-blue-50/50 border border-blue-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-blue-900">💡 Recommended based on your selection</div>
                <button onClick={() => setShowRecommendations(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">×</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendations.map(name => (
                  <button key={name} onClick={() => toggle(name)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-600 hover:text-white transition shadow-sm font-medium">
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Module Detail Drawer ── */}
      {drawerModule && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDrawerModule(null)}>
          <div className="w-80 h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="text-xl">{drawerModule.icon || '🔧'}</div>
              <button onClick={() => setDrawerModule(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>
            <div className="p-4 flex-1">
              <div className="text-slate-900 font-bold text-base mb-1">{drawerModule.name}</div>
              {drawerModule.desc && <div className="text-slate-500 text-sm mb-4">{drawerModule.desc}</div>}
              <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Related Modules</div>
              <div className="flex flex-wrap gap-1.5">
                {(RECOMMENDATIONS_MAP[drawerModule.name] || []).map(r => (
                  <button key={r} onClick={() => { toggle(r); }}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition ${selected.has(r) ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-700'}`}>
                    {selected.has(r) ? '✓ ' : '+ '}{r}
                  </button>
                ))}
                {!(RECOMMENDATIONS_MAP[drawerModule.name]?.length) && <div className="text-gray-600 text-xs">No related modules found.</div>}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200">
              <button onClick={() => { toggle(drawerModule.name); setDrawerModule(null); }}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition ${selected.has(drawerModule.name) ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                {selected.has(drawerModule.name) ? '✗ Remove Module' : '+ Enable Module'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Module Modal ── */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCustomModal(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-900 font-bold">+ Add Custom Module</div>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Module Name <span className="text-red-500">*</span></label>
                <input value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                  placeholder="e.g. Custom Policy Review" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                <textarea value={customForm.desc} onChange={e => setCustomForm(f => ({ ...f, desc: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none shadow-sm"
                  rows={2} placeholder="Brief description of this module" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                <select value={customForm.category} onChange={e => setCustomForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm">
                  {MASTER_LIBRARY.map(g => <option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-sm font-medium rounded-lg transition">Cancel</button>
              <button onClick={addCustomModule} disabled={!customForm.name.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition">Add Module</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Escalation Matrix ─────────────────────────────────────────────────
const emptyContact = (type) => ({ contact_type: type, full_name:'', designation:'', email:'', country_code: '+91', mobile:'' });

function ContactCard({ contact, onChange, onRemove, removable, title, errors = {} }) {
  const set = k => e => onChange({ ...contact, [k]: e.target.value });
  const setPhone = val => onChange({ ...contact, mobile: val });
  const setCountryCode = val => onChange({ ...contact, country_code: val });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">{title} <span className="text-red-400">*</span></h4>
        {removable && <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            className={`${inputCls} ${errors.full_name ? 'border-red-500 focus:border-red-500' : ''}`}
            value={contact.full_name || ''}
            onChange={set('full_name')}
            placeholder="Rahul Sharma"
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.full_name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Designation <span className="text-red-400">*</span>
          </label>
          <input
            className={`${inputCls} ${errors.designation ? 'border-red-500 focus:border-red-500' : ''}`}
            value={contact.designation || ''}
            onChange={set('designation')}
            placeholder="CTO / Security Lead"
          />
          {errors.designation && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.designation}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            className={`${inputCls} ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
            type="email"
            value={contact.email || ''}
            onChange={set('email')}
            placeholder="rahul@company.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Mobile Number (10 Digits) <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={contact.country_code || '+91'}
              onChange={e => setCountryCode(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500 w-36 flex-shrink-0 cursor-pointer shadow-sm"
            >
              {COUNTRY_DIAL_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              type="tel"
              value={contact.mobile || ''}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              maxLength={10}
              className={`flex-1 bg-white border ${errors.mobile ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'} rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm`}
            />
          </div>
          {errors.mobile && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {errors.mobile}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepContacts({ clientId, onSaved }) {
  const [contacts, setContacts] = useState([
    emptyContact('primary'),
    emptyContact('secondary'),
    emptyContact('emergency'),
  ]);
  const [contactErrors, setContactErrors] = useState({});
  const [save, setSave]                   = useState(null);
  const [saveErr, setSaveErr]             = useState('');

  useEffect(() => {
    api(`/api/contacts/${clientId}`).then(rows => {
      if (rows && rows.length) {
        setContacts(rows.map(r => {
          const parsed = parsePhoneNumber(r.mobile, r.country_code || '+91');
          return {
            ...r,
            country_code: parsed.countryCode,
            mobile: parsed.number,
          };
        }));
      }
    });
  }, [clientId]);

  const update = idx => c => {
    setContacts(cs => cs.map((x, i) => i === idx ? c : x));
    setContactErrors(prev => ({ ...prev, [idx]: {} }));
    setSaveErr('');
  };
  const remove = idx => () => {
    setContacts(cs => cs.filter((_, i) => i !== idx));
    setContactErrors(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  function validateContacts() {
    const errMap = {};
    let isValid = true;
    if (!contacts || contacts.length === 0) {
      setSaveErr('Please add at least the primary, secondary, and emergency contacts.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    contacts.forEach((c, idx) => {
      const cErrs = {};
      if (!c.full_name?.trim()) cErrs.full_name = 'Full Name is required';
      if (!c.designation?.trim()) cErrs.designation = 'Designation is required';
      if (!c.email?.trim()) cErrs.email = 'Email is required';
      else if (!emailRegex.test(c.email.trim())) cErrs.email = 'Enter a valid email address';
      if (!c.mobile?.trim()) cErrs.mobile = 'Mobile number is required';
      else if (c.mobile.trim().length !== 10) cErrs.mobile = 'Mobile number must be exactly 10 digits';
      if (Object.keys(cErrs).length > 0) {
        errMap[idx] = cErrs;
        isValid = false;
      }
    });
    setContactErrors(errMap);
    if (!isValid) {
      setSaveErr('Please fill in all mandatory contact fields with valid 10-digit mobile numbers.');
    } else {
      setSaveErr('');
    }
    return isValid;
  }

  async function handleSave() {
    if (!validateContacts()) return;
    setSaveErr('');
    setSave('saving');
    const payload = contacts.map(c => ({
      ...c,
      mobile: `${c.country_code || '+91'} ${c.mobile}`.trim(),
    }));
    await api('/api/contacts', { method:'POST', body: JSON.stringify({ client_id: clientId, contacts: payload }) });
    setSave('saved');
    setTimeout(() => { setSave(null); onSaved(); }, 800);
  }

  const coreTypes = { primary:'Primary Contact', secondary:'Secondary Contact', emergency:'Emergency Contact' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Escalation Matrix & Contacts</h2>
          <p className="text-slate-500 text-sm mt-0.5">Add mandatory escalation contacts for this client</p>
        </div>
        <SaveIndicator state={save} />
      </div>

      {saveErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{saveErr}</span>
        </div>
      )}

      {contacts.map((c, i) => (
        <ContactCard
          key={i}
          contact={c}
          errors={contactErrors[i] || {}}
          onChange={update(i)}
          onRemove={remove(i)}
          removable={!coreTypes[c.contact_type]}
          title={coreTypes[c.contact_type] || `Additional Contact ${i - 2}`}
        />
      ))}

      <button
        onClick={() => setContacts(cs => [...cs, emptyContact('additional')])}
        className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-500 text-slate-500 hover:text-blue-600 rounded-xl text-sm transition font-medium"
      >
        + Add Another Contact
      </button>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
          Save & Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Branding & Legal ──────────────────────────────────────────────────
function StepBranding({ clientId, onSaved }) {
  const [uploaded, setUploaded] = useState({});
  const [uploadErr, setUploadErr] = useState('');
  const fileRefs = useRef({});

  useEffect(() => {
    api(`/api/branding/${clientId}`).then(rows => {
      const map = {};
      if (Array.isArray(rows)) {
        rows.forEach(r => { map[r.doc_type] = r; });
      }
      setUploaded(map);
    }).catch(() => {});
  }, [clientId]);

  async function handleUpload(key, e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('client_id', clientId);
    fd.append('doc_type', key);
    const res = await fetch('/api/branding/upload', { method: 'POST', headers: authHeader(), body: fd }).then(r => r.json());
    if (res.ok) {
      setUploaded(u => ({ ...u, [key]: { ...res, original_name: file.name, doc_status: 'uploaded' } }));
      setUploadErr('');
    }
    e.target.value = '';
  }

  async function setDocStatus(key, status) {
    const doc = uploaded[key];
    if (!doc?.id) return;
    await fetch(`/api/branding/${doc.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ status }),
    });
    setUploaded(u => ({ ...u, [key]: { ...u[key], doc_status: status } }));
  }

  function handleContinue() {
    const requiredDocs = [
      { key: 'logo', label: 'Company Logo' },
      { key: 'nda', label: 'NDA' },
      { key: 'client_agreements', label: 'Client Agreements' }
    ];
    const missing = requiredDocs.filter(d => !uploaded[d.key] || uploaded[d.key].doc_status === 'expired');
    if (missing.length > 0) {
      setUploadErr(`Please upload all mandatory documents before continuing: ${missing.map(m => m.label).join(', ')}.`);
      return;
    }
    setUploadErr('');
    onSaved();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Branding & Legal Documents</h2>
        <p className="text-slate-500 text-sm mt-0.5">Upload mandatory company assets and legal agreements</p>
      </div>

      {uploadErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{uploadErr}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BRANDING_DOCS.map(doc => {
          const up     = uploaded[doc.key];
          const status = up?.doc_status || (up ? 'uploaded' : 'pending');
          const stCfg  = DOC_STATUS_CONFIG[status];
          const isMandatory = ['logo', 'nda', 'client_agreements'].includes(doc.key);

          return (
            <div key={doc.key} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xl flex-shrink-0">
                {doc.key === 'logo' ? '🖼️' : '📄'}
              </div>
              <div className="flex-1 min-w-0">
                {/* Title + status badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-900 text-sm font-semibold">
                    {doc.label} {isMandatory && <span className="text-red-500">*</span>}
                  </span>
                  <span className={`text-xs px-2 py-0.5 border rounded-full ${stCfg.cls}`}>
                    {stCfg.icon} {stCfg.label}
                  </span>
                </div>

                {up && <p className="text-slate-600 text-xs truncate mb-1 font-medium">{up.original_name}</p>}
                <p className="text-slate-400 text-xs mb-2">{doc.formats}</p>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Upload / Replace */}
                  <input
                    type="file"
                    accept={doc.accept}
                    className="hidden"
                    ref={el => fileRefs.current[doc.key] = el}
                    onChange={e => handleUpload(doc.key, e)}
                  />
                  <button
                    onClick={() => fileRefs.current[doc.key]?.click()}
                    className="text-xs px-3 py-1 bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition shadow-sm font-medium"
                  >
                    {up ? '↩ Replace' : '⬆ Upload'}
                  </button>

                  {/* Status controls (only if uploaded) */}
                  {up && (
                    <>
                      {status !== 'expired' && (
                        <button
                          onClick={() => setDocStatus(doc.key, 'expired')}
                          className="text-xs px-2.5 py-1 bg-white border border-slate-300 hover:border-red-400 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition shadow-sm font-medium"
                          title="Mark as Expired"
                        >
                          Mark Expired
                        </button>
                      )}
                      {status === 'expired' && (
                        <button
                          onClick={() => setDocStatus(doc.key, 'uploaded')}
                          className="text-xs px-2.5 py-1 bg-white border border-slate-300 hover:border-emerald-400 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition shadow-sm font-medium"
                        >
                          Mark Active
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleContinue} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
          Save & Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Step 6: Integrations & Stack ─────────────────────────────────────────────
function StepIntegrations({ clientId, liveModules, selectedFrameworks, selectedDomains, onSaved }) {
  const [selected, setSelected] = useState(new Set());   // "GroupId::ToolName"
  const [integErr, setIntegErr] = useState('');
  const [save, setSave]         = useState(null);

  // 'some' = this client already has a saved stack (it is used as-is),
  // 'none' = first visit (pre-filled from the step-10 selection), null = loading.
  const [savedState, setSavedState] = useState(null);

  // Load previously saved selections on mount
  useEffect(() => {
    api(`/api/integrations-stack/${clientId}`).then(rows => {
      if (Array.isArray(rows) && rows.length > 0) {
        setSelected(new Set(rows.filter(r => r.enabled).map(r => `${r.category}::${r.name}`)));
        setSavedState('some');
      } else {
        setSavedState('none');
      }
    }).catch(() => setSavedState('none'));
  }, [clientId]);

  // First visit only: pre-tick the integrations matching the tools chosen in
  // the previous step. Once a stack is saved it is never re-ticked, so a tool
  // the admin removed stays removed.
  useEffect(() => {
    if (savedState !== 'none') return;
    if (!liveModules || liveModules.size === 0) return;
    setSelected(prev => {
      const next = new Set(prev);
      INTEGRATION_CATALOG.forEach(g => {
        g.tools.forEach(t => {
          for (const m of liveModules) {
            const mLower = String(m || '').toLowerCase().trim();
            const tLower = String(t.name || '').toLowerCase().trim();
            if (mLower && (mLower.includes(tLower) || tLower.includes(mLower) || mLower.startsWith(tLower.slice(0, 5)))) {
              next.add(`${g.id}::${t.name}`);
            }
          }
        });
      });
      return next;
    });
  }, [liveModules, savedState]);

  const toggle = key => {
    setIntegErr('');
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  async function handleSave() {
    if (!selected || selected.size === 0) {
      setIntegErr('Please select at least one integration tool before continuing.');
      return;
    }
    setIntegErr('');
    setSave('saving');
    const items = [...selected].map(key => {
      const [category, name] = key.split('::');
      return { category, name, enabled: true };
    });
    try {
      await api('/api/integrations-stack', { method: 'POST', body: JSON.stringify({ client_id: clientId, items }) });
      setSave('saved');
      setTimeout(() => { setSave(null); onSaved(); }, 800);
    } catch (e) {
      setIntegErr(e.message || 'Failed to save integrations.');
      setSave(null);
    }
  }

  // Filter groups intelligently based on liveModules, selectedDomains, and selectedFrameworks.
  // Fallback: If no filter matches, show all INTEGRATION_CATALOG categories so user is never locked out.
  const visibleGroups = useMemo(() => {
    const modulesSet = liveModules || new Set();
    const domainsSet = new Set(selectedDomains || []);
    const fwSet = new Set(selectedFrameworks || []);

    if (modulesSet.size === 0 && domainsSet.size === 0 && fwSet.size === 0) {
      return INTEGRATION_CATALOG;
    }

    const filtered = INTEGRATION_CATALOG.filter(g => {
      // 1. Check against group modules / categories
      const modMatch = g.modules.some(m => {
        const mLower = m.toLowerCase();
        for (const item of modulesSet) {
          const iLower = String(item).toLowerCase();
          if (iLower.includes(mLower) || mLower.includes(iLower)) return true;
        }
        for (const d of domainsSet) {
          const dLower = String(d).toLowerCase();
          if (dLower.includes(mLower) || mLower.includes(dLower)) return true;
        }
        for (const f of fwSet) {
          const fLower = String(f).toLowerCase();
          if (fLower.includes(mLower) || mLower.includes(fLower)) return true;
        }
        return false;
      });
      if (modMatch) return true;

      // 2. Check against tool names
      const toolMatch = g.tools.some(t => {
        const tLower = t.name.toLowerCase();
        for (const item of modulesSet) {
          const iLower = String(item).toLowerCase();
          if (iLower.includes(tLower) || tLower.includes(iLower)) return true;
        }
        return false;
      });
      if (toolMatch) return true;

      return false;
    });

    return filtered.length > 0 ? filtered : INTEGRATION_CATALOG;
  }, [liveModules, selectedDomains, selectedFrameworks]);

  const totalSelected = selected.size;
  const moduleList = liveModules ? [...liveModules] : [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Integrations & Security Stack</h2>
          <p className="text-slate-500 text-sm mt-0.5">Showing integrations relevant to your selected security modules and tools</p>
        </div>
        <SaveIndicator state={save} />
      </div>

      {integErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{integErr}</span>
        </div>
      )}

      {/* Active filter context banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">🔗</span>
          <div className="flex-1 min-w-0">
            <div className="text-blue-900 font-semibold text-sm mb-1">
              {moduleList.length > 0
                ? `Mapped from ${moduleList.length} selected tool${moduleList.length !== 1 ? 's' : ''}/module${moduleList.length !== 1 ? 's' : ''} · ${visibleGroups.length} integration categories · ${totalSelected} tools selected`
                : `${visibleGroups.length} integration categories available · ${totalSelected} tools selected`}
            </div>
            {moduleList.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {moduleList.map(m => (
                  <span key={m} className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-medium">{m}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-[10px] text-blue-700">
          ℹ️ Select the tools and integrations actively deployed or planned for this client.
        </div>
      </div>

      <div className="space-y-4">
        {visibleGroups.map(group => {
          const groupSelected = group.tools.filter(t => selected.has(`${group.id}::${t.name}`));
          const allGroupSel = groupSelected.length === group.tools.length;
          return (
            <div key={group.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{group.icon}</span>
                <span className="font-semibold text-slate-900 text-sm">{group.label}</span>
                <span className="ml-auto text-xs text-slate-400">{groupSelected.length}/{group.tools.length}</span>
                <button type="button"
                  onClick={() => {
                    setIntegErr('');
                    setSelected(s => {
                      const n = new Set(s);
                      group.tools.forEach(t => allGroupSel ? n.delete(`${group.id}::${t.name}`) : n.add(`${group.id}::${t.name}`));
                      return n;
                    });
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition font-medium">
                  {allGroupSel ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {group.tools.map(tool => {
                  const key = `${group.id}::${tool.name}`;
                  const on = selected.has(key);
                  return (
                    <div key={tool.name} onClick={() => toggle(key)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all select-none ${on ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-slate-900 text-xs font-semibold leading-tight">{tool.name}</span>
                        <div className={`flex-shrink-0 w-3.5 h-3.5 rounded border ${on ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'} flex items-center justify-center`}>
                          {on && <span className="text-white" style={{fontSize:'8px'}}>✓</span>}
                        </div>
                      </div>
                      <div className="text-gray-500 text-[10px] leading-tight">{tool.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
          Save & Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Asset Inventory ───────────────────────────────────────────────────
const AssetTab = forwardRef(function AssetTab({ clientId, assetType, label, onUpdate }, ref) {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');
  const [bulk, setBulk] = useState('');
  const [facing, setFacing] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const loadItems = useCallback(() => {
    if (!clientId) return;
    api(`/api/asset-inventory/${clientId}`).then(rows => {
      if (Array.isArray(rows)) {
        setItems(rows.filter(r => r.asset_type === assetType));
      }
    }).catch(() => {});
  }, [clientId, assetType]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function addSingle(customVal, customFacing) {
    const val = (typeof customVal === 'string' ? customVal : input).trim();
    const isFacing = typeof customFacing === 'boolean' ? customFacing : facing;
    if (!val) return;
    setAdding(true);
    try {
      const res = await api('/api/asset-inventory', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, asset_type: assetType, value: val, internet_facing: isFacing })
      });
      if (res?.ok || res?.id) {
        setInput('');
        setFacing(false);
        setMsg(`✓ Added ${val}`);
        setTimeout(() => setMsg(''), 3000);
        loadItems();
        onUpdate?.();
      }
    } catch (e) {
      console.error('Error adding asset:', e);
    } finally {
      setAdding(false);
    }
  }

  async function addBulk(customBulk) {
    const text = typeof customBulk === 'string' ? customBulk : bulk;
    const values = text.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
    if (!values.length) return;
    setAdding(true);
    try {
      const res = await api('/api/asset-inventory/bulk', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, asset_type: assetType, values })
      });
      if (res?.ok) {
        setBulk('');
        setMsg(`✓ Added ${values.length} ${label.toLowerCase()}`);
        setTimeout(() => setMsg(''), 3000);
        loadItems();
        onUpdate?.();
      }
    } catch (e) {
      console.error('Error bulk adding:', e);
    } finally {
      setAdding(false);
    }
  }

  useImperativeHandle(ref, () => ({
    commitPending: async () => {
      if (input.trim()) {
        await addSingle(input, facing);
      }
      if (bulk.trim()) {
        await addBulk(bulk);
      }
    }
  }));

  async function handleCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const values = text.split(/[\n,\r]+/).map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
    if (!values.length) return;
    await api('/api/asset-inventory/bulk', { method:'POST', body: JSON.stringify({ client_id: clientId, asset_type: assetType, values }) });
    setMsg(`✓ Uploaded ${values.length} items from CSV`);
    setTimeout(() => setMsg(''), 3000);
    loadItems();
    onUpdate?.();
    e.target.value = '';
  }

  async function remove(id) {
    await fetch(`/api/asset-inventory/${id}`, { method:'DELETE', headers: authHeader() });
    setItems(it => it.filter(x => x.id !== id));
    onUpdate?.();
  }

  const filtered = items.filter(i => search === '' || (i.value || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-lg font-medium">
          {msg}
        </div>
      )}

      {/* Manual add */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">Add {label} Manually</h4>
        <div className="flex gap-2">
          <input
            className={inputCls + " flex-1"}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()} (e.g. ${assetType === 'ip' ? '192.168.1.1' : assetType === 'hostname' ? 'app-server-01' : 'example.com'})…`}
            onKeyDown={e => e.key === 'Enter' && addSingle()}
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap cursor-pointer font-medium">
            <input type="checkbox" checked={facing} onChange={e => setFacing(e.target.checked)} className="accent-blue-500" />
            Internet-facing
          </label>
          <button
            type="button"
            onClick={() => addSingle()}
            disabled={adding || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Bulk import */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">Bulk Import <span className="text-slate-400 text-xs font-normal">(one per line or comma-separated)</span></h4>
        <textarea className={inputCls} rows={3} value={bulk} onChange={e => setBulk(e.target.value)} placeholder={`192.168.1.1\n10.0.0.1\n…`} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addBulk()}
            disabled={adding || !bulk.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition shadow-sm"
          >
            ⬆ CSV / TXT
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
        </div>
      </div>

      {/* Table */}
      {items.length > 0 && (
        <div className="space-y-2">
          <input className={inputCls} placeholder="🔍  Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <th className="text-left px-4 py-2.5">Value</th>
                  <th className="text-left px-4 py-2.5">Internet-Facing</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                    <td className="px-4 py-2 text-slate-900 font-mono text-xs">{item.value}</td>
                    <td className="px-4 py-2">
                      {item.internet_facing
                        ? <span className="text-xs px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-semibold">🌐 Yes</span>
                        : <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-medium">Internal</span>
                      }
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs capitalize">{item.exposure_status || 'tracked'}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => remove(item.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs font-medium">{items.length} {label.toLowerCase()} configured in database</p>
        </div>
      )}
    </div>
  );
});

function StepAssetInventory({ clientId, onSaved }) {
  const [tab, setTab] = useState('hostname');
  const [savingStep, setSavingStep] = useState(false);
  const [allAssets, setAllAssets] = useState([]);
  const tabRef = useRef();

  const loadAllAssets = useCallback(() => {
    if (!clientId) return;
    api(`/api/asset-inventory/${clientId}`).then(rows => {
      setAllAssets(Array.isArray(rows) ? rows : []);
    }).catch(() => {});
  }, [clientId]);

  useEffect(() => {
    loadAllAssets();
  }, [loadAllAssets]);

  const tabs = [
    { key:'hostname',  label:'Hostnames',    icon:'🖥️' },
    { key:'ip',        label:'IP Addresses', icon:'🔢' },
    { key:'domain',    label:'Domains',      icon:'🌐' },
    { key:'subdomain', label:'Subdomains',   icon:'🔗' },
  ];

  async function handleTabChange(newTab) {
    if (tabRef.current?.commitPending) {
      await tabRef.current.commitPending();
    }
    setTab(newTab);
    loadAllAssets();
  }

  async function handleSaveContinue() {
    setSavingStep(true);
    try {
      if (tabRef.current?.commitPending) {
        await tabRef.current.commitPending();
      }
    } catch (e) {
      console.error('Commit pending error:', e);
    }
    setSavingStep(false);
    onSaved();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">External Attack Surface & Asset Inventory</h2>
        <p className="text-slate-500 text-sm mt-0.5">Manage hostnames, IPs, domains, and subdomains</p>
      </div>

      <div className="flex gap-1.5">
        {tabs.map(t => {
          const count = allAssets.filter(a => a.asset_type === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                tab === t.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ml-1 ${
                  tab === t.key ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AssetTab ref={tabRef} clientId={clientId} assetType={tab} label={tabs.find(t => t.key === tab)?.label || tab} onUpdate={loadAllAssets} />

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveContinue}
          disabled={savingStep}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-sm disabled:opacity-50"
        >
          {savingStep ? '⏳ Saving…' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}

// ─── Completion Page ───────────────────────────────────────────────────────────
function CompletionPage({ clientId, clientName }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    const ah = authHeader();
    const safeGet = (url, fallback) =>
      fetch(url, { headers: ah })
        .then(r => r.ok ? r.json() : fallback)
        .catch(() => fallback);

    Promise.all([
      safeGet(`/api/company-info/${clientId}`, {}),
      safeGet(`/api/contacts/${clientId}`, []),
      safeGet(`/api/branding/${clientId}`, []),
      safeGet(`/api/repository/${clientId}`, []),
      safeGet(`/api/contract-tenure/${clientId}`, {}),
      safeGet(`/api/asset-inventory/${clientId}`, []),
      safeGet(`/api/assets?client_id=${clientId}`, []),
      safeGet(`/api/framework-selections/${clientId}`, { framework_ids: [] }),
      safeGet(`/api/domain-selections/${clientId}`, { domain_ids: [] }),
      safeGet(`/api/control-selections/${clientId}`, { control_ids: [] }),
      safeGet(`/api/tool-selections/${clientId}`, { tool_names: [] }),
      safeGet(`/api/integrations-stack/${clientId}`, []),
      safeGet(`/api/employees/${clientId}`, []),
      safeGet(`/api/users?client_id=${clientId}`, []),
      safeGet(`/api/settings?client_id=${clientId}`, {}),
      safeGet(`/api/onboarding-modules/${clientId}`, []),
      safeGet(`/api/cloud-selections/${clientId}`, { providers: [] }),
    ]).then(([
      co,
      contacts,
      brand,
      repo,
      contract,
      assetInv,
      regAssets,
      frameSel,
      domSel,
      ctrlSel,
      toolSel,
      integs,
      emps,
      users,
      settings,
      onbMods,
      cloudSel
    ]) => {
      // 1. Company
      const company = co?.company_name || clientName;
      const industry = co?.industry;
      const size = co?.company_size;
      const location = [co?.city, co?.country].filter(Boolean).join(', ');

      // 2. Frameworks
      const fwList = frameSel?.framework_ids || [];
      const frameworksCount = fwList.length;
      const frameworksSummary = fwList.length > 0
        ? (fwList.slice(0, 2).join(', ') + (fwList.length > 2 ? ` +${fwList.length - 2} more` : ''))
        : 'selected for this client';

      // 2b. CSPM cloud scope — only meaningful when CSPM was selected above
      const cspmSelected = fwList.some(f => String(f).toLowerCase().includes('cspm'));
      const providerLabels = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
      const cloudScope = (cloudSel?.providers || [])
        .map(cp => providerLabels[String(cp).toLowerCase()])
        .filter(Boolean);

      // 3. Security Domains & Controls
      const domList = domSel?.domain_ids || [];
      const ctrlList = ctrlSel?.control_ids || [];
      const domainsCount = domList.length;
      const controlsCount = ctrlList.length;

      // 4. Security Tools
      const toolList = toolSel?.tool_names || [];
      const toolsCount = toolList.length;
      const toolsSummary = toolList.length > 0
        ? (toolList.slice(0, 2).join(', ') + (toolList.length > 2 ? ` +${toolList.length - 2} more` : ''))
        : 'selected security stack';

      // 5. Assets & Attack Surface
      const rawAssetInv = Array.isArray(assetInv) ? assetInv : [];
      const rawRegAssets = Array.isArray(regAssets) ? regAssets : [];

      const hostnames = rawAssetInv.filter(a => a.asset_type === 'hostname').length
        + rawRegAssets.filter(a => a.host || a.dns_name).length;
      const ips = rawAssetInv.filter(a => a.asset_type === 'ip').length
        + rawRegAssets.filter(a => a.ip_address).length;
      const domains = rawAssetInv.filter(a => a.asset_type === 'domain' || a.asset_type === 'subdomain').length
        + rawRegAssets.filter(a => a.dns_name && !a.host).length;

      const exposedInv = rawAssetInv.filter(a => a.internet_facing === true || a.internet_facing === 1 || a.internet_facing === 'true' || a.internet_facing === '1').length;
      const exposedReg = rawRegAssets.filter(a => a.facing === 'external' || a.facing === 'internet_facing').length;
      const internetFacing = exposedInv + exposedReg;
      const totalAssets = rawAssetInv.length + rawRegAssets.length;

      // 6. Contacts & Users
      const rawContacts = Array.isArray(contacts) ? contacts : [];
      const contactsCount = rawContacts.filter(c => c.name || c.email || c.mobile).length;
      const rawEmps = Array.isArray(emps) ? emps : [];
      const rawUsers = Array.isArray(users) ? users : (Array.isArray(users?.users) ? users.users : []);
      const employeesCount = rawEmps.length;
      const platformUsersCount = rawUsers.length;
      const totalUsers = employeesCount + platformUsersCount;

      // 7. Docs & Branding
      const brandDocs = Array.isArray(brand) ? brand.length : 0;
      const repoFiles = Array.isArray(repo) ? repo.length : 0;

      // 8. Integrations & Platform Settings
      const rawIntegs = Array.isArray(integs) ? integs : [];
      const enabledIntegs = rawIntegs.filter(i => i.enabled).length;
      const rawMods = Array.isArray(onbMods) ? onbMods : [];
      const enabledMods = rawMods.filter(m => m.enabled).length;
      const enabledSettings = Object.entries(settings || {}).filter(([k, v]) => k.endsWith('_enabled') && (v === 'true' || v === true)).length;

      // Contract
      const contractTenure = contract?.renewal_tracking || 'Active Contract';

      setStats({
        company,
        industry,
        size,
        location,
        frameworksCount,
        frameworksSummary,
        cspmSelected,
        cloudScope,
        domainsCount,
        controlsCount,
        toolsCount,
        toolsSummary,
        hostnames,
        ips,
        domains,
        internetFacing,
        totalAssets,
        contactsCount,
        employeesCount,
        platformUsersCount,
        totalUsers,
        brandDocs,
        repoFiles,
        enabledIntegs,
        enabledMods,
        enabledSettings,
        contractTenure,
      });
      setLoading(false);
    });
  }, [clientId, clientName]);

  const widgets = [
    {
      icon: '🏢',
      title: 'Company Profile',
      value: stats.company || clientName,
      sub: [stats.industry, stats.size, stats.location].filter(Boolean).join(' · ') || 'Company profile verified',
    },
    {
      icon: '🛡️',
      title: 'Security Modules & Controls',
      value: `${stats.controlsCount || stats.enabledMods || 0} active controls`,
      sub: stats.domainsCount ? `across ${stats.domainsCount} security domains` : 'governed security controls',
    },
    {
      icon: '👥',
      title: 'Contacts & Team',
      value: `${stats.contactsCount || 0} contacts`,
      sub: `${stats.totalUsers || 0} employees & platform users`,
    },
    {
      icon: '📁',
      title: 'Repository & Branding',
      value: `${stats.brandDocs || 0} legal docs`,
      sub: `+ ${stats.repoFiles || 0} repository files`,
    },
    {
      icon: '🔧',
      title: 'Security Tools',
      value: `${stats.toolsCount || 0} tools`,
      sub: stats.toolsSummary || 'selected security stack',
    },
    {
      icon: '🏛️',
      title: 'Compliance Frameworks',
      value: `${stats.frameworksCount || 0} frameworks`,
      sub: stats.frameworksSummary || 'selected for this client',
    },
    ...(stats.cspmSelected ? [{
      icon: '☁️',
      title: 'CSPM Cloud Scope',
      value: (stats.cloudScope || []).length > 0 ? (stats.cloudScope || []).join(', ') : 'Not set',
      sub: (stats.cloudScope || []).length > 0
        ? '60-question cloud discovery issued'
        : 'select a cloud platform in Step 8',
    }] : []),
    {
      icon: '🗺️',
      title: 'Asset Inventory',
      value: `${stats.totalAssets || 0} total`,
      sub: `${stats.hostnames || 0} hostnames · ${stats.ips || 0} IPs · ${stats.domains || 0} domains`,
    },
    {
      icon: '🌐',
      title: 'Internet-Facing Assets',
      value: `${stats.internetFacing || 0} exposed`,
      sub: 'tracked for attack surface',
    },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Onboarding Complete!</h1>
        <p className="text-slate-500">{stats.company || clientName} has been fully onboarded to the vCISO platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {widgets.map(w => (
          <div key={w.title} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
            <div className="text-2xl mb-2">{w.icon}</div>
            <div className="text-slate-900 font-bold text-lg leading-tight truncate">{w.value}</div>
            <div className="text-gray-500 text-xs mt-1 leading-tight truncate">{w.sub}</div>
            <div className="text-gray-600 text-xs mt-1 font-semibold uppercase tracking-wider">{w.title}</div>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center shadow-sm">
        <div className="text-emerald-800 font-semibold mb-1">✅ Security Posture Summary</div>
        <p className="text-emerald-700 text-sm">
          {stats.frameworksCount || 0} compliance frameworks tracked · {stats.controlsCount || 0} security controls governed · {stats.toolsCount || 0} security tools active · {stats.totalAssets || 0} assets ({stats.internetFacing || 0} external) monitored · {stats.contactsCount || 0} escalation contacts configured
        </p>
      </div>

      <div className="flex justify-center mt-8">
        <a href="/dashboard/admin/clients" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition text-sm shadow-sm">
          → Go to Dashboard
        </a>
      </div>
    </div>
  );
}

// ─── Client Picker (inline, no pre-navigation needed) ─────────────────────────
function ClientPicker({ onSelect }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients', { headers: authHeader() })
      .then(r => r.json())
      .then(data => { setClients(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);


  if (loading) return <div className="flex items-center justify-center h-60 text-gray-400">Loading clients…</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="text-5xl mb-4">🏢</div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Client</h2>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-sm">Choose the client you want to onboard. You can switch clients any time from the Clients tab.</p>
      <div className="w-full max-w-md space-y-2">
        {clients.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full flex items-center gap-4 bg-white border border-slate-200 hover:border-blue-500 rounded-2xl px-5 py-4 text-left transition shadow-sm group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-base flex-shrink-0">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-900 font-bold text-sm group-hover:text-blue-600">{c.name}</div>
              <div className="text-slate-500 text-xs">{c.industry} · {c.status}</div>
            </div>
            <span className="text-slate-400 group-hover:text-blue-600 font-bold">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 7: Asset & Employee Registry ────────────────────────────────────────
function StepAssetRegistry({ clientId, onSaved }) {
  const EMPTY = { name:'', email:'', phone:'', department:'', role:'', host:'', ip_address:'', dns_name:'', facing:'internal' };
  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [modalErr, setModalErr]     = useState('');
  const [registryErr, setRegistryErr] = useState('');
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [save, setSaveInd]          = useState(null);

  const load = () => {
    api(`/api/assets?client_id=${clientId}`)
      .then(d => {
        const rows = Array.isArray(d) ? d : [];
        setAssets(rows);
        if (rows.length > 0) setRegistryErr('');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [clientId]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormErrors({});
    setModalErr('');
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      name: a.name || '',
      email: a.email || '',
      phone: a.phone || '',
      department: a.department || '',
      role: a.role || '',
      host: a.host || '',
      ip_address: a.ip_address || '',
      dns_name: a.dns_name || '',
      facing: a.facing || 'internal'
    });
    setFormErrors({});
    setModalErr('');
    setShowModal(true);
  };

  const validateModal = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = 'Name is mandatory';
    if (!form.role?.trim()) errs.role = 'Role is mandatory';
    if (!form.department?.trim()) errs.department = 'Department is mandatory';
    if (!form.email?.trim()) {
      errs.email = 'Email is mandatory';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.phone?.trim()) {
      errs.phone = 'Phone number is mandatory';
    } else if (!/^\d{10}$/.test(form.phone.trim())) {
      errs.phone = 'Phone number must be exactly 10 digits';
    }
    if (!form.facing?.trim()) {
      errs.facing = 'Facing selection is mandatory';
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      setModalErr('Please fill in all 6 mandatory fields (Name, Role, Department, Email, Phone, Facing) before saving.');
      return false;
    }
    setModalErr('');
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateModal()) return;
    setSaving(true);
    const url = editing ? `/api/assets/${editing.id}` : '/api/assets';
    await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ ...form, client_id: clientId })
    });
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await fetch(`/api/assets/${id}`, { method:'DELETE', headers: authHeader() });
    load();
  };

  const handleContinue = () => {
    if (assets.length === 0) {
      setRegistryErr('Please add at least one employee or asset record before continuing.');
      return;
    }
    setRegistryErr('');
    setSaveInd('saved');
    setTimeout(() => { setSaveInd(null); onSaved(); }, 800);
  };

  const displayed = assets.filter(a => !search || ['name','email','department','role','host','ip_address'].some(f => (a[f]||'').toLowerCase().includes(search.toLowerCase())));

  const set = k => e => {
    let val = e.target.value;
    if (k === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 10);
    }
    setForm(f => ({ ...f, [k]: val }));
    setFormErrors(prev => ({ ...prev, [k]: '' }));
    setModalErr('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Asset & Employee Registry</h2>
          <p className="text-slate-500 text-sm mt-0.5">Register people, devices, and infrastructure assets for this client</p>
        </div>
        <SaveIndicator state={save} />
      </div>

      {registryErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{registryErr}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-white border border-slate-300 text-slate-900 text-sm rounded-xl px-4 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-sm" />
        <button onClick={openAdd} className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm">+ Add Record</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                {['Name / Device','Department','Role','Email','Host / IP','Facing','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-10">Loading...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-10">No records yet — click + Add Record</td></tr>
              ) : displayed.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {(a.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <span className="text-slate-900 font-medium whitespace-nowrap">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{a.department||'—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{a.role||'—'}</td>
                  <td className="px-4 py-3 text-blue-600 text-xs">{a.email ? <a href={`mailto:${a.email}`}>{a.email}</a> : '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{a.host || a.ip_address || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.facing==='external' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{a.facing||'internal'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">✏️</button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editing ? 'Edit Record' : 'Add Record'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none font-bold">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-4" noValidate>
              {modalErr && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{modalErr}</span>
                </div>
              )}
              <div>
                <div className="text-slate-700 text-xs font-semibold uppercase tracking-wide mb-2">Personnel & Role Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Rahul Sharma"
                      className={`w-full bg-white border ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'} text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 placeholder-slate-400 shadow-sm transition`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <span>❌</span> {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.role}
                      onChange={set('role')}
                      placeholder="Sr. Security Engineer"
                      className={`w-full bg-white border ${formErrors.role ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'} text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 placeholder-slate-400 shadow-sm transition`}
                    />
                    {formErrors.role && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <span>❌</span> {formErrors.role}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.department}
                      onChange={set('department')}
                      placeholder="Infrastructure / IT"
                      className={`w-full bg-white border ${formErrors.department ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'} text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 placeholder-slate-400 shadow-sm transition`}
                    />
                    {formErrors.department && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <span>❌</span> {formErrors.department}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="rahul@company.com"
                      className={`w-full bg-white border ${formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'} text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 placeholder-slate-400 shadow-sm transition`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <span>❌</span> {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="9876543210"
                      className={`w-full bg-white border ${formErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'} text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 placeholder-slate-400 shadow-sm transition`}
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <span>❌</span> {formErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Facing <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.facing}
                      onChange={set('facing')}
                      className={`w-full bg-white border ${formErrors.facing ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'} text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 shadow-sm cursor-pointer transition`}
                    >
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                    {formErrors.facing && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <span>❌</span> {formErrors.facing}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-slate-700 text-xs font-semibold uppercase tracking-wide mb-2">Infrastructure</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Host</label>
                    <input value={form.host} onChange={set('host')} placeholder="web-server-01" className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-slate-400 shadow-sm transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IP Address</label>
                    <input value={form.ip_address} onChange={set('ip_address')} placeholder="192.168.1.10" className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-slate-400 shadow-sm transition" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">DNS Name</label>
                    <input value={form.dns_name} onChange={set('dns_name')} placeholder="web01.internal.com" className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-slate-400 shadow-sm transition" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 pb-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-700 border border-slate-300 hover:bg-slate-50 transition font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={handleContinue}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-sm">
          Save & Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Step 8: Platform Configuration ───────────────────────────────────────────
const PLATFORM_FEATURES = [
  {
    category: 'Communications',
    features: [
      { key:'smtp_enabled',      icon:'✉️',  label:'Email / SMTP',              desc:'Send automated alerts, reports and notifications via email',
        fields:[{k:'smtp_host',l:'SMTP Host',ph:'smtp.gmail.com'},{k:'smtp_port',l:'SMTP Port',ph:'587'},{k:'smtp_username',l:'Username',ph:'you@gmail.com'},{k:'smtp_password',l:'Password',ph:'••••••••',type:'password'},{k:'smtp_from',l:'From Address',ph:'vciso@company.com',type:'email'}] },
      { key:'slack_enabled',     icon:'💬',  label:'Slack Integration',         desc:'Send security alerts and updates to Slack channels',
        fields:[{k:'slack_webhook',l:'Webhook URL',ph:'https://hooks.slack.com/services/...'},{k:'slack_channel',l:'Default Channel',ph:'#security-alerts'}] },
      { key:'teams_enabled',     icon:'💼',  label:'Microsoft Teams',           desc:'Send notifications to Microsoft Teams channels',
        fields:[{k:'teams_webhook',l:'Webhook URL',ph:'https://outlook.office.com/webhook/...'}] },
    ],
  },
  {
    category: 'Ticketing',
    features: [
      { key:'jira_enabled',      icon:'🎯',  label:'Jira Integration',          desc:'Create and sync security tickets in Jira automatically',
        fields:[{k:'jira_url',l:'Jira URL',ph:'https://company.atlassian.net'},{k:'jira_project_key',l:'Project Key',ph:'SEC'},{k:'jira_email',l:'Jira Email',ph:'admin@company.com'},{k:'jira_api_token',l:'API Token',ph:'••••••••••••••••',type:'password'}] },
      { key:'servicenow_enabled',icon:'🟢',  label:'ServiceNow',                desc:'Sync incidents and findings with ServiceNow ITSM',
        fields:[{k:'snow_instance',l:'Instance URL',ph:'https://company.service-now.com'},{k:'snow_username',l:'Username',ph:'admin'},{k:'snow_password',l:'Password',ph:'••••••••',type:'password'}] },
    ],
  },
  {
    category: 'Security Features',
    features: [
      { key:'vuln_scanning_enabled',    icon:'🔍', label:'Automated Vulnerability Scanning', desc:'Enable scheduled vulnerability scans for this client', fields:[] },
      { key:'sla_tracking_enabled',     icon:'⏱️', label:'SLA Tracking',                  desc:'Track remediation SLAs for findings, risks, and tickets', fields:[] },
      { key:'threat_feeds_enabled',     icon:'🕵️', label:'Threat Intelligence Feeds',      desc:'Enable real-time threat feeds and IOC monitoring', fields:[] },
      { key:'asset_discovery_enabled',  icon:'🔎', label:'Asset Discovery',               desc:'Automatically discover and catalog client assets', fields:[] },
    ],
  },
  {
    category: 'Reporting & Access',
    features: [
      { key:'executive_reports_enabled',icon:'📊', label:'Executive Reports',             desc:'Generate and schedule automated executive security reports', fields:[] },
      { key:'client_portal_enabled',    icon:'🌐', label:'Client Portal Access',          desc:'Enable the client-facing security dashboard and portal', fields:[] },
      { key:'api_access_enabled',       icon:'🔌', label:'API Access',                    desc:'Enable programmatic API access for integrations', fields:[] },
      { key:'audit_logging_enabled',    icon:'📋', label:'Audit Logging',                 desc:'Log all admin and user actions for this client', fields:[] },
    ],
  },
];

function PlatformFeatureCard({ feature, settings, fieldErrors = {}, onToggle, onFieldChange }) {
  const enabled = settings[feature.key] === 'true';
  return (
    <div className={`rounded-xl border transition-all ${enabled ? 'border-blue-300 bg-blue-50/40 shadow-sm' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{feature.icon}</span>
          <div>
            <div className="text-slate-900 font-semibold text-sm">{feature.label}</div>
            <div className="text-slate-500 text-xs leading-tight">{feature.desc}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggle(feature.key, !enabled)}
          className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ml-4"
          style={{ background: enabled ? '#2563eb' : th('#cbd5e1', { dark: '#334155' }) }}
        >
          <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
            style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
        </button>
      </div>
      {enabled && feature.fields.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200 pt-3">
          {feature.fields.map(f => {
            const hasErr = !!fieldErrors[f.k];
            return (
              <div key={f.k} className={f.k.includes('url') || f.k.includes('webhook') ? 'md:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {f.l} <span className="text-red-500">*</span>
                </label>
                <input
                  type={f.type || 'text'}
                  value={settings[f.k] || ''}
                  onChange={e => onFieldChange(f.k, e.target.value)}
                  placeholder={f.ph}
                  className={`w-full bg-white border ${
                    hasErr ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'
                  } text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 placeholder-slate-400 shadow-sm transition`}
                />
                {hasErr && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <span>❌</span> {fieldErrors[f.k]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Features that should be on by default for every new client
const PLATFORM_DEFAULTS = {
  executive_reports_enabled: 'true',
  client_portal_enabled:     'true',
  api_access_enabled:        'true',
  audit_logging_enabled:     'true',
};

function StepPlatformConfig({ clientId, onSaved }) {
  const [settings, setSettings]       = useState({ ...PLATFORM_DEFAULTS });
  const [fieldErrors, setFieldErrors] = useState({});
  const [configErr, setConfigErr]     = useState('');
  const [save, setSave]               = useState(null);

  useEffect(() => {
    fetch(`/api/settings?client_id=${clientId}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => setSettings(() => ({ ...PLATFORM_DEFAULTS, ...d })))
      .catch(() => {});
  }, [clientId]);

  const handleToggle = async (key, val) => {
    const strVal = String(val);
    setSettings(s => ({ ...s, [key]: strVal }));
    setConfigErr('');

    if (!val) {
      const feat = PLATFORM_FEATURES.flatMap(c => c.features).find(f => f.key === key);
      if (feat && feat.fields) {
        setFieldErrors(prev => {
          const next = { ...prev };
          feat.fields.forEach(fd => delete next[fd.k]);
          return next;
        });
      }
    }

    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ client_id: clientId, key, value: strVal })
    }).catch(() => {});
  };

  const handleFieldChange = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }));
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setConfigErr('');
  };

  function validateSettings() {
    const errs = {};
    const missingFeatureLabels = [];

    PLATFORM_FEATURES.forEach(cat => {
      cat.features.forEach(f => {
        const isEnabled = settings[f.key] === 'true';
        if (isEnabled && f.fields.length > 0) {
          let featureHasMissing = false;
          f.fields.forEach(fd => {
            const val = String(settings[fd.k] || '').trim();
            if (!val) {
              errs[fd.k] = `${fd.l} is required`;
              featureHasMissing = true;
            }
          });
          if (featureHasMissing) {
            missingFeatureLabels.push(f.label);
          }
        }
      });
    });

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      setConfigErr(`Please fill in all configuration fields for enabled features (${missingFeatureLabels.join(', ')}) before continuing.`);
      return false;
    }

    const enabledCount = PLATFORM_FEATURES.flatMap(c => c.features).filter(f => settings[f.key] === 'true').length;
    if (enabledCount === 0) {
      setConfigErr('Please enable at least one platform feature before continuing.');
      return false;
    }

    setConfigErr('');
    return true;
  }

  const saveAll = async () => {
    if (!validateSettings()) return;

    setSave('saving');
    const allSettings = {};
    PLATFORM_FEATURES.flatMap(cat => cat.features).forEach(f => {
      allSettings[f.key] = settings[f.key] || 'false';
      f.fields.forEach(fd => {
        allSettings[fd.k] = settings[fd.k] || '';
      });
    });

    try {
      const res = await fetch('/api/settings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ client_id: clientId, settings: allSettings })
      });
      if (!res.ok) throw new Error('Batch save failed');
      setSave('saved');
      setTimeout(() => { setSave(null); onSaved(); }, 800);
    } catch {
      await Promise.all(Object.entries(allSettings).map(([key, value]) =>
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ client_id: clientId, key, value })
        })
      ));
      setSave('saved');
      setTimeout(() => { setSave(null); onSaved(); }, 800);
    }
  };

  const enabledCount = PLATFORM_FEATURES.flatMap(c => c.features).filter(f => settings[f.key] === 'true').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Platform Configuration</h2>
          <p className="text-slate-500 text-sm mt-0.5">Enable features and integrations for this client — can be changed anytime</p>
        </div>
        <SaveIndicator state={save} />
      </div>

      {configErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{configErr}</span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
        <span className="text-2xl">⚙️</span>
        <div>
          <div className="text-slate-900 font-semibold text-sm">{enabledCount} features enabled</div>
          <div className="text-blue-700 text-xs">Toggle each feature on or off — credentials expand automatically when enabled</div>
        </div>
      </div>

      {PLATFORM_FEATURES.map(cat => (
        <div key={cat.category}>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">{cat.category}</div>
          <div className="space-y-3">
            {cat.features.map(f => (
              <PlatformFeatureCard
                key={f.key}
                feature={f}
                settings={settings}
                fieldErrors={fieldErrors}
                onToggle={handleToggle}
                onFieldChange={handleFieldChange}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button onClick={saveAll} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-sm">
          Save & Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Contract Tenure ──────────────────────────────────────────────────
// ─── Date Picker Component ─────────────────────────────────────────────────────
function DatePicker({ value, onChange, label, required, includeTime = false }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(null);
  const [viewMonth, setViewMonth] = useState(null);
  const [timeVal, setTimeVal] = useState('09:00');
  const ref = useRef();

  const parsed = value ? new Date(value) : null;

  // Init view from value or today
  useEffect(() => {
    const base = parsed || new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    if (parsed && includeTime) {
      const hh = String(parsed.getHours()).padStart(2,'0');
      const mm = String(parsed.getMinutes()).padStart(2,'0');
      setTimeVal(`${hh}:${mm}`);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  function getDays() {
    const first = new Date(viewYear, viewMonth, 1).getDay();
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }

  function selectDay(day) {
    if (!day) return;
    const d = new Date(viewYear, viewMonth, day);
    let iso;
    if (includeTime) {
      const [hh, mm] = timeVal.split(':');
      d.setHours(+hh, +mm);
      iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${timeVal}`;
    } else {
      iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    onChange(iso);
    if (!includeTime) setOpen(false);
  }

  function onTimeChange(t) {
    setTimeVal(t);
    if (parsed) {
      const base = `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
      onChange(`${base}T${t}`);
    }
  }

  function formatDisplay(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return v;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const base = `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    if (includeTime) return `${base}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return base;
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  const years = Array.from({ length: 16 }, (_, i) => todayYear - 3 + i);
  const cells = getDays();

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-white border border-slate-300 text-sm rounded-lg px-3 py-2.5 transition focus:outline-none focus:border-blue-500 hover:border-slate-400 shadow-sm">
        <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {value ? formatDisplay(value) : `Select ${includeTime ? 'date & time' : 'date'}`}
        </span>
        <span className="text-gray-500 text-base">📅</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-72">
          {/* Month / Year selectors */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); }}
              className="text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition text-lg font-bold">‹</button>
            <div className="flex gap-1.5 flex-1 justify-center">
              <select value={viewMonth} onChange={e => setViewMonth(+e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                {MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={e => setViewYear(+e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); }}
              className="text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition text-lg font-bold">›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1">{d}</div>)}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              const isSelected = parsed && day &&
                parsed.getDate() === day && parsed.getMonth() === viewMonth && parsed.getFullYear() === viewYear;
              const isToday = day && viewYear === todayYear && viewMonth === todayMonth && day === todayDate;
              return (
                <button key={idx} type="button"
                  onClick={() => selectDay(day)}
                  disabled={!day}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-medium transition flex items-center justify-center
                    ${!day ? 'invisible' : ''}
                    ${isSelected ? 'bg-blue-600 text-white font-bold' : isToday ? 'border border-blue-500 text-blue-600 hover:bg-blue-50' : 'text-slate-700 hover:bg-slate-100'}
                  `}>
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          {includeTime && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
              <span className="text-slate-500 text-xs">⏰ Time</span>
              <input type="time" value={timeVal} onChange={e => onTimeChange(e.target.value)}
                className="flex-1 bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 shadow-sm" />
              <button type="button" onClick={() => setOpen(false)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">Done</button>
            </div>
          )}

          {/* Today shortcut */}
          {!includeTime && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-center">
              <button type="button" onClick={() => { const t = new Date(); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); selectDay(t.getDate()); }}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition">Today</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Contract Tenure ───────────────────────────────────────────────────
function StepContractTenure({ clientId, onSaved }) {
  const DURATION_OPTIONS = [
    { label: '1 Year',   months: 12  },
    { label: '2 Years',  months: 24  },
    { label: '3 Years',  months: 36  },
    { label: '5 Years',  months: 60  },
    { label: 'Custom',   months: null },
  ];
  const RENEWAL_OPTIONS = ['Manual Renewal', 'Auto Renewal', 'Approval Required'];
  const NOTIFY_OPTIONS  = [
    { days: 90, label: '90 Days Before Expiry' },
    { days: 60, label: '60 Days Before Expiry' },
    { days: 30, label: '30 Days Before Expiry' },
    { days: 15, label: '15 Days Before Expiry' },
    { days: 7,  label: '7 Days Before Expiry'  },
    { days: 1,  label: '1 Day Before Expiry'   },
  ];

  const [form, setForm] = useState({
    contract_signed_datetime: '',
    contract_start: '',
    contract_end: '',
    renewal_tracking: 'Manual Renewal',
    grace_period_days: '30',
    notes: '',
    notify_days: [90, 30, 7],
  });
  const [durationOption, setDurationOption] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [save, setSave] = useState(null);

  useEffect(() => {
    api(`/api/contract-tenure/${clientId}`).then(d => {
      if (d && d.contract_start) {
        setForm(f => ({
          ...f,
          contract_signed_datetime: d.contract_signed_datetime || '',
          contract_start:           d.contract_start || '',
          contract_end:             d.contract_end   || '',
          renewal_tracking:         d.renewal_tracking || 'Manual Renewal',
          grace_period_days:        String(d.grace_period_days ?? 30),
          notes:                    d.notes || '',
          notify_days:              d.notify_days ? JSON.parse(d.notify_days) : [90, 30, 7],
        }));
      }
    }).catch(() => {});
    api(`/api/company-info/${clientId}`)
      .then(d => { if (d?.company_name) setCompanyName(d.company_name); }).catch(() => {});
  }, [clientId]);

  const [contractErrors, setContractErrors] = useState({});
  const [contractErrBanner, setContractErrBanner] = useState('');

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setContractErrors(e => {
      const next = { ...e, [k]: '' };
      if (k === 'renewal_tracking' && v === 'Auto Renewal') {
        delete next.grace_period_days;
      }
      return next;
    });
    setContractErrBanner('');
  };

  // Auto-calculate end date from start + duration option
  function onDurationSelect(label) {
    setDurationOption(label);
    const opt = DURATION_OPTIONS.find(o => o.label === label);
    if (!opt || !opt.months || !form.contract_start) return;
    const start = new Date(form.contract_start);
    if (isNaN(start)) return;
    const end = new Date(start);
    end.setMonth(end.getMonth() + opt.months);
    set('contract_end', end.toISOString().slice(0,10));
  }

  // Re-apply duration when start changes
  function onStartChange(v) {
    set('contract_start', v);
    const opt = DURATION_OPTIONS.find(o => o.label === durationOption);
    if (opt?.months && v) {
      const start = new Date(v);
      if (!isNaN(start)) {
        const end = new Date(start);
        end.setMonth(end.getMonth() + opt.months);
        set('contract_end', end.toISOString().slice(0,10));
      }
    }
  }

  // Auto-calculated human duration between start and end
  function calcDuration(start, end) {
    if (!start || !end) return null;
    const s = new Date(start), e = new Date(end);
    if (isNaN(s) || isNaN(e) || e <= s) return null;
    let years = e.getFullYear() - s.getFullYear();
    let months = e.getMonth() - s.getMonth();
    let days = e.getDate() - s.getDate();
    if (days < 0) { months--; const prev = new Date(e.getFullYear(), e.getMonth(), 0); days += prev.getDate(); }
    if (months < 0) { years--; months += 12; }
    const parts = [];
    if (years)  parts.push(`${years} Year${years !== 1 ? 's' : ''}`);
    if (months) parts.push(`${months} Month${months !== 1 ? 's' : ''}`);
    if (days)   parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
    return parts.join(' ') || null;
  }

  // Business logic
  const now = new Date();
  const startDate = form.contract_start ? new Date(form.contract_start) : null;
  const endDate   = form.contract_end   ? new Date(form.contract_end)   : null;

  const daysRemaining = endDate ? Math.ceil((endDate - now) / 86400000) : null;
  const contractAge   = startDate ? Math.ceil((now - startDate) / 86400000) : null;
  const autoDuration  = calcDuration(form.contract_start, form.contract_end);

  const autoStatus = (() => {
    if (daysRemaining === null) return null;
    if (daysRemaining > 90)  return { label: 'Active',         icon: '🟢', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (daysRemaining > 0)   return { label: 'Expiring Soon',  icon: '🟡', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
    return                          { label: 'Expired',         icon: '🔴', cls: 'text-red-700 bg-red-50 border-red-200' };
  })();

  const toggleNotify = days => {
    const next = form.notify_days.includes(days)
      ? form.notify_days.filter(d => d !== days)
      : [...form.notify_days, days];
    set('notify_days', next);
    if (contractErrors.notify_days && next.length > 0) {
      setContractErrors(prev => {
        const copy = { ...prev };
        delete copy.notify_days;
        return copy;
      });
    }
  };

  function validateContract() {
    const errs = {};
    if (!form.contract_signed_datetime) errs.contract_signed_datetime = 'Contract Signed Date & Time is mandatory';
    if (!form.contract_start)           errs.contract_start = 'Contract Start Date is mandatory';
    if (!form.contract_end)             errs.contract_end = 'Contract End Date is mandatory';
    if (form.contract_start && form.contract_end) {
      const s = new Date(form.contract_start);
      const e = new Date(form.contract_end);
      if (e <= s) errs.contract_end = 'Contract End Date must be after Start Date';
    }
    if (!form.renewal_tracking)         errs.renewal_tracking = 'Renewal tracking is mandatory';
    if (form.renewal_tracking !== 'Auto Renewal') {
      if (!String(form.grace_period_days || '').trim()) errs.grace_period_days = 'Grace period is mandatory';
      else if (parseInt(form.grace_period_days, 10) < 0) errs.grace_period_days = 'Grace period cannot be negative';
    }
    if (!form.notify_days || form.notify_days.length === 0) {
      errs.notify_days = 'At least one Renewal Notification option must be selected';
    }

    setContractErrors(errs);
    if (Object.keys(errs).length > 0) {
      setContractErrBanner('Please fill in all mandatory contract tenure fields before continuing.');
      return false;
    }
    setContractErrBanner('');
    return true;
  }

  const handleSave = async () => {
    if (!validateContract()) return;
    setSave('saving');
    // Map renewal label back for backend compatibility
    const renewalMap = { 'Manual Renewal': 'manual', 'Auto Renewal': 'auto', 'Approval Required': 'approval' };
    await fetch('/api/contract-tenure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        client_id: clientId,
        contract_start:           form.contract_start,
        contract_end:             form.contract_end,
        contract_signed_datetime: form.contract_signed_datetime,
        renewal_tracking:         renewalMap[form.renewal_tracking] || form.renewal_tracking,
        grace_period_days:        form.renewal_tracking === 'Auto Renewal' ? 0 : form.grace_period_days,
        notes:                    form.notes,
        notify_days:              JSON.stringify(form.notify_days),
        contract_status:          autoStatus?.label.toLowerCase().replace(' ', '_') || 'active',
        duration_years:           autoDuration,
      }),
    }).catch(() => {});
    setSave('saved');
    setTimeout(() => { setSave(null); onSaved(); }, 800);
  };

  const fmt = v => {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Contract Tenure</h2>
          <p className="text-slate-500 text-sm mt-0.5">Contract Lifecycle Management — define, track and automate your engagement</p>
        </div>
        <SaveIndicator state={save} />
      </div>

      {contractErrBanner && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{contractErrBanner}</span>
        </div>
      )}

      {/* ── Expiry Alert Banners ── */}
      {daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <div className="text-amber-800 font-semibold text-sm">Contract expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</div>
            <div className="text-amber-700 text-xs mt-0.5">Please review renewal requirements and initiate the renewal process.</div>
          </div>
        </div>
      )}
      {daysRemaining !== null && daysRemaining <= 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">🚨</span>
          <div>
            <div className="text-red-800 font-semibold text-sm">Contract expired {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''} ago</div>
            <div className="text-red-700 text-xs mt-0.5">Immediate action required. Renew or extend the contract to restore full service access.</div>
          </div>
        </div>
      )}

      {/* ── Contract Health Dashboard Card ── */}
      {(startDate || endDate) && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-2">
            <span className="text-base">📊</span>
            <span className="text-slate-900 font-bold text-sm">Contract Health Dashboard</span>
            {autoStatus && (
              <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full border ${autoStatus.cls}`}>
                {autoStatus.icon} {autoStatus.label}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-slate-200">
            {[
              { icon: '📅', label: 'Contract Start',   value: fmt(form.contract_start)  },
              { icon: '🏁', label: 'Contract Expires',  value: fmt(form.contract_end)    },
              { icon: '⏳', label: 'Days Remaining',    value: daysRemaining !== null ? (daysRemaining > 0 ? `${daysRemaining} days` : 'Expired') : '—',
                highlight: daysRemaining !== null && daysRemaining <= 30 },
              { icon: '🕐', label: 'Contract Age',      value: contractAge !== null ? (contractAge > 0 ? `${contractAge} days` : 'Not started') : '—' },
              { icon: '📏', label: 'Duration',          value: autoDuration || '—' },
              { icon: '🔄', label: 'Renewal Type',      value: form.renewal_tracking || '—' },
            ].map(item => (
              <div key={item.label} className="px-5 py-4 bg-white hover:bg-slate-50 transition">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">{item.label}</span>
                </div>
                <div className={`text-sm font-bold ${item.highlight ? 'text-amber-700' : 'text-slate-900'}`}>{item.value}</div>
              </div>
            ))}
          </div>
          {companyName && form.contract_start && form.contract_end && (
            <div className="px-5 py-3 border-t border-slate-200 bg-white">
              <p className="text-slate-500 text-xs leading-relaxed">
                Contract between <span className="text-slate-900 font-semibold">{companyName}</span> and vCISO Platform
                {form.contract_signed_datetime && <> · Signed <span className="text-slate-700">{fmt(form.contract_signed_datetime)}</span></>}
                {autoDuration && <> · Duration <span className="text-slate-700">{autoDuration}</span></>}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Form ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">

        {/* Row 1: Signed datetime */}
        <div>
          <DatePicker
            label="Contract Signed Date & Time"
            required
            includeTime
            value={form.contract_signed_datetime}
            onChange={v => set('contract_signed_datetime', v)}
          />
          {contractErrors.contract_signed_datetime && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <span>❌</span> {contractErrors.contract_signed_datetime}
            </p>
          )}
        </div>

        {/* Row 2: Start + Duration */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <DatePicker
              label="Contract Start Date"
              required
              value={form.contract_start}
              onChange={onStartChange}
            />
            {contractErrors.contract_start && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <span>❌</span> {contractErrors.contract_start}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Duration <span className="text-slate-400 normal-case font-normal">(auto-sets end date)</span>
            </label>
            <select value={durationOption} onChange={e => onDurationSelect(e.target.value)}
              className={selectCls}>
              <option value="">— Select duration —</option>
              {DURATION_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: End date (auto or custom) */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <DatePicker
              label="Contract End Date"
              required
              value={form.contract_end}
              onChange={v => { set('contract_end', v); setDurationOption('Custom'); }}
            />
            {contractErrors.contract_end && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <span>❌</span> {contractErrors.contract_end}
              </p>
            )}
          </div>
          {/* Auto-calculated duration read-only */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Calculated Duration <span className="text-slate-400 normal-case font-normal">(auto)</span>
            </label>
            <div className={`${inputCls} flex items-center gap-2 cursor-not-allowed bg-slate-50 opacity-90`}>
              {autoDuration
                ? <><span className="text-blue-600">📏</span><span className="text-slate-900 font-medium">{autoDuration}</span></>
                : <span className="text-slate-400">Set start and end dates</span>
              }
            </div>
          </div>
        </div>

        {/* Row 4: Status (auto) + Renewal type */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Contract Status <span className="text-slate-400 normal-case font-normal">(auto-generated)</span>
            </label>
            <div className={`${inputCls} flex items-center gap-2 cursor-not-allowed bg-slate-50 opacity-90`}>
              {autoStatus
                ? <span className={`font-semibold text-sm ${autoStatus.cls}`}>{autoStatus.icon} {autoStatus.label}</span>
                : <span className="text-slate-400">Set contract dates first</span>
              }
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Renewal Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {RENEWAL_OPTIONS.map(opt => (
                <label key={opt} onClick={() => set('renewal_tracking', opt)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition select-none ${
                  form.renewal_tracking === opt
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium shadow-sm'
                    : 'border-slate-300 text-slate-700 hover:border-slate-400 bg-white'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition ${form.renewal_tracking === opt ? 'border-blue-500 bg-blue-500' : 'border-gray-600'}`} />
                  <span className="text-xs font-medium">{opt}</span>
                </label>
              ))}
            </div>
            {contractErrors.renewal_tracking && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <span>❌</span> {contractErrors.renewal_tracking}
              </p>
            )}
          </div>
        </div>

        {/* Row 5: Renewal notifications */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            🔔 Renewal Notifications <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {NOTIFY_OPTIONS.map(({ days, label }) => {
              const on = form.notify_days.includes(days);
              return (
                <label key={days} onClick={() => toggleNotify(days)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition select-none ${
                    on ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium shadow-sm' : 'border-slate-300 text-slate-600 hover:border-slate-400 bg-white'
                  }`}>
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${on ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                    {on && <span className="text-white text-[9px] font-bold">✓</span>}
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </label>
              );
            })}
          </div>
          {contractErrors.notify_days && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <span>❌</span> {contractErrors.notify_days}
            </p>
          )}
        </div>

        {/* Row 6: Grace period (Hidden when Auto Renewal is selected) */}
        {form.renewal_tracking !== 'Auto Renewal' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Grace Period (days) <span className="text-red-400">*</span>
            </label>
            <input type="number" min="0" max="365" value={form.grace_period_days}
              onChange={e => set('grace_period_days', e.target.value)}
              className={`${inputCls} max-w-[180px] ${contractErrors.grace_period_days ? 'border-red-500 focus:border-red-500' : ''}`} placeholder="30" />
            {contractErrors.grace_period_days ? (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <span>❌</span> {contractErrors.grace_period_days}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Additional days allowed after contract expiry before service suspension.</p>
            )}
          </div>
        )}

        {/* Row 7: Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Contract Notes</label>
            <span className="text-[10px] text-slate-400">{form.notes.length} / 2000</span>
          </div>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value.slice(0, 2000))}
            rows={4}
            maxLength={2000}
            className={inputCls}
            style={{ resize: 'vertical', minHeight: '96px' }}
            placeholder="Add contract terms, renewal conditions, special agreements, escalation contacts, service commitments, or other important notes…"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-blue-900/30">
          Save & Continue →
        </button>
      </div>
    </div>
  );
}

// ─── STEP 13: User Management (Enhanced — never locked) ───────────────────────

function StepUserManagement({ activeClient, onSaved, onUserUpdated }) {
  const [tab, setTab]           = useState('employees'); // 'employees' | 'platform' | 'archive'
  const [empTab, setEmpTab]     = useState('internal');   // 'internal' | 'external'
  const [employees, setEmployees] = useState([]);
  const [archivedEmps, setArchivedEmps] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [resendingUserId, setResendingUserId] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [step13Err, setStep13Err] = useState('');
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const [addError, setAddError]   = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [empForm, setEmpForm]   = useState({ name:'', email:'', position:'', department:'', country_code:'+91', phone:'', emp_type:'internal', permissions:[] });
  const [saving, setSaving]     = useState(false);

  // Platform Users form state
  const [showAddUser, setShowAddUser]   = useState(false);
  const [userType, setUserType]         = useState('');
  const [userSubType, setUserSubType]   = useState('');
  const [uName, setUName]               = useState('');
  const [uEmail, setUEmail]             = useState('');
  const [uCountryCode, setUCountryCode] = useState('+91');
  const [uPhone, setUPhone]             = useState('');
  const [uPerms, setUPerms]             = useState({}); // { sectionId: Set<string> }
  const [onbData, setOnbData]           = useState(null); // loaded onboarding selections
  const [onbDataLoading, setOnbDataLoading] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [userError, setUserError]       = useState('');
  const [userSuccess, setUserSuccess]   = useState('');
  const [userSaving, setUserSaving]     = useState(false);

  function initAllPerms(data) {
    if (!data) return {};
    return {
      frameworks:   new Set(data.frameworks || []),
      domains:      new Set(data.domains || []),
      controls:     new Set(data.controls || []),
      tools:        new Set(data.tools || []),
      integrations: new Set(data.integrations || []),
    };
  }

  // Load actual onboarding selections when invite form opens
  useEffect(() => {
    if (!showAddUser || onbData || !activeClient?.id) return;
    setOnbDataLoading(true);
    const ah = authHeader();
    Promise.all([
      fetch(`/api/framework-selections/${activeClient.id}`, { headers: ah }).then(r => r.json()).catch(() => ({ framework_ids: [] })),
      fetch(`/api/domain-selections/${activeClient.id}`, { headers: ah }).then(r => r.json()).catch(() => ({ domain_ids: [] })),
      fetch(`/api/control-selections/${activeClient.id}`, { headers: ah }).then(r => r.json()).catch(() => ({ control_ids: [] })),
      fetch(`/api/onboarding-modules/${activeClient.id}`, { headers: ah }).then(r => r.json()).catch(() => []),
      fetch(`/api/integrations-stack/${activeClient.id}`, { headers: ah }).then(r => r.json()).catch(() => []),
    ]).then(([frameSel, domSel, ctrlSel, mods, integs]) => {
      const loaded = {
        frameworks:   frameSel.framework_ids || [],
        domains:      domSel.domain_ids || [],
        controls:     ctrlSel.control_ids || [],
        tools:        (Array.isArray(mods) ? mods : []).filter(m => m.enabled).map(m => m.module_name || m.name),
        integrations: (Array.isArray(integs) ? integs : []).filter(i => i.enabled).map(i => i.name),
      };
      setOnbData(loaded);
      setUPerms(initAllPerms(loaded));
    }).finally(() => setOnbDataLoading(false));
  }, [showAddUser, activeClient?.id]);

  function togglePerm(section, item) {
    setUPerms(prev => {
      const set = new Set(prev[section] || []);
      set.has(item) ? set.delete(item) : set.add(item);
      return { ...prev, [section]: set };
    });
  }

  function toggleAllInSection(section, items) {
    setUPerms(prev => {
      const set = new Set(prev[section] || []);
      const allSelected = items.every(i => set.has(i));
      if (allSelected) items.forEach(i => set.delete(i));
      else items.forEach(i => set.add(i));
      return { ...prev, [section]: set };
    });
  }

  function buildModulesPayload() {
    const result = [];
    Object.entries(uPerms).forEach(([sec, set]) => {
      if (set instanceof Set) {
        set.forEach(item => result.push(`${sec}:${item}`));
      }
    });
    return result;
  }

  const USER_TYPES = [
    { id: 'vciso_admin', label: 'vCISO / Admin', icon: '🛡️', desc: 'Full platform access', sub: [
      { id: 'vciso', label: 'vCISO User', icon: '🛡️', desc: 'vCISO dashboard access' },
      { id: 'admin', label: 'Owner / Admin', icon: '👑', desc: 'Full admin access' },
    ]},
    { id: 'client', label: 'Internal User', icon: '🏢', desc: 'Client portal access' },
    { id: 'external_client', label: 'External User', icon: '🔍', desc: 'Read-only access' },
    { id: 'partner', label: 'Partner', icon: '🤝', desc: 'Partner portal access' },
  ];

  function resetUserForm() {
    setUserType(''); setUserSubType(''); setUName(''); setUEmail(''); setUCountryCode('+91'); setUPhone('');
    setUPerms({}); setOpenSections({}); setOnbData(null);
    setUserError(''); setUserSuccess(''); setShowAddUser(false);
  }

  async function handleSendInvite() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!uName.trim()) { setUserError('Full Name is required.'); return; }
    if (!uEmail.trim()) { setUserError('Email is required.'); return; }
    if (!emailRegex.test(uEmail.trim())) { setUserError('Please enter a valid email address.'); return; }
    if (!userType) { setUserError('Please select a user type.'); return; }
    if (userType === 'vciso_admin' && !userSubType) { setUserError('Please select vCISO User or Owner/Admin.'); return; }
    if (!uPhone.trim()) { setUserError('Phone number is required.'); return; }
    if (uPhone.trim().length !== 10) { setUserError('Phone number must be exactly 10 digits.'); return; }

    setUserSaving(true); setUserError(''); setUserSuccess('');
    try {
      const rawRole = userType === 'vciso_admin' ? userSubType : userType;
      // Map internal role names to the invite endpoint's accepted values
      const role = ['vciso', 'admin'].includes(rawRole) ? rawRole : (rawRole === 'partner' ? 'partner' : 'client');
      const res = await fetch('/api/auth/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          name: uName.trim(),
          email: uEmail.trim(),
          phone: `${uCountryCode || '+91'} ${uPhone.trim()}`.trim(),
          role,
          client_id: activeClient.id,
          modules: buildModulesPayload()
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      
      setInviteResult({
        name: uName.trim(),
        email: uEmail.trim(),
        role: data.role || (role === 'vciso' ? 'vCISO User' : role === 'admin' ? 'Owner / Admin' : 'Client User'),
        signupLink: data.signupLink,
        defaultPassword: data.defaultPassword || 'Password@123',
        emailSent: data.emailSent,
        isPlatformUser: true
      });

      setUserSuccess(`✓ Account created & invited: ${uEmail.trim()}`);
      setUName(''); setUEmail(''); setUPhone(''); setUserType(''); setUserSubType('');
      setUPerms({}); setOpenSections({}); setOnbData(null);
      setShowAddUser(false);
      setStep13Err('');
      loadData();
    } catch (e) { setUserError(e.message); }
    finally { setUserSaving(false); }
  }

  function loadData() {
    if (!activeClient?.id) return;
    setLoading(true);
    setLoadError('');
    const ah = { ...authHeader() };
    const safeFetch = (url, fallback) =>
      fetch(url, { headers: ah })
        .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(new Error(d.error || `HTTP ${r.status}`))))
        .catch(e => { console.warn('loadData fetch failed:', url, e.message); return fallback; });
    Promise.all([
      safeFetch(`/api/employees/${activeClient.id}`, []),
      safeFetch(`/api/employees/${activeClient.id}?archived=true`, []),
      safeFetch(`/api/users?client_id=${activeClient.id}`, []),
      safeFetch(`/api/framework-selections/${activeClient.id}`, { framework_ids:[] }),
    ]).then(([emps, arch, users, frameSel]) => {
      const empList = Array.isArray(emps) ? emps : [];
      const userList = Array.isArray(users) ? users : users?.users || [];
      setEmployees(empList);
      setArchivedEmps(Array.isArray(arch) ? arch : []);
      setPlatformUsers(userList);
      setFrameworks(frameSel.framework_ids || []);
      setLoading(false);
      onUserUpdated?.({ employees: empList, users: userList });
      if (!Array.isArray(emps)) setLoadError('Could not load employees — authentication may have expired. Please refresh.');
    }).catch(e => { setLoading(false); setLoadError(e.message || 'Failed to load data.'); });
  }

  useEffect(() => { loadData(); }, [activeClient?.id]);

  async function handleResendInvite(userId) {
    setResendingUserId(userId);
    try {
      const r = await fetch(`/api/auth/admin/users/${userId}/send-invite`, { method: 'POST', headers: authHeader() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to resend');
      if (d.signupLink) {
        setInviteResult({
          email: d.email,
          name: d.name || 'Platform User',
          signupLink: d.signupLink,
          defaultPassword: d.defaultPassword || 'Password@123',
          emailSent: d.emailSent,
          isPlatformUser: true
        });
      }
      loadData();
    } catch (e) { alert(e.message); }
    finally { setResendingUserId(null); }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeletingUserId(userId);
    try {
      const r = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: authHeader() });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Delete failed'); }
      loadData();
    } catch (e) { alert(e.message); }
    finally { setDeletingUserId(null); }
  }

  async function addEmployee() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!empForm.name.trim()) { setAddError('Full name is required.'); return; }
    if (!empForm.email.trim()) { setAddError('Email address is required.'); return; }
    if (!emailRegex.test(empForm.email.trim())) { setAddError('Please enter a valid email address.'); return; }
    if (!empForm.position.trim()) { setAddError('Job title / Position is required.'); return; }
    if (!empForm.department.trim()) { setAddError('Department is required.'); return; }
    if (!empForm.phone.trim()) { setAddError('Phone number is required.'); return; }
    if (empForm.phone.trim().length !== 10) { setAddError('Phone number must be exactly 10 digits.'); return; }

    setSaving(true); setAddError(''); setAddSuccess('');
    try {
      const fullPhone = `${empForm.country_code || '+91'} ${empForm.phone.trim()}`.trim();
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ...empForm, phone: fullPhone, client_id: activeClient.id }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || 'Failed to add employee.'); setSaving(false); return; }

      // Auto-send invite / provision user account so employee can log in immediately
      let invInfo = null;
      try {
        const invRes = await fetch(`/api/auth/admin/employees/${data.id}/send-invite`, {
          method: 'POST',
          headers: authHeader(),
        });
        invInfo = await invRes.json();
      } catch {}

      setShowAddEmp(false);
      setEmpForm({ name:'', email:'', position:'', department:'', country_code:'+91', phone:'', emp_type:'internal', permissions:[] });
      
      setInviteResult({
        name: data.name,
        email: data.email,
        role: 'Employee / Client User',
        signupLink: invInfo?.signupLink,
        defaultPassword: invInfo?.defaultPassword || 'Password@123',
        emailSent: invInfo?.emailSent,
        isEmployee: true
      });

      setAddSuccess(`✓ ${data.name} added! Direct credentials and invite generated.`);
      setStep13Err('');
      setTimeout(() => setAddSuccess(''), 5000);
      loadData();
    } catch (e) { setAddError(e.message || 'Unexpected error.'); }
    finally { setSaving(false); }
  }

  async function archiveEmployee(id) {
    await fetch(`/api/employees/${id}/archive`, { method:'PATCH', headers:{'Content-Type':'application/json', ...authHeader()},
      body: JSON.stringify({ archived: true, archived_by: 'admin' }) }).catch(() => {});
    loadData();
  }

  async function restoreEmployee(id) {
    await fetch(`/api/employees/${id}/archive`, { method:'PATCH', headers:{'Content-Type':'application/json', ...authHeader()},
      body: JSON.stringify({ archived: false, archived_by: 'admin' }) }).catch(() => {});
    loadData();
  }

  async function deleteEmployee(id) {
    await fetch(`/api/employees/${id}`, { method:'DELETE', headers: authHeader() }).catch(() => {});
    setDeleteConfirm(null);
    loadData();
  }

  async function generateInvite(emp) {
    const res = await fetch(`/api/employees/${emp.id}/generate-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ created_by: 'admin' })
    }).then(r => r.json()).catch(() => null);

    if (res?.code || res?.token) {
      setInviteResult({
        code: res.code,
        email: res.email || emp.email,
        name: emp.name,
        expires_at: res.expires_at,
        signupLink: res.signupLink,
        defaultPassword: res.defaultPassword || 'Password@123',
        isEmployee: true
      });
      loadData();
    }
  }

  function handleContinueUserManagement() {
    const hasEmp = employees.length > 0 || platformUsers.some(u => u.role === 'client' || u.employee_type === 'internal' || u.employee_type === 'external');
    const hasVciso = platformUsers.some(u => u.role === 'vciso' || u.role === 'admin' || u.role === 'owner' || u.role === 'vciso_admin');
    if (!hasEmp || !hasVciso) {
      setStep13Err('Please ensure at least 1 Client Employee and 1 vCISO / Admin User are added before continuing.');
      return;
    }
    setStep13Err('');
    onSaved();
  }

  const displayedEmps = employees.filter(e =>
    tab === 'employees' && (
      (empTab === 'internal' && (e.emp_type === 'internal' || !e.emp_type)) ||
      (empTab === 'external' && e.emp_type === 'external')
    )
  );

  const tabBtn = (key, label, count) => (
    <button onClick={() => setTab(key)} style={{
      padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: tab === key ? 600 : 400,
      background: tab === key ? th('#eff6ff', { dark: '#172554' }) : 'transparent', color: tab === key ? th('#1d4ed8', { dark: '#93C5FD' }) : th('#64748b', { dark: '#94A3B8' }),
      borderBottom: tab === key ? '2px solid #3b82f6' : '2px solid transparent', transition: 'all 0.15s',
      borderRadius: '4px 4px 0 0',
    }}>
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  const empTabBtn = (key, label, count) => (
    <button onClick={() => setEmpTab(key)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
      empTab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`}>
      {label} {count !== undefined && `(${count})`}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage employees and platform users for <strong className="text-slate-900">{activeClient?.name}</strong></p>
          <div className="text-xs text-blue-600 mt-1">ℹ️ Add at least one employee or platform user to continue.</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ borderBottom: `1px solid ${th('#e2e8f0', { dark: '#334155' })}`, display: 'flex', gap: '4px' }}>
        {tabBtn('employees', '👥 Employees', employees.length)}
        {tabBtn('platform', '🖥️ Platform Users', platformUsers.length)}
        {tabBtn('archive', '📦 Archive', archivedEmps.length)}
      </div>

      {step13Err && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{step13Err}</span>
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{loadError}</div>
      )}

      {/* ─── EMPLOYEES TAB ─────────────────────────────────────────── */}
      {tab === 'employees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {empTabBtn('internal', 'Internal', employees.filter(e => e.emp_type === 'internal' || !e.emp_type).length)}
              {empTabBtn('external', 'External', employees.filter(e => e.emp_type === 'external').length)}
            </div>
            <button onClick={() => setShowAddEmp(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5">
              + Add Employee
            </button>
          </div>

          {/* Add Employee Form */}
          {showAddEmp && (
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-slate-900 font-semibold text-sm">Add New Employee</div>
                <button onClick={() => setShowAddEmp(false)} className="text-gray-500 hover:text-slate-700 text-lg">×</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input value={empForm.name} onChange={e => setEmpForm(p => ({...p, name: e.target.value}))}
                    placeholder="Jane Doe"
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" value={empForm.email} onChange={e => setEmpForm(p => ({...p, email: e.target.value}))}
                    placeholder="jane.doe@company.com"
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                  <input value={empForm.position} onChange={e => setEmpForm(p => ({...p, position: e.target.value}))}
                    placeholder="Security Analyst"
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                  <input value={empForm.department} onChange={e => setEmpForm(p => ({...p, department: e.target.value}))}
                    placeholder="IT Security"
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (10 Digits) <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <select
                      value={empForm.country_code || '+91'}
                      onChange={e => setEmpForm(p => ({ ...p, country_code: e.target.value }))}
                      className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500 w-32 flex-shrink-0 cursor-pointer shadow-sm"
                    >
                      {COUNTRY_DIAL_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={empForm.phone}
                      onChange={e => setEmpForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Type <span className="text-red-500">*</span></label>
                  <select value={empForm.emp_type} onChange={e => setEmpForm(p => ({...p,emp_type:e.target.value}))}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm">
                    <option value="internal">Internal Employee</option>
                    <option value="external">External / Contractor</option>
                  </select>
                </div>
              </div>

              {addError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{addError}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowAddEmp(false); setAddError(''); }} className="px-4 py-2 border border-slate-200 text-gray-400 rounded-lg text-sm">Cancel</button>
                <button onClick={addEmployee} disabled={saving || !empForm.name || !empForm.email}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition">
                  {saving ? '⏳ Saving…' : 'Add Employee'}
                </button>
              </div>
            </div>
          )}

          {addSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2.5 text-sm">{addSuccess}</div>
          )}

          {/* Employee List */}
          {loading ? (
            <div className="text-gray-500 text-sm py-6 text-center">Loading…</div>
          ) : displayedEmps.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-3xl mb-2">👤</div>
              <div className="text-sm">No {empTab} employees yet. Click "Add Employee" to get started.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedEmps.map(emp => (
                <div key={emp.id} className="bg-white border border-slate-300 rounded-xl p-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full ${th('bg-[#3182CE]', { classic: 'bg-gradient-to-br from-blue-600 to-indigo-600', dark: 'bg-gradient-to-br from-blue-600 to-indigo-600' })} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {(emp.name||'?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 text-sm font-semibold">{emp.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${emp.emp_type === 'external' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                        {emp.emp_type || 'Internal'}
                      </span>
                      {emp.invite_status === 'invited' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Invited</span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs">{emp.email} {emp.position && `· ${emp.position}`} {emp.department && `· ${emp.department}`} {emp.phone && `· ${emp.phone}`}</div>
                    {emp.invite_code && (
                      <div className="text-xs text-blue-600 mt-1">Invite Code: <strong className="font-mono">{emp.invite_code}</strong></div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 items-center">
                    <button onClick={() => generateInvite(emp)} title="Generate Invite Code"
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 rounded-lg text-xs font-semibold transition border border-blue-200 shadow-sm">
                      🔑 Invite
                    </button>
                    <button onClick={() => archiveEmployee(emp.id)}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-800 rounded-lg text-xs font-medium transition border border-slate-300 shadow-sm">
                      Archive
                    </button>
                    <button onClick={() => setDeleteConfirm({ id: emp.id, name: emp.name })} title="Delete employee"
                      className="w-7 h-7 flex items-center justify-center bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg text-base transition border border-slate-300 hover:border-red-300 shadow-sm">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 max-w-sm w-full">
                <div className="text-2xl mb-3 text-center">⚠️</div>
                <div className="text-slate-900 font-bold text-base text-center mb-2">Delete Employee?</div>
                <div className="text-slate-500 text-sm text-center mb-6">
                  Are you sure you want to delete <strong className="text-slate-900">{deleteConfirm.name}</strong>?<br/>
                  <span className="text-red-600 text-xs">This will permanently remove all their data and cannot be undone.</span>
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setDeleteConfirm(null)}
                    className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition">
                    Cancel
                  </button>
                  <button onClick={() => deleteEmployee(deleteConfirm.id)}
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition">
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleContinueUserManagement} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ─── PLATFORM USERS TAB ────────────────────────────────────── */}
      {tab === 'platform' && (
        <div className="space-y-4">
          {/* Add User button */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">Platform users get vCISO / admin / client portal access via email invite.</div>
            <button
              onClick={() => {
                setShowAddUser(v => {
                  const next = !v;
                  if (next && onbData) {
                    setUPerms(initAllPerms(onbData));
                  }
                  return next;
                });
                setUserError('');
                setUserSuccess('');
              }}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              <span>+</span> Add Platform / vCISO User
            </button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <div className="bg-slate-50 border border-purple-800/40 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold text-slate-900">Invite a Platform User</div>
                <button onClick={() => { setShowAddUser(false); setUserError(''); setUserSuccess(''); resetUserForm(); loadData(); }} className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none transition">×</button>
              </div>

              {/* User type selector */}
              <div className="grid grid-cols-2 gap-2">
                {USER_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setUserType(t.id); setUserSubType(''); }}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                      userType === t.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 shadow-sm' : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <div className="text-slate-900 text-xs font-semibold">{t.label}</div>
                      <div className="text-gray-500 text-[10px]">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Sub-type for vciso_admin */}
              {userType === 'vciso_admin' && (
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">Step 2 — Select specific role</div>
                  <div className="grid grid-cols-2 gap-2">
                  {USER_TYPES.find(t => t.id === 'vciso_admin').sub.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setUserSubType(s.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition ${
                        userSubType === s.id ? 'border-indigo-600 bg-white ring-2 ring-indigo-500 shadow-sm' : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <div className="text-slate-900 text-xs font-semibold">{s.label}</div>
                        <div className="text-gray-500 text-[10px]">{s.desc}</div>
                      </div>
                    </button>
                  ))}
                  </div>
                </div>
              )}

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
                  <input value={uName} onChange={e => setUName(e.target.value)} placeholder="Jane Smith"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Email <span className="text-red-500">*</span></label>
                  <input value={uEmail} onChange={e => setUEmail(e.target.value)} placeholder="jane@company.com" type="email"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Phone (10 Digits) <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <select
                      value={uCountryCode || '+91'}
                      onChange={e => setUCountryCode(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-indigo-500 w-32 flex-shrink-0 cursor-pointer shadow-sm"
                    >
                      {COUNTRY_DIAL_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={uPhone}
                      onChange={e => setUPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Dashboard Access Permissions — grouped by onboarding selections */}
              <div className="border border-indigo-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/40">
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-900">Dashboard Access — Grant Specific Items</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Select from items configured during onboarding</div>
                </div>
                {onbDataLoading ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-500">Loading onboarding data…</div>
                ) : !onbData ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-500">Open the form to load selections</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {[
                      { id: 'frameworks', label: 'Framework Selection', icon: '📐', items: onbData.frameworks },
                      { id: 'domains',    label: 'Security Domains',    icon: '🌐', items: onbData.domains },
                      { id: 'controls',   label: 'Controls Review',     icon: '🔒', items: onbData.controls },
                      { id: 'tools',      label: 'Security Tools',      icon: '⚙️',  items: onbData.tools },
                      { id: 'integrations', label: 'Integrations',      icon: '🔗', items: onbData.integrations },
                    ].map(sec => {
                      const sectionPerms = uPerms[sec.id] || new Set();
                      const isOpen = openSections[sec.id];
                      const selectedCount = sectionPerms.size;
                      const hasItems = sec.items.length > 0;
                      return (
                        <div key={sec.id}>
                          <button type="button" onClick={() => setOpenSections(p => ({ ...p, [sec.id]: !p[sec.id] }))}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
                            <span>{sec.icon}</span>
                            <span className="text-sm font-semibold text-slate-900 flex-1">{sec.label}</span>
                            {selectedCount > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                {selectedCount} selected
                              </span>
                            )}
                            {!hasItems && <span className="text-[10px] text-gray-600">None configured</span>}
                            <span className="text-gray-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                          </button>
                          {isOpen && hasItems && (
                            <div className="px-4 pb-3 bg-slate-50/60">
                              <button type="button" onClick={() => toggleAllInSection(sec.id, sec.items)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold mb-2 underline">
                                {sec.items.every(i => sectionPerms.has(i)) ? 'Deselect All' : 'Select All'}
                              </button>
                              <div className="grid grid-cols-2 gap-1.5">
                                {sec.items.map(item => {
                                   const checked = sectionPerms.has(item);
                                   return (
                                     <label key={item} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer border text-xs transition-all ${
                                       checked ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-medium' : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-300'
                                     }`}>
                                       <input type="checkbox" className="hidden" checked={checked} onChange={() => togglePerm(sec.id, item)} />
                                       <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${
                                         checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                                       }`}>{checked ? '✓' : ''}</span>
                                       <span className="truncate">{item}</span>
                                     </label>
                                   );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {userError && <div className="text-red-700 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{userError}</div>}
              {userSuccess && <div className="text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{userSuccess}</div>}

              <div className="flex gap-3 justify-end pt-1">
                <button onClick={resetUserForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition">Cancel</button>
                <button
                  onClick={handleSendInvite}
                  disabled={userSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition shadow-sm"
                >
                  {userSaving ? 'Sending…' : 'Generate Code / Send Invite'}
                </button>
              </div>
            </div>
          )}

          {/* Platform users list */}
          {loading ? <div className="text-gray-500 py-8 text-center">Loading…</div> : platformUsers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-3xl mb-2">🖥️</div>
              <div className="text-sm">No platform users for this client yet.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {platformUsers.map(u => (
                <div key={u.id} className="bg-white border border-slate-300 rounded-xl p-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full ${th('bg-[#2D3748]', { classic: 'bg-gradient-to-br from-purple-600 to-indigo-600', dark: 'bg-gradient-to-br from-purple-600 to-indigo-600' })} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {(u.name||u.email||'?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 text-sm font-semibold">{u.name || u.email}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        u.role === 'vciso' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        u.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>{u.role}</span>
                    </div>
                    <div className="text-gray-500 text-xs">{u.email}</div>
                  </div>
                  {u.status === 'active' ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Active</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">Invite Sent</span>
                      <button
                        onClick={() => handleResendInvite(u.id)}
                        disabled={resendingUserId === u.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium transition disabled:opacity-40 shadow-sm"
                      >
                        {resendingUserId === u.id ? '…' : 'Send Again'}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    disabled={deletingUserId === u.id}
                    className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                    title="Delete user"
                  >
                    {deletingUserId === u.id ? '…' : '🗑️'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleContinueUserManagement} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ─── ARCHIVE TAB ───────────────────────────────────────────── */}
      {tab === 'archive' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium">
            Archived employees are hidden from active views. You can restore or permanently delete them here.
          </div>
          {archivedEmps.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-3xl mb-2">📦</div>
              <div className="text-sm">No archived employees.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {archivedEmps.map(emp => (
                <div key={emp.id} className="bg-white border border-slate-300 rounded-xl p-4 flex items-center gap-4 opacity-70">
                  <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
                    {(emp.name||'?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900 text-sm font-semibold">{emp.name}</div>
                    <div className="text-gray-500 text-xs">{emp.email} {emp.archived_at && `· Archived ${new Date(emp.archived_at).toLocaleDateString()}`}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => restoreEmployee(emp.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 transition shadow-sm">
                      Restore
                    </button>
                    <button onClick={() => deleteEmployee(emp.id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 transition shadow-sm">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button onClick={handleContinueUserManagement} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Universal Invite Result Modal for Employees & Platform Users (vCISO) */}

      {inviteResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setInviteResult(null)}>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-slate-900 font-bold text-lg">
                {inviteResult.isPlatformUser ? 'vCISO / Platform User Ready!' : 'Employee Account & Invite Ready!'}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Account created for <strong className="text-slate-900">{inviteResult.name || inviteResult.email}</strong> ({inviteResult.role || 'User'})
              </p>
            </div>

            {/* Email Dispatch Notice */}
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              inviteResult.emailSent
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <span className="text-base">{inviteResult.emailSent ? '📧' : '⚡'}</span>
              <div>
                {inviteResult.emailSent ? (
                  <span><strong>Email Dispatched:</strong> An invitation email was sent to <u>{inviteResult.email}</u>.</span>
                ) : (
                  <span><strong>Direct Access Ready:</strong> Share the direct signup link or initial login credentials below.</span>
                )}
              </div>
            </div>

            {/* Direct Login Credentials Card */}
            <div className="bg-white border border-slate-300 rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
                <span>Direct Login Credentials</span>
                <span className="text-[10px] text-blue-600 font-medium">Works on /login</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                  <span className="text-slate-500 font-sans">Email:</span>
                  <span className="text-slate-900 font-bold">{inviteResult.email}</span>
                </div>
                <div className="flex justify-between bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                  <span className="text-slate-500 font-sans">Initial Password:</span>
                  <span className="text-emerald-700 font-bold font-mono">{inviteResult.defaultPassword || 'Password@123'}</span>
                </div>
              </div>
            </div>

            {/* Invite Code or Link Card */}
            {(inviteResult.code || inviteResult.signupLink) && (
              <div className="bg-white border border-slate-300 rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {inviteResult.code ? 'Invite Access Code' : 'Direct Signup / Activation Link'}
                </div>
                {inviteResult.code && (
                  <div className="text-xl font-mono font-black text-blue-700 tracking-widest text-center py-1 bg-slate-50 rounded border border-blue-200 shadow-sm">
                    {inviteResult.code}
                  </div>
                )}
                {inviteResult.signupLink && (
                  <div className="text-[11px] font-mono text-blue-700 truncate bg-slate-50 px-2.5 py-1.5 rounded border border-blue-200 shadow-sm">
                    {inviteResult.signupLink}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const textToCopy = `vCISO Platform Invitation\n\nLogin URL: ${window.location.origin}/login\nEmail: ${inviteResult.email}\nInitial Password: ${inviteResult.defaultPassword || 'Password@123'}\n${inviteResult.signupLink ? `\nDirect Activation Link: ${inviteResult.signupLink}` : ''}${inviteResult.code ? `\nAccess Code: ${inviteResult.code}` : ''}`;
                  navigator.clipboard.writeText(textToCopy);
                  alert('✓ Login credentials & link copied to clipboard!');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                📋 Copy All Details
              </button>
              <button
                type="button"
                onClick={() => setInviteResult(null)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Step 11: Review & Complete ───────────────────────────────────────────────
function StepReviewComplete({ clientId, clientName, completed, isStepDone, onSaved }) {
  const stepStatus = STEPS.slice(0, 13).map((s, i) => ({
    ...s,
    done: isStepDone ? isStepDone(i) : completed.has(i),
  }));
  const completedCount = stepStatus.filter(s => s.done).length;
  const totalSteps = 13;
  const allDone = completedCount >= totalSteps;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Review & Complete</h2>
        <p className="text-slate-500 text-sm mt-0.5">Review the onboarding summary for {clientName} before finalising</p>
      </div>

      {/* Progress summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-900 font-semibold text-sm">Onboarding Progress</span>
          <span className="text-blue-600 text-sm font-bold">{completedCount} / {totalSteps} steps completed</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full mb-5">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.round((completedCount / totalSteps) * 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stepStatus.map((s, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${s.done ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-white border border-slate-200'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${s.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {s.done ? '✓' : i + 1}
              </div>
              <span className={s.done ? 'text-emerald-800 font-medium' : 'text-slate-600'}>{s.label}</span>
              {!s.done && <span className="ml-auto text-yellow-500 text-[10px]">Pending</span>}
            </div>
          ))}
        </div>
      </div>

      {!allDone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 shadow-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="text-amber-800 font-semibold text-sm">Some steps are incomplete</div>
            <div className="text-amber-700 text-xs mt-0.5">You can still complete onboarding, but incomplete steps will be marked as pending. You can return and fill them later.</div>
          </div>
        </div>
      )}

      {allDone && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="text-emerald-800 font-semibold text-sm">All steps completed!</div>
            <div className="text-emerald-700 text-xs mt-0.5">The client onboarding is ready to be finalised. Click Complete Onboarding below.</div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onSaved}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition flex items-center gap-2"
        >
          ✅ Complete Onboarding
        </button>
      </div>
    </div>
  );
}

// ─── FRAMEWORK DOMAIN DATA ────────────────────────────────────────────────────

const FRAMEWORK_TO_DOMAINS = {
  'ISO 27001': ['Governance & Risk','Access Control','Asset Management','Cryptography','Physical Security','Operations Security','Communications Security','Incident Management','Business Continuity','Compliance'],
  'DPDPA 2023': ['Data Protection','Governance & Risk','Compliance','Incident Management','Access Control'],
  'DPDP Act 2023': ['Data Protection','Governance & Risk','Compliance','Incident Management','Access Control'],
  'SOC 2 Type II': ['Governance & Risk','Access Control','Operations Security','Incident Management','Availability & Continuity'],
  'SOC 2 Type I': ['Governance & Risk','Access Control','Incident Management'],
  'NIST CSF 2.0': ['Governance & Risk','Asset Management','Access Control','Operations Security','Incident Management','Supply Chain Security'],
  'CIS Controls v8': ['Asset Management','Access Control','Data Protection','Operations Security','Incident Management','Network Security'],
  'CSPM': ['Governance & Risk','Access Control','Asset Management','Data Protection','Cryptography','Network Security','Operations Security','Incident Management','Business Continuity','Compliance'],
  'PCI DSS v4.0': ['Access Control','Data Protection','Cryptography','Operations Security','Network Security','Physical Security'],
  'HIPAA': ['Access Control','Data Protection','Operations Security','Incident Management','Physical Security','Compliance'],
  'GDPR': ['Governance & Risk','Data Protection','Compliance','Incident Management'],
  'CMMC 2.0': ['Access Control','Asset Management','Operations Security','Incident Management','Governance & Risk'],
  'FedRAMP': ['Access Control','Asset Management','Operations Security','Incident Management','Communications Security','Compliance'],
  'NIST 800-53 Rev 5': ['Governance & Risk','Access Control','Asset Management','Data Protection','Operations Security','Incident Management','Communications Security','Compliance'],
  'SOX': ['Governance & Risk','Access Control','Operations Security','Compliance'],
  'DORA': ['Governance & Risk','Incident Management','Business Continuity','Operations Security','Supply Chain Security'],
  'NIS2 Directive': ['Governance & Risk','Incident Management','Business Continuity','Network Security','Supply Chain Security'],
  'Essential Eight': ['Asset Management','Access Control','Data Protection','Operations Security'],
  'ISO 27701': ['Governance & Risk','Data Protection','Compliance'],
  'HITRUST CSF': ['Access Control','Data Protection','Operations Security','Incident Management','Compliance'],
  'MAS TRM': ['Governance & Risk','Operations Security','Incident Management','Business Continuity'],
  'SAMA CSF': ['Governance & Risk','Operations Security','Incident Management','Access Control'],
  'COBIT 2019': ['Governance & Risk','Operations Security','Compliance','Asset Management'],
  'Zero Trust Architecture': ['Access Control','Network Security','Data Protection'],
  'Vulnerability Management': ['Asset Management','Operations Security'],
  'Incident Response': ['Incident Management'],
  'Security Operations (SOC)': ['Operations Security','Incident Management','Network Security'],
  'Threat Intelligence': ['Governance & Risk','Incident Management'],
};

const DOMAIN_CONTROLS = {
  'Governance & Risk': [
    { id:'GOV-01', name:'Risk Assessment Program', type:'Preventive', desc:'Establish and maintain a formal risk assessment program aligned to business objectives' },
    { id:'GOV-02', name:'Security Policy Framework', type:'Preventive', desc:'Define, approve, and publish security policies covering all critical areas' },
    { id:'GOV-03', name:'Board-Level Oversight', type:'Detective', desc:'Senior leadership reviews and approves the information security strategy' },
    { id:'GOV-04', name:'Vendor Risk Management', type:'Preventive', desc:'Assess and monitor third-party and supply-chain risk continuously' },
    { id:'GOV-05', name:'Compliance Monitoring', type:'Detective', desc:'Track and report on regulatory and framework compliance obligations' },
  ],
  'Access Control': [
    { id:'IAM-01', name:'Identity Lifecycle Management', type:'Preventive', desc:'Provision, modify, and deprovision user accounts based on role changes' },
    { id:'IAM-02', name:'Multi-Factor Authentication', type:'Preventive', desc:'Enforce MFA on all privileged and remote access paths' },
    { id:'IAM-03', name:'Privileged Access Management', type:'Preventive', desc:'Control and audit all privileged account usage with just-in-time access' },
    { id:'IAM-04', name:'Access Reviews', type:'Detective', desc:'Quarterly review of user entitlements to detect over-privileged accounts' },
    { id:'IAM-05', name:'Single Sign-On', type:'Preventive', desc:'Centralise authentication via SSO to reduce credential sprawl' },
    { id:'IAM-06', name:'Zero Trust Network Access', type:'Preventive', desc:'Enforce continuous identity verification before granting resource access' },
  ],
  'Asset Management': [
    { id:'AST-01', name:'Asset Inventory', type:'Detective', desc:'Maintain an authoritative inventory of all hardware, software and cloud assets' },
    { id:'AST-02', name:'Asset Classification', type:'Preventive', desc:'Classify assets by criticality and sensitivity to drive protection levels' },
    { id:'AST-03', name:'End-of-Life Management', type:'Preventive', desc:'Track and remediate end-of-life software and hardware before expiry' },
    { id:'AST-04', name:'Software License Compliance', type:'Detective', desc:'Ensure all software is licensed and approved for business use' },
  ],
  'Data Protection': [
    { id:'DAT-01', name:'Data Classification', type:'Preventive', desc:'Label all data by sensitivity (public, internal, confidential, restricted)' },
    { id:'DAT-02', name:'Encryption at Rest', type:'Preventive', desc:'Encrypt sensitive data stored in databases, file systems, and backups' },
    { id:'DAT-03', name:'Encryption in Transit', type:'Preventive', desc:'Enforce TLS/HTTPS for all data in transit across networks' },
    { id:'DAT-04', name:'Data Loss Prevention', type:'Preventive', desc:'Deploy DLP controls to detect and block unauthorised data exfiltration' },
    { id:'DAT-05', name:'Data Retention & Disposal', type:'Preventive', desc:'Define and enforce retention schedules with secure disposal procedures' },
  ],
  'Operations Security': [
    { id:'OPS-01', name:'Vulnerability Management', type:'Detective', desc:'Continuously scan and remediate vulnerabilities across all asset types' },
    { id:'OPS-02', name:'Patch Management', type:'Preventive', desc:'Apply security patches within SLA timelines based on severity' },
    { id:'OPS-03', name:'Change Management', type:'Preventive', desc:'Formal approval and testing process for all infrastructure changes' },
    { id:'OPS-04', name:'Security Monitoring & SIEM', type:'Detective', desc:'Real-time monitoring of security events with automated alerting' },
    { id:'OPS-05', name:'Anti-Malware Protection', type:'Preventive', desc:'Deploy and maintain endpoint protection across all managed devices' },
  ],
  'Network Security': [
    { id:'NET-01', name:'Firewall Management', type:'Preventive', desc:'Maintain and audit firewall rule sets to enforce least-privilege access' },
    { id:'NET-02', name:'Network Segmentation', type:'Preventive', desc:'Segment networks by trust level (DMZ, internal, privileged)' },
    { id:'NET-03', name:'Intrusion Detection', type:'Detective', desc:'Deploy IDS/IPS to detect and block network-level attacks' },
    { id:'NET-04', name:'VPN & Remote Access', type:'Preventive', desc:'Secure remote access via VPN with strong authentication requirements' },
    { id:'NET-05', name:'DNS Security', type:'Preventive', desc:'Protect DNS infrastructure from hijacking and cache poisoning attacks' },
  ],
  'Incident Management': [
    { id:'INC-01', name:'Incident Response Plan', type:'Preventive', desc:'Documented and tested playbooks for all major incident categories' },
    { id:'INC-02', name:'Security Incident Triage', type:'Detective', desc:'24/7 triage process with defined severity and escalation criteria' },
    { id:'INC-03', name:'Forensics & Evidence', type:'Detective', desc:'Preserve and analyse evidence from security incidents per legal requirements' },
    { id:'INC-04', name:'Post-Incident Review', type:'Corrective', desc:'Conduct root-cause analysis and lessons-learned after every major incident' },
  ],
  'Business Continuity': [
    { id:'BCM-01', name:'Business Impact Analysis', type:'Preventive', desc:'Identify critical processes and determine recovery time objectives' },
    { id:'BCM-02', name:'Disaster Recovery Plan', type:'Preventive', desc:'Documented and tested plan to recover IT systems after a disaster' },
    { id:'BCM-03', name:'Backup Management', type:'Preventive', desc:'Regular backups with offline copies and validated restoration testing' },
    { id:'BCM-04', name:'DR Testing', type:'Detective', desc:'Annual disaster recovery exercises with documented results' },
  ],
  'Cryptography': [
    { id:'CRY-01', name:'Encryption Key Management', type:'Preventive', desc:'Lifecycle management of cryptographic keys including rotation and revocation' },
    { id:'CRY-02', name:'Certificate Management', type:'Preventive', desc:'Track and renew TLS/SSL certificates before expiry' },
    { id:'CRY-03', name:'Approved Cipher Suites', type:'Preventive', desc:'Enforce use of approved, modern cipher suites and deprecate weak algorithms' },
  ],
  'Physical Security': [
    { id:'PHY-01', name:'Facility Access Control', type:'Preventive', desc:'Badge-based access with logging for all secure areas' },
    { id:'PHY-02', name:'CCTV & Surveillance', type:'Detective', desc:'Video monitoring of data centres and sensitive areas with 90-day retention' },
    { id:'PHY-03', name:'Visitor Management', type:'Preventive', desc:'Formal visitor register and escort policy for secure zones' },
  ],
  'Communications Security': [
    { id:'COM-01', name:'Email Security', type:'Preventive', desc:'Anti-phishing, DMARC, DKIM, and SPF controls on email infrastructure' },
    { id:'COM-02', name:'Secure Messaging', type:'Preventive', desc:'Encrypted channels for sensitive internal and external communications' },
    { id:'COM-03', name:'Network Monitoring', type:'Detective', desc:'Monitor network communications for anomalies and policy violations' },
  ],
  'Compliance': [
    { id:'CPL-01', name:'Regulatory Mapping', type:'Preventive', desc:'Map all applicable regulations to internal controls and assign ownership' },
    { id:'CPL-02', name:'Audit Management', type:'Detective', desc:'Plan, execute, and track internal and external compliance audits' },
    { id:'CPL-03', name:'Policy Review Cycle', type:'Preventive', desc:'Annual review of all security policies with sign-off from leadership' },
  ],
  'Supply Chain Security': [
    { id:'SCH-01', name:'Vendor Assessment', type:'Preventive', desc:'Security assessment of critical vendors before onboarding' },
    { id:'SCH-02', name:'Third-Party Monitoring', type:'Detective', desc:'Continuous monitoring of third-party access and data sharing' },
    { id:'SCH-03', name:'Contract Security Clauses', type:'Preventive', desc:'Security and data protection clauses in all vendor contracts' },
  ],
  'Availability & Continuity': [
    { id:'AVL-01', name:'High Availability Design', type:'Preventive', desc:'Redundant architecture for critical systems to meet availability SLAs' },
    { id:'AVL-02', name:'Capacity Planning', type:'Preventive', desc:'Monitor and plan capacity to prevent performance degradation' },
    { id:'AVL-03', name:'SLA Monitoring', type:'Detective', desc:'Track and report availability against defined service level agreements' },
  ],
};

const CONTROL_TOOL_SUGGESTIONS = {
  'IAM-01': ['Okta','Azure AD / Entra ID','JumpCloud'],
  'IAM-02': ['Duo Security','Google Authenticator','Microsoft Authenticator'],
  'IAM-03': ['CyberArk','BeyondTrust','HashiCorp Vault'],
  'OPS-01': ['Tenable Nessus','Qualys VMDR','Rapid7 InsightVM'],
  'OPS-04': ['Splunk SIEM','Microsoft Sentinel','IBM QRadar'],
  'OPS-05': ['CrowdStrike Falcon','SentinelOne','Microsoft Defender'],
  'DAT-04': ['Forcepoint DLP','Symantec DLP','Microsoft Purview'],
  'NET-01': ['Palo Alto NGFW','Fortinet FortiGate','pfSense'],
  'NET-03': ['Snort','Suricata','Cisco Firepower IDS'],
  'BCM-03': ['Veeam Backup','Acronis','AWS Backup'],
  'INC-01': ['PagerDuty','Jira Service Management','ServiceNow'],
  'COM-01': ['Proofpoint','Mimecast','Microsoft Defender for Email'],
  'GOV-01': ['RSA Archer','ServiceNow GRC','LogicGate'],
  'GOV-04': ['OneTrust','BitSight','ProcessUnity'],
  'CRY-01': ['HashiCorp Vault','AWS KMS','Azure Key Vault'],
};

// ─── STEP 8: Framework Selection ──────────────────────────────────────────────

// CSPM is scoped by cloud platform: the 60 discovery questions the client
// answers are rewritten in the vocabulary of whichever platforms are picked
// here, so at least one is mandatory whenever CSPM is selected.
const CLOUD_PROVIDERS = [
  { id: 'aws',   label: 'AWS',   name: 'Amazon Web Services',   desc: 'Accounts, Organizations, IAM, VPC, S3, CloudTrail, GuardDuty and Security Hub' },
  { id: 'azure', label: 'Azure', name: 'Microsoft Azure',       desc: 'Tenants, subscriptions, Entra ID, VNets, Key Vault, Sentinel and Defender for Cloud' },
  { id: 'gcp',   label: 'GCP',   name: 'Google Cloud Platform', desc: 'Organizations, projects, Cloud IAM, VPC, Cloud KMS and Security Command Center' },
];

function StepFrameworkSelection({ clientId, onSaved }) {
  const FRAMEWORK_LIST = [
    { id:'ISO 27001',      label:'ISO 27001:2022',        group:'Audit & Compliance',    desc:'93 controls for information security management' },
    { id:'SOC 2 Type II',  label:'SOC 2 Type II',         group:'Audit & Compliance',    desc:'Period-based trust services criteria assessment' },
    { id:'SOC 2 Type I',   label:'SOC 2 Type I',          group:'Audit & Compliance',    desc:'Point-in-time trust services criteria assessment' },
    { id:'PCI DSS v4.0',   label:'PCI DSS v4.0',          group:'Audit & Compliance',    desc:'Payment card industry data security standard' },
    { id:'HIPAA',          label:'HIPAA',                  group:'Audit & Compliance',    desc:'Health information privacy and security rules' },
    { id:'GDPR',           label:'GDPR',                   group:'Audit & Compliance',    desc:'EU general data protection regulation' },
    { id:'CMMC 2.0',       label:'CMMC 2.0',              group:'Audit & Compliance',    desc:'Cybersecurity maturity model certification' },
    { id:'FedRAMP',        label:'FedRAMP',                group:'Audit & Compliance',    desc:'Federal risk and authorization management program' },
    { id:'SOX',            label:'SOX IT Controls',        group:'Audit & Compliance',    desc:'Sarbanes-Oxley financial security controls' },
    { id:'HITRUST CSF',    label:'HITRUST CSF',            group:'Audit & Compliance',    desc:'Healthcare information trust alliance framework' },
    { id:'NIST CSF 2.0',   label:'NIST CSF 2.0',          group:'Security Frameworks',   desc:'NIST cybersecurity framework with 6 functions' },
    { id:'NIST 800-53 Rev 5',label:'NIST 800-53 Rev 5',   group:'Security Frameworks',   desc:'Security and privacy controls for federal systems' },
    { id:'CIS Controls v8',label:'CIS Controls v8',        group:'Security Frameworks',   desc:'CIS top 18 controls for cyber defence' },
    { id:'Zero Trust Architecture',label:'Zero Trust Architecture',group:'Security Frameworks',desc:'Never trust always verify security model' },
    { id:'CSPM',           label:'CSPM',                   group:'Security Frameworks',   desc:'Cloud Security Posture Management — 60-question cloud discovery assessment across AWS, Azure and GCP' },
    { id:'DORA',           label:'DORA',                   group:'Regional',              desc:'EU digital operational resilience act' },
    { id:'DPDPA 2023',     label:'DPDP Act, 2023 (India)', group:'Regional',              desc:'India Digital Personal Data Protection Act, 2023 & DPDP Rules, 2025' },
    { id:'NIS2 Directive', label:'NIS2 Directive',         group:'Regional',              desc:'EU network and information systems directive v2' },
    { id:'Essential Eight',label:'Essential Eight',        group:'Regional',              desc:'Australian Cyber Security Centre strategies' },
    { id:'MAS TRM',        label:'MAS TRM',                group:'Regional',              desc:'Monetary Authority of Singapore tech risk mgmt' },
    { id:'SAMA CSF',       label:'SAMA CSF',               group:'Regional',              desc:'Saudi Arabian Monetary Authority framework' },
    { id:'ISO 27701',      label:'ISO 27701',              group:'Privacy',               desc:'Privacy information management extension' },
    { id:'COBIT 2019',     label:'COBIT 2019',             group:'Governance',            desc:'IT governance and management framework' },
    { id:'Vulnerability Management',label:'Vulnerability Management',group:'Operations', desc:'Scan, track, and remediate vulnerabilities' },
    { id:'Incident Response',label:'Incident Response',    group:'Operations',            desc:'Prepare, detect, and respond to incidents' },
    { id:'Security Operations (SOC)',label:'Security Operations (SOC)',group:'Operations',desc:'24/7 security monitoring and threat response' },
    { id:'Threat Intelligence',label:'Threat Intelligence',group:'Operations',            desc:'Monitor and act on emerging threats' },
  ];

  const GROUPS = [...new Set(FRAMEWORK_LIST.map(f => f.group))];

  const [selected, setSelected] = useState([]);
  const [cloudSelected, setCloudSelected] = useState([]);
  const [saveState, setSaveState] = useState('idle');
  const [fwError, setFwError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const cspmSelected = selected.includes('CSPM');

  useEffect(() => {
    Promise.all([
      api(`/api/framework-selections/${clientId}`).catch(() => ({ framework_ids: [] })),
      api(`/api/cloud-selections/${clientId}`).catch(() => ({ providers: [] })),
    ]).then(([fwSel, cloudSel]) => {
      if (fwSel && Array.isArray(fwSel.framework_ids) && fwSel.framework_ids.length) setSelected(fwSel.framework_ids);
      if (cloudSel && Array.isArray(cloudSel.providers) && cloudSel.providers.length) setCloudSelected(cloudSel.providers.slice(0, 1));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [clientId]);

  function toggle(id) {
    setFwError('');
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function selectCloud(id) {
    setFwError('');
    setCloudSelected([id]);
  }

  async function save() {
    if (!selected.length) {
      setFwError('Please select at least one framework before continuing.');
      return;
    }
    if (cspmSelected && cloudSelected.length !== 1) {
      setFwError('CSPM is selected. Please choose 1 cloud platform (AWS, Azure or GCP) to scope the cloud security assessment.');
      return;
    }
    setFwError('');
    setSaveState('saving');
    try {
      await api('/api/framework-selections', { method:'POST',
        body: JSON.stringify({ client_id: clientId, framework_ids: selected }) });
      // Cloud scope is only meaningful while CSPM is selected; clearing it when
      // CSPM is de-selected stops a stale platform list driving the client
      // questionnaire if CSPM is added back later.
      await api('/api/cloud-selections', { method:'POST',
        body: JSON.stringify({ client_id: clientId, providers: cspmSelected ? cloudSelected.slice(0, 1) : [] }) });
      setSaveState('saved');
      onSaved(selected);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch { setSaveState('idle'); }
  }

  if (!loaded) return <div className="text-slate-500 text-sm py-12 text-center">Loading saved selections…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 text-xl font-bold mb-1">Framework Selection</h2>
        <p className="text-slate-500 text-sm">Select the compliance frameworks and security standards your organisation must adhere to. Domains, controls, and tools will be auto-generated from your selections.</p>
      </div>

      {fwError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{fwError}</span>
        </div>
      )}

      {GROUPS.map(group => (
        <div key={group}>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">{group}</div>
          <div className="grid grid-cols-1 gap-2">
            {FRAMEWORK_LIST.filter(f => f.group === group).map(fw => {
              const isSel = selected.includes(fw.id);
              const domCount = (FRAMEWORK_TO_DOMAINS[fw.id] || []).length;
              return (
                <button key={fw.id} onClick={() => toggle(fw.id)}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition ${
                    isSel ? 'border-blue-500 bg-blue-50/70 shadow-sm' : 'border-slate-300 hover:border-slate-400 bg-white'
                  }`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    isSel ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                  }`}>
                    {isSel && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${isSel ? 'text-blue-900' : 'text-slate-900'}`}>{fw.label}</span>
                      {domCount > 0 && <span className="text-[10px] text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded">{domCount} domains</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{fw.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {cspmSelected && (
        <div className="border border-slate-300 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
            <div>
              <div className="text-slate-900 text-sm font-bold">Cloud Platform Scope for CSPM</div>
              <p className="text-slate-500 text-xs mt-0.5">
                Select 1 cloud platform in scope. The 60-question Cloud Security Posture discovery
                questionnaire shown to the client is generated in the vocabulary of the platform selected here.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              Single Scope Required
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            {CLOUD_PROVIDERS.map(cp => {
              const isSel = cloudSelected[0] === cp.id;
              return (
                <button key={cp.id} type="button" onClick={() => selectCloud(cp.id)}
                  className={`text-left flex items-start gap-3 p-3.5 rounded-xl border transition ${
                    isSel ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-500' : 'border-slate-300 hover:border-slate-400 bg-white'
                  }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    isSel ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isSel && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${isSel ? 'text-blue-900' : 'text-slate-900'}`}>{cp.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{cp.name}</div>
                    <div className="text-[11px] text-gray-500 mt-1 leading-snug">{cp.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-slate-500 mt-3">
            {cloudSelected.length === 1
              ? `Platform in scope: ${CLOUD_PROVIDERS.find(c => c.id === cloudSelected[0])?.label || cloudSelected[0]} (${CLOUD_PROVIDERS.find(c => c.id === cloudSelected[0])?.name || ''})`
              : 'No cloud platform selected yet — exactly 1 is required before CSPM can be saved.'}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-blue-900 font-semibold text-sm">{selected.length} framework{selected.length !== 1 ? 's' : ''} selected</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {[...new Set(selected.flatMap(f => FRAMEWORK_TO_DOMAINS[f] || []))].length} security domains will be auto-generated
          </div>
        </div>
        <button onClick={save}
          className={`px-5 py-2 rounded-lg font-semibold text-sm transition ${
            saveState === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}>
          {saveState === 'saving' ? '⏳ Saving…' : saveState === 'saved' ? '✓ Saved & Continue' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 9: Security Domains Review ─────────────────────────────────────────

function StepSecurityDomainsReview({ clientId, selectedFrameworks, onSaved }) {
  const allDomains = [...new Set((selectedFrameworks || []).flatMap(f => FRAMEWORK_TO_DOMAINS[f] || []))];
  const [selected, setSelected] = useState([]);
  const [domError, setDomError] = useState('');
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    api(`/api/domain-selections/${clientId}`).then(d => {
      if (d && Array.isArray(d.domain_ids) && d.domain_ids.length) setSelected(d.domain_ids);
      else setSelected(allDomains); // default: all selected
    }).catch(() => setSelected(allDomains));
  }, [clientId, selectedFrameworks.join(',')]);

  function toggle(d) {
    setDomError('');
    setSelected(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d]);
  }

  async function save() {
    if (!selected.length) {
      setDomError('Please approve at least one security domain before continuing.');
      return;
    }
    setDomError('');
    setSaveState('saving');
    try {
      await api('/api/domain-selections', { method:'POST',
        body: JSON.stringify({ client_id: clientId, domain_ids: selected }) });
      setSaveState('saved');
      onSaved(selected);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch { setSaveState('idle'); }
  }

  if (!allDomains.length) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">🏗️</div>
      <div className="text-sm">No frameworks selected yet. Go back to Step 8 to select frameworks first.</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 text-xl font-bold mb-1">Security Domains Review</h2>
        <p className="text-slate-500 text-sm">These domains were auto-generated from your selected frameworks. Review and approve the domains relevant to your organisation.</p>
      </div>

      {domError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{domError}</span>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4 mb-2 shadow-sm">
        <div className="text-blue-600 text-2xl">🤖</div>
        <div>
          <div className="text-slate-900 text-sm font-semibold">Auto-generated from {selectedFrameworks.length} framework{selectedFrameworks.length !== 1 ? 's' : ''}</div>
          <div className="text-xs text-slate-500">{allDomains.length} domains identified · {selected.length} approved</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setDomError(''); setSelected(allDomains); }} className="text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1 border border-blue-200 bg-white rounded font-medium shadow-sm">Select All</button>
          <button onClick={() => setSelected([])} className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 border border-slate-300 bg-white rounded font-medium shadow-sm">Clear All</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {allDomains.map(domain => {
          const isSel = selected.includes(domain);
          const ctrlCount = (DOMAIN_CONTROLS[domain] || []).length;
          return (
            <button key={domain} onClick={() => toggle(domain)}
              className={`text-left p-3.5 rounded-xl border transition ${
                isSel ? 'border-emerald-500 bg-emerald-50/70 shadow-sm' : 'border-slate-300 hover:border-slate-400 bg-white'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-4 h-4 rounded flex items-center justify-center text-xs border ${
                  isSel ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                }`}>{isSel ? '✓' : ''}</div>
                <span className={`text-sm font-semibold ${isSel ? 'text-emerald-900' : 'text-slate-900'}`}>{domain}</span>
              </div>
              {ctrlCount > 0 && (
                <div className="text-xs text-gray-500 ml-6">{ctrlCount} control{ctrlCount !== 1 ? 's' : ''} available</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button onClick={save}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition">
          {saveState === 'saving' ? '⏳ Saving…' : saveState === 'saved' ? '✓ Saved' : `Approve ${selected.length} Domains & Continue →`}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 10: Controls Review ─────────────────────────────────────────────────

function StepControlsReview({ clientId, selectedDomains, onSaved }) {
  const allControls = (selectedDomains || []).flatMap(d => (DOMAIN_CONTROLS[d] || []).map(c => ({ ...c, domain: d })));
  const [selected, setSelected] = useState([]);
  const [ctrlError, setCtrlError] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterDomain, setFilterDomain] = useState('All');
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    api(`/api/control-selections/${clientId}`).then(d => {
      if (d && Array.isArray(d.control_ids) && d.control_ids.length) setSelected(d.control_ids);
      else setSelected(allControls.map(c => c.id));
    }).catch(() => setSelected(allControls.map(c => c.id)));
  }, [clientId, selectedDomains.join(',')]);

  function toggle(id) {
    setCtrlError('');
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function save() {
    if (!selected.length) {
      setCtrlError('Please approve at least one security control before continuing.');
      return;
    }
    setCtrlError('');
    setSaveState('saving');
    try {
      await api('/api/control-selections', { method:'POST',
        body: JSON.stringify({ client_id: clientId, control_ids: selected }) });
      setSaveState('saved');
      onSaved(selected);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch { setSaveState('idle'); }
  }

  const types = ['All', ...new Set(allControls.map(c => c.type))];
  const domains = ['All', ...new Set(allControls.map(c => c.domain))];
  const filtered = allControls.filter(c =>
    (filterType === 'All' || c.type === filterType) &&
    (filterDomain === 'All' || c.domain === filterDomain)
  );

  const typeBadge = { Preventive:'bg-blue-50 text-blue-700 border border-blue-200', Detective:'bg-amber-50 text-amber-700 border border-amber-200', Corrective:'bg-orange-50 text-orange-700 border border-orange-200' };

  if (!allControls.length) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">📋</div>
      <div className="text-sm">No domains approved yet. Go back to review Security Domains first.</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-slate-900 text-xl font-bold mb-1">Controls Review</h2>
        <p className="text-slate-500 text-sm">Controls auto-generated from your approved domains. Approve the controls applicable to your organisation.</p>
      </div>

      {ctrlError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{ctrlError}</span>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-sm">
        <span className="text-xs text-gray-400">{allControls.length} controls · {selected.length} approved</span>
        <div className="flex gap-2 ml-auto flex-wrap">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 shadow-sm">
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1 max-w-[150px] focus:outline-none focus:border-blue-500 shadow-sm">
            {domains.map(d => <option key={d}>{d}</option>)}
          </select>
          <button onClick={() => { setCtrlError(''); setSelected(allControls.map(c => c.id)); }} className="text-xs text-blue-600 px-2.5 py-1 border border-blue-200 bg-white rounded font-medium shadow-sm">All</button>
          <button onClick={() => setSelected([])} className="text-xs text-slate-600 px-2.5 py-1 border border-slate-300 bg-white rounded font-medium shadow-sm">None</button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(ctrl => {
          const isSel = selected.includes(ctrl.id);
          return (
            <button key={ctrl.id} onClick={() => toggle(ctrl.id)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition ${
                isSel ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-300 hover:border-slate-400 bg-white'
              }`}>
              <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs border mt-0.5 ${
                isSel ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>{isSel ? '✓' : ''}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-mono text-blue-600 font-bold">{ctrl.id}</span>
                  <span className="text-sm font-semibold text-slate-900">{ctrl.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeBadge[ctrl.type] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{ctrl.type}</span>
                  <span className="text-[10px] text-gray-600 bg-slate-100 px-1.5 py-0.5 rounded">{ctrl.domain}</span>
                </div>
                <div className="text-xs text-gray-500">{ctrl.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={save}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition">
          {saveState === 'saving' ? '⏳ Saving…' : saveState === 'saved' ? '✓ Saved' : `Approve ${selected.length} Controls & Continue →`}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 11: Security Tools Selection ───────────────────────────────────────

function StepSecurityToolsNew({ clientId, selectedControls, onSaved }) {
  const suggested = useMemo(() => [...new Set(
    (selectedControls || []).flatMap(id => CONTROL_TOOL_SUGGESTIONS[id] || [])
  )], [selectedControls]);

  // Only what the admin explicitly ticks (or saved earlier) is selected.
  // Suggestions are shown and can be added in one click, never auto-ticked —
  // the selection decides which tools the client is set up with.
  const [selected, setSelected]   = useState([]);
  const [custom, setCustom]       = useState('');
  const [toolError, setToolError] = useState('');
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    api(`/api/tool-selections/${clientId}`).then(d => {
      const savedTools = (d && Array.isArray(d.tool_names)) ? d.tool_names : [];
      setSelected(savedTools);
    }).catch(() => {});
  }, [clientId]);

  function toggle(name) {
    setToolError('');
    setSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name]);
  }

  function addCustom() {
    if (!custom.trim() || selected.includes(custom.trim())) return;
    setToolError('');
    setSelected(s => [...s, custom.trim()]);
    setCustom('');
  }

  async function save() {
    if (!selected.length) {
      setToolError('Please select at least one security tool before continuing.');
      return;
    }
    setToolError('');
    setSaveState('saving');
    try {
      await api('/api/tool-selections', { method:'POST',
        body: JSON.stringify({ client_id: clientId, tool_names: selected }) });
      setSaveState('saved');
      onSaved(selected);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch { setSaveState('idle'); }
  }

  const CATEGORY_TOOLS = {
    'Vulnerability Management': ['Tenable Nessus','Qualys VMDR','Rapid7 InsightVM','OpenVAS'],
    'SIEM & Monitoring':        ['Splunk SIEM','Microsoft Sentinel','IBM QRadar','Elastic SIEM'],
    'Endpoint Protection':      ['CrowdStrike Falcon','SentinelOne','Microsoft Defender','Cortex XDR'],
    'Identity & Access':        ['Okta','Azure AD / Entra ID','JumpCloud','Duo Security'],
    'Privileged Access':        ['CyberArk','BeyondTrust','HashiCorp Vault'],
    'Email Security':           ['Proofpoint','Mimecast','Microsoft Defender for Email'],
    'Network Security':         ['Palo Alto NGFW','Fortinet FortiGate','Cisco Firepower IDS'],
    'Backup & Recovery':        ['Veeam Backup','Acronis','AWS Backup'],
    'GRC & Risk':               ['RSA Archer','ServiceNow GRC','OneTrust','LogicGate'],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 text-xl font-bold mb-1">Security Tools Selection</h2>
        <p className="text-slate-500 text-sm">Tools suggested based on your approved controls. Select tools your organisation currently uses or plans to deploy.</p>
      </div>

      {toolError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{toolError}</span>
        </div>
      )}

      {suggested.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-blue-900 text-sm font-semibold">🎯 Suggested from your controls</div>
            {suggested.some(t => !selected.includes(t)) && (
              <button onClick={() => { setToolError(''); setSelected(s => [...new Set([...s, ...suggested])]); }}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline">Select all suggested</button>
            )}
          </div>
          <p className="text-blue-800 text-xs mb-2">Only tick the tools the organisation actually uses — each selected tool becomes part of its setup.</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map(tool => (
              <button key={tool} onClick={() => toggle(tool)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  selected.includes(tool) ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-medium' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-500 shadow-sm'
                }`}>
                {selected.includes(tool) ? '✓ ' : ''}{tool}
              </button>
            ))}
          </div>
        </div>
      )}

      {Object.entries(CATEGORY_TOOLS).map(([cat, tools]) => (
        <div key={cat}>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{cat}</div>
          <div className="flex flex-wrap gap-2">
            {tools.map(tool => (
              <button key={tool} onClick={() => toggle(tool)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  selected.includes(tool) ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-medium' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 shadow-sm'
                }`}>
                {selected.includes(tool) ? '✓ ' : ''}{tool}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Add Custom Tool</div>
        <div className="flex gap-2">
          <input value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder="Enter tool name…"
            className="flex-1 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
          <button onClick={addCustom} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition shadow-sm">Add</button>
        </div>
        {selected.filter(t => !Object.values(CATEGORY_TOOLS).flat().includes(t) && !suggested.includes(t)).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selected.filter(t => !Object.values(CATEGORY_TOOLS).flat().includes(t) && !suggested.includes(t)).map(t => (
              <span key={t} className="flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 px-2 py-1 rounded text-xs font-medium shadow-sm">
                {t}
                <button onClick={() => toggle(t)} className="text-purple-400 hover:text-red-400 ml-1">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="text-sm text-slate-700">{selected.length} tool{selected.length !== 1 ? 's' : ''} selected</div>
        <button onClick={save}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition">
          {saveState === 'saving' ? '⏳ Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}

// ─── CHANGE REQUEST MODAL ──────────────────────────────────────────────────────

function ChangeRequestModal({ stepLabel, stepKey, clientId, clientName, onClose, onSubmitted, onDirectUnlock }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ client_id: clientId, client_name: clientName, section: stepLabel, requested_by: 'Admin', requester_role: 'admin', reason })
      });
      setDone(true);
      window.dispatchEvent(new Event('notification-updated'));
      setTimeout(() => { if (onSubmitted) onSubmitted(); onClose(); }, 1200);
    } catch {
      setSubmitting(false);
    }
  }

  async function directUnlock() {
    setSubmitting(true);
    try {
      if (onDirectUnlock) onDirectUnlock(stepLabel, stepKey);
      await fetch('/api/onboarding-status/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          client_id: clientId,
          section: stepLabel
        })
      });
      window.dispatchEvent(new Event('onboarding-status-updated'));
      window.dispatchEvent(new Event('notification-updated'));
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (e) {
      console.error('Direct unlock error:', e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-slate-900 font-bold">Change Request Submitted</div>
            <div className="text-slate-500 text-sm mt-1">A notification has been created in the top bell 🔔 for review.</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 font-bold text-lg">Request Section Edit</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="text-amber-900 text-sm font-semibold">Section: {stepLabel}</div>
              <div className="text-amber-800 text-xs mt-0.5">This section is locked after completion. As an Admin, you can request an edit or unlock it immediately for 24 hours.</div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Reason for Change</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder="Describe what needs to be changed and why…"
                className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none shadow-sm" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={onClose} className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 transition font-medium">Cancel</button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition disabled:opacity-50">
                {submitting ? '⏳ Working…' : '📝 Submit Request'}
              </button>
              <button onClick={directUnlock} disabled={submitting}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50">
                {submitting ? '⏳ Unlocking…' : '🔓 Unlock Now (24h)'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────────
export default function OnboardingWizard({ activeClient: propClient }) {
  const [localClient, setLocalClient] = useState(null);
  const activeClient = propClient || localClient;

  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted]     = useState(new Set());
  const [done, setDone]               = useState(false);
  const [draftSaved, setDraftSaved]   = useState(false);
  const [liveModules, setLiveModules] = useState(new Set());
  const [dbStatus, setDbStatus]       = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [employees, setEmployees]         = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [unlockedSections, setUnlockedSections] = useState(new Set());
  // GRC pipeline state
  const [selectedFrameworks, setSelectedFrameworks] = useState([]);
  const [selectedDomains, setSelectedDomains]       = useState([]);
  const [selectedControls, setSelectedControls]     = useState([]);
  // Change request modal
  const [changeReqModal, setChangeReqModal] = useState(null); // {stepLabel, stepKey}

  // Step key → DB column mapping (governed steps only)
  const STEP_KEY_MAP = {
    'company_details':    'company_details_completed',
    'escalation_matrix':  'escalation_completed',
    'branding_legal':     'branding_completed',
    'contract_tenure':    'contract_completed',
    'asset_inventory':    'asset_inventory_completed',
    'asset_registry':     'asset_registry_completed',
    'platform_config':    'platform_config_completed',
    'framework_selection':'framework_completed',
    'security_domains':   'domains_completed',
    'controls_review':    'controls_completed',
    'security_tools':     'tools_completed',
    'integrations':       'integrations_completed',
  };

  const refreshUsers = useCallback(() => {
    if (!activeClient?.id) return;
    Promise.all([
      api(`/api/employees/${activeClient.id}`).catch(() => []),
      api(`/api/users?client_id=${activeClient.id}`).catch(() => []),
    ]).then(([empList, userList]) => {
      setEmployees(Array.isArray(empList) ? empList : []);
      setPlatformUsers(Array.isArray(userList) ? userList : (userList?.users || []));
    });
  }, [activeClient?.id]);

  const reloadDbStatus = useCallback(() => {
    if (!activeClient?.id) return;
    api(`/api/onboarding-status/${activeClient.id}`).then(status => {
      if (status) setDbStatus(status);
    }).catch(() => {});
  }, [activeClient?.id]);

  useEffect(() => {
    window.addEventListener('onboarding-status-updated', reloadDbStatus);
    return () => window.removeEventListener('onboarding-status-updated', reloadDbStatus);
  }, [reloadDbStatus]);

  // Load DB status and restore state
  useEffect(() => {
    setCurrentStep(0);
    setCompleted(new Set());
    setDone(false);
    setLiveModules(new Set());
    setDbStatus(null);
    setEmployees([]);
    setPlatformUsers([]);
    setSelectedFrameworks([]);
    setSelectedDomains([]);
    setSelectedControls([]);

    if (!activeClient?.id) return;

    setStatusLoading(true);

    Promise.all([
      api(`/api/onboarding-status/${activeClient.id}`).catch(() => ({})),
      api(`/api/onboarding-modules/${activeClient.id}`).catch(() => []),
      api(`/api/framework-selections/${activeClient.id}`).catch(() => ({ framework_ids:[] })),
      api(`/api/domain-selections/${activeClient.id}`).catch(() => ({ domain_ids:[] })),
      api(`/api/control-selections/${activeClient.id}`).catch(() => ({ control_ids:[] })),
      api(`/api/tool-selections/${activeClient.id}`).catch(() => ({ tool_names:[] })),
      api(`/api/employees/${activeClient.id}`).catch(() => []),
      api(`/api/users?client_id=${activeClient.id}`).catch(() => []),
    ]).then(([status, modules, frameSel, domSel, ctrlSel, toolSel, emps, usrs]) => {
      setDbStatus(status);
      setEmployees(Array.isArray(emps) ? emps : []);
      setPlatformUsers(Array.isArray(usrs) ? usrs : (usrs?.users || []));
      setLiveModules(new Set([
        ...(Array.isArray(modules) ? modules.filter(r => r.enabled).map(r => r.module_name) : []),
        ...(toolSel?.tool_names || [])
      ]));
      if (frameSel?.framework_ids?.length) setSelectedFrameworks(frameSel.framework_ids);
      if (domSel?.domain_ids?.length) setSelectedDomains(domSel.domain_ids);
      if (ctrlSel?.control_ids?.length) setSelectedControls(ctrlSel.control_ids);

      // Restore completed set from DB
      const completedSet = new Set();
      STEPS.forEach((step, i) => {
        const col = STEP_KEY_MAP[step.key];
        if (col && (status[col] === true || status[col] === 't')) {
          completedSet.add(i);
        }
      });
      setCompleted(completedSet);

      // Find first uncompleted governed step to start at
      const firstUncompleted = STEPS.findIndex((s, i) => s.governed && !completedSet.has(i));
      if (firstUncompleted >= 0) setCurrentStep(firstUncompleted);
    }).finally(() => setStatusLoading(false));
  }, [activeClient?.id]);

  async function markDone(idx) {
    const step = STEPS[idx];
    const newCompleted = new Set([...completed, idx]);
    setCompleted(newCompleted);

    // Save to DB if governed step
    const col = STEP_KEY_MAP[step?.key];
    if (col && activeClient?.id) {
      try {
        await api('/api/onboarding-status', { method:'POST',
          body: JSON.stringify({ client_id: activeClient.id, step_key: col, completed: true }) });
        // Refresh DB status
        api(`/api/onboarding-status/${activeClient.id}`).then(setDbStatus).catch(() => {});
      } catch {}
    }

    if (idx === STEPS.length - 1) setDone(true);
    else setCurrentStep(idx + 1);
  }

  function goBack() {
    setCurrentStep(s => Math.max(0, s - 1));
  }

  function saveDraft() {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  }

  // No client — show inline picker
  if (!activeClient) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <ClientPicker onSelect={setLocalClient} />
      </div>
    );
  }

  // User Management rule: complete if has >=1 client employee user and >=1 vCISO user
  const hasClientEmp = (employees.length >= 1) || platformUsers.some(u => u.role === 'client' || u.employee_type === 'internal' || u.employee_type === 'external');
  const hasVcisoUser = platformUsers.some(u => u.role === 'vciso' || u.role === 'admin' || u.role === 'owner' || u.role === 'vciso_admin');
  const userMgmtDone = hasClientEmp && hasVcisoUser;

  // Trackable steps: 13 steps total (Steps 0-12). Step 13 (Review & Complete) is excluded from progress calculation.
  const isStepDone = (idx) => {
    if (idx === 12) return userMgmtDone || completed.has(12);
    if (idx === 13) return false;
    return completed.has(idx);
  };

  const trackableSteps = STEPS.slice(0, 13);
  const completedTrackableCount = trackableSteps.filter((_, i) => isStepDone(i)).length;
  const progress = Math.round((completedTrackableCount / 13) * 100);
  const progressColor = progress === 100 ? '#10b981' : progress >= 80 ? th('#2563eb', { dark: '#60A5FA' }) : progress >= 50 ? '#f59e0b' : '#ef4444';

  // Check if current step is locked (completed governed step not in edit mode)
  const currentStepMeta = STEPS[currentStep];
  const isSectionUnlocked = Boolean(
    unlockedSections.has(currentStepMeta?.label) ||
    unlockedSections.has(currentStepMeta?.key) ||
    (dbStatus && (dbStatus.edit_mode === true || dbStatus.edit_mode === 'true' || dbStatus.edit_mode === 1 || dbStatus.edit_mode === 't') && (() => {
      const section = (dbStatus.edit_mode_section || '').trim().toLowerCase();
      if (!section || section === 'all') return true;
      const label = (currentStepMeta?.label || '').trim().toLowerCase();
      const key = (currentStepMeta?.key || '').trim().toLowerCase();
      return (
        section === label ||
        section === key ||
        section.replace(/[^a-z0-9]/g, '') === label.replace(/[^a-z0-9]/g, '') ||
        section.replace(/[^a-z0-9]/g, '') === key.replace(/[^a-z0-9]/g, '') ||
        label.includes(section) ||
        section.includes(label)
      );
    })())
  );
  const isCurrentStepLocked = currentStepMeta?.governed && completed.has(currentStep) && !isSectionUnlocked;

  // Step navigation access check:
  function isStepAccessible(targetIdx) {
    if (targetIdx <= currentStep) return true;
    for (let j = 0; j < targetIdx; j++) {
      if (!isStepDone(j)) return false;
    }
    return true;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex">
        <CompletionPage clientId={activeClient.id} clientName={activeClient.name} />
      </div>
    );
  }

  // 14-step governed onboarding content
  const stepContent = [
    // 1 — Company Details
    <StepCompanyInfo          key="s1"  clientId={activeClient.id} onSaved={() => markDone(0)} />,
    // 2 — Escalation Matrix
    <StepContacts             key="s2"  clientId={activeClient.id} onSaved={() => markDone(1)} />,
    // 3 — Branding & Legal
    <StepBranding             key="s3"  clientId={activeClient.id} onSaved={() => markDone(2)} />,
    // 4 — Contract Tenure
    <StepContractTenure       key="s4"  clientId={activeClient.id} onSaved={() => markDone(3)} />,
    // 5 — Asset Inventory
    <StepAssetInventory       key="s5"  clientId={activeClient.id} onSaved={() => markDone(4)} />,
    // 6 — Asset & Employee Registry
    <StepAssetRegistry        key="s6"  clientId={activeClient.id} onSaved={() => markDone(5)} />,
    // 7 — Platform Configuration
    <StepPlatformConfig       key="s7"  clientId={activeClient.id} onSaved={() => markDone(6)} />,
    // 8 — Framework Selection
    <StepFrameworkSelection   key="s8"  clientId={activeClient.id} onSaved={(sel) => { setSelectedFrameworks(sel); markDone(7); }} />,
    // 9 — Security Domains Review
    <StepSecurityDomainsReview key="s9" clientId={activeClient.id} selectedFrameworks={selectedFrameworks} onSaved={(sel) => { setSelectedDomains(sel); markDone(8); }} />,
    // 10 — Controls Review
    <StepControlsReview       key="s10" clientId={activeClient.id} selectedDomains={selectedDomains} onSaved={(sel) => { setSelectedControls(sel); markDone(9); }} />,
    // 11 — Security Tools Selection
    <StepSecurityToolsNew     key="s11" clientId={activeClient.id} selectedControls={selectedControls} onSaved={(sel) => { setLiveModules(prev => new Set([...prev, ...sel])); markDone(10); }} />,
    // 12 — Integrations
    <StepIntegrations         key="s12" clientId={activeClient.id} liveModules={liveModules} selectedFrameworks={selectedFrameworks} selectedDomains={selectedDomains} onSaved={() => markDone(11)} />,
    // 13 — User Management (never locked)
    <StepUserManagement       key="s13" activeClient={activeClient} onUserUpdated={refreshUsers} onSaved={() => { refreshUsers(); markDone(12); }} />,
    // 14 — Review & Complete (never locked)
    <StepReviewComplete       key="s14" clientId={activeClient.id} clientName={activeClient.name} completed={completed} isStepDone={isStepDone} onSaved={() => markDone(13)} />,
  ];

  const step = STEPS[currentStep];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚀</span>
            <div>
              <div className="text-slate-900 font-bold text-sm leading-tight">Client Onboarding</div>
              <div className="text-blue-600 text-xs font-semibold truncate max-w-[180px]">{activeClient.name}</div>
            </div>
          </div>
        </div>

        {/* Progress tracker */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">Onboarding Progress</span>
            <span className="font-bold text-slate-900">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-500" style={{ width:`${progress}%`, background: progressColor }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1 font-medium">
            <span className="text-slate-500">{completedTrackableCount}/13 steps</span>
            <span className={progress === 100 ? 'text-emerald-700 font-bold' : progress >= 80 ? 'text-blue-700 font-bold' : progress >= 50 ? 'text-amber-700 font-bold' : 'text-red-700 font-bold'}>
              {progress === 100 ? '✓ Complete' : progress >= 80 ? 'Almost done' : progress >= 50 ? 'In progress' : 'Getting started'}
            </span>
          </div>
        </div>

        {/* Step navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {STEPS.map((s, i) => {
            const isActive   = i === currentStep;
            const isDone     = isStepDone(i);
            const isLocked   = s.governed && isDone;
            const accessible = isStepAccessible(i);

            return (
              <button
                key={i}
                disabled={!accessible}
                onClick={() => {
                  if (accessible) setCurrentStep(i);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold transition group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                    : isDone
                      ? 'text-emerald-700 hover:bg-emerald-50/50'
                      : accessible
                        ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-400 opacity-40 cursor-not-allowed'
                }`}
                title={!accessible ? `Please finish the current step and preceding steps before accessing ${s.label}` : ''}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition ${
                  isDone   ? 'bg-emerald-600 text-white'
                  : isActive ? 'bg-blue-600 text-white'
                  : accessible ? 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  : 'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? '✓' : !accessible ? '🔒' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{s.label}</div>
                  {!s.governed && <div className="text-[9px] text-slate-400">Always editable</div>}
                  {!accessible && <div className="text-[9px] text-amber-600">Complete prior steps first</div>}
                </div>
                {isLocked && !isActive && (
                  <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide flex-shrink-0">🔒</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: Save Draft + Switch Client */}
        <div className="px-4 py-3 border-t border-slate-200 space-y-2 bg-slate-50">
          <button
            onClick={saveDraft}
            className={`w-full text-xs py-2 rounded-xl font-bold transition border shadow-sm ${
              draftSaved
                ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {draftSaved ? '✓ Draft Saved' : '💾 Save Draft'}
          </button>
          {!propClient && (
            <button
              onClick={() => setLocalClient(null)}
              className="w-full text-xs text-slate-500 hover:text-slate-800 transition text-left font-medium"
            >
              ← Switch Client
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-slate-50">

        {/* Top step header bar */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              onClick={goBack}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-sm font-bold"
            >
              ← Back
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-base">{step.icon}</span>
              <span className="text-slate-900 text-sm font-bold">{step.label}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                Step {currentStep + 1} of {STEPS.length}
              </span>
            </div>
          </div>

          {/* Right: notification bell & completion chips */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            {completedTrackableCount > 0 && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                {completedTrackableCount}/13 completed
              </span>
            )}
            {completed.has(currentStep) && (
              <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full font-bold">
                ✓ This step saved
              </span>
            )}
          </div>
        </div>

        {/* Step body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {/* Locked step overlay for completed governed steps */}
            {isCurrentStepLocked && (
              <div className="mb-6 bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600 text-xl border border-emerald-200">🔒</div>
                  <div className="flex-1">
                    <div className="text-emerald-800 font-bold text-sm mb-0.5">Section Completed & Locked</div>
                    <div className="text-slate-500 text-xs mb-3">This section has been saved to the database. Data is protected from accidental changes. To make modifications, submit a change request or unlock directly.</div>
                    <div className="flex gap-3 flex-wrap">
                      <button onClick={() => setChangeReqModal({ stepLabel: currentStepMeta.label, stepKey: currentStepMeta.key })}
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Request to Edit This Section</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const sectionLabel = currentStepMeta.label;
                            const sectionKey = currentStepMeta.key;
                            setUnlockedSections(prev => new Set([...prev, sectionLabel, sectionKey]));
                            await fetch('/api/onboarding-status/unlock', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...authHeader() },
                              body: JSON.stringify({
                                client_id: activeClient.id,
                                section: sectionLabel
                              })
                            });
                            window.dispatchEvent(new Event('onboarding-status-updated'));
                            window.dispatchEvent(new Event('notification-updated'));
                            api(`/api/onboarding-status/${activeClient.id}`).then(setDbStatus).catch(() => {});
                          } catch (e) {
                            console.error('Direct unlock error:', e);
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5">
                        <span>🔓</span>
                        <span>Direct Unlock (24h)</span>
                      </button>
                      <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                        className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-sm">
                        Continue to Next Step →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step content — greyed out when locked */}
            <div className={isCurrentStepLocked ? 'opacity-40 pointer-events-none select-none' : ''}>
              {stepContent[currentStep]}
            </div>
          </div>
        </div>
      </main>

      {/* Change Request Modal */}
      {changeReqModal && (
        <ChangeRequestModal
          stepLabel={changeReqModal.stepLabel}
          stepKey={changeReqModal.stepKey}
          clientId={activeClient.id}
          clientName={activeClient.name}
          onClose={() => setChangeReqModal(null)}
          onSubmitted={() => {
            setChangeReqModal(null);
            api(`/api/onboarding-status/${activeClient.id}`).then(setDbStatus).catch(() => {});
          }}
          onDirectUnlock={(lbl, key) => setUnlockedSections(prev => new Set([...prev, lbl, key]))}
        />
      )}
    </div>
  );
}
