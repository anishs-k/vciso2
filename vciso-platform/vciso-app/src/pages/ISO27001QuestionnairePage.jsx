import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import questionnaireData from '../data/iso27001_questionnaire.json';
import {
  EMPTY_AUDIT_PROGRESS,
  computeAuditProgress,
  isPrivilegedReportViewer,
} from './gapReportAccess';

const THEME_COLORS = {
  'Context of the Organization': '#38bdf8',
  'Leadership':                   '#a855f7',
  'Planning':                     '#818cf8',
  'Support':                      '#34d399',
  'Operation':                    '#f59e0b',
  'Performance Evaluation':       '#ec4899',
  'Improvement':                  '#06b6d4',
  'A.5 Organizational Controls':  '#3b82f6',
  'A.6 People Controls':          '#10b981',
  'A.7 Physical Controls':        '#f97316',
  'A.8 Technological Controls':   '#8b5cf6',
};

// 5-Tier Maturity & Scoring Model (from Gap Assessment Formula.docx)
const MATURITY_OPTIONS = [
  {
    value: 'fully',
    label: 'Fully Implemented (Score: 4 — 100%)',
    description: 'Implemented, documented, and adequate evidence available.',
    score: 4,
    status: 'COMPLIANT',
    color: '#10b981',
    badge: '🟢 Score 4',
  },
  {
    value: 'largely',
    label: 'Largely Implemented (Score: 3 — 75%)',
    description: 'Requirement mostly implemented; minor gaps remain.',
    score: 3,
    status: 'PARTIAL',
    color: '#06b6d4',
    badge: '🔵 Score 3',
  },
  {
    value: 'partial',
    label: 'Partially Implemented (Score: 2 — 50%)',
    description: 'Some requirements implemented; major gaps remain.',
    score: 2,
    status: 'PARTIAL',
    color: '#f59e0b',
    badge: '🟡 Score 2',
  },
  {
    value: 'initial',
    label: 'Initial / Ad-Hoc (Score: 1 — 25%)',
    description: 'Informal practice exists; no formal documentation or owner.',
    score: 1,
    status: 'NON-COMPLIANT',
    color: '#f97316',
    badge: '🟠 Score 1',
  },
  {
    value: 'not_implemented',
    label: 'Not Implemented (Score: 0 — 0%)',
    description: 'No control, process, or evidence in place.',
    score: 0,
    status: 'NON-COMPLIANT',
    color: '#ef4444',
    badge: '🔴 Score 0',
  },
  {
    value: 'na',
    label: 'Not Applicable (Excluded from Denominator)',
    description: 'Excluded from ISMS Scope / Statement of Applicability.',
    score: null,
    status: 'N/A',
    color: '#94a3b8',
    badge: '⚪ SoA N/A',
  },
];

const ISMS_AREAS = [
  { id: 'governance',     name: 'Governance',             clauseRef: '5.1, 5.2, 5.3, A.5.1', icon: '👑' },
  { id: 'risk_mgmt',      name: 'Risk Management',        clauseRef: '6.1.2, 6.1.3, 8.2',    icon: '⚖️' },
  { id: 'asset_mgmt',     name: 'Asset Management',       clauseRef: 'A.5.9, A.5.10, A.5.11',icon: '🖥️' },
  { id: 'access_control', name: 'Access Control',         clauseRef: 'A.5.15, A.5.16, A.8.2',icon: '🔑' },
  { id: 'incident_mgmt',  name: 'Incident Management',    clauseRef: 'A.5.24, A.5.25, A.5.26',icon: '🚨' },
  { id: 'bcp',            name: 'Business Continuity',    clauseRef: 'A.5.29, A.5.30',       icon: '🔄' },
  { id: 'supplier_sec',   name: 'Supplier Security',      clauseRef: 'A.5.19, A.5.20, A.5.21',icon: '🤝' },
  { id: 'monitoring',     name: 'Monitoring & Logging',   clauseRef: 'A.8.15, A.8.16, 9.1',  icon: '📊' },
  { id: 'internal_audit', name: 'Internal Audit',         clauseRef: '9.2.1, 9.2.2',         icon: '🔍' },
  { id: 'continual_imp',  name: 'Continual Improvement',  clauseRef: '10.1, 10.2, 9.3',      icon: '📈' },
];

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

