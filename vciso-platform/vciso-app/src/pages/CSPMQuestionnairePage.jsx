import React, { useState, useEffect, useMemo, useRef } from 'react';
import cspmData from '../data/cspm_questionnaire.json';
import { useAuth } from '../AuthContext';
import { th } from '../theme';

// Cloud Security Posture Management (CSPM) discovery questionnaire.
//
// Unlike the ISO 27001 and DPDP Act questionnaires — which score each control
// on a PASS / PARTIAL / FAIL / N-A scale — CSPM is a current-state discovery
// exercise: every one of the 60 questions takes a written answer, and every
// one of them is mandatory. The wording of each question is rewritten in the
// vocabulary of the cloud platforms the administrator scoped for the
// organisation during onboarding (AWS, Azure, GCP), so the client is never
// asked about a platform it does not run.

const PROVIDER_META = {
  azure: { id: 'azure', label: 'Azure', name: 'Microsoft Azure' },
  aws: { id: 'aws', label: 'AWS', name: 'Amazon Web Services' },
  gcp: { id: 'gcp', label: 'GCP', name: 'Google Cloud Platform' },
};

const PROVIDER_ORDER = ['aws', 'azure', 'gcp'];
const FALLBACK_PROVIDER = 'azure';

const INK = th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' });
const INK_BODY = th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' });
const INK_MUTED = th('#4A5568', { classic: '#64748B', dark: '#94A3B8' });
const INK_PARA = th('#4A5568', { classic: '#475569', dark: '#A3AEBF' });
const BORDER = th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' });
const BORDER_SUBTLE = th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' });
const SURFACE = th('#FFFFFF', { dark: '#1E293B' });
const BG = th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' });
const CRIMSON = th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' });
const SERIF = "'Source Serif 4', serif";

function normalizeProviders(list) {
  const out = [];
  (Array.isArray(list) ? list : []).forEach(item => {
    const key = String(item || '').trim().toLowerCase();
    let id = null;
    if (key === 'aws' || key.includes('amazon')) id = 'aws';
    else if (key === 'azure' || key.includes('azure') || key.includes('microsoft')) id = 'azure';
    else if (key === 'gcp' || key.includes('google')) id = 'gcp';
    if (id && !out.includes(id)) out.push(id);
  });
  return out.sort((a, b) => PROVIDER_ORDER.indexOf(a) - PROVIDER_ORDER.indexOf(b));
}

// A question stores one wording per platform; pick the one asked for, and fall
// back to the Azure phrasing (the form the source questionnaire was written in)
// if a legacy row is missing a variant.
function questionTextFor(q, providerId) {
  if (!q) return '';
  if (typeof q.question === 'string') return q.question;
  return q.question?.[providerId] || q.question?.[FALLBACK_PROVIDER] || '';
}

