import React, { useState, useMemo } from 'react';
import dpdpData from '../../data/dpdp_questionnaire.json';
import { th } from '../../theme';

export default function DPDPActView({
  client = {},
  dpdpAssessment = null,
  dpdpResponses = [],
  evidences = [],
  onReviewEvidence,
  onDeleteEvidence,
  onOpenUpload,
  masterTypes = [],
  activeNav = 'implementation',
  setActiveNav
}) {
  const [activeGroupFilter, setActiveGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [rejectionModal, setRejectionModal] = useState({ open: false, responseId: null, questionId: null, currentReason: '' });
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const questions = useMemo(() => dpdpData.questions || [], []);

  // Map responses by question_id or reference
  const responseMap = useMemo(() => {
    const map = {};
    (dpdpResponses || []).forEach(r => {
      if (r.question_id) map[r.question_id] = r;
      if (r.reference) map[r.reference] = r;
    });
    return map;
  }, [dpdpResponses]);

  // Map evidences by target / question_id / reference
  const evidenceMap = useMemo(() => {
    const map = {};
    (evidences || []).forEach(e => {
      const target = e.question_id || e.control_id;
      if (target) {
        if (!map[target]) map[target] = [];
        map[target].push(e);
      }
    });
    return map;
  }, [evidences]);

  // Statistics calculation
  const stats = useMemo(() => {
    let passCount = 0;
    let partialCount = 0;
    let failCount = 0;
    let naCount = 0;
    let proofCount = 0;
    let maxPenaltyRiskCr = 0;

    questions.forEach(q => {
      const resp = responseMap[q.id] || responseMap[q.reference];
      const val = resp?.response_value || resp?.status || '';
      const upperVal = String(val).toUpperCase();

      if (upperVal === 'YES' || upperVal === 'PASS' || upperVal === 'FULLY') passCount++;
      else if (upperVal === 'PARTIAL' || upperVal === 'LARGELY') partialCount++;
      else if (upperVal === 'NO' || upperVal === 'FAIL') {
        failCount++;
        if (q.penalty_exposure?.includes('250 crore')) maxPenaltyRiskCr += 250;
        else if (q.penalty_exposure?.includes('200 crore')) maxPenaltyRiskCr += 200;
        else if (q.penalty_exposure?.includes('150 crore')) maxPenaltyRiskCr += 150;
        else if (q.penalty_exposure?.includes('50 crore')) maxPenaltyRiskCr += 50;
      } else if (upperVal === 'NA' || upperVal === 'N/A') naCount++;

      const proofs = evidenceMap[q.id] || evidenceMap[q.reference] || [];
      if (proofs.length > 0 || resp?.proof_file_name) proofCount++;
    });

    const totalAnswered = passCount + partialCount + failCount;
    const readinessScore = totalAnswered > 0
      ? Math.round(((passCount * 2 + partialCount * 1) / (totalAnswered * 2)) * 100)
      : (dpdpAssessment?.readiness_score || 0);

    return {
      total: questions.length,
      passCount,
      partialCount,
      failCount,
      naCount,
      proofCount,
      readinessScore,
      maxPenaltyRiskCr,
    };
  }, [questions, responseMap, evidenceMap, dpdpAssessment]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const resp = responseMap[q.id] || responseMap[q.reference];
      const val = String(resp?.response_value || resp?.status || '').toUpperCase();

      // Group filter
      if (activeGroupFilter !== 'all') {
        if (activeGroupFilter === 'act' && q.part !== 'Act') return false;
        if (activeGroupFilter === 'rules' && q.part !== 'Rules') return false;
        if (activeGroupFilter === 'high_penalty' && !q.penalty_exposure?.includes('250') && !q.penalty_exposure?.includes('200') && !q.penalty_exposure?.includes('150')) return false;
        if (activeGroupFilter === 'chapter_2' && !q.group?.includes('Chapter 2')) return false;
        if (activeGroupFilter === 'chapter_3' && !q.group?.includes('Chapter 3')) return false;
      }

      // Status filter
      if (statusFilter === 'pass' && val !== 'PASS' && val !== 'YES' && val !== 'FULLY') return false;
      if (statusFilter === 'partial' && val !== 'PARTIAL' && val !== 'LARGELY') return false;
      if (statusFilter === 'fail' && val !== 'FAIL' && val !== 'NO') return false;
      if (statusFilter === 'proof_attached') {
        const proofs = evidenceMap[q.id] || evidenceMap[q.reference] || [];
        if (proofs.length === 0 && !resp?.proof_file_name) return false;
      }
      if (statusFilter === 'rejected') {
        const proofs = evidenceMap[q.id] || evidenceMap[q.reference] || [];
        const isRej = resp?.vciso_review_status === 'rejected' || proofs.some(p => p.review_status === 'rejected');
        if (!isRej) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const qStr = `${q.id} ${q.reference} ${q.title} ${q.question} ${q.group}`.toLowerCase();
        if (!qStr.includes(searchQuery.toLowerCase())) return false;
      }

      return true;
    });
  }, [questions, responseMap, evidenceMap, activeGroupFilter, statusFilter, searchQuery]);

  const handleOpenRejectModal = (responseId, questionId, currentReason) => {
    setRejectionModal({ open: true, responseId, questionId, currentReason: currentReason || '' });
    setRejectReasonInput(currentReason || '');
  };

  const handleConfirmReject = () => {
    if (rejectionModal.responseId || rejectionModal.questionId) {
      onReviewEvidence(
        rejectionModal.responseId || rejectionModal.questionId,
        'rejected',
        rejectReasonInput || 'Evidence does not meet DPDP Act compliance requirements. Please provide updated documentation.'
      );
    }
    setRejectionModal({ open: false, responseId: null, questionId: null, currentReason: '' });
    setRejectReasonInput('');
  };

  // DPDP Policy Documents Templates
  const dpdpPolicies = [
    { id: 'DPDP-POL-01', ref: 'S.5 / Rule 3', title: 'Digital Personal Data Privacy Notice', desc: 'Standard notice in clear language specifying purpose, data categories, and Data Principal rights.', obligation: 'mandatory' },
    { id: 'DPDP-POL-02', ref: 'S.6 / Rule 4', title: 'Consent & Revocation Management Policy', desc: 'Free, specific, informed, and unambiguous consent mechanism with Consent Manager integration.', obligation: 'mandatory' },
    { id: 'DPDP-POL-03', ref: 'S.8(5) / Rule 6(a)', title: 'Technical Security Safeguards Policy', desc: 'Encryption at rest & transit, access control, MFA, vulnerability scanning, and SIEM monitoring.', obligation: 'mandatory' },
    { id: 'DPDP-POL-04', ref: 'S.8(5) / Rule 6(b)', title: 'Log Retention & Business Continuity Plan', desc: 'Audit logging for personal data access, offsite immutable backups, and disaster recovery SLA.', obligation: 'mandatory' },
    { id: 'DPDP-POL-05', ref: 'S.8(6) / Rule 7', title: 'Personal Data Breach Notification Procedure', desc: 'Immediate notification protocols to Data Protection Board and affected Data Principals.', obligation: 'mandatory' },
    { id: 'DPDP-POL-06', ref: 'S.8(7) / Rule 8', title: 'Data Retention & Erasure Schedule', desc: 'Automated data deletion workflows upon purpose fulfillment or consent revocation.', obligation: 'mandatory' },
    { id: 'DPDP-POL-07', ref: 'S.9 / Rules 10-12', title: 'Verifiable Parental Consent for Children', desc: 'Mechanisms ensuring verifiable consent from parents before processing children’s data.', obligation: 'custom' },
    { id: 'DPDP-POL-08', ref: 'S.10 / Rule 13', title: 'Significant Data Fiduciary (SDF) Governance & DPIA', desc: 'Annual independent audit, Data Protection Impact Assessment (DPIA), and India-based DPO appointment.', obligation: 'custom' },
    { id: 'DPDP-POL-09', ref: 'S.11-14 / Rule 14', title: 'Data Principal Rights & Grievance Redressal Policy', desc: 'Mechanism for summary of data, correction, erasure, and resolution within mandated timelines.', obligation: 'mandatory' },
    { id: 'DPDP-POL-10', ref: 'S.16 / Rule 15', title: 'Cross-Border Personal Data Transfer Policy', desc: 'Procedures adhering to central government transfer guidelines and blacklist restrictions.', obligation: 'optional' },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* ── DPDP HEAD SECTION ── */}
      <div className="reg-doc-head" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>🇮🇳</span>
            <span style={{ fontFamily: 'Source Serif 4, serif', fontSize: '20px', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }}>
              Digital Personal Data Protection Act, 2023 + DPDP Rules, 2025
            </span>
            <span className="reg-badge-live">Live Framework</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), lineHeight: 1.5 }}>
            Statutory Data Fiduciary compliance register, gap analysis evaluations, and evidence vault for <b>{client.name || 'Client Organization'}</b>.
          </p>
        </div>

        <div className="reg-meta" style={{ minWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), textTransform: 'uppercase' }}>DPDP Readiness</span>
            <span style={{ fontFamily: 'Source Serif 4, serif', fontSize: '22px', fontWeight: 700, color: stats.readinessScore >= 70 ? th('#065F46', { dark: '#34D399' }) : stats.readinessScore >= 40 ? th('#92400E', { dark: '#FBBF24' }) : th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
              {stats.readinessScore}%
            </span>
          </div>
          <div style={{ height: '6px', background: th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' }), borderRadius: th('2px', { classic: '3px', dark: '3px' }), overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${stats.readinessScore}%`,
                background: stats.readinessScore >= 70 ? '#065F46' : stats.readinessScore >= 40 ? '#D97706' : th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }),
                transition: 'width 0.4s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '6px' }}>
            <span>✓ {stats.passCount} Pass</span>
            <span>⏳ {stats.partialCount} Partial</span>
            <span>✗ {stats.failCount} Gaps</span>
            <span>📎 {stats.proofCount} Proofs</span>
          </div>
        </div>
      </div>

      {/* ── STATS & PENALTY GAUGES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="reg-gauge">
          <div className="reg-gauge-val" style={{ color: th('#065F46', { dark: '#34D399' }) }}>{stats.passCount} / {stats.total}</div>
          <div className="reg-gauge-label">Obligations Compliant (PASS)</div>
        </div>
        <div className="reg-gauge">
          <div className="reg-gauge-val" style={{ color: th('#92400E', { dark: '#FBBF24' }) }}>{stats.partialCount}</div>
          <div className="reg-gauge-label">Partially Met (Remediation In-Flight)</div>
        </div>
        <div className="reg-gauge">
          <div className="reg-gauge-val" style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>{stats.failCount}</div>
          <div className="reg-gauge-label">Active Compliance Gaps (FAIL)</div>
        </div>
        <div className="reg-gauge" style={{ background: stats.maxPenaltyRiskCr > 0 ? th('#FEF2F2', { dark: '#3A1418' }) : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }), borderColor: stats.maxPenaltyRiskCr > 0 ? th('#FCA5A5', { dark: '#7F1D1D' }) : th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' }) }}>
          <div className="reg-gauge-val" style={{ color: stats.maxPenaltyRiskCr > 0 ? th('#991B1B', { dark: '#F87171' }) : th('#065F46', { dark: '#34D399' }) }}>
            {stats.maxPenaltyRiskCr > 0 ? `₹${stats.maxPenaltyRiskCr} Cr` : '₹0'}
          </div>
          <div className="reg-gauge-label" style={{ color: stats.maxPenaltyRiskCr > 0 ? th('#991B1B', { dark: '#F87171' }) : th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
            Max Statutory Penalty Exposure
          </div>
        </div>
      </div>

      {/* ── PHASED TIMELINE NOTICE ── */}
      <div className="reg-notice-box" style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), marginBottom: '4px' }}>
          📅 DPDP Statutory Enforcement Timeline &amp; Phasing
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '8px' }}>
          <div style={{ borderLeft: `3px solid ${th('#065F46', { dark: '#34D399' })}`, paddingLeft: '10px' }}>
            <b>Phase 1 (Active):</b> 13 Nov 2025 — Data Protection Board constitution, appellate provisions &amp; procedural framework.
          </div>
          <div style={{ borderLeft: '3px solid #D97706', paddingLeft: '10px' }}>
            <b>Phase 2 (13 Nov 2026):</b> Consent Manager registration (Rule 4, s.6(9)) and registration conditions.
          </div>
          <div style={{ borderLeft: `3px solid ${th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' })}`, paddingLeft: '10px' }}>
            <b>Phase 3 (13 May 2027):</b> Full organizational compliance deadline for all 50 Data Fiduciary obligations.
          </div>
        </div>
      </div>

      {/* ── SUB-NAVIGATION / TABS ── */}
      <div className="reg-tabs" style={{ marginBottom: '20px' }}>
        <button
          className={`reg-tab ${activeNav === 'implementation' ? 'active' : ''}`}
          onClick={() => { setActiveNav('implementation'); setSelectedQuestion(null); }}
        >
          📋 Gap Analysis &amp; Obligations ({questions.length})
        </button>
        <button
          className={`reg-tab ${activeNav === 'documents' ? 'active' : ''}`}
          onClick={() => { setActiveNav('documents'); setSelectedQuestion(null); }}
        >
          📄 DPDP Policy Governance ({dpdpPolicies.length})
        </button>
        <button
          className={`reg-tab ${activeNav === 'audit' ? 'active' : ''}`}
          onClick={() => { setActiveNav('audit'); setSelectedQuestion(null); }}
        >
          🔍 Audit Evidence &amp; Proofs ({stats.proofCount})
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: DPDP GAP ANALYSIS & OBLIGATIONS                            */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeNav === 'implementation' && !selectedQuestion && (
        <div className="reg-doc">
          <div className="reg-doc-head">
            <div>
              <h2 className="reg-title" style={{ fontSize: '20px' }}>
                DPDP Act &amp; Rules Compliance Obligations Register
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                Filter by Chapter, compliance status, or statutory penalty risk level.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search section, rule, keyword..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="reg-input"
                style={{ width: '220px' }}
              />
            </div>
          </div>

          <div className="reg-body">
            {/* Filter pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px', paddingBottom: '14px', borderBottom: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}` }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), textTransform: 'uppercase', alignSelf: 'center', marginRight: '6px' }}>Group:</span>
              <button
                onClick={() => setActiveGroupFilter('all')}
                className={`reg-btn-sm ${activeGroupFilter === 'all' ? 'reg-btn-primary' : 'reg-btn-secondary'}`}
              >
                All (50)
              </button>
              <button
                onClick={() => setActiveGroupFilter('chapter_2')}
                className={`reg-btn-sm ${activeGroupFilter === 'chapter_2' ? 'reg-btn-primary' : 'reg-btn-secondary'}`}
              >
                Chapter 2 — Fiduciary Obligations
              </button>
              <button
                onClick={() => setActiveGroupFilter('chapter_3')}
                className={`reg-btn-sm ${activeGroupFilter === 'chapter_3' ? 'reg-btn-primary' : 'reg-btn-secondary'}`}
              >
                Chapter 3 — Principal Rights
              </button>
              <button
                onClick={() => setActiveGroupFilter('rules')}
                className={`reg-btn-sm ${activeGroupFilter === 'rules' ? 'reg-btn-primary' : 'reg-btn-secondary'}`}
              >
                DPDP Rules, 2025
              </button>
              <button
                onClick={() => setActiveGroupFilter('high_penalty')}
                className={`reg-btn-sm ${activeGroupFilter === 'high_penalty' ? 'reg-btn-crimson' : 'reg-btn-secondary'}`}
              >
                🚨 Critical Penalties (≥ ₹150 Cr)
              </button>
            </div>

            {/* Questions Table / List */}
            <table className="reg-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Reference</th>
                  <th>Statutory Obligation &amp; Title</th>
                  <th style={{ width: '130px' }}>Penalty Exposure</th>
                  <th style={{ width: '120px' }}>Client Response</th>
                  <th style={{ width: '150px' }}>Evidence &amp; Proof</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>vCISO Review</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map(q => {
                  const resp = responseMap[q.id] || responseMap[q.reference] || {};
                  const proofs = evidenceMap[q.id] || evidenceMap[q.reference] || [];
                  const val = String(resp.response_value || resp.status || 'not_answered').toUpperCase();

                  const isPass = val === 'PASS' || val === 'YES' || val === 'FULLY';
                  const isPartial = val === 'PARTIAL' || val === 'LARGELY';
                  const isFail = val === 'FAIL' || val === 'NO';
                  const isNA = val === 'NA' || val === 'N/A';

                  const reviewStatus = resp.vciso_review_status || (proofs[0]?.review_status) || 'pending';
                  const isAccepted = reviewStatus === 'accepted';
                  const isRejected = reviewStatus === 'rejected';

                  // Penalty badge style
                  const isHighPenalty = q.penalty_exposure?.includes('250') || q.penalty_exposure?.includes('200') || q.penalty_exposure?.includes('150');

                  return (
                    <tr key={q.id}>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '12.5px' }}>
                          {q.reference}
                        </span>
                        <div style={{ fontSize: '10.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '2px' }}>{q.id}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontSize: '13.5px' }}>{q.title}</div>
                        <div style={{ fontSize: '12px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '3px', lineHeight: 1.4 }}>
                          {q.question}
                        </div>
                        <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                          <b>Group:</b> {q.group}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: th('2px', { classic: '3px', dark: '3px' }),
                            background: isHighPenalty ? th('#FEE2E2', { dark: '#3A1418' }) : th('#F3F4F6', { dark: '#172033' }),
                            color: isHighPenalty ? th('#991B1B', { dark: '#F87171' }) : th('#4B5563', { dark: '#CBD5E1' }),
                            border: `1px solid ${isHighPenalty ? th('#FCA5A5', { dark: '#7F1D1D' }) : th('#E5E7EB', { dark: '#334155' })}`,
                            display: 'inline-block'
                          }}
                        >
                          {q.penalty_exposure?.split('(')[0] || q.penalty_exposure}
                        </span>
                      </td>
                      <td>
                        {isPass ? (
                          <span style={{ background: th('#D1FAE5', { dark: '#0B2E24' }), color: th('#065F46', { dark: '#34D399' }), padding: '3px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>
                            ✓ PASS
                          </span>
                        ) : isPartial ? (
                          <span style={{ background: th('#FEF3C7', { dark: '#3A2A0A' }), color: th('#92400E', { dark: '#FBBF24' }), padding: '3px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>
                            ⏳ PARTIAL
                          </span>
                        ) : isFail ? (
                          <span style={{ background: th('#FEE2E2', { dark: '#3A1418' }), color: th('#991B1B', { dark: '#F87171' }), padding: '3px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>
                            ✗ FAIL (GAP)
                          </span>
                        ) : isNA ? (
                          <span style={{ background: th('#F3F4F6', { dark: '#172033' }), color: th('#6B7280', { dark: '#94A3B8' }), padding: '3px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 600 }}>
                            N/A
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: '11.5px' }}>Not Answered</span>
                        )}
                      </td>
                      <td>
                        {proofs.length > 0 || resp.proof_file_name ? (
                          <div>
                            {proofs.map((p, pIdx) => (
                              <div key={p.id || pIdx} style={{ marginBottom: '4px' }}>
                                <a
                                  href={p.url || `/api/evidence/file/${p.filename}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 600, fontSize: '12px', textDecoration: 'underline' }}
                                >
                                  📎 {p.original_name || p.filename}
                                </a>
                              </div>
                            ))}
                            {!proofs.length && resp.proof_file_name && (
                              <a
                                href={resp.proof_file_url || `/api/evidence/file/${resp.proof_file_name}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 600, fontSize: '12px', textDecoration: 'underline' }}
                              >
                                📎 {resp.proof_file_name}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: '11.5px' }}>No proof attached</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {(() => {
                          const hasProof = (proofs && proofs.length > 0) || Boolean(resp.proof_file_name);
                          const isAttestedCompliant = resp.response_value === 'yes' || resp.response_value === 'fully' || resp.response_value === 'largely' || resp.response_value === 'partial';
                          const isNo = resp.response_value === 'no' || resp.response_value === 'fail' || resp.response_value === 'non_compliant';
                          const canReview = hasProof || (isAttestedCompliant && Boolean(resp.response_value));

                          if (!canReview) {
                            if (isNo) {
                              return (
                                <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700, background: th('#FEE2E2', { dark: '#3A1418' }), color: th('#991B1B', { dark: '#F87171' }), border: `1px solid ${th('#FECACA', { dark: '#7F1D1D' })}` }}>
                                  Gap (Non-Compliant)
                                </span>
                              );
                            }
                            if (resp.response_value === 'na') {
                              return (
                                <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 600, background: th('#F3F4F6', { dark: '#172033' }), color: th('#6B7280', { dark: '#94A3B8' }), border: `1px solid ${th('#E5E7EB', { dark: '#334155' })}` }}>
                                  Not Applicable
                                </span>
                              );
                            }
                            return (
                              <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                Awaiting Client Assessment
                              </span>
                            );
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => onReviewEvidence(resp.id || proofs[0]?.id || q.id, 'accepted', 'DPDP compliance proof accepted by vCISO')}
                                  style={{
                                    background: isAccepted ? '#065F46' : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                                    color: isAccepted ? '#FFFFFF' : th('#065F46', { dark: '#34D399' }),
                                    border: `1px solid ${th('#065F46', { dark: '#34D399' })}`,
                                    borderRadius: '2px',
                                    padding: '3px 7px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  onClick={() => handleOpenRejectModal(resp.id || proofs[0]?.id, q.id, resp.vciso_rejection_reason || resp.vciso_notes)}
                                  style={{
                                    background: isRejected ? '#991B1B' : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                                    color: isRejected ? '#FFFFFF' : th('#991B1B', { dark: '#F87171' }),
                                    border: `1px solid ${th('#991B1B', { dark: '#F87171' })}`,
                                    borderRadius: '2px',
                                    padding: '3px 7px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✗ Reject
                                </button>
                              </div>
                              {isAccepted && <span style={{ fontSize: '10.5px', color: th('#065F46', { dark: '#34D399' }), fontWeight: 600 }}>✓ Verified Compliant</span>}
                              {isRejected && (
                                <span style={{ fontSize: '10.5px', color: th('#991B1B', { dark: '#F87171' }), fontWeight: 600 }} title={resp.vciso_rejection_reason || resp.vciso_notes}>
                                  ✗ Rejected (Changes Needed)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: DPDP POLICY GOVERNANCE & DOCUMENTATION                     */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeNav === 'documents' && (
        <div className="reg-doc">
          <div className="reg-doc-head">
            <div>
              <h2 className="reg-title" style={{ fontSize: '20px' }}>
                DPDP Statutory Policies &amp; Governance Documentation
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                Required policies drafted and configured by the vCISO team for {client.name || 'Organization'}.
              </p>
            </div>
            <button
              onClick={() => setActiveNav('workspace')}
              className="reg-btn-primary reg-btn-sm"
            >
              + Draft New DPDP Policy
            </button>
          </div>

          <div className="reg-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {dpdpPolicies.map((pol) => {
                const proofs = evidenceMap[pol.id] || evidenceMap[pol.ref] || [];
                return (
                  <div key={pol.id} className="reg-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 700, color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
                          {pol.ref}
                        </span>
                        <span className={`reg-stamp ${pol.obligation === 'mandatory' ? '' : 'opt'}`}>
                          {pol.obligation.toUpperCase()}
                        </span>
                      </div>
                      <div className="reg-card-title" style={{ fontSize: '15px' }}>{pol.title}</div>
                      <p style={{ fontSize: '12.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), margin: '6px 0 12px', lineHeight: 1.4 }}>
                        {pol.desc}
                      </p>
                      {proofs.length > 0 && (
                        <div style={{ fontSize: '11.5px', color: th('#065F46', { dark: '#34D399' }), fontWeight: 600, marginBottom: '10px' }}>
                          ✓ {proofs.length} compliance document(s) uploaded
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`, paddingTop: '12px' }}>
                      <button
                        onClick={() => onOpenUpload(pol.id, pol.title)}
                        className="reg-btn-secondary reg-btn-sm"
                        style={{ flex: 1 }}
                      >
                        📎 Upload Policy
                      </button>
                      <button
                        onClick={() => {
                          setActiveNav('workspace');
                        }}
                        className="reg-btn-primary reg-btn-sm"
                        style={{ flex: 1 }}
                      >
                        Edit Workspace →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* VIEW 3: DPDP AUDIT & EVIDENCE REPOSITORY                           */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeNav === 'audit' && (
        <div className="reg-doc">
          <div className="reg-doc-head">
            <div>
              <h2 className="reg-title" style={{ fontSize: '20px' }}>
                DPDP Act Evidence &amp; Compliance Proofs Vault
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                Audit proofs submitted by client with vCISO verification decision and notes.
              </p>
            </div>
            <button
              onClick={() => onOpenUpload('DPDP-GENERAL', 'General DPDP Proof')}
              className="reg-btn-primary reg-btn-sm"
            >
              📎 Upload DPDP Evidence
            </button>
          </div>

          <div className="reg-body">
            {evidences.filter(e => (e.framework_id || '').toLowerCase().includes('dpdp') || e.tags === 'gap_analysis_proof' || e.question_id?.startsWith('Q0')).length === 0 ? (
              <div className="reg-notice-box" style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
                <b>No DPDP audit evidence files uploaded yet.</b>
                <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }) }}>
                  Uploaded proofs from client gap questionnaire or policy uploads will appear here for verification.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {evidences
                  .filter(e => (e.framework_id || '').toLowerCase().includes('dpdp') || e.tags === 'gap_analysis_proof' || e.question_id?.startsWith('Q0'))
                  .map((ev) => {
                    const isAccepted = ev.review_status === 'accepted';
                    const isRejected = ev.review_status === 'rejected';

                    return (
                      <div
                        key={ev.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                          border: `1px solid ${isRejected ? th('#FCA5A5', { dark: '#7F1D1D' }) : isAccepted ? th('#A7F3D0', { dark: '#065F46' }) : th('#EDF2F7', { classic: '#E2E8F0', dark: '#334155' })}`,
                          borderRadius: th('2px', { classic: '3px', dark: '3px' })
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <a
                              href={ev.url || `/api/evidence/file/${ev.filename}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }), fontWeight: 700, fontSize: '13px', textDecoration: 'underline' }}
                            >
                              📎 {ev.original_name || ev.filename}
                            </a>
                            {isAccepted ? (
                              <span style={{ background: th('#D1FAE5', { dark: '#0B2E24' }), color: th('#065F46', { dark: '#34D399' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>✓ Accepted</span>
                            ) : isRejected ? (
                              <span style={{ background: th('#FEE2E2', { dark: '#3A1418' }), color: th('#991B1B', { dark: '#F87171' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>✗ Rejected</span>
                            ) : (
                              <span style={{ background: th('#FEF3C7', { dark: '#3A2A0A' }), color: th('#92400E', { dark: '#FBBF24' }), padding: '2px 8px', borderRadius: th('2px', { classic: '3px', dark: '3px' }), fontSize: '11px', fontWeight: 700 }}>⏳ Pending Review</span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: th('#4A5568', { classic: '#64748B', dark: '#94A3B8' }), marginTop: '4px' }}>
                            Target: <b>{ev.control_id || ev.question_id || 'DPDP General'}</b> · Uploaded: {new Date(ev.uploaded_at).toLocaleDateString()}
                          </div>
                          {ev.vciso_notes && <div style={{ fontSize: '11px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }), marginTop: '2px' }}>vCISO Notes: {ev.vciso_notes}</div>}
                          {ev.rejection_reason && <div style={{ fontSize: '11px', color: th('#991B1B', { dark: '#F87171' }), marginTop: '2px', fontWeight: 600 }}>Rejection Reason: {ev.rejection_reason}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => onReviewEvidence(ev.id, 'accepted', 'Accepted by vCISO')}
                            style={{
                              background: isAccepted ? '#065F46' : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                              color: isAccepted ? '#FFFFFF' : th('#065F46', { dark: '#34D399' }),
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
                            onClick={() => handleOpenRejectModal(ev.id, ev.question_id, ev.rejection_reason || ev.vciso_notes)}
                            style={{
                              background: isRejected ? '#991B1B' : th('#EDF2F7', { classic: '#F1F5F9', dark: '#0F172A' }),
                              color: isRejected ? '#FFFFFF' : th('#991B1B', { dark: '#F87171' }),
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
                          <button
                            onClick={() => onDeleteEvidence(ev.id)}
                            style={{ color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }), border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '6px' }}
                          >
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
      )}

      {/* ── REJECTION REASON MODAL ── */}
      {rejectionModal.open && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: th('#FFFFFF', { dark: '#1E293B' }),
            padding: '24px 28px',
            borderRadius: th('2px', { classic: '4px', dark: '4px' }),
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: `1px solid ${th('#D7DEE7', { classic: '#DCE3EC', dark: '#334155' })}`
          }}>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'Source Serif 4, serif', fontSize: '18px', color: th('#3182CE', { classic: '#2563EB', dark: '#60A5FA' }) }}>
              Reject Evidence &amp; Request Re-submission
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: th('#4A5568', { classic: '#475569', dark: '#A3AEBF' }) }}>
              Please specify the reason why this evidence is rejected. The client will see this feedback directly on their portal so they can resubmit the correct documentation.
            </p>
            <textarea
              className="reg-textarea"
              rows={4}
              placeholder="e.g. The uploaded policy is missing encryption key management procedures required under Rule 6(a). Please update and re-upload."
              value={rejectReasonInput}
              onChange={e => setRejectReasonInput(e.target.value)}
              style={{ width: '100%', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setRejectionModal({ open: false, responseId: null, questionId: null, currentReason: '' })}
                className="reg-btn-secondary reg-btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="reg-btn-crimson reg-btn-sm"
              >
                Confirm Rejection &amp; Notify Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
