import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const FRAMEWORKS = {
  global: [
    { id: 'iso27001', name: 'ISO 27001:2022', desc: 'Information Security Management System', controls: 93 },
    { id: 'iso27002', name: 'ISO 27002:2022', desc: 'Information Security Controls', controls: 93 },
    { id: 'soc2', name: 'SOC 2 Type II', desc: 'Service Organization Controls', controls: 64 },
    { id: 'soc1', name: 'SOC 1 Type II', desc: 'Internal Control over Financial Reporting', controls: 30 },
    { id: 'gdpr', name: 'GDPR', desc: 'General Data Protection Regulation', controls: 99 },
    { id: 'nistcsf', name: 'NIST CSF 2.0', desc: 'Cybersecurity Framework', controls: 106 },
    { id: 'nist80053', name: 'NIST SP 800-53', desc: 'Security & Privacy Controls', controls: 1000 },
    { id: 'pcidss', name: 'PCI-DSS v4.0', desc: 'Payment Card Industry Data Security', controls: 251 },
    { id: 'hipaa', name: 'HIPAA', desc: 'Health Insurance Portability and Accountability', controls: 75 },
    { id: 'cis8', name: 'CIS Controls v8', desc: 'Center for Internet Security Controls', controls: 153 },
    { id: 'iso22301', name: 'ISO 22301:2019', desc: 'Business Continuity Management', controls: 40 },
    { id: 'iso31000', name: 'ISO 31000:2018', desc: 'Risk Management', controls: 30 },
  ],
  india: [
    { id: 'rbi', name: 'RBI Cybersecurity Framework', desc: 'Reserve Bank of India IT/Cyber Guidelines', controls: 50 },
    { id: 'sebi', name: 'SEBI CSCRF', desc: 'Cyber Security & Cyber Resilience Framework', controls: 45 },
    { id: 'irdai', name: 'IRDAI Cybersecurity', desc: 'Insurance Regulatory Guidelines', controls: 35 },
    { id: 'certin', name: 'CERT-In Directions 2022', desc: 'Incident Reporting & Compliance', controls: 20 },
    { id: 'itact', name: 'IT Act 2000 + Amendments', desc: 'Information Technology Act', controls: 25 },
    { id: 'dpdp', name: 'DPDP Act 2023', desc: 'Digital Personal Data Protection Act', controls: 30 },
    { id: 'npci', name: 'NPCI Framework', desc: 'National Payments Corp Cybersecurity', controls: 28 },
    { id: 'meity', name: 'MeitY Guidelines', desc: 'Ministry of Electronics & IT', controls: 22 },
  ],
  sector: [
    { id: 'tisax', name: 'TISAX', desc: 'Trusted Information Security Assessment (Automotive)', controls: 60 },
    { id: 'hitrust', name: 'HITRUST CSF', desc: 'Healthcare Information Trust Alliance', controls: 156 },
    { id: 'swiftcsp', name: 'SWIFT CSP', desc: 'Customer Security Programme (Finance)', controls: 31 },
    { id: 'fedramp', name: 'FedRAMP', desc: 'Federal Risk and Authorization Management', controls: 325 },
    { id: 'nerccip', name: 'NERC CIP', desc: 'Critical Infrastructure Protection (Energy)', controls: 45 },
    { id: 'cobit', name: 'COBIT 2019', desc: 'Governance of Enterprise IT', controls: 40 },
    { id: 'itil4', name: 'ITIL 4', desc: 'IT Infrastructure Library', controls: 34 },
  ],
};

const TAB_LABELS = {
  global: 'Global Standards',
  india: 'India Frameworks',
  sector: 'Sector Specific',
};

// Generate deterministic mock scores per framework id
function mockScore(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return (h % 80) + 10; // 10–89
}

function statusFromScore(score) {
  if (score >= 70) return { label: 'Compliant', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 30) return { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  return { label: 'Not Started', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export default function FrameworksPage({ tab = 'global' }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [dbScores, setDbScores] = useState({});

  useEffect(() => {
    const token = getToken();
    fetch('/api/vciso/frameworks', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(rows => {
        const map = {};
        if (Array.isArray(rows)) rows.forEach(r => { map[r.framework_id] = r.score; });
        setDbScores(map);
      })
      .catch(() => {});
  }, []);

  const items = FRAMEWORKS[tab] || [];
  const title = TAB_LABELS[tab] || 'Frameworks';

  return (
    <div className="p-6 font-sans bg-slate-50 min-h-full text-slate-900 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          {items.length} frameworks · Click a framework to manage controls
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm w-fit">
        {Object.entries(TAB_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => navigate(`/dashboard/vciso/${key === 'global' ? 'global-standards' : key === 'india' ? 'india-frameworks' : 'sector-frameworks'}`)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(fw => {
          const score = dbScores[fw.id] !== undefined ? dbScores[fw.id] : mockScore(fw.id);
          const { label: statusLabel, cls: statusCls } = statusFromScore(score);
          const barColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
          const scoreTextColor = score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-red-700';

          return (
            <div
              key={fw.id}
              className="rounded-2xl p-6 flex flex-col bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-slate-900 font-bold text-sm leading-tight">{fw.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wider flex-shrink-0 ${statusCls}`}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-4 flex-1 leading-relaxed">{fw.desc}</p>
              <div className="text-slate-400 text-xs font-medium mb-3">{fw.controls} controls</div>

              {/* Score */}
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Compliance</span>
                <span className={`font-bold font-mono ${scoreTextColor}`}>{score}%</span>
              </div>
              <div className="w-full rounded-full h-2 mb-5 bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${score}%` }}
                />
              </div>

              <button
                onClick={() => navigate(`/dashboard/vciso/frameworks/${fw.id}`)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition text-left flex items-center gap-1 mt-auto"
              >
                <span>View Controls</span>
                <span>→</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
