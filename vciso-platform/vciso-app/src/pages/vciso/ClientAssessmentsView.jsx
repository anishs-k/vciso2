import React, { useState, useEffect, useMemo } from 'react';
import isoQuestionnaireData from '../../data/iso27001_questionnaire.json';
import dpdpQuestionnaireData from '../../data/dpdp_questionnaire.json';
import cspmQuestionnaireData from '../../data/cspm_questionnaire.json';
import { useAuth } from '../../AuthContext';
import { th } from '../../theme';

const THEME_COLORS = {
  'Context of the Organization': '#38bdf8',
  'Leadership': '#a855f7',
  'Planning': '#818cf8',
  'Support': '#34d399',
  'Operation': '#f59e0b',
  'Performance Evaluation': '#ec4899',
  'Improvement': '#06b6d4',
  'A.5 Organizational Controls': '#3b82f6',
  'A.6 People Controls': '#10b981',
  'A.7 Physical Controls': '#f97316',
  'A.8 Technological Controls': '#8b5cf6',
  'Preliminary & Application': '#38bdf8',
  'Obligations of Data Fiduciary': '#a855f7',
  'Rights and Duties of Data Principal': '#34d399',
  'Cross-Border Transfer & Compliance': '#f59e0b',
};

const FRAMEWORKS = [
  { id: 'iso27001-2022', name: 'ISO/IEC 27001:2022', icon: '🛡️', status: 'active', totalQ: 123 },
  { id: 'dpdpa',          name: 'DPDP Act, 2023 & Rules 2025', icon: '🇮🇳', status: 'active', totalQ: 50 },
  { id: 'soc2',           name: 'SOC 2 Type II (Trust Services Criteria)', icon: '🔒', status: 'coming_soon', totalQ: 64 },
  { id: 'nist-csf',       name: 'NIST Cybersecurity Framework 2.0', icon: '🏛️', status: 'coming_soon', totalQ: 106 },
  { id: 'cspm',           name: 'CSPM — Cloud Security Posture Assessment', icon: '☁️', status: 'active', totalQ: 60 },
];

