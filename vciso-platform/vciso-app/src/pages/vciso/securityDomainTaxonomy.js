/**
 * securityDomainTaxonomy.js
 *
 * Comprehensive, industry-aligned cybersecurity module taxonomy for the vCISO platform.
 *
 * Structure:
 *   SECURITY_DOMAINS — 12 domains, each with:
 *     - id, label, icon, color
 *     - modules[]  — frameworks/standards/practice areas with accurate short descriptions
 *     - tools[]    — specific vendors/products with accurate descriptions + popular flag
 *
 * Designed to replace the flat 18-category MASTER_LIBRARY in OnboardingWizard.jsx.
 * When a user selects "ISO 27001" or "SIEM" they immediately understand purpose and tooling.
 *
 * Color palette (one per domain, kept consistent with existing UI tokens):
 *   GRC                  #7c3aed  violet
 *   Vulnerability Mgmt   #ef4444  red
 *   IAM                  #f59e0b  amber
 *   Security Ops & IR    #3b82f6  blue
 *   Endpoint Security    #06b6d4  cyan
 *   Network Security     #0891b2  dark-cyan
 *   Cloud Security       #0ea5e9  sky
 *   AppSec / DevSecOps   #6366f1  indigo
 *   Data Protection      #8b5cf6  purple
 *   Business Continuity  #22c55e  green
 *   Threat Intelligence  #84cc16  lime
 *   Third-Party Risk     #f97316  orange
 */

