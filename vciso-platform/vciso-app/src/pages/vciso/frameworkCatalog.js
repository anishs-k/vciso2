// frameworkCatalog.js
// Controls catalog per compliance framework

export const FRAMEWORK_CATALOG = {
  'soc-2-type-i': {
    name: 'SOC 2 Type I',
    shortName: 'SOC 2 I',
    icon: '📋',
    domains: [
      {
        name: 'CC1 - Control Environment',
        controls: [
          { id: 'CC1.1', name: 'COSO Principle 1', desc: 'Commitment to integrity and ethical values.' },
          { id: 'CC1.2', name: 'COSO Principle 2', desc: 'Board exercises oversight responsibility.' },
          { id: 'CC1.3', name: 'COSO Principle 3', desc: 'Organizational structure and reporting lines established.' },
          { id: 'CC1.4', name: 'COSO Principle 4', desc: 'Competence of personnel demonstrated and maintained.' },
          { id: 'CC1.5', name: 'COSO Principle 5', desc: 'Accountability for internal control responsibilities enforced.' },
        ],
      },
      {
        name: 'CC2 - Communication & Information',
        controls: [
          { id: 'CC2.1', name: 'COSO Principle 13', desc: 'Information system supports achievement of objectives.' },
          { id: 'CC2.2', name: 'COSO Principle 14', desc: 'Internal communication of information across the organization.' },
          { id: 'CC2.3', name: 'COSO Principle 15', desc: 'External communication of information to relevant parties.' },
        ],
      },
      {
        name: 'CC3 - Risk Assessment',
        controls: [
          { id: 'CC3.1', name: 'COSO Principle 6', desc: 'Specifies suitable objectives to enable risk identification and assessment.' },
          { id: 'CC3.2', name: 'COSO Principle 7', desc: 'Identifies and analyzes risk to achievement of objectives.' },
          { id: 'CC3.3', name: 'COSO Principle 8', desc: 'Considers fraud potential in risk assessment.' },
          { id: 'CC3.4', name: 'COSO Principle 9', desc: 'Identifies and assesses changes that could affect internal control.' },
        ],
      },
      {
        name: 'CC4 - Monitoring Activities',
        controls: [
          { id: 'CC4.1', name: 'COSO Principle 16', desc: 'Conducts ongoing and separate evaluations of internal controls.' },
          { id: 'CC4.2', name: 'COSO Principle 17', desc: 'Evaluates and communicates internal control deficiencies.' },
        ],
      },
      {
        name: 'CC5 - Control Activities',
        controls: [
          { id: 'CC5.1', name: 'COSO Principle 10', desc: 'Selects and develops control activities that mitigate risks.' },
          { id: 'CC5.2', name: 'COSO Principle 11', desc: 'Selects and develops general controls over technology.' },
          { id: 'CC5.3', name: 'COSO Principle 12', desc: 'Deploys control activities through policies and procedures.' },
        ],
      },
      {
        name: 'CC6 - Logical and Physical Access',
        controls: [
          { id: 'CC6.1', name: 'Logical Access Architecture', desc: 'Logical access security software, infrastructure, and architectures are implemented.' },
          { id: 'CC6.2', name: 'User Registration and Authorization', desc: 'Registration and authorization of new users to access the system.' },
          { id: 'CC6.3', name: 'Role-Based Access Controls', desc: 'Role-based access controls limit user access to authorized functions and data.' },
          { id: 'CC6.4', name: 'Access Credentials Management', desc: 'Access credentials management including MFA and password policies.' },
          { id: 'CC6.5', name: 'Access Removal on Termination', desc: 'Logical access is removed upon employee or contractor termination.' },
          { id: 'CC6.6', name: 'External-Facing Component Security', desc: 'Logical access security for external-facing components is implemented.' },
          { id: 'CC6.7', name: 'Data Transmission Controls', desc: 'Transmission and movement of data is restricted and encrypted.' },
          { id: 'CC6.8', name: 'Malware Prevention', desc: 'Malware and unauthorized software prevention controls are in place.' },
        ],
      },
      {
        name: 'CC7 - System Operations',
        controls: [
          { id: 'CC7.1', name: 'Vulnerability Management', desc: 'Vulnerability management and monitoring processes are implemented.' },
          { id: 'CC7.2', name: 'Anomaly and Event Detection', desc: 'Anomalies and security events are detected and assessed.' },
          { id: 'CC7.3', name: 'Incident Evaluation and Response', desc: 'Security incidents are evaluated and responded to per defined procedures.' },
          { id: 'CC7.4', name: 'Incident Containment', desc: 'Incident containment and remediation procedures are executed.' },
          { id: 'CC7.5', name: 'Incident Recovery', desc: 'Recovery and return to normal operations are performed after incidents.' },
        ],
      },
      {
        name: 'CC8 - Change Management',
        controls: [
          { id: 'CC8.1', name: 'Change Management Process', desc: 'Change management processes for infrastructure, software, and data are implemented.' },
        ],
      },
      {
        name: 'CC9 - Risk Mitigation',
        controls: [
          { id: 'CC9.1', name: 'Risk Mitigation Strategies', desc: 'Risk mitigation strategies are identified and applied.' },
          { id: 'CC9.2', name: 'Vendor and Third-Party Risk Management', desc: 'Vendor and third-party risk management processes are established.' },
        ],
      },
      {
        name: 'A1 - Availability',
        controls: [
          { id: 'A1.1', name: 'Capacity Management', desc: 'Current processing capacity and availability are managed and monitored.' },
          { id: 'A1.2', name: 'Environmental Protections', desc: 'Environmental protections, UPS, and power redundancy are in place.' },
          { id: 'A1.3', name: 'Recovery Procedures', desc: 'Recovery and business continuity procedures are documented and tested.' },
        ],
      },
      {
        name: 'C1 - Confidentiality',
        controls: [
          { id: 'C1.1', name: 'Confidential Information Identification', desc: 'Confidential information is identified, classified, and maintained.' },
          { id: 'C1.2', name: 'Confidential Data Disposal', desc: 'Confidential information is securely disposed of when no longer required.' },
        ],
      },
    ],
  },

  'soc-2-type-ii': {
    name: 'SOC 2 Type II',
    shortName: 'SOC 2 II',
    icon: '📋',
    domains: [
      {
        name: 'CC1 - Control Environment',
        controls: [
          { id: 'CC1.1', name: 'COSO Principle 1', desc: 'Commitment to integrity and ethical values.' },
          { id: 'CC1.2', name: 'COSO Principle 2', desc: 'Board exercises oversight responsibility.' },
          { id: 'CC1.3', name: 'COSO Principle 3', desc: 'Organizational structure and reporting lines established.' },
          { id: 'CC1.4', name: 'COSO Principle 4', desc: 'Competence of personnel demonstrated and maintained.' },
          { id: 'CC1.5', name: 'COSO Principle 5', desc: 'Accountability for internal control responsibilities enforced.' },
        ],
      },
      {
        name: 'CC2 - Communication & Information',
        controls: [
          { id: 'CC2.1', name: 'COSO Principle 13', desc: 'Information system supports achievement of objectives.' },
          { id: 'CC2.2', name: 'COSO Principle 14', desc: 'Internal communication of information across the organization.' },
          { id: 'CC2.3', name: 'COSO Principle 15', desc: 'External communication of information to relevant parties.' },
        ],
      },
      {
        name: 'CC3 - Risk Assessment',
        controls: [
          { id: 'CC3.1', name: 'COSO Principle 6', desc: 'Specifies suitable objectives to enable risk identification and assessment.' },
          { id: 'CC3.2', name: 'COSO Principle 7', desc: 'Identifies and analyzes risk to achievement of objectives.' },
          { id: 'CC3.3', name: 'COSO Principle 8', desc: 'Considers fraud potential in risk assessment.' },
          { id: 'CC3.4', name: 'COSO Principle 9', desc: 'Identifies and assesses changes that could affect internal control.' },
        ],
      },
      {
        name: 'CC4 - Monitoring Activities',
        controls: [
          { id: 'CC4.1', name: 'COSO Principle 16', desc: 'Conducts ongoing and separate evaluations of internal controls.' },
          { id: 'CC4.2', name: 'COSO Principle 17', desc: 'Evaluates and communicates internal control deficiencies.' },
        ],
      },
      {
        name: 'CC5 - Control Activities',
        controls: [
          { id: 'CC5.1', name: 'COSO Principle 10', desc: 'Selects and develops control activities that mitigate risks.' },
          { id: 'CC5.2', name: 'COSO Principle 11', desc: 'Selects and develops general controls over technology.' },
          { id: 'CC5.3', name: 'COSO Principle 12', desc: 'Deploys control activities through policies and procedures.' },
        ],
      },
      {
        name: 'CC6 - Logical and Physical Access',
        controls: [
          { id: 'CC6.1', name: 'Logical Access Architecture', desc: 'Logical access security software, infrastructure, and architectures are implemented.' },
          { id: 'CC6.2', name: 'User Registration and Authorization', desc: 'Registration and authorization of new users to access the system.' },
          { id: 'CC6.3', name: 'Role-Based Access Controls', desc: 'Role-based access controls limit user access to authorized functions and data.' },
          { id: 'CC6.4', name: 'Access Credentials Management', desc: 'Access credentials management including MFA and password policies.' },
          { id: 'CC6.5', name: 'Access Removal on Termination', desc: 'Logical access is removed upon employee or contractor termination.' },
          { id: 'CC6.6', name: 'External-Facing Component Security', desc: 'Logical access security for external-facing components is implemented.' },
          { id: 'CC6.7', name: 'Data Transmission Controls', desc: 'Transmission and movement of data is restricted and encrypted.' },
          { id: 'CC6.8', name: 'Malware Prevention', desc: 'Malware and unauthorized software prevention controls are in place.' },
        ],
      },
      {
        name: 'CC7 - System Operations',
        controls: [
          { id: 'CC7.1', name: 'Vulnerability Management', desc: 'Vulnerability management and monitoring processes are implemented.' },
          { id: 'CC7.2', name: 'Anomaly and Event Detection', desc: 'Anomalies and security events are detected and assessed.' },
          { id: 'CC7.3', name: 'Incident Evaluation and Response', desc: 'Security incidents are evaluated and responded to per defined procedures.' },
          { id: 'CC7.4', name: 'Incident Containment', desc: 'Incident containment and remediation procedures are executed.' },
          { id: 'CC7.5', name: 'Incident Recovery', desc: 'Recovery and return to normal operations are performed after incidents.' },
        ],
      },
      {
        name: 'CC8 - Change Management',
        controls: [
          { id: 'CC8.1', name: 'Change Management Process', desc: 'Change management processes for infrastructure, software, and data are implemented.' },
        ],
      },
      {
        name: 'CC9 - Risk Mitigation',
        controls: [
          { id: 'CC9.1', name: 'Risk Mitigation Strategies', desc: 'Risk mitigation strategies are identified and applied.' },
          { id: 'CC9.2', name: 'Vendor and Third-Party Risk Management', desc: 'Vendor and third-party risk management processes are established.' },
        ],
      },
      {
        name: 'A1 - Availability',
        controls: [
          { id: 'A1.1', name: 'Capacity Management', desc: 'Current processing capacity and availability are managed and monitored.' },
          { id: 'A1.2', name: 'Environmental Protections', desc: 'Environmental protections, UPS, and power redundancy are in place.' },
          { id: 'A1.3', name: 'Recovery Procedures', desc: 'Recovery and business continuity procedures are documented and tested.' },
        ],
      },
      {
        name: 'C1 - Confidentiality',
        controls: [
          { id: 'C1.1', name: 'Confidential Information Identification', desc: 'Confidential information is identified, classified, and maintained.' },
          { id: 'C1.2', name: 'Confidential Data Disposal', desc: 'Confidential information is securely disposed of when no longer required.' },
        ],
      },
    ],
  },

  'soc-1': {
    name: 'SOC 1',
    shortName: 'SOC 1',
    icon: '📋',
    domains: [
      {
        name: 'Control Environment',
        controls: [
          { id: 'CE.1', name: 'Integrity and Ethical Values', desc: 'Management demonstrates commitment to integrity and ethical values.' },
          { id: 'CE.2', name: 'Board Oversight', desc: 'Board of directors demonstrates independence and oversees financial reporting controls.' },
          { id: 'CE.3', name: 'Organizational Structure', desc: 'Organizational structure, reporting lines, and authorities defined for financial reporting.' },
          { id: 'CE.4', name: 'Human Resources Policies', desc: 'Policies for hiring, training, and evaluating personnel relevant to financial reporting.' },
          { id: 'CE.5', name: 'Accountability', desc: 'Management holds individuals accountable for internal control responsibilities.' },
        ],
      },
      {
        name: 'Risk Assessment',
        controls: [
          { id: 'RA.1', name: 'Financial Reporting Objectives', desc: 'Organization specifies financial reporting objectives with sufficient clarity.' },
          { id: 'RA.2', name: 'Risk Identification', desc: 'Risks to financial reporting objectives are identified and analyzed.' },
          { id: 'RA.3', name: 'Fraud Risk Assessment', desc: 'Fraud risk in financial reporting is assessed and addressed.' },
          { id: 'RA.4', name: 'Change Assessment', desc: 'Changes affecting financial reporting controls are identified and managed.' },
        ],
      },
      {
        name: 'Control Activities',
        controls: [
          { id: 'CA.1', name: 'Control Selection', desc: 'Control activities to mitigate financial reporting risks are selected and developed.' },
          { id: 'CA.2', name: 'Technology Controls', desc: 'General controls over technology supporting financial reporting are established.' },
          { id: 'CA.3', name: 'Policies and Procedures', desc: 'Control activities are deployed through policies and procedures over financial processes.' },
        ],
      },
      {
        name: 'IT General Controls',
        controls: [
          { id: 'ITGC.1', name: 'Logical Access - User Provisioning', desc: 'User access to financial systems is provisioned based on least privilege.' },
          { id: 'ITGC.2', name: 'Logical Access - Privileged Access', desc: 'Privileged access to financial applications and databases is restricted and monitored.' },
          { id: 'ITGC.3', name: 'Change Management', desc: 'Program changes are tested, approved, and managed prior to deployment.' },
          { id: 'ITGC.4', name: 'Segregation of Duties', desc: 'Incompatible duties within financial systems are separated.' },
          { id: 'ITGC.5', name: 'Computer Operations', desc: 'Job scheduling and batch processing for financial reporting are controlled.' },
          { id: 'ITGC.6', name: 'Incident Management', desc: 'IT incidents impacting financial processing are tracked and resolved.' },
        ],
      },
      {
        name: 'Monitoring',
        controls: [
          { id: 'MO.1', name: 'Ongoing Monitoring', desc: 'Ongoing monitoring of financial reporting controls is performed.' },
          { id: 'MO.2', name: 'Deficiency Reporting', desc: 'Control deficiencies are identified and communicated to management.' },
        ],
      },
    ],
  },

  'iso-27001': {
    name: 'ISO 27001:2022',
    shortName: 'ISO 27001',
    icon: '🌐',
    domains: [
      {
        name: 'Clause 4 - Context of the Organization',
        controls: [
          { id: '4.1', name: 'Understanding the Organization and its Context', desc: 'Determine external and internal issues relevant to purpose and affecting ISMS outcomes.' },
          { id: '4.2', name: 'Needs & Expectations of Interested Parties', desc: 'Determine interested parties relevant to the ISMS and their requirements.' },
          { id: '4.3', name: 'Determining ISMS Scope', desc: 'Determine boundaries and applicability of the ISMS to establish its scope.' },
          { id: '4.4', name: 'Information Security Management System', desc: 'Establish, implement, maintain and continually improve an ISMS.' },
        ],
      },
      {
        name: 'Clause 5 - Leadership',
        controls: [
          { id: '5.1', name: 'Leadership & Commitment', desc: 'Top management shall demonstrate leadership and commitment with respect to the ISMS.' },
          { id: '5.2', name: 'Information Security Policy', desc: 'Top management shall establish an information security policy.' },
          { id: '5.3', name: 'Organizational Roles & Responsibilities', desc: 'Ensure responsibilities and authorities for security roles are assigned and communicated.' },
        ],
      },
      {
        name: 'Clause 6 - Planning',
        controls: [
          { id: '6.1.1', name: 'Risk Management Process', desc: 'Specify risk management methodology to address risks and opportunities.' },
          { id: '6.1.2', name: 'Information Security Risk Assessment', desc: 'Define and apply an information security risk assessment process.' },
          { id: '6.1.3', name: 'Risk Treatment Process', desc: 'Define and apply an information security risk treatment process.' },
          { id: '6.1.3(d)', name: 'Statement of Applicability (SoA)', desc: 'Produce a Statement of Applicability containing necessary controls and justification.' },
          { id: '6.2', name: 'Information Security Objectives', desc: 'Establish measurable information security objectives at relevant functions and levels.' },
          { id: '6.3', name: 'Planning Changes', desc: 'Determine requirements for changes to the ISMS and execute in a planned manner.' },
        ],
      },
      {
        name: 'Clause 7 - Support',
        controls: [
          { id: '7.1', name: 'Resources', desc: 'Determine and provide resources needed for establishment and improvement of ISMS.' },
          { id: '7.2', name: 'Competence', desc: 'Determine necessary competence of persons doing work affecting security performance.' },
          { id: '7.3', name: 'Awareness', desc: 'Ensure personnel are aware of security policy and their contribution to ISMS.' },
          { id: '7.4', name: 'Communication', desc: 'Determine internal and external communications relevant to the ISMS.' },
          { id: '7.5', name: 'Documented Information', desc: 'Control documented information required by the ISMS and ISO 27001 standard.' },
        ],
      },
      {
        name: 'Clause 8 - Operation',
        controls: [
          { id: '8.1', name: 'Operational Planning & Control', desc: 'Plan, implement and control processes needed to meet security requirements.' },
          { id: '8.2', name: 'Risk Assessment Execution', desc: 'Perform information security risk assessments at planned intervals.' },
          { id: '8.3', name: 'Risk Treatment Execution', desc: 'Implement the information security risk treatment plan.' },
        ],
      },
      {
        name: 'Clause 9 - Performance Evaluation',
        controls: [
          { id: '9.1', name: 'Monitoring, Measurement, Analysis & Evaluation', desc: 'Evaluate security performance and effectiveness of the ISMS.' },
          { id: '9.2', name: 'Internal Audit', desc: 'Conduct internal audits at planned intervals to verify ISMS conformity.' },
          { id: '9.3', name: 'Management Review', desc: 'Top management shall review organizational ISMS at planned intervals.' },
        ],
      },
      {
        name: 'Clause 10 - Improvement',
        controls: [
          { id: '10.1', name: 'Continual Improvement', desc: 'Continually improve the suitability, adequacy and effectiveness of the ISMS.' },
          { id: '10.2', name: 'Nonconformity & Corrective Action', desc: 'React to nonconformities and implement corrective actions.' },
        ],
      },
      {
        name: 'A.5 - Organizational Controls',
        controls: [
          { id: 'A.5.1', name: 'Policies for Information Security', desc: 'Information security policies are defined, approved by management, published, and reviewed regularly.' },
          { id: 'A.5.2', name: 'Information Security Roles and Responsibilities', desc: 'All information security roles and responsibilities are defined and allocated.' },
          { id: 'A.5.3', name: 'Segregation of Duties', desc: 'Conflicting duties and areas of responsibility are segregated to reduce unauthorized access.' },
          { id: 'A.5.4', name: 'Management Responsibilities', desc: 'Management requires all personnel to apply information security in accordance with policies.' },
          { id: 'A.5.5', name: 'Contact with Authorities', desc: 'Maintain contact with relevant authorities.' },
          { id: 'A.5.6', name: 'Contact with Special Interest Groups', desc: 'Maintain contact with special interest groups and professional security associations.' },
          { id: 'A.5.7', name: 'Threat Intelligence', desc: 'Information relating to information security threats is collected, analyzed, and used.' },
          { id: 'A.5.8', name: 'Information Security in Project Management', desc: 'Information security is integrated into project management.' },
          { id: 'A.5.9', name: 'Inventory of Information and Other Associated Assets', desc: 'An inventory of information and other associated assets, including owners, is maintained.' },
          { id: 'A.5.10', name: 'Acceptable Use of Information and Other Associated Assets', desc: 'Rules for acceptable use of assets and handling procedures are defined and implemented.' },
          { id: 'A.5.11', name: 'Return of Assets', desc: 'Personnel return all organization assets upon change or termination of employment.' },
          { id: 'A.5.12', name: 'Classification of Information', desc: 'Information is classified according to organizational security requirements.' },
          { id: 'A.5.13', name: 'Labeling of Information', desc: 'Procedures for information labeling are developed and implemented.' },
          { id: 'A.5.14', name: 'Information Transfer', desc: 'Information transfer rules, procedures, and controls are in place for all transfer types.' },
          { id: 'A.5.15', name: 'Access Control Policy', desc: 'Rules for physical and logical access to information and assets are established and documented.' },
          { id: 'A.5.16', name: 'Identity Management', desc: 'Full lifecycle of identities is managed including provisioning and de-provisioning.' },
          { id: 'A.5.17', name: 'Authentication Information', desc: 'Allocation and management of authentication information is controlled.' },
          { id: 'A.5.18', name: 'Access Rights', desc: 'Access rights to information and assets are provisioned, reviewed, and revoked.' },
          { id: 'A.5.19', name: 'Information Security in Supplier Relationships', desc: 'Manage information security risks associated with supplier products or services.' },
          { id: 'A.5.20', name: 'Addressing Information Security Within Supplier Agreements', desc: 'Establish and agree on security requirements with each supplier.' },
          { id: 'A.5.21', name: 'Managing Information Security in the ICT Supply Chain', desc: 'Manage information security risks associated with the ICT supply chain.' },
          { id: 'A.5.22', name: 'Monitoring, Review and Change Management of Supplier Services', desc: 'Regularly monitor, review, and evaluate supplier security performance.' },
          { id: 'A.5.23', name: 'Cloud Services Security', desc: 'Processes for acquisition, use, management, and exit from cloud services are established.' },
          { id: 'A.5.24', name: 'Information Security Incident Management Planning and Preparation', desc: 'Plan and prepare for managing security incidents by establishing incident processes.' },
          { id: 'A.5.25', name: 'Assessment and Decision on Information Security Events', desc: 'Assess security events and decide if they should be categorized as incidents.' },
          { id: 'A.5.26', name: 'Response to Information Security Incidents', desc: 'Respond to security incidents in accordance with documented procedures.' },
          { id: 'A.5.27', name: 'Learning From Information Security Incidents', desc: 'Knowledge gained from incidents is used to strengthen security controls.' },
          { id: 'A.5.28', name: 'Collection of Evidence', desc: 'Procedures for identification, collection, and preservation of digital evidence.' },
          { id: 'A.5.29', name: 'Information Security During Disruption', desc: 'Plan how to maintain information security at appropriate levels during disruption.' },
          { id: 'A.5.30', name: 'ICT Readiness for Business Continuity', desc: 'ICT readiness is planned, implemented, maintained, and tested for continuity.' },
          { id: 'A.5.31', name: 'Legal, Statutory, Regulatory and Contractual Requirements', desc: 'Legal and regulatory security requirements are identified, documented, and updated.' },
          { id: 'A.5.32', name: 'Intellectual Property Rights', desc: 'Implement appropriate procedures to protect intellectual property rights.' },
          { id: 'A.5.33', name: 'Protection of Records', desc: 'Records are protected from loss, destruction, unauthorized access, and release.' },
          { id: 'A.5.34', name: 'Privacy and Protection of PII', desc: 'Preserve privacy and protection of Personally Identifiable Information (PII).' },
          { id: 'A.5.35', name: 'Independent Review of Information Security', desc: 'Security management approach and implementation are reviewed independently.' },
          { id: 'A.5.36', name: 'Compliance with Policies, Rules and Standards for Information Security', desc: 'Managers regularly review compliance within their operational areas.' },
          { id: 'A.5.37', name: 'Documented Operating Procedures', desc: 'Operating procedures for information processing facilities are documented.' },
        ],
      },
      {
        name: 'A.6 - People Controls',
        controls: [
          { id: 'A.6.1', name: 'Screening', desc: 'Background verification checks on all candidates for employment are carried out.' },
          { id: 'A.6.2', name: 'Terms and Conditions of Employment', desc: 'Employment contracts include security responsibilities for employees and contractors.' },
          { id: 'A.6.3', name: 'Security Awareness, Education and Training', desc: 'All personnel receive appropriate security awareness education and regular training.' },
          { id: 'A.6.4', name: 'Disciplinary Process', desc: 'A disciplinary process exists and is communicated to address information security violations.' },
          { id: 'A.6.5', name: 'Responsibilities After Termination', desc: 'Security responsibilities and obligations remain in force after termination or change of employment.' },
          { id: 'A.6.6', name: 'Confidentiality or Non-Disclosure Agreements', desc: 'Confidentiality or non-disclosure agreements reflecting protection needs are documented and signed.' },
          { id: 'A.6.7', name: 'Remote Working', desc: 'Security measures are implemented when personnel work remotely to protect information.' },
          { id: 'A.6.8', name: 'Information Security Event Reporting', desc: 'Provide mechanisms for personnel to report observed or suspected security events.' },
        ],
      },
      {
        name: 'A.7 - Physical Controls',
        controls: [
          { id: 'A.7.1', name: 'Physical Security Perimeters', desc: 'Security perimeters are defined and used to protect areas containing sensitive information.' },
          { id: 'A.7.2', name: 'Physical Entry Controls', desc: 'Secure areas are protected by appropriate entry controls to ensure only authorized access.' },
          { id: 'A.7.3', name: 'Securing Offices, Rooms and Facilities', desc: 'Physical security for offices, rooms, and facilities is designed and implemented.' },
          { id: 'A.7.4', name: 'Physical Security Monitoring', desc: 'Premises are continuously monitored for unauthorized physical access.' },
          { id: 'A.7.5', name: 'Protecting Against Physical and Environmental Threats', desc: 'Protection against natural disasters and physical threats is implemented.' },
          { id: 'A.7.6', name: 'Working in Secure Areas', desc: 'Security measures for working in secure areas are designed and implemented.' },
          { id: 'A.7.7', name: 'Clear Desk and Clear Screen', desc: 'Clear desk policy for papers and removable storage, and clear screen policy for IT facilities.' },
          { id: 'A.7.8', name: 'Equipment Siting and Protection', desc: 'Equipment is sited securely and protected to reduce environmental threats and hazards.' },
          { id: 'A.7.9', name: 'Security of Assets Off-Premises', desc: 'Off-site assets are protected based on risk assessment.' },
          { id: 'A.7.10', name: 'Storage Media Management', desc: 'Storage media is managed through its lifecycle including disposal and re-use.' },
          { id: 'A.7.11', name: 'Supporting Utilities', desc: 'Facilities are protected from power failures and disruptions in supporting utilities.' },
          { id: 'A.7.12', name: 'Cabling Security', desc: 'Power and data cables are protected from interception, interference, or damage.' },
          { id: 'A.7.13', name: 'Equipment Maintenance', desc: 'Equipment is correctly maintained to ensure continued availability and integrity.' },
          { id: 'A.7.14', name: 'Secure Disposal or Re-use of Equipment', desc: 'Verify that sensitive data and licensed software are removed prior to equipment disposal.' },
        ],
      },
      {
        name: 'A.8 - Technological Controls',
        controls: [
          { id: 'A.8.1', name: 'User Endpoint Devices', desc: 'Information stored on, processed by, or accessible via user endpoint devices is protected.' },
          { id: 'A.8.2', name: 'Privileged Access Rights', desc: 'Privileged access rights are restricted, managed, and reviewed.' },
          { id: 'A.8.3', name: 'Information Access Restriction', desc: 'Access to information and application system functions is restricted per access control policy.' },
          { id: 'A.8.4', name: 'Access to Source Code', desc: 'Read and write access to source code, development tools, and libraries is appropriately managed.' },
          { id: 'A.8.5', name: 'Secure Authentication', desc: 'Secure authentication technologies and procedures are implemented based on information access restrictions.' },
          { id: 'A.8.6', name: 'Capacity Management', desc: 'Resource usage is monitored and adjusted to meet capacity and performance requirements.' },
          { id: 'A.8.7', name: 'Protection Against Malware', desc: 'Protection against malware is implemented and supported by user awareness.' },
          { id: 'A.8.8', name: 'Management of Technical Vulnerabilities', desc: 'Information about technical vulnerabilities is obtained and appropriate action is taken.' },
          { id: 'A.8.9', name: 'Configuration Management', desc: 'Configurations including security configurations of hardware, software, and networks are established.' },
          { id: 'A.8.10', name: 'Information Deletion', desc: 'Information stored in systems, devices, or media is deleted when no longer required.' },
          { id: 'A.8.11', name: 'Data Masking', desc: 'Data masking is used in accordance with the organization access control policy.' },
          { id: 'A.8.12', name: 'Data Leakage Prevention', desc: 'Data leakage prevention measures are applied to systems and networks processing sensitive information.' },
          { id: 'A.8.13', name: 'Information Backup', desc: 'Backup copies of information, software, and images are taken and tested regularly.' },
          { id: 'A.8.14', name: 'Redundancy of Information Processing Facilities', desc: 'Information processing facilities are implemented with sufficient redundancy.' },
          { id: 'A.8.15', name: 'Logging and Monitoring', desc: 'Logs recording activities, exceptions, and information security events are produced, stored, and reviewed.' },
          { id: 'A.8.16', name: 'Network Monitoring', desc: 'Networks are monitored to detect potential security events.' },
          { id: 'A.8.17', name: 'Clock Synchronization', desc: 'System clocks across the domain are synchronized to approved time sources.' },
          { id: 'A.8.18', name: 'Use of Privileged Utility Programs', desc: 'Use of utility programs capable of overriding controls is restricted and tightly controlled.' },
          { id: 'A.8.19', name: 'Installation of Software on Operational Systems', desc: 'Procedures to securely manage software installation on operational systems are implemented.' },
          { id: 'A.8.20', name: 'Networks Security', desc: 'Networks and network devices are secured, managed, and controlled to protect information.' },
          { id: 'A.8.21', name: 'Security of Network Services', desc: 'Security mechanisms and service levels of network services are identified and implemented.' },
          { id: 'A.8.22', name: 'Segregation of Networks', desc: 'Groups of information services, users, and systems are segregated in networks.' },
          { id: 'A.8.23', name: 'Web Filtering', desc: 'Access to external websites is managed to reduce exposure to malicious content.' },
          { id: 'A.8.24', name: 'Use of Cryptography', desc: 'Rules for effective use of cryptography, including key management, are defined and implemented.' },
          { id: 'A.8.25', name: 'Secure Development Life Cycle', desc: 'Rules for secure development of software and systems are established and applied.' },
          { id: 'A.8.26', name: 'Application Security Requirements', desc: 'Information security requirements are identified and approved when acquiring applications.' },
          { id: 'A.8.27', name: 'Secure System Architecture and Engineering Principles', desc: 'Principles for engineering secure systems are established, documented, and applied.' },
          { id: 'A.8.28', name: 'Secure Coding', desc: 'Secure coding principles are applied to software development.' },
          { id: 'A.8.29', name: 'Security Testing in Development and Acceptance', desc: 'Security testing processes are defined and implemented in the development life cycle.' },
          { id: 'A.8.30', name: 'Outsourced Development', desc: 'Supervise and monitor outsourced system development activity.' },
          { id: 'A.8.31', name: 'Separation of Development, Test, and Production Environments', desc: 'Development, testing, and production environments are separated and secured.' },
          { id: 'A.8.32', name: 'Change Management', desc: 'Changes to processing facilities and systems are subject to change management procedures.' },
          { id: 'A.8.33', name: 'Test Information', desc: 'Test information is appropriately selected, protected, and controlled.' },
          { id: 'A.8.34', name: 'Audit Testing Protection', desc: 'Information systems are protected during audit and testing activities.' },
        ],
      },
    ],
  },

  'nist-csf': {
    name: 'NIST CSF 2.0',
    shortName: 'NIST CSF',
    icon: '🏛️',
    domains: [
      {
        name: 'GV - Govern',
        controls: [
          { id: 'GV.OC-01', name: 'Mission and Risk Strategy Alignment', desc: 'Organizational mission and cybersecurity risk strategy are aligned and clearly documented.' },
          { id: 'GV.RM-01', name: 'Risk Management Objectives', desc: 'Risk management objectives are established, communicated, and monitored.' },
          { id: 'GV.SC-01', name: 'Supply Chain Risk Management', desc: 'A supply chain risk management program is established and integrated into broader risk processes.' },
        ],
      },
      {
        name: 'ID - Identify',
        controls: [
          { id: 'ID.AM-01', name: 'Asset Inventory (Hardware)', desc: 'Hardware assets within the organization are inventoried and maintained.' },
          { id: 'ID.AM-02', name: 'Software Inventory', desc: 'Software assets within the organization are inventoried and maintained.' },
          { id: 'ID.AM-03', name: 'Network Inventory', desc: 'Network assets, including communication flows, are mapped and maintained.' },
          { id: 'ID.RA-01', name: 'Vulnerability Identification', desc: 'Vulnerabilities in assets are identified, documented, and prioritized.' },
          { id: 'ID.RA-02', name: 'Threat Intelligence Sharing', desc: 'Cyber threat intelligence is received and shared internally to support risk decisions.' },
        ],
      },
      {
        name: 'PR - Protect',
        controls: [
          { id: 'PR.AA-01', name: 'Identity and Credentials Management', desc: 'Identities and credentials for authorized users, services, and hardware are managed.' },
          { id: 'PR.AA-02', name: 'Identity Proofing and Authorization', desc: 'Identity proofing, authentication, and authorization are managed for humans and non-humans.' },
          { id: 'PR.AT-01', name: 'Security Awareness Training', desc: 'Security awareness training is provided to all personnel with system access.' },
          { id: 'PR.DS-01', name: 'Data-at-Rest Protection', desc: 'Data-at-rest is protected using encryption and other appropriate controls.' },
          { id: 'PR.DS-02', name: 'Data-in-Transit Protection', desc: 'Data-in-transit is protected using encryption and integrity controls.' },
          { id: 'PR.IR-01', name: 'Network Access Protection', desc: 'Networks and environments are protected from unauthorized logical access and usage.' },
        ],
      },
      {
        name: 'DE - Detect',
        controls: [
          { id: 'DE.AE-01', name: 'Network Anomaly Detection', desc: 'Network anomalies and events are detected and analyzed to understand attack indicators.' },
          { id: 'DE.CM-01', name: 'Network Monitoring', desc: 'Networks are monitored for potential cybersecurity attack indicators.' },
          { id: 'DE.CM-03', name: 'Personnel Activity Monitoring', desc: 'Personnel activity is monitored to detect potential cybersecurity events.' },
        ],
      },
      {
        name: 'RS - Respond',
        controls: [
          { id: 'RS.CO-01', name: 'Incident Response Roles', desc: 'Personnel know their incident response roles and responsibilities.' },
          { id: 'RS.MA-01', name: 'Incident Investigation', desc: 'Incidents are investigated per the organizational response plan.' },
          { id: 'RS.MI-01', name: 'Incident Containment', desc: 'Incidents are contained to prevent further damage or data exposure.' },
        ],
      },
      {
        name: 'RC - Recover',
        controls: [
          { id: 'RC.RP-01', name: 'Recovery Plan Execution', desc: 'The recovery plan is executed and updated to restore affected systems and data.' },
          { id: 'RC.CO-01', name: 'Recovery Communications', desc: 'Public relations and communications are managed during and after recovery.' },
        ],
      },
    ],
  },

  'nist-800-53': {
    name: 'NIST 800-53 Rev 5',
    shortName: 'NIST 800-53',
    icon: '🏛️',
    domains: [
      {
        name: 'AC - Access Control',
        controls: [
          { id: 'AC-1', name: 'Access Control Policy and Procedures', desc: 'Access control policy and procedures are documented, disseminated, and reviewed.' },
          { id: 'AC-2', name: 'Account Management', desc: 'Organization accounts are managed including creation, activation, modification, and removal.' },
          { id: 'AC-3', name: 'Access Enforcement', desc: 'Logical access to information is enforced per approved authorizations.' },
          { id: 'AC-6', name: 'Least Privilege', desc: 'Least privilege is employed, allowing only authorized accesses necessary for users to perform their tasks.' },
          { id: 'AC-17', name: 'Remote Access', desc: 'Remote access sessions are managed, monitored, and controlled.' },
        ],
      },
      {
        name: 'AU - Audit and Accountability',
        controls: [
          { id: 'AU-2', name: 'Event Logging', desc: 'Auditable events are identified and logging is enabled for applicable systems.' },
          { id: 'AU-3', name: 'Content of Audit Records', desc: 'Audit records contain sufficient information to establish accountability.' },
          { id: 'AU-6', name: 'Audit Record Review', desc: 'Audit records are reviewed and analyzed for indication of inappropriate activity.' },
          { id: 'AU-9', name: 'Audit Record Protection', desc: 'Audit records are protected from unauthorized access, modification, and deletion.' },
        ],
      },
      {
        name: 'CA - Assessment, Authorization, Monitoring',
        controls: [
          { id: 'CA-2', name: 'Control Assessments', desc: 'Security and privacy control assessments are conducted periodically.' },
          { id: 'CA-3', name: 'Information Exchange', desc: 'Authorizations for information exchange between systems are established.' },
          { id: 'CA-7', name: 'Continuous Monitoring', desc: 'Continuous monitoring of the security and privacy posture of the system is maintained.' },
        ],
      },
      {
        name: 'CM - Configuration Management',
        controls: [
          { id: 'CM-2', name: 'Baseline Configuration', desc: 'A current baseline configuration is developed and maintained for all systems.' },
          { id: 'CM-6', name: 'Configuration Settings', desc: 'Security configuration settings are established, documented, and enforced.' },
          { id: 'CM-7', name: 'Least Functionality', desc: 'Systems are configured to provide only essential capabilities.' },
          { id: 'CM-8', name: 'System Component Inventory', desc: 'An inventory of system components is developed, documented, and maintained.' },
        ],
      },
      {
        name: 'IA - Identification and Authentication',
        controls: [
          { id: 'IA-2', name: 'Identification and Authentication', desc: 'Organizational users and processes are uniquely identified and authenticated.' },
          { id: 'IA-5', name: 'Authenticator Management', desc: 'Authenticators are managed including initial distribution, storage, revocation, and recovery.' },
          { id: 'IA-8', name: 'Non-Organizational User Authentication', desc: 'Non-organizational users are uniquely identified and authenticated.' },
        ],
      },
      {
        name: 'IR - Incident Response',
        controls: [
          { id: 'IR-4', name: 'Incident Handling', desc: 'Incident handling capability is implemented and exercised.' },
          { id: 'IR-5', name: 'Incident Monitoring', desc: 'Security incidents are tracked and documented.' },
          { id: 'IR-6', name: 'Incident Reporting', desc: 'Incidents are reported to appropriate parties.' },
        ],
      },
      {
        name: 'RA - Risk Assessment',
        controls: [
          { id: 'RA-3', name: 'Risk Assessment', desc: 'Risk assessments are conducted to identify threats, vulnerabilities, and impact.' },
          { id: 'RA-5', name: 'Vulnerability Monitoring', desc: 'Systems and applications are scanned for vulnerabilities on a regular basis.' },
        ],
      },
      {
        name: 'SC - System and Communications Protection',
        controls: [
          { id: 'SC-8', name: 'Transmission Confidentiality and Integrity', desc: 'Transmission confidentiality and integrity are implemented using cryptographic mechanisms.' },
          { id: 'SC-28', name: 'Protection of Information at Rest', desc: 'Information at rest is protected using encryption or other mechanisms.' },
        ],
      },
      {
        name: 'SI - System and Information Integrity',
        controls: [
          { id: 'SI-2', name: 'Flaw Remediation', desc: 'System flaws are identified, reported, and corrected in a timely manner.' },
          { id: 'SI-3', name: 'Malicious Code Protection', desc: 'Malicious code protection mechanisms are implemented and updated.' },
          { id: 'SI-4', name: 'System Monitoring', desc: 'Systems are monitored to detect attacks and indicators of potential attacks.' },
        ],
      },
    ],
  },

  'nist-800-171': {
    name: 'NIST 800-171 Rev 2',
    shortName: 'NIST 800-171',
    icon: '🏛️',
    domains: [
      {
        name: 'Access Control',
        controls: [
          { id: '3.1.1', name: 'Authorized Access Control', desc: 'Limit system access to authorized users, processes acting on behalf of authorized users, and devices.' },
          { id: '3.1.2', name: 'Authorized Transaction Control', desc: 'Limit system access to the types of transactions and functions that authorized users are permitted to execute.' },
          { id: '3.1.3', name: 'CUI Flow Control', desc: 'Control the flow of CUI in accordance with approved authorizations.' },
          { id: '3.1.5', name: 'Least Privilege', desc: 'Employ the principle of least privilege, including for specific security functions and privileged accounts.' },
        ],
      },
      {
        name: 'Audit and Accountability',
        controls: [
          { id: '3.3.1', name: 'Audit Log Creation', desc: 'Create and retain system audit logs to enable monitoring, analysis, investigation, and reporting.' },
          { id: '3.3.2', name: 'User Action Traceability', desc: 'Ensure that the actions of individual users can be traced to those users and held accountable.' },
        ],
      },
      {
        name: 'Configuration Management',
        controls: [
          { id: '3.4.1', name: 'Baseline Configurations', desc: 'Establish and maintain baseline configurations for organizational systems.' },
          { id: '3.4.2', name: 'Security Configuration Enforcement', desc: 'Establish and enforce security configuration settings.' },
          { id: '3.4.6', name: 'Least Functionality', desc: 'Employ the principle of least functionality by configuring systems to provide only essential capabilities.' },
        ],
      },
      {
        name: 'Identification and Authentication',
        controls: [
          { id: '3.5.1', name: 'User Identification', desc: 'Identify information system users, processes, and devices.' },
          { id: '3.5.2', name: 'User Authentication', desc: 'Authenticate the identities of users, processes, and devices before allowing access.' },
          { id: '3.5.3', name: 'Multi-Factor Authentication', desc: 'Use MFA for local and network access to privileged accounts and network access to non-privileged accounts.' },
        ],
      },
      {
        name: 'Incident Response',
        controls: [
          { id: '3.6.1', name: 'Incident Handling Capability', desc: 'Establish an operational incident-handling capability including preparation, detection, and recovery.' },
          { id: '3.6.2', name: 'Incident Tracking and Reporting', desc: 'Track, document, and report incidents to authorities.' },
        ],
      },
      {
        name: 'Risk Assessment',
        controls: [
          { id: '3.11.1', name: 'Risk Assessment', desc: 'Periodically assess the risk to operations and assets from CUI processing.' },
          { id: '3.11.2', name: 'Vulnerability Scanning', desc: 'Scan for vulnerabilities in organizational systems periodically and remediate vulnerabilities.' },
        ],
      },
      {
        name: 'System and Communications Protection',
        controls: [
          { id: '3.13.1', name: 'Boundary Protection', desc: 'Monitor, control, and protect organizational communications at external boundaries.' },
          { id: '3.13.8', name: 'Cryptographic Protection', desc: 'Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission.' },
          { id: '3.13.10', name: 'Cryptographic Key Management', desc: 'Establish and manage cryptographic keys when cryptography is employed.' },
        ],
      },
    ],
  },

  'pci-dss': {
    name: 'PCI DSS 4.0',
    shortName: 'PCI DSS',
    icon: '💳',
    domains: [
      {
        name: 'Req 1 - Network Security Controls',
        controls: [
          { id: '1.1', name: 'Network Security Control Processes', desc: 'Processes and mechanisms for managing network security controls are defined and documented.' },
          { id: '1.2', name: 'NSC Configurations', desc: 'Network security control configurations are maintained and reviewed regularly.' },
          { id: '1.3', name: 'CDE Network Access Restriction', desc: 'Network access to and from the cardholder data environment is restricted.' },
        ],
      },
      {
        name: 'Req 2 - Secure Configurations',
        controls: [
          { id: '2.1', name: 'Vendor Default Management', desc: 'Processes and mechanisms for managing vendor defaults are defined and implemented.' },
          { id: '2.2', name: 'Secure System Configuration', desc: 'System components are configured securely to protect against known vulnerabilities.' },
        ],
      },
      {
        name: 'Req 3 - Account Data Protection',
        controls: [
          { id: '3.1', name: 'Data Retention and Disposal', desc: 'Data retention and disposal policies and processes are defined and enforced.' },
          { id: '3.2', name: 'SAD Retention Prohibition', desc: 'Sensitive authentication data (SAD) is not retained after authorization.' },
          { id: '3.4', name: 'PAN Protection', desc: 'Primary account numbers (PAN) are protected using masking or encryption.' },
        ],
      },
      {
        name: 'Req 4 - Encrypt Transmission',
        controls: [
          { id: '4.1', name: 'Strong Cryptography for Transmission', desc: 'Strong cryptography is used to safeguard PAN during transmission over open, public networks.' },
        ],
      },
      {
        name: 'Req 6 - Secure Systems and Software',
        controls: [
          { id: '6.1', name: 'Security Vulnerability Management', desc: 'Processes and mechanisms for protecting systems against vulnerabilities are defined and documented.' },
          { id: '6.2', name: 'Bespoke Software Security', desc: 'Bespoke and custom software is developed securely.' },
          { id: '6.3', name: 'Security Vulnerability Identification', desc: 'Security vulnerabilities are identified and addressed in software components.' },
        ],
      },
      {
        name: 'Req 7 - Restrict Access',
        controls: [
          { id: '7.1', name: 'Access Control Systems', desc: 'Access control systems and processes are defined and implemented.' },
          { id: '7.2', name: 'System Component Access Restriction', desc: 'Access to system components and cardholder data is restricted to only those individuals whose job requires such access.' },
        ],
      },
      {
        name: 'Req 8 - Identify Users',
        controls: [
          { id: '8.1', name: 'User Identification and Authentication Management', desc: 'User identification and authentication policies and procedures are defined and implemented.' },
          { id: '8.2', name: 'MFA for CDE Access', desc: 'Multi-factor authentication is implemented for all access to the cardholder data environment.' },
          { id: '8.3', name: 'Service and Application Account Management', desc: 'Service accounts and application accounts are inventoried and managed.' },
        ],
      },
      {
        name: 'Req 10 - Log and Monitor',
        controls: [
          { id: '10.1', name: 'Logging and Monitoring Processes', desc: 'Logging and monitoring processes are implemented to audit all access to system components and cardholder data.' },
          { id: '10.2', name: 'Audit Log Events', desc: 'Audit logs capture all defined events across in-scope systems.' },
        ],
      },
      {
        name: 'Req 11 - Test Security',
        controls: [
          { id: '11.1', name: 'Security Testing Processes', desc: 'Processes and mechanisms for testing security of systems and networks are defined and documented.' },
          { id: '11.3', name: 'Vulnerability Scanning', desc: 'External and internal vulnerability scans are performed regularly.' },
        ],
      },
      {
        name: 'Req 12 - Policies and Programs',
        controls: [
          { id: '12.1', name: 'Information Security Policy', desc: 'An information security policy is established, published, maintained, and disseminated.' },
          { id: '12.3', name: 'Risk Assessment Process', desc: 'Risks to the cardholder data environment are formally identified, evaluated, and managed via a risk assessment.' },
        ],
      },
    ],
  },

  'hipaa': {
    name: 'HIPAA Security Rule',
    shortName: 'HIPAA',
    icon: '🏥',
    domains: [
      {
        name: 'Administrative Safeguards',
        controls: [
          { id: '164.308.a.1', name: 'Security Management Process', desc: 'Implement policies and procedures to prevent, detect, contain, and correct security violations including risk analysis and risk management.' },
          { id: '164.308.a.2', name: 'Assigned Security Responsibility', desc: 'Identify the security official responsible for developing and implementing security policies and procedures.' },
          { id: '164.308.a.3', name: 'Workforce Security', desc: 'Implement policies and procedures to ensure workforce members have appropriate access to ePHI including access authorization and termination.' },
          { id: '164.308.a.4', name: 'Information Access Management', desc: 'Implement policies and procedures for authorizing access to ePHI consistent with the Privacy Rule.' },
          { id: '164.308.a.5', name: 'Security Awareness and Training', desc: 'Implement a security awareness and training program for all workforce members.' },
          { id: '164.308.a.6', name: 'Security Incident Procedures', desc: 'Implement policies and procedures to address security incidents including response and reporting.' },
          { id: '164.308.a.7', name: 'Contingency Plan', desc: 'Establish policies and procedures for responding to an emergency, including data backup, DR, and emergency mode operations.' },
        ],
      },
      {
        name: 'Physical Safeguards',
        controls: [
          { id: '164.310.a.1', name: 'Facility Access Controls', desc: 'Implement policies and procedures to limit physical access to electronic information systems and facilities.' },
          { id: '164.310.b', name: 'Workstation Use Restrictions', desc: 'Implement policies and procedures that specify proper functions for workstations accessing ePHI.' },
          { id: '164.310.c', name: 'Workstation Security', desc: 'Implement physical safeguards for all workstations that access ePHI to restrict access to authorized users.' },
          { id: '164.310.d.1', name: 'Device and Media Controls', desc: 'Implement policies and procedures governing the receipt and removal of hardware and electronic media containing ePHI.' },
        ],
      },
      {
        name: 'Technical Safeguards',
        controls: [
          { id: '164.312.a.1', name: 'Access Control', desc: 'Implement technical policies and procedures for electronic information systems containing ePHI including unique user IDs, auto logoff, and encryption.' },
          { id: '164.312.b', name: 'Audit Controls', desc: 'Implement hardware, software, and procedural mechanisms that record and examine activity in information systems that contain ePHI.' },
          { id: '164.312.c.1', name: 'Integrity Controls', desc: 'Implement policies and procedures to protect ePHI from improper alteration or destruction.' },
          { id: '164.312.d', name: 'Person Authentication', desc: 'Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed.' },
          { id: '164.312.e.1', name: 'Transmission Security', desc: 'Implement technical security measures to guard against unauthorized access to ePHI transmitted over electronic communications networks.' },
        ],
      },
    ],
  },

  'gdpr': {
    name: 'GDPR',
    shortName: 'GDPR',
    icon: '🇪🇺',
    domains: [
      {
        name: 'Lawful Basis & Transparency',
        controls: [
          { id: 'Art.5', name: 'Principles of Processing', desc: 'Personal data is processed lawfully, fairly, and transparently; collected for specified, explicit, and legitimate purposes.' },
          { id: 'Art.6', name: 'Lawful Basis for Processing', desc: 'Processing is lawful only if at least one legal basis applies (consent, contract, legal obligation, vital interests, public task, legitimate interests).' },
          { id: 'Art.13-14', name: 'Information to Data Subjects', desc: 'Data subjects are informed about processing at time of collection, including purposes, legal basis, and rights.' },
        ],
      },
      {
        name: 'Data Subject Rights',
        controls: [
          { id: 'Art.15', name: 'Right of Access', desc: 'Data subjects have the right to obtain confirmation of processing and a copy of their personal data.' },
          { id: 'Art.16', name: 'Right to Rectification', desc: 'Data subjects have the right to obtain rectification of inaccurate personal data.' },
          { id: 'Art.17', name: 'Right to Erasure', desc: 'Data subjects have the right to obtain erasure of their personal data (right to be forgotten).' },
          { id: 'Art.20', name: 'Right to Data Portability', desc: 'Data subjects have the right to receive their personal data in a structured, commonly used, machine-readable format.' },
        ],
      },
      {
        name: 'Security of Processing',
        controls: [
          { id: 'Art.25', name: 'Data Protection by Design and Default', desc: 'Data protection is integrated into processing activities by design and by default.' },
          { id: 'Art.32', name: 'Security of Processing', desc: 'Appropriate technical and organizational security measures are implemented including encryption and pseudonymization.' },
          { id: 'Art.33', name: 'Data Breach Notification', desc: 'Personal data breaches are notified to the supervisory authority within 72 hours.' },
          { id: 'Art.35', name: 'Data Protection Impact Assessment', desc: 'DPIAs are conducted for processing likely to result in high risks to individuals.' },
        ],
      },
      {
        name: 'Accountability',
        controls: [
          { id: 'Art.30', name: 'Records of Processing Activities', desc: 'Records of processing activities are maintained and available to supervisory authorities.' },
          { id: 'Art.37', name: 'Data Protection Officer Appointment', desc: 'A Data Protection Officer is appointed where required by law or regulation.' },
          { id: 'Art.28', name: 'Processor Contracts', desc: 'Data processing agreements (DPAs) are in place with all processors handling personal data.' },
        ],
      },
    ],
  },

  'cmmc': {
    name: 'CMMC 2.0 Level 2',
    shortName: 'CMMC',
    icon: '🛡️',
    domains: [
      {
        name: 'Access Control (AC)',
        controls: [
          { id: 'AC.1.001', name: 'Limit Access to Authorized Users', desc: 'Limit information system access to authorized users, processes, and devices.' },
          { id: 'AC.1.002', name: 'Limit Access to Authorized Functions', desc: 'Limit information system access to the types of transactions and functions authorized users are permitted to execute.' },
          { id: 'AC.2.005', name: 'Privacy and Security Notices', desc: 'Provide privacy and security notices consistent with CUI rules when users log in.' },
          { id: 'AC.2.006', name: 'Portable Storage Device Use', desc: 'Limit use of portable storage devices on external systems.' },
        ],
      },
      {
        name: 'Audit and Accountability (AU)',
        controls: [
          { id: 'AU.2.041', name: 'User Action Traceability', desc: 'Ensure that the actions of individual users can be traced to those users so they can be held accountable.' },
          { id: 'AU.2.042', name: 'Audit Log Creation and Retention', desc: 'Create and retain system audit logs and records to enable monitoring, analysis, investigation, and reporting.' },
        ],
      },
      {
        name: 'Configuration Management (CM)',
        controls: [
          { id: 'CM.2.061', name: 'Baseline Configurations', desc: 'Establish and maintain baseline configurations and inventories of organizational systems.' },
          { id: 'CM.2.062', name: 'Security Configuration Settings', desc: 'Establish and enforce security configuration settings for information technology products.' },
          { id: 'CM.2.064', name: 'CUI System Documentation', desc: 'Establish and maintain documentation for organizational systems containing CUI.' },
        ],
      },
      {
        name: 'Identification and Authentication (IA)',
        controls: [
          { id: 'IA.1.076', name: 'Identify Information System Users', desc: 'Identify information system users, processes acting on behalf of users, and devices.' },
          { id: 'IA.3.083', name: 'Multi-Factor Authentication for CUI', desc: 'Use multifactor authentication for local and network access to privileged accounts and for network access to non-privileged accounts when accessing CUI.' },
        ],
      },
      {
        name: 'Incident Response (IR)',
        controls: [
          { id: 'IR.2.092', name: 'Incident Handling Capability', desc: 'Establish an operational incident-handling capability for organizational systems.' },
          { id: 'IR.2.093', name: 'Incident Tracking and Reporting', desc: 'Track, document, and report incidents to designated officials and/or authorities.' },
        ],
      },
      {
        name: 'Risk Assessment (RA)',
        controls: [
          { id: 'RA.2.141', name: 'Risk Assessment for CUI', desc: 'Periodically assess the risk to organizational operations, assets, and individuals from processing CUI.' },
          { id: 'RA.3.144', name: 'Periodic Risk Assessments', desc: 'Periodically perform risk assessments to identify and prioritize risk.' },
        ],
      },
      {
        name: 'System and Communications Protection (SC)',
        controls: [
          { id: 'SC.1.175', name: 'Monitor and Protect Communications', desc: 'Monitor, control, and protect organizational communications at external and key internal boundaries.' },
          { id: 'SC.3.177', name: 'FIPS-Validated Cryptography', desc: 'Employ FIPS-validated cryptography when used to protect the confidentiality of CUI.' },
        ],
      },
    ],
  },

  'iso-27017': {
    name: 'ISO 27017',
    shortName: 'ISO 27017',
    icon: '☁️',
    domains: [
      {
        name: 'Cloud-Specific Controls',
        controls: [
          { id: 'CLD.6.3.1', name: 'Shared Roles and Responsibilities', desc: 'Roles and responsibilities for cloud service customers and providers are clearly defined and documented.' },
          { id: 'CLD.8.1.5', name: 'Removal of Cloud Service Assets', desc: 'Assets of the cloud service customer are removed upon contract termination.' },
          { id: 'CLD.9.5.1', name: 'Segregation in Virtual Environments', desc: 'Virtual environments of different cloud service customers are isolated from each other.' },
          { id: 'CLD.9.5.2', name: 'Virtual Machine Hardening', desc: 'Virtual machines are hardened according to security best practices.' },
          { id: 'CLD.12.1.5', name: 'Cloud Administrator Operational Security', desc: 'Cloud service administrator operations are clearly defined and implemented securely.' },
          { id: 'CLD.12.4.5', name: 'Monitoring of Cloud Services', desc: 'Monitoring of cloud services provides visibility into security events and audit logs.' },
        ],
      },
      {
        name: 'Access Control for Cloud',
        controls: [
          { id: 'CLD.9.1', name: 'Cloud Access Policy', desc: 'Access control policy for cloud services is established and reviewed.' },
          { id: 'CLD.9.2', name: 'Cloud User Access Management', desc: 'Formal processes for provisioning and deprovisioning user access to cloud services.' },
          { id: 'CLD.9.4', name: 'Cloud System and Application Access', desc: 'Access to cloud system utilities and applications is restricted and monitored.' },
        ],
      },
      {
        name: 'Data Protection in Cloud',
        controls: [
          { id: 'CLD.13.1', name: 'Cloud Network Security', desc: 'Networks used to deliver cloud services are secured and monitored.' },
          { id: 'CLD.13.2', name: 'Cloud Information Transfer', desc: 'Policies and procedures for transferring information to and from cloud services are established.' },
        ],
      },
      {
        name: 'Incident Management in Cloud',
        controls: [
          { id: 'CLD.16.1', name: 'Cloud Incident Reporting', desc: 'Cloud security incidents are reported and managed per agreed procedures between customer and provider.' },
          { id: 'CLD.16.2', name: 'Cloud Incident Response Coordination', desc: 'Incident response is coordinated between cloud service customer and provider.' },
        ],
      },
    ],
  },

  'iso-27018': {
    name: 'ISO 27018',
    shortName: 'ISO 27018',
    icon: '🔒',
    domains: [
      {
        name: 'PII Processing Consent',
        controls: [
          { id: '27018.A.1', name: 'Consent for PII Processing', desc: 'PII is only processed on documented instructions from the PII principal or controller.' },
          { id: '27018.A.2', name: 'Purpose Limitation', desc: 'PII is used only for the purpose for which it was collected and not for marketing without explicit consent.' },
          { id: '27018.A.3', name: 'Privacy Notice for Sub-processors', desc: 'Cloud service providers disclose use of sub-processors for PII processing.' },
        ],
      },
      {
        name: 'PII Security Controls',
        controls: [
          { id: '27018.A.4', name: 'Temporary Files and Documents', desc: 'Temporary files containing PII are removed after processing is complete.' },
          { id: '27018.A.5', name: 'PII Disclosure Notification', desc: 'Disclosures of PII to law enforcement are logged and the controller is notified if possible.' },
          { id: '27018.A.6', name: 'Data Breach Notification', desc: 'PII breaches are notified to the PII controller without undue delay.' },
          { id: '27018.A.7', name: 'Return or Deletion of PII', desc: 'PII is returned, transferred, or deleted upon contract termination.' },
        ],
      },
      {
        name: 'Access and Accountability',
        controls: [
          { id: '27018.A.8', name: 'PII Access by Cloud Staff', desc: 'Access to PII by cloud service provider staff is limited and logged.' },
          { id: '27018.A.9', name: 'Sub-processor Obligations', desc: 'Sub-processors are bound to the same PII protection obligations as the primary processor.' },
          { id: '27018.A.10', name: 'Audit of PII Processing', desc: 'Audit logs of PII processing are maintained and available to the controller.' },
        ],
      },
      {
        name: 'Transparency',
        controls: [
          { id: '27018.A.11', name: 'Disclosure of Policies', desc: 'Cloud service provider policies for PII protection are publicly disclosed.' },
          { id: '27018.A.12', name: 'Geographic Location of PII', desc: 'The countries or regions where PII may be stored and processed are disclosed.' },
        ],
      },
    ],
  },

  'iso-27701': {
    name: 'ISO 27701',
    shortName: 'ISO 27701',
    icon: '🔏',
    domains: [
      {
        name: 'Privacy Information Management',
        controls: [
          { id: '27701.5.1', name: 'Privacy Policies', desc: 'Policies for privacy information management are established and communicated.' },
          { id: '27701.5.2', name: 'Privacy Roles and Responsibilities', desc: 'Roles and responsibilities for privacy are defined, including Data Protection Officer where required.' },
          { id: '27701.5.3', name: 'Privacy Risk Assessment', desc: 'Privacy risks are identified and assessed as part of the overall risk management process.' },
          { id: '27701.5.4', name: 'PIMS Scope', desc: 'The scope of the Privacy Information Management System is defined and documented.' },
        ],
      },
      {
        name: 'PII Controller Controls',
        controls: [
          { id: '27701.7.2', name: 'Lawful Basis for Processing', desc: 'Processing of PII has a documented lawful basis that is communicated to PII principals.' },
          { id: '27701.7.3', name: 'Determination of Processing Purposes', desc: 'Purposes for processing PII are determined and limited to those necessary.' },
          { id: '27701.7.4', name: 'Consent Management', desc: 'Consent for processing PII is obtained, managed, and records maintained.' },
          { id: '27701.7.5', name: 'PII Principal Rights', desc: 'Processes are in place to fulfill PII principal rights including access, correction, and deletion.' },
        ],
      },
      {
        name: 'PII Processor Controls',
        controls: [
          { id: '27701.8.2', name: 'Customer Agreement', desc: 'Processing of PII is governed by a binding agreement with the PII controller.' },
          { id: '27701.8.3', name: 'Marketing Restriction', desc: 'PII is not used for marketing or advertising without explicit PII controller authorization.' },
          { id: '27701.8.4', name: 'Sub-processor Engagement', desc: 'Sub-processors are engaged only with PII controller consent and bound by equivalent obligations.' },
        ],
      },
      {
        name: 'Data Transfers',
        controls: [
          { id: '27701.6.9', name: 'Cross-Border Transfer Controls', desc: 'Transfers of PII across national borders comply with applicable regulations and are documented.' },
          { id: '27701.6.10', name: 'Transfer Mechanisms', desc: 'Appropriate transfer mechanisms (SCCs, BCRs, adequacy decisions) are in place for international transfers.' },
        ],
      },
    ],
  },

  'sox': {
    name: 'SOX Compliance',
    shortName: 'SOX',
    icon: '📊',
    domains: [
      {
        name: 'IT General Controls',
        controls: [
          { id: 'ITGC.1', name: 'Logical Access - User Provisioning', desc: 'Logical access controls govern the provisioning and de-provisioning of user accounts to financial systems.' },
          { id: 'ITGC.2', name: 'Logical Access - Privileged Access', desc: 'Privileged access to financial applications, databases, and operating systems is restricted and monitored.' },
          { id: 'ITGC.3', name: 'Change Management - Program Changes', desc: 'Program changes are tested, authorized, and documented before deployment to production financial systems.' },
          { id: 'ITGC.4', name: 'Change Management - Segregation of Duties', desc: 'Duties within change management processes for financial systems are appropriately segregated.' },
          { id: 'ITGC.5', name: 'Computer Operations - Job Scheduling', desc: 'Batch jobs and job scheduling for financial reporting processes are controlled and monitored.' },
          { id: 'ITGC.6', name: 'Computer Operations - Incident Management', desc: 'IT incidents affecting financial systems are logged, tracked, and resolved.' },
        ],
      },
      {
        name: 'Financial Reporting Controls',
        controls: [
          { id: 'FRC.1', name: 'Financial Close and Reporting Process', desc: 'The financial close and reporting process is controlled, documented, and reviewed.' },
          { id: 'FRC.2', name: 'Revenue Recognition', desc: 'Revenue recognition policies comply with applicable accounting standards and are consistently applied.' },
          { id: 'FRC.3', name: 'Account Reconciliations', desc: 'Account reconciliations are performed, reviewed, and approved on a timely basis.' },
          { id: 'FRC.4', name: 'Journal Entry Controls', desc: 'Journal entries are authorized, documented, and reviewed to prevent unauthorized adjustments.' },
        ],
      },
    ],
  },

  'cis-controls': {
    name: 'CIS Controls v8',
    shortName: 'CIS',
    icon: '🎯',
    domains: [
      {
        name: 'Basic Controls',
        controls: [
          { id: 'CIS.1', name: 'Inventory and Control of Enterprise Assets', desc: 'Actively manage all enterprise hardware assets to ensure only authorized devices are granted access.' },
          { id: 'CIS.2', name: 'Inventory and Control of Software Assets', desc: 'Actively manage all software on the network to ensure only authorized software is installed and in use.' },
          { id: 'CIS.3', name: 'Data Protection', desc: 'Develop processes and technical controls to identify, classify, handle, retain, and dispose of data securely.' },
          { id: 'CIS.4', name: 'Secure Configuration of Enterprise Assets', desc: 'Establish and maintain the secure configuration of enterprise assets and software.' },
          { id: 'CIS.5', name: 'Account Management', desc: 'Use processes and tools to assign and manage authorization to credentials for user accounts.' },
          { id: 'CIS.6', name: 'Access Control Management', desc: 'Use processes and tools to create, assign, manage, and revoke access credentials and privileges.' },
        ],
      },
      {
        name: 'Foundational Controls',
        controls: [
          { id: 'CIS.7', name: 'Continuous Vulnerability Management', desc: 'Develop a plan to continuously assess and track vulnerabilities on all enterprise assets.' },
          { id: 'CIS.8', name: 'Audit Log Management', desc: 'Collect, alert, review, and retain audit logs to detect, understand, and recover from attacks.' },
          { id: 'CIS.9', name: 'Email and Web Browser Protections', desc: 'Improve protections and detections of threats from email and web vectors.' },
          { id: 'CIS.10', name: 'Malware Defenses', desc: 'Prevent or control the installation, spread, and execution of malicious applications.' },
          { id: 'CIS.11', name: 'Data Recovery', desc: 'Establish and maintain data recovery practices sufficient to restore in-scope enterprise assets to a pre-incident state.' },
          { id: 'CIS.12', name: 'Network Infrastructure Management', desc: 'Establish and maintain the secure configuration of network infrastructure assets.' },
        ],
      },
      {
        name: 'Organizational Controls',
        controls: [
          { id: 'CIS.14', name: 'Security Awareness and Skills Training', desc: 'Establish and maintain a security awareness program to influence behavior among the workforce.' },
          { id: 'CIS.15', name: 'Service Provider Management', desc: 'Develop a process to evaluate service providers who hold sensitive data or are responsible for critical IT platforms.' },
          { id: 'CIS.16', name: 'Application Software Security', desc: 'Manage the security lifecycle of in-house developed, hosted, or acquired software.' },
          { id: 'CIS.17', name: 'Incident Response Management', desc: 'Establish a program to develop and maintain an incident response capability.' },
          { id: 'CIS.18', name: 'Penetration Testing', desc: 'Test the effectiveness of enterprise defenses by simulating the objectives and actions of an attacker.' },
        ],
      },
    ],
  },

  'sebi': {
    name: 'SEBI Cybersecurity Framework',
    shortName: 'SEBI',
    icon: '🇮🇳',
    domains: [
      {
        name: 'Governance',
        controls: [
          { id: 'SEBI.GOV.1', name: 'Cybersecurity Policy and Governance Framework', desc: 'A comprehensive cybersecurity policy and governance framework is established and approved by the board.' },
          { id: 'SEBI.GOV.2', name: 'Board-Level Accountability', desc: 'The board of directors has accountability for cybersecurity oversight and risk management.' },
          { id: 'SEBI.GOV.3', name: 'CISO Appointed', desc: 'A Chief Information Security Officer (CISO) is appointed with sufficient authority and resources.' },
        ],
      },
      {
        name: 'Technology Risk',
        controls: [
          { id: 'SEBI.TR.1', name: 'Critical Systems Classification', desc: 'Critical systems and data are identified and classified based on sensitivity and business impact.' },
          { id: 'SEBI.TR.2', name: 'Vendor Risk Management', desc: 'A vendor and third-party risk management program is established and enforced.' },
          { id: 'SEBI.TR.3', name: 'Third-Party Audits', desc: 'Regular third-party security audits are conducted to assess the effectiveness of controls.' },
        ],
      },
      {
        name: 'Cyber Resilience',
        controls: [
          { id: 'SEBI.CR.1', name: 'Business Continuity and DR Plans', desc: 'Business continuity and disaster recovery plans are documented, tested, and updated regularly.' },
          { id: 'SEBI.CR.2', name: 'Cyber Incident Response Plan', desc: 'A cyber incident response plan is established with defined roles, escalation paths, and recovery procedures.' },
          { id: 'SEBI.CR.3', name: 'Annual Cyber Audit', desc: 'An annual cybersecurity audit is conducted by a CERT-In empanelled auditor and results reported to SEBI.' },
        ],
      },
    ],
  },

  'rbi': {
    name: 'RBI Cybersecurity Guidelines',
    shortName: 'RBI',
    icon: '🇮🇳',
    domains: [
      {
        name: 'IT Governance',
        controls: [
          { id: 'RBI.ITG.1', name: 'IT Strategy Alignment', desc: 'IT strategy is documented and aligned with the overall business strategy of the bank.' },
          { id: 'RBI.ITG.2', name: 'IT Risk Management Framework', desc: 'An IT risk management framework is established and integrated into the enterprise risk management process.' },
          { id: 'RBI.ITG.3', name: 'IT Operations SLAs', desc: 'SLAs for IT operations and services are defined, monitored, and reviewed.' },
        ],
      },
      {
        name: 'Cyber Security',
        controls: [
          { id: 'RBI.CS.1', name: 'Network Perimeter Security', desc: 'Network perimeter security including firewalls, IDS/IPS, and DMZ configurations is implemented and maintained.' },
          { id: 'RBI.CS.2', name: 'Security Operations Center', desc: 'A Security Operations Center (SOC) is established for 24x7 monitoring of cyber threats.' },
          { id: 'RBI.CS.3', name: 'Vulnerability Assessment and Penetration Testing', desc: 'Regular VAPT is conducted on all critical systems and remediation is tracked.' },
          { id: 'RBI.CS.4', name: 'Anti-Phishing Measures', desc: 'Anti-phishing measures including email filtering, user training, and domain protection are implemented.' },
        ],
      },
    ],
  },

  'dpdp': {
    name: 'DPDP Act 2023',
    shortName: 'DPDP',
    icon: '🇮🇳',
    domains: [
      {
        name: 'Data Fiduciary Obligations',
        controls: [
          { id: 'DPDP.1', name: 'Consent Management', desc: 'Consent for processing personal data is obtained, recorded, managed, and revocable by the data principal.' },
          { id: 'DPDP.2', name: 'Notice to Data Principals', desc: 'Clear and comprehensive notice is provided to data principals at the time of collection describing purpose and rights.' },
          { id: 'DPDP.3', name: 'Lawful Basis for Processing', desc: 'Personal data is processed only for lawful purposes with consent or other valid legal basis under the DPDP Act.' },
        ],
      },
      {
        name: 'Data Principal Rights',
        controls: [
          { id: 'DPDP.4', name: 'Right of Access', desc: 'Data principals can obtain information about their personal data being processed upon request.' },
          { id: 'DPDP.5', name: 'Right to Correction and Erasure', desc: 'Data principals can request correction of inaccurate data and erasure where no longer necessary.' },
          { id: 'DPDP.6', name: 'Right to Grievance Redressal', desc: 'A grievance redressal mechanism is established for data principals to raise complaints.' },
        ],
      },
      {
        name: 'Security Obligations',
        controls: [
          { id: 'DPDP.7', name: 'Reasonable Security Safeguards', desc: 'Reasonable security safeguards are implemented to prevent personal data breaches.' },
          { id: 'DPDP.8', name: 'Data Breach Notification', desc: 'Personal data breaches are notified to the Data Protection Board within the prescribed period.' },
          { id: 'DPDP.9', name: 'Data Retention and Erasure', desc: 'Personal data is retained only as long as necessary and erased once the purpose is fulfilled.' },
        ],
      },
      {
        name: 'Significant Data Fiduciary',
        controls: [
          { id: 'DPDP.10', name: 'Data Protection Impact Assessment', desc: 'DPIAs are conducted for significant processing activities as required for significant data fiduciaries.' },
          { id: 'DPDP.11', name: 'Data Protection Officer Appointment', desc: 'A Data Protection Officer is appointed by significant data fiduciaries as required under the Act.' },
        ],
      },
    ],
  },
};

