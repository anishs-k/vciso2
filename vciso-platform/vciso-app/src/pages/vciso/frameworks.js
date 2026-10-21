// All compliance frameworks — hardcoded, no DB needed
export const FRAMEWORKS = {
  global: [
    { id: 'iso27001', name: 'ISO 27001:2022', desc: 'Information Security Management System', controls: 93 },
    { id: 'iso27002', name: 'ISO 27002:2022', desc: 'Information Security Controls', controls: 93 },
    { id: 'soc2', name: 'SOC 2 Type II', desc: 'Service Organization Controls (Trust Services)', controls: 64 },
    { id: 'soc1', name: 'SOC 1 Type II', desc: 'Internal Control over Financial Reporting', controls: 30 },
    { id: 'gdpr', name: 'GDPR', desc: 'General Data Protection Regulation (EU)', controls: 99 },
    { id: 'nistcsf', name: 'NIST CSF 2.0', desc: 'Cybersecurity Framework — Identify, Protect, Detect, Respond, Recover', controls: 106 },
    { id: 'nist80053', name: 'NIST SP 800-53 Rev5', desc: 'Security & Privacy Controls for Federal Systems', controls: 1000 },
    { id: 'pcidss', name: 'PCI-DSS v4.0', desc: 'Payment Card Industry Data Security Standard', controls: 251 },
    { id: 'hipaa', name: 'HIPAA', desc: 'Health Insurance Portability and Accountability Act', controls: 75 },
    { id: 'cis8', name: 'CIS Controls v8', desc: 'Center for Internet Security Critical Controls', controls: 153 },
    { id: 'cspm', name: 'CSPM', desc: 'Cloud Security Posture Management — AWS, Azure & GCP discovery assessment', controls: 60 },
    { id: 'iso22301', name: 'ISO 22301:2019', desc: 'Business Continuity Management Systems', controls: 40 },
    { id: 'iso31000', name: 'ISO 31000:2018', desc: 'Risk Management — Guidelines', controls: 30 },
  ],
  india: [
    { id: 'rbi', name: 'RBI Cybersecurity Framework', desc: 'Reserve Bank of India IT & Cybersecurity Directions', controls: 50 },
    { id: 'sebi', name: 'SEBI CSCRF', desc: 'Cyber Security & Cyber Resilience Framework for Market Infrastructure', controls: 45 },
    { id: 'irdai', name: 'IRDAI Cybersecurity', desc: 'Insurance Regulatory & Development Authority Guidelines', controls: 35 },
    { id: 'certin', name: 'CERT-In Directions 2022', desc: 'Incident Reporting, Log Retention & Compliance', controls: 20 },
    { id: 'itact', name: 'IT Act 2000 + Amendments', desc: 'Information Technology Act & IT Rules', controls: 25 },
    { id: 'dpdp', name: 'DPDP Act 2023', desc: 'Digital Personal Data Protection Act', controls: 30 },
    { id: 'npci', name: 'NPCI Framework', desc: 'National Payments Corporation Cybersecurity Standards', controls: 28 },
    { id: 'meity', name: 'MeitY Guidelines', desc: 'Ministry of Electronics & Information Technology Directions', controls: 22 },
  ],
  sector: [
    { id: 'tisax', name: 'TISAX', desc: 'Trusted Information Security Assessment Exchange (Automotive)', controls: 60 },
    { id: 'hitrust', name: 'HITRUST CSF v11', desc: 'Healthcare Information Trust Alliance Framework', controls: 156 },
    { id: 'swiftcsp', name: 'SWIFT CSP 2024', desc: 'Customer Security Programme (Banking/Finance)', controls: 31 },
    { id: 'fedramp', name: 'FedRAMP High', desc: 'Federal Risk and Authorization Management Program', controls: 325 },
    { id: 'nerccip', name: 'NERC CIP', desc: 'Critical Infrastructure Protection Standards (Energy)', controls: 45 },
    { id: 'cobit', name: 'COBIT 2019', desc: 'Governance of Enterprise IT Framework', controls: 40 },
    { id: 'itil4', name: 'ITIL 4', desc: 'IT Infrastructure Library — Service Management', controls: 34 },
  ],
};

export const ALL_FRAMEWORKS = [...FRAMEWORKS.global, ...FRAMEWORKS.india, ...FRAMEWORKS.sector];

