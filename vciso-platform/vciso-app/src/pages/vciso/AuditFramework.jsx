import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { FRAMEWORK_CATALOG } from './frameworkCatalog';
import isoQuestionnaireData from '../../data/iso27001_questionnaire.json';
import dpdpQuestionnaireData from '../../data/dpdp_questionnaire.json';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { th } from '../../theme';

const C = {
  bg: th('#F8FAFC', { dark: '#0F172A' }), card: th('#FFFFFF', { dark: '#1E293B' }), cardInner: th('#F8FAFC', { dark: '#0F172A' }), border: th('#E2E8F0', { dark: '#334155' }), borderLight: th('#CBD5E1', { dark: '#334155' }),
  accent: th('#2563EB', { dark: '#60A5FA' }), cyan: '#0284C7', critical: '#DC2626', high: '#EA580C',
  medium: '#D97706', low: '#059669', muted: th('#64748B', { dark: '#94A3B8' }), text: th('#0F172A', { dark: '#F1F5F9' }), textDim: th('#475569', { dark: '#CBD5E1' })
};

const THEME_COLORS = {
  'Clause 4: Context of the Organization': '#38bdf8',
  'Clause 5: Leadership': '#818cf8',
  'Clause 6: Planning': '#c084fc',
  'Clause 7: Support': '#e879f9',
  'Clause 8: Operation': '#fb7185',
  'Clause 9: Performance Evaluation': '#f43f5e',
  'Clause 10: Improvement': '#fb923c',
  'A.5 Organizational Controls': '#00c2c7',
  'A.6 People Controls': '#34d399',
  'A.7 Physical Controls': '#fbbf24',
  'A.8 Technological Controls': '#60a5fa',
  'Notice & Consent (Section 5 & 6)': '#38bdf8',
  'Consent Architecture & Validation': '#818cf8',
  'Obligations of Data Fiduciary (Section 8)': '#c084fc',
  'Data Protection Officer & Governance': '#00c2c7',
  'Processing Children Personal Data (Section 9)': '#fb7185',
  'Significant Data Fiduciary (Section 10)': '#f43f5e',
  'Rights of Data Principals (Section 11-14)': '#34d399',
  'Grievance Redressal Mechanism (Section 13)': '#fbbf24',
  'Data Breach Management (Section 8(6))': '#ff3b47',
  'Cross-Border Data Transfer (Section 16)': '#60a5fa',
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function AuditFramework() {
  const { frameworkSlug } = useParams();
  const { user, getToken } = useAuth();
  const token = getToken();
  const fw = FRAMEWORK_CATALOG?.[frameworkSlug];

  const reportRef = useRef(null);
  const [activeTab, setActiveTab] = useState('gap-analysis'); // 'gap-analysis' | 'professional-view'
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [responses, setResponses] = useState([]);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Professional View state & filters
  const [proFilter, setProFilter] = useState('all'); // 'all' | 'with_proof' | 'pending' | 'accepted' | 'rejected'
  const [proSearch, setProSearch] = useState('');
  const [proCategoryFilter, setProCategoryFilter] = useState('all');
  const [reviewDrafts, setReviewDrafts] = useState({}); // { [qId]: { status, notes, rejectionReason, saving } }
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  // Normalize framework db query id
  const frameworkDbId = useMemo(() => {
    if (frameworkSlug === 'iso-27001') return 'iso27001-2022';
    if (frameworkSlug === 'dpdp') return 'dpdp';
    return frameworkSlug;
  }, [frameworkSlug]);

  const loadData = useCallback(async () => {
    if (!frameworkSlug) return;
    setLoading(true);
    setAssessmentData(null);
    setResponses([]);
    setReviewDrafts({});
    try {
      // 1. Fetch dashboard client details first to ensure strict tenant scoping
      const dashRes = await fetch('/api/vciso/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      const dashData = dashRes.ok ? await dashRes.json() : null;
      const targetClientId = dashData?.client?.id || user?.client_id || null;

      if (!targetClientId) {
        setAssessmentData(null);
        setResponses([]);
        setClientInfo({
          company_name: user?.company_name || 'Organization',
          industry: 'Technology',
          company_branch: '',
          location: '',
        });
        return;
      }

      // 2. Fetch assessment & company info for the specific client
      const [assessRes, compRes] = await Promise.all([
        fetch(`/api/vciso/assessments/client/${targetClientId}?frameworkId=${frameworkDbId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/company-info/${targetClientId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const assessObj = assessRes.ok ? await assessRes.json() : null;
      const compObj = compRes.ok ? await compRes.json() : null;

      const loadedAssessment = assessObj?.assessment || null;
      const loadedResponses = Array.isArray(assessObj?.responses) ? assessObj.responses : [];

      setAssessmentData(loadedAssessment);
      setResponses(loadedResponses);

      // Initialize review drafts for all loaded responses
      const drafts = {};
      loadedResponses.forEach(r => {
        drafts[r.question_id] = {
          status: r.vciso_review_status || 'pending',
          notes: r.vciso_notes || '',
          rejectionReason: r.vciso_rejection_reason || '',
          saving: false,
        };
      });
      setReviewDrafts(drafts);

      setClientInfo({
        company_name: compObj?.company_name || assessObj?.assessment?.company_name || dashData?.client?.name || user?.company_name || 'Organization',
        industry: compObj?.industry || dashData?.client?.industry || 'Technology',
        company_branch: compObj?.company_branch || '',
        location: compObj?.location || '',
      });
    } catch (err) {
      console.warn('Error loading framework audit data:', err);
    } finally {
      setLoading(false);
    }
  }, [frameworkSlug, token, user, frameworkDbId]);

  useEffect(() => {
    setLoading(true);
    setAssessmentData(null);
    setResponses([]);
    setReviewDrafts({});
    loadData();
  }, [frameworkSlug, loadData]);

  // ── High-Resolution PDF Generator matching vCISO dark theme & document layout ──
  const handleGeneratePdf = async () => {
    if (!reportRef.current) return;
    setGeneratingPdf(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#070d1f',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const clientTitle = clientInfo?.company_name || 'Organization';
      const fileName = `${clientTitle.replace(/\s+/g, '_')}_${(fw?.name || frameworkSlug).replace(/[^a-zA-Z0-9]/g, '_')}_Gap_Assessment_Report.pdf`;
      pdf.save(fileName);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ── vCISO Save Audit Review Determination (Directly synced to DB) ──
  const handleSaveProDecision = async (questionId, newStatus) => {
    const draft = reviewDrafts[questionId] || {};
    const effectiveStatus = newStatus || draft.status || 'accepted';

    if (effectiveStatus === 'rejected' && !draft.rejectionReason?.trim() && !draft.notes?.trim()) {
      alert('Please provide a rejection reason / audit comment before rejecting.');
      return;
    }

    setReviewDrafts(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], status: effectiveStatus, saving: true }
    }));

    try {
      const respObj = responses.find(r => r.question_id === questionId);
      const responseId = respObj?.id || `resp-${assessmentData?.id || 'pending'}-${questionId}`;

      const res = await fetch(`/api/vciso/assessments/responses/${responseId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          assessmentId: assessmentData?.id,
          questionId,
          reviewStatus: effectiveStatus,
          vcisoNotes: draft.notes || draft.rejectionReason || '',
          rejectionReason: draft.rejectionReason || draft.notes || '',
        })
      });

      const data = await res.json();
      if (res.ok) {
        setReviewSuccessMsg(`✓ Audit determination saved: ${questionId} marked as ${effectiveStatus.toUpperCase()}`);
        setTimeout(() => setReviewSuccessMsg(''), 3500);

        // Update local responses array in state
        setResponses(prev => {
          const existingIdx = prev.findIndex(r => r.question_id === questionId);
          const updatedItem = {
            ...(existingIdx >= 0 ? prev[existingIdx] : { id: data.responseId, question_id: questionId, response_value: 'fully' }),
            vciso_review_status: effectiveStatus,
            vciso_notes: draft.notes || draft.rejectionReason || '',
            vciso_rejection_reason: draft.rejectionReason || draft.notes || '',
            reviewed_by: data.reviewedBy || user?.name || 'vCISO Lead',
            reviewed_at: data.reviewedAt || new Date().toISOString()
          };

          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = updatedItem;
            return copy;
          } else {
            return [...prev, updatedItem];
          }
        });

        setReviewDrafts(prev => ({
          ...prev,
          [questionId]: {
            ...prev[questionId],
            status: effectiveStatus,
            saving: false
          }
        }));
      } else {
        alert(data.error || 'Failed to save review decision');
        setReviewDrafts(prev => ({
          ...prev,
          [questionId]: { ...prev[questionId], saving: false }
        }));
      }
    } catch (err) {
      console.error('Error saving review decision:', err);
      alert('Network error saving review decision: ' + err.message);
      setReviewDrafts(prev => ({
        ...prev,
        [questionId]: { ...prev[questionId], saving: false }
      }));
    }
  };

  // ── ISO 27001 Calculation Engine (Strictly adhering to Gap Assessment Formula.docx) ──
  const isoStats = useMemo(() => {
    const questions = isoQuestionnaireData.questions || [];
    const respMap = {};
    responses.forEach(r => {
      if (questions.some(q => q.id === r.question_id)) {
        respMap[r.question_id] = r;
      }
    });

    const isActualIso = Boolean(
      assessmentData &&
      (
        assessmentData.framework_id === 'iso27001-2022' ||
        assessmentData.framework_id === 'iso-27001' ||
        assessmentData.framework_id === 'iso27001' ||
        String(assessmentData.framework_name || '').toLowerCase().includes('iso')
      )
    );

    const hasSubmittedData = isActualIso && Object.keys(respMap).length > 0;

    let answered = 0;
    let applicable = 0;
    let totalScore = 0;
    let compliant = 0;    // Score 4 (Fully)
    let largely = 0;      // Score 3 (Largely)
    let partial = 0;      // Score 2 (Partial)
    let initial = 0;      // Score 1 (Initial)
    let notImpl = 0;      // Score 0 (Not Implemented)
    let na = 0;

    if (hasSubmittedData) {
      questions.forEach(q => {
        const r = respMap[q.id];
        if (r && r.response_value) {
          answered++;
          const val = r.response_value;
          if (val === 'fully') {
            compliant++; applicable++; totalScore += 4;
          } else if (val === 'largely') {
            largely++; applicable++; totalScore += 3;
          } else if (val === 'partial') {
            partial++; applicable++; totalScore += 2;
          } else if (val === 'initial') {
            initial++; applicable++; totalScore += 1;
          } else if (val === 'not_implemented') {
            notImpl++; applicable++; totalScore += 0;
          } else if (val === 'na') {
            na++;
          }
        }
      });
    }

    const clauseDefs = [
      { id: 'clause-4', name: 'Clause 4 – Context', shortName: 'Context', keyword: 'Context' },
      { id: 'clause-5', name: 'Clause 5 – Leadership', shortName: 'Leadership', keyword: 'Leadership' },
      { id: 'clause-6', name: 'Clause 6 – Planning', shortName: 'Planning', keyword: 'Planning' },
      { id: 'clause-7', name: 'Clause 7 – Support', shortName: 'Support', keyword: 'Support' },
      { id: 'clause-8', name: 'Clause 8 – Operation', shortName: 'Operation', keyword: 'Operation' },
      { id: 'clause-9', name: 'Clause 9 – Performance Evaluation', shortName: 'Performance Eval.', keyword: 'Performance Evaluation' },
      { id: 'clause-10', name: 'Clause 10 – Improvement', shortName: 'Improvement', keyword: 'Improvement' },
    ];

    const annexDefs = [
      { theme: 'A.5 Organizational', keyword: 'Organizational' },
      { theme: 'A.6 People', keyword: 'People' },
      { theme: 'A.7 Physical', keyword: 'Physical' },
      { theme: 'A.8 Technological', keyword: 'Technological' },
    ];

    if (!hasSubmittedData) {
      return {
        hasSubmittedData: false,
        readinessPct: 0,
        maturityScoreNum: '0.0',
        maturityRating: 'Not Assessed',
        compliantPct: 0,
        partialPct: 0,
        notImplPct: 0,
        clauses: clauseDefs.map(c => ({ ...c, pct: 0, status: '⚪', count: 0 })),
        annexThemes: annexDefs.map(a => ({ theme: a.theme, score: 0, risk: 'Not Assessed', riskDot: '⚪', riskColor: '#8892a4', count: 0 })),
        severityList: [
          { level: 'Critical', count: 0, pct: 0, dot: '🔴', color: '#ff3b47' },
          { level: 'High', count: 0, pct: 0, dot: '🟠', color: '#ff8547' },
          { level: 'Medium', count: 0, pct: 0, dot: '🟡', color: '#ffd166' },
          { level: 'Low', count: 0, pct: 0, dot: '🟢', color: '#06d6a0' },
        ],
        sumGaps: 0,
        keyGaps: [],
        maturityAreas: [
          { name: 'Governance', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Risk Management', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Asset Management', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Access Control', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Incident Management', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Business Continuity', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Supplier Security', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Monitoring', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Internal Audit', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Continual Improvement', rating: 'Not Assessed', col: 0, dot: '⚪' },
        ],
        overallMaturity: '0.0 / 5 – Not Assessed',
      };
    }

    // Master Formula from Gap Assessment Formula.docx:
    const maxApplicableScore = applicable * 4;
    const readinessPct = maxApplicableScore > 0 ? Math.round((totalScore / maxApplicableScore) * 100) : 0;

    const totalAssessed = applicable > 0 ? applicable : 1;
    const compliantPct = Math.round((compliant / totalAssessed) * 100);
    const partialPct = Math.round(((largely + partial) / totalAssessed) * 100);
    const notImplPct = Math.round(((initial + notImpl) / totalAssessed) * 100);

    // Clause 4–10 breakdown
    const clauses = clauseDefs.map(c => {
      const matched = questions.filter(q => q.category === 'Clause' && (q.theme || '').toLowerCase().includes(c.keyword.toLowerCase()));
      let sc = 0; let app = 0;
      matched.forEach(q => {
        const r = respMap[q.id];
        if (r && r.score !== null && r.score !== undefined && r.response_value !== 'na') {
          sc += Number(r.score); app++;
        }
      });
      const pct = app > 0 ? Math.round((sc / (app * 4)) * 100) : 0;
      let status = '🔴';
      if (pct >= 75) status = '🟢';
      else if (pct >= 50) status = '🟡';
      return { ...c, pct, status, count: matched.length };
    });

    // Annex A Control Themes Breakdown (A.5, A.6, A.7, A.8)
    const annexThemes = annexDefs.map(a => {
      const matched = questions.filter(q => q.category === 'Annex A' && (q.theme || '').toLowerCase().includes(a.keyword.toLowerCase()));
      let sc = 0; let app = 0;
      matched.forEach(q => {
        const r = respMap[q.id];
        if (r && r.score !== null && r.score !== undefined && r.response_value !== 'na') {
          sc += Number(r.score); app++;
        }
      });
      const pct = app > 0 ? Math.round((sc / (app * 4)) * 100) : 0;
      let risk = 'High'; let riskDot = '🔴'; let riskColor = '#ff3b47';
      if (pct >= 80) { risk = 'Low'; riskDot = '🟢'; riskColor = '#06d6a0'; }
      else if (pct >= 60) { risk = 'Medium'; riskDot = '🟡'; riskColor = '#ffd166'; }
      return { theme: a.theme, score: pct, risk, riskDot, riskColor, count: matched.length };
    });

    // Gap Severity Breakdown
    const criticalCount = notImpl;
    const highCount = initial;
    const mediumCount = partial;
    const lowCount = largely;
    const sumGaps = criticalCount + highCount + mediumCount + lowCount || 0;

    const severityList = [
      { level: 'Critical', count: criticalCount, pct: sumGaps > 0 ? Math.round((criticalCount / sumGaps) * 100) : 0, dot: '🔴', color: '#ff3b47' },
      { level: 'High', count: highCount, pct: sumGaps > 0 ? Math.round((highCount / sumGaps) * 100) : 0, dot: '🟠', color: '#ff8547' },
      { level: 'Medium', count: mediumCount, pct: sumGaps > 0 ? Math.round((mediumCount / sumGaps) * 100) : 0, dot: '🟡', color: '#ffd166' },
      { level: 'Low', count: lowCount, pct: sumGaps > 0 ? Math.round((lowCount / sumGaps) * 100) : 0, dot: '🟢', color: '#06d6a0' },
    ];

    // Key Gaps Identified List
    const keyGaps = responses
      .filter(r => ['not_implemented', 'initial', 'partial'].includes(r.response_value))
      .map((r, i) => ({
        num: i + 1,
        area: r.theme || r.category || 'ISMS Control',
        gap: r.notes || r.title || r.question,
        severity: r.response_value === 'not_implemented' ? 'Critical' : r.response_value === 'initial' ? 'High' : 'Medium',
        recommendation: `Remediate control requirement ${r.reference || ''} and document formal policy & operational evidence.`,
      }))
      .slice(0, 10);

    const maturityAreas = [
      { name: 'Governance', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: readinessPct >= 60 ? 3 : 2, dot: readinessPct >= 60 ? '🟢' : '🟡' },
      { name: 'Risk Management', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Asset Management', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: 3, dot: '🟡' },
      { name: 'Access Control', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: 3, dot: '🟡' },
      { name: 'Incident Management', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Business Continuity', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: 3, dot: '🟡' },
      { name: 'Supplier Security', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Monitoring', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Internal Audit', rating: readinessPct >= 75 ? 'Defined' : 'Initial', col: 1, dot: '🔴' },
      { name: 'Continual Improvement', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
    ];

    const maturityScoreNum = (1 + (readinessPct / 100) * 4).toFixed(1);
    let maturityRating = 'Developing';
    if (readinessPct >= 80) maturityRating = 'Optimized';
    else if (readinessPct >= 65) maturityRating = 'Managed';
    else if (readinessPct >= 50) maturityRating = 'Defined';
    else if (readinessPct >= 30) maturityRating = 'Developing';
    else maturityRating = 'Initial';

    const overallMaturity = `${maturityScoreNum} / 5 – ${maturityRating}`;

    return {
      hasSubmittedData: true,
      readinessPct,
      maturityScoreNum,
      maturityRating,
      compliantPct,
      partialPct,
      notImplPct,
      clauses,
      annexThemes,
      severityList,
      sumGaps,
      keyGaps,
      maturityAreas,
      overallMaturity,
    };
  }, [responses, assessmentData]);

  // ── DPDP Calculation Engine ──
  const dpdpStats = useMemo(() => {
    const questions = dpdpQuestionnaireData.questions || [];
    const respMap = {};
    responses.forEach(r => {
      if (questions.some(q => q.id === r.question_id)) {
        respMap[r.question_id] = r;
      }
    });

    const isActualDpdp = Boolean(
      assessmentData &&
      (
        assessmentData.framework_id === 'dpdp' ||
        assessmentData.framework_id === 'dpdpa' ||
        assessmentData.framework_id === 'dpdp-2023' ||
        assessmentData.framework_id === 'dpdp_2023' ||
        String(assessmentData.framework_name || '').toLowerCase().includes('dpdp')
      )
    );

    const hasSubmittedData = isActualDpdp && Object.keys(respMap).length > 0;

    let answered = 0;
    let applicable = 0;
    let totalScore = 0;
    let pass = 0;
    let partial = 0;
    let fail = 0;
    let na = 0;

    if (hasSubmittedData) {
      questions.forEach(q => {
        const r = respMap[q.id];
        if (r && r.response_value) {
          answered++;
          const val = r.response_value;
          if (val === 'yes') {
            pass++; applicable++; totalScore += 2;
          } else if (val === 'partial') {
            partial++; applicable++; totalScore += 1;
          } else if (val === 'no') {
            fail++; applicable++; totalScore += 0;
          } else if (val === 'na') {
            na++;
          }
        }
      });
    }

    const chapterDefs = [
      { name: 'Chapter 1 – Preliminary & Scope', shortName: 'Preliminary', match: 'chapter 1' },
      { name: 'Chapter 2 – Obligations of Data Fiduciary', shortName: 'Fiduciary Duties', match: 'chapter 2' },
      { name: 'Chapter 3 – Rights of Data Principals', shortName: 'Principal Rights', match: 'chapter 3' },
      { name: 'Chapter 4 – Special Provisions & SDF', shortName: 'Special / SDF', match: 'chapter 4' },
      { name: 'Part B – Operative Rules 2025', shortName: 'DPDP Rules', match: 'part b' },
    ];

    const ruleThemesDefs = [
      { theme: 'Notice & Multilingual Consent (S.5, Rule 3)', match: ['notice', 'consent', 's.5', 's.6', 'rule 3', 'rule 4'] },
      { theme: 'Security Safeguards (S.8(5), Rule 6)', match: ['security', 'safeguard', 's.8(5)', 'rule 6'] },
      { theme: 'Breach Reporting & CERT-In (S.8(6), Rule 7)', match: ['breach', 'cert-in', 's.8(6)', 'rule 7'] },
      { theme: 'Children Personal Data (S.9, Rule 8)', match: ['children', 'child', 's.9', 'rule 8'] },
    ];

    if (!hasSubmittedData) {
      return {
        hasSubmittedData: false,
        readinessPct: 0,
        maturityScoreNum: '0.0',
        maturityRating: 'Not Assessed',
        compliantPct: 0,
        partialPct: 0,
        notImplPct: 0,
        chapters: chapterDefs.map(c => ({ name: c.name, shortName: c.shortName, pct: 0, status: '⚪', count: 0 })),
        ruleThemes: ruleThemesDefs.map(a => ({ theme: a.theme, score: 0, risk: 'Not Assessed', riskDot: '⚪', riskColor: '#8892a4', count: 0 })),
        severityList: [
          { level: 'Critical (₹250Cr Risk)', count: 0, pct: 0, dot: '🔴', color: '#ff3b47' },
          { level: 'High (₹200Cr Risk)', count: 0, pct: 0, dot: '🟠', color: '#ff8547' },
          { level: 'Medium (₹50Cr Risk)', count: 0, pct: 0, dot: '🟡', color: '#ffd166' },
          { level: 'Low / Minor', count: 0, pct: 0, dot: '🟢', color: '#06d6a0' },
        ],
        sumGaps: 0,
        keyGaps: [],
        maturityAreas: [
          { name: 'Consent Architecture', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Data Principal Rights', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Technical Safeguards', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Breach Incident Response', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Children Data Protections', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Significant Data Fiduciary (SDF)', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Data Protection Officer (DPO)', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Data Processor Governance', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Grievance Redressal', rating: 'Not Assessed', col: 0, dot: '⚪' },
          { name: 'Audit & DPIA', rating: 'Not Assessed', col: 0, dot: '⚪' },
        ],
        overallMaturity: '0.0 / 5 – Not Assessed',
      };
    }

    const maxApplicableScore = applicable * 2;
    const readinessPct = maxApplicableScore > 0 ? Math.round((totalScore / maxApplicableScore) * 100) : 0;

    const totalAssessed = applicable > 0 ? applicable : 1;
    const compliantPct = Math.round((pass / totalAssessed) * 100);
    const partialPct = Math.round((partial / totalAssessed) * 100);
    const notImplPct = Math.round((fail / totalAssessed) * 100);

    const chapters = chapterDefs.map(c => {
      const matchedQ = questions.filter(q => (q.group || '').toLowerCase().includes(c.match));
      let sc = 0;
      let app = 0;
      matchedQ.forEach(q => {
        const r = respMap[q.id];
        if (r && r.response_value && r.response_value !== 'na') {
          app++;
          if (r.response_value === 'yes') sc += 2;
          else if (r.response_value === 'partial') sc += 1;
        }
      });
      const pct = app > 0 ? Math.round((sc / (app * 2)) * 100) : 0;
      let status = '🔴';
      if (pct >= 75) status = '🟢';
      else if (pct >= 50) status = '🟡';
      return { name: c.name, shortName: c.shortName, pct, status, count: matchedQ.length };
    });

    const ruleThemes = ruleThemesDefs.map(rt => {
      const matchedQ = questions.filter(q => {
        const str = `${q.reference} ${q.title} ${q.group}`.toLowerCase();
        return rt.match.some(m => str.includes(m));
      });
      let sc = 0;
      let app = 0;
      matchedQ.forEach(q => {
        const r = respMap[q.id];
        if (r && r.response_value && r.response_value !== 'na') {
          app++;
          if (r.response_value === 'yes') sc += 2;
          else if (r.response_value === 'partial') sc += 1;
        }
      });
      const pct = app > 0 ? Math.round((sc / (app * 2)) * 100) : 0;
      let risk = 'High';
      let riskDot = '🔴';
      let riskColor = '#ff3b47';
      if (pct >= 80) { risk = 'Low'; riskDot = '🟢'; riskColor = '#06d6a0'; }
      else if (pct >= 60) { risk = 'Medium'; riskDot = '🟡'; riskColor = '#ffd166'; }
      return { theme: rt.theme, score: pct, risk, riskDot, riskColor, count: matchedQ.length };
    });

    const sumGaps = fail + partial || 0;
    const severityList = [
      { level: 'Critical (₹250Cr Risk)', count: fail, pct: sumGaps > 0 ? Math.round((fail / sumGaps) * 100) : 0, dot: '🔴', color: '#ff3b47' },
      { level: 'High (₹200Cr Risk)', count: partial, pct: sumGaps > 0 ? Math.round((partial / sumGaps) * 100) : 0, dot: '🟠', color: '#ff8547' },
      { level: 'Medium (₹50Cr Risk)', count: 0, pct: 0, dot: '🟡', color: '#ffd166' },
      { level: 'Low / Minor', count: 0, pct: 0, dot: '🟢', color: '#06d6a0' },
    ];

    const keyGaps = responses
      .filter(r => ['no', 'partial'].includes(r.response_value))
      .map((r, i) => ({
        num: i + 1,
        area: r.theme || r.category || 'DPDP Obligation',
        gap: r.notes || r.title || r.question,
        severity: r.response_value === 'no' ? 'Critical' : 'High',
        recommendation: `Establish mandatory DPDP governance procedure for ${r.reference || ''}.`,
      }))
      .slice(0, 10);

    const maturityAreas = [
      { name: 'Consent Architecture', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: readinessPct >= 60 ? 3 : 2, dot: readinessPct >= 60 ? '🟢' : '🟡' },
      { name: 'Data Principal Rights', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: readinessPct >= 60 ? 3 : 2, dot: readinessPct >= 60 ? '🟢' : '🟡' },
      { name: 'Technical Safeguards', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Breach Incident Response', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Children Data Protections', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Significant Data Fiduciary (SDF)', rating: readinessPct >= 75 ? 'Defined' : 'Initial', col: 1, dot: '🔴' },
      { name: 'Data Protection Officer (DPO)', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: readinessPct >= 60 ? 3 : 2, dot: readinessPct >= 60 ? '🟢' : '🟡' },
      { name: 'Data Processor Governance', rating: readinessPct >= 75 ? 'Defined' : 'Developing', col: 2, dot: '🔴' },
      { name: 'Grievance Redressal', rating: readinessPct >= 60 ? 'Defined' : 'Developing', col: readinessPct >= 60 ? 3 : 2, dot: readinessPct >= 60 ? '🟢' : '🟡' },
      { name: 'Audit & DPIA', rating: readinessPct >= 75 ? 'Defined' : 'Initial', col: 1, dot: '🔴' },
    ];

    const maturityScoreNum = (1 + (readinessPct / 100) * 4).toFixed(1);
    let maturityRating = 'Developing';
    if (readinessPct >= 80) maturityRating = 'Optimized';
    else if (readinessPct >= 65) maturityRating = 'Managed';
    else if (readinessPct >= 50) maturityRating = 'Defined';
    else if (readinessPct >= 30) maturityRating = 'Developing';
    else maturityRating = 'Initial';

    const overallMaturity = `${maturityScoreNum} / 5 – ${maturityRating}`;

    return {
      hasSubmittedData: true,
      readinessPct,
      maturityScoreNum,
      maturityRating,
      compliantPct,
      partialPct,
      notImplPct,
      chapters,
      ruleThemes,
      severityList,
      sumGaps,
      keyGaps,
      maturityAreas,
      overallMaturity,
    };
  }, [responses, assessmentData]);

  if (!fw) return null;

  const isISO = frameworkSlug === 'iso-27001';
  const isDPDP = frameworkSlug === 'dpdp';
  const stats = isISO ? isoStats : dpdpStats;
  const currentReadiness = stats.readinessPct;
  const companyName = clientInfo?.company_name || 'Organization';

  // Questions catalog for Professional View
  const questionsCatalog = useMemo(() => {
    if (isISO) return isoQuestionnaireData.questions || [];
    if (isDPDP) return dpdpQuestionnaireData.questions || [];
    return [];
  }, [isISO, isDPDP]);

  // Unique categories/themes for filter dropdown
  const allCategories = useMemo(() => {
    return Array.from(new Set(questionsCatalog.map(q => q.theme || q.group || q.category).filter(Boolean)));
  }, [questionsCatalog]);

  // Filtered list for Professional View
  const filteredQuestions = useMemo(() => {
    const respMap = {};
    responses.forEach(r => { respMap[r.question_id] = r; });

    return questionsCatalog.filter(q => {
      const resp = respMap[q.id];
      const draft = reviewDrafts[q.id] || {};
      const status = draft.status || resp?.vciso_review_status || 'pending';

      // Proof files
      let pFiles = [];
      if (resp?.proof_files_json) {
        try {
          const parsed = JSON.parse(resp.proof_files_json);
          pFiles = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          if (resp?.proof_file_name) pFiles = [{ name: resp.proof_file_name, size: resp.proof_file_size, url: resp.proof_file_url }];
        }
      } else if (resp?.proof_file_name) {
        pFiles = [{ name: resp.proof_file_name, size: resp.proof_file_size || 0, url: resp.proof_file_url || `/api/evidence/file/${resp.proof_file_name}` }];
      }
      const hasProof = pFiles.length > 0;

      // Status filter
      if (proFilter === 'with_proof' && !hasProof) return false;
      if (proFilter === 'accepted' && status !== 'accepted' && status !== 'verified') return false;
      if (proFilter === 'rejected' && status !== 'rejected') return false;
      if (proFilter === 'pending' && status !== 'pending') return false;

      // Category filter
      if (proCategoryFilter !== 'all') {
        const cat = q.theme || q.group || q.category;
        if (cat !== proCategoryFilter) return false;
      }

      // Search filter
      if (proSearch.trim()) {
        const term = proSearch.toLowerCase();
        const refMatch = (q.reference || '').toLowerCase().includes(term);
        const titleMatch = (q.title || '').toLowerCase().includes(term);
        const qMatch = (q.question || '').toLowerCase().includes(term);
        const themeMatch = (q.theme || q.group || '').toLowerCase().includes(term);
        if (!refMatch && !titleMatch && !qMatch && !themeMatch) return false;
      }

      return true;
    });
  }, [questionsCatalog, responses, reviewDrafts, proFilter, proCategoryFilter, proSearch]);

  // Metrics for Professional View Top Bar
  const proMetrics = useMemo(() => {
    let withProof = 0;
    let accepted = 0;
    let rejected = 0;
    let pending = 0;

    const respMap = {};
    responses.forEach(r => { respMap[r.question_id] = r; });

    questionsCatalog.forEach(q => {
      const resp = respMap[q.id];
      const draft = reviewDrafts[q.id] || {};
      const status = draft.status || resp?.vciso_review_status || 'pending';

      let pFiles = [];
      if (resp?.proof_files_json) {
        try {
          const parsed = JSON.parse(resp.proof_files_json);
          pFiles = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {}
      } else if (resp?.proof_file_name) {
        pFiles = [resp.proof_file_name];
      }
      if (pFiles.length > 0) withProof++;

      if (status === 'accepted' || status === 'verified') accepted++;
      else if (status === 'rejected') rejected++;
      else pending++;
    });

    return {
      total: questionsCatalog.length,
      withProof,
      accepted,
      rejected,
      pending,
    };
  }, [questionsCatalog, responses, reviewDrafts]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 bg-slate-50 min-h-full font-sans text-slate-900 flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 text-sm font-medium">Loading {fw.name || frameworkSlug} audit report &amp; assessments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full font-sans text-slate-900">
      {/* ── Top Header Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{fw.icon}</span>
            <h1 className="text-slate-900 font-bold text-xl tracking-tight">{fw.name}</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Official vCISO Audit Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organization: <strong className="text-slate-800">{companyName}</strong> {clientInfo?.company_branch ? `(${clientInfo.company_branch})` : ''} · Industry: <span className="text-slate-600">{clientInfo?.industry || 'Technology'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ISMS Maturity Rating out of 5 */}
          <div className="text-right px-4 py-2 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-2xl font-black text-blue-700">{stats.maturityScoreNum}</span>
              <span className="text-xs font-bold text-slate-500">/ 5</span>
            </div>
            <div className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
              {isISO ? 'ISMS Maturity' : 'Compliance Maturity'} · {stats.maturityRating}
            </div>
          </div>

          {/* Audit Readiness % */}
          <div className="text-right px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className={`text-2xl font-black ${currentReadiness >= 75 ? 'text-emerald-600' : currentReadiness >= 50 ? 'text-amber-600' : currentReadiness > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              {currentReadiness}%
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Audit Readiness</div>
          </div>

          {activeTab === 'gap-analysis' && (
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf || !stats.hasSubmittedData}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{generatingPdf ? '⏳ Generating...' : '📥 Generate Report (PDF)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── View Switcher: Gap Assessment Report vs Professional View ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('gap-analysis')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'gap-analysis'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📊 Gap Assessment Report</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('professional-view')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'professional-view'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚖️ Professional View (Legal & Control Evidences)</span>
          </button>
        </div>

        {reviewSuccessMsg && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <span>✓</span>
            <span>{reviewSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: GAP ASSESSMENT REPORT — EXECUTIVE & DASHBOARD LAYOUT
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'gap-analysis' && (
        <div ref={reportRef} className="space-y-6 max-w-5xl mx-auto">

          {/* Unassessed / Empty State Banner */}
          {!stats.hasSubmittedData && (
            <div className="rounded-2xl p-6 border border-amber-200 bg-amber-50 text-center space-y-2">
              <div className="text-3xl">📋</div>
              <h3 className="text-base font-bold text-amber-900">No Assessment Submitted Yet</h3>
              <p className="text-xs text-amber-800 max-w-xl mx-auto leading-relaxed">
                The organization <strong className="text-slate-900">{companyName}</strong> has not yet submitted the {isISO ? 'ISO/IEC 27001:2022' : isDPDP ? 'DPDP Act, 2023 & Rules, 2025' : fw.name} gap assessment questionnaire.
                Once the client completes and submits their questionnaire, live audit readiness scores, clause-level metrics, and risk charts will automatically appear here.
              </p>
            </div>
          )}

          {/* Header Hero Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {isISO ? 'ISO/IEC 27001:2022' : isDPDP ? 'DPDP Act, 2023 & DPDP Rules, 2025' : fw.name}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2.5 tracking-tight">
                  {isISO ? 'ISMS GAP ASSESSMENT REPORT' : isDPDP ? 'DPDP GAP ASSESSMENT REPORT' : `${fw.name.toUpperCase()} GAP ASSESSMENT REPORT`}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                  <span>Organization: <strong className="text-slate-800">{companyName}</strong></span>
                  <span>Assessment Type: <strong className="text-blue-600">Initial {isISO ? 'ISMS' : 'Compliance'} Gap Assessment</strong></span>
                  <span>Overall Readiness: <strong className={currentReadiness >= 75 ? 'text-emerald-600' : currentReadiness >= 50 ? 'text-amber-600' : currentReadiness > 0 ? 'text-red-600' : 'text-slate-400'}>
                    {currentReadiness > 0 ? `${currentReadiness}% – ${currentReadiness >= 80 ? 'Certified Ready' : currentReadiness >= 50 ? 'Partially Ready' : 'Significant Gaps'}` : 'Not Assessed (0%)'}
                  </strong></span>
                </div>
              </div>

              <div className="flex items-center gap-5 sm:gap-8">
                {/* Maturity Score in Large Font */}
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-blue-600">{stats.maturityScoreNum}</span>
                    <span className="text-sm font-bold text-slate-400">/ 5</span>
                  </div>
                  <div className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mt-0.5">
                    {isISO ? 'ISMS Maturity' : 'Compliance'} · {stats.maturityRating}
                  </div>
                </div>

                <div className="h-10 w-[1px] bg-slate-200" />

                {/* Overall Readiness % */}
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-black text-slate-900">{currentReadiness}%</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Overall Readiness</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 1. Executive Dashboard ───────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">1. Executive Dashboard</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-4 border border-emerald-200 bg-emerald-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Compliant / Implemented
                  </span>
                  <span className="text-xl font-black text-emerald-700">{stats.compliantPct}%</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">Full control implementation & adequate proof</p>
              </div>

              <div className="rounded-xl p-4 border border-amber-200 bg-amber-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Partially Implemented
                  </span>
                  <span className="text-xl font-black text-amber-700">{stats.partialPct}%</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">Informal or partial practices with minor gaps</p>
              </div>

              <div className="rounded-xl p-4 border border-red-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Not Implemented
                  </span>
                  <span className="text-xl font-black text-red-700">{stats.notImplPct}%</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">Absence of formal control, policy or evidence</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong className="text-slate-900">Overall Assessment:</strong> {currentReadiness >= 75
                ? 'The organization demonstrates strong foundational security readiness with minor policy and operational remediations required before certification.'
                : currentReadiness > 0
                ? 'Significant improvements are required before certification readiness.'
                : 'No assessment responses recorded for this organization yet.'}
            </div>
          </div>

          {/* ── 2. Clause-wise / Chapter-wise Readiness ─────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                2. {isISO ? 'Clause-wise Readiness' : 'Chapter & Operative Rules Readiness'}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 pr-4">{isISO ? 'ISO 27001 Clause' : 'DPDP Chapter / Rule'}</th>
                    <th className="py-2.5 px-4 w-60">Readiness</th>
                    <th className="py-2.5 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isISO ? stats.clauses : stats.chapters).map(c => (
                    <tr key={c.name} className="hover:bg-slate-50 transition">
                      <td className="py-3 pr-4 font-semibold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${c.pct}%`,
                                background: c.pct >= 75 ? '#059669' : c.pct >= 50 ? '#D97706' : c.pct > 0 ? '#DC2626' : '#94A3B8'
                              }}
                            />
                          </div>
                          <span className="font-bold w-9 text-right text-blue-600">{c.pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 pl-4 text-right text-base">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clause Readiness Graph */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isISO ? 'Clause' : 'Chapter'} Readiness Graph
              </div>
              <div className="space-y-2.5">
                {(isISO ? stats.clauses : stats.chapters).map(c => (
                  <div key={c.name} className="flex items-center text-xs">
                    <span className="w-40 text-slate-700 font-medium truncate">{c.shortName || c.name}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden mx-3 bg-slate-200">
                      <div
                        className="h-full rounded-full transition-all bg-blue-600"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-900 w-9 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. Annex A Control Readiness ────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                3. {isISO ? 'Annex A Control Readiness' : 'Operative Rule Safeguards'}
              </h3>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 pr-4">{isISO ? 'Control Theme' : 'Theme / Safeguard'}</th>
                  <th className="py-2.5 px-4 text-center">Score</th>
                  <th className="py-2.5 pl-4 text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(isISO ? stats.annexThemes : stats.ruleThemes).map(a => (
                  <tr key={a.theme} className="hover:bg-slate-50 transition">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{a.theme}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600">{a.score}%</td>
                    <td className="py-3 pl-4 text-right">
                      <span className="inline-flex items-center gap-1.5 font-bold text-xs" style={{ color: a.riskColor }}>
                        <span>{a.riskDot}</span>
                        <span>{a.risk}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Graphical View */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Graphical View</div>
              <div className="space-y-2.5">
                {(isISO ? stats.annexThemes : stats.ruleThemes).map(a => (
                  <div key={a.theme} className="flex items-center text-xs">
                    <span className="w-40 text-slate-700 font-medium truncate">{a.theme}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden mx-3 bg-slate-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${a.score}%`,
                          background: a.score >= 75 ? '#059669' : a.score >= 50 ? '#D97706' : a.score > 0 ? '#DC2626' : '#94A3B8'
                        }}
                      />
                    </div>
                    <span className="font-bold text-slate-900 w-9 text-right">{a.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 4. Gap Severity Dashboard ────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">4. Gap Severity Dashboard</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full max-w-lg mx-auto text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 pr-4">Severity</th>
                    <th className="py-2.5 px-4 text-center">Gaps</th>
                    <th className="py-2.5 pl-4 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.severityList.map(s => (
                    <tr key={s.level} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 pr-4 font-semibold text-slate-900 flex items-center gap-2">
                        <span>{s.dot}</span>
                        <span style={{ color: s.color }}>{s.level}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-900">{s.count}</td>
                      <td className="py-2.5 pl-4 text-right text-slate-600">{s.pct}%</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                    <td className="py-3 pr-4">Total</td>
                    <td className="py-3 px-4 text-center">{stats.sumGaps}</td>
                    <td className="py-3 pl-4 text-right text-blue-600">{stats.sumGaps > 0 ? '100%' : '0%'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong className="text-red-600">Critical attention areas:</strong> Risk Assessment, Statement of Applicability, Access Control, Incident Management, Internal Audit and Management Review.
            </div>
          </div>

          {/* ── 5. Key Gaps Identified ──────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">5. Key Gaps Identified</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 pr-2 w-8">#</th>
                    <th className="py-2.5 px-3 w-32">Area</th>
                    <th className="py-2.5 px-3">Gap</th>
                    <th className="py-2.5 px-3 w-28">Severity</th>
                    <th className="py-2.5 pl-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.keyGaps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs font-semibold">
                        {stats.hasSubmittedData ? '✓ No critical nonconformities identified for this framework.' : 'No assessment data recorded for this organization yet.'}
                      </td>
                    </tr>
                  ) : (
                    stats.keyGaps.map(g => (
                      <tr key={g.num} className="hover:bg-slate-50 transition">
                        <td className="py-3 pr-2 font-bold text-slate-400">{g.num}</td>
                        <td className="py-3 px-3 font-semibold text-blue-600">{g.area}</td>
                        <td className="py-3 px-3 text-slate-900">{g.gap}</td>
                        <td className="py-3 px-3 font-semibold">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            g.severity === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                            g.severity === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span>{g.severity === 'Critical' ? '🔴' : g.severity === 'High' ? '🟠' : '🟡'}</span>
                            <span>{g.severity}</span>
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-slate-600">{g.recommendation}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 6. ISMS Maturity Heat Map ────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                6. {isISO ? 'ISMS' : 'Compliance'} Maturity Heat Map
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 pr-4 text-left">Area</th>
                    <th className="py-2.5 px-2">Initial</th>
                    <th className="py-2.5 px-2">Developing</th>
                    <th className="py-2.5 px-2">Defined</th>
                    <th className="py-2.5 px-2">Managed</th>
                    <th className="py-2.5 px-2">Optimized</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.maturityAreas.map(m => (
                    <tr key={m.name} className="hover:bg-slate-50 transition">
                      <td className="py-3 pr-4 text-left font-semibold text-slate-900">{m.name}</td>
                      <td className="py-3 px-2">{m.col === 1 ? m.dot : ''}</td>
                      <td className="py-3 px-2">{m.col === 2 ? m.dot : ''}</td>
                      <td className="py-3 px-2">{m.col === 3 ? m.dot : ''}</td>
                      <td className="py-3 px-2">{m.col === 4 ? m.dot : ''}</td>
                      <td className="py-3 px-2">{m.col === 5 ? m.dot : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              Current Overall Maturity: {stats.overallMaturity}
            </div>
          </div>

          {/* ── 7. Top Risk / Gap Areas ──────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">7. Top Risk / Gap Areas</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Risk Assessment', level: 'HIGH', dot: '🔴', color: '#DC2626' },
                { label: 'Statement of Applicability', level: 'HIGH', dot: '🔴', color: '#DC2626' },
                { label: 'Internal Audit', level: 'HIGH', dot: '🔴', color: '#DC2626' },
                { label: 'Management Review', level: 'HIGH', dot: '🔴', color: '#DC2626' },
                { label: 'Access Management', level: 'MEDIUM-HIGH', dot: '🟠', color: '#EA580C' },
                { label: 'Supplier Security', level: 'MEDIUM-HIGH', dot: '🟠', color: '#EA580C' },
                { label: 'Incident Management', level: 'MEDIUM-HIGH', dot: '🟠', color: '#EA580C' },
                { label: 'Awareness', level: 'MEDIUM', dot: '🟡', color: '#D97706' },
                { label: 'Physical Security', level: 'LOW', dot: '🟢', color: '#059669' },
              ].map(r => (
                <div key={r.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 truncate">{r.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: r.color, background: `${r.color}15`, border: `1px solid ${r.color}30` }}>
                    {r.dot} {r.level}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 8. Recommended Implementation Roadmap ───────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">8. Recommended Implementation Roadmap</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Phase 1 – Immediate | 0–30 Days</div>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                  <li>Define ISMS scope</li>
                  <li>Establish ISMS governance</li>
                  <li>Approve information security policy</li>
                  <li>Complete asset inventory</li>
                  <li>Conduct risk assessment</li>
                  <li>Develop risk treatment plan and SoA</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Phase 2 – Implementation | 31–60 Days</div>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                  <li>Implement required Annex A controls</li>
                  <li>Establish access management</li>
                  <li>Implement supplier security</li>
                  <li>Establish incident management</li>
                  <li>Conduct security awareness</li>
                  <li>Implement monitoring and measurement</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Phase 3 – Assurance | 61–90 Days</div>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                  <li>Review effectiveness of controls</li>
                  <li>Conduct internal audit</li>
                  <li>Close identified nonconformities</li>
                  <li>Conduct management review</li>
                  <li>Complete corrective actions</li>
                  <li>Perform certification readiness assessment</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Management Conclusion ────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Management Conclusion</h3>
            </div>

            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div>Current Readiness: <strong className="text-blue-600 text-sm">{currentReadiness}%</strong></div>
              <div>Target Certification Readiness: <strong className="text-emerald-600 text-sm">≥ 90%</strong></div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {stats.hasSubmittedData
                ? 'The assessment indicates that the organization has established certain information security practices; however, several requirements are either partially implemented or lack sufficient documented evidence.'
                : 'No assessment has been submitted for this framework yet. Once submitted, full management conclusions and findings will be generated.'}
            </p>

            <p className="text-xs text-slate-600 leading-relaxed">
              The priority should be to address <strong className="text-slate-900">risk management, Statement of Applicability, technological controls,
              internal audit and management review</strong> before proceeding to the certification audit.
            </p>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900 mb-2">Recommended Management Priority</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span><strong>Immediate:</strong> Risk Assessment → SoA → Critical Controls</span>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                  <span><strong>Next:</strong> Policies → Procedures → Evidence</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span><strong>Assurance:</strong> Monitoring → Internal Audit → Management Review</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span><strong>Target:</strong> ISO/IEC 27001 Certification Readiness</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: PROFESSIONAL VIEW — LEGAL TEXT & CONTROL EVIDENCES
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'professional-view' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Key Metrics Header Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
              <div className="text-xs text-slate-500 font-semibold">Total Requirements</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{proMetrics.total}</div>
            </div>
            <div
              onClick={() => setProFilter('with_proof')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-blue-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">With Evidence Attached</div>
              <div className="text-xl font-extrabold text-blue-600 mt-1">{proMetrics.withProof}</div>
            </div>
            <div
              onClick={() => setProFilter('accepted')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-emerald-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">vCISO Approved</div>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">{proMetrics.accepted}</div>
            </div>
            <div
              onClick={() => setProFilter('rejected')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-red-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">Action Required (Rejected)</div>
              <div className="text-xl font-extrabold text-red-600 mt-1">{proMetrics.rejected}</div>
            </div>
            <div
              onClick={() => setProFilter('pending')}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center cursor-pointer hover:border-amber-500 transition"
            >
              <div className="text-xs text-slate-500 font-semibold">Pending Audit</div>
              <div className="text-xl font-extrabold text-amber-600 mt-1">{proMetrics.pending}</div>
            </div>
          </div>

          {/* Search, Filter & Category Dropdown Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setProFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  proFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({proMetrics.total})
              </button>
              <button
                type="button"
                onClick={() => setProFilter('with_proof')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  proFilter === 'with_proof' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📁 With Evidence ({proMetrics.withProof})
              </button>
              <button
                type="button"
                onClick={() => setProFilter('accepted')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  proFilter === 'accepted' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-emerald-700 hover:bg-slate-200'
                }`}
              >
                🟢 Approved ({proMetrics.accepted})
              </button>
              <button
                type="button"
                onClick={() => setProFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  proFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-slate-100 text-red-700 hover:bg-slate-200'
                }`}
              >
                🔴 Rejected ({proMetrics.rejected})
              </button>
              <button
                type="button"
                onClick={() => setProFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  proFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-amber-700 hover:bg-slate-200'
                }`}
              >
                🟡 Pending ({proMetrics.pending})
              </button>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Category / Theme Dropdown */}
              <select
                value={proCategoryFilter}
                onChange={e => setProCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="all">All Sections / Themes ({allCategories.length})</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search clause, section, or keyword..."
                value={proSearch}
                onChange={e => setProSearch(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-52 shadow-sm"
              />
            </div>
          </div>

          {/* List of Controls in Professional View */}
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-400">
              No clauses or requirements matching active filter: <strong>{proFilter}</strong>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map(q => {
                const resp = responses.find(r => r.question_id === q.id);
                const draft = reviewDrafts[q.id] || { status: resp?.vciso_review_status || 'pending', notes: resp?.vciso_notes || '', rejectionReason: resp?.vciso_rejection_reason || '' };
                const isApproved = draft.status === 'accepted' || draft.status === 'verified';
                const isRejected = draft.status === 'rejected';

                // Parse attached evidence files
                let proofFileList = [];
                if (resp?.proof_files_json) {
                  try {
                    const parsed = JSON.parse(resp.proof_files_json);
                    proofFileList = Array.isArray(parsed) ? parsed : [parsed];
                  } catch (e) {
                    if (resp?.proof_file_name) {
                      proofFileList = [{
                        name: resp.proof_file_name,
                        size: resp.proof_file_size || 0,
                        url: resp.proof_file_url || `/api/evidence/file/${resp.proof_file_name}`,
                        download_url: `/api/evidence/download/${resp.proof_file_id || resp.proof_file_name}`,
                      }];
                    }
                  }
                } else if (resp?.proof_file_name) {
                  proofFileList = [{
                    name: resp.proof_file_name,
                    size: resp.proof_file_size || 0,
                    url: resp.proof_file_url || `/api/evidence/file/${resp.proof_file_name}`,
                    download_url: `/api/evidence/download/${resp.proof_file_id || resp.proof_file_name}`,
                  }];
                }

                const catTheme = q.theme || q.group || q.category || 'General';

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      isRejected
                        ? 'bg-red-50/20 border-red-200 shadow-sm'
                        : isApproved
                        ? 'bg-emerald-50/20 border-emerald-200 shadow-sm'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Control Reference & Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-blue-600 font-bold text-xs">{q.id}</span>
                          <span className="font-mono text-slate-800 font-bold text-xs px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {isISO ? `Clause ${q.reference}` : q.reference}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {q.title || q.reference}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${THEME_COLORS[catTheme] || '#2563EB'}15`,
                              color: THEME_COLORS[catTheme] || th('#2563EB', { dark: '#60A5FA' }),
                            }}
                          >
                            {catTheme}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{q.question}</p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {resp?.response_value ? (
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
                            Client Response: {resp.response_value.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase bg-slate-100 text-slate-500 border border-slate-200">
                            Not Assessed Yet
                          </span>
                        )}

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

                    {/* ── ⚖️ LEGAL TEXT PLACEHOLDER BOX ── */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-blue-200 text-xs mb-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <span>⚖️</span>
                          <span>Official Legal Text / Statutory Mandate:</span>
                        </span>
                        <span className="text-[10px] font-mono text-blue-600 font-normal">
                          {isISO ? `ISO/IEC 27001:2022 §${q.reference}` : `DPDP Act 2023 §${q.reference}`}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-serif italic text-xs leading-relaxed">
                        [Legal text to be provided by the company / legal counsel. Placeholder: Mandates that {isISO ? `the organization shall fulfill information security requirement ${q.reference} under ISO/IEC 27001 standard.` : `the data fiduciary shall ensure compliance with statutory obligation under ${q.reference} of the DPDP Act & Rules.`}]
                      </div>
                    </div>

                    {/* Client Stated Context / Justification */}
                    {resp?.notes && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-3">
                        <div className="text-[10px] font-bold text-blue-700 uppercase mb-0.5">💬 Client Stated Context / Justification:</div>
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
                          <span>No evidence proof files attached by client for this requirement.</span>
                        </div>
                      )}
                    </div>

                    {/* ── vCISO Audit Decision Panel ── */}
                    {(() => {
                      const hasProof = proofFileList.length > 0 || Boolean(resp?.proof_file_name);
                      const isAttestedCompliant = resp?.response_value === 'yes' || resp?.response_value === 'fully' || resp?.response_value === 'largely' || resp?.response_value === 'partial';
                      const isNo = resp?.response_value === 'no' || resp?.response_value === 'fail' || resp?.response_value === 'non_compliant';
                      const canReview = hasProof || (isAttestedCompliant && Boolean(resp?.response_value));

                      if (!canReview) {
                        return (
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            {isNo ? (
                              <div className="flex items-center gap-2 text-slate-700">
                                <span className="text-base text-red-600">⚠️</span>
                                <span>
                                  Client reported <strong>Non-Compliant</strong> with no evidence attached. This requirement is logged as an <strong>acknowledged compliance gap</strong> requiring remediation before audit verification.
                                </span>
                              </div>
                            ) : resp?.response_value === 'na' ? (
                              <div className="flex items-center gap-2 text-slate-600">
                                <span>ℹ️</span>
                                <span>Client marked this requirement as <strong>Not Applicable</strong>.</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-500">
                                <span>⏳</span>
                                <span>Awaiting client assessment response and evidence submission for this requirement.</span>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                              <span>⚖️</span> vCISO Audit Determination &amp; Feedback:
                            </span>
                            {resp?.reviewed_by && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Audited by: <strong className="text-slate-800">{resp.reviewed_by}</strong> ({new Date(resp.reviewed_at || Date.now()).toLocaleDateString()})
                              </span>
                            )}
                          </div>

                          {/* Decision Selection Buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setReviewDrafts(prev => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], status: 'accepted' }
                              }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                draft.status === 'accepted' || draft.status === 'verified'
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>🟢 Approve / Accept Evidence</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReviewDrafts(prev => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], status: 'rejected' }
                              }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                draft.status === 'rejected'
                                  ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>🔴 Reject (Changes Requested)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReviewDrafts(prev => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], status: 'pending' }
                              }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                draft.status === 'pending'
                                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>🟡 Mark Pending Review</span>
                            </button>
                          </div>

                          {/* Auditor Comments Input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-700 uppercase">
                              {draft.status === 'rejected' ? 'Rejection Reason / Required Actions (Mandatory):' : 'Audit Observations & Guidance Notes:'}
                            </label>
                            <textarea
                              rows={2}
                              placeholder={
                                draft.status === 'rejected'
                                  ? 'Explain specific non-conformities and remediation steps needed from the client...'
                                  : 'Add optional auditor observations or implementation advice...'
                              }
                              value={draft.notes || draft.rejectionReason || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setReviewDrafts(prev => ({
                                  ...prev,
                                  [q.id]: { ...prev[q.id], notes: val, rejectionReason: val }
                                }));
                              }}
                              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>

                          {/* Save Decision Button */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500">
                              {draft.saving ? '⏳ Saving decision...' : 'Saves to the database and syncs with Client Assessment Audits'}
                            </span>
                            <button
                              type="button"
                              disabled={draft.saving}
                              onClick={() => handleSaveProDecision(q.id, draft.status)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50"
                            >
                              <span>{draft.saving ? 'Saving...' : '💾 Save Audit Determination'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