export function getFrameworkBySlug(slug) {
  return FRAMEWORK_CATALOG[slug] || null;
}

export function getFrameworkByName(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (FRAMEWORK_CATALOG[normalized]) return { slug: normalized, ...FRAMEWORK_CATALOG[normalized] };
  // Try partial matches
  for (const [slug, fw] of Object.entries(FRAMEWORK_CATALOG)) {
    if (fw.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(fw.shortName.toLowerCase())) {
      return { slug, ...fw };
    }
  }
  return null;
}

// Maps user permission names (from user_permissions table) to framework slugs
export const PERMISSION_TO_FRAMEWORK = {
  'SOC 1': 'soc-1',
  'SOC 2': 'soc-2-type-ii',
  'SOC 2 Type I': 'soc-2-type-i',
  'SOC 2 Type II': 'soc-2-type-ii',
  'SOC 2 (Type I & II)': 'soc-2-type-ii',
  'ISO 27001': 'iso-27001',
  'ISO 27017': 'iso-27017',
  'ISO 27017 / ISO 27018': 'iso-27017',
  'ISO 27018': 'iso-27018',
  'ISO 27701': 'iso-27701',
  'NIST CSF': 'nist-csf',
  'NIST 800-53': 'nist-800-53',
  'NIST 800-171': 'nist-800-171',
  'NIST 800-171 / CMMC': 'nist-800-171',
  'CMMC': 'cmmc',
  'PCI DSS': 'pci-dss',
  'PCI-DSS': 'pci-dss',
  'HIPAA': 'hipaa',
  'GDPR': 'gdpr',
  'GDPR Compliance': 'gdpr',
  'SOX': 'sox',
  'SOX Compliance': 'sox',
  'CIS Controls': 'cis-controls',
  'CIS': 'cis-controls',
  'SEBI': 'sebi',
  'SEBI Cybersecurity Framework': 'sebi',
  'RBI': 'rbi',
  'RBI Cybersecurity Guidelines': 'rbi',
  'DPDP': 'dpdp',
  'India IT Act & CERT-In': 'dpdp',
};

