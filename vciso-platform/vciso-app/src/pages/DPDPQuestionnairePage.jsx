import React, { useState, useEffect, useMemo, useRef } from 'react';
import dpdpData from '../data/dpdp_questionnaire.json';
import { useAuth } from '../AuthContext';
import {
  EMPTY_AUDIT_PROGRESS,
  computeAuditProgress,
  isPrivilegedReportViewer,
} from './gapReportAccess';
import { th } from '../theme';

// 4-Tier Scoring Model Options for DPDP Act & Rules
const DPDP_OPTIONS = [
  {
    value: 'yes',
    badge: 'PASS',
    label: 'Fully Implemented / Compliant (PASS)',
    score: 2,
    color: '#10b981',
    description: 'Obligation is fully operational with documented policy and verifiable evidence',
  },
  {
    value: 'partial',
    badge: 'PARTIAL',
    label: 'Partially Implemented (PARTIAL)',
    score: 1,
    color: '#f59e0b',
    description: 'Policy or informal process exists but technical controls or operational proof are incomplete',
  },
  {
    value: 'no',
    badge: 'FAIL',
    label: 'Not Implemented / Non-Compliant (FAIL)',
    score: 0,
    color: '#ef4444',
    description: 'Obligation not implemented — statutory nonconformity subject to regulatory penalties',
  },
  {
    value: 'na',
    badge: 'N/A',
    label: 'Not Applicable / Exempt (N/A)',
    score: null,
    color: th('#6b7280', { dark: '#94A3B8' }),
    description: 'Excluded under Section 17 exemptions or entity does not process this category of personal data',
  },
];

const GROUP_COLORS = {
  'Preliminary & Notice Requirements': '#38bdf8',
  'Consent & Processing Grounds': '#a855f7',
  'Data Fiduciary General Obligations': '#f59e0b',
  'Security Safeguards & Breach Notification': '#ef4444',
  'Children Personal Data & Special Protections': '#ec4899',
  'Significant Data Fiduciary (SDF) Requirements': '#8b5cf6',
  'Data Principal Rights & Grievance Redressal': '#10b981',
  'Cross-Border & Exemptions': '#06b6d4',
  'DPDP Rules 2025 — Operative Procedures': '#f97316',
};

function getDayBefore(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(Date.UTC(y, m, d));
    dateObj.setUTCDate(dateObj.getUTCDate() - 1);
    return dateObj.toISOString().slice(0, 10);
  }
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return '';
  dateObj.setDate(dateObj.getDate() - 1);
  return dateObj.toISOString().slice(0, 10);
}