export const SECURITY_DOMAINS = [

  // ─── 1. Governance, Risk & Compliance (GRC) ────────────────────────────────
  {
    id: 'grc',
    label: 'Governance, Risk & Compliance',
    shortLabel: 'GRC',
    icon: '🏛️',
    color: '#7c3aed',

    modules: [
      { name: 'ISO 27001:2022',         desc: 'ISMS standard — 93 controls covering people, org, tech, physical domains' },
      { name: 'SOC 2 Type II',          desc: 'AICPA trust services criteria audit over a defined review period' },
      { name: 'NIST CSF 2.0',           desc: 'Six-function framework: Govern, Identify, Protect, Detect, Respond, Recover' },
      { name: 'PCI DSS v4.0',           desc: 'Payment card data security — 12 requirements for cardholder environments' },
      { name: 'HIPAA Security Rule',    desc: 'Administrative, physical, and technical safeguards for ePHI' },
      { name: 'GDPR',                   desc: 'EU personal data regulation — lawful basis, rights, 72-hr breach notice' },
      { name: 'CMMC 2.0',              desc: 'DoD supply-chain maturity model mapping to NIST 800-171 practices' },
      { name: 'FedRAMP',                desc: 'Federal cloud authorization program based on NIST 800-53 controls' },
      { name: 'SOX IT Controls',        desc: 'IT general controls for financial reporting integrity under Sarbanes-Oxley' },
      { name: 'DORA',                   desc: 'EU digital operational resilience — ICT risk, testing, incident reporting' },
      { name: 'NIS2 Directive',         desc: 'EU mandatory cybersecurity measures for essential and important entities' },
      { name: 'CIS Controls v8',        desc: '18 prioritized security controls mapped to IG1/IG2/IG3 implementation groups' },
      { name: 'Risk Management Program',desc: 'Identify, assess, treat, and monitor information security risks enterprise-wide' },
      { name: 'Audit Management',       desc: 'Plan, execute, and track internal and external security audits end-to-end' },
      { name: 'Security Policy Mgmt',   desc: 'Author, version, distribute, and attest security policies organization-wide' },
    ],

    tools: [
      { name: 'Vanta',            desc: 'Automated SOC 2, ISO 27001, HIPAA compliance with continuous evidence collection', popular: true },
      { name: 'Drata',            desc: 'Continuous compliance automation for 20+ frameworks with 200+ native integrations', popular: true },
      { name: 'Secureframe',      desc: 'End-to-end compliance automation covering SOC 2, ISO 27001, HIPAA, PCI DSS', popular: true },
      { name: 'OneTrust GRC',     desc: 'Enterprise trust intelligence platform for privacy, risk, and compliance management', popular: true },
      { name: 'ServiceNow GRC',   desc: 'Enterprise-scale integrated risk and compliance management on the Now Platform', popular: false },
      { name: 'RSA Archer',       desc: 'Configurable enterprise GRC platform for risk, audit, and compliance workflows', popular: false },
      { name: 'MetricStream',     desc: 'AI-powered integrated GRC suite for policy, audit, and regulatory compliance', popular: false },
      { name: 'Hyperproof',       desc: 'Compliance operations platform with multi-framework evidence management', popular: false },
      { name: 'Tugboat Logic',    desc: 'Policy-first compliance automation platform for growing security teams', popular: false },
    ],
  },

  // ─── 2. Vulnerability Management ───────────────────────────────────────────
  {
    id: 'vulnerability',
    label: 'Vulnerability Management',
    shortLabel: 'Vuln Mgmt',
    icon: '🔍',
    color: '#ef4444',

    modules: [
      { name: 'Vulnerability Scanning',       desc: 'Authenticated network and agent-based scanning to discover security weaknesses' },
      { name: 'Patch Management',             desc: 'Systematic deployment and tracking of OS and application security patches' },
      { name: 'Penetration Testing',          desc: 'Authorized adversarial testing to validate real-world exploitability of findings' },
      { name: 'Attack Surface Management',    desc: 'Continuously discover and reduce externally exposed assets and services' },
      { name: 'Risk-Based Vulnerability Mgmt',desc: 'Prioritize remediation using CVSS, EPSS, and business asset criticality' },
      { name: 'Web Application Scanning',     desc: 'Dynamic scanning of running web applications for OWASP-class vulnerabilities' },
      { name: 'Cloud Vulnerability Assessment',desc: 'Identify misconfigurations and CVEs across cloud workloads and images' },
      { name: 'Bug Bounty Program',           desc: 'Crowdsourced vulnerability disclosure with structured researcher rewards' },
      { name: 'Red Team Operations',          desc: 'Objective-based adversary simulation to test detection and response capability' },
    ],

    tools: [
      { name: 'Tenable Nessus / Tenable.io', desc: 'Industry-standard vulnerability scanner with 80,000+ plugins and cloud management', popular: true },
      { name: 'Qualys VMDR',                 desc: 'Cloud-native vulnerability management, detection, and response platform', popular: true },
      { name: 'Rapid7 InsightVM',            desc: 'Risk-based vulnerability management with live dashboards and remediation projects', popular: true },
      { name: 'Microsoft Defender VAPT',     desc: 'Built-in vulnerability and misconfiguration assessment across the Defender suite', popular: false },
      { name: 'Wiz (Vuln & CSPM)',           desc: 'Agentless cloud vulnerability scanning across VMs, containers, and serverless', popular: true },
      { name: 'OpenVAS / Greenbone',         desc: 'Open-source vulnerability scanner with enterprise Greenbone Security Manager', popular: false },
      { name: 'Burp Suite Pro',              desc: 'Industry-standard web application security testing and proxy tool by PortSwigger', popular: true },
      { name: 'Metasploit Pro',              desc: 'Penetration testing framework for exploit validation and post-exploitation analysis', popular: false },
    ],
  },

  // ─── 3. Identity & Access Management ───────────────────────────────────────
  {
    id: 'iam',
    label: 'Identity & Access Management',
    shortLabel: 'IAM',
    icon: '🔑',
    color: '#f59e0b',

    modules: [
      { name: 'Multi-Factor Authentication (MFA)', desc: 'Require phishing-resistant second factors — TOTP, FIDO2, push — for all users' },
      { name: 'Single Sign-On (SSO)',              desc: 'Federated authentication via SAML 2.0 or OIDC across all enterprise applications' },
      { name: 'Privileged Access Management (PAM)',desc: 'Vault, rotate, and session-record privileged credentials and admin accounts' },
      { name: 'Zero Trust Identity',               desc: 'Continuous verification — never trust, always verify — for every access request' },
      { name: 'Identity Governance (IGA)',         desc: 'Lifecycle management, access certifications, and SoD enforcement for all identities' },
      { name: 'Just-In-Time (JIT) Access',         desc: 'Grant temporary elevated access on-demand and revoke automatically on expiry' },
      { name: 'Passwordless Authentication',       desc: 'Eliminate passwords via FIDO2 hardware keys, biometrics, or passkeys' },
      { name: 'Directory Services',                desc: 'Centralized identity store — Active Directory, LDAP, or cloud directory management' },
      { name: 'Access Recertification',            desc: 'Periodic manager review and approval of user access rights and entitlements' },
    ],

    tools: [
      { name: 'Okta',                        desc: 'Leading cloud identity platform for SSO, MFA, lifecycle management, and Universal Directory', popular: true },
      { name: 'Microsoft Entra ID',          desc: 'Azure AD — cloud identity, Conditional Access, and Privileged Identity Management', popular: true },
      { name: 'CyberArk PAM',               desc: 'Enterprise privileged access security — credential vault, session isolation, and threat analytics', popular: true },
      { name: 'BeyondTrust',                 desc: 'Privileged access management and remote access security with least-privilege enforcement', popular: false },
      { name: 'SailPoint IdentityNow',       desc: 'Cloud-based identity governance — access requests, certifications, and role management', popular: true },
      { name: 'Ping Identity',               desc: 'Enterprise identity security platform for SSO, MFA, and API access management', popular: false },
      { name: 'JumpCloud',                   desc: 'Open directory platform combining cloud LDAP, RADIUS, SSO, and MDM in one service', popular: false },
      { name: 'HashiCorp Vault',             desc: 'Secrets management platform for dynamic credentials, PKI, and encryption as a service', popular: false },
    ],
  },

  // ─── 4. Security Operations & Incident Response ────────────────────────────
  {
    id: 'secops',
    label: 'Security Operations & Incident Response',
    shortLabel: 'SecOps & IR',
    icon: '📡',
    color: '#3b82f6',

    modules: [
      { name: 'SIEM (Security Information & Event Mgmt)', desc: 'Aggregate, correlate, and alert on logs and events across the entire environment' },
      { name: 'SOAR (Security Orchestration & Automation)', desc: 'Automate repetitive triage and response playbooks to accelerate analyst workflows' },
      { name: 'SOC Program Management',    desc: 'Establish 24/7 monitoring, escalation tiers, and SOC maturity metrics' },
      { name: 'Incident Response Plan',    desc: 'Documented PICERL playbooks — Prepare, Identify, Contain, Eradicate, Recover, Lessons' },
      { name: 'Forensics & Investigations',desc: 'Chain-of-custody digital evidence collection, disk imaging, and memory analysis' },
      { name: 'Threat Hunting',            desc: 'Hypothesis-driven proactive search for adversaries living inside the environment' },
      { name: 'Log Management & Retention',desc: 'Centralize, index, and retain logs for compliance periods and forensic readiness' },
      { name: 'UEBA (User & Entity Behavior Analytics)', desc: 'Detect anomalous insider and compromised-account activity via behavioral baselines' },
      { name: 'Tabletop Exercises',        desc: 'Scenario-based IR simulation to test plans, roles, and communication under pressure' },
    ],

    tools: [
      { name: 'Splunk Enterprise Security', desc: 'Market-leading SIEM with SPL query language, notable-event framework, and SOAR integration', popular: true },
      { name: 'Microsoft Sentinel',         desc: 'Cloud-native SIEM/SOAR on Azure with AI-driven detection and built-in UEBA', popular: true },
      { name: 'IBM QRadar SIEM',            desc: 'Enterprise SIEM with network flow analysis, DLC, and AI-driven offense correlation', popular: false },
      { name: 'Elastic Security (SIEM)',    desc: 'Open-source SIEM built on ELK Stack with detection-as-code rule management', popular: true },
      { name: 'Exabeam Fusion SIEM',        desc: 'AI-driven SIEM combining UEBA, threat hunting, and automated playbooks', popular: false },
      { name: 'Palo Alto XSOAR',            desc: 'Enterprise SOAR platform with 700+ integrations and playbook automation', popular: true },
      { name: 'Wazuh',                      desc: 'Open-source SIEM and XDR combining HIDS, vulnerability detection, and log analysis', popular: false },
      { name: 'PagerDuty',                  desc: 'Incident management and on-call orchestration platform for SOC teams', popular: false },
    ],
  },

  // ─── 5. Endpoint Security ───────────────────────────────────────────────────
  {
    id: 'endpoint',
    label: 'Endpoint Security',
    shortLabel: 'Endpoint',
    icon: '💻',
    color: '#06b6d4',

    modules: [
      { name: 'EDR (Endpoint Detection & Response)', desc: 'Continuous endpoint telemetry with behavioral detection and one-click containment' },
      { name: 'XDR (Extended Detection & Response)', desc: 'Unified detection correlating endpoint, network, email, and cloud signals' },
      { name: 'NGAV (Next-Gen Antivirus)',            desc: 'ML-based malware prevention that does not rely solely on signature databases' },
      { name: 'MDM (Mobile Device Management)',       desc: 'Enroll, configure, and remotely wipe managed mobile and laptop endpoints' },
      { name: 'Endpoint Hardening & CIS Benchmarks', desc: 'Apply CIS or DISA STIG secure baselines to eliminate default misconfigurations' },
      { name: 'Application Whitelisting / Control',   desc: 'Allow only approved executables to run, blocking unknown and malicious code' },
      { name: 'Full Disk Encryption (FDE)',            desc: 'Encrypt endpoint drives with BitLocker, FileVault, or equivalent to protect data at rest' },
      { name: 'USB & Removable Media Control',        desc: 'Block, allow, or audit removable storage access on managed endpoints' },
    ],

    tools: [
      { name: 'CrowdStrike Falcon',              desc: 'AI-native cloud EDR/XDR platform with Threat Graph and 1-second telemetry visibility', popular: true },
      { name: 'SentinelOne Singularity',         desc: 'Autonomous EDR/XDR with AI-powered prevention, rollback, and storyline mapping', popular: true },
      { name: 'Microsoft Defender for Endpoint', desc: 'Built-in Windows EDR with threat analytics, ASR rules, and Entra ID integration', popular: true },
      { name: 'Palo Alto Cortex XDR',            desc: 'Extended detection and response platform correlating endpoint, network, and cloud', popular: false },
      { name: 'VMware Carbon Black',             desc: 'Behavioral EDR with streaming prevention and enterprise-grade threat hunting', popular: false },
      { name: 'Sophos Intercept X',              desc: 'Synchronized security EDR with deep learning malware detection and MTR service', popular: false },
      { name: 'Microsoft Intune',                desc: 'Cloud-based MDM and MAM for Windows, iOS, Android, and macOS device management', popular: true },
      { name: 'Jamf Pro',                        desc: 'Apple-first MDM and endpoint management for macOS, iOS, iPadOS, and tvOS fleets', popular: false },
    ],
  },

  // ─── 6. Network Security ────────────────────────────────────────────────────
  {
    id: 'network',
    label: 'Network Security',
    shortLabel: 'Network',
    icon: '🌐',
    color: '#0891b2',

    modules: [
      { name: 'Next-Generation Firewall (NGFW)',  desc: 'Layer-7 application-aware firewall with deep packet inspection and threat prevention' },
      { name: 'IDS / IPS',                        desc: 'Detect and inline-block network intrusion attempts using signature and anomaly rules' },
      { name: 'Network Segmentation & Microsegmentation', desc: 'Isolate workloads into security zones to limit lateral movement after compromise' },
      { name: 'ZTNA / Zero Trust Network Access', desc: 'Identity-aware, per-session access to applications without full network VPN exposure' },
      { name: 'DNS Security',                     desc: 'Block malware C2, phishing, and data exfiltration at the DNS resolution layer' },
      { name: 'NAC (Network Access Control)',      desc: 'Enforce device posture and identity before granting wired or wireless network access' },
      { name: 'SD-WAN Security',                  desc: 'Secure encrypted overlay WAN with integrated NGFW for branch office connectivity' },
      { name: 'Network Detection & Response (NDR)',desc: 'Detect encrypted threats and lateral movement using network flow and ML analysis' },
      { name: 'Email Security & Anti-Phishing',   desc: 'Gateway filtering, sandboxing, and impersonation protection for inbound email threats' },
    ],

    tools: [
      { name: 'Palo Alto Networks NGFW',   desc: 'Industry-leading NGFW with App-ID, User-ID, and WildFire threat prevention engine', popular: true },
      { name: 'Fortinet FortiGate',        desc: 'High-performance NGFW and SD-WAN with Security Processing Unit (SPU) acceleration', popular: true },
      { name: 'Cisco Secure Firewall',     desc: 'Adaptive security appliance (ASA) and Firepower NGFW with Talos threat intelligence', popular: false },
      { name: 'Check Point NGFW',          desc: 'Unified security management across NGFW, cloud, mobile, and endpoint gateways', popular: false },
      { name: 'Zscaler Internet Access',   desc: 'Cloud-native SSE proxy that routes all traffic through global threat inspection nodes', popular: true },
      { name: 'Darktrace',                 desc: 'AI-powered NDR using unsupervised machine learning to detect novel network threats', popular: true },
      { name: 'Cisco Umbrella (DNS)',       desc: 'Cloud-delivered DNS security and CASB that blocks threats before connection is made', popular: false },
      { name: 'Proofpoint Email Security', desc: 'Enterprise email security gateway with advanced malware analysis and BEC protection', popular: true },
    ],
  },

  // ─── 7. Cloud Security ──────────────────────────────────────────────────────
  {
    id: 'cloud',
    label: 'Cloud Security',
    shortLabel: 'Cloud',
    icon: '☁️',
    color: '#0ea5e9',

    modules: [
      { name: 'CSPM (Cloud Security Posture Mgmt)',  desc: 'Continuously detect and auto-remediate misconfigurations across AWS, Azure, GCP' },
      { name: 'CWPP (Cloud Workload Protection)',    desc: 'Runtime protection for VMs, containers, and serverless functions in cloud environments' },
      { name: 'CNAPP (Cloud-Native App Protection)', desc: 'Unified platform combining CSPM, CWPP, CIEM, and IaC scanning in one solution' },
      { name: 'CIEM (Cloud Infrastructure Entitlement Mgmt)', desc: 'Right-size overly permissive cloud IAM roles and enforce least privilege at scale' },
      { name: 'IaC Security Scanning',              desc: 'Scan Terraform, CloudFormation, and Bicep for security misconfigurations pre-deployment' },
      { name: 'Container & Kubernetes Security',    desc: 'Image scanning, runtime policy, and Kubernetes admission control for container security' },
      { name: 'CASB (Cloud Access Security Broker)', desc: 'Visibility and control for sanctioned and shadow SaaS application usage' },
      { name: 'Serverless Security',                desc: 'Protect AWS Lambda, Azure Functions, and GCP Cloud Run from injection and abuse' },
      { name: 'Multi-Cloud Governance',             desc: 'Unified compliance posture, tagging, and policy enforcement across hybrid clouds' },
    ],

    tools: [
      { name: 'Wiz',                              desc: 'Agentless CNAPP with graph-based risk engine across AWS, Azure, GCP, and OCI', popular: true },
      { name: 'Prisma Cloud (Palo Alto)',          desc: 'Full-lifecycle CNAPP — CSPM, CWPP, CIEM, IaC, and container security in one platform', popular: true },
      { name: 'Microsoft Defender for Cloud',     desc: 'Native Azure CSPM and CWPP with multi-cloud support and Secure Score dashboard', popular: true },
      { name: 'AWS Security Hub',                 desc: 'Centralized security posture and compliance findings aggregator for AWS accounts', popular: false },
      { name: 'Orca Security',                    desc: 'Agentless SideScanning technology for full-stack cloud risk visibility without agents', popular: false },
      { name: 'Lacework',                         desc: 'Cloud security platform with behavioral anomaly detection and compliance automation', popular: false },
      { name: 'Aqua Security',                    desc: 'Cloud-native security platform specializing in container and Kubernetes lifecycle security', popular: false },
      { name: 'Checkov / Bridgecrew',             desc: 'Open-source and commercial IaC static analysis for policy-as-code enforcement', popular: false },
    ],
  },

  // ─── 8. Application Security & DevSecOps ───────────────────────────────────
  {
    id: 'appsec',
    label: 'Application Security & DevSecOps',
    shortLabel: 'AppSec',
    icon: '🔧',
    color: '#6366f1',

    modules: [
      { name: 'SAST (Static Application Security Testing)', desc: 'Scan source code for security vulnerabilities without executing the application' },
      { name: 'DAST (Dynamic Application Security Testing)', desc: 'Test running web apps and APIs for real-world exploitable vulnerabilities' },
      { name: 'SCA (Software Composition Analysis)',         desc: 'Identify vulnerable open-source dependencies and license compliance issues' },
      { name: 'Secrets Management & Scanning',              desc: 'Detect and rotate hard-coded API keys, tokens, and credentials in codebases' },
      { name: 'OWASP Top 10 Controls',                      desc: 'Mitigate the ten most critical web application security risk categories' },
      { name: 'Web Application Firewall (WAF)',              desc: 'Layer-7 traffic filtering to block SQLi, XSS, and OWASP attacks in real time' },
      { name: 'API Security',                               desc: 'Authentication, rate limiting, and schema validation to protect REST and GraphQL APIs' },
      { name: 'Secure SDLC / DevSecOps Pipeline',           desc: 'Embed security gates into CI/CD — SAST, DAST, SCA, and secrets checks in pipelines' },
      { name: 'Container Image Security',                   desc: 'Scan Docker images for CVEs and enforce no-critical policy before registry push' },
      { name: 'Mobile Application Security (OWASP MASVS)',  desc: 'Apply OWASP Mobile Security Verification Standard to iOS and Android apps' },
    ],

    tools: [
      { name: 'Snyk',                       desc: 'Developer-first security platform for SCA, SAST, container, and IaC scanning', popular: true },
      { name: 'Checkmarx One',              desc: 'Enterprise AST platform combining SAST, DAST, SCA, and IAST in a unified portal', popular: true },
      { name: 'Veracode',                   desc: 'Cloud-based application security testing with SAST, DAST, SCA, and developer training', popular: true },
      { name: 'GitHub Advanced Security',   desc: 'Native GitHub SAST (CodeQL), secret scanning, and dependency review in pull requests', popular: true },
      { name: 'SonarQube',                  desc: 'Continuous code quality and SAST platform with 30+ language support and CI/CD gates', popular: false },
      { name: 'Burp Suite Enterprise',      desc: 'Automated DAST at scale for web applications with CI/CD integration and scanning APIs', popular: false },
      { name: 'HashiCorp Vault',            desc: 'Industry-standard secrets management for dynamic credentials, PKI, and encryption keys', popular: false },
      { name: 'Cloudflare WAF',             desc: 'Global WAF with OWASP ruleset, bot management, and DDoS mitigation at the edge', popular: true },
      { name: 'AWS WAF / Azure WAF',        desc: 'Native cloud WAF services integrated with CDN and application gateway services', popular: false },
    ],
  },

  // ─── 9. Data Protection & Privacy ──────────────────────────────────────────
  {
    id: 'data',
    label: 'Data Protection & Privacy',
    shortLabel: 'Data & Privacy',
    icon: '🔒',
    color: '#8b5cf6',

    modules: [
      { name: 'DLP (Data Loss Prevention)',         desc: 'Inspect and block unauthorized exfiltration of sensitive data across channels' },
      { name: 'Data Classification',                desc: 'Label and tag data by sensitivity — Public, Internal, Confidential, Restricted' },
      { name: 'Encryption at Rest & In Transit',    desc: 'AES-256 at rest and TLS 1.2+ in transit for all sensitive data stores and flows' },
      { name: 'GDPR Compliance Program',            desc: 'Lawful basis mapping, DPIA process, 72-hour breach notification, and DSR workflows' },
      { name: 'CCPA / CPRA',                        desc: 'California consumer privacy rights — opt-out, deletion, and data subject access requests' },
      { name: 'DPDP Act 2023 (India)',              desc: 'India digital personal data protection — consent, rights, and DPAB notification' },
      { name: 'Privacy by Design',                  desc: 'Embed data minimization, purpose limitation, and privacy controls from design phase' },
      { name: 'Database Activity Monitoring (DAM)', desc: 'Monitor and alert on privileged and anomalous database access in real time' },
      { name: 'Key Management Service (KMS)',       desc: 'Centralized cryptographic key lifecycle — generation, rotation, and destruction' },
    ],

    tools: [
      { name: 'Microsoft Purview (DLP)',    desc: 'Unified data governance and DLP for M365 apps, endpoints, and cloud repositories', popular: true },
      { name: 'Symantec DLP (Broadcom)',    desc: 'Enterprise DLP with endpoint, network, and cloud content inspection at scale', popular: false },
      { name: 'OneTrust Privacy Mgmt',      desc: 'Privacy management platform for consent, DSAR automation, and DPIA workflows', popular: true },
      { name: 'BigID',                      desc: 'AI-powered data discovery, classification, and privacy compliance across all data stores', popular: false },
      { name: 'Varonis',                    desc: 'Data security platform with file access governance, behavior analytics, and DLP', popular: true },
      { name: 'Imperva Data Security',      desc: 'Database activity monitoring, data masking, and classification for on-prem and cloud DBs', popular: false },
      { name: 'AWS KMS / Azure Key Vault',  desc: 'Native cloud key management services for encryption key lifecycle management', popular: false },
      { name: 'Spirion',                    desc: 'Data discovery and classification for structured and unstructured data across the enterprise', popular: false },
    ],
  },

  // ─── 10. Business Continuity & Resilience ──────────────────────────────────
  {
    id: 'bcdr',
    label: 'Business Continuity & Resilience',
    shortLabel: 'BC & DR',
    icon: '🔄',
    color: '#22c55e',

    modules: [
      { name: 'Business Continuity Planning (BCP)',  desc: 'Document and maintain plans to sustain critical operations during disruptions' },
      { name: 'Disaster Recovery (DRP)',             desc: 'IT recovery procedures with defined RTO and RPO targets for critical systems' },
      { name: 'ISO 22301 BCMS',                     desc: 'International standard for business continuity management system certification' },
      { name: 'Business Impact Analysis (BIA)',      desc: 'Quantify financial and operational impact of disruptions to prioritize recovery' },
      { name: 'Backup & Recovery Program',           desc: '3-2-1 backup strategy with regular restore testing and air-gapped offsite copies' },
      { name: 'Ransomware Recovery Playbook',        desc: 'Specific IR and recovery steps for ransomware — isolation, decryption, rebuild' },
      { name: 'Crisis Management & Communications',  desc: 'Executive decision-making, escalation trees, and external communications under crisis' },
      { name: 'Resilience Testing (Tabletop / DR)',  desc: 'Scheduled tabletop exercises and full DR failover tests to validate recovery capability' },
      { name: 'DORA Operational Resilience',         desc: 'EU financial-sector ICT resilience testing — TLPT, incident reporting, and continuity' },
    ],

    tools: [
      { name: 'Veeam Backup & Replication', desc: 'Enterprise backup, replication, and DR for virtual, physical, and cloud workloads', popular: true },
      { name: 'Zerto',                      desc: 'Continuous data protection and cloud DR with near-zero RPO for critical workloads', popular: false },
      { name: 'Commvault',                  desc: 'Enterprise data protection platform with backup, DR, and data management capabilities', popular: false },
      { name: 'Acronis Cyber Protect',      desc: 'Integrated backup and cybersecurity in one agent — anti-malware and backup combined', popular: false },
      { name: 'AWS Backup / Azure Backup',  desc: 'Native cloud backup services with centralized policy management and cross-region replication', popular: true },
      { name: 'Rubrik Security Cloud',      desc: 'Data resilience platform with ransomware recovery, threat hunting on backups, and DSPM', popular: true },
      { name: 'Cohesity DataProtect',       desc: 'Hyperconverged secondary storage for backup, DR, analytics, and ransomware protection', popular: false },
    ],
  },

  // ─── 11. Threat Intelligence & Hunting ─────────────────────────────────────
  {
    id: 'cti',
    label: 'Threat Intelligence & Hunting',
    shortLabel: 'Threat Intel',
    icon: '🕵️',
    color: '#84cc16',

    modules: [
      { name: 'Cyber Threat Intelligence (CTI)',  desc: 'Collect, analyze, and operationalize strategic and tactical threat intelligence' },
      { name: 'MITRE ATT&CK Framework',           desc: 'Map detections and hunts to adversary tactics, techniques, and procedures (TTPs)' },
      { name: 'Dark Web Monitoring',              desc: 'Monitor dark web forums and markets for leaked credentials and data exposures' },
      { name: 'IOC / IOA Feed Management',        desc: 'Ingest, enrich, and operationalize indicators of compromise and attack into defenses' },
      { name: 'Threat Hunting Program',           desc: 'Hypothesis-driven proactive search for adversaries not yet detected by alerts' },
      { name: 'Adversary Simulation (BAS)',       desc: 'Breach and attack simulation to validate control effectiveness against known TTPs' },
      { name: 'Brand Protection & Typosquatting', desc: 'Monitor phishing domains, spoofed certificates, and brand impersonation campaigns' },
      { name: 'Malware Analysis',                 desc: 'Static and dynamic reverse engineering of malware samples to extract indicators' },
      { name: 'ISAC / Intelligence Sharing',      desc: 'Participate in sector-specific ISACs to share and receive community threat intelligence' },
    ],

    tools: [
      { name: 'Recorded Future',            desc: 'Machine learning-driven threat intelligence across the open, dark, and technical web', popular: true },
      { name: 'Mandiant Threat Intelligence', desc: 'Front-line intelligence from Mandiant IR investigations — APT profiles and IOCs', popular: true },
      { name: 'CrowdStrike Intel (Falcon X)', desc: 'Automated malware analysis and adversary intelligence integrated with Falcon platform', popular: true },
      { name: 'ThreatConnect',               desc: 'Intelligence-driven security operations — TIP, SOAR, and risk quantification combined', popular: false },
      { name: 'Anomali ThreatStream',        desc: 'Threat intelligence management platform for ingesting, correlating, and actioning IOCs', popular: false },
      { name: 'MISP',                        desc: 'Open-source threat intelligence sharing platform widely used by CERTs and SOC teams', popular: false },
      { name: 'VirusTotal Enterprise',       desc: 'File, URL, IP, and domain reputation analysis using 70+ antivirus engine aggregation', popular: false },
      { name: 'Picus Security (BAS)',        desc: 'Breach and attack simulation platform that continuously validates security control gaps', popular: false },
    ],
  },

  // ─── 12. Third-Party & Vendor Risk ─────────────────────────────────────────
  {
    id: 'tprm',
    label: 'Third-Party & Vendor Risk',
    shortLabel: 'TPRM',
    icon: '🤝',
    color: '#f97316',

    modules: [
      { name: 'TPRM (Third-Party Risk Management)',  desc: 'End-to-end vendor risk lifecycle — onboarding, assessment, monitoring, and offboarding' },
      { name: 'Vendor Risk Assessment (VRA)',        desc: 'Structured questionnaire-based assessment of vendor security posture and controls' },
      { name: 'SIG Questionnaire (Shared Assessments)', desc: 'Standardized Information Gathering questionnaire used industry-wide for vendor reviews' },
      { name: 'Supply Chain Security',               desc: 'Identify and mitigate risks in software and hardware supply chains (SBOMs, SCRM)' },
      { name: 'Continuous Vendor Monitoring',        desc: 'Ongoing outside-in monitoring of vendor attack surface and security ratings' },
      { name: 'Fourth-Party Risk',                   desc: 'Identify and assess sub-processors and sub-vendors that your vendors depend on' },
      { name: 'Data Processing Agreements (DPAs)',   desc: 'Contractual GDPR/privacy obligations for vendors handling your personal data' },
      { name: 'Vendor Offboarding',                  desc: 'Ensure secure data return or deletion and access revocation when vendors exit' },
      { name: 'Concentration Risk Assessment',       desc: 'Identify over-reliance on single critical vendors and develop alternative sourcing plans' },
    ],

    tools: [
      { name: 'OneTrust Vendorpedia',     desc: 'Third-party risk management with pre-completed vendor profiles and assessment automation', popular: true },
      { name: 'BitSight',                 desc: 'Security ratings platform providing continuous outside-in vendor risk monitoring', popular: true },
      { name: 'SecurityScorecard',        desc: 'Vendor security ratings and supply chain risk management across 10 risk factor categories', popular: true },
      { name: 'ProcessUnity',             desc: 'Third-party risk management platform with automated workflow and reporting capabilities', popular: false },
      { name: 'CyberGRX',                desc: 'Exchange-based TPRM platform with shared assessments and live risk insights', popular: false },
      { name: 'RiskRecon (Mastercard)',   desc: 'Automated third-party cyber risk assessments derived from internet-facing data', popular: false },
      { name: 'Prevalent TPRM',          desc: 'Integrated third-party risk lifecycle platform with assessment, monitoring, and analytics', popular: false },
      { name: 'ServiceNow VRM',           desc: 'Vendor risk management module within ServiceNow GRC for enterprise TPRM workflows', popular: false },
    ],
  },
];

