import React, { useState, useEffect, useMemo } from 'react';
import questionnaireData from '../../data/iso27001_questionnaire.json';
import { th } from '../../theme';
import { useAuth } from '../../AuthContext';

const THEME_CONFIG = {
  'Context of the Organization': { color: '#0284c7', icon: '🌐', clause: 'Clause 4' },
  'Leadership':                   { color: '#9333ea', icon: '👑', clause: 'Clause 5' },
  'Planning':                     { color: '#4f46e5', icon: '📐', clause: 'Clause 6' },
  'Support':                      { color: '#059669', icon: '🤝', clause: 'Clause 7' },
  'Operation':                    { color: '#d97706', icon: '⚙️', clause: 'Clause 8' },
  'Performance Evaluation':       { color: '#db2777', icon: '📈', clause: 'Clause 9' },
  'Improvement':                  { color: '#0891b2', icon: '🔄', clause: 'Clause 10' },
  'A.5 Organizational Controls':  { color: th('#2563eb', { dark: '#60A5FA' }), icon: '🏛️', clause: 'A.5' },
  'A.6 People Controls':          { color: '#059669', icon: '👥', clause: 'A.6' },
  'A.7 Physical Controls':        { color: '#ea580c', icon: '🏢', clause: 'A.7' },
  'A.8 Technological Controls':   { color: '#7c3aed', icon: '💻', clause: 'A.8' },
};