export default function DPDPQuestionnairePage({ embedded = false, onBack }) {
  const { user, getToken } = useAuth();
  const summaryRef = useRef(null);

  // Core assessment state
  const [answers, setAnswers] = useState({}); // { [qId]: { value, score, reference, group, part, title } }
  const [files, setFiles] = useState({}); // { [qId]: { name, size, type, id, url, download_url } }
  const [notes, setNotes] = useState({}); // { [qId]: string }
  const [reviews, setReviews] = useState({}); // { [qId]: { status, notes, rejectionReason, reviewedBy, reviewedAt } }
  const [uploadingMap, setUploadingMap] = useState({}); // { [qId]: boolean }

  // Organization & user metadata
  const [clientMetadata, setClientMetadata] = useState({
    companyName: user?.company_name || 'Organization',
    respondentName: user?.name || user?.email?.split('@')[0] || 'Compliance Officer',
    respondentEmail: user?.email || '',
    targetComplianceDate: '',
  });

  // UI state
  const [submitterName, setSubmitterName] = useState('');
  const [activePart, setActivePart] = useState('all'); // 'all' | 'Act' | 'Rules' | string (group)
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unanswered' | 'answered' | 'missing_proof' | 'missing_reason' | 'gaps' | 'high_penalty' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [auditProgress, setAuditProgress] = useState(EMPTY_AUDIT_PROGRESS);

  // The client only reads the gap report once the vCISO has audited every
  // response; the vCISO / admin side always reads it.
  const isPrivilegedViewer = useMemo(() => isPrivilegedReportViewer(user), [user]);
  const canViewReport = isPrivilegedViewer || auditProgress.fullyAudited;

  const questions = dpdpData.questions || [];
  const allGroups = useMemo(() => Array.from(new Set(questions.map(q => q.group))), [questions]);
  const clientId = user?.client_id || 'client-001';

  // Load existing client organization info and saved responses from database
  useEffect(() => {
    const token = getToken ? getToken() : localStorage.getItem('vciso_token');

    const fetchOrg = fetch(`/api/company-info/${clientId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);

    const fetchAssessment = fetch(`/api/vciso/assessments/client/${clientId}?frameworkId=dpdp`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);

    const fetchContract = fetch(`/api/contract-tenure/${clientId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);

    Promise.all([fetchOrg, fetchAssessment, fetchContract]).then(([compData, assessData, contractData]) => {
      let targetComplianceDate = '';
      if (contractData && contractData.contract_end) {
        targetComplianceDate = getDayBefore(contractData.contract_end);
      }

      if (compData) {
        setClientMetadata(prev => ({
          ...prev,
          companyName: compData.company_name || prev.companyName,
          respondentName: compData.contact_name || prev.respondentName,
          respondentEmail: compData.contact_email || prev.respondentEmail,
          targetComplianceDate: targetComplianceDate || prev.targetComplianceDate,
        }));
      } else if (targetComplianceDate) {
        setClientMetadata(prev => ({
          ...prev,
          targetComplianceDate,
        }));
      }

      if (assessData && assessData.responses && Array.isArray(assessData.responses)) {
        const initAnswers = {};
        const initFiles = {};
        const initNotes = {};
        const initReviews = {};

        assessData.responses.forEach(r => {
          if (r.response_value) {
            initAnswers[r.question_id] = {
              value: r.response_value,
              status: r.status,
              score: r.score,
              reference: r.reference,
              group: r.theme,
              title: r.title,
            };
          }
          if (r.proof_files_json) {
            try {
              const parsed = JSON.parse(r.proof_files_json);
              initFiles[r.question_id] = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              initFiles[r.question_id] = r.proof_file_name ? [{ name: r.proof_file_name, size: r.proof_file_size || 0, type: r.proof_file_type || '', id: r.proof_file_id || '', url: r.proof_file_url || `/api/evidence/file/${r.proof_file_name}` }] : [];
            }
          } else if (r.proof_file_name) {
            initFiles[r.question_id] = [{
              name: r.proof_file_name,
              size: r.proof_file_size || 0,
              type: r.proof_file_type || '',
              id: r.proof_file_id || '',
              url: r.proof_file_url || `/api/evidence/file/${r.proof_file_name}`,
            }];
          }
          if (r.notes) {
            initNotes[r.question_id] = r.notes;
          }
          if (r.vciso_review_status) {
            initReviews[r.question_id] = {
              status: r.vciso_review_status,
              notes: r.vciso_notes,
              rejectionReason: r.vciso_rejection_reason,
              reviewedBy: r.reviewed_by,
              reviewedAt: r.reviewed_at,
            };
          }
        });

        setAnswers(initAnswers);
        setFiles(initFiles);
        setNotes(initNotes);
        setReviews(initReviews);
        if (assessData.assessment) {
          setSubmitted(
            ['submitted', 'in_review', 'reviewed', 'approved', 'changes_requested'].includes(
              assessData.assessment.status
            )
          );
        }
      }

      setAuditProgress(computeAuditProgress(assessData?.assessment, assessData?.responses));
      setLoadingInitial(false);
    });
  }, [clientId, getToken]);

  const parsePenaltyCrores = (penaltyStr) => {
    if (!penaltyStr) return 50;
    const match = penaltyStr.match(/₹\s*(\d+)\s*crore/i);
    return match ? parseInt(match[1], 10) : 50;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // ── Calculate Live DPDP Readiness & Risk Metrics ──────────────────────────
  const stats = useMemo(() => {
    let answered = 0;
    let applicableQuestions = 0;
    let totalScore = 0;
    let passCount = 0;
    let partialCount = 0;
    let failCount = 0;
    let naCount = 0;
    let proofCount = 0;
    let missingProofCount = 0;
    let missingReasonCount = 0;
    let totalExposureAtRiskCrores = 0;

    questions.forEach(q => {
      const ans = answers[q.id];
      const note = notes[q.id] || '';
      const rawFile = files[q.id];
      const fileList = Array.isArray(rawFile) ? rawFile : (rawFile ? [rawFile] : []);
      const hasProof = fileList.length > 0;
      const penaltyCrores = parsePenaltyCrores(q.penalty_exposure);

      if (ans && ans.value) {
        answered++;
        if (ans.value === 'yes') {
          passCount++;
          applicableQuestions++;
          totalScore += 2;
          if (hasProof) proofCount += fileList.length;
          else missingProofCount++;
        } else if (ans.value === 'partial') {
          partialCount++;
          applicableQuestions++;
          totalScore += 1;
          totalExposureAtRiskCrores += Math.round(penaltyCrores * 0.5); // 50% risk exposure on partial
          if (!note.trim()) missingReasonCount++;
        } else if (ans.value === 'no') {
          failCount++;
          applicableQuestions++;
          totalScore += 0;
          totalExposureAtRiskCrores += penaltyCrores; // 100% risk exposure on fail
          if (!note.trim()) missingReasonCount++;
        } else if (ans.value === 'na') {
          naCount++;
          if (!note.trim()) missingReasonCount++;
        }
      } else {
        // Unanswered treated as unassessed gap exposure
        totalExposureAtRiskCrores += penaltyCrores;
      }
    });

    const maxApplicableScore = applicableQuestions * 2;
    // Formula: Readiness % = (sum of scores of answered, non-N/A questions) / (2 * count of answered, non-N/A questions) * 100
    const readinessPct = maxApplicableScore > 0 ? Math.round((totalScore / maxApplicableScore) * 100) : 0;
    const completionPct = Math.round((answered / questions.length) * 100);
    const totalGaps = failCount + partialCount;

    return {
      total: questions.length,
      answered,
      unanswered: questions.length - answered,
      completionPct,
      applicableQuestions,
      totalScore,
      maxApplicableScore,
      readinessPct,
      passCount,
      passPct: applicableQuestions > 0 ? Math.round((passCount / applicableQuestions) * 100) : 0,
      partialCount,
      partialPct: applicableQuestions > 0 ? Math.round((partialCount / applicableQuestions) * 100) : 0,
      failCount,
      failPct: applicableQuestions > 0 ? Math.round((failCount / applicableQuestions) * 100) : 0,
      naCount,
      proofCount,
      missingProofCount,
      missingReasonCount,
      totalGaps,
      totalExposureAtRiskCrores,
    };
  }, [questions, answers, files, notes]);

  // Group / Chapter Breakdown
  const groupBreakdown = useMemo(() => {
    const map = {};
    allGroups.forEach(g => {
      map[g] = {
        group: g,
        total: 0,
        answered: 0,
        applicable: 0,
        score: 0,
        pass: 0,
        partial: 0,
        fail: 0,
        na: 0,
        maxPenaltyCrores: 0,
        part: '',
      };
    });

    questions.forEach(q => {
      const entry = map[q.group];
      if (entry) {
        entry.total++;
        entry.part = q.part;
        const penaltyCrores = parsePenaltyCrores(q.penalty_exposure);
        if (penaltyCrores > entry.maxPenaltyCrores) entry.maxPenaltyCrores = penaltyCrores;

        const ans = answers[q.id];
        if (ans && ans.value) {
          entry.answered++;
          if (ans.value === 'yes') {
            entry.pass++;
            entry.applicable++;
            entry.score += 2;
          } else if (ans.value === 'partial') {
            entry.partial++;
            entry.applicable++;
            entry.score += 1;
          } else if (ans.value === 'no') {
            entry.fail++;
            entry.applicable++;
            entry.score += 0;
          } else if (ans.value === 'na') {
            entry.na++;
          }
        }
      }
    });

    return Object.values(map).map(item => {
      const max = item.applicable * 2;
      const pct = max > 0 ? Math.round((item.score / max) * 100) : 0;
      let risk = 'Low';
      if (pct < 50) risk = 'High';
      else if (pct < 75) risk = 'Medium';

      return {
        ...item,
        readinessPct: pct,
        risk,
      };
    });
  }, [allGroups, questions, answers]);

  // Filtered Questions List
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Part / Group filter
      if (activePart === 'Act' && q.part !== 'Act') return false;
      if (activePart === 'Rules' && q.part !== 'Rules') return false;
      if (activePart !== 'all' && activePart !== 'Act' && activePart !== 'Rules' && q.group !== activePart) {
        return false;
      }

      // Status filter
      const ans = answers[q.id];
      const note = notes[q.id] || '';
      const file = files[q.id];
      const penaltyCrores = parsePenaltyCrores(q.penalty_exposure);

      if (statusFilter === 'unanswered' && ans?.value) return false;
      if (statusFilter === 'answered' && !ans?.value) return false;
      if (statusFilter === 'missing_proof' && (ans?.value !== 'yes' || file)) return false;
      if (statusFilter === 'missing_reason' && (ans?.value === 'yes' || !ans?.value || note.trim())) return false;
      if (statusFilter === 'gaps' && (ans?.value !== 'no' && ans?.value !== 'partial')) return false;
      if (statusFilter === 'high_penalty' && penaltyCrores < 200) return false;
      if (statusFilter === 'rejected' && reviews[q.id]?.status !== 'rejected') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesRef = q.reference.toLowerCase().includes(query);
        const matchesId = q.id.toLowerCase().includes(query);
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesQ = q.question.toLowerCase().includes(query);
        const matchesGroup = q.group.toLowerCase().includes(query);
        const matchesPenalty = (q.penalty_exposure || '').toLowerCase().includes(query);
        if (!matchesRef && !matchesId && !matchesTitle && !matchesQ && !matchesGroup && !matchesPenalty) return false;
      }

      return true;
    });
  }, [questions, activePart, statusFilter, searchQuery, answers, files, notes, reviews]);

  // Answer selection handler
  const handleSelectOption = (q, opt) => {
    setAnswers(prev => ({
      ...prev,
      [q.id]: {
        value: opt.value,
        status: opt.status || opt.badge,
        score: opt.score,
        reference: q.reference,
        group: q.group,
        part: q.part,
        title: q.title,
        question: q.question,
      },
    }));
    setSubmitError('');
  };

  // File upload handler — saves to Supabase backend & uploads directory
  const handleFileUpload = async (qId, file) => {
    if (!file) return;
    setUploadingMap(prev => ({ ...prev, [qId]: true }));
    setSubmitError('');

    try {
      const fd = new FormData();
      fd.append('files', file);
      fd.append('client_id', clientId);
      fd.append('framework_id', 'dpdp');
      fd.append('question_id', qId);

      const qObj = questions.find(q => q.id === qId);
      if (qObj) fd.append('requirement_name', qObj.title || qObj.reference);

      const token = getToken ? getToken() : localStorage.getItem('vciso_token');
      const res = await fetch('/api/vciso/evidence/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      const data = await res.json();
      if (res.ok && data.file) {
        const newFileObj = {
          name: data.file.original_name || file.name,
          size: data.file.size || file.size,
          type: data.file.mimetype || file.type,
          id: data.file.id,
          url: data.file.url,
          download_url: data.file.download_url,
          uploadedAt: new Date().toISOString(),
        };
        setFiles(prev => {
          const existing = Array.isArray(prev[qId]) ? prev[qId] : (prev[qId] ? [prev[qId]] : []);
          return { ...prev, [qId]: [...existing, newFileObj] };
        });
      } else {
        const fallbackObj = {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
        };
        setFiles(prev => {
          const existing = Array.isArray(prev[qId]) ? prev[qId] : (prev[qId] ? [prev[qId]] : []);
          return { ...prev, [qId]: [...existing, fallbackObj] };
        });
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      const fallbackObj = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
      };
      setFiles(prev => {
        const existing = Array.isArray(prev[qId]) ? prev[qId] : (prev[qId] ? [prev[qId]] : []);
        return { ...prev, [qId]: [...existing, fallbackObj] };
      });
    } finally {
      setUploadingMap(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleRemoveFile = (qId, index) => {
    setFiles(prev => {
      const existing = Array.isArray(prev[qId]) ? prev[qId] : (prev[qId] ? [prev[qId]] : []);
      const updated = existing.filter((_, i) => i !== index);
      if (updated.length === 0) {
        const next = { ...prev };
        delete next[qId];
        return next;
      }
      return { ...prev, [qId]: updated };
    });
  };

  // Submit complete assessment to backend database with strict validation
  const handleSubmitAssessment = async () => {
    setSubmitError('');

    // Validate mandatory submitter name
    if (!submitterName || !submitterName.trim()) {
      setSubmitError('Validation Error: Please enter your full name in "Your Name (Required)" at the top before submitting.');
      const elem = document.getElementById('dpdp-submitter-name-input');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elem.focus();
      }
      return;
    }

    // 0. Enforce 100% questionnaire completion (Mandatory for DPDP Act, 2023)
    const unansweredQuestions = questions.filter(q => !answers[q.id]?.value);
    if (unansweredQuestions.length > 0) {
      setSubmitError(
        `Validation Error: Please answer all ${questions.length} questions before submitting. (${unansweredQuestions.length} unanswered obligation(s) remaining: e.g. ${unansweredQuestions.slice(0, 3).map(q => q.reference).join(', ')}).`
      );
      const firstUnansweredId = `question-${unansweredQuestions[0].id}`;
      const elem = document.getElementById(firstUnansweredId);
      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 1. Validate mandatory proof for PASS (Score 2 / 'yes')
    const missingProofQuestions = questions.filter(q => {
      const qFiles = Array.isArray(files[q.id]) ? files[q.id] : (files[q.id] ? [files[q.id]] : []);
      return answers[q.id]?.value === 'yes' && qFiles.length === 0;
    });

    if (missingProofQuestions.length > 0) {
      setSubmitError(
        `Validation Error: ${missingProofQuestions.length} requirement(s) marked as PASS (Score 2) are missing mandatory evidence proof (e.g. ${missingProofQuestions.slice(0, 3).map(q => q.reference).join(', ')}). Please attach proof documents before submitting.`
      );
      const firstMissingId = `question-${missingProofQuestions[0].id}`;
      const elem = document.getElementById(firstMissingId);
      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Validate mandatory reasoning for PARTIAL, FAIL, or N/A
    const missingReasonQuestions = questions.filter(q => {
      const ans = answers[q.id];
      if (!ans || !ans.value) return false;
      if (ans.value === 'yes') return false; // Proof is required instead
      const note = notes[q.id] || '';
      return !note.trim();
    });

    if (missingReasonQuestions.length > 0) {
      setSubmitError(
        `Validation Error: ${missingReasonQuestions.length} obligation(s) marked as PARTIAL, FAIL, or N/A require a mandatory justification / gap remediation note (e.g. ${missingReasonQuestions.slice(0, 3).map(q => q.reference).join(', ')}). Please provide explanations before submitting.`
      );
      const firstMissingId = `question-${missingReasonQuestions[0].id}`;
      const elem = document.getElementById(firstMissingId);
      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (stats.answered === 0) {
      setSubmitError('Please answer questions before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        clientId,
        frameworkId: 'dpdp',
        frameworkName: 'Digital Personal Data Protection Act, 2023 + Rules, 2025',
        companyName: clientMetadata.companyName,
        respondentName: submitterName.trim() || clientMetadata.respondentName,
        submittedBy: submitterName.trim(),
        respondentEmail: clientMetadata.respondentEmail,
        targetDate: clientMetadata.targetComplianceDate,
        stats: {
          total: stats.total,
          answered: stats.answered,
          readinessPct: stats.readinessPct,
          passCount: stats.passCount,
          partialCount: stats.partialCount,
          failCount: stats.failCount,
          naCount: stats.naCount,
          proofCount: stats.proofCount,
          totalGaps: stats.totalGaps,
          exposureAtRiskCrores: stats.totalExposureAtRiskCrores,
        },
        themeBreakdown: groupBreakdown,
        answers,
        files,
        notes,
      };

      const token = getToken ? getToken() : localStorage.getItem('vciso_token');
      const res = await fetch('/api/vciso/assessments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        setSubmitted(true);
        if (summaryRef.current) {
          summaryRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        setSubmitError(result.error || 'Failed to submit DPDP assessment.');
      }
    } catch (err) {
      setSubmitError(`Network error submitting assessment: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Top Header Banner */}
      <div className="bg-white/95 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {embedded && onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition mr-1 shadow-sm"
              >
                ← Back
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-xl shadow-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-slate-900 tracking-tight">DPDP Act, 2023 & DPDP Rules, 2025</h1>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  India Data Privacy Law
                </span>
                {submitted && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✓ Assessment Submitted
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Organization: <strong className="text-slate-800">{clientMetadata.companyName}</strong> · Lead: <span className="text-slate-700">{clientMetadata.respondentName}</span>
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Readiness Score</div>
              <div className={`text-xl font-black ${stats.readinessPct >= 75 ? 'text-emerald-600' : stats.readinessPct >= 50 ? 'text-amber-600' : 'text-blue-600'}`}>
                {stats.readinessPct}%
              </div>
            </div>
            <button
              onClick={handleSubmitAssessment}
              disabled={submitting || stats.answered < stats.total}
              title={stats.answered < stats.total ? `Please answer all ${stats.total} questions (${stats.total - stats.answered} remaining)` : 'Submit completed DPDP assessment'}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? '⏳ Submitting...' : stats.answered < stats.total ? `🚀 Submit Assessment (${stats.answered}/${stats.total})` : '🚀 Save & Submit Assessment'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">

        {/* ── Organization & Submitter Metadata Card ─────────────────────────────── */}
        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block text-slate-500 font-bold mb-1">Organization Name</label>
            <input
              type="text"
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium cursor-not-allowed select-none shadow-sm"
              value={clientMetadata.companyName}
            />
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Assessor / Lead Name</label>
            <input
              type="text"
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium cursor-not-allowed select-none shadow-sm"
              value={clientMetadata.respondentName}
            />
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Contact Email</label>
            <input
              type="email"
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium cursor-not-allowed select-none shadow-sm"
              value={clientMetadata.respondentEmail}
            />
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Target DPDP Compliance Date</label>
            <input
              type="date"
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium cursor-not-allowed select-none shadow-sm"
              value={clientMetadata.targetComplianceDate}
            />
          </div>
          <div>
            <label className="block text-amber-800 font-bold mb-1 flex items-center gap-1">
              <span>Your Name (Required)</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="dpdp-submitter-name-input"
              placeholder="Enter your full name…"
              className="w-full bg-white border border-amber-300 focus:border-amber-600 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              value={submitterName}
              onChange={e => setSubmitterName(e.target.value)}
            />
          </div>
        </div>

        {/* Regulatory Timeline & Key Dates Alert Banner */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="text-2xl mt-0.5">📅</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h3 className="text-amber-800 font-bold text-sm">Regulatory Timeline & Enforcement Horizon</h3>
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                  Full Compliance Deadline: 13 May 2027
                </span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                The DPDP Act, 2023 & DPDP Rules, 2025 roll out across three phases. Running this gap analysis now gives your organization a clear runway to close nonconformities before the statutory penalty provisions become fully enforceable.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-blue-700 font-bold text-xs">Phase I · Effective Now</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">13 Nov 2025 — Rules 1-2, 17-21; ss.18-26, 35, 38-43</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-amber-700 font-bold text-xs">Phase II · Consent Managers</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">13 Nov 2026 — Rule 4; s.6(9), s.27(1)(d)</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-orange-700 font-bold text-xs">Phase III · Substantive Duties</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">13 May 2027 — Notice, Consent, Security, Rights, Retention</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary KPI Metrics Summary */}
        <div ref={summaryRef} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Readiness Score</div>
            <div className={`text-2xl font-black mt-1 ${stats.readinessPct >= 75 ? 'text-emerald-600' : stats.readinessPct >= 50 ? 'text-amber-600' : 'text-blue-600'}`}>
              {stats.readinessPct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{stats.totalScore} / {stats.maxApplicableScore} pts</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Progress</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats.answered} <span className="text-xs font-normal text-slate-400">/ {stats.total}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{stats.completionPct}% completed</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">Pass (Compliant)</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.passCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">{stats.passPct}% of evaluated</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-amber-700 uppercase font-bold tracking-wider">Partial (Needs Imp.)</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.partialCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">{stats.partialPct}% of evaluated</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-red-700 uppercase font-bold tracking-wider">Fail (Nonconformity)</div>
            <div className="text-2xl font-black text-red-600 mt-1">{stats.failCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">{stats.failPct}% of evaluated</div>
          </div>

          <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm bg-red-50/20">
            <div className="text-[10px] text-red-700 uppercase font-bold tracking-wider">Penalty Exposure</div>
            <div className="text-xl font-black text-red-600 mt-1 truncate" title={`₹${stats.totalExposureAtRiskCrores} Cr`}>
              ₹{stats.totalExposureAtRiskCrores} Cr
            </div>
            <div className="text-[10px] text-red-500 font-medium mt-1">{stats.totalGaps} open gaps</div>
          </div>
        </div>

        {/* Validation Error Alert Banner */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-semibold flex items-start gap-3 shadow-sm">
            <span className="text-xl mt-0.5">⚠️</span>
            <div className="flex-1">
              <div className="font-bold text-red-900 text-sm">Submission Incomplete</div>
              <div className="mt-1 leading-relaxed">{submitError}</div>
            </div>
          </div>
        )}

        {/* Section Navigation Tabs & Search Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Part / Group selector */}
            <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActivePart('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activePart === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All (50)
              </button>
              <button
                onClick={() => setActivePart('Act')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activePart === 'Act' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Part A — Act (29)
              </button>
              <button
                onClick={() => setActivePart('Rules')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activePart === 'Rules' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Part B — Rules (21)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search reference (e.g. S.8(5)), keyword..."
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>

          {/* Quick Filter Pill Badges */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mr-1">Filter:</span>
            {[
              { key: 'all', label: `All Questions (${questions.length})` },
              { key: 'unanswered', label: `Unanswered (${stats.unanswered})` },
              { key: 'gaps', label: `Open Gaps / Fails (${stats.totalGaps})` },
              { key: 'missing_proof', label: `Missing Evidence (${stats.missingProofCount})` },
              { key: 'missing_reason', label: `Missing Reason (${stats.missingReasonCount})` },
              { key: 'high_penalty', label: 'High Penalty (₹200Cr+)' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${statusFilter === f.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-sm font-bold text-slate-900">No questions match your current filter or search</div>
              <div className="text-xs mt-1">Try resetting the status filter or clearing your search term.</div>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const ans = answers[q.id];
              const file = files[q.id];
              const note = notes[q.id] || '';
              const review = reviews[q.id];
              const isUploading = uploadingMap[q.id];
              const penaltyCrores = parsePenaltyCrores(q.penalty_exposure);

              const isPass = ans?.value === 'yes';
              const isAnswered = Boolean(ans?.value);
              const isMissingProof = isPass && !file;
              const isMissingReason = isAnswered && !isPass && !note.trim();

              return (
                <div
                  key={q.id}
                  id={`question-${q.id}`}
                  className={`bg-white border rounded-2xl p-5 transition-all shadow-sm scroll-mt-24 ${
                    isMissingProof || isMissingReason
                      ? 'border-red-300 bg-red-50/10'
                      : isPass
                      ? 'border-emerald-200'
                      : ans?.value === 'partial'
                      ? 'border-amber-200'
                      : ans?.value === 'no'
                      ? 'border-red-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        {q.reference}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {q.id} · {q.title}
                      </span>
                      <span
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {q.group}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold">
                        {q.part}
                      </span>
                    </div>

                    {/* Penalty Exposure Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700">
                      <span>⚠️ Statutory Penalty:</span>
                      <span className={penaltyCrores >= 200 ? 'text-red-700 font-black' : 'text-amber-700 font-bold'}>
                        {q.penalty_exposure}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {q.question}
                  </p>

                  {/* 4-Tier Scoring Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                    {DPDP_OPTIONS.map(opt => {
                      const isSelected = ans?.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption(q, opt)}
                          className={`text-left p-3 rounded-xl border transition-all select-none ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-slate-900">
                              {opt.badge}
                            </span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 leading-snug">
                            {opt.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Dynamic Mandatory Evidence Proof Upload (for PASS: Score 2) ── */}
                  {isPass && (() => {
                    const qFiles = Array.isArray(files[q.id]) ? files[q.id] : (files[q.id] ? [files[q.id]] : []);
                    const isMissingProof = qFiles.length === 0;

                    return (
                      <div className="p-3.5 rounded-xl border bg-emerald-50/30 border-emerald-200 space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                            <span>📁 Mandatory Statutory Evidence Attachment: *</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              (Required to substantiate PASS · {qFiles.length} file{qFiles.length === 1 ? '' : 's'} attached)
                            </span>
                          </span>
                          {isMissingProof && !isUploading && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              ⚠️ Evidence File Required *
                            </span>
                          )}
                        </div>

                        {/* Upload Spinner */}
                        {isUploading && (
                          <div className="p-3 rounded-xl bg-white border border-blue-200 flex items-center justify-center gap-2 text-xs text-blue-700 shadow-sm">
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                            <span>Uploading file to secure backend storage...</span>
                          </div>
                        )}

                        {/* List of all uploaded files */}
                        {qFiles.length > 0 && (
                          <div className="space-y-1.5">
                            {qFiles.map((fileItem, fIdx) => (
                              <div key={fileItem.id || fIdx} className="p-2.5 rounded-xl bg-white border border-emerald-200 text-xs flex items-center justify-between gap-2 shadow-sm">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-emerald-600 font-bold">✓</span>
                                  <span className="font-mono font-bold text-slate-900 truncate">{fileItem.name}</span>
                                  <span className="text-slate-400 text-[11px]">({formatBytes(fileItem.size)})</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {fileItem.url && (
                                    <a
                                      href={fileItem.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:text-blue-700 text-xs font-bold underline px-1.5 py-0.5"
                                    >
                                      Preview
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(q.id, fIdx)}
                                    className="text-red-600 hover:text-red-700 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-red-50"
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload Controls: Initial Dropzone or + Add More Evidence Button */}
                        {qFiles.length === 0 ? (
                          <label className="block p-4 border border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/40 transition bg-white">
                            <input
                              type="file"
                              className="hidden"
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(q.id, e.target.files[0]);
                                }
                              }}
                            />
                            <span className="text-xs text-slate-700 font-semibold block">
                              📎 Click to attach statutory evidence document (PDF, PNG, JPG, DOCX, XLSX, TXT) *
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Upload notice copy, consent logs, DPO appointment letter, or security policy document
                            </span>
                          </label>
                        ) : (
                          <div className="pt-1 flex items-center justify-between">
                            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition shadow-sm">
                              <input
                                type="file"
                                className="hidden"
                                onChange={e => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(q.id, e.target.files[0]);
                                  }
                                }}
                              />
                              <span>➕ Add More Evidence ({qFiles.length} uploaded)</span>
                            </label>
                            <span className="text-[10px] text-slate-400">Attach policies, consent logs, or DPIAs</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Dynamic Mandatory Explanation / Exemption Justification (for PARTIAL, FAIL, or N/A) ── */}
                  {isAnswered && !isPass && (
                    <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 space-y-1.5 mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span>
                            💬 {ans.value === 'na'
                              ? 'Mandatory Statutory Exemption / N/A Justification: *'
                              : 'Mandatory Nonconformity Explanation / Gap Remediation Plan: *'}
                          </span>
                        </span>
                        {isMissingReason && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            ⚠️ {ans.value === 'na' ? 'Exemption Justification Required *' : 'Explanation Required *'}
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        placeholder={
                          ans.value === 'na'
                            ? 'State legal or operational basis why this DPDP obligation is exempt under Section 17 or not applicable to your entity...'
                            : 'State current gap, deficiency in safeguards, or planned remediation timeline for this obligation...'
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        value={note}
                        onChange={e => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* vCISO Feedback Display — colour-coded by decision, the way
                      the ISO questionnaire does it. Rendering every verdict in red
                      made an accepted response read as a rejection. */}
                  {review && (() => {
                    const isAccepted = review.status === 'accepted' || review.status === 'verified';
                    const isRejected = review.status === 'rejected';
                    const tone = isAccepted
                      ? { box: 'bg-emerald-50 border-emerald-200', head: 'text-emerald-800', pill: 'bg-emerald-100 text-emerald-700', icon: '✅' }
                      : isRejected
                      ? { box: 'bg-red-50 border-red-200', head: 'text-red-800', pill: 'bg-red-100 text-red-700', icon: '🚨' }
                      : { box: 'bg-amber-50 border-amber-200', head: 'text-amber-800', pill: 'bg-amber-100 text-amber-700', icon: '⏳' };

                    return (
                      <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1 ${tone.box}`}>
                        <div className={`flex items-center gap-2 font-bold ${tone.head}`}>
                          <span>{tone.icon} vCISO Auditor Feedback:</span>
                          <span className={`uppercase text-[10px] px-2 py-0.5 rounded-full ${tone.pill}`}>{review.status}</span>
                        </div>
                        <p className="text-slate-700">{review.notes || review.rejectionReason || 'No extra notes provided.'}</p>
                        {review.reviewedBy && (
                          <div className="text-[10px] text-slate-400">
                            Reviewed by {review.reviewedBy}
                            {review.reviewedAt ? ` on ${new Date(review.reviewedAt).toLocaleDateString()}` : ''}
                          </div>
                        )}
                        {isRejected && (
                          <div className="text-[11px] text-red-700 font-semibold mt-1">
                            💡 Please replace or amend your uploaded evidence above to resolve this rejection.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Big Submit Button */}
        <div className="pt-2 pb-2 text-center">
          <button
            type="button"
            onClick={handleSubmitAssessment}
            disabled={submitting || stats.answered < stats.total}
            title={stats.answered < stats.total ? `Please answer all ${stats.total} questions before submitting` : 'Save & Submit Assessment'}
            className="px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {submitting ? '⏳ Submitting Assessment...' : stats.answered < stats.total ? `🚀 Complete All Questions to Submit (${stats.answered}/${stats.total} Answered)` : '🚀 Save & Submit DPDP Gap Assessment'}
          </button>
        </div>

        {/* Chapter Summary Table & Gap Analysis Report */}
        {/* Withheld from the client until the vCISO has audited every response. */}
        {submitted && !canViewReport && (
          <div className="rounded-2xl p-6 border border-amber-200 bg-amber-50/60 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              DPDP Act, 2023 Gap Assessment Report
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              🔒 Report Locked — Pending vCISO Audit
            </h3>
            <p className="text-sm text-slate-700 mt-3 max-w-3xl">
              Your DPDP assessment has been submitted and handed to your assigned vCISO. The
              compliance and gap analysis summary, including chapter-wise readiness and
              penalty exposure, is released to you only after the vCISO has audited every
              submitted response.
            </p>

            {auditProgress.total > 0 && (
              <div className="mt-5 max-w-md">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>vCISO Audit Progress</span>
                  <span>
                    {auditProgress.reviewed} / {auditProgress.total} responses audited
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-amber-200/70 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-all"
                    style={{
                      width: `${Math.round((auditProgress.reviewed / auditProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-slate-600">
                  {auditProgress.pending} response(s) still awaiting auditor sign-off.
                </div>
              </div>
            )}
          </div>
        )}

        {canViewReport && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900">DPDP Compliance & Gap Analysis Summary</h3>
              <p className="text-slate-500 text-xs mt-0.5">Summary by Act Chapter and DPDP Rules with maximum penalty exposures</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-sm flex items-center gap-1.5"
            >
              <span>🖨️</span> Print / Export Gap Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Chapter / Obligation Group</th>
                  <th className="py-2.5 px-3">Part</th>
                  <th className="py-2.5 px-3 text-center">Questions</th>
                  <th className="py-2.5 px-3 text-center">PASS</th>
                  <th className="py-2.5 px-3 text-center">PARTIAL</th>
                  <th className="py-2.5 px-3 text-center">FAIL</th>
                  <th className="py-2.5 px-3 text-center">Max Penalty</th>
                  <th className="py-2.5 px-3 text-right">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupBreakdown.map(g => (
                  <tr key={g.group} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">{g.group}</td>
                    <td className="py-3 px-3 text-slate-500">{g.part}</td>
                    <td className="py-3 px-3 text-center text-slate-700">{g.answered}/{g.total}</td>
                    <td className="py-3 px-3 text-center text-emerald-700 font-bold">{g.pass}</td>
                    <td className="py-3 px-3 text-center text-amber-700 font-bold">{g.partial}</td>
                    <td className="py-3 px-3 text-center text-red-700 font-bold">{g.fail}</td>
                    <td className="py-3 px-3 text-center text-red-700 font-bold">₹{g.maxPenaltyCrores} Cr</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${g.readinessPct >= 75 ? 'text-emerald-700' : g.readinessPct >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                        {g.readinessPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
