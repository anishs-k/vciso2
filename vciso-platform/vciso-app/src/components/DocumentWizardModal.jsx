import React, { useState, useEffect } from 'react';
import { C } from '../pages/vciso/AuditConstants';

// Pre-built ISO 27001 document templates tailored per step
const DEFAULT_TEMPLATES = {
  'step-1': {
    docId: 'DOC-ISO-001',
    title: 'ISO 27001 Implementation Charter & Roadmap',
    classification: 'Internal Use Only',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Executive Summary & Purpose', content: 'This document defines the organization’s roadmap and strategic commitment for implementing an Information Security Management System (ISMS) aligned with ISO/IEC 27001:2022.' },
      { id: 'scope', name: '2. Program Scope & Objectives', content: 'The scope covers all information assets, technology infrastructure, corporate systems, personnel, and operational locations supporting client product and service delivery.' },
      { id: 'roadmap', name: '3. Implementation Phases & Milestones', content: 'Phase 1: Project Preparation & Scope\nPhase 2: Risk Assessment & SoA Formulation\nPhase 3: Security Policy & Controls Deployment\nPhase 4: Internal Audit & Management Review\nPhase 5: External Certification Audit (Stage 1 & 2).' },
      { id: 'governance', name: '4. Steering Committee & Governance', content: 'Overall program oversight is driven by top management, supported by the Chief Information Security Officer (CISO) and Lead ISMS Consultant.' }
    ]
  },
  'step-2': {
    docId: 'DOC-ISO-002',
    title: 'Procedure for Document and Record Control',
    classification: 'Confidential',
    reviewCycle: '6 Months',
    sections: [
      { id: 'purpose', name: '1. Objective & Clause Reference', content: 'In accordance with ISO 27001:2022 Clause 7.5, this procedure outlines requirements for creating, updating, approving, publishing, retaining, and disposing of ISMS documents and operational records.' },
      { id: 'control', name: '2. Document Identification & Structure', content: 'Every ISMS document must include: Document ID, Title, Owner, Version number, Classification, Effective Date, and Approval Sign-off.' },
      { id: 'lifecycle', name: '3. Review, Approval & Version Control', content: 'Minor revisions increment the decimal version (e.g. v1.1). Major structural revisions increment the integer version (e.g. v2.0). All major versions require executive re-approval.' },
      { id: 'retention', name: '4. Storage & Archival Rules', content: 'Operational records and logs must be securely retained for a minimum of 3 years unless legal/regulatory mandates dictate a longer retention period.' }
    ]
  },
  'step-6': {
    docId: 'DOC-ISO-006',
    title: 'ISMS Scope & Boundaries Definition Document',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Mandatory Scope Declaration (Clause 4.3)', content: 'This document establishes the precise organizational, physical, technical, and operational boundaries of the Information Security Management System for {ORG_NAME}.' },
      { id: 'boundaries', name: '2. Organizational & Technical Boundaries', content: 'Included in scope: All cloud infrastructure (AWS/Azure/GCP), corporate networks, code repositories, customer data platforms, and remote workforce operations.' },
      { id: 'interfaces', name: '3. Internal & External Interfaces', content: 'Key interfaces include third-party SaaS vendors, external payment gateways, customer API endpoints, and managed security service providers (MSSP).' },
      { id: 'exclusions', name: '4. Exclusions & Justifications', content: 'No physical manufacturing facilities are included as {ORG_NAME} operates exclusively as a digital cloud SaaS provider.' }
    ]
  },
  'step-7': {
    docId: 'DOC-ISO-007',
    title: 'Risk Assessment & Risk Treatment Methodology',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Methodology Overview (Clause 6.1.2)', content: 'Establishes a repeatable, risk-based approach for identifying, analyzing, evaluating, and treating information security risks facing {ORG_NAME}.' },
      { id: 'criteria', name: '2. Likelihood & Impact Rating Scale', content: 'Risks are evaluated on a 5x5 matrix combining Likelihood (1: Rare to 5: Frequent) and Impact (1: Negligible to 5: Severe/Catastrophic).' },
      { id: 'threshold', name: '3. Risk Acceptance Threshold', content: 'Any risk score resulting in Medium (Rating 10-14) or High/Critical (Rating 15-25) requires mandatory Risk Treatment and executive approval.' },
      { id: 'treatment', name: '4. Risk Treatment Options', content: 'Treatments include: Risk Mitigation (applying controls), Risk Avoidance, Risk Transfer (insurance/third-party SLA), or Formal Risk Acceptance.' }
    ]
  },
  'step-9': {
    docId: 'DOC-ISO-009',
    title: 'Statement of Applicability (SoA)',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Executive Statement (Clause 6.1.3)', content: 'The Statement of Applicability details the selection and implementation status of all 93 Annex A controls across Organizational, People, Physical, and Technological domains.' },
      { id: 'selection', name: '2. Control Selection Criteria', content: 'Controls are selected based on risk assessment findings, contractual compliance obligations, legal mandates, and industry security best practices.' },
      { id: 'status', name: '3. Implementation Summary', content: 'Out of 93 Annex A controls: 88 controls are currently Included & Implemented, 3 controls are In Progress, and 2 physical controls are Excluded with documented rationale.' }
    ]
  },
  'step-10': {
    docId: 'DOC-ISO-010',
    title: 'IT Security Policy Framework',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Objective & Scope', content: 'Establishes operational security requirements across IT infrastructure, network security, workstation management, and system administration.' },
      { id: 'infrastructure', name: '2. Network & Infrastructure Security', content: 'All network perimeters must be protected by next-generation firewalls, network segmentation (DMZ, Internal, Management), and active Intrusion Detection/Prevention (IDS/IPS).' },
      { id: 'patching', name: '3. Patch & Vulnerability Management', content: 'Critical security patches must be deployed within 24 hours of notification. Authenticated vulnerability scans must run at least monthly.' },
      { id: 'logging', name: '4. Logging & Central Monitoring', content: 'All system logs (audit, admin actions, authentication) must be centralized into a SIEM platform and retained online for at least 12 months.' }
    ]
  },
  'step-11': {
    docId: 'DOC-ISO-011',
    title: 'Top-Level Information Security Policy',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Management Intent & Direction (Annex A.5.1)', content: 'Top management of {ORG_NAME} is fully committed to maintaining the confidentiality, integrity, and availability of all organizational and customer data.' },
      { id: 'principles', name: '2. Core Information Security Principles', content: '1. Defense in Depth\n2. Principle of Least Privilege\n3. Zero Trust Security Model\n4. Continuous Monitoring & Risk Management.' },
      { id: 'responsibilities', name: '3. Governance & Accountabilities', content: 'The CISO is assigned operational authority over the ISMS. Every employee and contractor is required to comply with security policies.' },
      { id: 'enforcement', name: '4. Compliance & Disciplinary Action', content: 'Violations of this policy may lead to disciplinary measures up to employment termination and legal action where applicable.' }
    ]
  },
  'step-12': {
    docId: 'DOC-ISO-012',
    title: 'Access Control Policy',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Objective & Scope (Annex A.5.15)', content: 'Defines rules for user access provisioning, role-based access control (RBAC), multi-factor authentication (MFA), and privileged access management.' },
      { id: 'provisioning', name: '2. User Provisioning & Deprovisioning', content: 'Access is granted solely based on approved ticket requests from authorized managers. Access for terminated employees must be revoked immediately upon offboarding.' },
      { id: 'mfa', name: '3. Authentication & MFA Standard', content: 'Multi-factor authentication (MFA) is strictly mandatory for all cloud services, remote VPN connections, and admin access accounts.' },
      { id: 'review', name: '4. Access Reviews', content: 'User access rights and privileged accounts must be formally reviewed by system owners at least quarterly.' }
    ]
  },
  'step-13': {
    docId: 'DOC-ISO-013',
    title: 'Procedure for Nonconformities and Corrective Actions',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Objective (Clause 10.1)', content: 'Defines how {ORG_NAME} identifies, documents, analyzes root causes, and implements corrective actions for ISMS nonconformities.' },
      { id: 'identification', name: '2. Identification & Logging', content: 'Nonconformities identified during internal audits, external audits, security incidents, or management reviews must be logged into the CAR register within 24 hours.' },
      { id: 'analysis', name: '3. Root Cause Analysis & CAPA Plan', content: 'The CAR owner must perform a root cause analysis (e.g. 5-Whys) and submit a Corrective Action Plan with target completion dates.' },
      { id: 'verification', name: '4. Verification of Effectiveness', content: 'The CISO or Lead Auditor must verify the effectiveness of completed corrective actions prior to closing the CAR ticket.' }
    ]
  },
  'step-14': {
    docId: 'DOC-ISO-014',
    title: 'Internal Audit Procedure',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Audit Charter & Objective (Clause 9.2)', content: 'Establishes requirements for planning, conducting, reporting, and tracking internal ISMS audits to ensure continuous compliance with ISO 27001.' },
      { id: 'independence', name: '2. Auditor Independence', content: 'Internal auditors must be impartial and independent of the direct operational activity being audited to prevent conflicts of interest.' },
      { id: 'schedule', name: '3. Annual Audit Schedule & Scope', content: 'An internal audit covering all 27001 clauses and applicable Annex A controls must be conducted at least annually before the management review.' },
      { id: 'reporting', name: '4. Audit Report & Executive Briefing', content: 'Audit findings must be compiled into a formal Audit Report presented to executive management within 10 days of audit completion.' }
    ]
  }
};