export default function ClientAssessmentsView() {
  const { user, getToken } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [assessmentDetail, setAssessmentDetail] = useState(null);
  const [selectedFramework, setSelectedFramework] = useState('iso27001-2022');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'with_proof' | 'rejected' | 'accepted' | 'pending_review' | 'gaps'
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewState, setReviewState] = useState({}); // { [responseId]: { status, notes, rejectionReason, saving } }
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 1. Fetch submitted assessments strictly for the assigned client organization
  const loadAssessments = async () => {
    setLoading(true);
    try {
      const token = getToken ? getToken() : localStorage.getItem('vciso_token');
      // Fetch vCISO dashboard client details first to ensure tenant isolation
      const dashRes = await fetch('/api/vciso/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const dashData = dashRes.ok ? await dashRes.json() : null;
      const targetClientId = dashData?.client?.id || user?.client_id || null;

      const url = targetClientId
        ? `/api/vciso/assessments?clientId=${targetClientId}`
        : '/api/vciso/assessments';

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const filtered = targetClientId ? data.filter(a => a.client_id === targetClientId) : data;
        setAssessments(filtered);
        if (filtered.length > 0) {
          if (!selectedAssessmentId || !filtered.some(a => a.id === selectedAssessmentId)) {
            setSelectedAssessmentId(filtered[0].id);
          }
        } else {
          setAssessments([]);
          setSelectedAssessmentId(null);
        }
      } else {
        setAssessments([]);
        setSelectedAssessmentId(null);
      }
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  // 2. Fetch full responses for selected assessment
  useEffect(() => {
    if (!selectedAssessmentId) {
      setAssessmentDetail(null);
      return;
    }

    setLoadingDetail(true);
    const token = getToken ? getToken() : localStorage.getItem('vciso_token');
    fetch(`/api/vciso/assessments/${selectedAssessmentId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        setAssessmentDetail(data);
        if (data && Array.isArray(data.responses)) {
          const initReview = {};
          data.responses.forEach(r => {
            initReview[r.id] = {
              status: r.vciso_review_status || 'pending',
              notes: r.vciso_notes || '',
              rejectionReason: r.vciso_rejection_reason || '',
              saving: false,
            };
          });
          setReviewState(initReview);
        }
      })
      .catch(err => console.error('Failed to load assessment detail:', err))
      .finally(() => setLoadingDetail(false));
  }, [selectedAssessmentId]);

  // 3. Save vCISO decision (Accept or Reject with Rejection Reason)
  const handleSaveDecision = async (responseId, status) => {
    const current = reviewState[responseId] || {};
    const effectiveStatus = status || current.status || 'accepted';

    if (effectiveStatus === 'rejected' && !current.rejectionReason?.trim() && !current.notes?.trim()) {
      alert('Please provide a rejection reason / comment explaining why the evidence is unacceptable.');
      return;
    }

    setReviewState(prev => ({
      ...prev,
      [responseId]: { ...prev[responseId], status: effectiveStatus, saving: true },
    }));

    try {
      const token = getToken ? getToken() : localStorage.getItem('vciso_token');
      const res = await fetch(`/api/vciso/assessments/responses/${responseId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reviewStatus: effectiveStatus,
          vcisoNotes: current.notes || current.rejectionReason || '',
          rejectionReason: current.rejectionReason || current.notes || '',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReviewState(prev => ({
          ...prev,
          [responseId]: {
            ...prev[responseId],
            status: data.reviewStatus || effectiveStatus,
            saving: false,
          },
        }));

        setSaveSuccessMsg(`Decision saved: Evidence marked as ${effectiveStatus.toUpperCase()} in the database.`);
        setTimeout(() => setSaveSuccessMsg(''), 3500);

        // Update local assessmentDetail responses array
        if (assessmentDetail?.responses) {
          const updatedResponses = assessmentDetail.responses.map(r =>
            r.id === responseId
              ? {
                  ...r,
                  vciso_review_status: effectiveStatus,
                  vciso_notes: current.notes || current.rejectionReason || '',
                  vciso_rejection_reason: current.rejectionReason || '',
                  reviewed_by: data.reviewedBy || 'vCISO Lead',
                  reviewed_at: data.reviewedAt || new Date().toISOString(),
                }
              : r
          );
          setAssessmentDetail(prev => ({ ...prev, responses: updatedResponses }));
        }
      } else {
        alert(data.error || 'Failed to save review decision');
        setReviewState(prev => ({
          ...prev,
          [responseId]: { ...prev[responseId], saving: false },
        }));
      }
    } catch (err) {
      console.error('Verify error:', err);
      alert('Error saving decision: ' + err.message);
      setReviewState(prev => ({
        ...prev,
        [responseId]: { ...prev[responseId], saving: false },
      }));
    }
  };

  // Questions map from questionnaire json
  const questionsMap = useMemo(() => {
    const map = {};
    const fwId = (assessmentDetail?.framework_id || selectedFramework || '').toLowerCase();
    const isDPDP = fwId.includes('dpdp');
    // CSPM question ids overlap with ISO's (both start at Q001), so the CSPM
    // catalogue has to be chosen explicitly or its answers get labelled with
    // ISO clause titles.
    const isCSPM = fwId.includes('cspm');
    const sourceData = isCSPM ? cspmQuestionnaireData : isDPDP ? dpdpQuestionnaireData : isoQuestionnaireData;
    (sourceData?.questions || []).forEach(q => {
      map[q.id] = q;
    });
    return map;
  }, [assessmentDetail, selectedFramework]);
  // Also needed by the response cards below (it used to exist only inside the memo above).
  const isCSPM = (assessmentDetail?.framework_id || selectedFramework || '').toLowerCase().includes('cspm');

  // CSPM catalogue entries carry one wording per cloud platform, so a question
  // may be an object rather than a string; flatten it before it reaches the
  // search filter or JSX.
  const questionTextOf = (q) => {
    const text = q?.question;
    if (!text) return '';
    if (typeof text === 'string') return text;
    return Object.values(text).filter(Boolean).join(' | ');
  };

  const responsesList = useMemo(() => {
    return assessmentDetail?.responses || [];
  }, [assessmentDetail]);

  // Compute live stats for selected assessment
  const stats = useMemo(() => {
    const total = responsesList.length || 123;
    const answered = responsesList.filter(r => r.response_value).length;
    const withProof = responsesList.filter(r => r.proof_file_name).length;
    const accepted = responsesList.filter(r => r.vciso_review_status === 'accepted' || r.vciso_review_status === 'verified').length;
    const rejected = responsesList.filter(r => r.vciso_review_status === 'rejected').length;
    const pendingReview = responsesList.filter(r => (r.proof_file_name || r.response_value === 'fully') && (!r.vciso_review_status || r.vciso_review_status === 'pending')).length;
    const gaps = responsesList.filter(r => r.response_value === 'initial' || r.response_value === 'not_implemented' || r.response_value === 'partial' || r.response_value === 'no').length;

    return {
      total,
      answered,
      withProof,
      accepted,
      rejected,
      pendingReview,
      gaps,
      readinessPct: assessmentDetail?.readiness_score || 0,
    };
  }, [responsesList, assessmentDetail]);

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responsesList.filter(r => {
      const q = questionsMap[r.question_id] || {};
      const status = r.vciso_review_status || 'pending';

      // Active tab filter
      if (activeFilter === 'with_proof' && !r.proof_file_name) return false;
      if (activeFilter === 'rejected' && status !== 'rejected') return false;
      if (activeFilter === 'accepted' && status !== 'accepted' && status !== 'verified') return false;
      if (activeFilter === 'pending_review' && (status !== 'pending' || !r.proof_file_name)) return false;
      if (activeFilter === 'gaps' && !['initial', 'not_implemented', 'partial', 'no'].includes(r.response_value)) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesRef = (r.reference || '').toLowerCase().includes(query);
        const matchesTitle = (r.title || q.title || '').toLowerCase().includes(query);
        const matchesQ = (r.question || questionTextOf(q)).toLowerCase().includes(query);
        const matchesFile = (r.proof_file_name || '').toLowerCase().includes(query);
        const matchesTheme = (r.theme || q.theme || '').toLowerCase().includes(query);
        if (!matchesRef && !matchesTitle && !matchesQ && !matchesFile && !matchesTheme) return false;
      }

      return true;
    });
  }, [responsesList, activeFilter, searchQuery, questionsMap]);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 pb-12 font-sans bg-slate-50 min-h-full text-slate-900">
      {/* ── Top Header & Live Status Toast ─────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h2 className="text-lg font-bold text-slate-900">Client Assessment & Evidence Audit Console</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Live evidence intake uploaded by onboarded clients. Inspect exact files (PDFs, DOCXs, PNGs), accept or reject each control with mandatory audit justification, and give real-time feedback to the client.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/questionnaire/iso27001"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold px-4 py-2.5 rounded-xl text-white shadow-sm flex items-center gap-2 transition bg-blue-600 hover:bg-blue-700"
          >
            <span>📝 Open Client Questionnaire</span>
            <span>↗</span>
          </a>
          <button
            onClick={() => {
              loadAssessments();
              if (selectedAssessmentId) {
                // reload detail
                setSelectedAssessmentId(selectedAssessmentId);
              }
            }}
            className="p-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-sm"
            title="Refresh from Database"
          >
            🔄 Sync
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── Client Assessment Selector ─────────────────────── */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Client Assessment to Audit:
          </span>
          <span className="text-[11px] text-blue-600 font-bold">
            {assessments.length} client submission(s) found in database
          </span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading assessments from database...</div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <div className="text-xl mb-1">📭</div>
            <div className="font-bold text-slate-900">No Client Assessments Submitted Yet</div>
            <div className="mt-1 text-slate-500">
              When a client logs in and submits their ISO 27001 questionnaire, their responses and uploaded evidence files will appear here automatically.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {assessments.map(a => {
              const isSelected = selectedAssessmentId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAssessmentId(a.id)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {a.company_name || a.client_name || 'Client Organization'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {a.readiness_score || 0}% Score
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Framework: <span className="text-slate-800 font-semibold">{a.framework_name || 'ISO 27001'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                    <span>Respondent: {a.respondent_name || 'Security Lead'}</span>
                    <span>Status: <strong className="text-blue-600">{a.status || 'submitted'}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedAssessmentId && assessmentDetail && (
        <>
          {/* ── Key Metrics Bar ─────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
              <div className="text-xs text-slate-500 font-semibold">Total Controls</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
              <div className="text-xs text-slate-500 font-semibold">Readiness Score</div>
              <div className="text-xl font-extrabold text-blue-600 mt-1">{stats.readinessPct}%</div>
            </div>
            <div 
              onClick={() => setActiveFilter('with_proof')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-blue-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">Evidence Uploaded</div>
              <div className="text-xl font-extrabold text-blue-600 mt-1">{stats.withProof}</div>
            </div>
            <div 
              onClick={() => setActiveFilter('accepted')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-emerald-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">vCISO Approved</div>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">{stats.accepted}</div>
            </div>
            <div 
              onClick={() => setActiveFilter('rejected')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-red-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">Action Required (Rejected)</div>
              <div className="text-xl font-extrabold text-red-600 mt-1">{stats.rejected}</div>
            </div>
            <div 
              onClick={() => setActiveFilter('pending_review')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-amber-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">Pending Audit</div>
              <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.pendingReview}</div>
            </div>
          </div>

          {/* ── Filters & Search ────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  activeFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({responsesList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('with_proof')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  activeFilter === 'with_proof' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📁 With Evidence ({stats.withProof})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  activeFilter === 'rejected' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-red-700 hover:bg-slate-200'
                }`}
              >
                🔴 Rejected ({stats.rejected})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('accepted')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  activeFilter === 'accepted' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-emerald-700 hover:bg-slate-200'
                }`}
              >
                🟢 Approved ({stats.accepted})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('pending_review')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  activeFilter === 'pending_review' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-amber-700 hover:bg-slate-200'
                }`}
              >
                🟡 Pending Audit ({stats.pendingReview})
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search clause (e.g. 4.1, A.5.1)..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ── Responses & Controls Evidence Audit Feed ──────── */}
          {loadingDetail ? (
            <div className="text-center py-16 text-slate-400 text-xs">Loading control responses and evidence proofs...</div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-400">
              No controls matching active filter: <strong>{activeFilter}</strong>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResponses.map(resp => {
                const q = questionsMap[resp.question_id] || {};
                const currentRev = reviewState[resp.id] || { status: resp.vciso_review_status || 'pending', notes: resp.vciso_notes || '', rejectionReason: resp.vciso_rejection_reason || '' };
                const isApproved = currentRev.status === 'accepted' || currentRev.status === 'verified';
                const isRejected = currentRev.status === 'rejected';

                // Evidence Files list (handles single or multi-file proofs)
                let proofFileList = [];
                if (resp.proof_files_json) {
                  try {
                    const parsed = JSON.parse(resp.proof_files_json);
                    proofFileList = Array.isArray(parsed) ? parsed : [parsed];
                  } catch (e) {
                    if (resp.proof_file_name) {
                      proofFileList = [{
                        name: resp.proof_file_name,
                        size: resp.proof_file_size || 0,
                        url: resp.proof_file_url || `/api/evidence/file/${resp.proof_file_name}`,
                        download_url: `/api/evidence/download/${resp.proof_file_id || resp.proof_file_name}`,
                      }];
                    }
                  }
                } else if (resp.proof_file_name) {
                  proofFileList = [{
                    name: resp.proof_file_name,
                    size: resp.proof_file_size || 0,
                    url: resp.proof_file_url || `/api/evidence/file/${resp.proof_file_name}`,
                    download_url: `/api/evidence/download/${resp.proof_file_id || resp.proof_file_name}`,
                  }];
                }

                return (
                  <div
                    key={resp.id || resp.question_id}
                    className={`rounded-2xl p-5 border transition-all ${
                      isRejected
                        ? 'bg-red-50/20 border-red-200 shadow-sm'
                        : isApproved
                        ? 'bg-emerald-50/20 border-emerald-200 shadow-sm'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Control Title & Reference Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-blue-600 font-bold text-xs">{resp.question_id}</span>
                          <span className="font-mono text-slate-800 font-bold text-xs px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {resp.reference}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {resp.title || q.title || resp.reference}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${THEME_COLORS[resp.theme || q.theme] || '#2563EB'}15`,
                              color: THEME_COLORS[resp.theme || q.theme] || th('#2563EB', { dark: '#60A5FA' }),
                            }}
                          >
                            {resp.theme || q.theme}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{resp.question || questionTextOf(q)}</p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${
                          resp.response_value === 'fully' || resp.response_value === 'yes'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : resp.response_value === 'largely'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : resp.response_value === 'partial'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : resp.response_value === 'na'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          Client Claim: {resp.response_value ? resp.response_value.toUpperCase() : 'UNANSWERED'}
                        </span>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${
                          isApproved
                            ? 'bg-emerald-600 text-white'
                            : isRejected
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {isApproved ? '✓ APPROVED' : isRejected ? '🔴 REJECTED' : '🟡 PENDING REVIEW'}
                        </span>
                      </div>
                    </div>

                    {/* Client Notes / Context */}
                    {resp.notes && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-3">
                        <div className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">💬 Client Stated Context / Justification:</div>
                        <div className="text-slate-800">{resp.notes}</div>
                      </div>
                    )}

                    {/* Evidence Attachment Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>📁 Attached Evidence Files:</span>
                          <span className="text-[10px] font-normal text-slate-500">({proofFileList.length} file{proofFileList.length === 1 ? '' : 's'})</span>
                        </span>
                      </div>

                      {proofFileList.length > 0 ? (
                        <div className="space-y-2">
                          {proofFileList.map((pfile, pidx) => {
                            const pName = pfile.name || pfile.original_name || 'Evidence_File';
                            const pUrl = pfile.url || (pfile.filename ? `/api/evidence/file/${pfile.filename}` : null) || (pfile.name ? `/api/evidence/file/${pfile.name}` : null);
                            const pDlUrl = pfile.download_url || `/api/evidence/download/${pfile.id || pName}`;

                            return (
                              <div key={pfile.id || pidx} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs shadow-sm">
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className="text-emerald-600 font-bold">✓</span>
                                  <div>
                                    <span className="font-mono text-xs font-bold text-slate-900 truncate block">{pName}</span>
                                    <span className="text-[10px] text-slate-500">({formatBytes(pfile.size)}) · Stored in backend</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {pUrl && (
                                    <a
                                      href={pUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1"
                                    >
                                      <span>👁️ Preview</span>
                                    </a>
                                  )}
                                  <a
                                    href={pDlUrl}
                                    download
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition flex items-center gap-1"
                                  >
                                    <span>⬇ Download</span>
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                          <span>⚠️</span>
                          <span>No evidence proof file attached for this requirement.</span>
                        </div>
                      )}
                    </div>

                    {/* ── vCISO Audit Decision Panel ── */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <span>⚖️</span> vCISO Audit Determination & Feedback:
                        </span>
                        {resp.reviewed_by && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Last reviewed by: <strong className="text-slate-800">{resp.reviewed_by}</strong> · {resp.reviewed_at ? new Date(resp.reviewed_at).toLocaleDateString() : 'Recent'}
                          </span>
                        )}
                      </div>

                      {/* Rejection / Note Input */}
                      <textarea
                        rows={2}
                        value={currentRev.rejectionReason || currentRev.notes || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setReviewState(prev => ({
                            ...prev,
                            [resp.id]: {
                              ...prev[resp.id],
                              notes: val,
                              rejectionReason: val,
                            },
                          }));
                        }}
                        placeholder="Provide detailed vCISO feedback or mandatory rejection reason (e.g. 'Evidence file lacks signed executive approval, please update Policy Section 4...')"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Action Decision Buttons or Acknowledged Gap Notice */}
                      {(proofFileList.length > 0 || resp.response_value === 'fully' || resp.response_value === 'yes' || isCSPM) ? (
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            {!isCSPM && (
                              <button
                                type="button"
                                disabled={currentRev.saving}
                                onClick={() => handleSaveDecision(resp.id, 'accepted')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                  isApproved
                                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                <span>✓</span>
                                <span>Accept Evidence (🟢)</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={currentRev.saving}
                              onClick={() => handleSaveDecision(resp.id, 'rejected')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                isRejected
                                  ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              }`}
                            >
                              <span>✕</span>
                              <span>{isCSPM ? 'Return to Client (🔴)' : 'Reject Evidence (🔴)'}</span>
                            </button>
                          </div>

                          {currentRev.saving && (
                            <span className="text-xs text-blue-600 font-bold flex items-center gap-1.5">
                              <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                              <span>Saving decision...</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                          <span className="font-bold">⚠️ Acknowledged Compliance Gap:</span>
                          <span>Client reported non-compliance with no evidence attested. No evidence review required.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