// Sample controls for each framework (first 10 shown, rest generated)
export const FRAMEWORK_CONTROLS = {
  iso27001: [
    { id: 'A.5.1', domain: 'Organizational Controls', name: 'Policies for information security' },
    { id: 'A.5.2', domain: 'Organizational Controls', name: 'Information security roles and responsibilities' },
    { id: 'A.5.3', domain: 'Organizational Controls', name: 'Segregation of duties' },
    { id: 'A.5.7', domain: 'Organizational Controls', name: 'Threat intelligence' },
    { id: 'A.6.1', domain: 'People Controls', name: 'Screening' },
    { id: 'A.6.3', domain: 'People Controls', name: 'Information security awareness, education and training' },
    { id: 'A.7.1', domain: 'Physical Controls', name: 'Physical security perimeters' },
    { id: 'A.7.2', domain: 'Physical Controls', name: 'Physical entry' },
    { id: 'A.8.1', domain: 'Technological Controls', name: 'User endpoint devices' },
    { id: 'A.8.2', domain: 'Technological Controls', name: 'Privileged access rights' },
    { id: 'A.8.5', domain: 'Technological Controls', name: 'Secure authentication' },
    { id: 'A.8.7', domain: 'Technological Controls', name: 'Protection against malware' },
    { id: 'A.8.8', domain: 'Technological Controls', name: 'Management of technical vulnerabilities' },
    { id: 'A.8.12', domain: 'Technological Controls', name: 'Data leakage prevention' },
    { id: 'A.8.15', domain: 'Technological Controls', name: 'Logging' },
    { id: 'A.8.16', domain: 'Technological Controls', name: 'Monitoring activities' },
    { id: 'A.8.23', domain: 'Technological Controls', name: 'Web filtering' },
    { id: 'A.8.24', domain: 'Technological Controls', name: 'Use of cryptography' },
  ],
  soc2: [
    { id: 'CC1.1', domain: 'Common Criteria', name: 'COSO Principle 1: Commitment to integrity and ethical values' },
    { id: 'CC2.1', domain: 'Common Criteria', name: 'COSO Principle 6: Specification of suitable objectives' },
    { id: 'CC3.1', domain: 'Common Criteria', name: 'COSO Principle 6: Identification and analysis of risk' },
    { id: 'CC4.1', domain: 'Monitoring', name: 'Evaluation and communication of deficiencies' },
    { id: 'CC5.1', domain: 'Control Activities', name: 'Selection and development of control activities' },
    { id: 'CC6.1', domain: 'Logical Access', name: 'Logical access security software, infrastructure, and architectures' },
    { id: 'CC6.2', domain: 'Logical Access', name: 'Prior to issuing system credentials and granting access' },
    { id: 'CC6.3', domain: 'Logical Access', name: 'Role-based access to information assets' },
    { id: 'CC7.1', domain: 'System Operations', name: 'Detection and monitoring of new vulnerabilities' },
    { id: 'CC7.2', domain: 'System Operations', name: 'Monitoring components for anomalies' },
    { id: 'CC8.1', domain: 'Change Management', name: 'Authorize, design, develop or acquire changes' },
    { id: 'CC9.1', domain: 'Risk Mitigation', name: 'Risk mitigation activities' },
  ],
  gdpr: [
    { id: 'Art.5', domain: 'Principles', name: 'Principles relating to processing of personal data' },
    { id: 'Art.6', domain: 'Lawfulness', name: 'Lawfulness of processing' },
    { id: 'Art.7', domain: 'Consent', name: 'Conditions for consent' },
    { id: 'Art.13', domain: 'Transparency', name: 'Information to be provided where personal data collected' },
    { id: 'Art.17', domain: 'Data Subject Rights', name: 'Right to erasure (right to be forgotten)' },
    { id: 'Art.25', domain: 'Data Protection', name: 'Data protection by design and by default' },
    { id: 'Art.28', domain: 'Processors', name: 'Processor obligations and contracts' },
    { id: 'Art.32', domain: 'Security', name: 'Security of processing' },
    { id: 'Art.33', domain: 'Breach Notification', name: 'Notification of personal data breach to supervisory authority' },
    { id: 'Art.35', domain: 'DPIA', name: 'Data protection impact assessment' },
    { id: 'Art.37', domain: 'DPO', name: 'Designation of the data protection officer' },
    { id: 'Art.44', domain: 'Transfers', name: 'General principle for transfers to third countries' },
  ],
};

// Generate generic controls for frameworks without explicit controls
export function getControls(frameworkId, totalControls) {
  if (FRAMEWORK_CONTROLS[frameworkId]) return FRAMEWORK_CONTROLS[frameworkId];
  const domains = ['Governance', 'Risk Management', 'Access Control', 'Incident Response', 'Asset Management', 'Compliance', 'Security Operations', 'Data Protection'];
  const controls = [];
  for (let i = 1; i <= Math.min(totalControls, 20); i++) {
    controls.push({
      id: `${frameworkId.toUpperCase()}-${String(i).padStart(2, '0')}`,
      domain: domains[Math.floor((i - 1) / 3) % domains.length],
      name: `Control requirement ${i} — ${domains[Math.floor((i - 1) / 3) % domains.length].toLowerCase()} policy and procedure`,
    });
  }
  return controls;
}
