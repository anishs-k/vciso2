import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { FRAMEWORK_CATALOG } from './frameworkCatalog';
import { scopeEvidencesToFramework, scopeStepsToFramework } from '../frameworkScope';
import isoQuestionnaireData from '../../data/iso27001_questionnaire.json';
import dpdpQuestionnaireData from '../../data/dpdp_questionnaire.json';
import CSPMAssessmentView from './CSPMAssessmentView';
import { th, isDark } from '../../theme';

// ISO 27001 Implementation Steps & Requirement Mappings
export const ALL_STEPS = [
  // ── 1. Project Preparation ────────────────────────────────────────────────
  {
    id: 'step-1',
    num: 1,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'Introduction to the ISO 27001 implementation process',
    requirements: 'clause 4',
    workload: '1 hour for reading the text',
    duration: '1 day',
    why: 'This text will introduce you to the process of ISO 27001 implementation, explaining the steps you will have to take and how you will be guided through this process.',
    isMandatory: false,
    mandatoryText: 'Not mandatory (Introductory reading)',
    interval: '',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-2',
    num: 2,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'Procedure for document and record control',
    requirements: 'clause 7.5',
    workload: '30 minutes for writing the document and 1 hour for reviewing and approving it.',
    duration: '1 days',
    why: 'This document is not mandatory, but it is suggested for your company size.',
    isMandatory: false,
    mandatoryText: 'This document is not mandatory, but it is suggested for your company size.',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-3',
    num: 3,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'Project plan',
    requirements: 'Not required by the standard',
    workload: '1 hour for writing the document and 1 hour for reviewing and approving it.',
    duration: '1 day',
    why: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    isMandatory: false,
    mandatoryText: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-4',
    num: 4,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'Procedure for identification of requirements',
    requirements: 'clause 4.2 and control A.5.31',
    workload: '30 minutes for writing the document and 1 hour for reviewing and approving it.',
    duration: '1 day',
    why: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    isMandatory: false,
    mandatoryText: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-5',
    num: 5,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'Register of requirements',
    requirements: 'clause 4.2 and control A.5.31',
    workload: '2 hours for filling out the register and 1 hour for reviewing and approving.',
    duration: '2 days',
    why: 'This register is mandatory.',
    isMandatory: true,
    mandatoryText: 'This register is mandatory.',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-6',
    num: 6,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'ISMS scope document',
    requirements: 'clause 4.3',
    workload: '1 hour for writing the document and 1 hour for reviewing and approving it.',
    duration: '1 day',
    why: 'This document is mandatory',
    isMandatory: true,
    mandatoryText: 'This document is mandatory',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-7',
    num: 7,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'Information security policy',
    requirements: 'clauses 5.2 and 5.3',
    workload: '1 hour for writing the document and 1 hour for reviewing and approving it.',
    duration: '1 days',
    why: 'This document is mandatory',
    isMandatory: true,
    mandatoryText: 'This document is mandatory',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-8',
    num: 8,
    phase: 1,
    phaseTitle: '1. Project Preparation',
    title: 'Information security awareness',
    requirements: 'clause 7.3 and control A.6.3',
    workload: '1 hour for planning awareness activities',
    duration: '1 day',
    why: 'Raising security awareness across all personnel who will be involved in your ISO 27001 project is mandatory.',
    isMandatory: true,
    mandatoryText: 'This step is mandatory.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },

  // ── 2. Risk Management ────────────────────────────────────────────────────
  {
    id: 'step-9',
    num: 9,
    phase: 2,
    phaseTitle: '2. Risk Management',
    title: 'Risk assessment and risk treatment methodology',
    requirements: 'clauses 6.1, 8.2, and 8.3',
    workload: '1 hour for writing the document and 1 hour for reviewing and approving it.',
    duration: '2 days',
    why: 'This document is mandatory',
    isMandatory: true,
    mandatoryText: 'This document is mandatory',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-10',
    num: 10,
    phase: 2,
    phaseTitle: '2. Risk Management',
    title: 'Risk register',
    requirements: 'clauses 6.1, 8.2, and 8.3',
    workload: '4 hours for filling out the register and 2 hours for review and approval',
    duration: '4 days',
    why: 'This register is mandatory',
    isMandatory: true,
    mandatoryText: 'This register is mandatory',
    interval: '6 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-11',
    num: 11,
    phase: 2,
    phaseTitle: '2. Risk Management',
    title: 'Statement of Applicability',
    requirements: 'clauses 6.1.3 d), 6.1.3 e), 6.2, and 8.3',
    workload: '4 hours for filling out the register and 1 hour for reviewing and approving it.',
    duration: '2 days',
    why: 'This module is mandatory',
    isMandatory: true,
    mandatoryText: 'This module is mandatory',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },

  // ── 3. Security Documentation ─────────────────────────────────────────────
  {
    id: 'step-12',
    num: 12,
    phase: 3,
    phaseTitle: '3. Security Documentation',
    title: 'IT Security Policy',
    requirements: 'controls A.5.9, A.5.10, A.5.11, A.5.14, A.5.17, A.5.32, A.6.7, A.7.7, A.7.9, A.7.10, A.8.1, A.8.7, A.8.13, A.8.19 and A.8.23',
    workload: '1 hour for writing the document and 1 hour for reviewing and approving it.',
    duration: '2 days',
    why: 'This document is mandatory, as you specified in the Statement of Applicability',
    isMandatory: true,
    mandatoryText: 'This document is mandatory, as you specified in the Statement of Applicability',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },

  // ── 4. Preparation for the External Audit ─────────────────────────────────
  {
    id: 'step-13',
    num: 13,
    phase: 4,
    phaseTitle: '4. Preparation for the External Audit',
    title: 'Procedure for Nonconformities and Corrective actions',
    requirements: 'clauses 10.1 and 10.2',
    workload: '30 minutes for writing the document and 1 hour for reviewing and approving it.',
    duration: '1 day',
    why: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    isMandatory: false,
    mandatoryText: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-14',
    num: 14,
    phase: 4,
    phaseTitle: '4. Preparation for the External Audit',
    title: 'Internal audit procedure',
    requirements: 'clause 9.2',
    workload: '30 minutes for writing the document and 1 hour for reviewing and approving it.',
    duration: '1 day',
    why: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    isMandatory: false,
    mandatoryText: 'This document is not mandatory, so if you do not see a benefit in using it, you can skip it.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-15',
    num: 15,
    phase: 4,
    phaseTitle: '4. Preparation for the External Audit',
    title: 'Initial training plan',
    requirements: 'clause 7.2 and control A.6.3',
    workload: '30 minutes',
    duration: '1 day',
    why: 'Planning and performing the trainings is mandatory',
    isMandatory: true,
    mandatoryText: 'Planning and performing the trainings is mandatory',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-16',
    num: 16,
    phase: 4,
    phaseTitle: '4. Preparation for the External Audit',
    title: 'Setting up security objectives',
    requirements: 'clauses 6.2 and 9.1',
    workload: '30 minutes for defining objectives, 1 hour for approving them',
    duration: '1 day',
    why: 'Setting up measurable security objectives and monitoring them is mandatory.',
    isMandatory: true,
    mandatoryText: 'This step is mandatory.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-17',
    num: 17,
    phase: 4,
    phaseTitle: '4. Preparation for the External Audit',
    title: 'Setting up management review',
    requirements: 'clauses 5.1, 5.3, and 9.3',
    workload: '30 minutes for setting up the review',
    duration: '1 day',
    why: 'Conducting and documenting management reviews is mandatory.',
    isMandatory: true,
    mandatoryText: 'This step is mandatory.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-18',
    num: 18,
    phase: 4,
    phaseTitle: '4. Preparation for the External Audit',
    title: 'Internal Audit',
    requirements: 'clauses 9.2 and 10.1',
    workload: '8 hours for performing the audit, 1 hour for reviewing and approving the report.',
    duration: '1 day',
    why: 'Conducting internal audits prior to certification is mandatory.',
    isMandatory: true,
    mandatoryText: 'This step is mandatory.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },
  {
    id: 'step-19',
    num: 19,
    phase: 4,
    phaseTitle: '4. Preparation for the External Audit',
    title: 'First official management review',
    requirements: 'clauses 5.1, 9.3, 10.1, and 10.2',
    workload: '1 hour for doing the review',
    duration: '1 day',
    why: 'Top management evaluation and review of the ISMS is mandatory.',
    isMandatory: true,
    mandatoryText: 'This step is mandatory.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  },

  // ── 5. ISMS Maintenance ───────────────────────────────────────────────────
  {
    id: 'step-20',
    num: 20,
    phase: 5,
    phaseTitle: '5. ISMS Maintenance & certification cycle',
    title: 'Maintenance module',
    requirements: 'clauses 9.1, 9.2, 9.3, 10.1, and 10.2',
    workload: 'Ongoing annual monitoring',
    duration: 'Ongoing',
    why: 'Continuous monitoring, surveillance audits, and 3-year certification renewal cycle.',
    isMandatory: true,
    mandatoryText: 'This step is mandatory for ISO 27001 maintenance.',
    interval: '12 months',
    suggestedReviewers: '',
    suggestedApprovers: ''
  }
];

export const CLAUSES_LIST = [
  {
    id: '4', name: '4 Context of the organization', isParent: true, subClauses: [
      { id: '4.1', name: '4.1 Understanding the organization and its context', requirements: 'clause 4.1', docs: ['Context Analysis & Issues Register'], evidence: ['Context Register', 'Internal & External Issues Map'] },
      { id: '4.2', name: '4.2 Understanding the needs and expectations of interested parties', requirements: 'clause 4.2 and control A.5.31', docs: ['Procedure for identification of requirements', 'Register of Requirements'], evidence: ['Interested Parties List', 'Compliance Requirements Map'] },
      { id: '4.3', name: '4.3 Determining the scope of the information security management system', requirements: 'clause 4.3', docs: ['ISMS Scope Document'], evidence: ['Scope Document Approved', 'Network & Office Perimeter Map'] },
      { id: '4.4', name: '4.4 Information security management system', requirements: 'clause 4.4', docs: ['ISMS Process Map'], evidence: ['Management Review & Process Records'] }
    ]
  },
  {
    id: '5', name: '5 Leadership', isParent: true, subClauses: [
      { id: '5.1', name: '5.1 Leadership and commitment', requirements: 'clause 5.1', docs: ['Management Directives'], evidence: ['Executive Board Resolution', 'Security Resource Allocation'] },
      { id: '5.2', name: '5.2 Policy', requirements: 'clause 5.2 and control A.5.1', docs: ['Information Security Policy'], evidence: ['Signed Security Policy v1.0', 'Staff Acknowledgement Receipts'] },
      { id: '5.3', name: '5.3 Organizational roles, responsibilities and authorities', requirements: 'clause 5.3 and control A.5.2', docs: ['Roles & Responsibilities Matrix'], evidence: ['RACI Matrix', 'Security Officer Appointment Letter'] }
    ]
  },
  {
    id: '6', name: '6 Planning', isParent: true, subClauses: [
      { id: '6.1.1', name: '6.1.1 General', requirements: 'clause 6.1.1', docs: ['Risk & Opportunity Assessment'], evidence: ['Risk Treatment Methodology'] },
      { id: '6.1.2', name: '6.1.2 Information security risk assessment', requirements: 'clauses 6.1.2, 8.2 and controls A.5.8, A.8.8', docs: ['Risk assessment and risk treatment methodology', 'Risk register'], evidence: ['Risk Register Approved', 'Threat & Vulnerability Scoring'] },
      { id: '6.1.3', name: '6.1.3 Information security risk treatment', requirements: 'clauses 6.1.3 d), 6.1.3 e), 6.2, and 8.3', docs: ['Risk Treatment Plan', 'Statement of Applicability'], evidence: ['Statement of Applicability v1.0 Approved'] },
      { id: '6.2', name: '6.2 Information security objectives and planning to achieve them', requirements: 'clauses 6.2 and 9.1', docs: ['Security Objectives Register'], evidence: ['Security Objectives KPI Log'] },
      { id: '6.3', name: '6.3 Planning of changes', requirements: 'clause 6.3 and control A.8.32', docs: ['Change Management Procedure'], evidence: ['Change Advisory Board Minutes'] }
    ]
  },
  {
    id: '7', name: '7 Support', isParent: true, subClauses: [
      { id: '7.1', name: '7.1 Resources', requirements: 'clause 7.1', docs: ['Resource Planning Sheet'], evidence: ['Security Budget Approval'] },
      { id: '7.2', name: '7.2 Competence', requirements: 'clause 7.2 and control A.6.3', docs: ['Initial training plan'], evidence: ['Staff Security Training Records'] },
      { id: '7.3', name: '7.3 Awareness', requirements: 'clause 7.3 and control A.6.3', docs: ['Information security awareness program'], evidence: ['Phishing Simulation Report', 'Awareness Campaign Attendance'] },
      { id: '7.4', name: '7.4 Communication', requirements: 'clause 7.4', docs: ['Communication Matrix'], evidence: ['External Communication Log'] },
      { id: '7.5', name: '7.5 Documented information', requirements: 'clause 7.5 and controls A.5.32, A.5.33', docs: ['Procedure for document and record control'], evidence: ['Document Master List', 'Retention Schedule'] }
    ]
  },
  {
    id: '8', name: '8 Operation', isParent: true, subClauses: [
      { id: '8.1', name: '8.1 Operational planning and control', requirements: 'clause 8.1', docs: ['Operational SOPs'], evidence: ['Standard Operating Procedures'] },
      { id: '8.2', name: '8.2 Information security risk assessment', requirements: 'clause 8.2', docs: ['Risk Assessment Records'], evidence: ['Periodic Risk Review Log'] },
      { id: '8.3', name: '8.3 Information security risk treatment', requirements: 'clause 8.3', docs: ['Risk Treatment Execution Records'], evidence: ['Treatment Implementation Tickets'] }
    ]
  },
  {
    id: '9', name: '9 Performance evaluation', isParent: true, subClauses: [
      { id: '9.1', name: '9.1 Monitoring, measurement, analysis and evaluation', requirements: 'clause 9.1', docs: ['Security KPI Metric Reports'], evidence: ['Monthly Vulnerability & Incident Report'] },
      { id: '9.2', name: '9.2 Internal audit', requirements: 'clause 9.2', docs: ['Internal audit procedure', 'Internal Audit Report'], evidence: ['Pre-audit Checklist', 'Internal Audit Findings Log'] },
      { id: '9.3', name: '9.3 Management review', requirements: 'clause 9.3', docs: ['Setting up management review', 'First official management review minutes'], evidence: ['Management Review Meeting Minutes'] }
    ]
  },
  {
    id: '10', name: '10 Improvement', isParent: true, subClauses: [
      { id: '10.1', name: '10.1 Continual improvement', requirements: 'clause 10.1', docs: ['Continual Improvement Register'], evidence: ['ISMS Maturity Evaluation'] },
      { id: '10.2', name: '10.2 Nonconformity and corrective action', requirements: 'clauses 10.1, 10.2 and controls A.5.24, A.5.28', docs: ['Procedure for Nonconformities and Corrective actions'], evidence: ['CAPA Action Log', 'Incident Remediation Tickets'] }
    ]
  }
];

// ─── DPDP ACT 2023 IMPLEMENTATION STEPS ──────────────────────────────────────────
export const DPDP_STEPS = [
  // ── 1. Governance & Scope Determination ──────────────────────────────────────
  {
    id: 'dpdp-step-1',
    num: 1,
    phase: 1,
    phaseTitle: '1. Governance & Scope Determination',
    title: 'DPDP Applicability & Exclusions Assessment',
    requirements: 'Section 3 and Section 17',
    workload: '2 hours for documenting processing activities and statutory exclusions.',
    duration: '2 days',
    why: 'Determining whether your digital processing operations fall under the DPDP Act and documenting any statutory exclusions is mandatory.',
    isMandatory: true,
    mandatoryText: 'This assessment is mandatory to establish compliance boundaries.',
    interval: '12 months',
    suggestedReviewers: 'Legal Counsel / Privacy Lead',
    suggestedApprovers: 'CEO / Board of Directors'
  },
  {
    id: 'dpdp-step-2',
    num: 2,
    phase: 1,
    phaseTitle: '1. Governance & Scope Determination',
    title: 'Data Protection Officer (DPO) & Privacy Governance',
    requirements: 'Section 10(2)(a) and Section 8(9)',
    workload: '1 hour for role description and appointment charter.',
    duration: '1 day',
    why: 'Appointing a DPO based in India and establishing a privacy governance reporting line is required for Significant Data Fiduciaries and good corporate governance.',
    isMandatory: true,
    mandatoryText: 'This charter and formal appointment is mandatory.',
    interval: '12 months',
    suggestedReviewers: 'Head of HR / Legal',
    suggestedApprovers: 'Board of Directors'
  },
  {
    id: 'dpdp-step-3',
    num: 3,
    phase: 1,
    phaseTitle: '1. Governance & Scope Determination',
    title: 'Personal Data Inventory & RoPA (Record of Processing Activities)',
    requirements: 'Section 4, Section 8(1), and Rule 3',
    workload: '4 hours for mapping all digital personal data touchpoints and processing purposes.',
    duration: '3 days',
    why: 'Maintaining an accurate inventory of all personal data collected, stored, processed, and shared is mandatory.',
    isMandatory: true,
    mandatoryText: 'This register is mandatory for operational compliance.',
    interval: '6 months',
    suggestedReviewers: 'Data Protection Officer / IT Lead',
    suggestedApprovers: 'CTO / vCISO'
  },
  {
    id: 'dpdp-step-4',
    num: 4,
    phase: 1,
    phaseTitle: '1. Governance & Scope Determination',
    title: 'Digital Personal Data Protection Policy',
    requirements: 'Section 8(1) and Rule 3',
    workload: '2 hours for drafting the master privacy policy.',
    duration: '2 days',
    why: 'A comprehensive internal and external privacy policy aligned with DPDP 2023 principles is mandatory.',
    isMandatory: true,
    mandatoryText: 'This policy is mandatory.',
    interval: '12 months',
    suggestedReviewers: 'Legal / vCISO',
    suggestedApprovers: 'Executive Committee / CEO'
  },

  // ── 2. Notice, Consent & Lawful Processing ──────────────────────────────────
  {
    id: 'dpdp-step-5',
    num: 5,
    phase: 2,
    phaseTitle: '2. Notice, Consent & Lawful Processing',
    title: 'Itemised Notice & Consent Architecture',
    requirements: 'Section 5, Section 6, and Rule 3',
    workload: '3 hours for drafting multilingual notice templates and consent flows.',
    duration: '3 days',
    why: 'Providing an itemised notice in English and scheduled Indian languages specifying personal data and purpose is mandatory before requesting consent.',
    isMandatory: true,
    mandatoryText: 'This notice architecture is mandatory.',
    interval: '6 months',
    suggestedReviewers: 'Product Lead / Legal',
    suggestedApprovers: 'DPO / vCISO'
  },
  {
    id: 'dpdp-step-6',
    num: 6,
    phase: 2,
    phaseTitle: '2. Notice, Consent & Lawful Processing',
    title: 'Consent Management & Withdrawal Architecture',
    requirements: 'Section 6(7)-(9) and Rule 4',
    workload: '3 hours for consent capture, logging, and withdrawal workflow implementation.',
    duration: '3 days',
    why: 'Data Principals must have an easy, accessible mechanism to withdraw consent at any time with comparable ease to giving consent.',
    isMandatory: true,
    mandatoryText: 'This workflow is mandatory under Section 6.',
    interval: '6 months',
    suggestedReviewers: 'Engineering Lead',
    suggestedApprovers: 'DPO / CTO'
  },
  {
    id: 'dpdp-step-7',
    num: 7,
    phase: 2,
    phaseTitle: '2. Notice, Consent & Lawful Processing',
    title: 'Legitimate Uses & Employment Data Processing Register',
    requirements: 'Section 7',
    workload: '2 hours for documenting legitimate use grounds (employment, state services, medical emergencies).',
    duration: '2 days',
    why: 'Documenting the legal basis when relying on legitimate uses instead of consent is mandatory.',
    isMandatory: true,
    mandatoryText: 'This register is mandatory.',
    interval: '12 months',
    suggestedReviewers: 'HR Lead / Legal',
    suggestedApprovers: 'DPO'
  },

  // ── 3. Data Principal Rights & Safeguards ───────────────────────────────────
  {
    id: 'dpdp-step-8',
    num: 8,
    phase: 3,
    phaseTitle: '3. Data Principal Rights & Safeguards',
    title: 'Data Principal Rights Handling Procedure (Access, Correction, Erasure)',
    requirements: 'Section 11, Section 12, and Rule 6',
    workload: '3 hours for DSAR portal configuration and fulfillment workflows.',
    duration: '2 days',
    why: 'Establishing mechanisms to fulfill Data Principal rights within statutory timelines is mandatory.',
    isMandatory: true,
    mandatoryText: 'This procedure is mandatory.',
    interval: '6 months',
    suggestedReviewers: 'Operations / Customer Support Lead',
    suggestedApprovers: 'DPO'
  },
  {
    id: 'dpdp-step-9',
    num: 9,
    phase: 3,
    phaseTitle: '3. Data Principal Rights & Safeguards',
    title: 'Grievance Redressal Mechanism & Escalation Protocol',
    requirements: 'Section 13 and Rule 7',
    workload: '2 hours for setting up grievance submission channels and escalation SLA matrix.',
    duration: '2 days',
    why: 'Providing an easily accessible grievance redressal mechanism before complaints reach the Data Protection Board of India is mandatory.',
    isMandatory: true,
    mandatoryText: 'This mechanism is mandatory under Section 13.',
    interval: '6 months',
    suggestedReviewers: 'Customer Support Lead / Legal',
    suggestedApprovers: 'DPO'
  },
  {
    id: 'dpdp-step-10',
    num: 10,
    phase: 3,
    phaseTitle: '3. Data Principal Rights & Safeguards',
    title: 'Processing Personal Data of Children & Persons with Disabilities',
    requirements: 'Section 9 and Rule 11',
    workload: '2 hours for age-verification mechanism and verifiable parental consent workflow.',
    duration: '2 days',
    why: 'Verifiable parental consent and prohibition of behavioral tracking of children is mandatory.',
    isMandatory: true,
    mandatoryText: 'This policy and technical verification is mandatory.',
    interval: '6 months',
    suggestedReviewers: 'Product / Engineering Lead',
    suggestedApprovers: 'DPO / Legal'
  },
  {
    id: 'dpdp-step-11',
    num: 11,
    phase: 3,
    phaseTitle: '3. Data Principal Rights & Safeguards',
    title: 'Data Retention & Automated Erasure Protocol',
    requirements: 'Section 8(7)-(8) and Rule 8',
    workload: '2 hours for setting retention timelines and automated database deletion triggers.',
    duration: '2 days',
    why: 'Personal data must be erased as soon as the purpose of collection is achieved or consent is withdrawn.',
    isMandatory: true,
    mandatoryText: 'This retention and erasure protocol is mandatory.',
    interval: '6 months',
    suggestedReviewers: 'Database Admin / IT Lead',
    suggestedApprovers: 'CTO / vCISO'
  },

  // ── 4. Security Safeguards & Incident Management ───────────────────────────
  {
    id: 'dpdp-step-12',
    num: 12,
    phase: 4,
    phaseTitle: '4. Security Safeguards & Incident Management',
    title: 'Reasonable Technical & Organisational Security Safeguards',
    requirements: 'Section 8(5)',
    workload: '3 hours for documenting encryption, access control, and endpoint security controls.',
    duration: '3 days',
    why: 'Implementing reasonable security safeguards to prevent personal data breaches is a core mandatory statutory requirement.',
    isMandatory: true,
    mandatoryText: 'This security framework is mandatory under Section 8(5).',
    interval: '6 months',
    suggestedReviewers: 'Security Engineering Lead',
    suggestedApprovers: 'vCISO'
  },
  {
    id: 'dpdp-step-13',
    num: 13,
    phase: 4,
    phaseTitle: '4. Security Safeguards & Incident Management',
    title: 'Personal Data Breach Response & DPBI Notification Protocol',
    requirements: 'Section 8(6) and Rule 7',
    workload: '2 hours for breach classification, Board notification templates, and user alerts.',
    duration: '2 days',
    why: 'Immediate notification of every personal data breach to the Data Protection Board of India and affected Data Principals is mandatory.',
    isMandatory: true,
    mandatoryText: 'This breach notification protocol is mandatory under Section 8(6).',
    interval: '6 months',
    suggestedReviewers: 'Incident Response Team / Legal',
    suggestedApprovers: 'vCISO / DPO'
  },
  {
    id: 'dpdp-step-14',
    num: 14,
    phase: 4,
    phaseTitle: '4. Security Safeguards & Incident Management',
    title: 'Data Processor (Vendor) Due Diligence & Contractual Agreements (DPA)',
    requirements: 'Section 8(2)',
    workload: '2 hours for vendor risk assessments and DPA standard contractual clauses.',
    duration: '2 days',
    why: 'Processing personal data through third-party processors only under a valid contract is mandatory.',
    isMandatory: true,
    mandatoryText: 'This vendor management policy is mandatory.',
    interval: '6 months',
    suggestedReviewers: 'Procurement / Legal Lead',
    suggestedApprovers: 'vCISO / CFO'
  },
  {
    id: 'dpdp-step-15',
    num: 15,
    phase: 4,
    phaseTitle: '4. Security Safeguards & Incident Management',
    title: 'Cross-Border Personal Data Transfer Assessment',
    requirements: 'Section 16',
    workload: '1 hour for cross-border data transfer review and blacklisted jurisdiction check.',
    duration: '1 day',
    why: 'Ensuring personal data is not transferred to countries restricted by the Central Government is mandatory.',
    isMandatory: true,
    mandatoryText: 'This assessment is mandatory.',
    interval: '12 months',
    suggestedReviewers: 'Legal Counsel',
    suggestedApprovers: 'DPO / vCISO'
  },

  // ── 5. Continuous Privacy Assurance & Training ──────────────────────────────
  {
    id: 'dpdp-step-16',
    num: 16,
    phase: 5,
    phaseTitle: '5. Continuous Privacy Assurance & Training',
    title: 'Data Protection Impact Assessment (DPIA) & Periodic Audits',
    requirements: 'Section 10(2)(b)-(c)',
    workload: '3 hours for DPIA methodology and independent privacy audit planning.',
    duration: '3 days',
    why: 'Conducting periodic DPIAs and independent data audits is required for Significant Data Fiduciaries.',
    isMandatory: true,
    mandatoryText: 'This assessment protocol is mandatory for high-risk processing.',
    interval: '12 months',
    suggestedReviewers: 'External Privacy Auditor / DPO',
    suggestedApprovers: 'Board Audit Committee'
  },
  {
    id: 'dpdp-step-17',
    num: 17,
    phase: 5,
    phaseTitle: '5. Continuous Privacy Assurance & Training',
    title: 'Employee DPDP Awareness & Training Program',
    requirements: 'Section 8(1)',
    workload: '2 hours for training curriculum and staff completion tracking.',
    duration: '2 days',
    why: 'Staff awareness and regular training on handling digital personal data is a vital organizational safeguard.',
    isMandatory: true,
    mandatoryText: 'This training program is mandatory.',
    interval: '12 months',
    suggestedReviewers: 'HR Lead / Privacy Manager',
    suggestedApprovers: 'DPO / vCISO'
  },
  {
    id: 'dpdp-step-18',
    num: 18,
    phase: 5,
    phaseTitle: '5. Continuous Privacy Assurance & Training',
    title: 'DPDP Annual Compliance Review & Board Audit Sign-off',
    requirements: 'Section 8 and Section 10',
    workload: '3 hours for consolidating audit findings and management sign-off.',
    duration: '2 days',
    why: 'Annual compliance review and executive certification ensures ongoing adherence to DPDP Act regulations.',
    isMandatory: true,
    mandatoryText: 'This annual sign-off is mandatory.',
    interval: '12 months',
    suggestedReviewers: 'DPO / vCISO',
    suggestedApprovers: 'Board of Directors / CEO'
  }
];

// ─── DPDP ACT 2023 AUDIT & EVIDENCE SECTIONS ─────────────────────────────────
export const DPDP_SECTIONS_LIST = [
  {
    id: 'ch1',
    name: 'Chapter 1: Preliminary & Application',
    isParent: true,
    subClauses: [
      { id: 'S.3', name: 'Section 3: Application of the Act & Territorial Scope', requirements: 'Section 3 and Section 17', docs: ['DPDP Applicability & Exclusion Assessment'], evidence: ['Data Processing Inventory', 'Scope Confirmation'] },
      { id: 'S.4', name: 'Section 4: Grounds for Processing Digital Personal Data', requirements: 'Section 4', docs: ['Personal Data Inventory & RoPA'], evidence: ['Data Flow Maps', 'Processing Records'] }
    ]
  },
  {
    id: 'ch2',
    name: 'Chapter 2: Obligations of Data Fiduciary',
    isParent: true,
    subClauses: [
      { id: 'S.5', name: 'Section 5: Notice Requirements for Consent', requirements: 'Section 5 and Rule 3', docs: ['Itemised Notice & Multilingual Policy'], evidence: ['Notice Templates', 'Language Verification Records'] },
      { id: 'S.6', name: 'Section 6: Consent Architecture & Consent Managers', requirements: 'Section 6 and Rule 4', docs: ['Consent Management & Withdrawal Architecture'], evidence: ['Consent Logs', 'Consent Withdrawal Workflow Specs'] },
      { id: 'S.7', name: 'Section 7: Certain Legitimate Uses', requirements: 'Section 7', docs: ['Legitimate Uses & Employment Data Register'], evidence: ['Employment Processing Justification', 'Statutory Records'] },
      { id: 'S.8.1', name: 'Section 8(1)-(4): General Obligations & Data Processors', requirements: 'Section 8(1)-(4)', docs: ['Data Processor Contractual Agreement (DPA)'], evidence: ['Signed Processor Contracts', 'Vendor Audit Logs'] },
      { id: 'S.8.5', name: 'Section 8(5): Reasonable Security Safeguards', requirements: 'Section 8(5)', docs: ['Technical & Organisational Security Safeguards Policy'], evidence: ['Encryption Standards', 'Access Control Records', 'Security Audit Report'] },
      { id: 'S.8.6', name: 'Section 8(6): Personal Data Breach Notification', requirements: 'Section 8(6) and Rule 7', docs: ['Data Breach Notification & DPBI Protocol'], evidence: ['Incident Log', 'DPBI Notification Template'] },
      { id: 'S.8.7', name: 'Section 8(7)-(8): Data Retention & Erasure', requirements: 'Section 8(7)-(8) and Rule 8', docs: ['Data Retention & Automated Erasure Protocol'], evidence: ['Data Purging Logs', 'Disposal Records'] },
      { id: 'S.9', name: 'Section 9: Processing of Personal Data of Children & PwD', requirements: 'Section 9 and Rule 11', docs: ['Children Personal Data & Parental Consent Policy'], evidence: ['Age Verification System', 'Verifiable Consent Logs'] },
      { id: 'S.10', name: 'Section 10: Significant Data Fiduciary (SDF) Obligations', requirements: 'Section 10 and Rule 5', docs: ['DPO Appointment Charter & DPIA Procedure'], evidence: ['DPO Appointment Letter', 'Annual DPIA Audit Report'] }
    ]
  },
  {
    id: 'ch3',
    name: 'Chapter 3: Rights and Duties of Data Principal',
    isParent: true,
    subClauses: [
      { id: 'S.11', name: 'Section 11: Right to Access Information About Personal Data', requirements: 'Section 11 and Rule 6', docs: ['Data Principal Rights Handling Procedure'], evidence: ['DSAR Portal Specs', 'Completed DSAR Receipts'] },
      { id: 'S.12', name: 'Section 12: Right to Correction and Erasure', requirements: 'Section 12 and Rule 6', docs: ['Data Principal Rights Handling Procedure'], evidence: ['Correction & Erasure Tickets'] },
      { id: 'S.13', name: 'Section 13: Right of Grievance Redressal', requirements: 'Section 13 and Rule 7', docs: ['Grievance Redressal Mechanism & Protocol'], evidence: ['Grievance Portal', 'Resolution SLA Logs'] },
      { id: 'S.14', name: 'Section 14: Right to Nominate', requirements: 'Section 14', docs: ['Data Principal Nomination Procedure'], evidence: ['Nomination Registry Records'] }
    ]
  },
  {
    id: 'ch4',
    name: 'Chapter 4: Cross-Border Transfer & Continuous Compliance',
    isParent: true,
    subClauses: [
      { id: 'S.16', name: 'Section 16: Cross-Border Transfer of Personal Data', requirements: 'Section 16', docs: ['Cross-Border Data Transfer Assessment'], evidence: ['Country Whitelist/Blacklist Review', 'Transfer Authorizations'] },
      { id: 'S.18', name: 'Continuous Assurance: Privacy Training & Annual Sign-off', requirements: 'Section 8 and Section 10', docs: ['Employee DPDP Training Program', 'DPDP Annual Compliance Review'], evidence: ['Training Attendance Records', 'Board Audit Sign-off'] }
    ]
  }
];

// Overlays the clause / control / section text stored in Supabase
// (master_implementation_steps.requirements) onto a step catalogue. The
// shipped text is kept as defaultRequirements so obligation lookups and
// evidence already tagged with it keep resolving if the DB text changes.
export function applyDbStepRequirements(steps, dbCatalog) {
  const byId = {};
  (Array.isArray(dbCatalog) ? dbCatalog : []).forEach(row => {
    if (row && row.step_id && row.requirements != null && String(row.requirements).trim() !== '') {
      byId[row.step_id] = String(row.requirements).trim();
    }
  });
  return steps.map(s => (byId[s.id] && byId[s.id] !== s.requirements
    ? { ...s, requirements: byId[s.id], defaultRequirements: s.requirements }
    : s));
}

// Helper to format clauses to match reference style (e.g. "Clause 4.2 & A.5.31")
function formatClauseDisplay(req) {
  if (!req) return '';
  let s = req.trim();
  s = s.replace(/\bclause\b/gi, 'Clause');
  s = s.replace(/\bclauses\b/gi, 'Clauses');
  s = s.replace(/\band\s+control\b/gi, '&');
  s = s.replace(/\band\b/gi, '&');
  return s;
}

// Questionnaire Question Maps
const ISO_QUESTION_MAP = { qToRef: {}, refToQ: {} };
(isoQuestionnaireData?.questions || []).forEach(q => {
  if (q.id && q.reference) {
    ISO_QUESTION_MAP.qToRef[q.id.toLowerCase()] = q.reference;
    ISO_QUESTION_MAP.refToQ[q.reference.toLowerCase()] = q.id;
  }
});

const DPDP_QUESTION_MAP = { qToRef: {}, refToQ: {} };
(dpdpQuestionnaireData?.questions || []).forEach(q => {
  if (q.id && q.reference) {
    DPDP_QUESTION_MAP.qToRef[q.id.toLowerCase()] = q.reference;
    DPDP_QUESTION_MAP.refToQ[q.reference.toLowerCase()] = q.id;
  }
});

// Intelligent evidence resolver mapping clauses/controls/steps to uploaded evidence & gap analysis proofs
export function getEvidencesForItem(item, allEvidences = [], currentFramework = 'iso-27001') {
  if (!item || !allEvidences || allEvidences.length === 0) return [];

  const isDPDP = Boolean(currentFramework && String(currentFramework).toLowerCase().includes('dpdp'));
  const qMap = isDPDP ? DPDP_QUESTION_MAP : ISO_QUESTION_MAP;

  // Filter evidences strictly to the current framework to avoid cross-framework leakage
  const scopedEvidences = scopeEvidencesToFramework(allEvidences, currentFramework);

  if (scopedEvidences.length === 0) return [];

  const tokens = new Set();
  const prefixes = new Set();

  if (item.id) {
    const cleanId = String(item.id).trim().toLowerCase();
    tokens.add(cleanId);
    if (/^\d+\.\d+$/.test(cleanId) || /^s\.\d+/i.test(cleanId) || /^rule\s*\d+/i.test(cleanId)) prefixes.add(cleanId);
  }

  if (item.clause_number) {
    const cleanCl = String(item.clause_number).trim().toLowerCase();
    tokens.add(cleanCl);
    if (/^\d+\.\d+$/.test(cleanCl)) prefixes.add(cleanCl);
  }

  if (item.control_number) {
    const cleanCo = String(item.control_number).trim().toLowerCase();
    tokens.add(cleanCo);
  }

  if (item.control_id) {
    const cleanCId = String(item.control_id).trim().toLowerCase();
    tokens.add(cleanCId);
  }

  const reqStr = (item.requirements || '').toLowerCase();
  if (reqStr) {
    tokens.add(reqStr);
    const clauseMatches = reqStr.match(/\b\d+(?:\.\d+)*[a-z]?\b/g) || [];
    clauseMatches.forEach(c => {
      tokens.add(c.toLowerCase());
      if (/^\d+\.\d+$/.test(c)) prefixes.add(c.toLowerCase());
    });

    const controlMatches = reqStr.match(/\ba\.\d+(?:\.\d+)*\b/g) || [];
    controlMatches.forEach(c => tokens.add(c.toLowerCase()));

    const dpdpMatches = reqStr.match(/\b(?:s\.\d+(?:\(\d+\))*(?:-\(\d+\))*|section\s*\d+(?:\(\d+\))*|rule\s*\d+)\b/g) || [];
    dpdpMatches.forEach(d => {
      tokens.add(d.toLowerCase());
      const sNorm = d.toLowerCase().replace(/section\s*/g, 's.');
      tokens.add(sNorm);
    });
  }

  // Add question IDs mapped to these references using ONLY the framework's map
  tokens.forEach(tok => {
    const qId = qMap.refToQ[tok];
    if (qId) tokens.add(qId.toLowerCase());
  });

  // Cross-reference implementation steps with clauses & controls
  const stepsList = isDPDP ? DPDP_STEPS : ALL_STEPS;
  stepsList.forEach(s => {
    if (s.id) {
      const sId = s.id.toLowerCase();
      // If current item is this step, add all its requirement tokens
      if (item.id && sId === String(item.id).toLowerCase()) {
        tokens.add(sId);
        if (s.requirements) {
          const sReq = s.requirements.toLowerCase();
          tokens.add(sReq);
          const cMatches = sReq.match(/\b\d+(?:\.\d+)*[a-z]?\b/g) || [];
          cMatches.forEach(c => {
            tokens.add(c);
            if (/^\d+\.\d+$/.test(c)) prefixes.add(c);
          });
          const ctrlMatches = sReq.match(/\ba\.\d+(?:\.\d+)*\b/g) || [];
          ctrlMatches.forEach(c => tokens.add(c));
          const dpdpMatches = sReq.match(/\b(?:s\.\d+(?:\(\d+\))*(?:-\(\d+\))*|section\s*\d+(?:\(\d+\))*|rule\s*\d+)\b/g) || [];
          dpdpMatches.forEach(d => {
            tokens.add(d);
            tokens.add(d.replace(/section\s*/g, 's.'));
          });
        }
      }
      // If current item is a clause/control matching this step, add step id to tokens
      if (s.requirements) {
        const sReq = s.requirements.toLowerCase();
        for (const tok of Array.from(tokens)) {
          if (tok && tok.length >= 2 && sReq.includes(tok)) {
            tokens.add(sId);
          }
        }
      }
    }
  });

  // Also match any question whose reference starts with one of the prefixes
  prefixes.forEach(pfx => {
    Object.keys(qMap.refToQ).forEach(refKey => {
      if (refKey === pfx || refKey.startsWith(pfx + '.') || refKey.startsWith(pfx + '(')) {
        tokens.add(refKey);
        const qId = qMap.refToQ[refKey];
        if (qId) tokens.add(qId.toLowerCase());
      }
    });
  });

  return scopedEvidences.filter(ev => {
    const evControl = (ev.control_id || '').toLowerCase().trim();
    const evRef = (ev.reference || '').toLowerCase().trim();
    const evQId = (ev.question_id || '').toLowerCase().trim();
    const evFile = (ev.original_name || ev.filename || '').toLowerCase().trim();

    // Direct token matches
    if (evControl && (tokens.has(evControl) || reqStr.includes(evControl))) return true;
    if (evRef && (tokens.has(evRef) || reqStr.includes(evRef))) return true;
    if (evQId && (tokens.has(evQId) || reqStr.includes(evQId))) return true;

    // Check mapped question references in active qMap
    const mappedRef = qMap.qToRef[evQId] || qMap.qToRef[evControl];
    if (mappedRef) {
      const lowerMapRef = mappedRef.toLowerCase();
      if (tokens.has(lowerMapRef) || reqStr.includes(lowerMapRef)) return true;
      for (const pfx of prefixes) {
        if (lowerMapRef === pfx || lowerMapRef.startsWith(pfx + '.') || lowerMapRef.startsWith(pfx + '(')) return true;
      }
    }

    // Direct step or clause id match
    if (item.id) {
      const cleanId = String(item.id).toLowerCase();
      if (evControl && (evControl === cleanId || evControl.includes(cleanId))) return true;
      if (evRef && (evRef === cleanId || evRef.includes(cleanId))) return true;
      if (evFile.includes(cleanId.replace(/[\.\(\)\-]/g, '_')) || evFile.includes(cleanId)) return true;
    }

    // Check prefix match on evRef / evControl
    for (const pfx of prefixes) {
      if (evRef && (evRef === pfx || evRef.startsWith(pfx + '.') || evRef.startsWith(pfx + '('))) return true;
      if (evControl && (evControl === pfx || evControl.startsWith(pfx + '.') || evControl.startsWith(pfx + '('))) return true;
    }

    return false;
  });
}

export default function VCISOMainPage({
  standalone = false,
  selectedFramework: parentFramework,
  setSelectedFramework: parentSetFramework
} = {}) {
  const { user, getToken, logout } = useAuth();
  const token = getToken();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const fwParam = searchParams.get('framework');

  // Navigation State
  const [activeNav, setActiveNav] = useState(() => {
    if (tabParam && ['implementation', 'audit', 'documents', 'workspace'].includes(tabParam)) {
      return tabParam;
    }
    return 'implementation';
  });
  const [selectedStep, setSelectedStep] = useState(null);
  const [selectedClause, setSelectedClause] = useState(null);
  const [auditTab, setAuditTab] = useState('clauses'); // 'documents' | 'clauses'
  const [expandedClauses, setExpandedClauses] = useState({ '4': true, '5': true, '6': true, '7': true, '8': true, '9': true, '10': true, 'ch1': true, 'ch2': true, 'ch3': true, 'ch4': true });

  // Data from backend database
  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState({
    client: null,
    companyInfo: null,
    contract: null,
    steps: [],
    clientClauses: [],
    clientControls: [],
    evidences: []
  });

  // Platform Dashboard & Features Data
  const [clientFrameworks, setClientFrameworks] = useState([]);
  const [vulnCount, setVulnCount] = useState(0);
  const [threatAlerts, setThreatAlerts] = useState(0);
  const [clientFeatures, setClientFeatures] = useState(null);

  // Collapsible sidebar sections
  const [openSections, setOpenSections] = useState({
    compliance: true,
    platform: true,
    audit: true,
    security: true,
    intel: true,
    reporting: false
  });
  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Step form state
  const [stepData, setStepData] = useState({
    status: 'not_started',
    owner: '',
    approver: '',
    doc_version: '1.0',
    due_date: '',
    notes: '',
    doc_content: '',
    type: 'mandatory',
    custom_type: 'mandatory',
    awarenessArticle: false,
    awarenessVideo: false,
    awarenessAssignee: '',
    trainingName: '',
    trainingSkills: '',
    trainingAssignee: '',
    technology: '',
    humanResources: '',
    finance: ''
  });
  const [savingStep, setSavingStep] = useState(false);
  const [stepErrors, setStepErrors] = useState({});

  // Framework Selection from Onboarding or Parent
  const [selectedFramework, setSelectedFramework] = useState(() => {
    return parentFramework || fwParam || localStorage.getItem('vciso_selected_framework') || 'iso-27001';
  });
  const [showOrgDetails, setShowOrgDetails] = useState(false);

  const handleSelectFramework = (newFw) => {
    setSelectedFramework(newFw);
    if (parentSetFramework) {
      parentSetFramework(newFw);
    }
    localStorage.setItem('vciso_selected_framework', newFw);
    setActiveNav('implementation');
    setSelectedStep(null);
  };

  useEffect(() => {
    if (tabParam && ['implementation', 'audit', 'documents', 'workspace'].includes(tabParam)) {
      setActiveNav(tabParam);
      setSelectedStep(null);
    }
  }, [tabParam]);

  useEffect(() => {
    if (parentFramework && parentFramework !== selectedFramework) {
      setSelectedFramework(parentFramework);
    }
  }, [parentFramework]);

  useEffect(() => {
    if (fwParam && fwParam !== selectedFramework) {
      setSelectedFramework(fwParam);
      if (parentSetFramework) parentSetFramework(fwParam);
    }
  }, [fwParam]);

  // Evidence Upload Form
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadReason, setUploadReason] = useState('');
  const [uploading, setUploading] = useState(false);

  // Interactive Document Workspace Form (starts initially empty)
  const [workspaceDoc, setWorkspaceDoc] = useState({
    title: '',
    clauseRef: '',
    owner: '',
    approver: '',
    version: '1.0',
    dueDate: '',
    content: '',
    scope: '',
    justification: '',
    type: 'custom',
    custom_type: 'mandatory',
    tech: '',
    hr: '',
    finance: ''
  });
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // Load live DB data scoped to the client
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/vciso/vcisomainpage/data${user?.client_id ? `?clientId=${encodeURIComponent(user.client_id)}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDbData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, user?.client_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetch('/api/vciso/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setVulnCount(data.stats?.vulnerabilities?.open || 0);
        if (Array.isArray(data.framework_selections) && data.framework_selections.length > 0) {
          setClientFrameworks(data.framework_selections);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetch('/api/vciso/threat-intel', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setThreatAlerts(d?.alerts?.filter(a => a.severity === 'critical' || a.severity === 'high').length || 0))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetch('/api/vciso/client-features', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setClientFeatures(d || { threat_feeds_enabled: true, vuln_scanning_enabled: true, sla_tracking_enabled: true, asset_discovery_enabled: true }))
      .catch(() => setClientFeatures({ threat_feeds_enabled: true, vuln_scanning_enabled: true, sla_tracking_enabled: true, asset_discovery_enabled: true }));
  }, [token]);

  // Onboarded frameworks fetched from Supabase DB & dynamic client state
  const onboardingFrameworks = useMemo(() => {
    const rawList = [
      ...(Array.isArray(dbData.frameworkSelections) ? dbData.frameworkSelections : (dbData.frameworkSelections ? [dbData.frameworkSelections] : [])),
      ...(Array.isArray(clientFrameworks) ? clientFrameworks : (clientFrameworks ? [clientFrameworks] : [])),
      ...(Array.isArray(dbData.assessments) ? dbData.assessments.map(a => a.framework_name || a.framework_id) : []),
      ...(dbData.dpdpAssessment ? ['DPDP Act, 2023'] : []),
      ...(dbData.isoAssessment ? ['ISO/IEC 27001:2022'] : [])
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
  }, [dbData.frameworkSelections, clientFrameworks, dbData.assessments, dbData.dpdpAssessment, dbData.isoAssessment]);

  // Dynamic audit frameworks & security domains (Clean text names, NO emojis)
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

    if (clientFrameworks && clientFrameworks.length > 0) {
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
      { slug: 'vulnerability-management', name: 'Vuln Management' },
      { slug: 'grc', name: 'GRC & Risk' },
      { slug: 'incident-response', name: 'Incident Response' },
      { slug: 'soc-siem', name: 'SOC / SIEM' },
      { slug: 'cloud-security', name: 'Cloud Security' },
      { slug: 'iam', name: 'Identity & Access' },
      { slug: 'tprm', name: 'Third-Party Risk' },
    ];

    return { auditItems, securityItems: defaultSecurity };
  }, [clientFrameworks]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'VC';

  // Compute live step statuses directly from database records, scoped to the
  // framework on screen so an ISO policy never counts towards DPDP progress.
  const stepsMap = useMemo(() => {
    const map = {};
    scopeStepsToFramework(dbData.steps, selectedFramework).forEach(s => {
      map[s.step_id] = s;
    });
    return map;
  }, [dbData.steps, selectedFramework]);

  // Dynamic step obligation lookup (from master_clause_control_types & client customizations in Supabase DB)
  const getStepObligation = useCallback((step) => {
    if (!step) return { type: 'mandatory', customType: null, label: 'Mandatory', badgeClass: 'reg-stamp', isMandatory: true, isCustom: false };
    const dbStep = stepsMap[step.id] || {};
    // Matched on the shipped requirement text so a clause edited in the DB
    // does not change which master type (and badge) the step resolves to.
    const stepReq = step.defaultRequirements || step.requirements;
    const master = (dbData.masterTypes || []).find(m => 
      m.step_id === step.id || 
      m.id === `ISO27001_${step.id}` || 
      m.id === `DPDP_${step.id}` ||
      m.id === step.id ||
      (m.control_clause && stepReq && (
        m.control_clause.toLowerCase() === stepReq.toLowerCase() ||
        stepReq.toLowerCase().includes(m.control_clause.toLowerCase()) ||
        m.control_clause.toLowerCase().includes(stepReq.toLowerCase())
      ))
    );
    
    const baseType = dbStep.type || master?.type || (step.isMandatory ? 'mandatory' : 'optional');
    const customType = dbStep.custom_type || (baseType === 'custom' ? 'custom' : null);
    
    if (baseType === 'custom') {
      return {
        type: 'custom',
        customType: customType || 'custom',
        label: 'Custom',
        badgeClass: 'reg-stamp opt',
        isMandatory: false,
        isCustom: true
      };
    } else if (baseType === 'mandatory') {
      return {
        type: 'mandatory',
        customType: null,
        label: 'Mandatory',
        badgeClass: 'reg-stamp',
        isMandatory: true,
        isCustom: false
      };
    } else {
      return {
        type: 'optional',
        customType: null,
        label: 'Optional',
        badgeClass: 'reg-stamp opt',
        isMandatory: false,
        isCustom: false
      };
    }
  }, [stepsMap, dbData.masterTypes]);

  // Active framework detection & dynamic datasets
  const isDPDP = useMemo(() => {
    return selectedFramework === 'dpdp' || String(selectedFramework).toLowerCase().includes('dpdp');
  }, [selectedFramework]);

  // CSPM has no implementation-step catalogue or clause register — selecting it
  // in the sidebar swaps the whole register for the cloud discovery review.
  const isCSPM = useMemo(
    () => String(selectedFramework).toLowerCase().includes('cspm'),
    [selectedFramework]
  );

  const currentSteps = useMemo(
    () => applyDbStepRequirements(isDPDP ? DPDP_STEPS : ALL_STEPS, dbData.implementationSteps),
    [isDPDP, dbData.implementationSteps]
  );
  const currentSections = useMemo(() => isDPDP ? DPDP_SECTIONS_LIST : CLAUSES_LIST, [isDPDP]);

  const distinctPhases = useMemo(() => {
    const phases = [];
    const seen = new Set();
    currentSteps.forEach(s => {
      if (!seen.has(s.phase)) {
        seen.add(s.phase);
        phases.push({ phase: s.phase, title: s.phaseTitle || `Phase ${s.phase}` });
      }
    });
    return phases;
  }, [currentSteps]);

  // Overall counts calculated live strictly from user DB entries (starts at 0)
  const completedStepsCount = useMemo(() => {
    return currentSteps.filter(s => {
      const row = stepsMap[s.id];
      return row && row.status === 'completed';
    }).length;
  }, [currentSteps, stepsMap]);

  const totalSectionsCount = useMemo(() => {
    let count = 0;
    currentSections.forEach(parent => {
      count += (parent.subClauses || []).length;
    });
    return count;
  }, [currentSections]);

  // Completed clauses / sections count
  const completedClausesCount = useMemo(() => {
    const clauseStatusMap = {};
    (dbData.clientClauses || []).forEach(c => {
      clauseStatusMap[c.control_id || c.clause_number] = c;
    });

    let count = 0;
    currentSections.forEach(parent => {
      (parent.subClauses || []).forEach(sub => {
        const row = clauseStatusMap[sub.id];
        if (row && (row.status === 'ready' || row.status === 'pass' || row.status === 'completed')) {
          count++;
        }
      });
    });
    return count;
  }, [currentSections, dbData.clientClauses]);

  // Open Step Detail View
  const handleOpenStep = (step) => {
    const dbStep = stepsMap[step.id] || {};
    const obligation = getStepObligation(step);
    setSelectedStep(step);
    setStepErrors({});
    const initialClassification = dbStep.custom_type || dbStep.type || (obligation.isMandatory ? 'mandatory' : (obligation.customType === 'optional' ? 'optional' : 'mandatory'));
    setStepData({
      status: dbStep.status || '',
      owner: dbStep.owner || '',
      approver: dbStep.approver || '',
      doc_version: dbStep.doc_version || '1.0',
      due_date: dbStep.due_date ? String(dbStep.due_date).split('T')[0] : '',
      notes: dbStep.notes || '',
      doc_content: dbStep.doc_content || '',
      type: initialClassification,
      custom_type: initialClassification,
      awarenessArticle: dbStep.awareness?.articles || false,
      awarenessVideo: dbStep.awareness?.videos || false,
      awarenessAssignee: dbStep.awareness?.assignees || '',
      trainingName: dbStep.training?.[0]?.name || '',
      trainingSkills: dbStep.training?.[0]?.skills || '',
      trainingAssignee: dbStep.training?.[0]?.assignee || '',
      technology: dbStep.tech?.tech || '',
      humanResources: dbStep.hr?.hr || '',
      finance: dbStep.finance?.budget || ''
    });
  };

  // Save Step (Finish Step with Mandatory Validations)
  const handleSaveStep = async () => {
    if (!selectedStep) return;

    // Validate mandatory fields
    const errors = {};
    if (!stepData.due_date || !String(stepData.due_date).trim()) {
      errors.due_date = 'Step deadline is mandatory.';
    }
    if (!stepData.approver || !String(stepData.approver).trim()) {
      errors.approver = 'Approver is mandatory.';
    }
    if (!stepData.owner || !String(stepData.owner).trim()) {
      errors.owner = 'Owner is mandatory.';
    }
    if (!stepData.status || !String(stepData.status).trim()) {
      errors.status = 'Document status is mandatory.';
    }
    if (!stepData.doc_content || !String(stepData.doc_content).trim()) {
      errors.doc_content = 'vCISO Policy Document & Guidance Content is mandatory.';
    }
    const classification = stepData.custom_type || stepData.type;
    if (!classification || (classification !== 'mandatory' && classification !== 'optional')) {
      errors.classification = 'vCISO Policy Classification (Mandatory or Optional) is mandatory.';
    }

    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      const missingList = Object.values(errors).join('\n• ');
      alert(`Please fill in all mandatory fields before finishing this step:\n• ${missingList}`);
      return;
    }

    setStepErrors({});
    setSavingStep(true);
    try {
      const url = `/api/vciso/vcisomainpage/step/${encodeURIComponent(selectedStep.id)}${user?.client_id || dbData.clientId ? `?clientId=${encodeURIComponent(user?.client_id || dbData.clientId)}` : ''}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: stepData.status,
          owner: stepData.owner.trim(),
          approver: stepData.approver.trim(),
          doc_version: stepData.doc_version || '1.0',
          due_date: stepData.due_date,
          notes: stepData.notes,
          doc_content: stepData.doc_content.trim(),
          type: classification,
          custom_type: classification,
          // Stamps the row so the client only sees it under this framework.
          framework_id: selectedFramework,
          awareness_json: { articles: stepData.awarenessArticle, videos: stepData.awarenessVideo, assignees: stepData.awarenessAssignee },
          training_json: [{ name: stepData.trainingName, skills: stepData.trainingSkills, assignee: stepData.trainingAssignee }],
          tech_json: { tech: stepData.technology },
          hr_json: { hr: stepData.humanResources },
          finance_json: { budget: stepData.finance }
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save step.');
      }
      await loadData();
      alert('Step completed and policy document saved successfully!');
      setSelectedStep(null);
    } catch (e) {
      console.error(e);
      alert(`Error saving step: ${e.message || 'Please try again.'}`);
    } finally {
      setSavingStep(false);
    }
  };

  // Upload Evidence
  const handleUploadEvidence = async (targetId) => {
    if (!uploadFiles || uploadFiles.length === 0) {
      alert('Please choose a file to upload.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < uploadFiles.length; i++) {
        formData.append('files', uploadFiles[i]);
      }
      formData.append('control_id', targetId);
      formData.append('reason', uploadReason);
      formData.append('framework_id', isDPDP ? 'dpdp' : 'iso27001-2022');

      const res = await fetch('/api/vciso/vcisomainpage/evidence/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setUploadFiles([]);
        setUploadReason('');
        await loadData();
        alert('Evidence uploaded successfully!');
      }
    } catch (e) {
      console.error(e);
      alert('Error uploading evidence.');
    } finally {
      setUploading(false);
    }
  };

  // Review Evidence (Approve / Reject)
  const handleReviewEvidence = async (evId, reviewStatus, explicitReason = '') => {
    let rejectionReason = explicitReason;
    let notes = explicitReason;
    if (reviewStatus === 'rejected' && !rejectionReason) {
      rejectionReason = window.prompt('Please enter reason for rejection / revision note for the client:') || '';
      if (!rejectionReason) return;
    } else if (reviewStatus === 'accepted' && !notes) {
      notes = 'Approved by vCISO Lead';
    }
    try {
      const res = await fetch(`/api/vciso/vcisomainpage/evidence/${encodeURIComponent(evId)}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus,
          vcisoNotes: notes || rejectionReason,
          rejectionReason: reviewStatus === 'rejected' ? (rejectionReason || notes) : '',
          reviewedBy: user?.name || user?.email || 'vCISO Lead'
        })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
      alert('Error reviewing evidence.');
    }
  };

  // Delete evidence
  const handleDeleteEvidence = async (id) => {
    if (!window.confirm('Delete this evidence file?')) return;
    try {
      await fetch(`/api/vciso/vcisomainpage/evidence/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Save workspace document
  const handleSaveWorkspace = async () => {
    if (!workspaceDoc.title || !workspaceDoc.title.trim()) {
      alert('Please enter a document title.');
      return;
    }
    if (!workspaceDoc.dueDate || !String(workspaceDoc.dueDate).trim()) {
      alert('Step deadline is mandatory.');
      return;
    }
    if (!workspaceDoc.approver || !workspaceDoc.approver.trim()) {
      alert('Approver is mandatory.');
      return;
    }
    if (!workspaceDoc.owner || !workspaceDoc.owner.trim()) {
      alert('Owner is mandatory.');
      return;
    }
    if (!workspaceDoc.content || !workspaceDoc.content.trim()) {
      alert('vCISO Policy Document & Guidance Content is mandatory.');
      return;
    }
    const wsClassification = workspaceDoc.custom_type || workspaceDoc.type;
    if (!wsClassification || (wsClassification !== 'mandatory' && wsClassification !== 'optional')) {
      alert('vCISO Policy Classification (Mandatory or Optional) is mandatory before saving the document.');
      return;
    }
    setSavingWorkspace(true);
    try {
      let stepId = workspaceDoc.stepId;
      if (!stepId) {
        const allKnownSteps = applyDbStepRequirements([...ALL_STEPS, ...DPDP_STEPS], dbData.implementationSteps);
        const clauseRefKey = (workspaceDoc.clauseRef || '').toLowerCase().trim();
        const matched = allKnownSteps.find(s => 
          s.id === workspaceDoc.clauseRef || 
          (workspaceDoc.title && s.title.toLowerCase().trim() === workspaceDoc.title.toLowerCase().trim()) ||
          (clauseRefKey && [s.requirements, s.defaultRequirements].some(r => r && r.toLowerCase().trim() === clauseRefKey))
        );
        if (matched) {
          stepId = matched.id;
        } else {
          stepId = `custom-${workspaceDoc.clauseRef ? workspaceDoc.clauseRef.replace(/[^a-zA-Z0-9]/g, '_') : Date.now()}`;
        }
      }

      const url = `/api/vciso/vcisomainpage/step/${encodeURIComponent(stepId)}${user?.client_id || dbData.clientId ? `?clientId=${encodeURIComponent(user?.client_id || dbData.clientId)}` : ''}`;
      await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          owner: workspaceDoc.owner,
          approver: workspaceDoc.approver,
          doc_version: workspaceDoc.version,
          due_date: workspaceDoc.dueDate,
          notes: workspaceDoc.justification || workspaceDoc.scope || workspaceDoc.title,
          doc_content: workspaceDoc.content,
          type: wsClassification,
          custom_type: wsClassification,
          // A 'custom-…' id carries no framework prefix, so this is the only
          // thing keeping the document out of the other framework's list.
          framework_id: selectedFramework,
          tech_json: { tech: workspaceDoc.tech },
          hr_json: { hr: workspaceDoc.hr },
          finance_json: { budget: workspaceDoc.finance }
        })
      });
      await loadData();
      alert(`Document "${workspaceDoc.title}" saved to organization database!`);
    } catch (e) {
      console.error(e);
      alert('Error saving document.');
    } finally {
      setSavingWorkspace(false);
    }
  };

  const renderSidebar = () => (
    <aside className="reg-side">
      {/* Brand */}
      <div className="reg-brand">
        <div className="reg-brand-name">vCISO</div>
        <div className="reg-brand-sub" title={dbData.client?.name || 'Compliance register'}>
          Compliance register · {dbData.client?.name || 'Organization'}
        </div>
      </div>

      {/* Standard Selector Dropdown (Fetched from Supabase Onboarding) */}
      <div className="reg-select" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
        <select
          value={selectedFramework}
          onChange={(e) => {
            handleSelectFramework(e.target.value);
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            fontFamily: 'Source Serif 4, serif',
            fontSize: '13.5px',
            fontWeight: 600,
            color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }),
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {onboardingFrameworks.map(fw => (
            <option key={fw.id} value={fw.id}>{fw.name}</option>
          ))}
        </select>
      </div>

      {/* Scrollable Navigation Sections */}
      <div className="reg-nav-scroll">
        {/* 1. Compliance Register */}
        {!isCSPM && (
          <>
            <div className="reg-nav-section-hdr" onClick={() => toggleSection('compliance')}>
              <span>Compliance Register</span>
              <span className="reg-nav-section-chevron">{openSections.compliance ? '⌄' : '›'}</span>
            </div>
            {openSections.compliance && (
              <div>
                <div 
                  className={`reg-nav-item ${activeNav === 'implementation' && !selectedStep ? 'active' : ''}`}
                  onClick={() => { setActiveNav('implementation'); setSelectedStep(null); }}
                >
                  <span className="reg-nav-item-text">Implementation steps</span>
                </div>
                <div 
                  className={`reg-nav-item ${activeNav === 'audit' ? 'active' : ''}`}
                  onClick={() => { setActiveNav('audit'); setSelectedStep(null); }}
                >
                  <span className="reg-nav-item-text">Audit &amp; evidence</span>
                </div>
                <div 
                  className={`reg-nav-item ${activeNav === 'documents' ? 'active' : ''}`}
                  onClick={() => { setActiveNav('documents'); setSelectedStep(null); }}
                >
                  <span className="reg-nav-item-text">Documents</span>
                  <span className="tag">{currentSteps.length}</span>
                </div>
                <div 
                  className={`reg-nav-item ${activeNav === 'workspace' ? 'active' : ''}`}
                  onClick={() => { setActiveNav('workspace'); setSelectedStep(null); }}
                >
                  <span className="reg-nav-item-text">Draft workspace</span>
                  <span className="reg-badge-live">Live</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* 2. Platform Views */}
        <div className="reg-nav-section-hdr" onClick={() => toggleSection('platform')}>
          <span>Platform Views</span>
          <span className="reg-nav-section-chevron">{openSections.platform ? '⌄' : '›'}</span>
        </div>
        {openSections.platform && (
          <div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/overview')}
            >
              <span className="reg-nav-item-text">Overview</span>
            </div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/security-dashboard')}
            >
              <span className="reg-nav-item-text">Security Center</span>
            </div>
          </div>
        )}

        {/* 3. Audit & Assessments */}
        <div className="reg-nav-section-hdr" onClick={() => toggleSection('audit')}>
          <span>Audits &amp; Assessments</span>
          <span className="reg-nav-section-chevron">{openSections.audit ? '⌄' : '›'}</span>
        </div>
        {openSections.audit && (
          <div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/audits')}
            >
              <span className="reg-nav-item-text">Audit Management</span>
            </div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/assessments')}
            >
              <span className="reg-nav-item-text">Client Assessments</span>
            </div>
          </div>
        )}

        {/* 4. Operations & Assets */}
        <div className="reg-nav-section-hdr" onClick={() => toggleSection('operations')}>
          <span>Operations &amp; Threat</span>
          <span className="reg-nav-section-chevron">{openSections.operations ? '⌄' : '›'}</span>
        </div>
        {openSections.operations && (
          <div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/assets')}
            >
              <span className="reg-nav-item-text">Asset Registry</span>
            </div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/vulnerabilities')}
            >
              <span className="reg-nav-item-text">Vulnerabilities</span>
              {vulnCount > 0 && <span className="reg-badge-crimson">{vulnCount}</span>}
            </div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/threat-intel')}
            >
              <span className="reg-nav-item-text">Threat Intelligence</span>
              {threatAlerts > 0 && <span className="reg-badge-crimson">{threatAlerts}</span>}
            </div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/scanners')}
            >
              <span className="reg-nav-item-text">Scanner Integrations</span>
            </div>
          </div>
        )}

        {/* 5. Reporting & Settings */}
        <div className="reg-nav-section-hdr" onClick={() => toggleSection('reporting')}>
          <span>Reporting &amp; Governance</span>
          <span className="reg-nav-section-chevron">{openSections.reporting ? '⌄' : '›'}</span>
        </div>
        {openSections.reporting && (
          <div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/reporting')}
            >
              <span className="reg-nav-item-text">Executive Reports</span>
            </div>
            <div 
              className="reg-nav-item"
              onClick={() => navigate('/dashboard/vciso/settings')}
            >
              <span className="reg-nav-item-text">Platform Settings</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer with User Profile & Logout */}
      <div className="reg-user-footer">
        <div className="reg-user-row">
          <div className="reg-user-avatar">
            {initials}
          </div>
          <div className="reg-user-info">
            <div className="reg-user-name">{user?.name || dbData.client?.name || 'Security Lead'}</div>
            <div className="reg-user-email">{user?.email || 'vCISO Portal'}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="reg-logout-btn">
          <span>⏻</span> Logout
        </button>
      </div>
    </aside>
  );

  // Organization details panel: shared by both header layouts (dark uses CSS classes).
  const orgLabelProps = isDark
    ? { className: 'reg-orgdetails-label' }
    : { style: { color: th('#4A5568', { classic: '#64748B' }), fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 } };
  const orgDetailsPanel = (
    <div {...(isDark ? { className: 'reg-orgdetails' } : { style: {
      background: '#FFFFFF',
      border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC' })}`,
      borderRadius: th('2px', { classic: '3px' }),
      padding: '14px 18px',
      marginTop: '4px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '14px',
      fontSize: '12.5px',
      color: th('#1A202C', { classic: '#0F172A' })
    } })}>
      <div>
        <div {...orgLabelProps}>Legal Name</div>
        <div style={{ fontWeight: 600, marginTop: '2px' }}>{dbData.companyInfo?.legal_name || dbData.client?.name || '-'}</div>
      </div>
      <div>
        <div {...orgLabelProps}>Location &amp; Address</div>
        <div style={{ marginTop: '2px' }}>
          {[dbData.companyInfo?.address, dbData.companyInfo?.city, dbData.companyInfo?.state, dbData.companyInfo?.country].filter(Boolean).join(', ') || dbData.companyInfo?.country || 'India'}
        </div>
      </div>
      <div>
        <div {...orgLabelProps}>Company Size &amp; Staff</div>
        <div style={{ marginTop: '2px' }}>
          {dbData.companyInfo?.company_size || '10–50'} · {dbData.companyInfo?.num_employees ? `${dbData.companyInfo.num_employees} Employees` : 'Active Team'}
        </div>
      </div>
      <div>
        <div {...orgLabelProps}>Website</div>
        <div style={{ marginTop: '2px' }}>
          {dbData.companyInfo?.website ? (
            <a href={dbData.companyInfo.website.startsWith('http') ? dbData.companyInfo.website : `https://${dbData.companyInfo.website}`} target="_blank" rel="noreferrer" style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), textDecoration: 'underline' }}>
              {dbData.companyInfo.website}
            </a>
          ) : '-'}
        </div>
      </div>
      <div>
        <div {...orgLabelProps}>Primary Contact</div>
        <div style={{ marginTop: '2px' }}>
          {dbData.contacts?.[0] ? `${dbData.contacts[0].full_name} (${dbData.contacts[0].designation || 'Lead'})` : 'Admin User'}
        </div>
      </div>
      <div>
        <div {...orgLabelProps}>Onboarded Frameworks</div>
        <div style={{ marginTop: '2px', fontWeight: 600, color: th('#065F46', { dark: '#34D399' }) }}>
          {onboardingFrameworks.map(f => f.name).join(', ')}
        </div>
      </div>
    </div>
  );
  // Dark wraps everything below its org bar in a padded .reg-page container.
  const PageBody = isDark ? 'div' : React.Fragment;
  const pageBodyProps = isDark ? { className: 'reg-page' } : {};

  const mainContent = (
    <main className="reg-main" style={!standalone ? { width: '100%', minHeight: '100%' } : undefined}>
        {isDark ? (
          /* Top organisation bar (live organisation details) */
          <header className="reg-orgbar">
            <div className="reg-orgbar-left">
              <span className="reg-orgbar-label">Organization:</span>
              <span className="reg-orgbar-name">{dbData.companyInfo?.company_name || dbData.client?.name || 'Organization'}</span>
              {dbData.companyInfo?.industry && (
                <span className="reg-orgbar-chip">Industry: {dbData.companyInfo.industry}</span>
              )}
              {dbData.companyInfo?.company_branch && (
                <span className="reg-orgbar-chip">Branch: {dbData.companyInfo.company_branch}</span>
              )}
              <button className="reg-orgbar-link" onClick={() => setShowOrgDetails(!showOrgDetails)}>
                {showOrgDetails ? 'Hide Org Details' : 'View Org Details'}
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: showOrgDetails ? 'rotate(180deg)' : 'none' }}>
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* theme-toggle.js mounts the 3-way theme switcher here */}
              <span id="theme-toggle-slot" />
              <button
                onClick={() => {
                  setWorkspaceDoc({ title: '', clauseRef: '', owner: '', approver: '', version: '1.0', dueDate: '', content: '', scope: '', justification: '', type: 'custom', custom_type: 'mandatory', tech: '', hr: '', finance: '' });
                  setActiveNav('workspace');
                  setSelectedStep(null);
                }}
                className="reg-btn-primary reg-btn-sm"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                </svg>
                New Policy Draft
              </button>
            </div>
          </header>
        ) : (
          /* Topline Banner with Live Supabase Organization Details */
          <div className="reg-topline" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13.5px', color: th('#1A202C', { classic: '#0F172A' }) }}>
                  Organization: <b style={{ fontFamily: 'Source Serif 4, serif', fontSize: '15px' }}>{dbData.companyInfo?.company_name || dbData.client?.name || 'Organization'}</b>
                </span>
                {dbData.companyInfo?.industry && (
                  <span style={{ fontSize: '12px', background: th('#EDF2F7', { classic: '#E2E8F0' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px' }), color: th('#4A5568', { classic: '#475569' }) }}>
                    Industry: <b>{dbData.companyInfo.industry}</b>
                  </span>
                )}
                {dbData.companyInfo?.company_branch && (
                  <span style={{ fontSize: '12px', background: th('#EDF2F7', { classic: '#E2E8F0' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px' }), color: th('#4A5568', { classic: '#475569' }) }}>
                    Branch: <b>{dbData.companyInfo.company_branch}</b>
                  </span>
                )}
                <button
                  onClick={() => setShowOrgDetails(!showOrgDetails)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC' })}`,
                    borderRadius: '2px',
                    padding: '2px 8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: th('#3182CE', { classic: '#2563EB' })
                  }}
                >
                  {showOrgDetails ? 'Hide Details ▲' : 'View Org Details ▼'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* theme-toggle.js mounts the 3-way theme switcher here */}
                <span id="theme-toggle-slot" />
                <button
                  onClick={() => {
                    setWorkspaceDoc({ title: '', clauseRef: '', owner: '', approver: '', version: '1.0', dueDate: '', content: '', scope: '', justification: '', type: 'custom', custom_type: 'mandatory', tech: '', hr: '', finance: '' });
                    setActiveNav('workspace');
                    setSelectedStep(null);
                  }}
                  className="reg-btn-primary reg-btn-sm"
                >
                  + New Policy Draft
                </button>
              </div>
            </div>

            {/* Expandable Organization Details Panel */}
            {showOrgDetails && orgDetailsPanel}
          </div>
        )}

        <PageBody {...pageBodyProps}>
        {isDark && showOrgDetails && orgDetailsPanel}

        {selectedStep ? (
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <div className="reg-back-link" onClick={() => setSelectedStep(null)}>
                  ← Back to Implementation steps
                </div>
                <h1 className="reg-title" style={{ marginTop: '4px' }}>
                  {selectedStep.num}. {selectedStep.title}
                </h1>
              </div>
              <div className="reg-meta">
                {(() => {
                  const obl = getStepObligation(selectedStep);
                  return (
                    <div className={obl.badgeClass}>
                      {obl.label}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="reg-body">
              <p>{selectedStep.mandatoryText || selectedStep.why}</p>

              {/* Two Column Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                
                {/* Basic info card */}
                <div className="reg-card" style={{ margin: 0 }}>
                  <div className="reg-card-title">Basic information about this step</div>
                  
                  <div style={{ marginBottom: '14px' }}>
                    <div className="reg-label">{isDPDP ? 'Covers these DPDP Act, 2023 requirements:' : 'Covers these ISO 27001 requirements:'}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '600', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                      {formatClauseDisplay(selectedStep.requirements)}
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div className="reg-label">Estimated workload for completing this step:</div>
                    <div style={{ fontSize: '13px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>{selectedStep.workload}</div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div className="reg-label">Step usually finished in:</div>
                    <div style={{ fontSize: '13px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>{selectedStep.duration}</div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div className="reg-label">Why do this?</div>
                    <div style={{ fontSize: '13px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), lineHeight: 1.5 }}>
                      {selectedStep.why}
                    </div>
                  </div>

                  <div>
                    <div className="reg-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Step deadline: <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span>
                    </div>
                    <input 
                      type="date" 
                      className="reg-input"
                      style={{ 
                        maxWidth: '240px',
                        border: stepErrors.due_date ? '1.5px solid #E53E3E' : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
                      }}
                      value={stepData.due_date || ''}
                      onChange={e => {
                        setStepData({ ...stepData, due_date: e.target.value });
                        if (stepErrors.due_date) setStepErrors(prev => ({ ...prev, due_date: null }));
                      }}
                    />
                    {stepErrors.due_date && (
                      <div style={{ color: '#E53E3E', fontSize: '11.5px', marginTop: '4px', fontWeight: 600 }}>
                        ⚠ {stepErrors.due_date}
                      </div>
                    )}
                  </div>
                </div>

                {/* Document / register info */}
                <div className="reg-card" style={{ margin: 0 }}>
                  <div className="reg-card-title">Document/register information</div>

                  {/* Policy Classification / Obligation Type */}
                  <div style={{ marginBottom: '14px', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }), padding: '10px 12px', border: stepErrors.classification ? '1.5px solid #E53E3E' : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: '2px' }}>
                    <div className="reg-label" style={{ fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '4px' }}>
                      vCISO Policy Classification: <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                        <input
                          type="radio"
                          name="stepObligation"
                          value="mandatory"
                          checked={stepData.custom_type === 'mandatory' || stepData.type === 'mandatory'}
                          onChange={() => {
                            setStepData({ ...stepData, type: 'mandatory', custom_type: 'mandatory' });
                            if (stepErrors.classification) setStepErrors(prev => ({ ...prev, classification: null }));
                          }}
                        />
                        <b>Mandatory</b> (Enforced for {dbData.client?.name || 'Organization'})
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                        <input
                          type="radio"
                          name="stepObligation"
                          value="optional"
                          checked={stepData.custom_type === 'optional' || stepData.type === 'optional'}
                          onChange={() => {
                            setStepData({ ...stepData, type: 'optional', custom_type: 'optional' });
                            if (stepErrors.classification) setStepErrors(prev => ({ ...prev, classification: null }));
                          }}
                        />
                        <b>Optional</b> (Discretionary)
                      </label>
                    </div>
                    {stepErrors.classification && (
                      <div style={{ color: '#E53E3E', fontSize: '11.5px', marginTop: '6px', fontWeight: 600 }}>
                        ⚠ {stepErrors.classification}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div className="reg-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Approver <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span>
                    </div>
                    <input 
                      type="text" 
                      className="reg-input"
                      style={{ 
                        border: stepErrors.approver ? '1.5px solid #E53E3E' : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
                      }}
                      placeholder="Enter approver name/role..."
                      value={stepData.approver || ''}
                      onChange={e => {
                        setStepData({ ...stepData, approver: e.target.value });
                        if (stepErrors.approver) setStepErrors(prev => ({ ...prev, approver: null }));
                      }}
                    />
                    {stepErrors.approver && (
                      <div style={{ color: '#E53E3E', fontSize: '11.5px', marginTop: '4px', fontWeight: 600 }}>
                        ⚠ {stepErrors.approver}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div className="reg-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Owner <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span>
                    </div>
                    <input 
                      type="text" 
                      className="reg-input"
                      style={{ 
                        border: stepErrors.owner ? '1.5px solid #E53E3E' : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
                      }}
                      placeholder="Enter owner name/role..."
                      value={stepData.owner || ''}
                      onChange={e => {
                        setStepData({ ...stepData, owner: e.target.value });
                        if (stepErrors.owner) setStepErrors(prev => ({ ...prev, owner: null }));
                      }}
                    />
                    {stepErrors.owner && (
                      <div style={{ color: '#E53E3E', fontSize: '11.5px', marginTop: '4px', fontWeight: 600 }}>
                        ⚠ {stepErrors.owner}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div className="reg-label">Update interval</div>
                    <div style={{ fontSize: '13px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>{selectedStep.interval || '12 months'}</div>
                  </div>

                  <div style={{ margin: '16px 0' }}>
                    <table className="reg-table" style={{ background: th('#fff', { dark: '#1E293B' }), border: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                      <thead>
                        <tr>
                          <th>Document status <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span></th>
                          <th>Version</th>
                          <th>Last Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <select 
                              className="reg-input"
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                border: stepErrors.status ? '1.5px solid #E53E3E' : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
                              }}
                              value={stepData.status || ''}
                              onChange={e => {
                                setStepData({ ...stepData, status: e.target.value });
                                if (stepErrors.status) setStepErrors(prev => ({ ...prev, status: null }));
                              }}
                            >
                              <option value="">-- SELECT STATUS --</option>
                              <option value="not_started">NOT STARTED</option>
                              <option value="in_progress">IN PROGRESS</option>
                              <option value="completed">APPROVED</option>
                            </select>
                            {stepErrors.status && (
                              <div style={{ color: '#E53E3E', fontSize: '11px', marginTop: '3px', fontWeight: 600 }}>
                                ⚠ {stepErrors.status}
                              </div>
                            )}
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="reg-input"
                              style={{ width: '60px', padding: '4px 6px', fontSize: '12px' }}
                              value={stepData.doc_version || ''}
                              onChange={e => setStepData({ ...stepData, doc_version: e.target.value })}
                            />
                          </td>
                          <td style={{ fontFamily: 'JetBrains Mono', fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                            {stepsMap[selectedStep.id]?.updated_at ? new Date(stepsMap[selectedStep.id].updated_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                    <div className="reg-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      vCISO Policy Document &amp; Guidance Content: <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span>
                    </div>
                    <textarea 
                      className="reg-input"
                      rows={6}
                      style={{ 
                        width: '100%', 
                        fontFamily: 'inherit', 
                        fontSize: '13px', 
                        lineHeight: 1.5, 
                        resize: 'vertical',
                        border: stepErrors.doc_content ? '1.5px solid #E53E3E' : `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
                      }}
                      placeholder="Write or edit policy text, instructions, and compliance guidance for the client..."
                      value={stepData.doc_content || ''}
                      onChange={e => {
                        setStepData({ ...stepData, doc_content: e.target.value });
                        if (stepErrors.doc_content) setStepErrors(prev => ({ ...prev, doc_content: null }));
                      }}
                    />
                    {stepErrors.doc_content && (
                      <div style={{ color: '#E53E3E', fontSize: '11.5px', marginTop: '4px', fontWeight: 600 }}>
                        ⚠ {stepErrors.doc_content}
                      </div>
                    )}
                  </div>

                  <button 
                    className="reg-btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setWorkspaceDoc({
                        stepId: selectedStep.id,
                        title: selectedStep.title,
                        clauseRef: selectedStep.requirements,
                        owner: stepData.owner,
                        approver: stepData.approver,
                        version: stepData.doc_version,
                        dueDate: stepData.due_date,
                        status: stepData.status || 'completed',
                        content: stepData.doc_content || '',
                        scope: selectedStep.why,
                        justification: stepData.notes,
                        type: stepData.type,
                        custom_type: stepData.custom_type,
                        tech: stepData.technology,
                        hr: stepData.humanResources,
                        finance: stepData.finance
                      });
                      setActiveNav('workspace');
                      setSelectedStep(null);
                    }}
                  >
                    MANAGE DOCUMENT IN WORKSPACE
                  </button>
                </div>
              </div>

              {/* Awareness Section */}
              <div className="reg-card">
                <div className="reg-card-title">Awareness</div>
                <div className="reg-card-sub">To make your people aware of this requirement, we suggest the following materials:</div>
                <p style={{ fontSize: '12.5px', fontWeight: '600', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '12px' }}>
                  Please mark the materials and the people who should read them using the checkbox - we will send them a notification.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={stepData.awarenessArticle}
                      onChange={e => setStepData({ ...stepData, awarenessArticle: e.target.checked })}
                    />
                    <span><strong>Article:</strong> Requirements and implementation guide for {formatClauseDisplay(selectedStep.requirements)}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={stepData.awarenessVideo}
                      onChange={e => setStepData({ ...stepData, awarenessVideo: e.target.checked })}
                    />
                    <span><strong>Video:</strong> Executive overview of {selectedStep.title}</span>
                  </label>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="reg-label">People assigned:</label>
                  <input 
                    type="text"
                    className="reg-input"
                    placeholder="e.g. All Employees, Engineering, IT Dept"
                    value={stepData.awarenessAssignee}
                    onChange={e => setStepData({ ...stepData, awarenessAssignee: e.target.value })}
                    style={{ maxWidth: '400px' }}
                  />
                </div>

                <button className="reg-btn-primary reg-btn-sm" onClick={() => alert('Awareness notification sent to: ' + (stepData.awarenessAssignee || 'All assigned staff'))}>
                  SEND MATERIALS
                </button>
              </div>

              {/* Training Section */}
              <div className="reg-card">
                <div className="reg-card-title">Training</div>
                <div className="reg-card-sub">Do you think some of your people will need new knowledge and skills to perform this step?</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label className="reg-label">Name</label>
                    <input 
                      type="text" 
                      className="reg-input"
                      placeholder="Employee name..."
                      value={stepData.trainingName}
                      onChange={e => setStepData({ ...stepData, trainingName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="reg-label">Required knowledge and skills</label>
                    <input 
                      type="text" 
                      className="reg-input"
                      placeholder="e.g. Lead Auditor Skills, Risk Analysis"
                      value={stepData.trainingSkills}
                      onChange={e => setStepData({ ...stepData, trainingSkills: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="reg-label">Training Course</label>
                    <input 
                      type="text" 
                      className="reg-input"
                      placeholder="e.g. ISO 27001 Internal Auditor Course"
                      value={stepData.trainingAssignee}
                      onChange={e => setStepData({ ...stepData, trainingAssignee: e.target.value })}
                    />
                  </div>
                </div>

                <button className="reg-btn-primary reg-btn-sm" onClick={() => alert('Training requirements updated.')}>
                  CONFIRM
                </button>
              </div>

              {/* Technology Section */}
              <div className="reg-card">
                <div className="reg-card-title">Technology</div>
                <div className="reg-card-sub">Do you think you will need extra technology for the execution of this step?</div>
                <input 
                  type="text" 
                  className="reg-input"
                  placeholder="Specify required software, tool, or infrastructure..."
                  value={stepData.technology}
                  onChange={e => setStepData({ ...stepData, technology: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <button className="reg-btn-primary reg-btn-sm" onClick={() => alert('Technology requirements confirmed.')}>
                  CONFIRM
                </button>
              </div>

              {/* Human Resources Section */}
              <div className="reg-card">
                <div className="reg-card-title">Human Resources</div>
                <div className="reg-card-sub">Do you think you will need extra human resources for the execution of this step?</div>
                <input 
                  type="text" 
                  className="reg-input"
                  placeholder="Specify extra roles, contractors, or consulting support..."
                  value={stepData.humanResources}
                  onChange={e => setStepData({ ...stepData, humanResources: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <button className="reg-btn-primary reg-btn-sm" onClick={() => alert('HR requirements confirmed.')}>
                  CONFIRM
                </button>
              </div>

              {/* Finance Section */}
              <div className="reg-card">
                <div className="reg-card-title">Finance</div>
                <div className="reg-card-sub">Do you think you will need extra financial resources for the execution of this step?</div>
                <input 
                  type="text" 
                  className="reg-input"
                  placeholder="Specify budget required (e.g. $2,000 / ₹1,50,000)..."
                  value={stepData.finance}
                  onChange={e => setStepData({ ...stepData, finance: e.target.value })}
                  style={{ maxWidth: '320px', marginBottom: '12px' }}
                />
                <button className="reg-btn-primary reg-btn-sm" onClick={() => alert('Financial budget confirmed.')}>
                  CONFIRM
                </button>
              </div>

              {/* Attached Evidence Files with vCISO Verification Workflow */}
              <div className="reg-card">
                <div className="reg-card-title">Attached Evidences &amp; Proofs (Client Uploads)</div>
                <div className="reg-card-sub">All compliance proofs uploaded by client for this step and mapped clauses.</div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input 
                    type="file" 
                    multiple
                    onChange={e => setUploadFiles(Array.from(e.target.files))}
                    style={{ fontSize: '12.5px' }}
                  />
                  <input 
                    type="text" 
                    className="reg-input"
                    placeholder="Justification reason for evidence..."
                    value={uploadReason}
                    onChange={e => setUploadReason(e.target.value)}
                    style={{ flex: 1, minWidth: '240px' }}
                  />
                  <button 
                    className="reg-btn-primary reg-btn-sm"
                    disabled={uploading}
                    onClick={() => handleUploadEvidence(selectedStep.requirements || selectedStep.id)}
                  >
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>

                {(() => {
                  const evs = getEvidencesForItem(selectedStep, dbData.evidences, selectedFramework);
                  const approvedStepEvs = evs.filter(e => e.review_status === 'accepted' || e.review_status === 'verified');
                  const notApprovedStepEvs = evs.filter(e => e.review_status !== 'accepted' && e.review_status !== 'verified');

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Approved Evidence Records */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Evidence Records
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: th('#065F46', { dark: '#34D399' }), background: th('#D1FAE5', { dark: '#0B2E24' }), padding: '1px 8px', borderRadius: th('2px', { classic: '10px', dark: '10px' }) }}>
                            {approvedStepEvs.length} Approved
                          </span>
                        </div>

                        {approvedStepEvs.length === 0 ? (
                          <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), padding: '6px 0 10px 0' }}>
                            No approved evidence records yet. Review and accept pending proofs below.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {approvedStepEvs.map(ev => {
                              const isGapProof = ev.tags === 'gap_analysis_proof' || Boolean(ev.question_id);

                              return (
                                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: th('#F0FDF4', { dark: '#0B2E24' }), padding: '12px 16px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), border: `1px solid ${th('#BBF7D0', { dark: '#065F46' })}`, fontSize: '12.5px', flexWrap: 'wrap', gap: '10px' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <a href={ev.download_url || ev.url} target="_blank" rel="noreferrer" style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 'bold', textDecoration: 'underline' }}>
                                        📎 {ev.original_name || ev.filename}
                                      </a>
                                      {isGapProof && (
                                        <span style={{ background: th('#E0E7FF', { dark: '#1E1B4B' }), color: th('#3730A3', { dark: '#A5B4FC' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '10.5px', fontWeight: 600 }}>
                                          Client Gap Analysis Proof
                                        </span>
                                      )}
                                      <span style={{ background: th('#d1fae5', { dark: '#0B2E24' }), color: th('#065f46', { dark: '#34D399' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>✓ Approved by vCISO</span>
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                                      Target: <b>{ev.reference || ev.control_id || ev.question_id || 'General'}</b>
                                      {ev.uploaded_at && <span> · Uploaded: {new Date(ev.uploaded_at).toLocaleDateString()}</span>}
                                    </div>
                                    {ev.vciso_notes && <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '2px' }}>vCISO Notes: {ev.vciso_notes}</div>}
                                  </div>

                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      onClick={() => handleReviewEvidence(ev.id, 'rejected')}
                                      style={{
                                        background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                                        color: th('#991B1B', { dark: '#F87171' }),
                                        border: `1px solid ${th('#991B1B', { dark: '#F87171' })}`,
                                        borderRadius: '2px',
                                        padding: '4px 8px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                      title="Request changes / reject this approved evidence"
                                    >
                                      Re-evaluate
                                    </button>
                                    <button onClick={() => handleDeleteEvidence(ev.id)} style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '6px' }}>
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Evidences Not Approved Yet */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: th('#92400E', { dark: '#FBBF24' }), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Evidences Not Approved Yet:
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: notApprovedStepEvs.length > 0 ? th('#92400E', { dark: '#FBBF24' }) : th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), background: notApprovedStepEvs.length > 0 ? th('#FEF3C7', { dark: '#3A2A0A' }) : th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), padding: '1px 8px', borderRadius: th('2px', { classic: '10px', dark: '10px' }) }}>
                            {notApprovedStepEvs.length} Pending
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginBottom: '10px' }}>
                          Uploaded proofs submitted by client awaiting review or changes.
                        </div>

                        {notApprovedStepEvs.length === 0 ? (
                          <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), padding: '6px 0 10px 0' }}>
                            No unapproved evidence files for this step.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {notApprovedStepEvs.map(ev => {
                              const isRejected = ev.review_status === 'rejected';
                              const isGapProof = ev.tags === 'gap_analysis_proof' || Boolean(ev.question_id);

                              return (
                                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isRejected ? th('#FEF2F2', { dark: '#3A1418' }) : th('#FFFDF5', { dark: '#0F172A' }), padding: '12px 16px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), border: isRejected ? `1px solid ${th('#FECACA', { dark: '#7F1D1D' })}` : `1px solid ${th('#FDE68A', { dark: '#78350F' })}`, fontSize: '12.5px', flexWrap: 'wrap', gap: '10px' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <a href={ev.download_url || ev.url} target="_blank" rel="noreferrer" style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 'bold', textDecoration: 'underline' }}>
                                        📎 {ev.original_name || ev.filename}
                                      </a>
                                      {isGapProof && (
                                        <span style={{ background: th('#E0E7FF', { dark: '#1E1B4B' }), color: th('#3730A3', { dark: '#A5B4FC' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '10.5px', fontWeight: 600 }}>
                                          Client Gap Analysis Proof
                                        </span>
                                      )}
                                      {isRejected ? (
                                        <span style={{ background: th('#fee2e2', { dark: '#3A1418' }), color: th('#991b1b', { dark: '#F87171' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>✗ Rejected</span>
                                      ) : (
                                        <span style={{ background: th('#fef3c7', { dark: '#3A2A0A' }), color: th('#92400e', { dark: '#FBBF24' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>⏳ Pending Review</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                                      Target: <b>{ev.reference || ev.control_id || ev.question_id || 'General'}</b>
                                      {ev.uploaded_at && <span> · Uploaded: {new Date(ev.uploaded_at).toLocaleDateString()}</span>}
                                    </div>
                                    {ev.vciso_notes && <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '2px' }}>vCISO Notes: {ev.vciso_notes}</div>}
                                    {ev.rejection_reason && <div style={{ fontSize: '11px', color: th('#991b1b', { dark: '#F87171' }), marginTop: '2px', fontWeight: 600 }}>Rejection Reason: {ev.rejection_reason}</div>}
                                  </div>

                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      onClick={() => handleReviewEvidence(ev.id, 'accepted')}
                                      style={{
                                        background: '#065F46',
                                        color: '#fff',
                                        border: `1px solid ${th('#065F46', { dark: '#34D399' })}`,
                                        borderRadius: '2px',
                                        padding: '4px 8px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ✓ Accept
                                    </button>
                                    <button
                                      onClick={() => handleReviewEvidence(ev.id, 'rejected')}
                                      style={{
                                        background: isRejected ? '#991B1B' : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                                        color: isRejected ? '#fff' : th('#991B1B', { dark: '#F87171' }),
                                        border: `1px solid ${th('#991B1B', { dark: '#F87171' })}`,
                                        borderRadius: '2px',
                                        padding: '4px 8px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ✗ Reject
                                    </button>
                                    <button onClick={() => handleDeleteEvidence(ev.id)} style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '6px' }}>
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Mandatory Fields Validation Alert */}
              {Object.keys(stepErrors).length > 0 && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px 16px', 
                  background: th('#FFF5F5', { dark: '#3A1418' }), 
                  border: `1px solid ${th('#FEB2B2', { dark: '#7F1D1D' })}`, 
                  borderRadius: '2px',
                  color: th('#9B2C2C', { dark: '#F87171' }),
                  fontSize: '12.5px'
                }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Mandatory Fields Required:</strong>
                  Please complete: <b>{Object.values(stepErrors).join(', ')}</b> before finishing this step.
                </div>
              )}

              {/* Bottom Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button 
                  className="reg-btn-secondary"
                  onClick={() => {
                    setSelectedStep(null);
                    setStepErrors({});
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="reg-btn-crimson"
                  disabled={savingStep}
                  onClick={handleSaveStep}
                >
                  {savingStep ? 'Saving...' : 'Finish step'}
                </button>
              </div>

            </div>
          </div>
        ) : activeNav === 'implementation' ? (
          
          /* ═════════════════════════════════════════════════════════════════ */
          /* VIEW 2: MAIN IMPLEMENTATION STEPS REGISTER (EXACT REFERENCE UI)  */
          /* ═════════════════════════════════════════════════════════════════ */
          isDark ? (
            /* Dark: progress stat cards + phase cards */
            <>
            {(() => {
              const totalControls = isDPDP ? 21 : 93;
              const readiness = Math.round(((completedStepsCount + completedClausesCount) / (currentSteps.length + totalSectionsCount || 1)) * 100);
              const pct = (n, d) => `${d ? Math.min(100, (n / d) * 100) : 0}%`;
              const stats = [
                { label: 'Completed documents', val: `${completedStepsCount} of ${currentSteps.length}`, w: pct(completedStepsCount, currentSteps.length) },
                { label: isDPDP ? 'Completed sections' : 'Completed clauses', val: `${completedClausesCount} of ${totalSectionsCount}`, w: pct(completedClausesCount, totalSectionsCount) },
                { label: isDPDP ? 'Rules & safeguards' : 'Completed controls', val: `0 of ${totalControls}`, w: '0%' },
                { label: isDPDP ? 'DPDP Act readiness' : 'ISO 27001 Readiness', val: `${readiness}%`, w: `${readiness}%`, accent: true },
              ];
              return (
                <div className="reg-stats">
                  {stats.map(st => (
                    <div key={st.label} className="reg-stat">
                      <div className="reg-stat-label">{st.label}</div>
                      <div className={`reg-stat-val ${st.accent ? 'accent' : ''}`}>{st.val}</div>
                      <div className="reg-stat-bar"><div style={{ width: st.w }} /></div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h1 className="reg-title">Implementation steps</h1>
                  <p className="reg-subtitle">{isDPDP ? 'Work through these statutory requirements in order to prepare every mandatory document and technical safeguard for DPDP Act, 2023 compliance.' : 'Work through this record in order to prepare every mandatory document for your external audit and certification.'}</p>
                </div>
                <div className="reg-meta">
                  <div className="reg-meta-num"><b>{completedStepsCount} of {currentSteps.length}</b> complete</div>
                  <div className="reg-ticks">
                    {currentSteps.map((s, idx) => {
                      const isDone = stepsMap[s.id]?.status === 'completed';
                      return (
                        <div
                          key={s.id || idx}
                          className={`reg-tick ${isDone ? 'done' : ''}`}
                          title={`Step ${s.num}: ${s.title} (${isDone ? 'Complete' : 'Pending'})`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

                {/* Implementation Phases */}
                {distinctPhases.map(ph => {
                  const phaseSteps = currentSteps.filter(s => s.phase === ph.phase);
                  const phaseDone = phaseSteps.filter(s => stepsMap[s.id]?.status === 'completed').length;

                  return (
                    <div key={ph.phase} className="reg-phase">
                      <div className="reg-phase-head">
                        <div className="reg-section">{ph.title}</div>
                        <span className="reg-phase-count">{phaseDone} / {phaseSteps.length}</span>
                      </div>

                      {phaseSteps.map(step => {
                        const dbStep = stepsMap[step.id];
                        const isDone = dbStep && dbStep.status === 'completed';
                        const inProg = dbStep && dbStep.status === 'in_progress';
                        const formattedClause = formatClauseDisplay(step.requirements);
                        const notRequired = /not required/i.test(String(step.requirements || ''));

                        return (
                          <div
                            key={step.id}
                            className={`reg-row ${isDone ? 'is-done' : inProg ? 'is-prog' : 'is-open'}`}
                            onClick={() => handleOpenStep(step)}
                          >
                            <div className={`reg-num ${isDone ? 'done' : inProg ? 'prog' : ''}`}>
                              {isDone ? (
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : step.num}
                            </div>
                            <div className="reg-row-main">
                              <span className="reg-row-title">{step.title}</span>
                            </div>
                            <div className="reg-row-right">
                              {formattedClause && (
                                <span className={`reg-row-clause ${notRequired ? 'italic' : ''}`}>{formattedClause}</span>
                              )}
                              {(() => {
                                const obl = getStepObligation(step);
                                return (
                                  <div className={obl.badgeClass}>
                                    {obl.label}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}

                      {!isDPDP && ph.phase === 3 && (
                        <div className="reg-notice-box">
                          After completing the Statement of Applicability, the necessary policy and procedure documents will be automatically added as steps here.
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            </>
          ) : (
            <div className="reg-doc">
              <div className="reg-doc-head">
                <h1 className="reg-title">Implementation steps</h1>
                <div className="reg-meta">
                  <div className="reg-meta-num">{completedStepsCount} of {currentSteps.length} complete</div>
                  <div className="reg-ticks">
                    {currentSteps.map((s, idx) => {
                      const isDone = stepsMap[s.id]?.status === 'completed';
                      return (
                        <div 
                          key={s.id || idx} 
                          className={`reg-tick ${isDone ? 'done' : ''}`}
                          title={`Step ${s.num}: ${s.title} (${isDone ? 'Complete' : 'Pending'})`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="reg-body">
                <p>{isDPDP ? 'Work through these statutory requirements in order to prepare every mandatory document and technical safeguard for DPDP Act, 2023 compliance.' : 'Work through this record in order to prepare every mandatory document for your external audit and certification.'}</p>

                {/* Implementation Phases */}
                {distinctPhases.map(ph => {
                  const phaseSteps = currentSteps.filter(s => s.phase === ph.phase);

                  return (
                    <div key={ph.phase} style={{ marginBottom: '28px' }}>
                      <div className="reg-section">{ph.title}</div>

                      {phaseSteps.map(step => {
                        const dbStep = stepsMap[step.id];
                        const isDone = dbStep && dbStep.status === 'completed';
                        const inProg = dbStep && dbStep.status === 'in_progress';
                        const formattedClause = formatClauseDisplay(step.requirements);

                        return (
                          <div 
                            key={step.id} 
                            className="reg-row"
                            onClick={() => handleOpenStep(step)}
                          >
                            <div className={`reg-num ${isDone ? 'done' : inProg ? 'prog' : ''}`}>
                              {isDone ? '✓' : step.num}
                            </div>
                            <div className="reg-row-main">
                              <span className="reg-row-title">{step.title}</span>
                              {formattedClause && (
                                <span className="reg-row-clause">{formattedClause}</span>
                              )}
                            </div>
                            {(() => {
                              const obl = getStepObligation(step);
                              return (
                                <div className={obl.badgeClass}>
                                  {obl.label}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}

                      {!isDPDP && ph.phase === 3 && (
                        <div className="reg-notice-box">
                          After completing the Statement of Applicability, the necessary policy and procedure documents will be automatically added as steps here.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : activeNav === 'audit' ? (

          /* ═════════════════════════════════════════════════════════════════ */
          /* VIEW 3: AUDIT & EVIDENCE VIEW                                     */
          /* ═════════════════════════════════════════════════════════════════ */
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <h1 className="reg-title">Audit &amp; Evidence</h1>
                <div style={{ fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                  Check your organization's progress towards {isDPDP ? 'DPDP Act, 2023' : 'ISO 27001'} compliance and external audit readiness.
                </div>
              </div>
            </div>

            <div className="reg-body">
              {/* Gauges Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="reg-gauge">
                  <div className="reg-gauge-val">{completedStepsCount} of {currentSteps.length}</div>
                  <div className="reg-gauge-label">Completed documents</div>
                </div>
                <div className="reg-gauge">
                  <div className="reg-gauge-val">{completedClausesCount} of {totalSectionsCount}</div>
                  <div className="reg-gauge-label">{isDPDP ? 'Completed sections' : 'Completed clauses'}</div>
                </div>
                <div className="reg-gauge">
                  <div className="reg-gauge-val">{isDPDP ? '0 of 21' : '0 of 93'}</div>
                  <div className="reg-gauge-label">{isDPDP ? 'Rules & Safeguards' : 'Completed controls'}</div>
                </div>
                <div className="reg-gauge">
                  <div className="reg-gauge-val" style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
                    {Math.round(((completedStepsCount + completedClausesCount) / (currentSteps.length + totalSectionsCount || 1)) * 100)}%
                  </div>
                  <div className="reg-gauge-label">{isDPDP ? 'DPDP Act Readiness' : 'ISO 27001 Readiness'}</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="reg-tabs">
                <button 
                  className={`reg-tab ${auditTab === 'clauses' ? 'active' : ''}`}
                  onClick={() => setAuditTab('clauses')}
                >
                  {isDPDP ? 'Sections, Rules & Evidence' : 'Clauses & Evidence'}
                </button>
                <button 
                  className={`reg-tab ${auditTab === 'documents' ? 'active' : ''}`}
                  onClick={() => setAuditTab('documents')}
                >
                  Documents
                </button>
              </div>

              {/* Clauses & Evidence Table */}
              {auditTab === 'clauses' ? (
                <div style={{ position: 'relative' }}>
                  <table className="reg-table">
                    <thead>
                      <tr>
                        <th>{isDPDP ? 'Main Sections & Rules of DPDP Act, 2023' : 'Main clauses of ISO 27001 & Mapped Controls'}</th>
                        <th style={{ width: '180px' }}>Status</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSections.map(parent => (
                        <React.Fragment key={parent.id}>
                          {/* Parent Clause Header */}
                          <tr 
                            style={{ background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }), fontWeight: 'bold', cursor: 'pointer' }}
                            onClick={() => setExpandedClauses({ ...expandedClauses, [parent.id]: !expandedClauses[parent.id] })}
                          >
                            <td style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontFamily: 'Source Serif 4' }}>
                              <span>{expandedClauses[parent.id] ? '▾' : '▸'}</span>
                              <span>{parent.name}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '11.5px', color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), fontWeight: '600' }}>Not ready for audit</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>-</td>
                          </tr>

                          {/* Sub Clauses */}
                          {expandedClauses[parent.id] && parent.subClauses.map(sub => {
                            const matchingEvs = getEvidencesForItem(sub, dbData.evidences, selectedFramework);
                            const dbClauseRow = (dbData.clientClauses || []).find(c => (c.control_id || c.clause_number) === sub.id);
                            const isReady = dbClauseRow ? (dbClauseRow.status === 'ready' || dbClauseRow.status === 'pass' || dbClauseRow.status === 'completed') : false;

                            return (
                              <tr 
                                key={sub.id} 
                                onClick={() => setSelectedClause(sub)}
                                style={{ backgroundColor: selectedClause?.id === sub.id ? th('#FAF8EE', { dark: '#0F172A' }) : undefined, cursor: 'pointer' }}
                              >
                                <td style={{ paddingLeft: '36px' }}>
                                  <div style={{ fontWeight: '600' }}>{sub.name}</div>
                                  <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px', fontFamily: 'JetBrains Mono' }}>
                                    Covers: {formatClauseDisplay(sub.requirements)}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: isReady ? '#22543d' : th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
                                    {isReady ? 'Ready for audit' : 'Not ready for audit'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{ background: matchingEvs.length > 0 ? th('#d1fae5', { dark: '#0B2E24' }) : th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: matchingEvs.length > 0 ? th('#065f46', { dark: '#34D399' }) : th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 'bold', padding: '2px 8px', borderRadius: th('2px', { classic: '10px', dark: '10px' }), fontSize: '11px', fontFamily: 'JetBrains Mono' }}>
                                    {matchingEvs.length}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>

                  {/* Drawer Details Pane */}
                  {selectedClause && (
                    <div className="reg-drawer">
                      <button className="reg-drawer-close" onClick={() => setSelectedClause(null)}>×</button>
                      
                      <div style={{ marginTop: '12px' }}>
                        <div className="reg-section" style={{ fontSize: '18px' }}>{selectedClause.name}</div>
                        <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontFamily: 'JetBrains Mono', marginBottom: '16px' }}>
                          Covers standard requirements: {formatClauseDisplay(selectedClause.requirements)}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                          <span className="reg-label" style={{ display: 'inline', marginRight: '8px' }}>AUDIT STATUS:</span>
                          <span style={{ fontSize: '12.5px', color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), fontWeight: 'bold' }}>
                            Not ready for audit
                          </span>
                        </div>

                        {/* Associated Documents */}
                        <div style={{ marginBottom: '28px' }}>
                          <div className="reg-card-title" style={{ borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px', marginBottom: '12px' }}>
                            Associated Documents
                          </div>
                          {selectedClause.docs.map((d, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, fontSize: '12.5px' }}>
                              <div>
                                <div style={{ fontWeight: '600' }}>{d}</div>
                                <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>NOT STARTED</div>
                              </div>
                              <button 
                                className="reg-btn-secondary reg-btn-sm"
                                onClick={() => {
                                  setWorkspaceDoc({ title: d, clauseRef: selectedClause.requirements, owner: '', approver: '', version: '1.0', dueDate: '', content: '', scope: '', justification: '', tech: '', hr: '', finance: '' });
                                  setActiveNav('workspace');
                                  setSelectedClause(null);
                                }}
                              >
                                Draft Document
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Evidence Records & Review Sections */}
                        <div>
                          {(() => {
                            const allClauseEvs = getEvidencesForItem(selectedClause, dbData.evidences, selectedFramework);
                            const approvedClauseEvs = allClauseEvs.filter(e => e.review_status === 'accepted' || e.review_status === 'verified');
                            const notApprovedClauseEvs = allClauseEvs.filter(e => e.review_status !== 'accepted' && e.review_status !== 'verified');

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                {/* 1. Approved Evidence Records */}
                                <div>
                                  <div className="reg-card-title" style={{ borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>Evidence Records</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: th('#065F46', { dark: '#34D399' }), background: th('#D1FAE5', { dark: '#0B2E24' }), padding: '1px 8px', borderRadius: th('2px', { classic: '10px', dark: '10px' }) }}>
                                      {approvedClauseEvs.length} Approved
                                    </span>
                                  </div>

                                  {approvedClauseEvs.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), padding: '6px 0 10px 0' }}>
                                      No approved evidence records yet. Review and accept pending client proofs below.
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {approvedClauseEvs.map(ev => {
                                        const isGapProof = ev.tags === 'gap_analysis_proof' || Boolean(ev.question_id);

                                        return (
                                          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: th('#F0FDF4', { dark: '#0B2E24' }), padding: '12px 14px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), border: `1px solid ${th('#BBF7D0', { dark: '#065F46' })}`, fontSize: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <a href={ev.download_url || ev.url} target="_blank" rel="noreferrer" style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 'bold', textDecoration: 'underline' }}>
                                                  📎 {ev.original_name || ev.filename}
                                                </a>
                                                {isGapProof && (
                                                  <span style={{ background: th('#E0E7FF', { dark: '#1E1B4B' }), color: th('#3730A3', { dark: '#A5B4FC' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '10.5px', fontWeight: 600 }}>
                                                    Client Gap Analysis Proof
                                                  </span>
                                                )}
                                                <span style={{ background: th('#d1fae5', { dark: '#0B2E24' }), color: th('#065f46', { dark: '#34D399' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>✓ Approved by vCISO</span>
                                              </div>
                                              <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                                                Target: <b>{ev.reference || ev.control_id || ev.question_id || 'General'}</b>
                                                {ev.uploaded_at && <span> · Uploaded: {new Date(ev.uploaded_at).toLocaleDateString()}</span>}
                                              </div>
                                              {ev.vciso_notes && <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '2px' }}>vCISO Notes: {ev.vciso_notes}</div>}
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                              <button
                                                onClick={() => handleReviewEvidence(ev.id, 'rejected')}
                                                style={{
                                                  background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                                                  color: th('#991B1B', { dark: '#F87171' }),
                                                  border: `1px solid ${th('#991B1B', { dark: '#F87171' })}`,
                                                  borderRadius: '2px',
                                                  padding: '4px 8px',
                                                  fontSize: '11.5px',
                                                  fontWeight: 600,
                                                  cursor: 'pointer'
                                                }}
                                                title="Request changes / reject this approved evidence"
                                              >
                                                Re-evaluate
                                              </button>
                                              <button onClick={() => handleDeleteEvidence(ev.id)} style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '6px' }}>
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* 2. Evidences Not Approved Yet */}
                                <div>
                                  <div className="reg-card-title" style={{ borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: th('#92400E', { dark: '#FBBF24' }) }}>
                                    <span>Evidences Not Approved Yet:</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: notApprovedClauseEvs.length > 0 ? th('#92400E', { dark: '#FBBF24' }) : th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), background: notApprovedClauseEvs.length > 0 ? th('#FEF3C7', { dark: '#3A2A0A' }) : th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), padding: '1px 8px', borderRadius: th('2px', { classic: '10px', dark: '10px' }) }}>
                                      {notApprovedClauseEvs.length} Pending
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginBottom: '12px' }}>
                                    Uploaded proofs submitted by client during Gap Analysis or direct uploads awaiting review.
                                  </div>

                                  {notApprovedClauseEvs.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), padding: '6px 0 10px 0' }}>
                                      No pending unapproved evidence files for this requirement.
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {notApprovedClauseEvs.map(ev => {
                                        const isRejected = ev.review_status === 'rejected';
                                        const isGapProof = ev.tags === 'gap_analysis_proof' || Boolean(ev.question_id);

                                        return (
                                          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isRejected ? th('#FEF2F2', { dark: '#3A1418' }) : th('#FFFDF5', { dark: '#0F172A' }), padding: '12px 14px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), border: isRejected ? `1px solid ${th('#FECACA', { dark: '#7F1D1D' })}` : `1px solid ${th('#FDE68A', { dark: '#78350F' })}`, fontSize: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <a href={ev.download_url || ev.url} target="_blank" rel="noreferrer" style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 'bold', textDecoration: 'underline' }}>
                                                  📎 {ev.original_name || ev.filename}
                                                </a>
                                                {isGapProof && (
                                                  <span style={{ background: th('#E0E7FF', { dark: '#1E1B4B' }), color: th('#3730A3', { dark: '#A5B4FC' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '10.5px', fontWeight: 600 }}>
                                                    Client Gap Analysis Proof
                                                  </span>
                                                )}
                                                {isRejected ? (
                                                  <span style={{ background: th('#fee2e2', { dark: '#3A1418' }), color: th('#991b1b', { dark: '#F87171' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>✗ Rejected</span>
                                                ) : (
                                                  <span style={{ background: th('#fef3c7', { dark: '#3A2A0A' }), color: th('#92400e', { dark: '#FBBF24' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>⏳ Pending Review</span>
                                                )}
                                              </div>
                                              <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                                                Target: <b>{ev.reference || ev.control_id || ev.question_id || 'General'}</b>
                                                {ev.uploaded_at && <span> · Uploaded: {new Date(ev.uploaded_at).toLocaleDateString()}</span>}
                                              </div>
                                              {ev.vciso_notes && <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '2px' }}>vCISO Notes: {ev.vciso_notes}</div>}
                                              {ev.rejection_reason && <div style={{ fontSize: '11px', color: th('#991b1b', { dark: '#F87171' }), marginTop: '2px', fontWeight: 600 }}>Rejection Reason: {ev.rejection_reason}</div>}
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                              <button
                                                onClick={() => handleReviewEvidence(ev.id, 'accepted')}
                                                style={{
                                                  background: '#065F46',
                                                  color: '#fff',
                                                  border: `1px solid ${th('#065F46', { dark: '#34D399' })}`,
                                                  borderRadius: '2px',
                                                  padding: '5px 10px',
                                                  fontSize: '11.5px',
                                                  fontWeight: 600,
                                                  cursor: 'pointer'
                                                }}
                                              >
                                                ✓ Accept
                                              </button>
                                              <button
                                                onClick={() => handleReviewEvidence(ev.id, 'rejected')}
                                                style={{
                                                  background: isRejected ? '#991B1B' : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                                                  color: isRejected ? '#fff' : th('#991B1B', { dark: '#F87171' }),
                                                  border: `1px solid ${th('#991B1B', { dark: '#F87171' })}`,
                                                  borderRadius: '2px',
                                                  padding: '5px 10px',
                                                  fontSize: '11.5px',
                                                  fontWeight: 600,
                                                  cursor: 'pointer'
                                                }}
                                              >
                                                ✗ Reject
                                              </button>
                                              <button onClick={() => handleDeleteEvidence(ev.id)} style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '6px' }}>
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* 3. Upload New Evidence File */}
                          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                            <div className="reg-card-title" style={{ fontSize: '13px', marginBottom: '10px' }}>
                              + Upload Evidence File Directly
                            </div>
                            <input 
                              type="file" 
                              multiple 
                              onChange={e => setUploadFiles(Array.from(e.target.files))}
                              style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}
                            />
                            <input 
                              type="text" 
                              className="reg-input"
                              placeholder="Evidence justification reason..."
                              value={uploadReason}
                              onChange={e => setUploadReason(e.target.value)}
                              style={{ marginBottom: '10px' }}
                            />
                            <button 
                              className="reg-btn-primary"
                              style={{ width: '100%', justifyContent: 'center' }}
                              disabled={uploading}
                              onClick={() => handleUploadEvidence(selectedClause.requirements || selectedClause.id)}
                            >
                              {uploading ? 'Uploading...' : '+ Upload Evidence File'}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Documents Tab in Audit & Evidence */
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th>Document / Standard Document</th>
                      <th>{isDPDP ? 'Section & Rule Requirements' : 'Clause & Control Requirements'}</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSteps.map(s => {
                      const dbStep = stepsMap[s.id];
                      const isApproved = dbStep && dbStep.status === 'completed';

                      return (
                        <tr key={s.id}>
                          <td><strong>{s.title}</strong></td>
                          <td style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                            {formatClauseDisplay(s.requirements)}
                          </td>
                          <td>
                            <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: isApproved ? '#22543d' : th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
                              {isApproved ? 'APPROVED' : 'NOT STARTED'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="reg-btn-secondary reg-btn-sm"
                              onClick={() => handleOpenStep(s)}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeNav === 'documents' ? (

          /* ═════════════════════════════════════════════════════════════════ */
          /* VIEW 4: DOCUMENTS REGISTER                                        */
          /* ═════════════════════════════════════════════════════════════════ */
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <h1 className="reg-title">{isDPDP ? 'DPDP Act, 2023 Documents & Policy Registry' : 'ISO 27001 Documents & Policy Registry'}</h1>
                <div style={{ fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                  {isDPDP ? 'Master catalog of governance documents, privacy policies, notices, and statutory compliance registers.' : 'Master catalog of governance documents, security policies, and standard registers.'}
                </div>
              </div>
              <button 
                className="reg-btn-primary reg-btn-sm"
                onClick={() => {
                  setWorkspaceDoc({ title: '', clauseRef: '', owner: '', approver: '', version: '1.0', dueDate: '', content: '', scope: '', justification: '', tech: '', hr: '', finance: '' });
                  setActiveNav('workspace');
                }}
              >
                + Draft Document
              </button>
            </div>

            <div className="reg-body" style={{ padding: 0 }}>
              <table className="reg-table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Covers Requirements</th>
                    <th>Obligation</th>
                    <th>Approver</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSteps.map(s => {
                    const dbStep = stepsMap[s.id];
                    const isApproved = dbStep && dbStep.status === 'completed';

                    return (
                      <tr key={s.id} onClick={() => handleOpenStep(s)} style={{ cursor: 'pointer' }}>
                        <td><strong>{s.title}</strong></td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                          {formatClauseDisplay(s.requirements)}
                        </td>
                        <td>
                          {(() => {
                            const obl = getStepObligation(s);
                            return (
                              <div className={obl.badgeClass}>
                                {obl.label}
                              </div>
                            );
                          })()}
                        </td>
                        <td>{dbStep?.approver || '-'}</td>
                        <td>{dbStep?.owner || '-'}</td>
                        <td>
                          <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: isApproved ? '#22543d' : th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
                            {isApproved ? 'APPROVED' : 'NOT STARTED'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="reg-btn-secondary reg-btn-sm">
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (

          /* ═════════════════════════════════════════════════════════════════ */
          /* VIEW 5: INTERACTIVE DRAFT WORKSPACE                               */
          /* ═════════════════════════════════════════════════════════════════ */
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <h1 className="reg-title">Interactive Document &amp; Policy Drafter</h1>
                <div style={{ fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                  Author and maintain policy records mapped to your {isDPDP ? 'DPDP Act, 2023' : 'ISO 27001'} requirements.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="reg-btn-secondary reg-btn-sm"
                  onClick={() => setWorkspaceDoc({ title: '', clauseRef: '', owner: '', approver: '', version: '1.0', dueDate: '', custom_type: 'mandatory', content: '', scope: '', justification: '', tech: '', hr: '', finance: '' })}
                >
                  Clear Workspace
                </button>
                <button 
                  className="reg-btn-crimson reg-btn-sm"
                  disabled={savingWorkspace}
                  onClick={handleSaveWorkspace}
                >
                  {savingWorkspace ? 'Saving...' : 'Save to Organization DB'}
                </button>
              </div>
            </div>

            <div className="reg-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="reg-label">Document Title *</label>
                  <input 
                    type="text" 
                    className="reg-input"
                    placeholder={isDPDP ? "e.g. Digital Personal Data Protection Policy, Notice & Consent Procedure" : "e.g. Information Security Policy, Procedure for identification of requirements"}
                    value={workspaceDoc.title}
                    onChange={e => setWorkspaceDoc({ ...workspaceDoc, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="reg-label">{isDPDP ? 'DPDP Act, 2023 Requirement / Section & Rules' : 'ISO 27001 Requirement / Clause & Controls'}</label>
                  <input 
                    type="text" 
                    className="reg-input"
                    placeholder={isDPDP ? "e.g. Section 5 Notice, Section 8(5) Security Safeguards" : "e.g. clause 4.2 and control A.5.31"}
                    value={workspaceDoc.clauseRef}
                    onChange={e => setWorkspaceDoc({ ...workspaceDoc, clauseRef: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="reg-label">Document Author / Owner <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span></label>
                  <input 
                    type="text" 
                    className="reg-input"
                    placeholder={isDPDP ? "e.g. DPO / Privacy Officer" : "e.g. CISO / Security Officer"}
                    value={workspaceDoc.owner}
                    onChange={e => setWorkspaceDoc({ ...workspaceDoc, owner: e.target.value })}
                  />
                </div>
                <div>
                  <label className="reg-label">Approver (Executive) <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span></label>
                  <input 
                    type="text" 
                    className="reg-input"
                    placeholder="e.g. Managing Director / CEO"
                    value={workspaceDoc.approver}
                    onChange={e => setWorkspaceDoc({ ...workspaceDoc, approver: e.target.value })}
                  />
                </div>
                <div>
                  <label className="reg-label">Step Deadline <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span></label>
                  <input 
                    type="date" 
                    className="reg-input"
                    value={workspaceDoc.dueDate}
                    onChange={e => setWorkspaceDoc({ ...workspaceDoc, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="reg-label">Document Status <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span></label>
                  <select
                    className="reg-input"
                    value={workspaceDoc.status || 'completed'}
                    onChange={e => setWorkspaceDoc({ ...workspaceDoc, status: e.target.value })}
                  >
                    <option value="completed">APPROVED / COMPLETED</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="not_started">NOT STARTED</option>
                  </select>
                </div>
                <div>
                  <label className="reg-label">vCISO Policy Classification <span style={{ color: '#E53E3E', fontWeight: 700 }}>*</span></label>
                  <select
                    className="reg-input"
                    value={workspaceDoc.custom_type === 'optional' || workspaceDoc.type === 'optional' ? 'optional' : 'mandatory'}
                    onChange={e => setWorkspaceDoc({ ...workspaceDoc, type: e.target.value, custom_type: e.target.value })}
                  >
                    <option value="mandatory">Mandatory (Enforced for Client)</option>
                    <option value="optional">Optional (Discretionary)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="reg-label">Scope &amp; Policy Text (Initially Empty — Enter your rules):</label>
                <textarea 
                  rows={14}
                  className="reg-textarea"
                  placeholder={`Write the full policy or procedure here...

Example Sections:
1. PURPOSE AND SCOPE
2. ROLES AND RESPONSIBILITIES
3. SPECIFIC CONTROLS & OBLIGATIONS
4. COMPLIANCE AUDIT & PENALTIES
5. VALIDITY AND APPROVAL`}
                  value={workspaceDoc.content}
                  onChange={e => setWorkspaceDoc({ ...workspaceDoc, content: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="reg-btn-crimson"
                  disabled={savingWorkspace}
                  onClick={handleSaveWorkspace}
                >
                  {savingWorkspace ? 'Saving...' : 'Save Document to Database'}
                </button>
              </div>
            </div>
          </div>
        )}
        </PageBody>
      </main>
  );

  // CSPM replaces the clause-by-clause register with the cloud discovery
  // review console, which carries its own header, filters and decisions.
  const content = isCSPM ? (
    <main className="reg-main" style={{ width: '100%', minHeight: '100%', padding: 0 }}>
      <CSPMAssessmentView />
    </main>
  ) : mainContent;

  if (!standalone) {
    return content;
  }

  return (
    <div className="reg-wrap">
      {renderSidebar()}
      {content}
    </div>
  );
}
