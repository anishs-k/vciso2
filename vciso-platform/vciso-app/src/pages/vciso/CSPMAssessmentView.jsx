import React, { useState, useEffect, useMemo, useCallback } from 'react';
import cspmData from '../../data/cspm_questionnaire.json';
import { useAuth } from '../../AuthContext';
import { th } from '../../theme';

// vCISO review console for the CSPM (Cloud Security Posture Management)
// discovery questionnaire.
//
// The ISO 27001 and DPDP Act questionnaires are scored control-by-control, so
// their review surfaces show PASS / PARTIAL / FAIL roll-ups. CSPM instead
// captures 60 written current-state answers, so this view is built around
// reading each answer against the question that was actually asked, inspecting
// any attached document, and accepting or returning it to the client.

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
const GREEN = th('#2F6B4F', { dark: '#34D399' });
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

function questionTextFor(q, providerId) {
  if (!q) return '';
  if (typeof q.question === 'string') return q.question;
  return q.question?.[providerId] || q.question?.[FALLBACK_PROVIDER] || '';
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function proofsOf(response, evidenceMap) {
  const list = [];
  if (response?.proof_files_json) {
    try {
      const parsed = typeof response.proof_files_json === 'string'
        ? JSON.parse(response.proof_files_json)
        : response.proof_files_json;
      if (Array.isArray(parsed)) list.push(...parsed);
    } catch { /* fall through to the single-file columns */ }
  }
  if (list.length === 0 && response?.proof_file_name) {
    list.push({
      name: response.proof_file_name,
      size: response.proof_file_size || 0,
      id: response.proof_file_id || '',
      url: response.proof_file_url || `/api/evidence/file/${response.proof_file_name}`,
    });
  }
  (evidenceMap[response?.question_id] || []).forEach(ev => {
    const name = ev.original_name || ev.filename;
    if (!list.some(f => (f.name || f.filename || f.original_name) === name)) {
      list.push({ name, size: ev.size, id: ev.id, url: ev.url || `/api/evidence/file/${ev.filename}` });
    }
  });
  return list;
}

export default function CSPMAssessmentView() {
  const { user, getToken } = useAuth();

  const questions = useMemo(() => cspmData.questions || [], []);
  const sections = useMemo(() => cspmData.sections || [], []);
  const questionMap = useMemo(() => {
    const map = {};
    questions.forEach(q => { map[q.id] = q; });
    return map;
  }, [questions]);

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [responses, setResponses] = useState([]);
  const [providers, setProviders] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [hasCSPM, setHasCSPM] = useState(true);

  const [reviewState, setReviewState] = useState({}); // { [responseId]: { status, comment, saving } }
  const [activeSection, setActiveSection] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | accepted | rejected | with_proof
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const authHeaders = useCallback(() => {
    const token = getToken ? getToken() : localStorage.getItem('vciso_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/vciso/vcisomainpage/data${user?.client_id ? `?clientId=${encodeURIComponent(user.client_id)}` : ''}`;
      const res = await fetch(url, { headers: authHeaders() });
      const data = res.ok ? await res.json() : null;
      if (data) {
        setClient(data.client || null);
        setAssessment(data.cspmAssessment || null);
        setResponses(Array.isArray(data.cspmResponses) ? data.cspmResponses : []);
        setProviders(normalizeProviders(data.cloudProviders));
        setEvidences(Array.isArray(data.evidences) ? data.evidences : []);
        setHasCSPM(
          (Array.isArray(data.frameworkSelections) ? data.frameworkSelections : [])
            .some(f => String(f).toLowerCase().includes('cspm'))
        );

        const init = {};
        (data.cspmResponses || []).forEach(r => {
          init[r.id] = {
            status: r.vciso_review_status || 'pending',
            comment: r.vciso_rejection_reason || r.vciso_notes || '',
            saving: false,
          };
        });
        setReviewState(init);
      }
    } catch (err) {
      console.error('Failed to load the CSPM assessment:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, user?.client_id]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeProviders = providers.length > 0 ? providers : [FALLBACK_PROVIDER];

  const responseByQuestion = useMemo(() => {
    const map = {};
    responses.forEach(r => { if (r.question_id) map[r.question_id] = r; });
    return map;
  }, [responses]);

  const evidenceMap = useMemo(() => {
    const map = {};
    evidences
      .filter(e => String(e.framework_id || '').toLowerCase().includes('cspm'))
      .forEach(e => {
        const key = e.question_id || e.control_id;
        if (!key) return;
        if (!map[key]) map[key] = [];
        map[key].push(e);
      });
    return map;
  }, [evidences]);

  const stats = useMemo(() => {
    let answered = 0;
    let withProof = 0;
    let commented = 0;
    let rejected = 0;
    let pending = 0;

    questions.forEach(q => {
      const r = responseByQuestion[q.id];
      if (r && String(r.response_value || '').trim()) answered++;
      if (r && proofsOf(r, evidenceMap).length > 0) withProof++;
      const status = reviewState[r?.id]?.status || r?.vciso_review_status || 'pending';
      const comment = (reviewState[r?.id]?.comment ?? r?.vciso_notes ?? '').trim();
      if (comment) commented++;
      if (!r) return;
      if (status === 'rejected') rejected++;
      else pending++;
    });

    return {
      total: questions.length,
      answered,
      withProof,
      commented,
      rejected,
      pending,
      completionPct: questions.length ? Math.round((answered / questions.length) * 100) : 0,
    };
  }, [questions, responseByQuestion, evidenceMap, reviewState]);

  const sectionBreakdown = useMemo(() => sections.map(sec => {
    const inSection = questions.filter(q => q.part === sec.id);
    let answered = 0;
    let returned = 0;
    inSection.forEach(q => {
      const r = responseByQuestion[q.id];
      if (r && String(r.response_value || '').trim()) answered++;
      const status = reviewState[r?.id]?.status || r?.vciso_review_status;
      if (status === 'rejected') returned++;
    });
    return { id: sec.id, label: sec.label, total: inSection.length, answered, returned };
  }), [sections, questions, responseByQuestion, reviewState]);

  const filteredQuestions = useMemo(() => questions.filter(q => {
    if (activeSection !== 'all' && q.part !== activeSection) return false;

    const r = responseByQuestion[q.id];
    const status = reviewState[r?.id]?.status || r?.vciso_review_status || 'pending';
    const comment = (reviewState[r?.id]?.comment ?? r?.vciso_notes ?? '').trim();

    if (statusFilter === 'pending' && (!r || status === 'rejected')) return false;
    if (statusFilter === 'rejected' && status !== 'rejected') return false;
    if (statusFilter === 'commented' && !comment) return false;
    if (statusFilter === 'with_proof' && (!r || proofsOf(r, evidenceMap).length === 0)) return false;

    if (search.trim()) {
      const needle = search.toLowerCase();
      const haystack = [
        q.id, q.reference, q.title, q.group,
        r?.response_value || '',
        comment,
        ...activeProviders.map(p => questionTextFor(q, p)),
      ].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [questions, activeSection, statusFilter, search, responseByQuestion, reviewState, evidenceMap, activeProviders]);

  const setReviewField = (responseId, patch) => {
    setReviewState(prev => ({ ...prev, [responseId]: { ...(prev[responseId] || {}), ...patch } }));
  };

  const returnToClient = async (response) => {
    if (!response?.id) return;
    const current = reviewState[response.id] || {};
    const comment = (current.comment ?? response.vciso_notes ?? '').trim();

    if (!comment) {
      setToast('Please record why the response is being returned before returning to client.');
      setTimeout(() => setToast(''), 4000);
      return;
    }

    setReviewField(response.id, { saving: true });
    try {
      const res = await fetch(`/api/vciso/assessments/responses/${response.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          assessmentId: response.assessment_id,
          questionId: response.question_id,
          reviewStatus: 'rejected',
          vcisoNotes: comment,
          rejectionReason: comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The response could not be returned.');

      setReviewField(response.id, { status: 'rejected', saving: false });
      setResponses(prev => prev.map(r => (
        r.id === response.id
          ? {
              ...r,
              vciso_review_status: 'rejected',
              vciso_notes: comment,
              vciso_rejection_reason: comment,
              reviewed_by: data.reviewedBy || user?.name || 'vCISO',
              reviewed_at: data.reviewedAt || new Date().toISOString(),
            }
          : r
      )));
      setToast(`${response.question_id} returned to the client.`);
      setTimeout(() => setToast(''), 3500);
    } catch (err) {
      setReviewField(response.id, { saving: false });
      setToast(err.message);
      setTimeout(() => setToast(''), 4500);
    }
  };

  const orgName = client?.name || 'Organization';
  const scopeLabel = activeProviders.map(p => PROVIDER_META[p].name).join(', ');
  const disclaimer = assessment?.summary?.disclaimer || null;

  if (loading) {
    return (
      <div style={{ padding: '60px 48px', background: BG, minHeight: '100%', color: INK_MUTED, fontSize: '13px' }}>
        Loading the cloud security posture assessment…
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100%', fontFamily: "'Inter', sans-serif", color: INK_BODY, paddingBottom: '56px' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '24px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: 600, color: INK, margin: 0, letterSpacing: '-0.01em' }}>
              CSPM — Cloud Security Posture Assessment
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: INK_PARA, maxWidth: '760px', lineHeight: 1.55 }}>
              Client discovery responses for {orgName}. {questions.length} mandatory questions scoped to {scopeLabel}.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
              {activeProviders.map(p => (
                <span key={p} style={{ fontSize: '11px', background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), color: INK, padding: '3px 9px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontWeight: 600, letterSpacing: '0.03em' }}>
                  {PROVIDER_META[p].label}
                </span>
              ))}
              {assessment && <span className="reg-stamp">{String(assessment.status || 'submitted').toUpperCase()}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: INK_MUTED, fontWeight: 700 }}>Client completion</div>
              <div style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 600, color: stats.completionPct === 100 ? GREEN : CRIMSON, lineHeight: 1.1 }}>
                {stats.completionPct}%
              </div>
              <div style={{ fontSize: '11.5px', color: INK_MUTED }}>{stats.answered} of {stats.total} answered</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: INK_MUTED, fontWeight: 700 }}>Assessment Status</div>
              <div style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 600, color: stats.rejected > 0 ? CRIMSON : INK, lineHeight: 1.1 }}>
                {stats.rejected > 0 ? `${stats.rejected} Returned` : 'Information Gathering'}
              </div>
              <div style={{ fontSize: '11.5px', color: INK_MUTED }}>{stats.commented} commented · {stats.withProof} with proof</div>
            </div>
            <button className="reg-btn-secondary reg-btn-sm" onClick={loadData}>Refresh</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '26px 48px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {toast && (
          <div style={{ background: th('#F1F6F2', { dark: '#172033' }), border: `1px solid ${th('#C8DCCC', { dark: '#334155' })}`, borderRadius: '2px', padding: '12px 18px', fontSize: '12.5px', color: GREEN }}>
            {toast}
          </div>
        )}

        {!hasCSPM && (
          <div className="reg-notice-box">
            <strong>CSPM is not part of this organization&apos;s onboarding.</strong> The framework has not been
            selected for {orgName}, so no cloud security questionnaire has been issued.
          </div>
        )}

        {!assessment ? (
          <div className="reg-doc">
            <div className="reg-doc-head">
              <div>
                <h2 className="reg-title" style={{ fontSize: '19px' }}>Awaiting Client Submission</h2>
              </div>
            </div>
            <div className="reg-body">
              <p style={{ color: INK_PARA, fontSize: '13px', lineHeight: 1.6 }}>
                {orgName} has not yet submitted the {questions.length}-question cloud security discovery
                questionnaire. Once the client completes every question, acknowledges the assessment
                acceptance and submits, the responses and any attached documents appear here for review.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Submission record ───────────────────────────────────────── */}
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h2 className="reg-title" style={{ fontSize: '19px' }}>Submission Record</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: INK_MUTED }}>
                    Recorded against the organization at the time of submission
                  </p>
                </div>
              </div>
              <div className="reg-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px' }}>
                  <div>
                    <div className="reg-label">Organization</div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{assessment.company_name || orgName}</div>
                  </div>
                  <div>
                    <div className="reg-label">Submitted by</div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{assessment.respondent_name || 'Not recorded'}</div>
                  </div>
                  <div>
                    <div className="reg-label">Contact email</div>
                    <div style={{ fontSize: '13px' }}>{assessment.respondent_email || 'Not recorded'}</div>
                  </div>
                  <div>
                    <div className="reg-label">Last updated</div>
                    <div style={{ fontSize: '13px' }}>
                      {assessment.updated_at ? new Date(assessment.updated_at).toLocaleString() : 'Not recorded'}
                    </div>
                  </div>
                  <div>
                    <div className="reg-label">Cloud platforms in scope</div>
                    <div style={{ fontSize: '13px' }}>{scopeLabel}</div>
                  </div>
                  <div>
                    <div className="reg-label">Documents attached</div>
                    <div style={{ fontSize: '13px' }}>{stats.withProof} of {stats.total} questions</div>
                  </div>
                </div>

                <div style={{
                  marginTop: '18px',
                  border: `1px solid ${disclaimer?.accepted ? th('#C8DCCC', { dark: '#334155' }) : BORDER}`,
                  background: disclaimer?.accepted ? th('#F1F6F2', { dark: '#172033' }) : BG,
                  borderRadius: '2px',
                  padding: '13px 17px',
                }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: disclaimer?.accepted ? GREEN : INK_MUTED }}>
                    CSPM - Acceptance
                  </div>
                  <div style={{ fontSize: '12.5px', color: INK_PARA, marginTop: '4px', lineHeight: 1.55 }}>
                    {disclaimer?.accepted
                      ? `Accepted by ${disclaimer.acceptedBy || assessment.respondent_name || 'the client'}${disclaimer.acceptedAt ? ` on ${new Date(disclaimer.acceptedAt).toLocaleString()}` : ''}.`
                      : 'No acceptance acknowledgement recorded for this submission.'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section breakdown ───────────────────────────────────────── */}
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h2 className="reg-title" style={{ fontSize: '19px' }}>Discovery Coverage by Section</h2>
                </div>
                <div className="reg-meta">
                  <div className="reg-meta-num">{stats.answered} of {stats.total} answered</div>
                </div>
              </div>
              <div className="reg-body" style={{ paddingTop: '8px' }}>
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th style={{ width: '58%' }}>Section</th>
                      <th style={{ width: '14%' }}>Questions</th>
                      <th style={{ width: '14%' }}>Answered</th>
                      <th style={{ width: '14%' }}>Returned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionBreakdown.map(sec => (
                      <tr key={sec.id} style={{ cursor: 'pointer' }} onClick={() => { setActiveSection(sec.id); setStatusFilter('all'); }}>
                        <td style={{ fontWeight: 500 }}>{sec.label}</td>
                        <td>{sec.total}</td>
                        <td>{sec.answered}</td>
                        <td>{sec.returned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Filters ─────────────────────────────────────────────────── */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '2px', padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 260px', minWidth: '200px' }}>
                <label className="reg-label">Search</label>
                <input className="reg-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions, responses, or vCISO comments" />
              </div>
              <div style={{ flex: '1 1 260px', minWidth: '200px' }}>
                <label className="reg-label">Section</label>
                <select className="reg-input" value={activeSection} onChange={(e) => setActiveSection(e.target.value)}>
                  <option value="all">All sections ({questions.length} questions)</option>
                  {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.label}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 1 230px', minWidth: '190px' }}>
                <label className="reg-label">Review status</label>
                <select className="reg-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All ({questions.length})</option>
                  <option value="pending">Pending review ({stats.pending})</option>
                  <option value="commented">Commented ({stats.commented})</option>
                  <option value="rejected">Returned to client ({stats.rejected})</option>
                  <option value="with_proof">With attached document ({stats.withProof})</option>
                </select>
              </div>
              {(activeSection !== 'all' || statusFilter !== 'all' || search.trim()) && (
                <button className="reg-btn-secondary reg-btn-sm" onClick={() => { setActiveSection('all'); setStatusFilter('all'); setSearch(''); }}>
                  Clear filters
                </button>
              )}
            </div>

            {/* ── Responses ───────────────────────────────────────────────── */}
            <div className="reg-doc">
              <div className="reg-doc-head">
                <div>
                  <h2 className="reg-title" style={{ fontSize: '19px' }}>Client Responses</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: INK_MUTED }}>
                    Showing {filteredQuestions.length} of {questions.length} questions
                  </p>
                </div>
              </div>

              <div className="reg-body" style={{ paddingTop: '10px' }}>
                {filteredQuestions.length === 0 ? (
                  <p style={{ color: INK_MUTED, fontSize: '13px', padding: '24px 0' }}>
                    No questions match the current filters.
                  </p>
                ) : filteredQuestions.map((q, idx) => {
                  const response = responseByQuestion[q.id];
                  const answer = String(response?.response_value || '').trim();
                  const proofs = response ? proofsOf(response, evidenceMap) : [];
                  const local = reviewState[response?.id] || {};
                  const status = local.status || response?.vciso_review_status || 'pending';
                  const isRejected = status === 'rejected';
                  const commentText = (local.comment ?? response?.vciso_notes ?? '').trim();
                  const number = questions.findIndex(x => x.id === q.id) + 1;

                  return (
                    <div
                      key={q.id}
                      id={`cspm-review-${q.id}`}
                      style={{
                        borderTop: idx === 0 ? 'none' : `1px solid ${BORDER_SUBTLE}`,
                        padding: idx === 0 ? '4px 0 24px' : '24px 0',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div className={`reg-num ${isRejected ? 'prog' : answer ? 'prog' : ''}`} style={{ flexShrink: 0 }}>
                          {number}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span className="reg-row-clause" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{q.reference}</span>
                            <span style={{ fontSize: '11px', color: INK_MUTED }}>{q.group}</span>
                            {isRejected && <span className="reg-badge-crimson">RETURNED</span>}
                            {commentText && !isRejected && (
                              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: th('#065F46', { dark: '#34D399' }), background: th('#D1FAE5', { dark: '#0B2E24' }), padding: '1px 6px', borderRadius: '2px' }}>
                                Commented
                              </span>
                            )}
                            {!isRejected && answer && !commentText && (
                              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: INK_MUTED, border: `1px solid ${BORDER}`, padding: '1px 6px', borderRadius: '2px' }}>
                                Information Received
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '15px', fontFamily: SERIF, fontWeight: 600, color: INK, marginBottom: '8px' }}>
                            {q.title}
                          </div>

                          {activeProviders.map(p => (
                            <div key={p} style={{ display: 'flex', gap: '10px', marginBottom: '7px', alignItems: 'flex-start' }}>
                              {activeProviders.length > 1 && (
                                <span style={{
                                  flexShrink: 0, marginTop: '2px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                                  color: INK, background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), padding: '2px 7px', borderRadius: '2px', minWidth: '46px', textAlign: 'center',
                                }}>
                                  {PROVIDER_META[p].label}
                                </span>
                              )}
                              <p style={{ margin: 0, fontSize: '12.5px', color: INK_MUTED, lineHeight: 1.6 }}>
                                {questionTextFor(q, p)}
                              </p>
                            </div>
                          ))}

                          {/* Client answer */}
                          <div style={{ marginTop: '12px', border: `1px solid ${BORDER_SUBTLE}`, background: BG, borderRadius: '2px', padding: '13px 16px' }}>
                            <div className="reg-label" style={{ marginBottom: '5px' }}>Client response</div>
                            <div style={{ fontSize: '13px', color: answer ? INK_BODY : INK_MUTED, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                              {answer || 'No response recorded for this question.'}
                            </div>
                          </div>

                          {/* Attached documents */}
                          {proofs.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                              <div className="reg-label" style={{ marginBottom: '5px' }}>Attached documents</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {proofs.map((f, i) => (
                                  <div key={`${q.id}-p-${i}`} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    border: `1px solid ${BORDER_SUBTLE}`, background: SURFACE, borderRadius: '2px', padding: '7px 11px',
                                  }}>
                                    <span style={{ fontSize: '12px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {f.url ? (
                                        <a href={f.url} target="_blank" rel="noreferrer" style={{ color: CRIMSON, textDecoration: 'underline' }}>
                                          {f.name || f.original_name || 'Attached document'}
                                        </a>
                                      ) : (f.name || f.original_name || 'Attached document')}
                                    </span>
                                    {f.size ? <span style={{ fontSize: '11px', color: INK_MUTED }}>{formatBytes(f.size)}</span> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Review controls */}
                          {response && (
                            <div style={{ marginTop: '14px', borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: '13px' }}>
                              <label className="reg-label" htmlFor={`cspm-comment-${q.id}`}>
                                vCISO comment {isRejected ? '(required when returning a response)' : '(optional)'}
                              </label>
                              <textarea
                                id={`cspm-comment-${q.id}`}
                                className="reg-textarea"
                                rows={2}
                                value={local.comment ?? response.vciso_notes ?? ''}
                                onChange={(e) => setReviewField(response.id, { comment: e.target.value })}
                                placeholder="Record the assessment note, the follow-up required, or why this response is being returned."
                              />
                              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                  className="reg-btn-crimson reg-btn-sm"
                                  disabled={local.saving}
                                  onClick={() => returnToClient(response)}
                                >
                                  {local.saving ? 'Returning…' : 'Return to client'}
                                </button>
                                {response.reviewed_by && (
                                  <span style={{ fontSize: '11.5px', color: INK_MUTED }}>
                                    Last commented/reviewed by {response.reviewed_by}
                                    {response.reviewed_at ? ` on ${new Date(response.reviewed_at).toLocaleDateString()}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