/**
 * Flat list of all modules across all domains.
 * Useful for filtering, search, and backward-compatibility with PERMISSION_TO_SECURITY_TOOL.
 */
export const ALL_DOMAIN_MODULES = SECURITY_DOMAINS.flatMap(domain =>
  domain.modules.map(m => ({ ...m, domainId: domain.id, domainLabel: domain.label, color: domain.color }))
);

/**
 * Flat list of all tools across all domains.
 */
export const ALL_DOMAIN_TOOLS = SECURITY_DOMAINS.flatMap(domain =>
  domain.tools.map(t => ({ ...t, domainId: domain.id, domainLabel: domain.label, color: domain.color }))
);

/**
 * Look up a domain by id.
 */
export function getDomainById(id) {
  return SECURITY_DOMAINS.find(d => d.id === id) || null;
}

/**
 * Map from old MASTER_LIBRARY category ids to new domain ids.
 * Enables progressive migration without breaking existing saved user data.
 */
export const LEGACY_CATEGORY_TO_DOMAIN = {
  audit:       'grc',
  frameworks:  'grc',
  tools:       'secops',
  privacy:     'data',
  cloud:       'cloud',
  risk:        'grc',
  governance:  'grc',
  bcdr:        'bcdr',
  iam:         'iam',
  devsecops:   'appsec',
  appsec:      'appsec',
  threat:      'cti',
  ot:          'network',
  ai:          'grc',
  vendor:      'tprm',
  industry:    'grc',
  regional:    'grc',
  financial:   'grc',
  healthcare:  'grc',
  govdef:      'grc',
};

/**
 * Recommended related domains for each domain.
 * Used to show "You may also need…" suggestions during onboarding.
 */
export const DOMAIN_RECOMMENDATIONS = {
  grc:          ['vulnerability', 'iam', 'data', 'tprm'],
  vulnerability:['endpoint', 'secops', 'cloud', 'appsec'],
  iam:          ['endpoint', 'network', 'secops', 'data'],
  secops:       ['cti', 'vulnerability', 'endpoint', 'network'],
  endpoint:     ['iam', 'vulnerability', 'secops', 'network'],
  network:      ['cloud', 'iam', 'secops', 'cti'],
  cloud:        ['appsec', 'iam', 'vulnerability', 'data'],
  appsec:       ['cloud', 'vulnerability', 'data', 'secops'],
  data:         ['grc', 'iam', 'cloud', 'tprm'],
  bcdr:         ['grc', 'secops', 'cloud', 'cti'],
  cti:          ['secops', 'vulnerability', 'endpoint', 'tprm'],
  tprm:         ['grc', 'data', 'cti', 'cloud'],
};