export default function DocumentWizardModal({ step, stepData, frameworkSlug, token, onClose, onSave }) {
  const [currentWizardStep, setCurrentWizardStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Default Template lookup
  const fallbackTemplate = DEFAULT_TEMPLATES[step?.id] || {
    docId: `DOC-ISO-${step?.id?.toUpperCase() || 'STEP'}`,
    title: step?.title || 'ISO 27001 Implementation Policy',
    classification: 'Confidential',
    reviewCycle: '12 Months',
    sections: [
      { id: 'purpose', name: '1. Purpose & Objectives', content: `This document sets forth the policy guidelines and standard procedure for ${step?.title || 'this implementation step'} in alignment with ISO 27001:2022 requirements.` },
      { id: 'scope', name: '2. Scope & Applicability', content: 'Applies to all employees, contractors, third-party service providers, technical systems, and business processes under the ISMS scope.' },
      { id: 'responsibilities', name: '3. Roles & Responsibilities', content: `Primary document ownership is assigned to ${step?.reviewers || 'CISO'} with final approval by ${step?.approvers || 'CEO / MD'}.` },
      { id: 'requirements', name: '4. Operational Requirements & Rules', content: 'Detailed procedures and security controls must be maintained, reviewed, and audited at planned intervals.' },
      { id: 'revision', name: '5. Document Control & History', content: 'Version 1.0 drafted during ISO 27001 implementation cycle.' }
    ]
  };

  // State initialization
  const [docMeta, setDocMeta] = useState({
    title: stepData?.notes_title || step?.title || fallbackTemplate.title,
    docId: fallbackTemplate.docId,
    version: stepData?.doc_version || '1.0',
    classification: 'Confidential',
    owner: stepData?.owner || step?.reviewers?.split(',')[0] || 'CISO',
    reviewers: step?.reviewers || 'CISO, Project Lead',
    approver: stepData?.approver || step?.approvers || 'CEO / MD',
    reviewCycle: fallbackTemplate.reviewCycle,
    status: stepData?.status || 'completed', // Defaults to completed when finalized in wizard
    dueDate: stepData?.due_date || '',
    notes: stepData?.notes || ''
  });

  const [orgContext, setOrgContext] = useState({
    orgName: 'Acme Corporation',
    industry: 'Technology & Cloud SaaS',
    scope: 'All cloud production environments, corporate infrastructure, customer data, and employee devices.',
    regulations: 'ISO 27001:2022, SOC 2 Type II, GDPR',
    coveredAssets: 'Customer PII, Production AWS Infrastructure, Source Code, Identity Provider'
  });

  const [sections, setSections] = useState(() => {
    if (stepData?.doc_content) {
      try {
        const parsed = JSON.parse(stepData.doc_content);
        if (parsed.sections) return parsed.sections;
      } catch {}
    }
    return fallbackTemplate.sections;
  });

  const [activeSectionId, setActiveSectionId] = useState(fallbackTemplate.sections[0]?.id || 'purpose');
  const [checklists, setChecklists] = useState({
    isoAligned: true,
    rolesAssigned: true,
    approverReviewed: true,
    stakeholderCommunicated: true
  });

  // Helper to substitute org parameters into section content
  const applyOrgParameters = () => {
    setSections(prev => prev.map(sec => ({
      ...sec,
      content: sec.content
        .replace(/\{ORG_NAME\}/g, orgContext.orgName)
        .replace(/\{INDUSTRY\}/g, orgContext.industry)
        .replace(/\{SCOPE\}/g, orgContext.scope)
    })));
  };

  // Generate full markdown document representation
  const generateMarkdownDoc = () => {
    return `# ${docMeta.title}

| **Document Parameter** | **Details** |
| :--- | :--- |
| **Document ID** | ${docMeta.docId} |
| **Version** | ${docMeta.version} |
| **Classification** | ${docMeta.classification} |
| **Document Owner** | ${docMeta.owner} |
| **Reviewers** | ${docMeta.reviewers} |
| **Approved By** | ${docMeta.approver} |
| **Effective Date** | ${new Date().toISOString().split('T')[0]} |
| **Review Cycle** | ${docMeta.reviewCycle} |

---

${sections.map(s => `## ${s.name}\n\n${s.content.replace(/\{ORG_NAME\}/g, orgContext.orgName)}`).join('\n\n---\n\n')}

---

### Document Sign-Off & Verification
- **ISO 27001:2022 Alignment:** Verified
- **Document Status:** ${docMeta.status.toUpperCase()}
- **Approver Signature:** Digital Sign-off by ${docMeta.approver}
- **Last Updated:** ${new Date().toLocaleDateString()}
`;
  };

  // Save to DB via backend API
  const handleSaveDocument = async (markComplete = true) => {
    setSaving(true);
    const finalStatus = markComplete ? 'completed' : docMeta.status;
    const fullMarkdown = generateMarkdownDoc();
    const docPayload = JSON.stringify({
      meta: docMeta,
      org: orgContext,
      sections,
      fullMarkdown
    });

    try {
      const res = await fetch(`/api/vciso/audit/${encodeURIComponent(frameworkSlug || 'iso-27001')}/steps/${encodeURIComponent(step.id)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: finalStatus,
          owner: docMeta.owner,
          approver: docMeta.approver,
          doc_version: docMeta.version,
          due_date: docMeta.dueDate || null,
          notes: docMeta.notes || `Generated via Document Wizard v${docMeta.version}`,
          doc_content: docPayload
        })
      });

      if (res.ok) {
        if (onSave) onSave();
        onClose();
      } else {
        alert('Failed to save document. Please check console for errors.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving document: ' + e.message);
    }
    setSaving(false);
  };

  const handleDownloadMarkdown = () => {
    const markdownText = generateMarkdownDoc();
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docMeta.docId}_${docMeta.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const WIZARD_STEPS = [
    { num: 1, label: 'Governance' },
    { num: 2, label: 'Org Scope' },
    { num: 3, label: 'Document Editor' },
    { num: 4, label: 'Review & Sign-Off' },
    { num: 5, label: 'Export & Complete' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="w-full max-w-5xl rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all"
        style={{ background: C.card, border: `1px solid ${C.border}`, maxHeight: '90vh' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border, background: '#081020' }}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.accent }}>
              ISO 27001 Document Wizard • Step {step?.clause || step?.id}
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">{docMeta.title}</h2>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition hover:bg-white/10"
            style={{ color: C.muted }}
          >
            ✕
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between px-8 py-3.5 border-b" style={{ borderColor: C.border, background: '#0a1426' }}>
          {WIZARD_STEPS.map((s, idx) => {
            const isActive = currentWizardStep === s.num;
            const isDone = currentWizardStep > s.num;
            return (
              <React.Fragment key={s.num}>
                <div 
                  onClick={() => setCurrentWizardStep(s.num)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive ? 'ring-2 ring-offset-2 ring-offset-[#070d1f]' : ''
                    }`}
                    style={{ 
                      background: isDone ? C.low : isActive ? C.accent : '#162840',
                      color: isDone || isActive ? '#050a18' : C.muted
                    }}
                  >
                    {isDone ? '✓' : s.num}
                  </div>
                  <span 
                    className="text-xs font-bold transition-colors"
                    style={{ color: isActive ? '#fff' : isDone ? C.text : C.muted }}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className="flex-1 h-[2px] mx-4 rounded-full" style={{ background: isDone ? C.low : C.border }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* STEP 1: Governance & Metadata */}
          {currentWizardStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl" style={{ background: '#00c2c715', border: `1px solid ${C.accent}44` }}>
                <div className="text-xs font-bold" style={{ color: C.accent }}>📋 Governance & Document Parameters</div>
                <div className="text-xs mt-1 text-slate-300">Set the metadata, owner, versioning, and authorization rules for this ISO policy document.</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Document Title</label>
                  <input 
                    type="text" 
                    value={docMeta.title} 
                    onChange={e => setDocMeta({ ...docMeta, title: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Document Identifier Code</label>
                  <input 
                    type="text" 
                    value={docMeta.docId} 
                    onChange={e => setDocMeta({ ...docMeta, docId: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Initial Version</label>
                  <input 
                    type="text" 
                    value={docMeta.version} 
                    onChange={e => setDocMeta({ ...docMeta, version: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Security Classification</label>
                  <select 
                    value={docMeta.classification} 
                    onChange={e => setDocMeta({ ...docMeta, classification: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none cursor-pointer"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  >
                    <option value="Confidential">Confidential (Restricted Access)</option>
                    <option value="Internal Use Only">Internal Use Only</option>
                    <option value="Restricted">Restricted (Executive Only)</option>
                    <option value="Public">Public Statement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Document Owner / Author</label>
                  <input 
                    type="text" 
                    value={docMeta.owner} 
                    onChange={e => setDocMeta({ ...docMeta, owner: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Reviewing Roles</label>
                  <input 
                    type="text" 
                    value={docMeta.reviewers} 
                    onChange={e => setDocMeta({ ...docMeta, reviewers: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Executive Approver</label>
                  <input 
                    type="text" 
                    value={docMeta.approver} 
                    onChange={e => setDocMeta({ ...docMeta, approver: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Review Frequency</label>
                  <select 
                    value={docMeta.reviewCycle} 
                    onChange={e => setDocMeta({ ...docMeta, reviewCycle: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none cursor-pointer"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  >
                    <option value="6 Months">Every 6 Months</option>
                    <option value="12 Months">Annual (12 Months)</option>
                    <option value="24 Months">Every 2 Years</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Org Scope & Context */}
          {currentWizardStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl" style={{ background: '#00c2c715', border: `1px solid ${C.accent}44` }}>
                <div className="text-xs font-bold" style={{ color: C.accent }}>🏢 Organization Context & Tailoring</div>
                <div className="text-xs mt-1 text-slate-300">Customize organization details to auto-populate terms throughout the document text.</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Legal Organization Name</label>
                  <input 
                    type="text" 
                    value={orgContext.orgName} 
                    onChange={e => setOrgContext({ ...orgContext, orgName: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Industry & Business Activity</label>
                  <input 
                    type="text" 
                    value={orgContext.industry} 
                    onChange={e => setOrgContext({ ...orgContext, industry: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>ISMS Scope & Boundaries</label>
                  <textarea 
                    value={orgContext.scope} 
                    onChange={e => setOrgContext({ ...orgContext, scope: e.target.value })}
                    rows={3}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none resize-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Primary Covered Information Assets</label>
                  <input 
                    type="text" 
                    value={orgContext.coveredAssets} 
                    onChange={e => setOrgContext({ ...orgContext, coveredAssets: e.target.value })}
                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                    style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={applyOrgParameters}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold transition hover:brightness-110 flex items-center gap-2"
                  style={{ background: C.accent, color: '#050a18' }}
                >
                  ⚡ Auto-fill Organization Parameters into Document Sections
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Interactive Section Editor */}
          {currentWizardStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#00c2c715', border: `1px solid ${C.accent}44` }}>
                <div>
                  <div className="text-xs font-bold" style={{ color: C.accent }}>✍️ ISO 27001 Document Section Editor</div>
                  <div className="text-xs mt-0.5 text-slate-300">Customize each mandatory policy section to match your organization's exact security practices.</div>
                </div>
                <button 
                  onClick={applyOrgParameters}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg transition hover:bg-white/10"
                  style={{ border: `1px solid ${C.accent}`, color: C.accent }}
                >
                  Auto-fill Terms
                </button>
              </div>

              <div className="grid grid-cols-4 gap-6 items-start">
                {/* Section Navigation Column */}
                <div className="col-span-1 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider px-1 mb-2" style={{ color: C.muted }}>SECTIONS</div>
                  {sections.map(sec => {
                    const isSelected = sec.id === activeSectionId;
                    return (
                      <button 
                        key={sec.id}
                        onClick={() => setActiveSectionId(sec.id)}
                        className={`w-full text-left text-xs font-bold p-3 rounded-xl transition ${
                          isSelected ? 'shadow-md' : 'hover:bg-white/5'
                        }`}
                        style={{ 
                          background: isSelected ? C.accent : 'transparent',
                          color: isSelected ? '#050a18' : C.text,
                          border: `1px solid ${isSelected ? C.accent : C.border}`
                        }}
                      >
                        {sec.name}
                      </button>
                    );
                  })}
                </div>

                {/* Section Content Column */}
                <div className="col-span-3 space-y-4">
                  {sections.map(sec => {
                    if (sec.id !== activeSectionId) return null;
                    return (
                      <div key={sec.id} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Section Title</label>
                          <input 
                            type="text" 
                            value={sec.name} 
                            onChange={e => {
                              const newTitle = e.target.value;
                              setSections(prev => prev.map(s => s.id === sec.id ? { ...s, name: newTitle } : s));
                            }}
                            className="w-full text-xs font-semibold px-4 py-3 rounded-xl outline-none"
                            style={{ background: '#060c19', border: `1px solid ${C.border}`, color: '#fff' }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Section Content & ISO Guidance</label>
                          <textarea 
                            value={sec.content} 
                            onChange={e => {
                              const newContent = e.target.value;
                              setSections(prev => prev.map(s => s.id === sec.id ? { ...s, content: newContent } : s));
                            }}
                            rows={10}
                            className="w-full text-xs font-mono leading-relaxed p-4 rounded-xl outline-none resize-y"
                            style={{ background: '#040813', border: `1px solid ${C.border}`, color: '#e2e8f0' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Sign-Off */}
          {currentWizardStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl" style={{ background: '#00c2c715', border: `1px solid ${C.accent}44` }}>
                <div className="text-xs font-bold" style={{ color: C.accent }}>✅ Compliance Verification & Executive Sign-Off</div>
                <div className="text-xs mt-1 text-slate-300">Complete the mandatory ISO audit checklist before finalizing and publishing this document.</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-2xl p-6 space-y-4" style={{ background: '#060c19', border: `1px solid ${C.border}` }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">ISO 27001 Compliance Checklist</h3>

                  {[
                    { key: 'isoAligned', label: 'Document content fully satisfies ISO 27001 requirement clauses' },
                    { key: 'rolesAssigned', label: `Document Owner (${docMeta.owner}) and Reviewers assigned` },
                    { key: 'approverReviewed', label: `Executive Approver (${docMeta.approver}) authorization confirmed` },
                    { key: 'stakeholderCommunicated', label: 'Document ready for distribution to workforce stakeholders' },
                  ].map(item => (
                    <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={checklists[item.key]} 
                        onChange={e => setChecklists({ ...checklists, [item.key]: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded accent-[#00c2c7] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-white">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="rounded-2xl p-6 space-y-4" style={{ background: '#060c19', border: `1px solid ${C.border}` }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Publication Status</h3>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Set Document Status</label>
                    <select 
                      value={docMeta.status} 
                      onChange={e => setDocMeta({ ...docMeta, status: e.target.value })}
                      className="w-full text-xs font-bold px-4 py-3 rounded-xl outline-none cursor-pointer"
                      style={{ 
                        background: docMeta.status === 'completed' ? '#06d6a020' : '#ffd16620',
                        color: docMeta.status === 'completed' ? '#06d6a0' : '#ffd166',
                        border: `1px solid ${docMeta.status === 'completed' ? '#06d6a0' : '#ffd166'}44`
                      }}
                    >
                      <option value="completed">Completed & Approved (Official)</option>
                      <option value="in_progress">In Progress (Draft Review)</option>
                      <option value="not_started">Not Started</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Reviewer / Auditor Notes</label>
                    <textarea 
                      value={docMeta.notes} 
                      onChange={e => setDocMeta({ ...docMeta, notes: e.target.value })}
                      rows={3}
                      placeholder="Add any audit notes, policy exceptions, or implementation remarks..."
                      className="w-full text-xs font-semibold p-3 rounded-xl outline-none resize-none"
                      style={{ background: '#040813', border: `1px solid ${C.border}`, color: '#fff' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Export & Final Preview */}
          {currentWizardStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#00c2c715', border: `1px solid ${C.accent}44` }}>
                <div>
                  <div className="text-xs font-bold" style={{ color: C.accent }}>🎉 Final Document Preview & Save</div>
                  <div className="text-xs mt-0.5 text-slate-300">Review your generated ISO 27001 document below. Save directly to your implementation audit record.</div>
                </div>

                <button 
                  onClick={handleDownloadMarkdown}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition hover:bg-white/10 flex items-center gap-2"
                  style={{ border: `1px solid ${C.accent}`, color: C.accent }}
                >
                  📥 Download (.md)
                </button>
              </div>

              {/* Document Preview Box */}
              <div 
                className="p-6 rounded-2xl max-h-96 overflow-y-auto space-y-4 text-xs leading-relaxed font-sans"
                style={{ background: '#040813', border: `1px solid ${C.border}`, color: '#e2e8f0' }}
              >
                <div className="border-b pb-4 mb-4 border-slate-800 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00c2c7]">{docMeta.docId}</span>
                    <h1 className="text-xl font-bold text-white mt-1">{docMeta.title}</h1>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase" style={{ background: '#06d6a020', color: '#06d6a0' }}>
                    {docMeta.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-slate-400 bg-slate-900/50 p-4 rounded-xl">
                  <div><strong className="text-slate-200">Owner:</strong> {docMeta.owner}</div>
                  <div><strong className="text-slate-200">Approver:</strong> {docMeta.approver}</div>
                  <div><strong className="text-slate-200">Version:</strong> {docMeta.version}</div>
                  <div><strong className="text-slate-200">Classification:</strong> {docMeta.classification}</div>
                </div>

                {sections.map(s => (
                  <div key={s.id} className="pt-3 border-t border-slate-800/60">
                    <h3 className="font-bold text-white text-sm mb-1.5">{s.name}</h3>
                    <p className="text-slate-300 whitespace-pre-wrap">{s.content.replace(/\{ORG_NAME\}/g, orgContext.orgName)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-8 py-4 border-t" style={{ borderColor: C.border, background: '#081020' }}>
          <button 
            onClick={() => setCurrentWizardStep(prev => Math.max(1, prev - 1))}
            disabled={currentWizardStep === 1}
            className="px-5 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-30"
            style={{ background: '#162840', color: C.text }}
          >
            ← Previous Step
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold transition hover:bg-white/5"
              style={{ color: C.muted }}
            >
              Cancel
            </button>

            {currentWizardStep < 5 ? (
              <button 
                onClick={() => setCurrentWizardStep(prev => Math.min(5, prev + 1))}
                className="px-6 py-2.5 rounded-xl text-xs font-bold transition hover:brightness-110"
                style={{ background: C.accent, color: '#050a18' }}
              >
                Next Step →
              </button>
            ) : (
              <button 
                onClick={() => handleSaveDocument(true)}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold transition hover:brightness-110 flex items-center gap-2 shadow-lg"
                style={{ background: C.low, color: '#050a18' }}
              >
                {saving ? 'Saving...' : '💾 Save & Complete Step'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
