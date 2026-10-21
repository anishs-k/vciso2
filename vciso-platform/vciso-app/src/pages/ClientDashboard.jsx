import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ALL_STEPS, DPDP_STEPS, CLAUSES_LIST, getEvidencesForItem, applyDbStepRequirements } from './vciso/VCISOMainPage';
import { scopeEvidencesToFramework, scopeStepsToFramework } from './frameworkScope';
import ISO27001QuestionnairePage from './ISO27001QuestionnairePage';
import DPDPQuestionnairePage from './DPDPQuestionnairePage';
import CSPMQuestionnairePage from './CSPMQuestionnairePage';
import isoQuestionsData from '../data/iso27001_questionnaire.json';
import dpdpQuestionsData from '../data/dpdp_questionnaire.json';
import { th } from '../theme';

// Renders a step's requirement string the way the audit views spell clauses:
// 'clause 7.5' -> 'Clause 7.5', 'Section 4, Section 8(1), and Rule 3' ->
// 'Section 4, Section 8(1) & Rule 3'.
function formatRequirementDisplay(req) {
  if (!req) return '';
  return String(req)
    .trim()
    .replace(/\bclauses\b/gi, 'Clauses')
    .replace(/\bclause\b/gi, 'Clause')
    .replace(/\bsections\b/gi, 'Sections')
    .replace(/\bsection\b/gi, 'Section')
    .replace(/\brules\b/gi, 'Rules')
    .replace(/\brule\b/gi, 'Rule')
    .replace(/\bcontrols\b/gi, 'Controls')
    .replace(/\bcontrol\b/gi, 'Control')
    .replace(/,?\s+and\s+/gi, ' & ');
}