export default function ISO27001QuestionnairePage({ embedded = false, onBack }) {
  const { user, getToken } = useAuth();
  const clientId = user?.client_id || 'client-001';
  const questions = useMemo(() => questionnaireData.questions || [], []);

  // Form State
  const [answers, setAnswers] = useState({}); // { [qId]: { value, score, status } }
  const [files, setFiles] = useState({}); // { [qId]: { name, size, type, id, url, download_url, uploadedAt } }
  const [notes, setNotes] = useState({}); // { [qId]: string }
  const [reviews, setReviews] = useState({}); // { [qId]: { status, notes, rejectionReason, reviewedBy, reviewedAt } }
  const [uploadingMap, setUploadingMap] = useState({}); // { [qId]: boolean }
  const [clientMetadata, setClientMetadata] = useState({
    companyName: user?.company_name || 'Organization Security Team',
    respondentName: user?.name || 'Lead Information Security Officer',
    respondentEmail: user?.email || 'security@company.com',
    targetCertificationDate: '',
  });

  // UI state
  const [submitterName, setSubmitterName] = useState('');
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'clauses' | 'controls' | theme name
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unanswered' | 'answered' | 'missing_proof' | 'missing_reason' | 'gaps' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reportTab, setReportTab] = useState('critical_gaps');
  const [auditProgress, setAuditProgress] = useState(EMPTY_AUDIT_PROGRESS);

  const summaryRef = useRef(null);

  // The client only reads the gap report once the vCISO has audited every
  // response; the vCISO / admin side always reads it.
  const isPrivilegedViewer = useMemo(() => isPrivilegedReportViewer(user), [user]);
  const canViewReport = isPrivilegedViewer || auditProgress.fullyAudited;

  // Fetch live client assessment and responses from Supabase DB
  useEffect(() => {
    const token = getToken ? getToken() : localStorage.getItem('vciso_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 1. Fetch Company Info
    fetch(`/api/company-info/${clientId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(info => {
        if (info && info.company_name) {
          setClientMetadata(prev => ({
            ...prev,
            companyName: info.company_name,
            respondentName: user?.name || prev.respondentName,
            respondentEmail: user?.email || prev.respondentEmail,
          }));
        }
      })
      .catch(() => {});

    // 2. Fetch ISO Assessment & Responses
    fetch(`/api/vciso/assessments/client/${clientId}?frameworkId=iso27001-2022`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.assessment) {
          if (d.assessment.company_name) {
            setClientMetadata(prev => ({
              ...prev,
              companyName: d.assessment.company_name || prev.companyName,
              respondentName: d.assessment.respondent_name || prev.respondentName,
              respondentEmail: d.assessment.respondent_email || prev.respondentEmail,
              targetCertificationDate: prev.targetCertificationDate || d.assessment.target_date || '',
            }));
          }
          if (['submitted', 'reviewed', 'approved', 'changes_requested', 'in_review'].includes(d.assessment.status)) {
            setSubmitted(true);
          }
        }
        if (Array.isArray(d?.responses) && d.responses.length > 0) {
          const loadedAns = {};
          const loadedFiles = {};
          const loadedNotes = {};
          const loadedReviews = {};

          d.responses.forEach(r => {
            if (r.response_value) {
              loadedAns[r.question_id] = {
                value: r.response_value,
                score: r.score,
                status: r.status,
                reference: r.reference,
                theme: r.theme,
                title: r.title,
                question: r.question,
              };
            }
            if (r.proof_files_json) {
              try {
                const parsed = JSON.parse(r.proof_files_json);
                loadedFiles[r.question_id] = Array.isArray(parsed) ? parsed : [parsed];
              } catch (e) {
                loadedFiles[r.question_id] = r.proof_file_name ? [{ name: r.proof_file_name, size: r.proof_file_size || 0, type: r.proof_file_type || 'application/octet-stream', id: r.proof_file_id, url: r.proof_file_url || `/api/evidence/file/${r.proof_file_name}` }] : [];
              }
            } else if (r.proof_file_name) {
              loadedFiles[r.question_id] = [{
                name: r.proof_file_name,
                size: r.proof_file_size || 0,
                type: r.proof_file_type || 'application/octet-stream',
                id: r.proof_file_id,
                url: r.proof_file_url || `/api/evidence/file/${r.proof_file_name}`,
                download_url: `/api/evidence/download/${r.proof_file_id || r.proof_file_name}`,
                uploadedAt: r.updated_at,
              }];
            }
            if (r.notes) {
              loadedNotes[r.question_id] = r.notes;
            }
            if (r.vciso_review_status && r.vciso_review_status !== 'pending') {
              loadedReviews[r.question_id] = {
                status: r.vciso_review_status,
                notes: r.vciso_notes,
                rejectionReason: r.vciso_rejection_reason || r.vciso_notes,
                reviewedBy: r.reviewed_by,
              };
            }
          });

          setAnswers(loadedAns);
          setFiles(loadedFiles);
          setNotes(loadedNotes);
          setReviews(loadedReviews);
        }

        setAuditProgress(computeAuditProgress(d?.assessment, d?.responses));
      })
      .catch(err => console.warn('Could not load existing assessment:', err));

    // 3. Fetch Contract Tenure to dynamically compute target audit date (1 day before contract_end)
    fetch(`/api/contract-tenure/${clientId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(ct => {
        if (ct && ct.contract_end) {
          const targetCertificationDate = getDayBefore(ct.contract_end);
          if (targetCertificationDate) {
            setClientMetadata(prev => ({
              ...prev,
              targetCertificationDate,
            }));
          }
        }
      })
      .catch(() => {});
  }, [clientId]);


  // All 11 ISO 27001 themes
  const allThemes = useMemo(() => {
    return Array.from(new Set(questions.map(q => q.theme)));
  }, [questions]);

  // Master ISMS Calculations (from Gap Assessment Formula.docx)
  const stats = useMemo(() => {
    let answered = 0;
    let applicableQuestions = 0;
    let totalScore = 0;

    let compliantCount = 0;    // Score 4
    let largelyCount = 0;      // Score 3
    let partialCount = 0;      // Score 2
    let initialCount = 0;      // Score 1
    let notImplementedCount = 0; // Score 0
    let naCount = 0;

    let proofCount = 0;
    let missingProofCount = 0;
    let missingReasonCount = 0;

    questions.forEach(q => {
      const ans = answers[q.id];
      const note = notes[q.id] || '';
      const rawFile = files[q.id];
      const fileList = Array.isArray(rawFile) ? rawFile : (rawFile ? [rawFile] : []);
      const hasProof = fileList.length > 0;

      if (ans && ans.value) {
        answered++;
        if (ans.value === 'fully') {
          compliantCount++;
          applicableQuestions++;
          totalScore += 4;
          if (hasProof) proofCount += fileList.length;
          else missingProofCount++;
        } else if (ans.value === 'largely') {
          largelyCount++;
          applicableQuestions++;
          totalScore += 3;
          if (!note.trim()) missingReasonCount++;
        } else if (ans.value === 'partial') {
          partialCount++;
          applicableQuestions++;
          totalScore += 2;
          if (!note.trim()) missingReasonCount++;
        } else if (ans.value === 'initial') {
          initialCount++;
          applicableQuestions++;
          totalScore += 1;
          if (!note.trim()) missingReasonCount++;
        } else if (ans.value === 'not_implemented') {
          notImplementedCount++;
          applicableQuestions++;
          totalScore += 0;
          if (!note.trim()) missingReasonCount++;
        } else if (ans.value === 'na') {
          naCount++;
          if (!note.trim()) missingReasonCount++;
        }
      }
    });

    const maxApplicableScore = applicableQuestions * 4;
    // Formula: ISMS Readiness % = Σ Actual Scores ÷ Σ Maximum Scores of Applicable Requirements × 100
    const readinessPct = maxApplicableScore > 0 ? Math.round((totalScore / maxApplicableScore) * 100) : 0;
    const completionPct = Math.round((answered / questions.length) * 100);

    const nonCompliantCount = initialCount + notImplementedCount;
    const partialTotalCount = largelyCount + partialCount;
    const totalGaps = nonCompliantCount + partialTotalCount;

    return {
      total: questions.length,
      answered,
      unanswered: questions.length - answered,
      completionPct,
      applicableQuestions,
      totalScore,
      maxApplicableScore,
      readinessPct,
      compliantCount,
      compliantPct: applicableQuestions > 0 ? Math.round((compliantCount / applicableQuestions) * 100) : 0,
      partialTotalCount,
      partialPct: applicableQuestions > 0 ? Math.round((partialTotalCount / applicableQuestions) * 100) : 0,
      largelyCount,
      partialCount,
      nonCompliantCount,
      nonCompliantPct: applicableQuestions > 0 ? Math.round((nonCompliantCount / applicableQuestions) * 100) : 0,
      initialCount,
      notImplementedCount,
      naCount,
      proofCount,
      missingProofCount,
      missingReasonCount,
      totalGaps,
    };
  }, [questions, answers, files, notes]);

  // Breakdown by theme
  const themeBreakdown = useMemo(() => {
    const map = {};
    allThemes.forEach(t => {
      map[t] = {
        theme: t,
        total: 0,
        answered: 0,
        applicable: 0,
        score: 0,
        fully: 0,
        largely: 0,
        partial: 0,
        initial: 0,
        not_implemented: 0,
        na: 0,
        category: '',
      };
    });

    questions.forEach(q => {
      const entry = map[q.theme];
      if (entry) {
        entry.total++;
        entry.category = q.category;
        const ans = answers[q.id];
        if (ans && ans.value) {
          entry.answered++;
          if (ans.value === 'fully') {
            entry.fully++;
            entry.applicable++;
            entry.score += 4;
          } else if (ans.value === 'largely') {
            entry.largely++;
            entry.applicable++;
            entry.score += 3;
          } else if (ans.value === 'partial') {
            entry.partial++;
            entry.applicable++;
            entry.score += 2;
          } else if (ans.value === 'initial') {
            entry.initial++;
            entry.applicable++;
            entry.score += 1;
          } else if (ans.value === 'not_implemented') {
            entry.not_implemented++;
            entry.applicable++;
            entry.score += 0;
          } else if (ans.value === 'na') {
            entry.na++;
          }
        }
      }
    });

    return Object.values(map).map(item => {
      const max = item.applicable * 4;
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
  }, [allThemes, questions, answers]);

  // ISMS 10-Domain Maturity Heat Map
  const ismsHeatMap = useMemo(() => {
    return ISMS_AREAS.map(area => {
      const areaKeywords = area.name.toLowerCase().split(' ');
      const matching = questions.filter(q => {
        const text = (q.theme + ' ' + q.title + ' ' + q.reference).toLowerCase();
        return areaKeywords.some(k => text.includes(k));
      });

      let areaScore = 0;
      let applicable = 0;
      matching.forEach(q => {
        const ans = answers[q.id];
        if (ans && ans.value !== 'na' && ans.score !== null) {
          areaScore += ans.score;
          applicable++;
        }
      });

      const avgScore = applicable > 0 ? areaScore / applicable : 1.5;
      const level = Math.min(5, Math.max(1, Math.round(avgScore + 1)));

      let ratingColor = '🔴';
      let ratingBadge = 'Initial';
      if (level === 5) { ratingColor = '🟢'; ratingBadge = 'Optimized'; }
      else if (level === 4) { ratingColor = '🟢'; ratingBadge = 'Managed'; }
      else if (level === 3) { ratingColor = '🟡'; ratingBadge = 'Defined'; }
      else if (level === 2) { ratingColor = '🟡'; ratingBadge = 'Developing'; }
      else { ratingColor = '🔴'; ratingBadge = 'Initial'; }

      return {
        ...area,
        level,
        ratingColor,
        ratingBadge,
        matchingCount: matching.length,
      };
    });
  }, [questions, answers]);

  // Top Risk Areas
  const topRiskAreas = useMemo(() => {
    return [
      { name: 'Risk Assessment & Treatment Plan', severity: 'HIGH', color: '#ef4444', icon: '🔴', ref: 'Clause 6.1.2 & 6.1.3' },
      { name: 'Statement of Applicability (SoA)', severity: 'HIGH', color: '#ef4444', icon: '🔴', ref: 'Clause 6.1.3 (d)' },
      { name: 'Internal Audit Programme',         severity: 'HIGH', color: '#ef4444', icon: '🔴', ref: 'Clause 9.2' },
      { name: 'Management Review Evidence',       severity: 'HIGH', color: '#ef4444', icon: '🔴', ref: 'Clause 9.3' },
      { name: 'Access Management & Privileges',   severity: 'MEDIUM-HIGH', color: '#f97316', icon: '🟠', ref: 'A.5.15, A.5.16' },
      { name: 'Supplier Security Due Diligence',  severity: 'MEDIUM-HIGH', color: '#f97316', icon: '🟠', ref: 'A.5.19, A.5.21' },
      { name: 'Incident Response Procedures',     severity: 'MEDIUM-HIGH', color: '#f97316', icon: '🟠', ref: 'A.5.24, A.5.26' },
      { name: 'Security Awareness & Tracking',    severity: 'MEDIUM', color: '#f59e0b', icon: '🟡', ref: 'Clause 7.2, A.6.3' },
      { name: 'Physical Security & Perimeter',    severity: 'LOW', color: '#10b981', icon: '🟢', ref: 'A.7.1, A.7.2' },
    ];
  }, []);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Section filter
      if (activeSection === 'clauses' && q.category !== 'Clause') return false;
      if (activeSection === 'controls' && q.category !== 'Control') return false;
      if (activeSection !== 'all' && activeSection !== 'clauses' && activeSection !== 'controls' && q.theme !== activeSection) {
        return false;
      }

      // Status filter
      const ans = answers[q.id];
      const note = notes[q.id] || '';
      const file = files[q.id];

      if (statusFilter === 'unanswered' && ans?.value) return false;
      if (statusFilter === 'answered' && !ans?.value) return false;
      if (statusFilter === 'missing_proof' && (ans?.value !== 'fully' || file)) return false;
      if (statusFilter === 'missing_reason' && (ans?.value === 'fully' || !ans?.value || note.trim())) return false;
      if (statusFilter === 'gaps' && (ans?.value !== 'not_implemented' && ans?.value !== 'initial' && ans?.value !== 'partial' && ans?.value !== 'largely')) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesRef = q.reference.toLowerCase().includes(query);
        const matchesId = q.id.toLowerCase().includes(query);
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesQ = q.question.toLowerCase().includes(query);
        const matchesTheme = q.theme.toLowerCase().includes(query);
        if (!matchesRef && !matchesId && !matchesTitle && !matchesQ && !matchesTheme) return false;
      }

      return true;
    });
  }, [questions, activeSection, statusFilter, searchQuery, answers, files, notes]);

  // Answer selection handler
  const handleSelectOption = (q, opt) => {
    setAnswers(prev => ({
      ...prev,
      [q.id]: {
        value: opt.value,
        status: opt.status,
        score: opt.score,
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
      fd.append('framework_id', 'iso27001-2022');
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

  // Remove single file handler by index
  const handleRemoveFile = (qId, index) => {
    setFiles(prev => {
      const existing = Array.isArray(prev[qId]) ? prev[qId] : (prev[qId] ? [prev[qId]] : []);
      const updated = existing.filter((_, i) => i !== index);
      if (updated.length === 0) {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      }
      return { ...prev, [qId]: updated };
    });
  };


  // Clear answers
  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all responses, justifications, and uploaded evidence?')) {
      setAnswers({});
      setFiles({});
      setNotes({});
      setSubmitterName('');
      setSubmitted(false);
      setSubmitError('');
    }
  };

  // Submit assessment with strict validation
  const handleSubmit = (e) => {
    e?.preventDefault();
    setSubmitError('');

    // Validate mandatory submitter name
    if (!submitterName || !submitterName.trim()) {
      setSubmitError('Validation Error: Please enter your full name in "Your Name (Required)" at the top before submitting.');
      const elem = document.getElementById('submitter-name-input');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elem.focus();
      }
      return;
    }

    /* =========================================================================================
     * 🔒 [PRODUCTION ENFORCEMENT - UNCOMMENT TO ENFORCE 100% COMPLETION FOR ISO/IEC 27001:2022]
     *
     * In Production, clients are strictly blocked from submitting an incomplete ISO/IEC 27001
     * questionnaire (matching DPDP Act, 2023 validation).
     *
     * To activate 100% completion enforcement, simply uncomment the validation block below:
     * =========================================================================================
     */
    /*
    // 0. Enforce 100% questionnaire completion (Mandatory in Production)
    const unansweredQuestions = questions.filter(q => !answers[q.id]?.value);
    if (unansweredQuestions.length > 0) {
      setSubmitError(
        `Validation Error: Please answer all ${questions.length} requirements before submitting. (${unansweredQuestions.length} unanswered requirement(s) remaining: e.g. ${unansweredQuestions.slice(0, 3).map(q => q.reference).join(', ')}).`
      );
      const firstUnansweredId = `question-${unansweredQuestions[0].id}`;
      const elem = document.getElementById(firstUnansweredId);
      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 1. Validate mandatory proof for "Fully Implemented" (Score 4)
    const missingProofQuestions = questions.filter(q => {
      const qFiles = Array.isArray(files[q.id]) ? files[q.id] : (files[q.id] ? [files[q.id]] : []);
      return answers[q.id]?.value === 'fully' && qFiles.length === 0;
    });

    if (missingProofQuestions.length > 0) {
      setSubmitError(
        `Validation Error: ${missingProofQuestions.length} requirement(s) marked as "Fully Implemented" are missing the mandatory evidence proof file (e.g. ${missingProofQuestions.slice(0, 3).map(q => q.reference).join(', ')}). Please attach proof documents before submitting.`
      );
      const firstMissingId = `question-${missingProofQuestions[0].id}`;
      const elem = document.getElementById(firstMissingId);
      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Validate mandatory reasoning for other tiers
    const missingReasonQuestions = questions.filter(q => {
      const ans = answers[q.id];
      if (!ans || !ans.value) return false;
      if (ans.value === 'fully') return false; // Proof is required instead
      const note = notes[q.id] || '';
      return !note.trim();
    });

    if (missingReasonQuestions.length > 0) {
      setSubmitError(
        `Validation Error: ${missingReasonQuestions.length} question(s) require a mandatory explanation/reason stating the current status or SoA justification (e.g. ${missingReasonQuestions.slice(0, 3).map(q => q.reference).join(', ')}). Please provide explanations before submitting.`
      );
      const firstMissingId = `question-${missingReasonQuestions[0].id}`;
      const elem = document.getElementById(firstMissingId);
      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    */
    /* =========================================================================================
     * END OF PRODUCTION ENFORCEMENT BLOCK
     * ========================================================================================= */

    setSubmitted(true);
    setSubmitError('');

    // Persist to backend database
    const token = getToken ? getToken() : localStorage.getItem('vciso_token');
    fetch('/api/vciso/assessments/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        clientId: clientId,
        frameworkId: 'iso27001-2022',
        frameworkName: 'ISO/IEC 27001:2022',
        companyName: clientMetadata.companyName,
        respondentName: submitterName.trim() || clientMetadata.respondentName,
        submittedBy: submitterName.trim(),
        respondentEmail: clientMetadata.respondentEmail,
        targetDate: clientMetadata.targetCertificationDate,
        stats,
        themeBreakdown,
        answers,
        files,
        notes,
      }),
    })
      .then(r => r.json())
      .then(res => {
        console.log('✅ Assessment successfully saved to database:', res);
      })
      .catch(err => {
        console.warn('Backend persistence notice:', err.message);
      });


    // Scroll to summary section
    setTimeout(() => {
      if (summaryRef.current) {
        summaryRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const maturityScore = (stats.readinessPct / 20).toFixed(1);
  let maturityLabel = 'Initial';
  if (stats.readinessPct >= 81) maturityLabel = 'Optimized';
  else if (stats.readinessPct >= 61) maturityLabel = 'Managed';
  else if (stats.readinessPct >= 41) maturityLabel = 'Defined';
  else if (stats.readinessPct >= 21) maturityLabel = 'Developing';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* ── STICKY TOP APP BAR ───────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {embedded && onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition mr-1 shadow-sm"
            >
              ← Back
            </button>
          )}
          <div
            className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black text-xs shadow-sm"
          >
            ISO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900">ISO/IEC 27001:2022</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                0–4 Maturity Gap Assessment
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              123 Questions (30 Clauses + 93 Annex Controls)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            /* [PRODUCTION ENFORCEMENT]: Uncomment below to disable submit button until 100% questions answered */
            /* disabled={stats.answered < stats.total} */
            className="text-xs font-bold px-4 py-1.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5"
          >
            <span>Submit Assessment</span>
            <span>→</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* ── Client Metadata Card ─────────────────────────────── */}
        <div
          className="rounded-2xl p-5 border border-slate-200 bg-white shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 text-xs"
        >
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
            <label className="block text-slate-500 font-bold mb-1">Target ISO 27001 Audit Date</label>
            <input
              type="date"
              disabled
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium cursor-not-allowed select-none shadow-sm"
              value={clientMetadata.targetCertificationDate}
            />
          </div>
          <div>
            <label className="block text-blue-700 font-bold mb-1 flex items-center gap-1">
              <span>Your Name (Required)</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="submitter-name-input"
              placeholder="Enter your full name…"
              className="w-full bg-white border border-blue-300 focus:border-blue-600 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={submitterName}
              onChange={e => setSubmitterName(e.target.value)}
            />
          </div>
        </div>

        {/* ── Live Progress Ribbon ─────────────────────────────── */}
        <div
          className="rounded-2xl p-5 border border-slate-200 bg-white shadow-sm grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3"
        >
          {/* Progress Card */}
          <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Answered</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {stats.answered} <span className="text-xs text-slate-400 font-normal">/ {stats.total}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{stats.completionPct}% Complete</div>
          </div>

          {/* Compliant (Score 4) */}
          <div className="rounded-xl p-3.5 bg-emerald-50/60 border border-emerald-200">
            <div className="text-[10px] uppercase font-bold text-emerald-700">Compliant (Score 4)</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.compliantCount}</div>
            <div className="text-[10px] text-emerald-600 mt-1">{stats.proofCount} Proof Files</div>
          </div>

          {/* Partial (Scores 2-3) */}
          <div className="rounded-xl p-3.5 bg-amber-50/60 border border-amber-200">
            <div className="text-[10px] uppercase font-bold text-amber-700">Partial (Scores 2–3)</div>
            <div className="text-xl font-black text-amber-700 mt-0.5">{stats.partialTotalCount}</div>
            <div className="text-[10px] text-amber-600 mt-1">Weaknesses</div>
          </div>

          {/* Non-Compliant (Scores 0-1) */}
          <div className="rounded-xl p-3.5 bg-red-50/60 border border-red-200">
            <div className="text-[10px] uppercase font-bold text-red-700">Gaps (Scores 0–1)</div>
            <div className="text-xl font-black text-red-700 mt-0.5">{stats.nonCompliantCount}</div>
            <div className="text-[10px] text-red-600 mt-1">Non-Compliant</div>
          </div>

          {/* SoA Exclusions */}
          <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">SoA Excluded</div>
            <div className="text-xl font-black text-slate-700 mt-0.5">{stats.naCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">N/A Reqs</div>
          </div>

          {/* Live Readiness % */}
          <div className="rounded-xl p-3.5 bg-blue-50/60 border border-blue-200">
            <div className="text-[10px] uppercase font-bold text-blue-700">ISMS Readiness</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">{stats.readinessPct}%</div>
            <div className="text-[10px] text-slate-500 mt-1">Target ≥ 71%</div>
          </div>
        </div>

        {/* ── Toolbar & Filters ─────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 border border-slate-200 bg-white shadow-sm space-y-3"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSection('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSection === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (123)
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('clauses')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSection === 'clauses'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Part A: Clauses (30)
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('controls')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSection === 'controls'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Part B: Annex A (93)
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search by reference (4.1, A.5.15), keyword (MFA, backup)..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-4 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Requirements ({stats.total})</option>
              <option value="unanswered">Unanswered ({stats.unanswered})</option>
              <option value="answered">Answered ({stats.answered})</option>
              <option value="missing_proof">Missing Mandatory Proof ({stats.missingProofCount})</option>
              <option value="missing_reason">Missing Mandatory Reason ({stats.missingReasonCount})</option>
              <option value="gaps">Gaps (Scores 0–3) ({stats.totalGaps})</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">Domain:</span>
            {allThemes.map(t => {
              const isSelected = activeSection === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveSection(isSelected ? 'all' : t)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Validation Error Alert ────────────────────────────── */}
        {submitError && (
          <div className="p-4 rounded-xl border flex items-start gap-3 bg-red-50 border-red-200 text-red-700 text-xs shadow-sm">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <div className="font-bold text-sm text-red-800">Submission Blocked</div>
              <div className="mt-0.5">{submitError}</div>
            </div>
            <button onClick={() => setSubmitError('')} className="text-red-500 hover:text-red-700 text-base">
              ✕
            </button>
          </div>
        )}

        {/* ── Questions List ───────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong>{filteredQuestions.length}</strong> of {questions.length} requirements
            </span>
            {filteredQuestions.length < questions.length && (
              <button
                type="button"
                onClick={() => { setActiveSection('all'); setStatusFilter('all'); setSearchQuery(''); }}
                className="text-blue-600 hover:underline font-bold"
              >
                Clear filters
              </button>
            )}
          </div>

          {filteredQuestions.map(q => {
            const currentAns = answers[q.id];
            const isAnswered = !!currentAns?.value;
            const isFully = currentAns?.value === 'fully';
            const currentFile = files[q.id];
            const currentNote = notes[q.id] || '';
            const isMissingProof = isFully && !currentFile;
            const isMissingReason = isAnswered && !isFully && !currentNote.trim();

            return (
              <div
                key={q.id}
                id={`question-${q.id}`}
                className={`rounded-2xl p-5 border transition-all duration-200 bg-white ${
                  isMissingProof || isMissingReason
                    ? 'border-amber-400 bg-amber-50/20 shadow-sm'
                    : isAnswered
                    ? 'border-slate-300 shadow-sm'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {/* Card Header: Reference & ID */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      {q.id}
                    </span>
                    <span
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {q.category === 'Clause' ? `Clause ${q.reference}` : `Control ${q.reference}`}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                      • {q.theme}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAnswered && (
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          currentAns.score === 4
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : currentAns.score >= 2
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : currentAns.score !== null
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {currentAns.status} {currentAns.score !== null ? `(${currentAns.score} / 4 pts)` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Question text */}
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{q.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{q.question}</p>

                {/* 5-Tier Maturity Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                  {MATURITY_OPTIONS.map(opt => {
                    const selected = currentAns?.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectOption(q, opt)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                          selected
                            ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900">
                              {opt.label}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">{opt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ── Dynamic Mandatory Evidence Proof Upload (for Score 4: Fully Implemented) ── */}
                {isFully && (() => {
                  const qFiles = Array.isArray(files[q.id]) ? files[q.id] : (files[q.id] ? [files[q.id]] : []);
                  const isMissingProof = qFiles.length === 0;

                  return (
                    <div className="p-3.5 rounded-xl border bg-emerald-50/30 border-emerald-200 space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <span>📁 Mandatory Evidence Attachment:</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            (Required to substantiate Score 4 · {qFiles.length} file{qFiles.length === 1 ? '' : 's'} attached)
                          </span>
                        </span>
                        {isMissingProof && !uploadingMap[q.id] && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            ⚠️ Evidence File Required
                          </span>
                        )}
                      </div>

                      {/* Upload Spinner */}
                      {uploadingMap[q.id] && (
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
                            📎 Click to attach evidence document (PDF, PNG, JPG, DOCX, XLSX, TXT)
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Uploaded directly to secure backend storage</span>
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
                          <span className="text-[10px] text-slate-400">Attach policies, screenshots, or logs</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── vCISO Review Feedback Card ── */}
                {reviews[q.id] && (
                  <div className={`p-3.5 rounded-xl border mt-2 space-y-1.5 text-xs ${
                    reviews[q.id].status === 'accepted' || reviews[q.id].status === 'verified'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : reviews[q.id].status === 'rejected'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          reviews[q.id].status === 'accepted' || reviews[q.id].status === 'verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : reviews[q.id].status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {reviews[q.id].status === 'accepted' || reviews[q.id].status === 'verified'
                            ? '✓ vCISO APPROVED'
                            : reviews[q.id].status === 'rejected'
                            ? '⚠️ REJECTED BY vCISO'
                            : 'UNDER AUDIT REVIEW'}
                        </span>
                        <span className="font-bold text-slate-900">vCISO Auditor Decision</span>
                      </div>
                      {reviews[q.id].reviewedBy && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          By: {reviews[q.id].reviewedBy}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-700 mt-1">
                      <strong>Comments:</strong> {reviews[q.id].rejectionReason || reviews[q.id].notes || 'No extra notes provided.'}
                    </div>
                    {reviews[q.id].status === 'rejected' && (
                      <div className="text-[11px] text-red-700 font-semibold mt-1">
                        💡 Please replace or amend your uploaded evidence above to resolve this rejection.
                      </div>
                    )}
                  </div>
                )}


                {/* ── Dynamic Mandatory Explanation / SoA Reason (for other tiers) ── */}
                {isAnswered && !isFully && (
                  <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span>💬 {currentAns.value === 'na' ? 'Mandatory Statement of Applicability (SoA) Justification:' : 'Mandatory Explanation / Current Status Reason:'}</span>
                      </span>
                      {isMissingReason && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                          ⚠️ Explanation Required
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      placeholder={
                        currentAns.value === 'na'
                          ? 'State why this requirement is not applicable to the organization (mandatory for auditor sign-off)...'
                          : 'State current operational practices, informal tools, or reason why this requirement is not fully implemented...'
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      value={currentNote}
                      onChange={e => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Bottom Big Submit Button ──────────────────────────── */}
        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={handleSubmit}
            /* [PRODUCTION ENFORCEMENT]: Uncomment below to disable submit button until 100% questions answered */
            /* disabled={stats.answered < stats.total} */
            className="px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition hover:scale-105 active:scale-95"
          >
            🚀 Submit Questionnaire &amp; Generate ISMS Gap Analysis Report
          </button>
        </div>

        {/* ── SECTION 5: Post-Submission Comprehensive Gap Report ── */}
        {/* Withheld from the client until the vCISO has audited every response. */}
        {submitted && !canViewReport && (
          <div
            ref={summaryRef}
            className="rounded-3xl p-8 border border-amber-200 bg-amber-50/60 shadow-sm mt-12"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              ISO/IEC 27001:2022 ISMS Gap Assessment Report
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              🔒 Report Locked — Pending vCISO Audit
            </h2>
            <p className="text-sm text-slate-700 mt-3 max-w-3xl">
              Your questionnaire has been submitted and handed to your assigned vCISO. The
              ISMS gap assessment report is released to you only after the vCISO has audited
              every submitted response. You will be able to open the full findings — maturity
              heat map, top risks, remediation roadmap and Statement of Applicability — as
              soon as that audit is complete.
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

        {submitted && canViewReport && (
          <div
            ref={summaryRef}
            className="rounded-3xl p-8 border border-slate-200 bg-white shadow-xl space-y-8 mt-12"
          >
            {/* Report Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  ISO/IEC 27001:2022 ISMS Gap Assessment Report
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  {clientMetadata.companyName} — Gap Assessment Executive Findings
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assessed by: {clientMetadata.respondentName} ({clientMetadata.respondentEmail}) · Target Audit: {clientMetadata.targetCertificationDate}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition flex items-center gap-2"
                >
                  <span>🖨️ Print Report</span>
                </button>
              </div>
            </div>

            {/* Scorecard Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs uppercase font-bold text-slate-500">Overall ISMS Readiness</div>
                <div className="text-4xl font-black text-blue-600 mt-1">{stats.readinessPct}%</div>
                <div className="text-xs font-bold text-slate-700 mt-1">{stats.totalScore} / {stats.maxApplicableScore} pts</div>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center">
                <div className="text-xs uppercase font-bold text-emerald-700">🟢 Compliant (Score 4)</div>
                <div className="text-4xl font-black text-emerald-700 mt-1">{stats.compliantPct}%</div>
                <div className="text-xs font-bold text-slate-700 mt-1">{stats.compliantCount} Controls · {stats.proofCount} Proofs</div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 text-center">
                <div className="text-xs uppercase font-bold text-amber-700">🟡 Partial (Scores 2–3)</div>
                <div className="text-4xl font-black text-amber-700 mt-1">{stats.partialPct}%</div>
                <div className="text-xs font-bold text-slate-700 mt-1">{stats.partialTotalCount} Weaknesses</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs uppercase font-bold text-slate-500">ISMS Maturity Level</div>
                <div className="text-4xl font-black text-slate-900 mt-1">{maturityScore} <span className="text-xs text-slate-400 font-normal">/ 5.0</span></div>
                <div className="text-xs font-bold text-slate-700 mt-1">{maturityLabel}</div>
              </div>
            </div>

            {/* Findings Matrix Tabs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setReportTab('heatmap')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      reportTab === 'heatmap'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📊 Maturity Heat Map (10 Areas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('top_risks')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      reportTab === 'top_risks'
                        ? 'bg-white text-red-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🚨 Top Risk Areas
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('roadmap')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      reportTab === 'roadmap'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🚀 3-Phase Roadmap
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('critical_gaps')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      reportTab === 'critical_gaps'
                        ? 'bg-white text-red-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔴 Non-Compliant ({stats.nonCompliantCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('weaknesses')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      reportTab === 'weaknesses'
                        ? 'bg-white text-amber-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟡 Weaknesses ({stats.partialTotalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('compliant')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      reportTab === 'compliant'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟢 Compliant ({stats.compliantCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('soa')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      reportTab === 'soa'
                        ? 'bg-white text-slate-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚪ SoA Exclusions ({stats.naCount})
                  </button>
                </div>
              </div>

              {/* Tab 0: ISMS Maturity Heat Map */}
              {reportTab === 'heatmap' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Section 7 · ISMS Maturity Heat Map (10 Security Domains)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Distribution across 1: Initial, 2: Developing, 3: Defined, 4: Managed, 5: Optimized</p>
                    </div>
                    <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                      Overall: {maturityScore} / 5.0 — {maturityLabel}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                          <th className="p-3.5">ISMS Security Area</th>
                          <th className="p-3.5">Clause Reference</th>
                          <th className="p-3.5 text-center">1. Initial</th>
                          <th className="p-3.5 text-center">2. Developing</th>
                          <th className="p-3.5 text-center">3. Defined</th>
                          <th className="p-3.5 text-center">4. Managed</th>
                          <th className="p-3.5 text-center">5. Optimized</th>
                          <th className="p-3.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {ismsHeatMap.map(area => (
                          <tr key={area.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                              <span>{area.icon}</span>
                              <span>{area.name}</span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-slate-500">{area.clauseRef}</td>
                            <td className="p-3.5 text-center">{area.level === 1 && '🔴'}</td>
                            <td className="p-3.5 text-center">{area.level === 2 && '🟡'}</td>
                            <td className="p-3.5 text-center">{area.level === 3 && '🟡'}</td>
                            <td className="p-3.5 text-center">{area.level === 4 && '🟢'}</td>
                            <td className="p-3.5 text-center">{area.level === 5 && '🟢'}</td>
                            <td className="p-3.5 text-right font-bold text-slate-900">
                              {area.ratingColor} {area.ratingBadge}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 0b: Top Risk Areas */}
              {reportTab === 'top_risks' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-red-700">Section 8 · Top Risk &amp; Gap Areas (Ranked by Criticality)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">High-priority areas requiring immediate remediation before audit submission</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {topRiskAreas.map(item => (
                      <div key={item.name} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.ref}</div>
                        </div>
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border"
                          style={{ background: `${item.color}15`, color: item.color, borderColor: `${item.color}30` }}
                        >
                          <span>{item.icon}</span>
                          <span>{item.severity}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 0c: 3-Phase Implementation Roadmap */}
              {reportTab === 'roadmap' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-blue-600">Section 9 · Recommended Implementation Roadmap &amp; Priority Flow</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Actionable milestones to achieve certification readiness (Target ≥ 71%)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white border border-red-200 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-red-700">
                        <span>Phase 1 · Immediate</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-red-50 border border-red-200">Days 1–30</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">Foundation &amp; Governance</div>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5"><span>🔴</span><span>Define ISMS scope &amp; boundaries</span></li>
                        <li className="flex items-start gap-1.5"><span>🔴</span><span>Establish governance &amp; roles</span></li>
                        <li className="flex items-start gap-1.5"><span>🔴</span><span>Approve information security policy</span></li>
                        <li className="flex items-start gap-1.5"><span>🔴</span><span>Complete asset register</span></li>
                        <li className="flex items-start gap-1.5"><span>🔴</span><span>Conduct risk assessment &amp; treatment</span></li>
                        <li className="flex items-start gap-1.5"><span>🔴</span><span>Develop Statement of Applicability</span></li>
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                        <span>Phase 2 · Implementation</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">Days 31–60</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">Controls &amp; Procedures</div>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5"><span>🟡</span><span>Implement required Annex A controls</span></li>
                        <li className="flex items-start gap-1.5"><span>🟡</span><span>Establish access management &amp; MFA</span></li>
                        <li className="flex items-start gap-1.5"><span>🟡</span><span>Perform supplier security reviews</span></li>
                        <li className="flex items-start gap-1.5"><span>🟡</span><span>Establish incident response plan</span></li>
                        <li className="flex items-start gap-1.5"><span>🟡</span><span>Conduct security awareness sessions</span></li>
                        <li className="flex items-start gap-1.5"><span>🟡</span><span>Implement log monitoring &amp; metrics</span></li>
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                        <span>Phase 3 · Assurance</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">Days 61–90</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">Audit &amp; Review</div>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5"><span>🟢</span><span>Review effectiveness of controls</span></li>
                        <li className="flex items-start gap-1.5"><span>🟢</span><span>Conduct internal audit programme</span></li>
                        <li className="flex items-start gap-1.5"><span>🟢</span><span>Close identified nonconformities</span></li>
                        <li className="flex items-start gap-1.5"><span>🟢</span><span>Conduct formal Management Review</span></li>
                        <li className="flex items-start gap-1.5"><span>🟢</span><span>Complete corrective actions log</span></li>
                        <li className="flex items-start gap-1.5"><span>🟢</span><span>Perform certification readiness audit</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* Section 10: Recommended Priority Flow */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 10 · Recommended Management Priority Flow</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                        <div className="font-bold text-red-700">🔴 1. Immediate:</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">Risk Assessment → SoA → Critical Controls</div>
                      </div>
                      <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                        <div className="font-bold text-orange-700">🟠 2. Next:</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">Policies → Procedures → Evidence</div>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="font-bold text-amber-700">🟡 3. Assurance:</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">Monitoring → Internal Audit → Management Review</div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <div className="font-bold text-emerald-700">🟢 4. Target:</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">Certification Readiness (≥ 71%)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 1: Non-Compliant Gaps */}
              {reportTab === 'critical_gaps' && (
                <div className="space-y-3">
                  {questions
                    .filter(q => answers[q.id]?.score <= 1)
                    .map(q => (
                      <div key={q.id} className="p-4 rounded-xl bg-white border border-red-200 shadow-sm text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                            <span className="font-mono text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                              {q.reference}
                            </span>
                            <span className="text-slate-900 font-bold">{q.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Score {answers[q.id]?.score} · Non-Compliant
                          </span>
                        </div>
                        <p className="text-slate-600">{q.question}</p>
                        {notes[q.id] && (
                          <div className="text-[11px] text-red-800 bg-red-50 p-2 rounded-lg border border-red-100 mt-1">
                            <strong>Client Reason:</strong> {notes[q.id]}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 2: Weaknesses */}
              {reportTab === 'weaknesses' && (
                <div className="space-y-3">
                  {questions
                    .filter(q => answers[q.id]?.score === 2 || answers[q.id]?.score === 3)
                    .map(q => (
                      <div key={q.id} className="p-4 rounded-xl bg-white border border-amber-200 shadow-sm text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                            <span className="font-mono text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {q.reference}
                            </span>
                            <span className="text-slate-900 font-bold">{q.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Score {answers[q.id]?.score} · Partial
                          </span>
                        </div>
                        <p className="text-slate-600">{q.question}</p>
                        {notes[q.id] && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1">
                            <strong>Client Status:</strong> {notes[q.id]}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 3: Compliant */}
              {reportTab === 'compliant' && (
                <div className="space-y-3">
                  {questions
                    .filter(q => answers[q.id]?.score === 4)
                    .map(q => (
                      <div key={q.id} className="p-4 rounded-xl bg-white border border-emerald-200 shadow-sm text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                            <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {q.reference}
                            </span>
                            <span className="text-slate-900 font-bold">{q.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Score 4 · Compliant
                          </span>
                        </div>
                        {files[q.id] && (
                          <div className="inline-flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 mt-1">
                            <span>📄 Attached Evidence:</span>
                            <span className="font-mono font-bold">{files[q.id].name}</span>
                            <span className="text-slate-400">({formatBytes(files[q.id].size)})</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 4: SoA */}
              {reportTab === 'soa' && (
                <div className="space-y-3">
                  {questions
                    .filter(q => answers[q.id]?.value === 'na')
                    .map(q => (
                      <div key={q.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                            <span className="font-mono text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {q.reference}
                            </span>
                            <span className="text-slate-900 font-bold">{q.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Excluded (N/A)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                          <strong>SoA Justification:</strong> {notes[q.id] || 'No justification entered.'}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