// Maps user permission names to security tool slugs
export const PERMISSION_TO_SECURITY_TOOL = {
  'Vulnerability Management': { slug: 'vulnerability-management', name: 'Vulnerability Management', icon: '🐛' },
  'Vulnerability': { slug: 'vulnerability-management', name: 'Vulnerability Management', icon: '🐛' },
  'GRC': { slug: 'grc', name: 'GRC & Risk', icon: '⚖️' },
  'Risk Management': { slug: 'grc', name: 'GRC & Risk', icon: '⚖️' },
  'Risk': { slug: 'grc', name: 'GRC & Risk', icon: '⚖️' },
  'Incident Response': { slug: 'incident-response', name: 'Incident Response', icon: '🚨' },
  'IR': { slug: 'incident-response', name: 'Incident Response', icon: '🚨' },
  'Identity & Access Management': { slug: 'iam', name: 'Identity & Access', icon: '🔑' },
  'IAM': { slug: 'iam', name: 'Identity & Access', icon: '🔑' },
  'IAM / Access Management': { slug: 'iam', name: 'Identity & Access', icon: '🔑' },
  'Data Protection & Privacy': { slug: 'dlp', name: 'Data Protection', icon: '🛡️' },
  'DLP': { slug: 'dlp', name: 'Data Loss Prevention', icon: '🛡️' },
  'DLP (Data Loss Prevention)': { slug: 'dlp', name: 'Data Loss Prevention', icon: '🛡️' },
  'PAM': { slug: 'pam', name: 'Privileged Access', icon: '🔐' },
  'PAM (Privileged Access Management)': { slug: 'pam', name: 'Privileged Access', icon: '🔐' },
  'Threat Intelligence': { slug: 'threat-intelligence', name: 'Threat Intelligence', icon: '🌐' },
  'CTI': { slug: 'threat-intelligence', name: 'Threat Intelligence', icon: '🌐' },
  'Security Operations (SOC)': { slug: 'soc-siem', name: 'SOC / SIEM', icon: '📡' },
  'Security Operations': { slug: 'soc-siem', name: 'SOC / SIEM', icon: '📡' },
  'SOC': { slug: 'soc-siem', name: 'SOC / SIEM', icon: '📡' },
  'SIEM': { slug: 'soc-siem', name: 'SOC / SIEM', icon: '📡' },
  'SIEM & Log Management': { slug: 'soc-siem', name: 'SOC / SIEM', icon: '📡' },
  'Cloud Security & CSPM': { slug: 'cloud-security', name: 'Cloud / CSPM', icon: '☁️' },
  'Cloud Security': { slug: 'cloud-security', name: 'Cloud / CSPM', icon: '☁️' },
  'CSPM': { slug: 'cloud-security', name: 'Cloud / CSPM', icon: '☁️' },
  'Network Security': { slug: 'network-security', name: 'Network Security', icon: '🌐' },
  'Application Security': { slug: 'appsec', name: 'App Security', icon: '🔒' },
  'AppSec': { slug: 'appsec', name: 'App Security', icon: '🔒' },
  'DevSecOps': { slug: 'appsec', name: 'App Security', icon: '🔒' },
  'DevSecOps & Secure SDLC': { slug: 'appsec', name: 'App Security', icon: '🔒' },
  'Third-Party & Vendor Risk': { slug: 'tprm', name: 'Third-Party Risk', icon: '🤝' },
  'TPRM': { slug: 'tprm', name: 'Third-Party Risk', icon: '🤝' },
  'Vendor Risk Management': { slug: 'tprm', name: 'Third-Party Risk', icon: '🤝' },
  'Third-Party Risk': { slug: 'tprm', name: 'Third-Party Risk', icon: '🤝' },
  'Penetration Testing': { slug: 'pentest', name: 'Penetration Testing', icon: '🔍' },
  'Pentest': { slug: 'pentest', name: 'Penetration Testing', icon: '🔍' },
  'Asset Inventory & CMDB': { slug: 'asset-management', name: 'Asset Management', icon: '📦' },
  'Asset Inventory': { slug: 'asset-management', name: 'Asset Management', icon: '📦' },
  'Endpoint Protection': { slug: 'endpoint', name: 'Endpoint Security', icon: '💻' },
  'Endpoint Security': { slug: 'endpoint', name: 'Endpoint Security', icon: '💻' },
  'MDM & Endpoint Management': { slug: 'endpoint', name: 'Endpoint Security', icon: '💻' },
  'Business Continuity & DR': { slug: 'bcp-dr', name: 'BCP / DR', icon: '🔄' },
  'BCP': { slug: 'bcp-dr', name: 'BCP / DR', icon: '🔄' },
  'Security Awareness & Training': { slug: 'awareness', name: 'Security Awareness', icon: '📚' },
  'Awareness': { slug: 'awareness', name: 'Security Awareness', icon: '📚' },
};