export default function ClientDashboard() {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();
  const token = getToken ? getToken() : localStorage.getItem('vciso_token');
  const clientId = user?.client_id || 'client-001';

  // Navigation state: 'overview' | 'documents' | 'implementation' | 'evidence' | 'feedback' | 'iso27001' | 'dpdp' | 'profile'
  const [activeNav, setActiveNav] = useState('overview');
  const [selectedStep, setSelectedStep] = useState(null);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('all'); // 'all' | 'rejected' | 'accepted' | 'pending'
  const [docFilter, setDocFilter] = useState('all'); // 'all' | 'mandatory' | 'with_proof'
  const [docSearch, setDocSearch] = useState('');

  // Sidebar collapsible sections
  const [openSections, setOpenSections] = useState({
    compliance: true,
    assessments: true,
    account: true
  });
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Evidence Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState('');
  const [uploadTargetName, setUploadTargetName] = useState('');
  const [uploadRequirement, setUploadRequirement] = useState('');
  const [uploadFramework, setUploadFramework] = useState('iso27001-2022');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadReason, setUploadReason] = useState('');
  const [uploading, setUploading] = useState(false);

  // Live Backend Data
  const [dbData, setDbData] = useState({
    client: null,
    companyInfo: null,
    contract: null,
    steps: [],
    clientClauses: [],
    clientControls: [],
    evidences: [],
    assessment: null,
    dpdpAssessment: null,
    responses: [],
    dpdpResponses: []
  });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load all live DB data
  const loadData = useCallback(async () => {
    setLoading(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [mainRes, sumRes] = await Promise.all([
        fetch('/api/vciso/vcisomainpage/data', { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/vciso/client-dashboard-summary/${clientId}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (mainRes && mainRes.success) {
        setDbData(mainRes);
      }
      if (sumRes) {
        setSummary(sumRes);
      }
    } catch (err) {
      console.error('Error loading client portal data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Dynamic Frameworks selected during onboarding (fetched from Supabase DB, strictly deduplicated)
  const onboardingFrameworks = useMemo(() => {
    const raw = dbData.frameworkSelections || [];
    const list = Array.isArray(raw) ? raw : [raw];
    const seen = new Set();
    const result = [];
    list.filter(Boolean).forEach(item => {
      const str = String(item).trim();
      const lower = str.toLowerCase();
      let fwObj;
      if (lower.includes('iso') || lower.includes('27001')) {
        fwObj = { id: 'iso27001-2022', name: 'ISO/IEC 27001:2022', shortName: 'ISO 27001' };
      } else if (lower.includes('dpdp') || lower.includes('dpdpa')) {
        fwObj = { id: 'dpdp-2023', name: 'DPDP Act, 2023', shortName: 'DPDP Act, 2023' };
      } else if (lower.includes('cspm') || lower.includes('cloud security posture')) {
        fwObj = { id: 'cspm', name: 'CSPM', shortName: 'CSPM' };
      } else if (lower.includes('soc 2') || lower.includes('soc2')) {
        fwObj = { id: 'soc2', name: 'SOC 2 Type II', shortName: 'SOC 2 Type II' };
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
    return result.length > 0 ? result : [
      { id: 'iso27001-2022', name: 'ISO/IEC 27001:2022', shortName: 'ISO 27001' },
      { id: 'dpdp-2023', name: 'DPDP Act, 2023', shortName: 'DPDP Act, 2023' }
    ];
  }, [dbData.frameworkSelections]);

  const [selectedFramework, setSelectedFramework] = useState('iso27001-2022');

  // Cloud platforms scoped for CSPM during admin onboarding. Only ever used to
  // label the CSPM card — the questionnaire itself reads the same record.
  const cspmProviders = useMemo(() => {
    const labels = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
    return (Array.isArray(dbData.cloudProviders) ? dbData.cloudProviders : [])
      .map(p => labels[String(p).toLowerCase()])
      .filter(Boolean);
  }, [dbData.cloudProviders]);

  const cspmScopeLabel = cspmProviders.length > 0
    ? `${cspmProviders.join(', ')} in scope`
    : 'Cloud platform scope pending';

  useEffect(() => {
    if (onboardingFrameworks.length > 0 && !onboardingFrameworks.some(f => f.id === selectedFramework)) {
      setSelectedFramework(onboardingFrameworks[0].id);
      setUploadFramework(onboardingFrameworks[0].id);
    }
  }, [onboardingFrameworks, selectedFramework]);

  // Active framework detection & steps dataset
  const isDPDP = useMemo(() => {
    return selectedFramework === 'dpdp' || selectedFramework === 'dpdp-2023' || String(selectedFramework).toLowerCase().includes('dpdp');
  }, [selectedFramework]);

  // CSPM is a discovery questionnaire, not an implementation programme: it has
  // no step catalogue, so the policy / task views stay empty rather than
  // falling back to the ISO steps.
  const isCSPM = useMemo(
    () => String(selectedFramework).toLowerCase().includes('cspm'),
    [selectedFramework]
  );

  const handleFrameworkChange = useCallback((newFw) => {
    setSelectedFramework(newFw);
    setUploadFramework(newFw);
    const isNewCSPM = newFw === 'cspm' || String(newFw).toLowerCase().includes('cspm');
    if (isNewCSPM) {
      setActiveNav('cspm');
    } else if (activeNav === 'cspm') {
      setActiveNav('overview');
    }
  }, [activeNav]);

  const currentSteps = useMemo(
    () => (isCSPM ? [] : applyDbStepRequirements(isDPDP ? DPDP_STEPS : ALL_STEPS, dbData.implementationSteps)),
    [isCSPM, isDPDP, dbData.implementationSteps]
  );

  // The framework id written onto a proof when the upload modal has no explicit
  // target framework of its own.
  const defaultUploadFramework = isCSPM ? 'cspm' : isDPDP ? 'dpdp-2023' : 'iso27001-2022';

  // Policies the vCISO has authored, narrowed to the framework selected in the
  // sidebar. An ISO step row must never surface under DPDP: the two catalogues
  // use distinct ids ('step-3' vs 'dpdp-step-3'), but a row that matches
  // neither catalogue used to be rendered as a "custom" policy in every
  // framework, which is what produced the ghost entries.
  const frameworkSteps = useMemo(
    () => scopeStepsToFramework(dbData.steps, selectedFramework),
    [dbData.steps, selectedFramework]
  );

  // Map of steps from database, scoped to the active framework
  const stepsMap = useMemo(() => {
    const map = {};
    frameworkSteps.forEach(s => {
      map[s.step_id] = s;
    });
    return map;
  }, [frameworkSteps]);

  // Master questionnaire questions catalogue for reference & question ID resolution
  const allQuestionsList = useMemo(() => {
    const isoList = isoQuestionsData?.questions || [];
    const dpdpList = dpdpQuestionsData?.questions || [];
    return [...isoList, ...dpdpList];
  }, []);

  // Implementation steps indexed by id ('step-2', 'dpdp-step-2'), so a proof
  // uploaded against a step can be labelled with the clause / control it
  // satisfies instead of a bare step number.
  const stepsById = useMemo(() => {
    const map = {};
    applyDbStepRequirements([...ALL_STEPS, ...DPDP_STEPS], dbData.implementationSteps).forEach(s => {
      if (s.id) map[String(s.id).toLowerCase()] = s;
    });
    return map;
  }, [dbData.implementationSteps]);

  // Every proof the org has uploaded, narrowed to the framework selected in
  // the sidebar — an ISO proof must never surface inside the DPDP tab.
  const frameworkEvidences = useMemo(
    () => scopeEvidencesToFramework(dbData.evidences, selectedFramework),
    [dbData.evidences, selectedFramework]
  );

  // Helper to resolve question ID, clause reference, title, and formatted display tag
  const findQuestionInfo = useCallback((item) => {
    const rawQId = (item.questionId || item.question_id || item.id || '').toString().trim();
    const rawRef = (item.reference || item.control_id || item.clause_number || item.clause || '').toString().trim();
    
    // 1. Match by question ID (e.g. Q003)
    let qObj = allQuestionsList.find(q => q.id && q.id.toLowerCase() === rawQId.toLowerCase());
    // 2. Match by reference (e.g. 4.3)
    if (!qObj && rawRef) {
      qObj = allQuestionsList.find(q => q.reference && q.reference.toLowerCase() === rawRef.toLowerCase());
    }
    // 3. Match if rawQId is actually a reference
    if (!qObj && rawQId) {
      qObj = allQuestionsList.find(q => q.reference && q.reference.toLowerCase() === rawQId.toLowerCase());
    }

    // 4. Proofs uploaded against an implementation step carry a step id rather
    //    than a question id, so resolve those to the step's own clause/control.
    const stepObj = qObj
      ? null
      : (stepsById[rawRef.toLowerCase()] || stepsById[rawQId.toLowerCase()] || null);

    const resolvedQId = qObj?.id || (/^Q\d+$/i.test(rawQId) ? rawQId : null);
    const resolvedRef = qObj?.reference || rawRef || (/^Q\d+$/i.test(rawQId) ? '' : rawQId);
    const resolvedTitle =
      qObj?.title || item.title || item.question || item.requirement_name || stepObj?.title || '';

    // The clause / control this proof is evidence for, in both cases.
    const resolvedClause = stepObj
      ? formatRequirementDisplay(stepObj.requirements)
      : (qObj?.reference || '');

    let displayTag = '';
    if (stepObj) {
      const stepLabel = stepObj.num ? `Step ${stepObj.num}` : stepObj.id;
      displayTag = resolvedClause ? `[${stepLabel}](${resolvedClause})` : `[${stepLabel}]`;
    } else if (resolvedQId && resolvedRef && resolvedQId.toLowerCase() !== resolvedRef.toLowerCase()) {
      displayTag = `[${resolvedQId}](${resolvedRef})`;
    } else if (resolvedQId) {
      displayTag = `[${resolvedQId}]`;
    } else if (resolvedRef) {
      displayTag = `[${resolvedRef}]`;
    } else {
      displayTag = '[Requirement]';
    }

    const fwKey = item.framework_id ? (item.framework_id.toLowerCase().includes('dpdp') ? 'dpdp' : 'iso') : (isDPDP ? 'dpdp' : 'iso');
    const canonicalKey = `${fwKey}_${(resolvedQId || resolvedRef || item.id || item.filename || '').toLowerCase()}`;

    return {
      qObj,
      stepObj,
      resolvedQId,
      resolvedRef,
      resolvedClause,
      resolvedTitle,
      displayTag,
      canonicalKey
    };
  }, [allQuestionsList, stepsById, isDPDP]);

  // Received Policies list: strictly steps / custom documents authored by the vCISO for this client
  const receivedPolicies = useMemo(() => {
    // 1. Check current framework steps (ISO or DPDP)
    const matchedStandardSteps = currentSteps.filter(step => {
      const dbStep = stepsMap[step.id] || frameworkSteps.find(s => 
        s.step_id === step.id || 
        (step.requirements && s.step_id?.toLowerCase().includes(step.requirements.toLowerCase().replace(/[^a-z0-9]/g, '_')))
      );
      return Boolean(dbStep && dbStep.doc_content && String(dbStep.doc_content).trim() !== '');
    });

    // 2. Check any custom steps authored by vCISO for THIS framework that aren't in currentSteps
    const customSteps = frameworkSteps.filter(s => {
      if (!s.doc_content || String(s.doc_content).trim() === '') return false;
      const isAlreadyInStandard = currentSteps.some(cs => cs.id === s.step_id || (cs.requirements && s.step_id?.toLowerCase().includes(cs.requirements.toLowerCase().replace(/[^a-z0-9]/g, '_'))));
      return !isAlreadyInStandard;
    }).map((s, idx) => ({
      id: s.step_id,
      num: `C.${idx + 1}`,
      title: s.notes || s.step_id,
      phase: 'Custom',
      phaseTitle: 'Custom Organization Policies',
      requirements: s.step_id,
      why: 'Custom policy document drafted by vCISO.',
      workload: 'N/A',
      duration: 'N/A',
      isMandatory: s.custom_type === 'mandatory' || s.type === 'mandatory'
    }));

    return [...matchedStandardSteps, ...customSteps];
  }, [currentSteps, stepsMap, frameworkSteps]);

  // Counts calculated live strictly from user DB entries for the received policies
  const completedStepsCount = useMemo(() => {
    return receivedPolicies.filter(s => {
      const row = stepsMap[s.id];
      return row && row.status === 'completed';
    }).length;
  }, [stepsMap, receivedPolicies]);

  // Evidence status counts (filtered by current framework and strictly deduplicated)
  const rejectedEvidences = useMemo(() => {
    const fromList = frameworkEvidences.filter(e => e.review_status === 'rejected');
    const fromSum = scopeEvidencesToFramework(summary?.rejectedEvidences, selectedFramework);

    const map = new Map();

    [...fromList, ...fromSum].forEach(item => {
      const info = findQuestionInfo(item);
      const key = info.canonicalKey;

      if (!map.has(key)) {
        map.set(key, {
          ...item,
          questionId: info.resolvedQId,
          reference: info.resolvedRef,
          title: info.resolvedTitle,
          displayTag: info.displayTag,
          vcisoRejectionReason: item.vcisoRejectionReason || item.vcisoNotes || item.rejection_reason || item.vciso_notes,
          reviewedBy: item.reviewedBy || item.reviewed_by || 'vCISO Lead',
          reviewedAt: item.reviewedAt || item.reviewed_at
        });
      } else {
        const existing = map.get(key);
        if (!existing.questionId && info.resolvedQId) existing.questionId = info.resolvedQId;
        if (!existing.reference && info.resolvedRef) existing.reference = info.resolvedRef;
        if (!existing.title && info.resolvedTitle) existing.title = info.resolvedTitle;
        if (!existing.displayTag && info.displayTag) existing.displayTag = info.displayTag;
        if (!existing.vcisoRejectionReason) existing.vcisoRejectionReason = item.vcisoRejectionReason || item.vcisoNotes || item.rejection_reason || item.vciso_notes;
        if ((!existing.reviewedBy || existing.reviewedBy === 'vCISO Lead') && item.reviewedBy) existing.reviewedBy = item.reviewedBy;
      }
    });

    return Array.from(map.values());
  }, [frameworkEvidences, summary?.rejectedEvidences, selectedFramework, findQuestionInfo]);

  const acceptedEvidences = useMemo(() => {
    const list = frameworkEvidences.filter(
      e => e.review_status === 'accepted' || e.review_status === 'verified'
    );
    const map = new Map();
    list.forEach(item => {
      const info = findQuestionInfo(item);
      const key = info.canonicalKey;
      if (!map.has(key)) {
        map.set(key, {
          ...item,
          questionId: info.resolvedQId,
          reference: info.resolvedRef,
          title: info.resolvedTitle,
          displayTag: info.displayTag
        });
      }
    });
    return Array.from(map.values());
  }, [frameworkEvidences, findQuestionInfo]);

  const pendingEvidences = useMemo(() => {
    const list = frameworkEvidences.filter(
      e => !e.review_status || e.review_status === 'pending'
    );
    const map = new Map();
    list.forEach(item => {
      const info = findQuestionInfo(item);
      const key = info.canonicalKey;
      if (!map.has(key)) {
        map.set(key, {
          ...item,
          questionId: info.resolvedQId,
          reference: info.resolvedRef,
          title: info.resolvedTitle,
          displayTag: info.displayTag
        });
      }
    });
    return Array.from(map.values());
  }, [frameworkEvidences, findQuestionInfo]);

  const readinessScore = useMemo(() => {
    if (dbData.assessment?.readiness_score !== undefined && !isDPDP) return dbData.assessment.readiness_score;
    if (dbData.dpdpAssessment?.readiness_score !== undefined && isDPDP) return dbData.dpdpAssessment.readiness_score;
    if (summary?.stats?.readinessScore !== undefined) return summary.stats.readinessScore;
    if (receivedPolicies.length === 0) return 0;
    return Math.round((completedStepsCount / Math.max(1, receivedPolicies.length)) * 100);
  }, [dbData.assessment, dbData.dpdpAssessment, summary?.stats, completedStepsCount, receivedPolicies.length, isDPDP]);

  // Client display details
  const orgName = dbData.companyInfo?.legal_name || dbData.companyInfo?.company_name || dbData.client?.name || user?.company_name || 'Client Workspace';
  const orgBranch = dbData.companyInfo?.company_branch || '';
  const orgIndustry = dbData.companyInfo?.industry || dbData.client?.industry || 'Technology';
  const userName = user?.name || 'Security Officer';
  const userEmail = user?.email || 'client@organization.com';
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CL';
  const [showOrgDetails, setShowOrgDetails] = useState(false);

  // Master Obligation Types resolver (Supabase DB-backed: master_clause_control_types + iso_impl_steps)
  const getStepObligation = useCallback((step) => {
    if (!step) return { type: 'mandatory', customType: 'mandatory', label: 'Mandatory (vCISO)', badgeClass: 'reg-stamp', isMandatory: true, isCustom: true };
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

    // Classification saved by the vCISO in DB (iso_impl_steps) takes top priority, followed by master types
    const vcisoClassification = dbStep.custom_type || dbStep.type;
    const isOptional = vcisoClassification === 'optional' || (!vcisoClassification && (master?.type === 'optional' || (!master?.type && !step.isMandatory)));

    if (isOptional) {
      return {
        type: 'optional',
        customType: 'optional',
        label: 'Optional (vCISO)',
        badgeClass: 'reg-stamp opt',
        isMandatory: false,
        isCustom: true
      };
    } else {
      return {
        type: 'mandatory',
        customType: 'mandatory',
        label: 'Mandatory (vCISO)',
        badgeClass: 'reg-stamp',
        isMandatory: true,
        isCustom: true
      };
    }
  }, [stepsMap, dbData.masterTypes]);

  // Live step document resolver for client view
  const selectedStepDoc = useMemo(() => {
    if (!selectedStep) return null;
    if (stepsMap[selectedStep.id]) return stepsMap[selectedStep.id];
    return frameworkSteps.find(s => 
      s.step_id === selectedStep.id ||
      (selectedStep.requirements && s.step_id?.toLowerCase().includes(selectedStep.requirements.toLowerCase().replace(/[^a-z0-9]/g, '_'))) ||
      (s.notes && typeof s.notes === 'string' && s.notes.toLowerCase().includes(selectedStep.title?.toLowerCase()))
    ) || null;
  }, [selectedStep, stepsMap, frameworkSteps]);

  // Conditional visibility: Implementation Tasks and Feedback tabs only visible once gap assessment is reviewed
  const isAssessmentReviewed = useMemo(() => {
    const assessmentStatus = dbData.assessment?.status;
    const isAssReviewed = Boolean(
      assessmentStatus && ['approved', 'rejected', 'reviewed', 'completed', 'changes_requested'].includes(assessmentStatus)
    );
    const hasReviewedResponses = (dbData.responses || []).some(
      r => r.vciso_review_status === 'accepted' || r.vciso_review_status === 'rejected' || r.vciso_review_status === 'verified'
    );
    const hasReviewedEvidences = frameworkEvidences.some(
      e => e.review_status === 'accepted' || e.review_status === 'rejected' || e.review_status === 'verified'
    );
    return isAssReviewed || hasReviewedResponses || hasReviewedEvidences;
  }, [dbData.assessment, dbData.responses, frameworkEvidences]);

  // Upload Evidence handler
  const handleUploadEvidence = async (e) => {
    if (e) e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) {
      alert('Please select at least one file to upload.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < uploadFiles.length; i++) {
        formData.append('files', uploadFiles[i]);
      }
      formData.append('control_id', uploadTargetId || 'general');
      formData.append('step_id', uploadTargetId || '');
      formData.append('requirement_name', uploadTargetName || uploadTargetId || '');
      formData.append('reference', uploadRequirement || uploadTargetId || '');
      formData.append('reason', uploadReason);
      formData.append('framework_id', uploadFramework || defaultUploadFramework);

      const res = await fetch('/api/vciso/vcisomainpage/evidence/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        setUploadFiles([]);
        setUploadReason('');
        setUploadModalOpen(false);
        await loadData();
        alert('Evidence uploaded successfully! Your vCISO has been notified for verification.');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Upload error: ${err.error || 'Server rejected upload'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading evidence file.');
    } finally {
      setUploading(false);
    }
  };

  // Delete evidence file
  const handleDeleteEvidence = async (id) => {
    if (!window.confirm('Delete this uploaded evidence file?')) return;
    try {
      await fetch(`/api/vciso/vcisomainpage/evidence/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const openUploadForTarget = (targetId, targetTitle, framework = null, requirement = '') => {
    setUploadTargetId(targetId);
    setUploadTargetName(targetTitle);
    setUploadRequirement(requirement);
    setUploadFramework(framework || defaultUploadFramework);
    setUploadReason('');
    setUploadFiles([]);
    setUploadModalOpen(true);
  };

  // Filtered documents list (derived from received policies and dynamic obligations)
  const filteredDocuments = useMemo(() => {
    return receivedPolicies.filter(step => {
      const obligation = getStepObligation(step);
      const stepEvs = getEvidencesForItem(step, dbData.evidences, selectedFramework);
      const hasProof = stepEvs.length > 0;

      if (docFilter === 'mandatory' && !obligation.isMandatory) return false;
      if (docFilter === 'with_proof' && !hasProof) return false;

      if (docSearch) {
        const q = docSearch.toLowerCase();
        const matchesTitle = step.title?.toLowerCase().includes(q);
        const matchesReq = step.requirements?.toLowerCase().includes(q);
        const matchesPhase = step.phaseTitle?.toLowerCase().includes(q);
        return matchesTitle || matchesReq || matchesPhase;
      }
      return true;
    });
  }, [receivedPolicies, getStepObligation, dbData.evidences, selectedFramework, docFilter, docSearch]);

  // Embedded Questionnaires
  if (activeNav === 'iso27001') {
    return (
      <div className="reg-wrap">
        <ClientSidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          orgName={orgName}
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          onLogout={handleLogout}
          rejectedCount={rejectedEvidences.length}
          openSections={openSections}
          toggleSection={toggleSection}
          totalDocs={receivedPolicies.length}
          totalImplTasks={receivedPolicies.length}
          totalEvidence={frameworkEvidences.length}
          onboardingFrameworks={onboardingFrameworks}
          selectedFramework={selectedFramework}
          setSelectedFramework={handleFrameworkChange}
          isAssessmentReviewed={isAssessmentReviewed}
        />
        <div style={{ flex: 1, overflowY: 'auto', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }) }}>
          <div style={{ padding: '20px 32px 0' }}>
            <button
              onClick={() => setActiveNav('overview')}
              className="reg-btn-secondary reg-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ← Back to Client Workspace
            </button>
          </div>
          <ISO27001QuestionnairePage embedded={true} onBack={() => setActiveNav('overview')} />
        </div>
      </div>
    );
  }

  if (activeNav === 'dpdp') {
    return (
      <div className="reg-wrap">
        <ClientSidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          orgName={orgName}
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          onLogout={handleLogout}
          rejectedCount={rejectedEvidences.length}
          openSections={openSections}
          toggleSection={toggleSection}
          totalDocs={receivedPolicies.length}
          totalImplTasks={receivedPolicies.length}
          totalEvidence={frameworkEvidences.length}
          onboardingFrameworks={onboardingFrameworks}
          selectedFramework={selectedFramework}
          setSelectedFramework={handleFrameworkChange}
          isAssessmentReviewed={isAssessmentReviewed}
        />
        <div style={{ flex: 1, overflowY: 'auto', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }) }}>
          <div style={{ padding: '20px 32px 0' }}>
            <button
              onClick={() => setActiveNav('overview')}
              className="reg-btn-secondary reg-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ← Back to Client Workspace
            </button>
          </div>
          <DPDPQuestionnairePage embedded={true} onBack={() => setActiveNav('overview')} />
        </div>
      </div>
    );
  }

  if (activeNav === 'cspm') {
    return (
      <div className="reg-wrap">
        <ClientSidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          orgName={orgName}
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          onLogout={handleLogout}
          rejectedCount={rejectedEvidences.length}
          openSections={openSections}
          toggleSection={toggleSection}
          totalDocs={receivedPolicies.length}
          totalImplTasks={receivedPolicies.length}
          totalEvidence={frameworkEvidences.length}
          onboardingFrameworks={onboardingFrameworks}
          selectedFramework={selectedFramework}
          setSelectedFramework={handleFrameworkChange}
          isAssessmentReviewed={isAssessmentReviewed}
        />
        <div style={{ flex: 1, overflowY: 'auto', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }) }}>
          <CSPMQuestionnairePage embedded={true} onBack={() => setActiveNav('overview')} />
        </div>
      </div>
    );
  }

  return (
    <div className="reg-wrap">
      {/* ── STYLES INSPIRED BY VCISOMAINPAGE ── */}
      <style>{`${th(`
        `, { classic: `
        `, dark: `
        ` })}@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');${th(`

        `, { classic: `

        `, dark: `

        ` })}.reg-wrap * { box-sizing: border-box; }${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-wrap {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#EDF2F7`, { classic: `#F1F5F9`, dark: `#0F172A` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}min-height: 100vh;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* ---------- Sidebar ---------- */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-side {${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 240px;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#2D3748`, { classic: `#0F172A`, dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#CBD5E0`, { classic: `#475569`, dark: `#C9CCC2` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 20px 0 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-direction: column;${th(`
          `, { classic: `
          `, dark: `
          ` })}height: 100vh;${th(`
          `, { classic: `
          `, dark: `
          ` })}position: sticky;${th(`
          `, { classic: `
          `, dark: `
          ` })}top: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow: hidden;${th(`
          `, { classic: `
          `, dark: `
          ` })}box-shadow: 1px 0 0 ${th(`#3A475C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-brand {${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 0 20px 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-bottom: 1px solid ${th(`#3A475C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-brand-name {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Source Serif 4', serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 19px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { dark: `#F2EFE6` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}letter-spacing: -0.01em;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-brand-sub {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 11px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#A0AEC0`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-top: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}white-space: nowrap;${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow: hidden;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-overflow: ellipsis;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-select {${th(`
          `, { classic: `
          `, dark: `
          ` })}margin: 14px 16px 10px;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 8px 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#4A5568`, { classic: `#CBD5E1`, dark: `#3a4048` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `4px`, dark: `4px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { classic: `#0F172A`, dark: `#E3E1D8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: space-between;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#F8FAFC`, dark: `#21262D` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}user-select: none;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: background 0.15s, border-color 0.15s;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-select:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#F1F5F9`, dark: `#262B32` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#4B5563`, { dark: `#CBD5E1` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-scroll {${th(`
          `, { classic: `
          `, dark: `
          ` })}flex: 1;${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow-y: auto;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 4px 0 16px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-scroll::-webkit-scrollbar {${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 4px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-scroll::-webkit-scrollbar-track {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: transparent;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-scroll::-webkit-scrollbar-thumb {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-section-hdr {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 10px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#A0AEC0`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 12px 20px 5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}letter-spacing: .06em;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-transform: uppercase;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: space-between;${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}user-select: none;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: color 0.15s;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-section-hdr:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#CBD5E0`, { classic: `#475569`, dark: `#C9CCC2` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-section-chevron {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 10px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#A0AEC0`, { classic: `#555A60`, dark: `#555A60` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: transform 0.15s;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-item {${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 7.5px 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-left: 2px solid transparent;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#CBD5E0`, { classic: `#475569`, dark: `#C9CCC2` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: background 0.15s, color 0.15s;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: space-between;${th(`
          `, { classic: `
          `, dark: `
          ` })}user-select: none;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 8px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-item:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#F8FAFC`, dark: `#21262D` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { dark: `#F2EFE6` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-item.active {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#F1F5F9`, dark: `#262B32` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-left-color: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { dark: `#F2EFE6` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-item-text {${th(`
          `, { classic: `
          `, dark: `
          ` })}white-space: nowrap;${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow: hidden;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-overflow: ellipsis;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex: 1;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-nav-item .tag {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 9.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#1A202C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 1px 6px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#CBD5E0`, { classic: `#475569`, dark: `#C9CCC2` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-badge-crimson {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 9.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 1px 6px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: #FFFFFF;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-badge-amber {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 9.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: #8C5810;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 1px 6px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: #FEF3C7;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-badge-emerald {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 9.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: #1B4D3E;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 1px 6px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: #D1FAE5;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-user-footer {${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 14px 18px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-top: 1px solid ${th(`#3A475C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#283141`, { classic: `#0F172A`, dark: `#171B21` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-direction: column;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 10px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-user-row {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 10px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-user-avatar {${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 30px;${th(`
          `, { classic: `
          `, dark: `
          ` })}height: 30px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 50%;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#F1F5F9`, dark: `#262B32` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#4A5568`, { classic: `#CBD5E1`, dark: `#3A4048` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { dark: `#F2EFE6` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 11px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-user-info {${th(`
          `, { classic: `
          `, dark: `
          ` })}min-width: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex: 1;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-user-name {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { dark: `#F2EFE6` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}white-space: nowrap;${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow: hidden;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-overflow: ellipsis;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-user-email {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 10.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#A0AEC0`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}white-space: nowrap;${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow: hidden;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-overflow: ellipsis;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-logout-btn {${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 100%;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#F8FAFC`, dark: `#21262D` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#3A475C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#CBD5E0`, { classic: `#475569`, dark: `#C9CCC2` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 11.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 6px 10px;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 6px;${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: background 0.15s, color 0.15s, border-color 0.15s;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-logout-btn:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#F1F5F9`, dark: `#262B32` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { dark: `#F2EFE6` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#4B5563`, { dark: `#CBD5E1` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* ---------- Main content ---------- */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-main {${th(`
          `, { classic: `
          `, dark: `
          ` })}flex: 1;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 36px 44px;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#EDF2F7`, { classic: `#F1F5F9`, dark: `#0F172A` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow-y: auto;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-topline {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#718096`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 20px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-topline b {${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}.reg-doc {${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#fff`, { dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}box-shadow: ${th(`none`, { classic: `0 1px 3px rgba(0,0,0,0.02)`, dark: `0 1px 3px rgba(0,0,0,0.02)` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 24px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-doc-head {${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 26px 36px 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-bottom: 1px solid ${th(`#E2E8F0`, { dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: space-between;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: flex-end;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-wrap: wrap;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 16px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-title {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Source Serif 4', serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 25px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin: 0;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-meta {${th(`
          `, { classic: `
          `, dark: `
          ` })}text-align: right;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-meta-num {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'JetBrains Mono', monospace;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 13px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-ticks {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 3px;${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-top: 7px;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: flex-end;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-tick {${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 9px;${th(`
          `, { classic: `
          `, dark: `
          ` })}height: 5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#E2E8F0`, { dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 1px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-tick.done {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}.reg-body {${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 24px 36px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-body p {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 13.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#4A5568`, { classic: `#475569`, dark: `#A3AEBF` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}line-height: 1.6;${th(`
          `, { classic: `
          `, dark: `
          ` })}max-width: 720px;${th(`
          `, { classic: `
          `, dark: `
          ` })}margin: 0 0 20px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-section {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Source Serif 4', serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 15.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin: 0 0 4px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}.reg-row {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: flex-start;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 16px 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-top: 1px solid ${th(`#EDF2F7`, { classic: `#E2E8F0`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: background 0.1s ease;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-row:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#F8FAFC`, { dark: `#0F172A` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-row:hover .reg-row-title {${th(`
          `, { classic: `
          `, dark: `
          ` })}text-decoration: underline;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-underline-offset: 3px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-num {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Source Serif 4', serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 13.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 28px;${th(`
          `, { classic: `
          `, dark: `
          ` })}height: 28px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 50%;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-shrink: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: all 0.15s;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-num.done {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: #FFFFFF;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-num.prog {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#EDF2F7`, { classic: `#F1F5F9`, dark: `#0F172A` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-row-main {${th(`
          `, { classic: `
          `, dark: `
          ` })}flex: 1;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-row-title {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 14px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-row-clause {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'JetBrains Mono', monospace;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 11.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#4A5568`, { classic: `#94A3B8`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-left: 8px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-stamp {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Source Serif 4', serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 10.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 3px 10px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1.4px solid ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}transform: rotate(-2deg);${th(`
          `, { classic: `
          `, dark: `
          ` })}white-space: nowrap;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: inline-block;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-stamp.opt {${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#A0AEC0`, { classic: `#94A3B8`, dark: `#A9A490` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#A0AEC0`, { classic: `#475569`, dark: `#8b8778` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-stamp.ok {${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: #1B4D3E;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: #1B4D3E;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}.reg-notice-box {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#F8FAFC`, { dark: `#0F172A` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px dashed ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 14px 18px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#4A5568`, { classic: `#475569`, dark: `#A3AEBF` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin: 12px 0 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}line-height: 1.5;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-alert-box {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#FFF5F5`, { dark: `#3A1418` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#FEB2B2`, { dark: `#7F1D1D` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 14px 18px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#9B2C2C`, { dark: `#F87171` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: space-between;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 12px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* Buttons */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-btn-primary {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#FFFFFF`, { dark: `#F2EFE6` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 7px 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: background 0.15s, border-color 0.15s;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: inline-flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 6px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-btn-primary:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3A475C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#3A475C`, { classic: `#E2E8F0`, dark: `#333B42` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-btn-crimson {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: #FFFFFF;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 7px 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: background 0.15s;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: inline-flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 6px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-btn-crimson:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#2B6CB0`, { classic: `#1D4ED8`, dark: `#3B82F6` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-btn-secondary {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#FFFFFF`, { dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 7px 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: all 0.15s;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-btn-secondary:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#EDF2F7`, { classic: `#F1F5F9`, dark: `#0F172A` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-btn-sm {${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 5px 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 11px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* Cards & Gauges */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-card {${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#EDF2F7`, { classic: `#E2E8F0`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#EDF2F7`, { classic: `#F1F5F9`, dark: `#0F172A` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 18px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-card-title {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Source Serif 4', serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 15px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin: 0 0 4px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-card-sub {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#4A5568`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin: 0 0 14px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-label {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: block;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 10.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-transform: uppercase;${th(`
          `, { classic: `
          `, dark: `
          ` })}letter-spacing: .05em;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#A0AEC0`, { classic: `#555A60`, dark: `#555A60` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 6px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-input {${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 100%;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#FFFFFF`, { dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 8px 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 13px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-input:focus {${th(`
          `, { classic: `
          `, dark: `
          ` })}outline: none;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-textarea {${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 100%;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#FFFFFF`, { dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 10px 12px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 13px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Inter', sans-serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}min-height: 90px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* Grid Gauges */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-gauges-grid {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: grid;${th(`
          `, { classic: `
          `, dark: `
          ` })}grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 24px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-gauge-card {${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#FFFFFF`, { dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: 2px;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 18px 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}flex-direction: column;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: space-between;${th(`
          `, { classic: `
          `, dark: `
          ` })}box-shadow:${th(``, { classic: ` 0` })} ${th(`none`, { classic: `1px 2px rgba(0,0,0,0.02)`, dark: `0 1px 2px rgba(0,0,0,0.02)` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-gauge-card:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}border-color: ${th(`#A0AEC0`, { classic: `#94A3B8`, dark: `#A9A490` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-gauge-label {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 10.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-transform: uppercase;${th(`
          `, { classic: `
          `, dark: `
          ` })}letter-spacing: .05em;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#4A5568`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 8px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-gauge-val {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-family: 'Source Serif 4', serif;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 26px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-gauge-sub {${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 11px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: #8C8A80;${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-top: 4px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* Tabs */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-tabs {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-bottom: 1px solid ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 20px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-tab {${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 8px 14px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#4A5568`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border: none;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: none;${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}border-bottom: 2px solid transparent;${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: -1px;${th(`
          `, { classic: `
          `, dark: `
          ` })}transition: all 0.15s;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-tab:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-tab.active {${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-bottom-color: ${th(`#3182CE`, { classic: `#2563EB`, dark: `#60A5FA` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 700;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* Modal Overlay */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-modal-overlay {${th(`
          `, { classic: `
          `, dark: `
          ` })}position: fixed;${th(`
          `, { classic: `
          `, dark: `
          ` })}top: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}left: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}right: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}bottom: 0;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: rgba(${th(`15`, { classic: `27`, dark: `27` })}, ${th(`23`, { classic: `32`, dark: `32` })}, ${th(`42`, { classic: `39`, dark: `39` })}, 0.6);${th(`
          `, { classic: `
          `, dark: `
          ` })}display: flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}justify-content: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}z-index: 999;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 20px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-modal-box {${th(`
          `, { classic: `
          `, dark: `
          ` })}background: ${th(`#FFFFFF`, { dark: `#1E293B` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border: 1px solid ${th(`#D7DEE7`, { classic: `#DCE3EC`, dark: `#334155` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}border-radius: ${th(`2px`, { classic: `3px`, dark: `3px` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}max-width: 600px;${th(`
          `, { classic: `
          `, dark: `
          ` })}width: 100%;${th(`
          `, { classic: `
          `, dark: `
          ` })}max-height: 90vh;${th(`
          `, { classic: `
          `, dark: `
          ` })}overflow-y: auto;${th(`
          `, { classic: `
          `, dark: `
          ` })}padding: 30px 34px;${th(`
          `, { classic: `
          `, dark: `
          ` })}box-shadow: 0 10px 25px rgba(0,0,0,0.15);${th(`
          `, { classic: `
          `, dark: `
          ` })}position: relative;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-modal-close {${th(`
          `, { classic: `
          `, dark: `
          ` })}position: absolute;${th(`
          `, { classic: `
          `, dark: `
          ` })}top: 18px;${th(`
          `, { classic: `
          `, dark: `
          ` })}right: 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 20px;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#4A5568`, { classic: `#64748B`, dark: `#94A3B8` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}background: none;${th(`
          `, { classic: `
          `, dark: `
          ` })}border: none;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`

        `, { classic: `

        `, dark: `

        ` })}/* Back link */${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-back-link {${th(`
          `, { classic: `
          `, dark: `
          ` })}display: inline-flex;${th(`
          `, { classic: `
          `, dark: `
          ` })}align-items: center;${th(`
          `, { classic: `
          `, dark: `
          ` })}gap: 6px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-size: 12.5px;${th(`
          `, { classic: `
          `, dark: `
          ` })}font-weight: 600;${th(`
          `, { classic: `
          `, dark: `
          ` })}color: ${th(`#1A202C`, { classic: `#0F172A`, dark: `#F1F5F9` })};${th(`
          `, { classic: `
          `, dark: `
          ` })}cursor: pointer;${th(`
          `, { classic: `
          `, dark: `
          ` })}margin-bottom: 16px;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-decoration: none;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
        `, { classic: `
        `, dark: `
        ` })}.reg-back-link:hover {${th(`
          `, { classic: `
          `, dark: `
          ` })}text-decoration: underline;${th(`
          `, { classic: `
          `, dark: `
          ` })}text-underline-offset: 3px;${th(`
        `, { classic: `
        `, dark: `
        ` })}}${th(`
      `, { classic: `
      `, dark: `
      ` })}`}</style>

      {/* ── 1. CLIENT SIDEBAR ── */}
      <ClientSidebar
        activeNav={activeNav}
        setActiveNav={(nav) => {
          setActiveNav(nav);
          setSelectedStep(null);
        }}
        orgName={orgName}
        userName={userName}
        userEmail={userEmail}
        userInitials={userInitials}
        onLogout={handleLogout}
        rejectedCount={rejectedEvidences.length}
        openSections={openSections}
        toggleSection={toggleSection}
        totalDocs={receivedPolicies.length}
        totalImplTasks={receivedPolicies.length}
        totalEvidence={frameworkEvidences.length}
        onboardingFrameworks={onboardingFrameworks}
        selectedFramework={selectedFramework}
        setSelectedFramework={handleFrameworkChange}
        isAssessmentReviewed={isAssessmentReviewed}
      />

      {/* ── 2. MAIN CLIENT CONTENT AREA ── */}
      <main className="reg-main">
        {/* Topline Banner with Live Supabase Organization Info */}
        <div className="reg-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>
              Client Security Workspace · <b>{orgName}</b> {orgBranch ? `(${orgBranch})` : ''} · Industry: <b>{orgIndustry}</b>
            </span>
            <button
              onClick={() => setShowOrgDetails(!showOrgDetails)}
              style={{
                background: showOrgDetails ? th('#1A202C', { classic: '#0F172A', dark: '#1E293B' }) : '#F0EDE1',
                color: showOrgDetails ? '#fff' : th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }),
                border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                borderRadius: th('2px', { classic: '3px', dark: '3px' }),
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showOrgDetails ? 'Hide Org Details ▴' : 'Show Org Details ▾'}
            </button>
          </div>
        </div>

        {/* Expandable Organization Details Panel */}
        {showOrgDetails && (
          <div style={{ background: th('#FFFFFF', { dark: '#1E293B' }), border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderTop: 'none', padding: '16px 20px', marginBottom: '16px', fontSize: '12.5px', borderRadius: '0 0 4px 4px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal Entity / Company</span>
                <strong style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{dbData.companyInfo?.legal_name || dbData.companyInfo?.company_name || dbData.client?.name || orgName}</strong>
              </div>
              <div>
                <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch / Unit</span>
                <strong style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{dbData.companyInfo?.company_branch || 'Primary HQ'}</strong>
              </div>
              <div>
                <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry &amp; Size</span>
                <strong style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{orgIndustry} · {dbData.companyInfo?.company_size || '10–50 employees'}</strong>
              </div>
              <div>
                <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headquarters / Location</span>
                <strong style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{[dbData.companyInfo?.city, dbData.companyInfo?.state, dbData.companyInfo?.country].filter(Boolean).join(', ') || 'India'}</strong>
              </div>
              <div>
                <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Contact</span>
                <strong style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                  {dbData.contacts?.[0]?.name ? `${dbData.contacts[0].name} (${dbData.contacts[0].designation || 'Lead'})` : userName}
                </strong>
                <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>{dbData.contacts?.[0]?.email || userEmail} {dbData.contacts?.[0]?.phone ? `· ${dbData.contacts[0].phone}` : ''}</div>
              </div>
              <div>
                <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Onboarded Frameworks</span>
                <strong style={{ color: '#1B4D3E' }}>
                  {onboardingFrameworks.map(f => f.name).join(', ')}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Action Required Banner if Rejections Exist */}
        {rejectedEvidences.length > 0 && activeNav !== 'feedback' && (
          <div className="reg-alert-box">
            <div>
              <strong>Action Required:</strong> Your vCISO auditor requested revisions on <b>{rejectedEvidences.length}</b> submitted evidence file(s).
            </div>
            <button
              onClick={() => { setActiveNav('feedback'); setActiveEvidenceTab('rejected'); }}
              className="reg-btn-crimson reg-btn-sm"
            >
              View Auditor Feedback →
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: STEP DETAIL VIEW (WHEN A STEP IS CLICKED)                 */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {selectedStep ? (
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <div className="reg-back-link" onClick={() => setSelectedStep(null)}>
                  ← Back to {activeNav === 'documents' ? 'Received Policies & Documents' : 'Overview'}
                </div>
                <h1 className="reg-title" style={{ marginTop: '4px' }}>
                  {selectedStep.num}. {selectedStep.title}
                </h1>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(() => {
                    const obl = getStepObligation(selectedStep);
                    return (
                      <span className={obl.badgeClass}>
                        {obl.label.toUpperCase()}
                      </span>
                    );
                  })()}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    {selectedStep.requirements}
                  </span>
                </div>
              </div>
              <div className="reg-meta">
                <div className="reg-meta-num">Phase {selectedStep.phase}</div>
                <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                  Status: <b>{stepsMap[selectedStep.id]?.status === 'completed' ? 'Completed & Approved' : 'In Progress'}</b>
                </div>
              </div>
            </div>

            <div className="reg-body">
              {/* Requirement Summary */}
              <div className="reg-card">
                <h3 className="reg-card-title">Why this step is required</h3>
                <p style={{ margin: '6px 0 14px', fontSize: '13px' }}>{selectedStep.why}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), paddingTop: '10px', borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                  <div>Estimated Workload: <b>{selectedStep.workload}</b></div>
                  <div>Suggested Duration: <b>{selectedStep.duration}</b></div>
                  <div>Review Interval: <b>{selectedStep.interval || '6 months'}</b></div>
                </div>
              </div>

              {/* vCISO Policy Document & Guidance Content */}
              <div className="reg-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 className="reg-card-title">vCISO Policy Document &amp; Draft</h3>
                  {(selectedStepDoc?.doc_version || stepsMap[selectedStep.id]?.doc_version) && (
                    <span className="reg-badge-emerald">Version {selectedStepDoc?.doc_version || stepsMap[selectedStep.id]?.doc_version}</span>
                  )}
                </div>
                {(() => {
                  const rawContent = selectedStepDoc?.doc_content || stepsMap[selectedStep.id]?.doc_content;
                  if (!rawContent || !String(rawContent).trim()) {
                    return (
                      <div className="reg-notice-box" style={{ margin: 0 }}>
                        Your vCISO has not drafted or uploaded a policy document for this step yet. Review the requirements and upload your signed organizational proof once provided.
                      </div>
                    );
                  }
                  let displayContent = rawContent;
                  try {
                    const parsed = JSON.parse(rawContent);
                    if (parsed.fullMarkdown) displayContent = parsed.fullMarkdown;
                    else if (parsed.sections && Array.isArray(parsed.sections)) {
                      displayContent = parsed.sections.map(s => `## ${s.name}\n\n${s.content}`).join('\n\n---\n\n');
                    }
                  } catch {}
                  return (
                    <div style={{ background: th('#FFFFFF', { dark: '#1E293B' }), border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: '2px', padding: '16px', fontSize: '13px', lineHeight: '1.6', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto' }}>
                      {displayContent}
                    </div>
                  );
                })()}
                {(selectedStepDoc?.notes || stepsMap[selectedStep.id]?.notes) && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>
                    <strong>vCISO Notes:</strong> {selectedStepDoc?.notes || stepsMap[selectedStep.id]?.notes}
                  </div>
                )}
              </div>

              {/* Uploaded Evidence Records for this Step */}
              <div className="reg-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="reg-card-title">Attached Evidence Proofs for this Step</h3>
                </div>

                {(() => {
                  const stepEvidences = getEvidencesForItem(selectedStep, dbData.evidences, selectedFramework);
                  if (stepEvidences.length === 0) {
                    return (
                      <div className="reg-notice-box" style={{ margin: 0 }}>
                        No evidence files uploaded for this step yet. To upload proofs, click "Upload Proof" on this step in the Received Policies &amp; Docs table.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stepEvidences.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 14px',
                            background: th('#FFFFFF', { dark: '#1E293B' }),
                            border: `1px solid ${ev.review_status === 'rejected' ? th('#FEB2B2', { dark: '#7F1D1D' }) : ev.review_status === 'accepted' || ev.review_status === 'verified' ? th('#A7F3D0', { dark: '#065F46' }) : th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                            borderRadius: '2px',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                                {ev.original_name || ev.filename}
                              </span>
                              {(ev.review_status === 'accepted' || ev.review_status === 'verified') && <span className="reg-badge-emerald">✓ Verified by vCISO</span>}
                              {ev.review_status === 'rejected' && <span className="reg-badge-crimson">⚠️ Action Required</span>}
                              {(!ev.review_status || ev.review_status === 'pending') && <span className="reg-badge-amber">⏳ Pending Review</span>}
                            </div>
                            {(() => {
                              const info = findQuestionInfo(ev);
                              const clause = info.resolvedClause || info.resolvedRef;
                              if (!clause) return null;
                              return (
                                <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                                  Clause / Control:{' '}
                                  <b style={{ fontFamily: 'JetBrains Mono, monospace', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{clause}</b>
                                </div>
                              );
                            })()}
                            {ev.vciso_notes && (
                              <div style={{ fontSize: '11.5px', color: ev.review_status === 'rejected' ? th('#9B2C2C', { dark: '#F87171' }) : th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '4px' }}>
                                <strong>vCISO Feedback:</strong> {ev.vciso_notes}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {(ev.download_url || ev.url) && (
                              <a
                                href={ev.download_url || ev.url}
                                target="_blank"
                                rel="noreferrer"
                                className="reg-btn-secondary reg-btn-sm"
                                style={{ textDecoration: 'none' }}
                              >
                                Download File
                              </a>
                            )}
                            {(!ev.review_status || ev.review_status === 'pending') && (
                              <button
                                onClick={() => handleDeleteEvidence(ev.id)}
                                style={{ background: 'none', border: 'none', color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : null}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: OVERVIEW & READINESS HUB (DEFAULT VIEW)                   */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeNav === 'overview' && !selectedStep && (
          <div>
            {/* KPI Gauges Grid */}
            <div className="reg-gauges-grid">
              <div className="reg-gauge-card">
                <div className="reg-gauge-label">Implementation Readiness</div>
                <div className="reg-gauge-val" style={{ color: readinessScore >= 75 ? '#1B4D3E' : th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
                  {readinessScore}%
                </div>
                <div className="reg-gauge-sub">{completedStepsCount} of {receivedPolicies.length} steps complete</div>
              </div>

              <div className="reg-gauge-card" onClick={() => setActiveNav('documents')} style={{ cursor: 'pointer' }}>
                <div className="reg-gauge-label">Received Policies</div>
                <div className="reg-gauge-val">{receivedPolicies.length}</div>
                <div className="reg-gauge-sub">{receivedPolicies.length > 0 ? 'Drafted & shared by vCISO' : 'Pending vCISO upload'}</div>
              </div>

              <div className="reg-gauge-card" onClick={() => { setActiveNav('evidence'); setActiveEvidenceTab('accepted'); }} style={{ cursor: 'pointer' }}>
                <div className="reg-gauge-label">Verified Proofs</div>
                <div className="reg-gauge-val" style={{ color: '#1B4D3E' }}>
                  {acceptedEvidences.length}
                </div>
                <div className="reg-gauge-sub">Approved by vCISO auditor</div>
              </div>

              <div className="reg-gauge-card" onClick={() => { setActiveNav('feedback'); setActiveEvidenceTab('rejected'); }} style={{ cursor: 'pointer' }}>
                <div className="reg-gauge-label">Action Required</div>
                <div className="reg-gauge-val" style={{ color: rejectedEvidences.length > 0 ? th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) : th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                  {rejectedEvidences.length}
                </div>
                <div className="reg-gauge-sub">Rejections needing resubmission</div>
              </div>
            </div>

            {/* Active Frameworks Section */}
            <div className="reg-doc" style={{ marginBottom: '24px' }}>
              <div className="reg-doc-head">
                <div>
                  <h2 className="reg-title" style={{ fontSize: '20px' }}>Active Compliance Frameworks</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    Security compliance standards established for {orgName}
                  </p>
                </div>
              </div>
              <div className="reg-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {onboardingFrameworks.map(fw => {
                  const isISO = fw.id.includes('iso') || fw.id.includes('27001');
                  const isDPDP = fw.id.includes('dpdp');
                  const isCSPM = fw.id.includes('cspm');
                  const isSOC2 = fw.id.includes('soc');

                  return (
                    <div key={fw.id} style={{ border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, borderRadius: '2px', padding: '20px', background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }) }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '17px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                            {fw.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
                            {isISO ? '43 Implementation Steps · 123 Requirements' : isDPDP ? '50 Statutory Obligations · Section 8 Safeguards' : isCSPM ? `60 Discovery Questions · ${cspmScopeLabel}` : isSOC2 ? 'Trust Services Criteria (Security, Confidentiality)' : 'Enterprise Compliance Controls'}
                          </div>
                        </div>
                        <span className="reg-stamp">ACTIVE</span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), lineHeight: '1.5', margin: '0 0 16px' }}>
                        {isISO
                          ? 'Complete ISMS implementation policies, risk assessment registers, and Annex A technological controls.'
                          : isDPDP
                          ? 'Data Fiduciary compliance, consent management, breach notification workflows, and data principal rights.'
                          : isCSPM
                          ? 'Current-state cloud security posture discovery across identity, network exposure, data protection, logging, workload security, resilience and governance.'
                          : `Security governance policies and compliance audit controls mapped for ${fw.name}.`
                        }
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* receivedPolicies / completedStepsCount belong to the framework
                            selected in the sidebar, so this shortcut only belongs on that
                            card — and DPDP gets it on the same terms ISO does. */}
                        {isAssessmentReviewed && fw.id === selectedFramework && receivedPolicies.length > 0 && (
                          <button
                            onClick={() => setActiveNav('implementation')}
                            className="reg-btn-primary reg-btn-sm"
                          >
                            Implementation Steps ({completedStepsCount}/{receivedPolicies.length})
                          </button>
                        )}
                        {isISO && (
                          <button
                            onClick={() => setActiveNav('iso27001')}
                            className="reg-btn-secondary reg-btn-sm"
                          >
                            Gap Questionnaire →
                          </button>
                        )}
                        {isDPDP && (
                          <button
                            onClick={() => setActiveNav('dpdp')}
                            className="reg-btn-secondary reg-btn-sm"
                          >
                            Open DPDP Gap Assessment →
                          </button>
                        )}
                        {isCSPM && (
                          <button
                            onClick={() => setActiveNav('cspm')}
                            className="reg-btn-secondary reg-btn-sm"
                          >
                            Open Cloud Security Questionnaire →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Policy Documents Preview */}
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h2 className="reg-title" style={{ fontSize: '20px' }}>Received Policies &amp; Documents</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    Key security policies drafted by your vCISO ready for adoption and evidence attachment
                  </p>
                </div>
                {receivedPolicies.length > 0 && (
                  <button
                    onClick={() => setActiveNav('documents')}
                    className="reg-btn-secondary reg-btn-sm"
                  >
                    View All {receivedPolicies.length} Documents →
                  </button>
                )}
              </div>
              {receivedPolicies.length === 0 ? (
                <div className="reg-body" style={{ padding: '36px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                  <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '6px' }}>
                    No Policies Uploaded by vCISO Yet
                  </div>
                  <p style={{ fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), maxWidth: '520px', margin: '0 auto 14px', lineHeight: '1.5' }}>
                    Your assigned vCISO has not published or uploaded any customized security policies for this organization yet. Once your vCISO creates or uploads policies, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="reg-body" style={{ padding: '0 36px' }}>
                  {receivedPolicies.slice(0, 6).map((step) => {
                    const dbStep = stepsMap[step.id] || {};
                    const evidences = getEvidencesForItem(step, dbData.evidences, selectedFramework);
                    return (
                      <div
                        key={step.id}
                        className="reg-row"
                        onClick={() => setSelectedStep(step)}
                      >
                        <div className={`reg-num ${dbStep.status === 'completed' ? 'done' : ''}`}>
                          {step.num}
                        </div>
                        <div className="reg-row-main">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <span className="reg-row-title">{step.title}</span>
                            {(() => {
                              const obl = getStepObligation(step);
                              return (
                                <span className={obl.badgeClass}>
                                  {obl.label.toUpperCase()}
                                </span>
                              );
                            })()}
                          </div>
                          <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '3px' }}>
                            {step.requirements} · {step.phaseTitle}
                            {evidences.length > 0 && <span style={{ marginLeft: '10px', color: '#1B4D3E', fontWeight: 600 }}>• {evidences.length} proof file(s) attached</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: RECEIVED POLICY DOCUMENTS & GUIDANCE                      */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeNav === 'documents' && !selectedStep && (
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <h1 className="reg-title">Received Policy Documents &amp; Guidance</h1>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                  {receivedPolicies.length > 0
                    ? `All ${receivedPolicies.length} standard and custom security policies prepared by your vCISO for ${orgName}.`
                    : `No policy documents prepared or uploaded by your vCISO yet for ${orgName}.`
                  }
                </p>
              </div>
              <div className="reg-meta">
                <div className="reg-meta-num">{filteredDocuments.length} Documents</div>
              </div>
            </div>

            <div className="reg-body">
              {/* Filter and search bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setDocFilter('all')}
                    className={`reg-btn-sm ${docFilter === 'all' ? 'reg-btn-primary' : 'reg-btn-secondary'}`}
                  >
                    All Documents ({receivedPolicies.length})
                  </button>
                  <button
                    onClick={() => setDocFilter('mandatory')}
                    className={`reg-btn-sm ${docFilter === 'mandatory' ? 'reg-btn-primary' : 'reg-btn-secondary'}`}
                  >
                    Mandatory Only
                  </button>
                  <button
                    onClick={() => setDocFilter('with_proof')}
                    className={`reg-btn-sm ${docFilter === 'with_proof' ? 'reg-btn-primary' : 'reg-btn-secondary'}`}
                  >
                    With Proof Attached
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search policy title or clause..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="reg-input"
                  style={{ maxWidth: '260px' }}
                />
              </div>

              {/* Document rows or empty state */}
              {receivedPolicies.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📑</div>
                  <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '18px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '8px' }}>
                    No Policies or Documentation Received Yet
                  </div>
                  <p style={{ fontSize: '13.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), maxWidth: '540px', margin: '0 auto 20px', lineHeight: '1.6' }}>
                    Your assigned vCISO has not published or uploaded any customized security policies or SOPs for {orgName} yet. Once your vCISO prepares and uploads policies, they will appear in this list for you to review and attach evidence proofs.
                  </p>
                  <button onClick={() => setActiveNav('overview')} className="reg-btn-secondary reg-btn-sm">
                    ← Return to Overview
                  </button>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div style={{ padding: '36px 24px', textAlign: 'center', borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '13.5px' }}>
                  No received policy documents match your search or filter criteria.
                </div>
              ) : (
                <div>
                  {filteredDocuments.map((step) => {
                    const dbStep = stepsMap[step.id] || {};
                    const evidences = getEvidencesForItem(step, dbData.evidences, selectedFramework);
                    const isDone = dbStep.status === 'completed';

                    return (
                      <div
                        key={step.id}
                        style={{
                          padding: '16px 0',
                          borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '16px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className={`reg-num ${isDone ? 'done' : ''}`} style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                              {step.num}
                            </span>
                            <span style={{ fontFamily: 'Source Serif 4, serif', fontSize: '15px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                              {step.title}
                            </span>
                            {(() => {
                              const obl = getStepObligation(step);
                              return (
                                <span className={obl.badgeClass} style={{ transform: 'none', fontSize: '9.5px' }}>
                                  {obl.label.toUpperCase()}
                                </span>
                              );
                            })()}
                          </div>

                          <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '6px', marginLeft: '34px' }}>
                            Requirement: <b style={{ fontFamily: 'JetBrains Mono, monospace', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{step.requirements}</b> · Phase: {step.phaseTitle}
                          </div>

                          {(() => {
                            const hasDoc = dbStep.doc_content || frameworkSteps.some(s => (s.step_id === step.id || (step.requirements && s.step_id?.toLowerCase().includes(step.requirements.toLowerCase().replace(/[^a-z0-9]/g, '_')))) && s.doc_content);
                            return hasDoc ? (
                              <div style={{ marginLeft: '34px', marginTop: '6px', fontSize: '12px', color: '#1B4D3E', fontWeight: 600 }}>
                                ✓ Policy text &amp; guidance provided by vCISO
                              </div>
                            ) : null;
                          })()}

                          {evidences.length > 0 && (
                            <div style={{ marginLeft: '34px', marginTop: '4px', fontSize: '11.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>
                              Evidence attached: <b>{evidences.map(e => e.original_name || e.filename).join(', ')}</b>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => setSelectedStep(step)}
                            className="reg-btn-secondary reg-btn-sm"
                          >
                            View Policy &amp; Details
                          </button>
                          <button
                            onClick={() => openUploadForTarget(step.id, step.title, selectedFramework, step.requirements)}
                            className="reg-btn-primary reg-btn-sm"
                          >
                            📎 Upload Proof
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: IMPLEMENTATION TASKS & STEPS                              */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeNav === 'implementation' && !selectedStep && (
          !isAssessmentReviewed ? (
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h1 className="reg-title">Implementation Tasks Pending vCISO Review</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    Implementation steps will unlock once your assigned vCISO has analyzed and approved/reviewed your gap assessment.
                  </p>
                </div>
              </div>
              <div className="reg-body">
                <div className="reg-notice-box" style={{ background: th('#FEF3C7', { dark: '#3A2A0A' }), borderColor: '#F59E0B', color: th('#92400E', { dark: '#FBBF24' }), padding: '24px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                    ⏳ Gap Assessment Under Evaluation
                  </div>
                  <div>
                    Your submitted gap questionnaire is currently pending evaluation by the vCISO team. Once your auditor completes the assessment analysis, tailored implementation tasks and guidance will be unlocked here.
                  </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                  <button onClick={() => setActiveNav('overview')} className="reg-btn-primary">
                    ← Return to Overview
                  </button>
                  <button onClick={() => setActiveNav('documents')} className="reg-btn-secondary">
                    View Received Policies &amp; Documents →
                  </button>
                </div>
              </div>
            </div>
          ) : receivedPolicies.length === 0 ? (
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h1 className="reg-title">{isDPDP ? 'DPDP Act, 2023 Implementation Steps' : 'ISO 27001 Implementation Steps'}</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    Step-by-step implementation guidance for {orgName}.
                  </p>
                </div>
              </div>
              <div className="reg-body">
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
                  <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '18px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '8px' }}>
                    No Implementation Tasks Activated Yet
                  </div>
                  <p style={{ fontSize: '13.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), maxWidth: '540px', margin: '0 auto 20px', lineHeight: '1.6' }}>
                    Implementation tasks and step-by-step procedural workflows will activate as your assigned vCISO drafts and submits policies for {orgName}.
                  </p>
                  <button onClick={() => setActiveNav('overview')} className="reg-btn-secondary reg-btn-sm">
                    ← Return to Overview
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h1 className="reg-title">{isDPDP ? 'DPDP Act, 2023 Implementation Steps' : 'ISO 27001 Implementation Steps'}</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    Step-by-step guidance for {orgName} across {Array.from(new Set(receivedPolicies.map(s => s.phaseTitle))).length} active implementation phase(s).
                  </p>
                </div>
                <div className="reg-meta">
                  <div className="reg-meta-num">{completedStepsCount} of {receivedPolicies.length} Completed</div>
                  <div className="reg-ticks">
                    {receivedPolicies.map((s) => (
                      <div
                        key={s.id}
                        className={`reg-tick ${stepsMap[s.id]?.status === 'completed' ? 'done' : ''}`}
                        title={`${s.num}. ${s.title}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="reg-body">
                {/* Group steps by phase */}
                {Array.from(new Set(receivedPolicies.map(s => s.phaseTitle))).map((phaseTitle) => {
                  const phaseSteps = receivedPolicies.filter(s => s.phaseTitle === phaseTitle);
                  return (
                    <div key={phaseTitle} style={{ marginBottom: '28px' }}>
                      <h2 className="reg-section" style={{ borderBottom: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`, paddingBottom: '6px', marginBottom: '10px' }}>
                        {phaseTitle}
                      </h2>
                      {phaseSteps.map((step) => {
                        const dbStep = stepsMap[step.id] || {};
                        const isDone = dbStep.status === 'completed';
                        const evidences = getEvidencesForItem(step, dbData.evidences, selectedFramework);

                        return (
                          <div
                            key={step.id}
                            className="reg-row"
                            onClick={() => setSelectedStep(step)}
                          >
                            <div className={`reg-num ${isDone ? 'done' : ''}`}>
                              {step.num}
                            </div>
                            <div className="reg-row-main">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                  <span className="reg-row-title">{step.title}</span>
                                  <span className="reg-row-clause">{step.requirements}</span>
                                </div>
                                {(() => {
                                  const obl = getStepObligation(step);
                                  return (
                                    <span className={obl.badgeClass}>
                                      {obl.label.toUpperCase()}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                                Estimated: {step.workload} · Duration: {step.duration}
                                {evidences.length > 0 && <span style={{ marginLeft: '12px', color: '#1B4D3E', fontWeight: 600 }}>✓ {evidences.length} proof attached</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: EVIDENCE & PROOF LOCKER                                   */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeNav === 'evidence' && !selectedStep && (
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <h1 className="reg-title">Evidence &amp; Proof Locker</h1>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                  Central repository of all audit proofs and compliance files submitted to your vCISO.
                </p>
              </div>
            </div>

            <div className="reg-body">
              {/* Filter tabs */}
              <div className="reg-tabs">
                <button
                  onClick={() => setActiveEvidenceTab('all')}
                  className={`reg-tab ${activeEvidenceTab === 'all' ? 'active' : ''}`}
                >
                  All Evidence ({frameworkEvidences.length})
                </button>
                <button
                  onClick={() => setActiveEvidenceTab('rejected')}
                  className={`reg-tab ${activeEvidenceTab === 'rejected' ? 'active' : ''}`}
                >
                  Action Required / Rejected ({rejectedEvidences.length})
                </button>
                <button
                  onClick={() => setActiveEvidenceTab('accepted')}
                  className={`reg-tab ${activeEvidenceTab === 'accepted' ? 'active' : ''}`}
                >
                  Verified &amp; Approved ({acceptedEvidences.length})
                </button>
                <button
                  onClick={() => setActiveEvidenceTab('pending')}
                  className={`reg-tab ${activeEvidenceTab === 'pending' ? 'active' : ''}`}
                >
                  Pending Inspection ({pendingEvidences.length})
                </button>
              </div>

              {/* Evidence cards */}
              {(() => {
                const list = frameworkEvidences.filter(e => {
                  if (activeEvidenceTab === 'rejected') return e.review_status === 'rejected';
                  if (activeEvidenceTab === 'accepted') return e.review_status === 'accepted' || e.review_status === 'verified';
                  if (activeEvidenceTab === 'pending') return !e.review_status || e.review_status === 'pending';
                  return true;
                });

                if (list.length === 0) {
                  return (
                    <div className="reg-notice-box" style={{ textAlign: 'center', padding: '30px' }}>
                      <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '4px' }}>
                        No evidence files in this view
                      </div>
                      <div style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                        Upload signed proofs and compliance files for your policies from the Received Policies &amp; Documents tab.
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {list.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          border: `1px solid ${ev.review_status === 'rejected' ? th('#FEB2B2', { dark: '#7F1D1D' }) : ev.review_status === 'accepted' ? th('#A7F3D0', { dark: '#065F46' }) : th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                          borderRadius: '2px',
                          padding: '18px 20px',
                          background: ev.review_status === 'rejected' ? th('#FFF5F5', { dark: '#3A1418' }) : th('#FFFFFF', { dark: '#1E293B' }),
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '14px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontFamily: 'Source Serif 4, serif', fontSize: '15px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                              {ev.original_name || ev.filename}
                            </span>
                            {ev.review_status === 'accepted' && <span className="reg-badge-emerald">✓ Verified by vCISO</span>}
                            {ev.review_status === 'rejected' && <span className="reg-badge-crimson">⚠️ Action Required</span>}
                            {(!ev.review_status || ev.review_status === 'pending') && <span className="reg-badge-amber">⏳ Pending Review</span>}
                          </div>

                          {(() => {
                            const info = findQuestionInfo(ev);
                            const target = info.displayTag !== '[Requirement]'
                              ? info.displayTag
                              : (ev.reference || ev.control_id || ev.question_id || 'General');
                            // A step-linked proof resolves to the step's own clause; a
                            // questionnaire proof resolves to the question's reference.
                            const clause = info.resolvedClause || info.resolvedRef;
                            return (
                              <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                                Target Requirement: <b style={{ fontFamily: 'JetBrains Mono, monospace', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{target}</b>
                                {clause && (
                                  <span> · Clause / Control: <b style={{ fontFamily: 'JetBrains Mono, monospace', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>{clause}</b></span>
                                )}
                                {info.resolvedTitle && <span> · {info.resolvedTitle}</span>}
                                {ev.uploaded_at && <span> · Uploaded on {new Date(ev.uploaded_at).toLocaleDateString()}</span>}
                                {ev.size && <span> · {(ev.size / 1024).toFixed(1)} KB</span>}
                              </div>
                            );
                          })()}

                          {/* Rejection / Note Details */}
                          {ev.vciso_notes && (
                            <div
                              style={{
                                marginTop: '10px',
                                padding: '10px 14px',
                                background: ev.review_status === 'rejected' ? th('#FFFFFF', { dark: '#1E293B' }) : th('#F8FAFC', { dark: '#0F172A' }),
                                border: `1px solid ${ev.review_status === 'rejected' ? th('#FEB2B2', { dark: '#7F1D1D' }) : th('#E2E8F0', { dark: '#334155' })}`,
                                borderRadius: '2px',
                                fontSize: '12px',
                                color: ev.review_status === 'rejected' ? th('#9B2C2C', { dark: '#F87171' }) : th('#4A5568', { classic: '#475569', dark: '#A3AEBF' })
                              }}
                            >
                              <strong>vCISO Feedback:</strong> {ev.vciso_notes}
                              {ev.reviewed_by && (
                                <span style={{ marginLeft: '8px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontSize: '11px' }}>
                                  (Reviewed by {ev.reviewed_by})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {ev.download_url && (
                            <a
                              href={ev.download_url}
                              target="_blank"
                              rel="noreferrer"
                              className="reg-btn-secondary reg-btn-sm"
                              style={{ textDecoration: 'none' }}
                            >
                              Download File
                            </a>
                          )}
                          {ev.review_status === 'rejected' && (
                            <button
                              onClick={() => openUploadForTarget(ev.control_id || ev.question_id, ev.reference || ev.control_id || ev.question_id || 'Compliance Requirement', ev.framework_id, ev.reference || ev.control_id || '')}
                              className="reg-btn-crimson reg-btn-sm"
                            >
                              Resubmit Proof
                            </button>
                          )}
                          {(!ev.review_status || ev.review_status === 'pending') && (
                            <button
                              onClick={() => handleDeleteEvidence(ev.id)}
                              style={{ background: 'none', border: 'none', color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 6: vCISO AUDIT FEEDBACK & GAPS TRACKER                       */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 6: vCISO AUDIT FEEDBACK & GAPS TRACKER                       */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeNav === 'feedback' && !selectedStep && (
          !isAssessmentReviewed ? (
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h1 className="reg-title">vCISO Feedback Pending</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    Auditor feedback and gap findings will appear once your vCISO has analyzed your submitted gap assessment.
                  </p>
                </div>
              </div>
              <div className="reg-body">
                <div className="reg-notice-box" style={{ background: th('#FEF3C7', { dark: '#3A2A0A' }), borderColor: '#F59E0B', color: th('#92400E', { dark: '#FBBF24' }), padding: '24px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                    ⏳ Initial Gap Analysis in Progress
                  </div>
                  <div>
                    Your assigned vCISO is reviewing your compliance baseline. As soon as the analysis is completed, any identified gaps, rejection items, or corrective actions will be visible in this tracker.
                  </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                  <button onClick={() => setActiveNav('overview')} className="reg-btn-primary">
                    ← Return to Overview
                  </button>
                  <button onClick={() => setActiveNav('documents')} className="reg-btn-secondary">
                    View Policy Documents →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h1 className="reg-title">vCISO Audit Feedback &amp; Review Tracker</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                    Direct audit inspection notes, approval stamps, and correction requests from your assigned vCISO.
                  </p>
                </div>
              </div>

              <div className="reg-body">
                <div className="reg-tabs">
                  <button
                    onClick={() => setActiveEvidenceTab('rejected')}
                    className={`reg-tab ${activeEvidenceTab === 'rejected' ? 'active' : ''}`}
                  >
                    Rejections &amp; Gaps ({rejectedEvidences.length})
                  </button>
                  <button
                    onClick={() => setActiveEvidenceTab('accepted')}
                    className={`reg-tab ${activeEvidenceTab === 'accepted' ? 'active' : ''}`}
                  >
                    Approved Submissions ({acceptedEvidences.length})
                  </button>
                  <button
                    onClick={() => setActiveEvidenceTab('pending')}
                    className={`reg-tab ${activeEvidenceTab === 'pending' ? 'active' : ''}`}
                  >
                    Under Review ({pendingEvidences.length})
                  </button>
                </div>

                {activeEvidenceTab === 'rejected' && (
                  <div>
                    {rejectedEvidences.length === 0 ? (
                      <div className="reg-notice-box" style={{ textAlign: 'center', padding: '30px' }}>
                        <span style={{ fontSize: '24px' }}>🎉</span>
                        <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginTop: '8px' }}>
                          No Rejected Submissions
                        </div>
                        <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
                          All your submitted policies and audit proofs have passed auditor inspection.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {rejectedEvidences.map((item) => (
                          <div
                            key={item.canonicalKey || item.id || item.questionId || item.reference}
                            style={{
                              border: `1px solid ${th('#FEB2B2', { dark: '#7F1D1D' })}`,
                              background: th('#FFF5F5', { dark: '#3A1418' }),
                              borderRadius: '2px',
                              padding: '18px 20px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: '280px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span className="reg-badge-crimson">REJECTED BY vCISO</span>
                                <span style={{ fontWeight: 600, fontSize: '13.5px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                                  {item.displayTag} {item.title && item.title !== item.questionId && item.title !== item.reference ? item.title : (item.question || item.original_name || '')}
                                </span>
                              </div>

                              <div style={{ marginTop: '10px', background: th('#FFFFFF', { dark: '#1E293B' }), border: `1px solid ${th('#FEB2B2', { dark: '#7F1D1D' })}`, borderRadius: '2px', padding: '12px 14px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: th('#9B2C2C', { dark: '#F87171' }), textTransform: 'uppercase' }}>
                                  Reason for Rejection:
                                </div>
                                <div style={{ fontSize: '12.5px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginTop: '4px', lineHeight: '1.5' }}>
                                  {item.vcisoRejectionReason || item.vcisoNotes || item.vciso_notes || 'Evidence did not meet the requirement criteria. Please re-upload revised proof.'}
                                </div>
                                {item.reviewedBy && (
                                  <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '6px' }}>
                                    Reviewed by <b>{item.reviewedBy}</b>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => openUploadForTarget(item.questionId || item.reference || item.control_id, item.title || item.reference || item.control_id || item.question || 'Compliance Requirement', item.framework_id, item.reference || item.control_id || '')}
                              className="reg-btn-crimson"
                            >
                              Resubmit Proof →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeEvidenceTab === 'accepted' && (
                  <div>
                    {acceptedEvidences.length === 0 ? (
                      <div className="reg-notice-box" style={{ textAlign: 'center', padding: '30px' }}>
                        <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                          No Verified Submissions Yet
                        </div>
                        <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                          Uploaded evidence files are currently being evaluated by your vCISO auditor.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {acceptedEvidences.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              border: `1px solid ${th('#A7F3D0', { dark: '#065F46' })}`,
                              background: th('#F0FDF4', { dark: '#0B2E24' }),
                              borderRadius: '2px',
                              padding: '14px 18px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="reg-badge-emerald">✓ APPROVED</span>
                                <span style={{ fontWeight: 600, fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                                  {ev.original_name || ev.filename}
                                </span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '2px' }}>
                                Requirement: {ev.displayTag || ev.control_id || 'General'}
                                {ev.vciso_notes && <span> · Note: {ev.vciso_notes}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1B4D3E' }}>
                              ✓ Verified by vCISO
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeEvidenceTab === 'pending' && (
                  <div>
                    {pendingEvidences.length === 0 ? (
                      <div className="reg-notice-box" style={{ textAlign: 'center', padding: '30px' }}>
                        <div style={{ fontFamily: 'Source Serif 4, serif', fontSize: '16px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                          No Pending Evidence Files
                        </div>
                        <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                          All uploaded files have been reviewed.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pendingEvidences.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                              background: th('#FFFFFF', { dark: '#1E293B' }),
                              borderRadius: '2px',
                              padding: '14px 18px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="reg-badge-amber">⏳ PENDING AUDITOR INSPECTION</span>
                                <span style={{ fontWeight: 600, fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
                                  {ev.original_name || ev.filename}
                                </span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>
                                Requirement: {ev.displayTag || ev.control_id || 'General'}
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', color: '#8C5810', fontWeight: 600 }}>
                              In Audit Queue
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* VIEW 7: COMPANY PROFILE & ACCOUNT INFO                            */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeNav === 'profile' && !selectedStep && (
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <h1 className="reg-title">Organization Profile &amp; Governance Details</h1>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                  Live client profile, contact personnel, and security scope fetched from the platform database.
                </p>
              </div>
            </div>

            <div className="reg-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Organization Details Card */}
                <div className="reg-card">
                  <h3 className="reg-card-title">Organization Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Legal Name:</span>
                      <b>{dbData.companyInfo?.legal_name || dbData.companyInfo?.company_name || orgName}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Branch / Unit:</span>
                      <b>{dbData.companyInfo?.company_branch || 'Primary HQ'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Industry:</span>
                      <b>{orgIndustry}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Company Size:</span>
                      <b>{dbData.companyInfo?.company_size || '10–50 employees'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Location:</span>
                      <b>{[dbData.companyInfo?.city, dbData.companyInfo?.state, dbData.companyInfo?.country].filter(Boolean).join(', ') || 'India'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Official Website:</span>
                      <b>{dbData.companyInfo?.website ? <a href={dbData.companyInfo.website} target="_blank" rel="noreferrer" style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), textDecoration: 'underline' }}>{dbData.companyInfo.website}</a> : '-'}</b>
                    </div>
                  </div>
                </div>

                {/* Primary Contact & vCISO Advisory */}
                <div className="reg-card">
                  <h3 className="reg-card-title">Governance &amp; Contact Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Primary Contact:</span>
                      <b>{dbData.contacts?.[0]?.name || userName}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Designation:</span>
                      <b>{dbData.contacts?.[0]?.designation || 'Lead Security Officer'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Email Address:</span>
                      <b>{dbData.contacts?.[0]?.email || userEmail}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Onboarded Standards:</span>
                      <b style={{ color: '#1B4D3E' }}>{onboardingFrameworks.map(f => f.name).join(', ')}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingBottom: '6px' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Assigned Advisory:</span>
                      <b>CyberTrustWorks vCISO Advisory</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>Audit SLA:</span>
                      <b style={{ color: th('#065F46', { dark: '#34D399' }) }}>Active (24-48h verification)</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── 3. EVIDENCE UPLOAD MODAL (STRICTLY 3 FIELDS: FRAMEWORK, CLAUSE/CONTROL, UPLOAD PROOF BUTTON) ── */}
      {uploadModalOpen && (
        <div className="reg-modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="reg-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="reg-modal-close" onClick={() => setUploadModalOpen(false)}>×</button>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: '20px', fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), margin: '0 0 6px' }}>
              Upload Proof
            </h2>
            <p style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), margin: '0 0 20px' }}>
              Submit compliance evidence proof file for vCISO verification.
            </p>

            <form onSubmit={handleUploadEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Framework Display (Locked / Read-Only to avoid discrepancies) */}
              <div>
                <label className="reg-label">Compliance Framework</label>
                <div
                  style={{
                    background: '#F0ECE1',
                    border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                    borderRadius: '2px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#065F46' }}></span>
                  {onboardingFrameworks.find(fw => fw.id === uploadFramework)?.name || (isDPDP ? 'DPDP Act, 2023' : 'ISO/IEC 27001:2022')}
                </div>
              </div>

              {/* 2. Target Clause / Control (Locked / Read-Only to avoid discrepancies) */}
              <div>
                <label className="reg-label">Clause / Control / Requirement</label>
                <div
                  style={{
                    background: '#F0ECE1',
                    border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                    borderRadius: '2px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' })
                  }}
                >
                  {uploadTargetName || uploadRequirement || uploadTargetId || 'General Compliance Requirement'}
                </div>
              </div>

              {/* 3. Upload Proof File(s) Button / Input */}
              <div>
                <label className="reg-label">Upload Proof File(s) *</label>
                <input
                  type="file"
                  multiple
                  required
                  onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    border: `1px dashed ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
                    borderRadius: '2px',
                    background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                />
                {uploadFiles.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#1B4D3E', fontWeight: 600 }}>
                    ✓ {uploadFiles.length} file(s) selected: {uploadFiles.map(f => f.name).join(', ')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="reg-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || uploadFiles.length === 0}
                  className="reg-btn-primary"
                >
                  {uploading ? 'Uploading Proof...' : 'Upload Proof File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CLIENT SIDEBAR COMPONENT (MATCHING VCISOMAINPAGE AESTHETIC) ─────────────
function ClientSidebar({
  activeNav,
  setActiveNav,
  orgName,
  userName,
  userEmail,
  userInitials,
  onLogout,
  rejectedCount = 0,
  openSections,
  toggleSection,
  totalDocs = 0,
  totalImplTasks = 20,
  totalEvidence = 0,
  onboardingFrameworks = [],
  selectedFramework = 'iso27001-2022',
  setSelectedFramework,
  isAssessmentReviewed = false
}) {
  const hasISO = (onboardingFrameworks || []).some(f => f.id === 'iso27001-2022' || f.id === 'iso-27001' || f.name.toLowerCase().includes('iso'));
  const hasDPDP = (onboardingFrameworks || []).some(f => f.id === 'dpdp-2023' || f.id === 'dpdp' || f.name.toLowerCase().includes('dpdp'));
  // CSPM only appears once the administrator has selected it for this
  // organisation during onboarding — never as a default.
  const hasCSPM = (onboardingFrameworks || []).some(f => f.id === 'cspm' || f.name.toLowerCase().includes('cspm'));
  const isCSPM = selectedFramework === 'cspm' || String(selectedFramework).toLowerCase().includes('cspm');

  return (
    <aside className="reg-side">
      {/* Brand */}
      <div className="reg-brand">
        <div className="reg-brand-name">vCISO Portal</div>
        <div className="reg-brand-sub" title={orgName}>
          Client Workspace · {orgName}
        </div>
      </div>

      {/* Standard Selector Dropdown (Strictly Onboarded Frameworks from Supabase) */}
      <div style={{ padding: '0 16px 14px' }}>
        <label style={{ display: 'block', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), fontWeight: 600, marginBottom: '4px' }}>
          Compliance Framework
        </label>
        <select
          value={selectedFramework}
          onChange={(e) => setSelectedFramework && setSelectedFramework(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '12.5px',
            fontWeight: 600,
            background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
            border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`,
            borderRadius: '2px',
            color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }),
            cursor: 'pointer'
          }}
        >
          {onboardingFrameworks.map(fw => (
            <option key={fw.id} value={fw.id}>{fw.name}</option>
          ))}
        </select>
      </div>

      {/* Scrollable Navigation */}
      <div className="reg-nav-scroll">
        {/* 1. Compliance & Guidance */}
        {!isCSPM && (
          <>
            <div className="reg-nav-section-hdr" onClick={() => toggleSection('compliance')}>
              <span>Compliance &amp; Guidance</span>
              <span className="reg-nav-section-chevron">{openSections.compliance ? '⌄' : '›'}</span>
            </div>
            {openSections.compliance && (
              <div>
                <div
                  className={`reg-nav-item ${activeNav === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveNav('overview')}
                >
                  <span className="reg-nav-item-text">Overview &amp; Readiness</span>
                </div>
                <div
                  className={`reg-nav-item ${activeNav === 'documents' ? 'active' : ''}`}
                  onClick={() => setActiveNav('documents')}
                >
                  <span className="reg-nav-item-text">Received Policies &amp; Docs</span>
                  <span className="tag">{totalDocs}</span>
                </div>
                {isAssessmentReviewed && (
                  <div
                    className={`reg-nav-item ${activeNav === 'implementation' ? 'active' : ''}`}
                    onClick={() => setActiveNav('implementation')}
                  >
                    <span className="reg-nav-item-text">Implementation Tasks</span>
                    <span className="tag">{totalImplTasks}</span>
                  </div>
                )}
                <div
                  className={`reg-nav-item ${activeNav === 'evidence' ? 'active' : ''}`}
                  onClick={() => setActiveNav('evidence')}
                >
                  <span className="reg-nav-item-text">Evidence &amp; Proof Locker</span>
                  <span className="tag">{totalEvidence}</span>
                </div>
                {isAssessmentReviewed && (
                  <div
                    className={`reg-nav-item ${activeNav === 'feedback' ? 'active' : ''}`}
                    onClick={() => setActiveNav('feedback')}
                  >
                    <span className="reg-nav-item-text">vCISO Feedback &amp; Gaps</span>
                    {rejectedCount > 0 ? (
                      <span className="reg-badge-crimson">{rejectedCount}</span>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 2. Gap Assessments */}
        <div className="reg-nav-section-hdr" onClick={() => toggleSection('assessments')}>
          <span>Gap Assessments</span>
          <span className="reg-nav-section-chevron">{openSections.assessments ? '⌄' : '›'}</span>
        </div>
        {openSections.assessments && (
          <div>
            {hasISO && (
              <div
                className={`reg-nav-item ${activeNav === 'iso27001' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('iso27001');
                  const isoFw = (onboardingFrameworks || []).find(f => f.id === 'iso27001-2022' || f.id === 'iso-27001' || f.name.toLowerCase().includes('iso'));
                  if (isoFw && setSelectedFramework) {
                    setSelectedFramework(isoFw.id);
                  }
                }}
              >
                <span className="reg-nav-item-text">ISO 27001 Questionnaire</span>
                <span className="tag">123Q</span>
              </div>
            )}
            {hasDPDP && (
              <div
                className={`reg-nav-item ${activeNav === 'dpdp' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('dpdp');
                  const dpdpFw = (onboardingFrameworks || []).find(f => f.id === 'dpdp-2023' || f.id === 'dpdp' || f.name.toLowerCase().includes('dpdp'));
                  if (dpdpFw && setSelectedFramework) {
                    setSelectedFramework(dpdpFw.id);
                  }
                }}
              >
                <span className="reg-nav-item-text">DPDP Act Questionnaire</span>
                <span className="tag">50Q</span>
              </div>
            )}
            {hasCSPM && (
              <div
                className={`reg-nav-item ${activeNav === 'cspm' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('cspm');
                  const cspmFw = (onboardingFrameworks || []).find(f => f.id === 'cspm' || f.name.toLowerCase().includes('cspm'));
                  if (cspmFw && setSelectedFramework) {
                    setSelectedFramework(cspmFw.id);
                  }
                }}
              >
                <span className="reg-nav-item-text">CSPM Questionnaire</span>
                <span className="tag">60Q</span>
              </div>
            )}
          </div>
        )}

        {/* 3. Organization & Account */}
        <div className="reg-nav-section-hdr" onClick={() => toggleSection('account')}>
          <span>Organization &amp; Account</span>
          <span className="reg-nav-section-chevron">{openSections.account ? '⌄' : '›'}</span>
        </div>
        {openSections.account && (
          <div>
            <div
              className={`reg-nav-item ${activeNav === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveNav('profile')}
            >
              <span className="reg-nav-item-text">Company Profile</span>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Footer & Logout */}
      <div className="reg-user-footer">
        <div className="reg-user-row">
          <div className="reg-user-avatar">
            {userInitials}
          </div>
          <div className="reg-user-info">
            <div className="reg-user-name">{userName}</div>
            <div className="reg-user-email">{userEmail}</div>
          </div>
        </div>
        <button onClick={onLogout} className="reg-logout-btn">
          <span>⏻</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