function getDayBefore(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  if (isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function CSPMQuestionnairePage({ embedded = false, onBack }) {
  const { user, getToken } = useAuth();
  const clientId = user?.client_id || 'client-001';
  const topRef = useRef(null);

  const questions = useMemo(() => cspmData.questions || [], []);
  const sections = useMemo(() => cspmData.sections || [], []);
  const disclaimer = cspmData.disclaimer || { items: [], acknowledgement: '' };

  const [answers, setAnswers] = useState({});     // { [qId]: string }
  const [files, setFiles] = useState({});         // { [qId]: [fileObj] }
  const [reviews, setReviews] = useState({});     // { [qId]: { status, notes, rejectionReason } }
  const [uploadingMap, setUploadingMap] = useState({});

  const [providers, setProviders] = useState([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);

  const [meta, setMeta] = useState({
    companyName: 'Organization',
    respondentName: user?.name || (user?.email || '').split('@')[0] || '',
    respondentEmail: user?.email || '',
    targetDate: '',
  });

  const [submitterName, setSubmitterName] = useState('');
  const [disclaimersAgreed, setDisclaimersAgreed] = useState(false);
  const [authorizedConfirmed, setAuthorizedConfirmed] = useState(false);
  const [showDisclaimers, setShowDisclaimers] = useState(false);
  const [hasCSPMFramework, setHasCSPMFramework] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unanswered' | 'answered' | 'rejected'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState('');
  const [error, setError] = useState('');

  const authHeaders = () => {
    const token = getToken ? getToken() : localStorage.getItem('vciso_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ── Load cloud scope, organisation details and any saved responses ─────────
  useEffect(() => {
    const headers = authHeaders();
    const get = (url) => fetch(url, { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null);

    Promise.all([
      get(`/api/cloud-selections/${clientId}`),
      get(`/api/company-info/${clientId}`),
      get(`/api/contract-tenure/${clientId}`),
      get(`/api/vciso/assessments/client/${clientId}?frameworkId=cspm`),
      get(`/api/framework-selections/${clientId}`),
    ]).then(([cloud, company, contract, assess, fwSel]) => {
      setProviders(normalizeProviders(cloud?.providers));
      setProvidersLoaded(true);

      if (fwSel && Array.isArray(fwSel.framework_ids) && fwSel.framework_ids.length > 0) {
        setHasCSPMFramework(fwSel.framework_ids.some(f => String(f).toLowerCase().includes('cspm')));
      }

      const target = contract?.contract_end ? getDayBefore(contract.contract_end) : '';
      setMeta(prev => ({
        ...prev,
        companyName: company?.company_name || prev.companyName,
        respondentName: company?.contact_name || prev.respondentName,
        respondentEmail: company?.contact_email || prev.respondentEmail,
        targetDate: target || prev.targetDate,
      }));

      if (assess?.responses?.length) {
        const nextAnswers = {};
        const nextFiles = {};
        const nextReviews = {};
        assess.responses.forEach(r => {
          if (r.response_value) nextAnswers[r.question_id] = r.response_value;
          if (r.proof_files_json) {
            try {
              const parsed = JSON.parse(r.proof_files_json);
              nextFiles[r.question_id] = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              if (r.proof_file_name) {
                nextFiles[r.question_id] = [{ name: r.proof_file_name, size: r.proof_file_size || 0, id: r.proof_file_id || '', url: r.proof_file_url || '' }];
              }
            }
          } else if (r.proof_file_name) {
            nextFiles[r.question_id] = [{
              name: r.proof_file_name,
              size: r.proof_file_size || 0,
              type: r.proof_file_type || '',
              id: r.proof_file_id || '',
              url: r.proof_file_url || `/api/evidence/file/${r.proof_file_name}`,
            }];
          }
          if (r.vciso_review_status) {
            nextReviews[r.question_id] = {
              status: r.vciso_review_status,
              notes: r.vciso_notes || '',
              rejectionReason: r.vciso_rejection_reason || '',
              reviewedBy: r.reviewed_by || '',
              reviewedAt: r.reviewed_at || '',
            };
          }
        });
        setAnswers(nextAnswers);
        setFiles(nextFiles);
        setReviews(nextReviews);
      }

      if (assess?.assessment) {
        const st = assess.assessment.status;
        setSubmitted(['submitted', 'in_review', 'reviewed', 'approved', 'changes_requested'].includes(st));
        const summary = assess.assessment.summary || {};
        if (summary.submittedAt) setSubmittedAt(summary.submittedAt);
        if (summary.disclaimer?.accepted) {
          setDisclaimersAgreed(true);
          setAuthorizedConfirmed(true);
        }
        if (summary.disclaimer?.acceptedBy) setSubmitterName(summary.disclaimer.acceptedBy);
        else if (assess.assessment.respondent_name) setSubmitterName(assess.assessment.respondent_name);
      }
    }).finally(() => setLoading(false));
  }, [clientId]);

  // Platforms actually in scope; an organisation with no recorded scope falls
  // back to the Azure phrasing and is told so explicitly.
  const activeProviders = providers.length > 0 ? providers : [FALLBACK_PROVIDER];
  const scopeMissing = providersLoaded && providers.length === 0;

  const answeredCount = useMemo(
    () => questions.filter(q => (answers[q.id] || '').trim().length > 0).length,
    [questions, answers]
  );
  const completionPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const proofCount = useMemo(
    () => Object.values(files).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0),
    [files]
  );
  const rejectedCount = useMemo(
    () => Object.values(reviews).filter(r => r?.status === 'rejected').length,
    [reviews]
  );

  const sectionBreakdown = useMemo(() => sections.map(sec => {
    const inSection = questions.filter(q => q.part === sec.id);
    const done = inSection.filter(q => (answers[q.id] || '').trim().length > 0).length;
    return {
      group: sec.label,
      section: sec.id,
      name: sec.name,
      total: inSection.length,
      answered: done,
      completionPct: inSection.length > 0 ? Math.round((done / inSection.length) * 100) : 0,
    };
  }), [sections, questions, answers]);

  const filteredQuestions = useMemo(() => questions.filter(q => {
    if (activeSection !== 'all' && q.part !== activeSection) return false;

    const hasAnswer = (answers[q.id] || '').trim().length > 0;
    if (statusFilter === 'answered' && !hasAnswer) return false;
    if (statusFilter === 'unanswered' && hasAnswer) return false;
    if (statusFilter === 'rejected' && reviews[q.id]?.status !== 'rejected') return false;

    if (search.trim()) {
      const needle = search.toLowerCase();
      const haystack = [
        q.id, q.reference, q.title, q.group,
        ...activeProviders.map(p => questionTextFor(q, p)),
      ].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [questions, activeSection, statusFilter, search, answers, reviews, activeProviders]);

  const unansweredQuestions = useMemo(
    () => questions.filter(q => !(answers[q.id] || '').trim()),
    [questions, answers]
  );

  const disclaimerAccepted = disclaimersAgreed && authorizedConfirmed;
  const canSubmit = unansweredQuestions.length === 0 && disclaimersAgreed && authorizedConfirmed && submitterName.trim().length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setError('');
  };

  const handleUpload = async (qId, file) => {
    if (!file) return;
    setUploadingMap(prev => ({ ...prev, [qId]: true }));
    try {
      const q = questions.find(x => x.id === qId);
      const fd = new FormData();
      fd.append('files', file);
      fd.append('client_id', clientId);
      fd.append('framework_id', 'cspm');
      fd.append('question_id', qId);
      if (q) fd.append('requirement_name', q.title || q.reference);

      const res = await fetch('/api/vciso/evidence/upload', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json();
      const record = res.ok && data.file
        ? {
            name: data.file.original_name || file.name,
            size: data.file.size || file.size,
            type: data.file.mimetype || file.type,
            id: data.file.id,
            url: data.file.url,
            download_url: data.file.download_url,
            uploadedAt: new Date().toISOString(),
          }
        : { name: file.name, size: file.size, type: file.type || 'application/octet-stream', uploadedAt: new Date().toISOString() };

      setFiles(prev => {
        const existing = Array.isArray(prev[qId]) ? prev[qId] : (prev[qId] ? [prev[qId]] : []);
        return { ...prev, [qId]: [...existing, record] };
      });
    } catch (err) {
      setError(`Could not attach the document: ${err.message}`);
    } finally {
      setUploadingMap(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleRemoveFile = (qId, index) => {
    setFiles(prev => {
      const existing = Array.isArray(prev[qId]) ? prev[qId] : [];
      const updated = existing.filter((_, i) => i !== index);
      if (updated.length === 0) {
        const next = { ...prev };
        delete next[qId];
        return next;
      }
      return { ...prev, [qId]: updated };
    });
  };

  const scrollToQuestion = (qId) => {
    const el = document.getElementById(`cspm-q-${qId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async () => {
    setError('');

    if (!submitterName.trim()) {
      setError('Please enter your full name before submitting the questionnaire.');
      const el = document.getElementById('cspm-submitter-name');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      return;
    }

    if (unansweredQuestions.length > 0) {
      setError(
        `All ${questions.length} questions are mandatory. ${unansweredQuestions.length} remain unanswered ` +
        `(for example ${unansweredQuestions.slice(0, 3).map(q => q.reference).join(', ')}). ` +
        'Enter "Not Applicable" with a one-line reason, or "Unknown, to be confirmed", if you cannot answer fully.'
      );
      setStatusFilter('unanswered');
      setActiveSection('all');
      scrollToQuestion(unansweredQuestions[0].id);
      return;
    }

    if (!disclaimersAgreed || !authorizedConfirmed) {
      setError('Please agree to the disclaimers and confirm your authorization before submitting.');
      const el = document.getElementById('cspm-disclaimer');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const payloadAnswers = {};
      questions.forEach(q => {
        const value = (answers[q.id] || '').trim();
        payloadAnswers[q.id] = {
          value,
          status: 'ANSWERED',
          score: null,
          reference: q.reference,
          category: 'Discovery',
          theme: q.group,
          title: q.title,
          question: activeProviders.map(p => questionTextFor(q, p)).join(' | '),
        };
      });

      const payload = {
        clientId,
        frameworkId: 'cspm',
        frameworkName: 'CSPM',
        companyName: meta.companyName,
        respondentName: submitterName.trim() || meta.respondentName,
        submittedBy: submitterName.trim(),
        respondentEmail: meta.respondentEmail,
        targetDate: meta.targetDate,
        stats: {
          total: questions.length,
          answered: answeredCount,
          readinessPct: completionPct,
          completionPct,
          passCount: 0,
          partialCount: 0,
          failCount: 0,
          naCount: 0,
          proofCount,
          cloudProviders: activeProviders,
        },
        themeBreakdown: sectionBreakdown,
        answers: payloadAnswers,
        files,
        notes: {},
        disclaimer: {
          accepted: true,
          acceptedBy: submitterName.trim(),
          acceptedAt: new Date().toISOString(),
          title: 'CSPM - Acceptance',
          acknowledgement: disclaimer.acknowledgement || '',
          cloudProviders: activeProviders,
        },
      };

      const res = await fetch('/api/vciso/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setSubmittedAt(new Date().toISOString());
        // Reset rejected reviews in local state so warning banner goes away immediately upon resubmission
        setReviews(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (next[k]?.status === 'rejected') {
              next[k] = { ...next[k], status: 'pending', rejectionReason: '' };
            }
          });
          return next;
        });
        if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
      } else {
        setError(result.error || 'The questionnaire could not be submitted. Please try again.');
      }
    } catch (err) {
      setError(`Network error while submitting: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 48px', background: BG, minHeight: '100%', color: INK_MUTED, fontSize: '13px' }}>
        Loading the cloud security discovery questionnaire…
      </div>
    );
  }

  const scopeLabel = activeProviders.map(p => PROVIDER_META[p].name).join(', ');

  return (
    <div ref={topRef} style={{ background: BG, minHeight: '100%', fontFamily: "'Inter', sans-serif", color: INK_BODY, paddingBottom: '56px' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '24px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            {embedded && onBack && (
              <button onClick={onBack} className="reg-btn-secondary reg-btn-sm" style={{ marginBottom: '12px' }}>
                Back to Client Workspace
              </button>
            )}
            <h1 style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: 600, color: INK, margin: 0, letterSpacing: '-0.01em' }}>
              Cloud Security Posture Assessment
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: INK_PARA, maxWidth: '720px', lineHeight: 1.55 }}>
              Current-state discovery questionnaire. {questions.length} questions, all mandatory.
              Scoped to {scopeLabel}.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: INK_MUTED, fontWeight: 600 }}>
                Organization
              </span>
              <span style={{ fontFamily: SERIF, fontSize: '14px', fontWeight: 600, color: INK }}>{meta.companyName}</span>
              {activeProviders.map(p => (
                <span key={p} style={{ fontSize: '11px', background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: INK, padding: '3px 9px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontWeight: 600, letterSpacing: '0.03em' }}>
                  {PROVIDER_META[p].label}
                </span>
              ))}
              {submitted && <span className="reg-stamp">SUBMITTED</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: INK_MUTED, fontWeight: 700 }}>
                Completion
              </div>
              <div style={{ fontFamily: SERIF, fontSize: '30px', fontWeight: 600, color: completionPct === 100 ? th('#2F6B4F', { dark: '#34D399' }) : CRIMSON, lineHeight: 1.1 }}>
                {completionPct}%
              </div>
              <div style={{ fontSize: '11.5px', color: INK_MUTED }}>{answeredCount} of {questions.length} answered</div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="reg-btn-crimson"
              title={
                !submitterName.trim() ? 'Enter your full name to submit'
                  : unansweredQuestions.length > 0 ? `${unansweredQuestions.length} question(s) still unanswered`
                  : (!disclaimersAgreed || !authorizedConfirmed) ? 'Complete acceptance to submit'
                  : 'Submit the completed questionnaire'
              }
            >
              {submitting ? 'Submitting…' : submitted ? 'Resubmit Questionnaire' : 'Submit Questionnaire'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '18px', height: '4px', background: BORDER_SUBTLE, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${completionPct}%`, height: '100%', background: completionPct === 100 ? '#2F6B4F' : CRIMSON, transition: 'width 0.25s' }} />
        </div>
      </div>

      <div style={{ padding: '26px 48px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {submitted && (
          <div style={{ background: th('#F1F6F2', { dark: '#172033' }), border: `1px solid ${th('#C8DCCC', { dark: '#334155' })}`, borderRadius: '2px', padding: '14px 18px' }}>
            <div style={{ fontFamily: SERIF, fontSize: '15px', fontWeight: 600, color: th('#2F6B4F', { dark: '#34D399' }) }}>
              Questionnaire submitted to your vCISO
            </div>
            <div style={{ fontSize: '12.5px', color: INK_PARA, marginTop: '3px' }}>
              {submittedAt ? `Submitted on ${new Date(submittedAt).toLocaleString()}. ` : ''}
              Your responses and attached documents are now available to the vCISO assigned to your organization.
              You may revise any answer and resubmit while the assessment is still open.
            </div>
          </div>
        )}

        {!hasCSPMFramework && (
          <div className="reg-notice-box">
            <strong>CSPM is not part of this organization&apos;s onboarding.</strong> The framework has not been
            selected for {meta.companyName}, so no cloud security questionnaire has been issued.
          </div>
        )}

        {scopeMissing && (
          <div className="reg-notice-box">
            <strong>Cloud platform scope not recorded.</strong> No cloud platform has been set for your
            organization during onboarding, so the questions below are shown in their Microsoft Azure form.
            Please contact your administrator to confirm the platforms in scope.
          </div>
        )}

        {rejectedCount > 0 && (
          <div style={{ background: '#FBF1EF', border: `1px solid #E4C4BE`, borderRadius: '2px', padding: '14px 18px' }}>
            <div style={{ fontFamily: SERIF, fontSize: '15px', fontWeight: 600, color: CRIMSON }}>
              {rejectedCount} response{rejectedCount !== 1 ? 's' : ''} returned by your vCISO
            </div>
            <div style={{ fontSize: '12.5px', color: INK_PARA, marginTop: '3px' }}>
              Use the filter below to review the vCISO comments and revise those answers before resubmitting.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FBF1EF', border: '1px solid #E4C4BE', borderRadius: '2px', padding: '13px 18px', fontSize: '12.5px', color: CRIMSON, lineHeight: 1.55 }}>
            {error}
          </div>
        )}

        {/* ── Respondent & instructions ───────────────────────────────────── */}
        <div className="reg-doc">
          <div className="reg-doc-head">
            <div>
              <h2 className="reg-title" style={{ fontSize: '19px' }}>Respondent &amp; Completion Guidance</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: INK_MUTED }}>
                Your details are recorded against this submission for audit purposes.
              </p>
            </div>
          </div>
          <div className="reg-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label className="reg-label" htmlFor="cspm-submitter-name">Your Full Name (Required)</label>
                <input
                  id="cspm-submitter-name"
                  className="reg-input"
                  value={submitterName}
                  onChange={(e) => { setSubmitterName(e.target.value); setError(''); }}
                  placeholder="Full name of the person completing this questionnaire"
                />
              </div>
              <div>
                <label className="reg-label">Organization</label>
                <input className="reg-input" value={meta.companyName} readOnly style={{ background: BG }} />
              </div>
              <div>
                <label className="reg-label">Email on Record</label>
                <input className="reg-input" value={meta.respondentEmail || 'Not recorded'} readOnly style={{ background: BG }} />
              </div>
              <div>
                <label className="reg-label">Target Completion Date</label>
                <input className="reg-input" value={meta.targetDate || 'Not set'} readOnly style={{ background: BG }} />
              </div>
            </div>

            <p style={{ color: INK_PARA, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Answer every question based on {meta.companyName}&apos;s current configurations, controls, and operating model.
              All {questions.length} questions are mandatory before submission. Attached policies, architecture diagrams,
              and configuration exports will be stored in your Evidence Locker.
            </p>
          </div>
        </div>

        {/* ── Section selector & summary ──────────────────────────────────── */}
        <div className="reg-doc">
          <div className="reg-doc-head">
            <div>
              <h2 className="reg-title" style={{ fontSize: '19px' }}>Questionnaire Sections</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: INK_MUTED }}>
                Filter by domain or review status below
              </p>
            </div>
            <div className="reg-meta">
              <div className="reg-meta-num">{answeredCount} of {questions.length} completed</div>
            </div>
          </div>

          <div className="reg-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveSection('all')}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${activeSection === 'all' ? th('#C8DCCC', { dark: '#334155' }) : BORDER_SUBTLE}`,
                  background: activeSection === 'all' ? th('#F1F6F2', { dark: '#172033' }) : SURFACE,
                  padding: '12px 14px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: INK }}>All Sections</div>
                <div style={{ fontSize: '11.5px', color: INK_MUTED, marginTop: '2px' }}>
                  {questions.length} questions · {answeredCount} answered
                </div>
              </button>

              {sectionBreakdown.map(sec => {
                const isCurrent = activeSection === sec.section;
                return (
                  <button
                    key={sec.section}
                    type="button"
                    onClick={() => setActiveSection(sec.section)}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${isCurrent ? th('#C8DCCC', { dark: '#334155' }) : BORDER_SUBTLE}`,
                      background: isCurrent ? th('#F1F6F2', { dark: '#172033' }) : SURFACE,
                      padding: '12px 14px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sec.group}
                    </div>
                    <div style={{ fontSize: '11.5px', color: INK_MUTED, marginTop: '2px' }}>
                      {sec.answered}/{sec.total} answered ({sec.completionPct}%)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Filters & search ────────────────────────────────────────────── */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '2px', padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 260px', minWidth: '200px' }}>
            <label className="reg-label">Search questions or answers</label>
            <input
              className="reg-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by clause, topic or wording"
            />
          </div>
          <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
            <label className="reg-label">Section filter</label>
            <select
              className="reg-input"
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
            >
              <option value="all">All sections ({questions.length} questions)</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
            <label className="reg-label">Status filter</label>
            <select
              className="reg-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All ({questions.length})</option>
              <option value="unanswered">Unanswered ({questions.length - answeredCount})</option>
              <option value="answered">Answered ({answeredCount})</option>
              {rejectedCount > 0 && (
                <option value="rejected">Returned by vCISO ({rejectedCount})</option>
              )}
            </select>
          </div>
          {(activeSection !== 'all' || statusFilter !== 'all' || search.trim()) && (
            <button
              className="reg-btn-secondary reg-btn-sm"
              onClick={() => { setActiveSection('all'); setStatusFilter('all'); setSearch(''); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── Questions list ──────────────────────────────────────────────── */}
        <div className="reg-doc">
          <div className="reg-doc-head">
            <div>
              <h2 className="reg-title" style={{ fontSize: '19px' }}>Discovery Questions</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: INK_MUTED }}>
                Showing {filteredQuestions.length} of {questions.length} questions
                {activeProviders.length > 1 && ' · each question is shown in the wording of every platform in scope'}
              </p>
            </div>
          </div>

          <div className="reg-body" style={{ paddingTop: '10px' }}>
            {filteredQuestions.length === 0 ? (
              <p style={{ color: INK_MUTED, fontSize: '13px', padding: '24px 0' }}>
                No questions match the current filters.
              </p>
            ) : (
              filteredQuestions.map((q, idx) => {
                const answer = answers[q.id] || '';
                const fileList = Array.isArray(files[q.id]) ? files[q.id] : (files[q.id] ? [files[q.id]] : []);
                const isUploading = !!uploadingMap[q.id];
                const rev = reviews[q.id];
                const isReturned = rev?.status === 'rejected';
                const isAccepted = rev?.status === 'accepted' || rev?.status === 'verified';
                const number = questions.findIndex(x => x.id === q.id) + 1;

                return (
                  <div
                    key={q.id}
                    id={`cspm-q-${q.id}`}
                    style={{
                      borderTop: idx === 0 ? 'none' : `1px solid ${BORDER_SUBTLE}`,
                      padding: idx === 0 ? '4px 0 28px' : '28px 0',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div className={`reg-num ${answer.trim() ? 'prog' : ''}`} style={{ flexShrink: 0 }}>
                        {number}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span className="reg-row-clause" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{q.reference}</span>
                          <span style={{ fontSize: '11px', color: INK_MUTED }}>{q.group}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: CRIMSON }}>
                            Mandatory
                          </span>
                          {isAccepted && <span className="reg-stamp">ACCEPTED</span>}
                          {isReturned && (
                            <span className="reg-badge-crimson">
                              Returned by vCISO
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '15px', fontFamily: SERIF, fontWeight: 600, color: INK, marginBottom: '8px' }}>
                          {q.title}
                        </div>

                        {activeProviders.map(p => (
                          <div key={p} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                            {activeProviders.length > 1 && (
                              <span style={{
                                flexShrink: 0, marginTop: '2px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                                color: INK, background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), padding: '2px 7px', borderRadius: '2px', minWidth: '46px', textAlign: 'center',
                              }}>
                                {PROVIDER_META[p].label}
                              </span>
                            )}
                            <p style={{ margin: 0, fontSize: '13px', color: INK_BODY, lineHeight: 1.6 }}>
                              {questionTextFor(q, p)}
                            </p>
                          </div>
                        ))}

                        {isReturned && (rev?.rejectionReason || rev?.notes) && (
                          <div style={{ marginTop: '10px', background: '#FBF1EF', border: '1px solid #E4C4BE', borderRadius: '2px', padding: '10px 14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: CRIMSON }}>
                              vCISO Feedback — Revision Requested
                            </div>
                            <div style={{ fontSize: '12.5px', color: INK_BODY, marginTop: '3px', lineHeight: 1.55 }}>
                              {rev.rejectionReason || rev.notes}
                            </div>
                            {rev.reviewedBy && (
                              <div style={{ fontSize: '11px', color: INK_MUTED, marginTop: '4px' }}>
                                From {rev.reviewedBy}{rev.reviewedAt ? ` on ${new Date(rev.reviewedAt).toLocaleDateString()}` : ''}
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ marginTop: '12px' }}>
                          <label className="reg-label" htmlFor={`cspm-input-${q.id}`}>
                            Your Response <span style={{ color: CRIMSON }}>*</span>
                          </label>
                          <textarea
                            id={`cspm-input-${q.id}`}
                            className="reg-textarea"
                            rows={3}
                            value={answer}
                            onChange={(e) => handleAnswer(q.id, e.target.value)}
                            placeholder={`Describe ${meta.companyName}'s posture, architecture, configurations, and tools for this requirement.`}
                          />
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <label className="reg-btn-secondary reg-btn-sm" style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                            {isUploading ? 'Attaching…' : '+ Attach Document / Evidence'}
                            <input
                              type="file"
                              style={{ display: 'none' }}
                              disabled={isUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(q.id, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <span style={{ fontSize: '11.5px', color: INK_MUTED }}>
                            PDF, DOCX, XLSX, PNG, JSON or config exports (optional)
                          </span>
                        </div>

                        {fileList.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {fileList.map((f, i) => (
                              <div
                                key={`${q.id}-file-${i}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  border: `1px solid ${BORDER_SUBTLE}`,
                                  background: BG,
                                  borderRadius: '2px',
                                  padding: '7px 12px',
                                  fontSize: '12px',
                                }}
                              >
                                <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {f.url ? (
                                    <a href={f.url} target="_blank" rel="noreferrer" style={{ color: CRIMSON, textDecoration: 'underline' }}>
                                      {f.name || f.original_name || 'Attached file'}
                                    </a>
                                  ) : (
                                    f.name || f.original_name || 'Attached file'
                                  )}
                                  <span style={{ color: INK_MUTED, marginLeft: '8px' }}>{formatBytes(f.size)}</span>
                                </div>
                                <button
                                  className="reg-btn-secondary reg-btn-sm"
                                  onClick={() => handleRemoveFile(q.id, i)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Acceptance & submission ─────────────────────────────────────── */}
        <div className="reg-doc" id="cspm-disclaimer">
          <div className="reg-doc-head">
            <div>
              <h2 className="reg-title" style={{ fontSize: '19px' }}>CSPM - Acceptance</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: INK_MUTED }}>
                Review and accept the assessment disclaimers and confirm submission authorization.
              </p>
            </div>
            <div className="reg-meta">
              <div className="reg-meta-num">{disclaimersAgreed && authorizedConfirmed ? 'Accepted' : 'Acceptance pending'}</div>
            </div>
          </div>

          <div className="reg-body">
            {unansweredQuestions.length > 0 ? (
              <div className="reg-notice-box">
                <strong>All {questions.length} questions must be answered before the acceptance can be
                completed.</strong> {unansweredQuestions.length} question
                {unansweredQuestions.length !== 1 ? 's remain' : ' remains'} outstanding
                {' '}(for example {unansweredQuestions.slice(0, 3).map(q => q.reference).join(', ')}).
                <div style={{ marginTop: '10px' }}>
                  <button
                    className="reg-btn-secondary reg-btn-sm"
                    onClick={() => { setStatusFilter('unanswered'); setActiveSection('all'); scrollToQuestion(unansweredQuestions[0].id); }}
                  >
                    Go to the first unanswered question
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Checkbox 1: Disclaimers agreement with expandable clauses */}
                <div style={{
                  border: `1px solid ${disclaimersAgreed ? th('#C8DCCC', { dark: '#334155' }) : BORDER}`,
                  background: disclaimersAgreed ? th('#F1F6F2', { dark: '#172033' }) : BG,
                  borderRadius: '2px',
                  padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      id="cspm-agree-disclaimers"
                      checked={disclaimersAgreed}
                      onChange={(e) => { setDisclaimersAgreed(e.target.checked); setError(''); }}
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: CRIMSON, flexShrink: 0, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <label htmlFor="cspm-agree-disclaimers" style={{ fontSize: '12.5px', color: INK_BODY, lineHeight: 1.6, cursor: 'pointer' }}>
                        I have read and agree to the{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDisclaimers(prev => !prev);
                          }}
                          style={{
                            color: CRIMSON,
                            textDecoration: 'underline',
                            fontWeight: 600,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                          }}
                        >
                          disclaimers
                        </button>
                        {' '}<span style={{ fontSize: '11.5px', color: INK_MUTED }}>(click to {showDisclaimers ? 'hide' : 'view clauses'})</span>
                        <span style={{ color: CRIMSON, fontWeight: 700 }}> (Required)</span>
                      </label>
                    </div>
                  </div>

                  {showDisclaimers && (
                    <div style={{
                      marginTop: '14px',
                      paddingTop: '14px',
                      borderTop: `1px solid ${BORDER_SUBTLE}`,
                      maxHeight: '340px',
                      overflowY: 'auto',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: INK_MUTED, marginBottom: '10px' }}>
                        Assessment Disclaimer Clauses ({activeProviders.map(p => PROVIDER_META[p].name).join(', ')})
                      </div>
                      <ol style={{ margin: 0, paddingLeft: '22px', fontSize: '12px', color: INK_PARA, lineHeight: 1.75 }}>
                        {(disclaimer.items || []).map((item, i) => (
                          <li key={i} style={{ marginBottom: '6px' }}>
                            {item.replace(/\{p\}/g, activeProviders.length === 1 ? PROVIDER_META[activeProviders[0]].name : 'the in-scope cloud')}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Checkbox 2: Authorization confirmation */}
                <div style={{
                  border: `1px solid ${authorizedConfirmed ? th('#C8DCCC', { dark: '#334155' }) : BORDER}`,
                  background: authorizedConfirmed ? th('#F1F6F2', { dark: '#172033' }) : BG,
                  borderRadius: '2px',
                  padding: '16px 18px',
                }}>
                  <label htmlFor="cspm-confirm-authorized" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      id="cspm-confirm-authorized"
                      checked={authorizedConfirmed}
                      onChange={(e) => { setAuthorizedConfirmed(e.target.checked); setError(''); }}
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: CRIMSON, flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12.5px', color: INK_BODY, lineHeight: 1.6 }}>
                      {disclaimer.acknowledgement || 'I confirm that I am authorized to submit this questionnaire on behalf of my organization, that the responses provided are accurate and complete to the best of my knowledge, and that I have read, understood and accept the disclaimers set out above.'}
                      <span style={{ color: CRIMSON, fontWeight: 700 }}> (Required)</span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '22px' }}>
              <div style={{ fontSize: '12px', color: INK_MUTED, lineHeight: 1.55 }}>
                {canSubmit
                  ? 'All questions answered and acceptance confirmed. This submission will be stored and made available to your vCISO.'
                  : `Outstanding: ${[
                      !submitterName.trim() && 'your full name',
                      unansweredQuestions.length > 0 && `${unansweredQuestions.length} unanswered question${unansweredQuestions.length !== 1 ? 's' : ''}`,
                      unansweredQuestions.length === 0 && !disclaimersAgreed && 'disclaimers agreement',
                      unansweredQuestions.length === 0 && !authorizedConfirmed && 'authorization confirmation',
                    ].filter(Boolean).join(', ')}.`}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className="reg-btn-crimson"
              >
                {submitting ? 'Submitting…' : submitted ? 'Resubmit Questionnaire' : 'Submit Questionnaire'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