const FRAMEWORKS = [
  { id: 'iso27001-2022', name: 'ISO/IEC 27001:2022', icon: '🛡️', status: 'active', totalQ: 123, target: '≥ 71%' },
  { id: 'dpdpa',          name: 'DPDPA 2023 (India)', icon: '🇮🇳', status: 'coming_soon', totalQ: 48, target: '≥ 80%' },
  { id: 'soc2',           name: 'SOC 2 Type II',      icon: '🔒', status: 'coming_soon', totalQ: 64, target: '≥ 85%' },
  { id: 'nist-csf',       name: 'NIST CSF 2.0',        icon: '🏛️', status: 'coming_soon', totalQ: 106, target: '≥ 75%' },
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

export default function GapAnalysisPage() {
  const { getToken } = useAuth();
  const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('client-001');
  const [selectedFramework, setSelectedFramework] = useState('iso27001-2022');
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' | 'critical_gaps' | 'weaknesses' | 'compliant' | 'soa' | 'roadmap'
  const [verificationMap, setVerificationMap] = useState({});
  const [detailedAssessment, setDetailedAssessment] = useState(null);
  const [isLiveFromDb, setIsLiveFromDb] = useState(false);

  // Generate realistic, customized 0-4 maturity profiles tailored for each client
  const getClientAssessmentProfile = (client, frameworkId) => {
    const questions = questionnaireData.questions || [];
    const isAcme = client.id === 'client-001' || client.name.toLowerCase().includes('acme');
    const isTechNova = client.id === 'client-002' || client.name.toLowerCase().includes('technova');
    const isHealthFirst = client.id === 'client-003' || client.name.toLowerCase().includes('healthfirst');

    const demoAnswers = {};
    const demoFiles = {};
    const demoNotes = {};

    let totalScore = 0;
    let applicableQuestions = 0;
    let compliantCount = 0;
    let partialCount = 0;
    let nonCompliantCount = 0;
    let naCount = 0;
    let proofCount = 0;
    let critGaps = 0;
    let highGaps = 0;
    let medGaps = 0;
    let lowGaps = 0;

    questions.forEach((q, idx) => {
      let score = 2;
      let val = 'partial';
      let stat = 'Partially Implemented';
      let note = '';
      let hasFile = false;

      if (isTechNova) {
        // TechNova Inc. — High Maturity (~84%, Cloud SaaS / DevOps)
        if (q.category === 'Clause' && (q.reference.startsWith('5.') || q.reference.startsWith('9.'))) {
          const m = idx % 5;
          if (m === 0) {
            score = 2; val = 'partial'; stat = 'Partially Implemented';
            note = 'Executive management reviews conducted semi-annually; formal ISO meeting minutes require archival.';
          } else {
            score = 4; val = 'fully'; stat = 'Fully Implemented'; hasFile = true;
          }
        } else if (q.theme.includes('Physical')) {
          if (idx % 3 === 0) {
            score = null; val = 'na'; stat = 'Not Applicable';
            note = '100% remote-first distributed engineering team; no physical data centers owned (all on AWS/GCP).';
          } else {
            score = 3; val = 'largely'; stat = 'Largely Implemented';
            note = 'Coworking space physical security handled via enterprise WeWork & Regus security SLAs.';
          }
        } else if (q.theme.includes('Technological') || q.theme.includes('Organizational')) {
          const m = idx % 10;
          if (m < 7) {
            score = 4; val = 'fully'; stat = 'Fully Implemented'; hasFile = true;
          } else if (m < 9) {
            score = 3; val = 'largely'; stat = 'Largely Implemented';
            note = 'Automated CI/CD security scanning & Dependabot active; SAST tool vulnerability exceptions under annual re-certification.';
          } else {
            score = 2; val = 'partial'; stat = 'Partially Implemented';
            note = 'AWS CloudTrail & Datadog multi-region enabled; log retention policy needs extension from 90 to 365 days.';
          }
        } else {
          const m = idx % 4;
          if (m < 3) {
            score = 4; val = 'fully'; stat = 'Fully Implemented'; hasFile = true;
          } else {
            score = 3; val = 'largely'; stat = 'Largely Implemented';
            note = 'Security awareness training integrated into employee onboarding via KnowBe4 automated LMS platform.';
          }
        }
      } else if (isHealthFirst) {
        // HealthFirst Medical — Developing / Low-Medium Maturity (~47%, Healthcare / Hospital)
        if (q.theme.includes('Physical')) {
          score = 4; val = 'fully'; stat = 'Fully Implemented'; hasFile = true;
        } else if (q.theme.includes('Technological')) {
          const m = idx % 6;
          if (m === 0) {
            score = 0; val = 'not_implemented'; stat = 'Not Implemented';
            note = 'Legacy hospital biomedical ultrasound/MRI workstations lack centralized endpoint EDR and automated patching.';
          } else if (m === 1) {
            score = 1; val = 'initial'; stat = 'Initial';
            note = 'Clinical hospital network segmentation is in early pilot; medical IoT telemetry resides on shared clinical VLAN.';
          } else if (m < 4) {
            score = 2; val = 'partial'; stat = 'Partially Implemented';
            note = 'Manual EHR (Electronic Health Records) access reviews conducted by ward nurse managers without automated SIEM alerts.';
          } else {
            score = 3; val = 'largely'; stat = 'Largely Implemented';
            note = 'Hospital Active Directory enforces 14-char passwords with clinician smart card tap-in integration.';
          }
        } else if (q.category === 'Clause' && (q.reference.startsWith('6.') || q.reference.startsWith('9.'))) {
          const m = idx % 4;
          if (m === 0) {
            score = 0; val = 'not_implemented'; stat = 'Not Implemented';
            note = 'Hospital risk assessments focus strictly on clinical patient safety, not ISO/IEC 27001 information assets.';
          } else if (m === 1) {
            score = 1; val = 'initial'; stat = 'Initial';
            note = 'Ad-hoc internal audits conducted for NABH hospital accreditation, lacking dedicated ISO 27001 ISMS scope.';
          } else {
            score = 2; val = 'partial'; stat = 'Partially Implemented';
            note = 'Hospital information asset register currently maintained in spreadsheets by IT bio-medical team.';
          }
        } else {
          const m = idx % 5;
          if (m < 2) {
            score = 4; val = 'fully'; stat = 'Fully Implemented'; hasFile = true;
          } else if (m < 4) {
            score = 2; val = 'partial'; stat = 'Partially Implemented';
            note = 'Clinical nursing staff trained on HIPAA & patient confidentiality; technical cyber drill exercises pending.';
          } else {
            score = 1; val = 'initial'; stat = 'Initial';
            note = 'Hospital third-party medical device vendors not subject to formal cybersecurity vendor due diligence.';
          }
        }
      } else {
        // Acme Corporation — Partially Ready (~69% baseline matching client PDF report)
        const mod = idx % 20;
        if (mod < 7) {
          score = 4; val = 'fully'; stat = 'Fully Implemented'; hasFile = true;
        } else if (mod < 11) {
          score = 3; val = 'largely'; stat = 'Largely Implemented';
          note = 'Core manufacturing automation controls active; standard operating procedure is under annual management review.';
        } else if (mod < 15) {
          score = 2; val = 'partial'; stat = 'Partially Implemented';
          note = 'Supply chain warehouse ERP process exists; lacks automated quarterly access audit logs.';
        } else if (mod < 17) {
          score = 1; val = 'initial'; stat = 'Initial';
          note = 'Informal factory shop-floor security performed by plant leads; no written ISO policy or formal ownership.';
        } else if (mod < 19) {
          score = 0; val = 'not_implemented'; stat = 'Not Implemented';
          note = 'Control is absent from organization. Require vCISO tooling, templates, and baseline architecture.';
        } else {
          score = null; val = 'na'; stat = 'Not Applicable';
          note = 'Organization does not host physical on-premise data centers (100% Cloud Native) or develop bespoke software.';
        }
      }

      demoAnswers[q.id] = { value: val, status: stat, score: score, level: score };
      if (note) demoNotes[q.id] = note;
      if (hasFile) {
        const ext = idx % 2 === 0 ? 'pdf' : 'docx';
        const clientPrefix = isTechNova ? 'TechNova_Cloud' : isHealthFirst ? 'HealthFirst_Clinical' : 'Acme_Industrial';
        demoFiles[q.id] = {
          name: `Evidence_${q.reference.replace(/[^a-zA-Z0-9]/g, '_')}_${clientPrefix}_Policy_v2.${ext}`,
          size: Math.floor(Math.random() * 400000 + 45000),
          type: ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
      }

      if (val !== 'na' && score !== null) {
        totalScore += score;
        applicableQuestions++;
        if (score === 4) { compliantCount++; proofCount++; }
        else if (score === 3) { partialCount++; lowGaps++; }
        else if (score === 2) { partialCount++; medGaps++; }
        else if (score === 1) { nonCompliantCount++; highGaps++; }
        else if (score === 0) { nonCompliantCount++; critGaps++; }
      } else {
        naCount++;
      }
    });

    const maxApplicableScore = applicableQuestions * 4;
    const readinessPct = maxApplicableScore > 0 ? Math.round((totalScore / maxApplicableScore) * 100) : 0;

    // Clause and Annex A theme breakdowns
    const themeMap = {};
    questions.forEach(q => {
      if (!themeMap[q.theme]) {
        themeMap[q.theme] = {
          theme: q.theme,
          clause: THEME_CONFIG[q.theme]?.clause || q.theme,
          icon: THEME_CONFIG[q.theme]?.icon || '📁',
          color: THEME_CONFIG[q.theme]?.color || '#00c2c7',
          total: 0,
          applicable: 0,
          score: 0,
          fully: 0,
          largely: 0,
          partial: 0,
          initial: 0,
          not_implemented: 0,
          na: 0,
        };
      }
      const t = themeMap[q.theme];
      t.total++;
      const ans = demoAnswers[q.id];
      if (ans.value !== 'na') {
        t.applicable++;
        t.score += ans.score;
        if (ans.score === 4) t.fully++;
        else if (ans.score === 3) t.largely++;
        else if (ans.score === 2) t.partial++;
        else if (ans.score === 1) t.initial++;
        else if (ans.score === 0) t.not_implemented++;
      } else {
        t.na++;
      }
    });

    const themeBreakdown = Object.values(themeMap).map(t => {
      const maxScore = t.applicable * 4;
      const pct = maxScore > 0 ? Math.round((t.score / maxScore) * 100) : 0;
      let risk = 'Low';
      if (pct < 50) risk = 'High';
      else if (pct < 75) risk = 'Medium';
      return { ...t, readinessPct: pct, risk };
    });

    const maturityScore = (readinessPct / 20).toFixed(1);
    let maturityLabel = 'Initial';
    if (readinessPct >= 81) maturityLabel = 'Optimized';
    else if (readinessPct >= 61) maturityLabel = 'Managed';
    else if (readinessPct >= 41) maturityLabel = 'Defined';
    else if (readinessPct >= 21) maturityLabel = 'Developing';

    const totalGaps = critGaps + highGaps + medGaps + lowGaps;

    return {
      id: `assess-${client.id}-${frameworkId}`,
      client_id: client.id,
      company_name: client.name,
      industry: client.industry || 'Technology',
      framework_id: frameworkId,
      framework_name: 'ISO/IEC 27001:2022',
      status: 'submitted',
      target_date: '2026-12-31',
      readiness_score: readinessPct,
      maturity: {
        score: maturityScore,
        label: maturityLabel,
      },
      stats: {
        totalQuestions: questions.length,
        applicableQuestions,
        totalScore,
        maxApplicableScore,
        readinessPct,
        compliantCount,
        compliantPct: Math.round((compliantCount / applicableQuestions) * 100),
        partialCount,
        partialPct: Math.round((partialCount / applicableQuestions) * 100),
        nonCompliantCount,
        nonCompliantPct: Math.round((nonCompliantCount / applicableQuestions) * 100),
        naCount,
        proofCount,
        totalGaps,
        critGaps,
        critGapsPct: totalGaps > 0 ? Math.round((critGaps / totalGaps) * 100) : 0,
        highGaps,
        highGapsPct: totalGaps > 0 ? Math.round((highGaps / totalGaps) * 100) : 0,
        medGaps,
        medGapsPct: totalGaps > 0 ? Math.round((medGaps / totalGaps) * 100) : 0,
        lowGaps,
        lowGapsPct: totalGaps > 0 ? Math.round((lowGaps / totalGaps) * 100) : 0,
      },
      themeBreakdown,
      answers: demoAnswers,
      files: demoFiles,
      notes: demoNotes,
      questions,
    };
  };

  // Fetch clients & submitted assessments from API
  const loadData = () => {
    setLoading(true);

    // Fetch clients
    fetch('/api/clients', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : []))
      .then(clientList => {
        if (Array.isArray(clientList) && clientList.length > 0) {
          setClients(clientList);
          if (!selectedClientId) setSelectedClientId(clientList[0].id);
        } else {
          setClients([
            { id: 'client-001', name: 'Acme Corporation', industry: 'Manufacturing & Supply Chain' },
            { id: 'client-002', name: 'TechNova Inc.', industry: 'Cloud SaaS & AI Analytics' },
            { id: 'client-003', name: 'HealthFirst Medical', industry: 'Hospital & Clinical Healthcare' },
          ]);
        }
      })
      .catch(() => {
        setClients([
          { id: 'client-001', name: 'Acme Corporation', industry: 'Manufacturing & Supply Chain' },
          { id: 'client-002', name: 'TechNova Inc.', industry: 'Cloud SaaS & AI Analytics' },
          { id: 'client-003', name: 'HealthFirst Medical', industry: 'Hospital & Clinical Healthcare' },
        ]);
      });

    // Fetch assessments summary list
    fetch('/api/vciso/assessments', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAssessments(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch detailed assessment with question-by-question responses when client changes
  useEffect(() => {
    if (!selectedClientId) return;
    const targetId = `assess-${selectedClientId}-${selectedFramework}`;

    fetch(`/api/vciso/assessments/${targetId}`, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error('Not found in DB');
        return r.json();
      })
      .then(fullData => {
        if (fullData && Array.isArray(fullData.responses) && fullData.responses.length > 0) {
          setDetailedAssessment(fullData);
          setIsLiveFromDb(true);
        } else {
          setDetailedAssessment(null);
          setIsLiveFromDb(false);
        }
      })
      .catch(() => {
        setDetailedAssessment(null);
        setIsLiveFromDb(false);
      });
  }, [selectedClientId, selectedFramework, assessments]);

  // Selected client
  const currentClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || clients[0] || { id: 'client-001', name: 'Acme Corporation' };
  }, [clients, selectedClientId]);

  // Merge live database assessment if available, otherwise use demoDataset
  const assessmentData = useMemo(() => {
    if (detailedAssessment && Array.isArray(detailedAssessment.responses)) {
      const dbAnswers = {};
      const dbFiles = {};
      const dbNotes = {};
      const questionsList = questionnaireData.questions || [];

      let totalScore = 0;
      let applicableQuestions = 0;
      let compliantCount = 0;
      let partialCount = 0;
      let nonCompliantCount = 0;
      let naCount = 0;
      let proofCount = 0;
      let critGaps = 0;
      let highGaps = 0;
      let medGaps = 0;
      let lowGaps = 0;

      detailedAssessment.responses.forEach(r => {
        dbAnswers[r.question_id] = {
          value: r.response_value,
          status: r.status,
          score: r.score,
        };
        if (r.proof_file_name) {
          dbFiles[r.question_id] = {
            name: r.proof_file_name,
            size: r.proof_file_size,
            type: r.proof_file_type,
          };
          proofCount++;
        }
        if (r.notes) {
          dbNotes[r.question_id] = r.notes;
        }

        if (r.response_value !== 'na' && r.score !== null && r.score !== undefined) {
          applicableQuestions++;
          totalScore += Number(r.score);
          if (r.score === 4) compliantCount++;
          else if (r.score === 3) { partialCount++; lowGaps++; }
          else if (r.score === 2) { partialCount++; medGaps++; }
          else if (r.score === 1) { nonCompliantCount++; highGaps++; }
          else if (r.score === 0) { nonCompliantCount++; critGaps++; }
        } else if (r.response_value === 'na') {
          naCount++;
        }
      });

      const maxApplicableScore = applicableQuestions * 4;
      const readinessPct = maxApplicableScore > 0 ? Math.round((totalScore / maxApplicableScore) * 100) : (detailedAssessment.readiness_score || 0);

      // Recompute themes from live rows
      const themeMap = {};
      questionsList.forEach(q => {
        if (!themeMap[q.theme]) {
          themeMap[q.theme] = {
            theme: q.theme,
            clause: THEME_CONFIG[q.theme]?.clause || q.theme,
            icon: THEME_CONFIG[q.theme]?.icon || '📁',
            color: THEME_CONFIG[q.theme]?.color || '#00c2c7',
            total: 0,
            applicable: 0,
            score: 0,
            fully: 0,
            largely: 0,
            partial: 0,
            initial: 0,
            not_implemented: 0,
            na: 0,
          };
        }
        const t = themeMap[q.theme];
        t.total++;
        const ans = dbAnswers[q.id];
        if (ans && ans.value !== 'na') {
          t.applicable++;
          t.score += Number(ans.score || 0);
          if (ans.score === 4) t.fully++;
          else if (ans.score === 3) t.largely++;
          else if (ans.score === 2) t.partial++;
          else if (ans.score === 1) t.initial++;
          else if (ans.score === 0) t.not_implemented++;
        } else if (ans && ans.value === 'na') {
          t.na++;
        }
      });

      const themeBreakdown = Object.values(themeMap).map(t => {
        const maxScore = t.applicable * 4;
        const pct = maxScore > 0 ? Math.round((t.score / maxScore) * 100) : 0;
        let risk = 'Low';
        if (pct < 50) risk = 'High';
        else if (pct < 75) risk = 'Medium';
        return { ...t, readinessPct: pct, risk };
      });

      const totalGaps = critGaps + highGaps + medGaps + lowGaps;
      const maturityScore = (readinessPct / 20).toFixed(1);
      let maturityLabel = 'Initial';
      if (readinessPct >= 81) maturityLabel = 'Optimized';
      else if (readinessPct >= 61) maturityLabel = 'Managed';
      else if (readinessPct >= 41) maturityLabel = 'Defined';
      else if (readinessPct >= 21) maturityLabel = 'Developing';

      return {
        id: detailedAssessment.id,
        client_id: detailedAssessment.client_id || currentClient.id,
        company_name: detailedAssessment.company_name || currentClient.name,
        industry: detailedAssessment.client_industry || currentClient.industry || 'Technology',
        framework_id: detailedAssessment.framework_id || selectedFramework,
        framework_name: detailedAssessment.framework_name || 'ISO/IEC 27001:2022',
        status: detailedAssessment.status || 'submitted',
        target_date: detailedAssessment.target_date || '2026-12-31',
        readiness_score: readinessPct,
        updated_at: detailedAssessment.updated_at,
        maturity: {
          score: maturityScore,
          label: maturityLabel,
        },
        stats: {
          totalQuestions: questionsList.length,
          applicableQuestions,
          totalScore,
          maxApplicableScore,
          readinessPct,
          compliantCount,
          compliantPct: applicableQuestions > 0 ? Math.round((compliantCount / applicableQuestions) * 100) : 0,
          partialCount,
          partialPct: applicableQuestions > 0 ? Math.round((partialCount / applicableQuestions) * 100) : 0,
          nonCompliantCount,
          nonCompliantPct: applicableQuestions > 0 ? Math.round((nonCompliantCount / applicableQuestions) * 100) : 0,
          naCount,
          proofCount,
          totalGaps,
          critGaps,
          critGapsPct: totalGaps > 0 ? Math.round((critGaps / totalGaps) * 100) : 0,
          highGaps,
          highGapsPct: totalGaps > 0 ? Math.round((highGaps / totalGaps) * 100) : 0,
          medGaps,
          medGapsPct: totalGaps > 0 ? Math.round((medGaps / totalGaps) * 100) : 0,
          lowGaps,
          lowGapsPct: totalGaps > 0 ? Math.round((lowGaps / totalGaps) * 100) : 0,
        },
        themeBreakdown,
        answers: dbAnswers,
        files: dbFiles,
        notes: dbNotes,
        questions: questionsList,
      };
    }

    return getClientAssessmentProfile(currentClient, selectedFramework);
  }, [detailedAssessment, currentClient, selectedFramework]);

  const { stats, themeBreakdown, questions, answers, files, notes } = assessmentData;

  const handleToggleVerify = (qId) => {
    const current = verificationMap[qId] || 'pending';
    const nextStatus = current === 'verified' ? 'needs_remediation' : 'verified';
    setVerificationMap(prev => ({ ...prev, [qId]: nextStatus }));

    const responseId = `resp-assess-${selectedClientId}-${selectedFramework}-${qId}`;
    fetch(`/api/vciso/assessments/responses/${responseId}/verify`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewStatus: nextStatus }),
    }).catch(() => {});
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Group clauses vs Annex A controls
  const managementClauses = themeBreakdown.filter(t => t.clause.startsWith('Clause'));
  const annexAThemes = themeBreakdown.filter(t => t.clause.startsWith('A.'));

  // Calculate ISMS Maturity Heat Map Level per Area (1: Initial, 2: Developing, 3: Defined, 4: Managed, 5: Optimized)
  const ismsHeatMap = useMemo(() => {
    return ISMS_AREAS.map(area => {
      // Find matching questions by clause or keywords
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
      // Map 0-4 average score to 1-5 maturity level
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

  // Section 8: Top Risk & Gap Areas List (Dynamically tailored per client)
  const topRiskAreas = useMemo(() => {
    const isTechNova = currentClient.id === 'client-002' || currentClient.name.toLowerCase().includes('technova');
    const isHealthFirst = currentClient.id === 'client-003' || currentClient.name.toLowerCase().includes('healthfirst');

    if (isTechNova) {
      return [
        { name: 'Cloud Sub-Processor & Third-Party Vendor Risk', severity: 'HIGH', color: '#ef4444', icon: '🔴', ref: 'A.5.19 & A.5.20' },
        { name: 'Continuous Automated Log Retention & SIEM Archival', severity: 'HIGH', color: '#ef4444', icon: '🔴', ref: 'A.8.15 & A.8.16' },
        { name: 'Formal ISMS Management Review Minutes', severity: 'MEDIUM-HIGH', color: '#f97316', icon: '🟠', ref: 'Clause 9.3' },
        { name: 'Disaster Recovery & Multi-AZ Failover Drills', severity: 'MEDIUM-HIGH', color: '#f97316', icon: '🟠', ref: 'A.5.29 & A.5.30' },
        { name: 'Physical Office / Coworking Access SLA Reviews', severity: 'MEDIUM', color: '#f59e0b', icon: '🟡', ref: 'A.7.1 & A.7.2' },
        { name: 'Cloud IAM, Okta SSO & MFA Zero-Trust Architecture', severity: 'LOW', color: '#10b981', icon: '🟢', ref: 'A.5.15, A.8.2' },
      ];
    }

    if (isHealthFirst) {
      return [
        { name: 'Legacy Medical Device & IoMT Network Segmentation', severity: 'CRITICAL', color: '#ef4444', icon: '🔴', ref: 'A.8.20 & A.8.22' },
        { name: 'Formal ISMS Risk Assessment & Treatment Plan', severity: 'CRITICAL', color: '#ef4444', icon: '🔴', ref: 'Clause 6.1.2 & 6.1.3' },
        { name: 'Statement of Applicability (SoA) Formulation', severity: 'CRITICAL', color: '#ef4444', icon: '🔴', ref: 'Clause 6.1.3 (d)' },
        { name: 'EHR / Patient Data Loss Prevention & Encryption', severity: 'HIGH', color: '#f97316', icon: '🟠', ref: 'A.8.12 & A.8.24' },
        { name: 'Clinical Cyber Incident Response & Patient Safety', severity: 'HIGH', color: '#f97316', icon: '🟠', ref: 'A.5.24 & A.5.26' },
        { name: 'Biomedical Vendor Due Diligence & SLAs', severity: 'MEDIUM', color: '#f59e0b', icon: '🟡', ref: 'A.5.19 & A.5.21' },
        { name: 'Hospital Physical Biometric & Ward Access Security', severity: 'LOW', color: '#10b981', icon: '🟢', ref: 'A.7.1 & A.7.2' },
      ];
    }

    // Default / Acme Corporation
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
  }, [currentClient]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-full text-slate-900">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-xl bg-blue-50 border border-blue-100 shadow-sm">📊</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">ISMS Gap Assessment Report</h1>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  ISO/IEC 27001:2022
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full Gap Assessment, Heat Maps, Top Risk Areas &amp; 3-Phase Implementation Roadmap
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isLiveFromDb ? (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Database Synchronized</span>
            </span>
          ) : (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5 shadow-sm">
              <span>⚡ Sample Simulation Ready</span>
            </span>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs font-bold px-3.5 py-2.5 rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
            title="Fetch latest submissions from database"
          >
            <span>{loading ? '⏳' : '🔄'}</span>
            <span>Refresh DB</span>
          </button>

          <a
            href="/questionnaire/iso27001"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold px-4 py-2.5 rounded-xl text-white shadow-sm flex items-center gap-2 transition bg-blue-600 hover:bg-blue-700"
          >
            <span>📋 Client Questionnaire</span>
            <span>↗</span>
          </a>
          <button
            onClick={() => window.print()}
            className="text-xs font-bold px-4 py-2.5 rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition flex items-center gap-2"
          >
            <span>🖨️ Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Client Cards Selector Grid ─────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          <span>Managed Clients ({clients.length})</span>
          <span className="text-blue-600 font-semibold normal-case">Select a client card to view full gap report</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {clients.map(c => {
            const isSelected = selectedClientId === c.id;
            const clientAssess = assessments.find(a => a.client_id === c.id && a.framework_id === selectedFramework);
            const fallbackProfile = getClientAssessmentProfile(c, selectedFramework);
            const score = clientAssess?.readiness_score || fallbackProfile.stats.readinessPct;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClientId(c.id)}
                className={`p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between shadow-sm ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-100 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{c.name}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                      <span>🏭 {c.industry || 'Technology'}</span>
                      <span>•</span>
                      <span>📅 Audit: 2026-12-31</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className="text-xl font-black tabular-nums"
                      style={{ color: score >= 71 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626' }}
                    >
                      {score}%
                    </span>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      {score >= 71 ? 'Ready' : score >= 50 ? 'Partially Ready' : 'Significant Gaps'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">ISO 27001 Intake:</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Submitted &amp; Computed
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Framework Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FRAMEWORKS.map(fw => {
          const isSelected = selectedFramework === fw.id;
          const isAvailable = fw.status === 'active';
          return (
            <button
              key={fw.id}
              onClick={() => isAvailable && setSelectedFramework(fw.id)}
              disabled={!isAvailable}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isAvailable
                  ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <span>{fw.icon}</span>
              <span>{fw.name}</span>
              {fw.status === 'coming_soon' ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">Coming Soon</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {fw.totalQ}Q · Target {fw.target}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── SECTION 1 & 2: Executive Dashboard ─────────────────── */}
      <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 2 · Executive Dashboard</div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {currentClient.name} — Overall ISMS Readiness: <span className="text-blue-600">{stats.readinessPct}%</span> ({stats.readinessPct >= 71 ? 'Certification Ready' : stats.readinessPct >= 50 ? 'Partially Ready' : 'Significant Gaps'})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Overall Assessment: <strong className="text-slate-800 font-semibold">Significant improvements are required before certification readiness.</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Target Readiness:</span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              ≥ 71%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Radial Readiness Score Widget */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#E2E8F0" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke={stats.readinessPct >= 71 ? '#10B981' : stats.readinessPct >= 50 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="10"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 - (263.89 * stats.readinessPct) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                  {stats.readinessPct}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                  ISMS Readiness
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div
                className="text-xs font-bold px-3 py-1 rounded-full inline-block border"
                style={{
                  background: stats.readinessPct >= 71 ? th('#ECFDF5', { dark: '#0B2E24' }) : stats.readinessPct >= 50 ? th('#FFFBEB', { dark: '#3A2A0A' }) : th('#FEF2F2', { dark: '#3A1418' }),
                  color: stats.readinessPct >= 71 ? '#059669' : stats.readinessPct >= 50 ? '#D97706' : '#DC2626',
                  borderColor: stats.readinessPct >= 71 ? th('#A7F3D0', { dark: '#065F46' }) : stats.readinessPct >= 50 ? th('#FDE68A', { dark: '#78350F' }) : th('#FECACA', { dark: '#7F1D1D' }),
                }}
              >
                {stats.readinessPct >= 71 ? '🟢 Certification Ready' : stats.readinessPct >= 50 ? '🟡 Partially Ready' : '🔴 Significant Gaps'}
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Formula: Σ Actual ({stats.totalScore}) ÷ Σ Max ({stats.maxApplicableScore}) × 100
              </p>
            </div>
          </div>

          {/* 4 Dashboard Compliance Categories */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Compliant (Score 4) */}
            <div className="rounded-2xl p-4 bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Compliant</span>
                <span>🟢</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-emerald-700">{stats.compliantPct}%</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{stats.compliantCount} of {stats.applicableQuestions} reqs</div>
              </div>
              <div className="text-[10px] text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                Score 4 · {stats.proofCount} Proofs
              </div>
            </div>

            {/* Partially Implemented (Score 2-3) */}
            <div className="rounded-2xl p-4 bg-amber-50/60 border border-amber-200 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Partial</span>
                <span>🟡</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-amber-700">{stats.partialPct}%</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{stats.partialCount} of {stats.applicableQuestions} reqs</div>
              </div>
              <div className="text-[10px] text-amber-800 font-bold bg-white px-2 py-0.5 rounded-md border border-amber-200">
                Scores 2–3 · Major Gaps
              </div>
            </div>

            {/* Not Implemented (Score 0-1) */}
            <div className="rounded-2xl p-4 bg-red-50/60 border border-red-200 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">Non-Compliant</span>
                <span>🔴</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-red-700">{stats.nonCompliantPct}%</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{stats.nonCompliantCount} of {stats.applicableQuestions} reqs</div>
              </div>
              <div className="text-[10px] text-red-800 font-bold bg-white px-2 py-0.5 rounded-md border border-red-200">
                Scores 0–1 · Critical
              </div>
            </div>

            {/* Maturity Level Scale */}
            <div className="rounded-2xl p-4 bg-purple-50/60 border border-purple-200 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">ISMS Maturity</span>
                <span>📈</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-purple-700">{assessmentData.maturity.score} <span className="text-xs font-normal text-slate-500">/ 5.0</span></div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{assessmentData.maturity.label}</div>
              </div>
              <div className="text-[10px] text-purple-800 font-bold bg-white px-2 py-0.5 rounded-md border border-purple-200">
                Level 1–5 Scale
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3 & 4: Clausewise & Annex A Readiness (Two Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Clausewise Readiness */}
        <div className="rounded-2xl p-6 bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 3 · Clausewise Readiness</div>
              <h3 className="text-sm font-bold text-slate-900">ISO/IEC 27001:2022 Clauses 4 to 10</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">30 Questions</span>
          </div>

          <div className="space-y-3">
            {managementClauses.map(t => (
              <div key={t.theme} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span className="font-bold text-slate-800">{t.clause} — {t.theme}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs tabular-nums" style={{ color: t.color }}>{t.readinessPct}%</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: t.readinessPct >= 80 ? th('#ECFDF5', { dark: '#0B2E24' }) : t.readinessPct >= 50 ? th('#FFFBEB', { dark: '#3A2A0A' }) : th('#FEF2F2', { dark: '#3A1418' }),
                        color: t.readinessPct >= 80 ? '#059669' : t.readinessPct >= 50 ? '#D97706' : '#DC2626',
                      }}
                    >
                      {t.readinessPct >= 80 ? '🟢' : t.readinessPct >= 50 ? '🟡' : '🔴'}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${t.readinessPct}%`, background: t.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>Score: {t.score} / {t.applicable * 4} pts</span>
                  <span className="font-mono">✓ {t.fully} full · ~{t.largely + t.partial} part · ✗{t.initial + t.not_implemented} gap</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Annex A Control Readiness */}
        <div className="rounded-2xl p-6 bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 4 · Annex A Control Themes</div>
              <h3 className="text-sm font-bold text-slate-900">Annex A Controls (93 Controls)</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">93 Controls</span>
          </div>

          <div className="space-y-3">
            {annexAThemes.map(t => (
              <div key={t.theme} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t.icon}</span>
                    <span className="font-bold text-slate-900">{t.theme}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm tabular-nums" style={{ color: t.color }}>{t.readinessPct}%</span>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border"
                      style={{
                        background: t.risk === 'Low' ? th('#ECFDF5', { dark: '#0B2E24' }) : t.risk === 'Medium' ? th('#FFFBEB', { dark: '#3A2A0A' }) : th('#FEF2F2', { dark: '#3A1418' }),
                        color: t.risk === 'Low' ? '#059669' : t.risk === 'Medium' ? '#D97706' : '#DC2626',
                        borderColor: t.risk === 'Low' ? th('#A7F3D0', { dark: '#065F46' }) : t.risk === 'Medium' ? th('#FDE68A', { dark: '#78350F' }) : th('#FECACA', { dark: '#7F1D1D' }),
                      }}
                    >
                      {t.risk} Risk
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${t.readinessPct}%`, background: t.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 font-medium">
                  <span>Evaluated {t.applicable} controls ({t.na} SoA Exclusions)</span>
                  <span className="font-mono text-slate-700 font-semibold">
                    🟢 {t.fully} · 🟡 {t.largely + t.partial} · 🔴 {t.initial + t.not_implemented}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Section 5: Gap Severity Distribution */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Section 5 · Gap Severity Distribution ({stats.totalGaps} total gaps)</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
                <div className="font-black text-red-600 text-base">{stats.critGaps}</div>
                <div className="text-[10px] text-red-800 font-semibold mt-0.5">🔴 Critical ({stats.critGapsPct}%)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
                <div className="font-black text-orange-600 text-base">{stats.highGaps}</div>
                <div className="text-[10px] text-orange-800 font-semibold mt-0.5">🟠 High ({stats.highGapsPct}%)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="font-black text-amber-600 text-base">{stats.medGaps}</div>
                <div className="text-[10px] text-amber-800 font-semibold mt-0.5">🟡 Med ({stats.medGapsPct}%)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="font-black text-emerald-600 text-base">{stats.lowGaps}</div>
                <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">🟢 Low ({stats.lowGapsPct}%)</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 pt-1">
              <strong>Critical attention areas:</strong> Risk Assessment, Statement of Applicability, Access Control, Incident Management, Internal Audit, and Management Review.
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 7: ISMS Maturity Heat Map ───────────────────── */}
      <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 7 · ISMS Maturity Heat Map</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">10-Domain Maturity Distribution (Levels 1 to 5)</h3>
            <p className="text-xs text-slate-500">
              Evaluates current operational state across 1: Initial, 2: Developing, 3: Defined, 4: Managed, and 5: Optimized.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Current Overall Maturity:</div>
            <div className="text-base font-black text-purple-700">{assessmentData.maturity.score} / 5.0 — {assessmentData.maturity.label}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="p-3.5">ISMS Security Area</th>
                <th className="p-3.5">Clauses / Controls</th>
                <th className="p-3.5 text-center">1. Initial</th>
                <th className="p-3.5 text-center">2. Developing</th>
                <th className="p-3.5 text-center">3. Defined</th>
                <th className="p-3.5 text-center">4. Managed</th>
                <th className="p-3.5 text-center">5. Optimized</th>
                <th className="p-3.5 text-right">Maturity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ismsHeatMap.map(area => (
                <tr key={area.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-semibold text-slate-900 flex items-center gap-2">
                    <span>{area.icon}</span>
                    <span>{area.name}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500 font-medium">{area.clauseRef}</td>
                  
                  {/* Level 1: Initial */}
                  <td className="p-3.5 text-center">
                    {area.level === 1 && (
                      <span className="inline-block p-1 rounded-full bg-red-100 text-red-700 text-xs">
                        🔴
                      </span>
                    )}
                  </td>

                  {/* Level 2: Developing */}
                  <td className="p-3.5 text-center">
                    {area.level === 2 && (
                      <span className="inline-block p-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                        🟡
                      </span>
                    )}
                  </td>

                  {/* Level 3: Defined */}
                  <td className="p-3.5 text-center">
                    {area.level === 3 && (
                      <span className="inline-block p-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                        🟡
                      </span>
                    )}
                  </td>

                  {/* Level 4: Managed */}
                  <td className="p-3.5 text-center">
                    {area.level === 4 && (
                      <span className="inline-block p-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                        🟢
                      </span>
                    )}
                  </td>

                  {/* Level 5: Optimized */}
                  <td className="p-3.5 text-center">
                    {area.level === 5 && (
                      <span className="inline-block p-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                        🟢
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-right">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 uppercase">
                      {area.ratingColor} {area.ratingBadge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 8: Top Risk & Gap Areas ─────────────────────── */}
      <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 8 · Top Risk &amp; Gap Areas</div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">Ranked Criticality &amp; Remediation Urgency</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topRiskAreas.map(item => (
            <div
              key={item.name}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900">{item.name}</div>
                <div className="text-[10px] text-slate-500 font-mono font-medium">{item.ref}</div>
              </div>
              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 border"
                style={{
                  background: item.severity.includes('HIGH') || item.severity.includes('CRITICAL') ? th('#FEF2F2', { dark: '#3A1418' }) : item.severity.includes('MEDIUM') ? th('#FFFBEB', { dark: '#3A2A0A' }) : th('#ECFDF5', { dark: '#0B2E24' }),
                  color: item.severity.includes('HIGH') || item.severity.includes('CRITICAL') ? '#DC2626' : item.severity.includes('MEDIUM') ? '#D97706' : '#059669',
                  borderColor: item.severity.includes('HIGH') || item.severity.includes('CRITICAL') ? th('#FECACA', { dark: '#7F1D1D' }) : item.severity.includes('MEDIUM') ? th('#FDE68A', { dark: '#78350F' }) : th('#A7F3D0', { dark: '#065F46' }),
                }}
              >
                <span>{item.icon}</span>
                <span>{item.severity}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 9 & 10: Implementation Roadmap & Priority Flow ── */}
      <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 9 · Recommended Implementation Roadmap</div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">3-Phase Sequential Milestone Schedule</h3>
          <p className="text-xs text-slate-500">Actionable steps to reach certification audit readiness (Target ≥ 71%)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Phase 1 */}
          <div className="p-5 rounded-2xl bg-red-50/40 border border-red-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-700">Phase 1 · Immediate</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-red-700 border border-red-200">Days 1–30</span>
            </div>
            <div className="text-xs font-bold text-slate-900">Foundation &amp; Governance</div>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2"><span>🔴</span><span>Define &amp; approve ISMS scope</span></li>
              <li className="flex items-start gap-2"><span>🔴</span><span>Establish ISMS governance &amp; roles</span></li>
              <li className="flex items-start gap-2"><span>🔴</span><span>Approve information security policy</span></li>
              <li className="flex items-start gap-2"><span>🔴</span><span>Complete asset inventory &amp; classification</span></li>
              <li className="flex items-start gap-2"><span>🔴</span><span>Conduct risk assessment &amp; treatment</span></li>
              <li className="flex items-start gap-2"><span>🔴</span><span>Develop Statement of Applicability (SoA)</span></li>
            </ul>
          </div>

          {/* Phase 2 */}
          <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700">Phase 2 · Implementation</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-amber-700 border border-amber-200">Days 31–60</span>
            </div>
            <div className="text-xs font-bold text-slate-900">Controls &amp; Enforcement</div>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2"><span>🟡</span><span>Implement required Annex A controls</span></li>
              <li className="flex items-start gap-2"><span>🟡</span><span>Establish access management &amp; MFA</span></li>
              <li className="flex items-start gap-2"><span>🟡</span><span>Implement supplier security assessments</span></li>
              <li className="flex items-start gap-2"><span>🟡</span><span>Establish incident management procedures</span></li>
              <li className="flex items-start gap-2"><span>🟡</span><span>Conduct security awareness sessions</span></li>
              <li className="flex items-start gap-2"><span>🟡</span><span>Implement monitoring &amp; log reviews</span></li>
            </ul>
          </div>

          {/* Phase 3 */}
          <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">Phase 3 · Assurance</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200">Days 61–90</span>
            </div>
            <div className="text-xs font-bold text-slate-900">Audit &amp; Certification</div>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2"><span>🟢</span><span>Review effectiveness of controls</span></li>
              <li className="flex items-start gap-2"><span>🟢</span><span>Conduct internal audit programme</span></li>
              <li className="flex items-start gap-2"><span>🟢</span><span>Close identified nonconformities</span></li>
              <li className="flex items-start gap-2"><span>🟢</span><span>Conduct formal Management Review</span></li>
              <li className="flex items-start gap-2"><span>🟢</span><span>Complete corrective actions log</span></li>
              <li className="flex items-start gap-2"><span>🟢</span><span>Perform certification audit readiness check</span></li>
            </ul>
          </div>
        </div>

        {/* Section 10: Recommended Management Priority Flow */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Section 10 · Recommended Management Priority Flow</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1">
              <div className="font-bold text-red-700">🔴 1. Immediate:</div>
              <div className="text-slate-800 font-medium">Risk Assessment → SoA → Critical Controls</div>
            </div>
            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 space-y-1">
              <div className="font-bold text-orange-700">🟠 2. Next:</div>
              <div className="text-slate-800 font-medium">Policies → Procedures → Evidence Collection</div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <div className="font-bold text-amber-700">🟡 3. Assurance:</div>
              <div className="text-slate-800 font-medium">Monitoring → Internal Audit → Management Review</div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="font-bold text-emerald-700">🟢 4. Target:</div>
              <div className="text-slate-800 font-medium">ISO/IEC 27001 Certification Readiness (≥ 71%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: Key Gaps Identified & Findings Matrix ─────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Section 6 · Key Gaps Identified &amp; Findings Matrix</h3>
            <p className="text-xs text-slate-500">Auditable breakdown of missing controls, informal weaknesses, and proof files</p>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('critical_gaps')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                activeTab === 'critical_gaps'
                  ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔴 Non-Compliant ({stats.nonCompliantCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weaknesses')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                activeTab === 'weaknesses'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟡 Partial Weaknesses ({stats.partialCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compliant')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                activeTab === 'compliant'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟢 Fully Implemented ({stats.compliantCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('soa')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                activeTab === 'soa'
                  ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚪ SoA Exclusions ({stats.naCount})
            </button>
          </div>
        </div>

        {/* Tab 1: Non-Compliant Gaps (Score 0-1) */}
        {activeTab === 'critical_gaps' && (
          <div className="rounded-2xl p-5 border space-y-3 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <span>🔴 Non-Compliant Controls &amp; Missing Processes (Scores 0–1)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Controls that are completely absent or ad-hoc. The vCISO must draft policies and implement technical solutions.
                </p>
              </div>
              <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                {stats.nonCompliantCount} Nonconformities
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {questions
                .filter(q => answers[q.id]?.score <= 1)
                .map(q => {
                  const ans = answers[q.id];
                  const note = notes[q.id];
                  const isZero = ans?.score === 0;

                  return (
                    <div key={q.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                          <span className="font-mono text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {q.reference}
                          </span>
                          <span className="text-slate-900 font-bold">{q.title}</span>
                          <span className="text-[10px] text-slate-400">• {q.theme}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{q.question}</p>
                        {note && (
                          <div className="text-[11px] text-red-900 bg-red-50/70 p-2.5 rounded-xl border border-red-200 mt-1">
                            <strong className="text-red-700">Client Stated Reason:</strong> {note}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          isZero ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'
                        }`}>
                          {isZero ? 'Score 0 · Not Implemented' : 'Score 1 · Initial (Ad-hoc)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 2: Partial Weaknesses (Score 2-3) */}
        {activeTab === 'weaknesses' && (
          <div className="rounded-2xl p-5 border space-y-3 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                  <span>🟡 Partially / Largely Implemented Weaknesses (Scores 2–3)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Controls operational in practice but requiring policy standardization, metric tracking, or evidence collection.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {stats.partialCount} Weaknesses
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {questions
                .filter(q => answers[q.id]?.score === 2 || answers[q.id]?.score === 3)
                .map(q => {
                  const ans = answers[q.id];
                  const note = notes[q.id];
                  const isThree = ans?.score === 3;

                  return (
                    <div key={q.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                          <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {q.reference}
                          </span>
                          <span className="text-slate-900 font-bold">{q.title}</span>
                          <span className="text-[10px] text-slate-400">• {q.theme}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{q.question}</p>
                        {note && (
                          <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 mt-1">
                            <strong className="text-amber-700">Client Stated Status:</strong> {note}
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                        isThree ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}>
                        {isThree ? 'Score 3 · Largely Implemented' : 'Score 2 · Partially Implemented'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 3: Fully Implemented + Evidence Files (Score 4) */}
        {activeTab === 'compliant' && (
          <div className="rounded-2xl p-5 border space-y-3 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                  <span>🟢 Fully Implemented Controls &amp; Mandatory Proofs (Score 4)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Substantiated controls with attached evidence documentation ready for vCISO audit review.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {stats.compliantCount} Verified Controls
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {questions
                .filter(q => answers[q.id]?.score === 4)
                .map(q => {
                  const file = files[q.id];
                  const reviewStatus = verificationMap[q.id] || 'pending';

                  return (
                    <div key={q.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {q.reference}
                          </span>
                          <span className="text-slate-900 font-bold">{q.title}</span>
                          <span className="text-[10px] text-slate-400">• {q.theme}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{q.question}</p>
                        {file && (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 mt-1.5">
                            <span>📄 Attached Proof:</span>
                            <span className="font-mono font-bold">{file.name}</span>
                            <span className="text-slate-500">({formatBytes(file.size)})</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => handleToggleVerify(q.id)}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition shadow-sm ${
                            reviewStatus === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : reviewStatus === 'needs_remediation'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {reviewStatus === 'verified' ? '✓ Verified by vCISO' : reviewStatus === 'needs_remediation' ? '⚠ Remediation Needed' : 'Review Evidence'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 4: Statement of Applicability (SoA) Exclusions */}
        {activeTab === 'soa' && (
          <div className="rounded-2xl p-5 border space-y-3 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>⚪ Statement of Applicability (SoA) Exclusions (Not Applicable)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Excluded controls with mandatory justifications documented for the certification auditor.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {stats.naCount} Exclusions
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {questions
                .filter(q => answers[q.id]?.value === 'na')
                .map(q => (
                  <div key={q.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-600 font-bold">{q.id}</span>
                        <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {q.reference}
                        </span>
                        <span className="text-slate-900 font-bold">{q.title}</span>
                        <span className="text-[10px] text-slate-400">• {q.theme}</span>
                      </div>
                      <div className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1.5">
                        <strong className="text-slate-900">Mandatory SoA Justification:</strong> {notes[q.id] || 'No justification entered.'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
                      Excluded (N/A)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
