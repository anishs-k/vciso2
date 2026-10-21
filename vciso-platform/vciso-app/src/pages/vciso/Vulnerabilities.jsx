import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { th } from '../../theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const SEV = {
  critical: { bg: th('#FEF2F2', { dark: '#3A1418' }), text: '#DC2626', border: '#F87171', label: 'Critical', sla: 10 },
  high:     { bg: th('#FFF7ED', { dark: '#3A1F0A' }), text: '#EA580C', border: '#FB923C', label: 'High',     sla: 30 },
  medium:   { bg: th('#FEFCE8', { dark: '#3A2A0A' }), text: '#D97706', border: '#FDE047', label: 'Medium',   sla: 60 },
  low:      { bg: th('#F0FDF4', { dark: '#0B2E24' }), text: '#16A34A', border: '#4ADE80', label: 'Low',      sla: 90 },
};
const STAT = {
  open:        { bg: th('#F1F5F9', { dark: '#172033' }), text: th('#475569', { dark: '#CBD5E1' }), label: 'Open' },
  in_progress: { bg: th('#EFF6FF', { dark: '#172554' }), text: th('#2563EB', { dark: '#60A5FA' }), label: 'In Progress' },
  remediated:  { bg: th('#ECFDF5', { dark: '#0B2E24' }), text: '#059669', label: 'Remediated' },
};

function slaInfo(vuln) {
  if (vuln.status === 'remediated') return { label: 'Remediated', color: '#16A34A', days: null };
  const slaDays = (SEV[vuln.severity] || SEV.medium).sla;
  const discovered = new Date(vuln.discovered_at);
  const due = new Date(discovered.getTime() + slaDays * 86400000);
  const days = Math.ceil((due - new Date()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: '#DC2626', days };
  if (days <= 3) return { label: `${days}d left`, color: '#EA580C', days };
  return { label: `${days}d left`, color: '#16A34A', days };
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────
function DonutChart({ vulns }) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  vulns.filter(v => v.status !== 'remediated').forEach(v => { if (counts[v.severity] !== undefined) counts[v.severity]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const colors = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#16A34A' };
  const r = 36, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = Object.entries(counts).map(([key, count]) => {
    const pct = count / total;
    const dash = pct * circumference;
    const seg = { key, count, dash, offset, color: colors[key] };
    offset += dash;
    return seg;
  });
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="14" />
        {segments.map(s => s.count > 0 && (
          <circle key={s.key} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-s.offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={th('#0F172A', { dark: '#F1F5F9' })} fontSize="14" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={th('#64748B', { dark: '#94A3B8' })} fontSize="8">open</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
        {Object.entries(counts).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: colors[k] }} />
            <span className="text-slate-500 font-medium">{SEV[k].label}: <span className="text-slate-900 font-bold">{c}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBarChart({ data, colorFn }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2.5 w-full">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 truncate max-w-[120px] font-medium">{d.label}</span>
            <span className="text-slate-900 font-bold ml-2">{d.value}</span>
          </div>
          <div className="w-full rounded-full h-2 bg-slate-100">
            <div className="h-2 rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%`, background: colorFn ? colorFn(d, i) : '#2563EB', minWidth: d.value > 0 ? '4px' : '0' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ vulns }) {
  const weeks = [3, 2, 1, 0].map(weeksAgo => {
    const end = new Date(Date.now() - weeksAgo * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    const label = `W-${weeksAgo === 0 ? 'now' : weeksAgo}`;
    const discovered = vulns.filter(v => { const d = new Date(v.discovered_at); return d >= start && d < end; }).length;
    const remediated = vulns.filter(v => v.status === 'remediated' && v.remediated_at && (() => { const d = new Date(v.remediated_at); return d >= start && d < end; })()).length;
    return { label, discovered, remediated };
  });
  const maxVal = Math.max(...weeks.flatMap(w => [w.discovered, w.remediated]), 1);
  const W = 200, H = 80, pad = 10;
  const pts = (key) => weeks.map((w, i) => {
    const x = pad + (i / 3) * (W - 2 * pad);
    const y = H - pad - ((w[key] / maxVal) * (H - 2 * pad));
    return `${x},${y}`;
  }).join(' ');
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <polyline points={pts('discovered')} fill="none" stroke={th('#2563EB', { dark: '#60A5FA' })} strokeWidth="2" />
        <polyline points={pts('remediated')} fill="none" stroke="#10B981" strokeWidth="2" />
        {weeks.map((w, i) => {
          const x = pad + (i / 3) * (W - 2 * pad);
          return <text key={i} x={x} y={H - 1} textAnchor="middle" fill="#94A3B8" fontSize="7">{w.label}</text>;
        })}
      </svg>
      <div className="flex gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-0.5 bg-blue-600 inline-block rounded-full" /> <span className="text-slate-500 font-medium">Discovered</span></div>
        <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-0.5 bg-emerald-600 inline-block rounded-full" /> <span className="text-slate-500 font-medium">Remediated</span></div>
      </div>
    </div>
  );
}

function ChartCard({ title, onDownload, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-slate-900 text-xs font-bold uppercase tracking-wider">{title}</h4>
        <button onClick={onDownload} className="text-slate-400 hover:text-slate-700 text-xs font-semibold transition" title="Download CSV">⬇ CSV</button>
      </div>
      {children}
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function dlCSV(rows, filename) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

function exportVulnsCSV(vulns) {
  const hdrs = 'Title,CVE,CVSS,Severity,Status,Asset,Owner,Department,Email,Phone,Host,IP,DNS,Facing,Due Date,Discovered';
  const rows = vulns.map(v => [
    `"${(v.title||'').replace(/"/g,'""')}"`, v.cve||'', v.cvss_score||'', v.severity||'', v.status||'',
    v.asset||'', v.owner_name||'', v.owner_department||'', v.owner_email||'', v.owner_phone||'',
    v.owner_host||'', v.owner_ip||'', v.owner_dns||'', v.owner_facing||'',
    v.due_date||'', v.discovered_at ? new Date(v.discovered_at).toLocaleDateString() : '',
  ].join(','));
  dlCSV([hdrs, ...rows], `vulnerabilities_${new Date().toISOString().slice(0,10)}.csv`);
}

function exportScannerCSV(vulns) {
  const hdrs = 'Plugin ID,CVE,CVSS,Risk,Host,Protocol,Port,Name,Synopsis,Description,Solution';
  const rows = vulns.map((v, i) => [
    `SEC-${1000+i}`, v.cve||'', v.cvss_score||'', (SEV[v.severity]||SEV.medium).label,
    v.owner_host || v.asset || '', 'TCP', '443',
    `"${(v.title||'').replace(/"/g,'""')}"`,
    `"${v.severity} severity vulnerability on ${v.asset||'asset'}"`,
    `"${(v.description||'').replace(/"/g,'""')}"`,
    `"${(v.recommendation||'Apply vendor patch').replace(/"/g,'""')}"`,
  ].join(','));
  dlCSV([hdrs, ...rows], `scanner_report_${new Date().toISOString().slice(0,10)}.csv`);
}

function exportPDF(vulns, type = 'full') {
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  vulns.forEach(v => { if (sevCounts[v.severity] !== undefined) sevCounts[v.severity]++; });
  const rows = type === 'executive' ? [] : vulns.slice(0, 50).map(v => `
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:8px;font-size:12px">${v.title}</td>
      <td style="padding:8px;font-size:12px;font-family:monospace">${v.cve||'—'}</td>
      <td style="padding:8px;font-size:12px"><span style="background:${(SEV[v.severity]||SEV.medium).border};color:white;padding:2px 8px;border-radius:${th(`2px`, { classic: `10px`, dark: `10px` })};font-size:11px;font-weight:700">${(SEV[v.severity]||SEV.medium).label}</span></td>
      <td style="padding:8px;font-size:12px">${v.asset||'—'}</td>
      <td style="padding:8px;font-size:12px">${v.owner_name||'Unassigned'}</td>
      <td style="padding:8px;font-size:12px">${v.status}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Vulnerability ${type === 'executive' ? 'Executive Summary' : 'Report'}</title>${th(`
  `, { classic: `
  ` })}<style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:32px;max-width:900px;margin:auto}${th(`
  `, { classic: `
  ` })}h1{color:#2563eb}h2{color:#334155;font-size:16px;margin-top:24px}${th(`
  `, { classic: `
  ` })}.stat{display:inline-block;padding:12px 20px;margin:8px;border-radius:${th(`2px`, { classic: `12px`, dark: `12px` })};text-align:center}${th(`
  `, { classic: `
  ` })}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f8fafc;text-align:left;padding:8px;font-size:12px;text-transform:uppercase}${th(`
  `, { classic: `
  ` })}footer{margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}</style>${th(`
  `, { classic: `
  ` })}</head><body>${th(`
  `, { classic: `
  ` })}<h1>Vulnerability ${type === 'executive' ? 'Executive Summary' : 'Report'}</h1>
  <p style="color:#64748b">Generated: ${new Date().toLocaleString()} · Total: ${vulns.length} vulnerabilities</p>
  <h2>Summary by Severity</h2>
  <div>
    <div class="stat" style="background:#fef2f2;border:1px solid #fecaca"><div style="font-size:24px;font-weight:bold;color:#dc2626">${sevCounts.critical}</div><div style="color:#dc2626;font-size:12px">Critical</div></div>
    <div class="stat" style="background:#fff7ed;border:1px solid #fed7aa"><div style="font-size:24px;font-weight:bold;color:#ea580c">${sevCounts.high}</div><div style="color:#ea580c;font-size:12px">High</div></div>
    <div class="stat" style="background:#fefce8;border:1px solid #fde047"><div style="font-size:24px;font-weight:bold;color:#ca8a04">${sevCounts.medium}</div><div style="color:#ca8a04;font-size:12px">Medium</div></div>
    <div class="stat" style="background:#f0fdf4;border:1px solid #bbf7d0"><div style="font-size:24px;font-weight:bold;color:#16a34a">${sevCounts.low}</div><div style="color:#16a34a;font-size:12px">Low</div></div>
  </div>
  ${type !== 'executive' ? `<h2>Vulnerability Details</h2>
  <table><thead><tr><th>Title</th><th>CVE</th><th>Severity</th><th>Asset</th><th>Owner</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
  <footer>vCISO Platform — Confidential</footer></body></html>`;
  const w = window.open('', '_blank'); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
}

// ─── Jira Modal ───────────────────────────────────────────────────────────────
function JiraModal({ vulns, settings, onClose }) {
  const [copied, setCopied] = useState(false);
  const projectKey = settings.jira_project_key || 'SEC';
  const tickets = vulns.map(v => ({
    summary: `[${(SEV[v.severity]||SEV.medium).label}] ${v.title}${v.cve ? ` (${v.cve})` : ''}`,
    priority: v.severity === 'critical' ? 'Highest' : v.severity === 'high' ? 'High' : v.severity === 'medium' ? 'Medium' : 'Low',
    assignee: v.owner_email || '',
    project: projectKey,
  }));
  const text = tickets.map((t, i) => `Ticket ${i+1}:\n  Summary: ${t.summary}\n  Priority: ${t.priority}\n  Assignee: ${t.assignee || 'Unassigned'}\n  Project: ${t.project}`).join('\n\n');
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <h3 className="text-slate-900 font-bold text-base">🎯 Create Jira Tickets ({vulns.length})</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-500 text-xs">Jira: <span className="text-blue-600 font-medium">{settings.jira_url || 'Not configured'}</span> · Project: <span className="text-slate-800 font-mono font-semibold">{projectKey}</span></p>
          <pre className="text-slate-800 text-xs rounded-xl p-4 overflow-auto max-h-60 whitespace-pre-wrap bg-slate-50 border border-slate-200 font-mono">{text}</pre>
          <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            {copied ? '✓ Copied!' : '📋 Copy All Tickets to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────
function EmailModal({ vulns, assets, onClose }) {
  const [format, setFormat] = useState('csv');
  const [filterBy, setFilterBy] = useState('all');
  const [filterVal, setFilterVal] = useState('');
  const depts = [...new Set(assets.map(a => a.department).filter(Boolean))];
  const owners = [...new Set(assets.map(a => a.name).filter(Boolean))];
  const filtered = vulns.filter(v => {
    if (filterBy === 'department') return v.owner_department === filterVal;
    if (filterBy === 'owner') return v.owner_name === filterVal;
    return true;
  });
  const send = () => {
    if (format === 'csv') exportVulnsCSV(filtered);
    else exportPDF(filtered);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <h3 className="text-slate-900 font-bold text-base">✉ Email Vulnerabilities</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Filter by</label>
            <div className="flex gap-2">
              <select value={filterBy} onChange={e => { setFilterBy(e.target.value); setFilterVal(''); }}
                className="flex-1 rounded-xl px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm">
                <option value="all">All selected ({vulns.length})</option>
                <option value="department">By Department</option>
                <option value="owner">By Owner</option>
              </select>
              {filterBy !== 'all' && (
                <select value={filterVal} onChange={e => setFilterVal(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm">
                  <option value="">Select…</option>
                  {(filterBy === 'department' ? depts : owners).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Format</label>
            <div className="flex gap-4">
              {['csv', 'pdf'].map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input type="radio" value={f} checked={format === f} onChange={() => setFormat(f)} className="text-blue-600" />
                  <span>{f === 'csv' ? 'Excel / CSV' : 'PDF Report'}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-3 text-xs text-slate-600 bg-slate-50 border border-slate-200">
            {filtered.length} vulnerabilit{filtered.length === 1 ? 'y' : 'ies'} will be exported
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={send} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm">
              Download & Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function scannerDetail(vuln) {
  const title = (vuln.title || '').toLowerCase();
  const cveDigits = (vuln.cve || '').replace(/\D/g, '').slice(-6) || String(Math.abs((vuln.title || '').length * 791)).padStart(6, '0');
  const severity = SEV[vuln.severity] || SEV.medium;
  const cvss = Number(vuln.cvss_score || (vuln.severity === 'critical' ? 9.8 : vuln.severity === 'high' ? 8.1 : vuln.severity === 'medium' ? 6.5 : 3.7));
  const vpr = Math.min(10, Math.max(1, cvss - 0.3 + (vuln.owner_facing === 'external' ? 0.6 : 0))).toFixed(1);
  const port = title.includes('samba') ? '445' : title.includes('openssl') || title.includes('heartbleed') ? '443' : title.includes('ssh') ? '22' : title.includes('jira') || title.includes('confluence') ? '8080' : '443';
  const protocol = port === '445' ? 'TCP/SMB' : port === '22' ? 'TCP/SSH' : 'TCP/HTTPS';
  const family = title.includes('samba') ? 'Samba' : title.includes('openssl') ? 'SSL/TLS' : title.includes('windows') || title.includes('print') ? 'Windows' : title.includes('linux') || title.includes('polkit') ? 'Linux Local Security Checks' : 'Web Servers';
  const scanner = title.includes('samba') || title.includes('openssl') || title.includes('log4shell') ? 'Tenable / Nessus style finding' : title.includes('jira') || title.includes('confluence') ? 'Invicti / DAST style finding' : 'Qualys VMDR style finding';
  const defaultOutput = `${protocol} service responded on ${vuln.owner_ip || vuln.asset || 'the affected asset'}:${port}. Scanner evidence indicates the vulnerable component is present and should be validated after remediation.`;

  const samba = {
    synopsis: 'The remote Samba service appears affected by a heap overflow condition in the AD DC LDAP server path.',
    output: `Port 445/tcp SMB was reachable. Samba AD DC LDAP handling appears exposed on ${vuln.owner_host || vuln.asset || 'the target host'}. Validate package version and Samba role before closure.`,
    solution: 'Upgrade Samba to a fixed vendor-supported release, apply distribution security updates, and restrict SMB/LDAP exposure to trusted networks.',
    exploit: 'Exploitation depends on Samba role and reachable LDAP/SMB services; treat internet-facing or domain-controller assets as higher priority.',
  };

  return {
    scanner,
    pluginId: title.includes('samba') ? '157288' : `VM-${cveDigits}`,
    qid: `QID-${cveDigits.slice(-5)}`,
    family,
    port,
    protocol,
    vpr,
    epss: `${Math.min(98, Math.max(4, Math.round(cvss * 7 + (vuln.owner_facing === 'external' ? 12 : 0))))}%`,
    firstSeen: vuln.discovered_at ? new Date(vuln.discovered_at).toLocaleDateString() : '-',
    lastSeen: 'Latest scan cycle',
    published: vuln.cve ? 'Published CVE/advisory tracked' : 'Scanner knowledge base',
    patchPublished: vuln.recommendation ? 'Patch or workaround available' : 'Review vendor advisory',
    remediationType: vuln.recommendation ? 'Patch' : 'Patch / Workaround',
    exploitEase: title.includes('samba') ? samba.exploit : cvss >= 9 ? 'High; prioritize immediately when exposed.' : cvss >= 7 ? 'Moderate; exploitability depends on local configuration.' : 'Lower; validate business exposure.',
    synopsis: title.includes('samba') ? samba.synopsis : `${severity.label} vulnerability detected on ${vuln.asset || 'an asset'} by scanner correlation.`,
    pluginOutput: title.includes('samba') ? samba.output : defaultOutput,
    solution: title.includes('samba') ? samba.solution : (vuln.recommendation || 'Apply the vendor recommended fix, rescan the affected asset, and document any exception if remediation is delayed.'),
    references: [vuln.cve, 'Scanner plugin details', 'Vendor advisory', 'NVD / CVE record'].filter(Boolean),
  };
}

// ─── Owner assign popover ─────────────────────────────────────────────────────
function AssignOwner({ assets, onAssign, onClose }) {
  const [q, setQ] = useState('');
  const filtered = assets.filter(a => !q || (a.name||'').toLowerCase().includes(q.toLowerCase()) || (a.department||'').toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="absolute z-50 mt-1 rounded-xl shadow-xl overflow-hidden bg-white border border-slate-200" style={{ width: '280px' }}>
      <div className="p-2 border-b border-slate-200">
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or dept…"
          className="w-full rounded-lg px-3 py-1.5 text-xs text-slate-900 bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? <div className="p-3 text-slate-400 text-xs text-center">No assets found</div> : filtered.map(a => (
          <button key={a.id} onClick={() => { onAssign(a); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition text-left">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-700 bg-blue-100 flex-shrink-0">
              {(a.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="text-slate-900 text-xs font-semibold">{a.name}</div>
              <div className="text-slate-500 text-[10px]">{a.department}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Detail slide-over ────────────────────────────────────────────────────────
function VulnDetail({ vuln, assets, settings, onClose, onStatusChange, onAssignOwner }) {
  const [showJira, setShowJira] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const sev = SEV[vuln.severity] || SEV.medium;
  const stat = STAT[vuln.status] || STAT.open;
  const sla = slaInfo(vuln);
  const detail = scannerDetail(vuln);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col w-full sm:w-[640px] bg-white border-l border-slate-200 shadow-2xl text-slate-900" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider" style={{ background: sev.bg, color: sev.text, borderColor: sev.border }}>{sev.label}</span>
                {vuln.cve && <span className="text-xs font-mono text-slate-600 font-semibold">{vuln.cve}</span>}
                {vuln.cvss_score && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">CVSS {vuln.cvss_score}</span>}
                <span className="text-xs font-bold" style={{ color: sla.color }}>⏱ {sla.label}</span>
              </div>
              <h2 className="text-slate-900 font-bold text-lg leading-snug">{vuln.title}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none flex-shrink-0 font-bold">×</button>
          </div>
        </div>

        {/* Export toolbar */}
        <div className="px-6 py-2.5 flex items-center gap-2 flex-shrink-0 flex-wrap border-b border-slate-200 bg-white">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Export:</span>
          <button onClick={() => exportPDF([vuln])} className="text-xs px-3 py-1 rounded-xl font-bold transition bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100">📄 PDF</button>
          <button onClick={() => exportVulnsCSV([vuln])} className="text-xs px-3 py-1 rounded-xl font-bold transition bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100">📊 CSV</button>
          <button onClick={() => setShowEmail(true)} className="text-xs px-3 py-1 rounded-xl font-bold transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Email</button>
          <button onClick={() => setShowJira(true)} className="text-xs px-3 py-1 rounded-xl font-bold transition bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100">Jira</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Status', value: <select value={vuln.status} onChange={e => onStatusChange(vuln.id, e.target.value)} className="text-xs font-bold px-2.5 py-1 rounded-lg w-full bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-sm">
                  <option value="open">Open</option><option value="in_progress">In Progress</option><option value="remediated">Remediated</option></select> },
              { label: 'Asset', value: <span className="text-slate-900 text-sm font-semibold">{vuln.asset || '—'}</span> },
              { label: 'SLA Due', value: <span className="text-sm font-bold" style={{ color: sla.color }}>{sla.label}</span> },
              { label: 'Discovered', value: <span className="text-slate-900 text-sm font-semibold">{vuln.discovered_at ? new Date(vuln.discovered_at).toLocaleDateString() : '—'}</span> },
              { label: 'Scanner', value: <span className="text-slate-900 text-sm font-semibold">{detail.scanner}</span> },
              { label: 'Plugin / QID', value: <span className="text-slate-900 text-sm font-mono font-semibold">{detail.pluginId} / {detail.qid}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">{label}</div>
                {value}
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-blue-600 text-xs font-bold uppercase tracking-wider">Risk Information</div>
                <div className="text-slate-500 text-xs">CVSS, VPR, exploitability, and scanner metadata</div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border" style={{ background: sev.bg, color: sev.text, borderColor: sev.border }}>{sev.label}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                ['CVSS', vuln.cvss_score || '-'],
                ['VPR', detail.vpr],
                ['EPSS', detail.epss],
                ['Family', detail.family],
                ['Port', detail.port],
                ['Protocol', detail.protocol],
                ['First Seen', detail.firstSeen],
                ['Last Seen', detail.lastSeen],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</div>
                  <div className="text-slate-900 text-xs font-bold truncate mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Synopsis and Scanner Evidence</div>
            <p className="text-slate-700 text-sm leading-relaxed mb-3">{detail.synopsis}</p>
            <pre className="text-slate-800 text-xs rounded-xl p-3.5 whitespace-pre-wrap bg-slate-50 border border-slate-200 font-mono">{detail.pluginOutput}</pre>
          </div>

          {vuln.description && <div><div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Description</div><p className="text-slate-700 text-sm leading-relaxed">{vuln.description}</p></div>}
          {vuln.impact && <div className="bg-red-50 border border-red-200 rounded-2xl p-5"><div className="text-red-700 text-xs font-bold uppercase tracking-wider mb-2">⚠ Impact</div><p className="text-red-900 text-sm leading-relaxed">{vuln.impact}</p></div>}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">Remediation / Solution</div>
            <p className="text-emerald-950 text-sm mb-3 leading-relaxed">{detail.solution}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-emerald-700 font-bold">Type:</span> <span className="text-emerald-900">{detail.remediationType}</span></div>
              <div><span className="text-emerald-700 font-bold">Patch:</span> <span className="text-emerald-900">{detail.patchPublished}</span></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Exploit and Reference Information</div>
            <p className="text-slate-700 text-sm mb-3">{detail.exploitEase}</p>
            <div className="flex flex-wrap gap-2">
              {detail.references.map(ref => (
                <span key={ref} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono font-medium">{ref}</span>
              ))}
            </div>
          </div>

          {/* Owner card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-3">Vulnerability Owner</div>
            {vuln.owner_name ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-blue-700 bg-blue-100 text-sm flex-shrink-0">
                    {vuln.owner_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-slate-900 font-bold text-sm">{vuln.owner_name}</div>
                    <div className="text-slate-500 text-xs">{vuln.owner_department}</div>
                  </div>
                  {vuln.owner_facing && (
                    <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase" style={{ background: vuln.owner_facing === 'external' ? th('#FEFCE8', { dark: '#3A2A0A' }) : th('#ECFDF5', { dark: '#0B2E24' }), color: vuln.owner_facing === 'external' ? '#D97706' : '#059669', borderColor: vuln.owner_facing === 'external' ? '#FDE047' : th('#A7F3D0', { dark: '#065F46' }) }}>{vuln.owner_facing}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {[['✉', vuln.owner_email, `mailto:${vuln.owner_email}`], ['📞', vuln.owner_phone, null], ['🖥', vuln.owner_host || vuln.host, null], ['🌐', vuln.owner_ip || vuln.ip_address, null]].filter(r => r[1]).map(([icon, val, href]) => (
                    <div key={val} className="flex items-center gap-1.5">
                      <span className="text-slate-400">{icon}</span>
                      {href ? <a href={href} className="text-blue-600 hover:underline truncate font-medium">{val}</a> : <span className="text-slate-800 truncate font-mono">{val}</span>}
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <button onClick={() => setShowAssign(s => !s)} className="w-full py-2 rounded-xl text-xs font-bold transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                    Reassign Owner
                  </button>
                  {showAssign && <AssignOwner assets={assets} onAssign={a => onAssignOwner(vuln.id, a)} onClose={() => setShowAssign(false)} />}
                </div>
              </>
            ) : (
              <div className="relative">
                <p className="text-slate-500 text-sm mb-3">No owner assigned</p>
                <button onClick={() => setShowAssign(s => !s)} className="w-full py-2 rounded-xl text-xs font-bold transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                  + Assign Owner from Registry
                </button>
                {showAssign && <AssignOwner assets={assets} onAssign={a => onAssignOwner(vuln.id, a)} onClose={() => setShowAssign(false)} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEmail && <EmailModal vulns={[vuln]} assets={assets} onClose={() => setShowEmail(false)} />}
      {showJira && <JiraModal vulns={[vuln]} settings={settings} onClose={() => setShowJira(false)} />}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
// ─── Schedule Sync ────────────────────────────────────────────────────────────
// Sync Now ka batch wala kaam ab bina kisi ke dabaye bhi chal sakta hai. Ek
// client ka ek hi schedule hota hai (backend mein UNIQUE client_id), isliye ye
// modal create aur edit dono hai: schedule pehle se ho to wahi bhar kar khulta
// hai, warna khaali form.
const WEEKDAYS = [
  { n: 0, short: 'Sun' }, { n: 1, short: 'Mon' }, { n: 2, short: 'Tue' },
  { n: 3, short: 'Wed' }, { n: 4, short: 'Thu' }, { n: 5, short: 'Fri' },
  { n: 6, short: 'Sat' },
];

/** Aaj ki tareekh YYYY-MM-DD mein — date input isi shape ko samajhta hai. */
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ScheduleSyncModal({ clientId, token, existing, onClose, onSaved }) {
  const [startDate, setStartDate] = useState(existing?.start_date || isoToday());
  const [endDate, setEndDate] = useState(existing?.end_date || '');
  const [time, setTime] = useState(existing?.trigger_time || '00:00');
  const [days, setDays] = useState(existing?.days_of_week || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (n) => setDays(prev =>
    prev.includes(n) ? prev.filter(d => d !== n) : [...prev, n].sort((a, b) => a - b));

  // Server bhi yehi cheezein check karta hai; yahan sirf isliye ki user ko
  // round-trip ke baad na pata chale. days_of_week yahan nahi hai — wo optional
  // hai, khaali chhodne ka matlab hai date range ka har din.
  const validate = () => {
    if (!startDate || !endDate) return 'Pick both a start and an end date';
    if (endDate < startDate) return 'End date cannot be before the start date';
    return '';
  };

  const save = async () => {
    const problem = validate();
    if (problem) return setError(problem);
    setSaving(true);
    setError('');
    try {
      // Maujooda schedule PUT se badalta hai; naya POST se banta hai.
      const res = await fetch(
        existing ? `/api/sync-schedules/${existing.id}` : `/api/clients/${clientId}/sync-schedules`,
        {
          method: existing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            start_date: startDate, end_date: endDate, trigger_time: time,
            days_of_week: days, is_active: true,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      onSaved(data.schedule);
      onClose();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  // Schedule band karna — row rehti hai, bas is_active false ho jaati hai, to
  // last_triggered_at ka itihaas nahi jaata.
  const turnOff = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sync-schedules/${existing.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not turn off (${res.status})`);
      onSaved(null);
      onClose();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const field = 'w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <h3 className="text-slate-900 font-bold text-base">🕐 Schedule Sync</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-500 text-xs">
            Batch sync will run automatically at the time you set, every day between these dates.
            Pick days of the week only if you want to narrow it down to those days.
            This is the same run as <span className="font-semibold text-slate-700">Sync Now → Trigger Batch Sync</span>.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Start date</div>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setError(''); }} className={field} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">End date</div>
              <input type="date" value={endDate} min={startDate} onChange={e => { setEndDate(e.target.value); setError(''); }} className={field} />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Trigger time</div>
            <input type="time" value={time} onChange={e => { setTime(e.target.value); setError(''); }} className={field} />
            <div className="text-[10px] text-slate-400 mt-1">
              Runs at this wall-clock time in {existing?.timezone || 'Asia/Kolkata'} (IST)
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
              Days of week <span className="text-slate-300 normal-case tracking-normal font-semibold">— optional</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WEEKDAYS.map(d => {
                const on = days.includes(d.n);
                return (
                  <label
                    key={d.n}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition ${
                      on
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => { toggleDay(d.n); setError(''); }}
                      className="w-3 h-3 accent-blue-600"
                    />
                    {d.short}
                  </label>
                );
              })}
            </div>
            {/* Khaali chhodna ek valid choice hai, bhoolna nahi — isliye dono
                soorat mein saaf likha jaata hai ki kab-kab chalega. */}
            <div className="text-[10px] text-slate-400 mt-1.5">
              {days.length === 0
                ? 'No days picked — runs every day between the start and end dates.'
                : `Runs only on ${days.map(n => WEEKDAYS[n].short).join(', ')} between the start and end dates.`}
            </div>
          </div>

          {existing?.last_triggered_at && (
            <div className="text-[10px] text-slate-400">
              Last run {new Date(existing.last_triggered_at).toLocaleString()}
            </div>
          )}

          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ✕ {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-2">
          {existing ? (
            <button onClick={turnOff} disabled={saving}
              className="text-xs px-3 py-2 rounded-xl font-bold transition bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60">
              Turn off
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving}
              className="text-xs px-3 py-2 rounded-xl font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="text-xs px-4 py-2 rounded-xl font-bold transition bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60">
              {saving ? 'Saving…' : existing ? 'Update schedule' : 'Save schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Vulnerabilities() {
  const { getToken, user, refreshUser } = useAuth();
  const [vulns, setVulns] = useState([]);
  const [assets, setAssets] = useState([]);
  const [settings, setSettings] = useState({ smtp_enabled: 'true', jira_enabled: 'true', jira_project_key: 'SEC' });
  const [loading, setLoading] = useState(true);
  const [filterSev, setFilterSev] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  // Date filter uploaded_at column par chalta hai (vciso_vulnerabilities).
  // '' = all time, 'today', 'yesterday', '7' = pichhle 7 din, 'custom' = from/to.
  const [filterDate, setFilterDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showJira, setShowJira] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showAssignFor, setShowAssignFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', cve: '', severity: 'medium', asset: '', status: 'open', cvss_score: '', due_date: '', description: '' });
  const dlRef = useRef();

  // Sync Now — scanner export ko is table mein laane ke teen tareeke
  const [showSync, setShowSync] = useState(false);
  const [syncing, setSyncing] = useState('');      // kaunsi entry abhi chal rahi hai
  const [syncResult, setSyncResult] = useState(null);
  const [sourceConfig, setSourceConfig] = useState(null);
  const [syncClients, setSyncClients] = useState([]);
  const [syncClient, setSyncClient] = useState('');
  // Ek vCISO jiska koi client hai hi nahi, wo apna client khud chunta hai.
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  // Scan folder — menu se set hota hai aur backend/.env mein save hota hai
  const [pathDraft, setPathDraft] = useState('');
  const [pathSaving, setPathSaving] = useState(false);
  const [pathNote, setPathNote] = useState(null);
  // Schedule Sync — is client ka active schedule (null = koi schedule nahi)
  const [showSchedule, setShowSchedule] = useState(false);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const syncRef = useRef();
  const scanFileRef = useRef();

  // Integration live data
  const [integrations, setIntegrations] = useState([]);
  const [liveVulns, setLiveVulns] = useState([]);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [liveLastFetch, setLiveLastFetch] = useState(null);

  // Tenable.io
  const [tenablePanel, setTenablePanel] = useState(false);
  const [tenableConnected, setTenableConnected] = useState(false);
  const [tenableAccessKey, setTenableAccessKey] = useState('');
  const [tenableSecretKey, setTenableSecretKey] = useState('');
  const [tenableSaving, setTenableSaving] = useState(false);
  const [tenableError, setTenableError] = useState('');
  const [tenableSummary, setTenableSummary] = useState(null);
  const [tenableFindings, setTenableFindings] = useState([]);
  const [tenableScans, setTenableScans] = useState([]);
  const [tenableLoading, setTenableLoading] = useState(false);
  const [tenableTab, setTenableTab] = useState('findings');
  const [tenableLastFetch, setTenableLastFetch] = useState(null);
  const [tenableTesting, setTenableTesting] = useState(false);
  const [tenableSevFilter, setTenableSevFilter] = useState('all');
  const [tenableSearch, setTenableSearch] = useState('');
  const [tenableSelected, setTenableSelected] = useState(null);
  const [tenableOwnerForm, setTenableOwnerForm] = useState({ owner_name: '', owner_department: '', owner_email: '', owner_manager: '' });
  const [tenableOwnerSaving, setTenableOwnerSaving] = useState(false);

  const token = getToken();
  const clientId = user?.client_id;

  const fetchAll = () => {
    const params = new URLSearchParams();
    if (filterSev) params.set('severity', filterSev);
    if (filterStatus) params.set('status', filterStatus);
    Promise.all([
      fetch(`/api/vciso/vulnerabilities?${params}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`/api/assets?client_id=${clientId || ''}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`/api/settings?client_id=${clientId || ''}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {}),
      fetch('/api/vciso/integrations', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([v, a, s, intg]) => {
      setVulns(Array.isArray(v) ? v : []);
      setAssets(Array.isArray(a) ? a : []);
      setSettings({ smtp_enabled: 'true', jira_enabled: 'true', jira_project_key: 'SEC', ...(s || {}) });
      const intgList = Array.isArray(intg) ? intg : [];
      setIntegrations(intgList);
      checkTenableStatus(intgList);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const fetchLiveVulns = async () => {
    setFetchingLive(true);
    try {
      const res = await fetch('/api/vciso/security/live-data?source_type=all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.vulnerabilities || []).map((v, idx) => ({
          id: idx + 100000,
          title: v.title,
          cve: v.id,
          severity: v.severity,
          asset: v.asset,
          cvss_score: v.cvss,
          status: (v.status || 'Open').toLowerCase().replace(' ', '_'),
          discovered_at: v.firstSeen ? new Date(v.firstSeen).toISOString() : new Date().toISOString(),
          source_tool: v.source,
          live: true,
        }));
        setLiveVulns(mapped);
        setShowLive(true);
        setLiveLastFetch(new Date());
      }
    } catch (e) { console.error('Live fetch error:', e); }
    setFetchingLive(false);
  };

  const tenableAuth = () => ({ Authorization: `Bearer ${token}` });

  const checkTenableStatus = (intgList) => {
    const t = (intgList || integrations).find(i => i.tool_name === 'Tenable.io' && i.enabled === 1 && i.api_url);
    setTenableConnected(!!t);
  };

  const saveTenableKeys = async () => {
    setTenableSaving(true); setTenableError('');
    try {
      const res = await fetch('/api/vciso/tenable/connect', {
        method: 'POST',
        headers: { ...tenableAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_key: tenableAccessKey.trim(), secret_key: tenableSecretKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Test immediately
      setTenableTesting(true);
      const testRes = await fetch('/api/vciso/tenable/test', { headers: tenableAuth() });
      const testData = await testRes.json();
      setTenableTesting(false);
      if (!testRes.ok) { setTenableError('Keys saved but connection test failed: ' + testData.error); }
      else { setTenableConnected(true); setTenableAccessKey(''); setTenableSecretKey(''); fetchTenableData(); }
    } catch (e) { setTenableError(e.message); }
    setTenableSaving(false);
  };

  const fetchTenableData = async (sevFilter) => {
    setTenableLoading(true);
    const sev = sevFilter || tenableSevFilter;
    try {
      const [sumRes, findingsRes, scanRes] = await Promise.all([
        fetch('/api/vciso/tenable/summary', { headers: tenableAuth() }),
        fetch(`/api/vciso/tenable/findings?limit=50&severity=${sev}`, { headers: tenableAuth() }),
        fetch('/api/vciso/tenable/scans', { headers: tenableAuth() }),
      ]);
      if (sumRes.ok) setTenableSummary(await sumRes.json());
      if (findingsRes.ok) { const d = await findingsRes.json(); setTenableFindings(d.findings || []); }
      if (scanRes.ok) { const d = await scanRes.json(); setTenableScans(d.scans || []); }
      setTenableLastFetch(new Date());
    } catch (e) { console.error('Tenable fetch error', e); }
    setTenableLoading(false);
  };

  const saveOwnerToFinding = (findingId, ownerData) => {
    setTenableFindings(prev => prev.map(f =>
      f.finding_id === findingId ? { ...f, ...ownerData } : f
    ));
  };

  useEffect(() => { fetchAll(); }, [filterSev, filterStatus]);

  // Menu ko kya dikhana hai: kaunsa folder Run from Path padhega. Ek vCISO jo
  // kisi ek client se bandha nahi hai use client chunna padta hai, kyunki
  // findings ke saath client_id jaata hai.
  useEffect(() => {
    fetch('/api/sources/config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        setSourceConfig(cfg);
        // Input wahi dikhata hai jo abhi set hai, taaki user badalne se pehle
        // dekh sake ki server kahan padh raha hai.
        if (cfg?.runFromPath?.inputPath) setPathDraft(cfg.runFromPath.inputPath);
      })
      .catch(() => {});
    if (!clientId) {
      fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : []).then(list => setSyncClients(Array.isArray(list) ? list : []))
        .catch(() => {});
    }
  }, [clientId]);

  // Bahar click karne pe menu band ho — jaise menu se ummeed ki jaati hai.
  useEffect(() => {
    if (!showSync) return;
    const onClick = (e) => { if (!syncRef.current?.contains(e.target)) setShowSync(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showSync]);

  // Client chunne par wo user ke record mein save hota hai. Ek hi baar hota
  // hai — backend already-linked account ko 409 deta hai — isliye success ke
  // baad dropdown hamesha ke liye gayab. refreshUser() se naya client_id
  // context mein aa jaata hai aur page bina reload ke us client par scope ho
  // jaata hai.
  const claimClient = async (id) => {
    if (!id) return;
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch('/api/auth/me/client', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ client_id: id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not link that client');
      await refreshUser();
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const targetClient = clientId || syncClient;

  // Button pe "Scheduled" tag isi se aata hai, aur modal ko edit mode mein
  // kholne ke liye maujooda schedule bhi yahin se milta hai.
  const loadSchedule = async (cid = targetClient) => {
    if (!cid) return setActiveSchedule(null);
    try {
      const res = await fetch(`/api/clients/${cid}/sync-schedules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return setActiveSchedule(null);
      const data = await res.json();
      setActiveSchedule((data.schedules || []).find(s => s.is_active) || null);
    } catch {
      // Schedule na padh paana page ko nahi rokta — button bina tag ke dikhega.
      setActiveSchedule(null);
    }
  };

  useEffect(() => { loadSchedule(targetClient); }, [targetClient]);

  // ─── Scheduled batch sync ko live dekhna ────────────────────────────────────
  // Scheduled run server pe apne aap chalta hai — koi request pending nahi hoti
  // jiska jawab aa sake. Isliye backend /api/events pe do event bhejta hai, aur
  // ye effect unhein wahi do state mein daal deta hai jo Sync Now bharta hai:
  //
  //   batch-sync-started   → syncing = 'batch'   ("⏳ Syncing…" chalu)
  //   batch-sync-finished   → syncResult          (wahi result panel)
  //
  // finished ka payload runBatchSync ka poora nateeja hai — wahi object jo POST
  // /api/sources/batch lautata hai — isliye output button wale run se bilkul
  // ek jaisa aata hai. Sirf ek `scheduled` flag alag hai, jisse panel ke sirf
  // header mein pata chalta hai ki ye apne aap chala tha.
  useEffect(() => {
    if (!token || !targetClient) return;

    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

    es.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      // Ek hi stream sab clients ke events laati hai; jo client abhi screen pe
      // hai bas usi ka run dikhna chahiye.
      if (String(msg.clientId) !== String(targetClient)) return;

      if (msg.type === 'batch-sync-started') {
        setSyncing('batch');
        setSyncResult(null);
        return;
      }

      if (msg.type === 'batch-sync-finished') {
        setSyncing('');
        setSyncResult(
          msg.ok
            ? { ok: true, kind: 'batch', scheduled: true, ...msg.result }
            : { ok: false, kind: 'batch', scheduled: true, error: msg.error }
        );
        // Manual run yehi shart lagata hai — table tabhi dobara padho jab
        // kuch naya sach mein store hua ho.
        // BUG FIX: runBatchSync ka result shape totalSaved use karta hai,
        // stored.created nahi. Purana check kabhi true nahi hota tha.
        if (msg.ok && (msg.result?.totalSaved > 0 || msg.result?.totalFiles > 0)) fetchAll();
        // "Last run" ab badal chuka hai.
        loadSchedule(targetClient);
      }
    };

    // Stream tootne pe EventSource khud dobara jud jaata hai; chalta hua sync
    // yahan atka na dikhe isliye spinner chhod dete hain.
    es.onerror = () => setSyncing(prev => (prev === 'batch' ? '' : prev));

    return () => es.close();
  }, [token, targetClient]);

  // Scan folder set karo. Ek hi path do jagah jaata hai — Run from Path yahin
  // se padhta hai, aur Trigger Batch Sync ki Qualys download bhi yahin utarti
  // hai — aur backend use apni .env mein likh deta hai.
  const saveScanPath = async () => {
    const next = pathDraft.trim();
    if (!next) { setPathNote({ ok: false, text: 'Type a folder path first' }); return; }
    setPathSaving(true);
    setPathNote(null);
    try {
      const res = await fetch('/api/sources/path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPathNote({ ok: false, text: data.error || `Could not save (${res.status})` });
      } else {
        setPathNote({
          ok: true,
          text: `${data.persisted ? 'Saved to backend/.env' : data.message} · ${data.files.length} readable file(s) here`,
        });
        // Menu ke hints purane path pe atke na rahein.
        const cfg = await fetch('/api/sources/config', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null).catch(() => null);
        if (cfg) setSourceConfig(cfg);
      }
    } catch (e) {
      setPathNote({ ok: false, text: e.message });
    }
    setPathSaving(false);
  };

  // Ek call, ek result panel, chahe koi bhi menu entry use hui ho. Failure usi
  // panel mein dikhta hai, console mein kho nahi jaata.
  const runSync = async (kind, request) => {
    if (!targetClient) {
      setSyncResult({ ok: false, kind, error: 'Pick the client these findings belong to first.' });
      return;
    }
    setShowSync(false);
    setSyncing(kind);
    setSyncResult(null);
    try {
      const res = await fetch(request.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...(request.headers || {}) },
        body: request.body,
      });
      const data = await res.json().catch(() => ({}));
      setSyncResult({ ok: res.ok, kind, ...data });
      // Sirf wahi run table badalta hai jisne kuch store kiya ho.
      if (res.ok && data.stored?.created > 0) fetchAll();
    } catch (e) {
      setSyncResult({ ok: false, kind, error: e.message });
    }
    setSyncing('');
  };

  // Import File (manual) — browser bytes bhejta hai, path ka koi role nahi.
  const importScanFile = (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('client_id', targetClient);
    runSync('upload', { url: '/api/sources/upload', body: form });
  };

  // Run from Path — server .env se SCANS_DEFAULT_PATH padhta hai, to bhejne ko
  // sirf wo client hai jiske ye findings hain.
  const runFromPath = () => runSync('run', {
    url: '/api/sources/run',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: targetClient }),
  });

  // Trigger Batch Sync — route 501 deta hai jab tak iska method tay nahi hota.
  const triggerBatchSync = () => runSync('batch', {
    url: '/api/sources/batch',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: targetClient }),
  });

  const SYNC_ACTIONS = [
    {
      key: 'upload', icon: '📄', label: 'Import File (manual)',
      hint: 'Choose a scanner export from this computer',
      run: () => { setShowSync(false); scanFileRef.current?.click(); },
    },
    {
      key: 'run', icon: '📁', label: 'Run from Path',
      hint: sourceConfig?.runFromPath?.inputPath
        ? `Reads ${sourceConfig.runFromPath.inputPath}${sourceConfig.runFromPath.pattern ? ` · ${sourceConfig.runFromPath.pattern}` : ''}`
        : 'Reads the scan folder set in backend/.env',
      run: runFromPath,
    },
    {
      key: 'batch', icon: '🔁', label: 'Trigger Batch Sync',
      hint: sourceConfig?.batchSync?.configured
        ? `Pulls the newest Qualys report, then processes every unprocessed file in the folder`
        : 'Processes every unprocessed file in the scan folder',
      run: triggerBatchSync,
    },
  ];

  const handleStatusChange = async (id, status) => {
    await fetch(`/api/vciso/vulnerabilities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    setVulns(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  const handleAssignOwner = async (vulnId, asset) => {
    const body = { owner_name: asset.name, owner_email: asset.email, owner_department: asset.department, owner_phone: asset.phone, owner_host: asset.host, owner_ip: asset.ip_address, owner_dns: asset.dns_name, owner_facing: asset.facing };
    await fetch(`/api/vciso/vulnerabilities/${vulnId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const updated = { ...vulns.find(v => v.id === vulnId), ...body };
    setVulns(prev => prev.map(v => v.id === vulnId ? updated : v));
    setSelected(prev => prev?.id === vulnId ? updated : prev);
    setShowAssignFor(null);
  };

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    await fetch('/api/vciso/vulnerabilities', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, cvss_score: form.cvss_score ? parseFloat(form.cvss_score) : null }) });
    setSaving(false); setShowAdd(false);
    setForm({ title: '', cve: '', severity: 'medium', asset: '', status: 'open', cvss_score: '', due_date: '', description: '' });
    fetchAll();
  };

  // Merge internal + live integration vulns
  const allVulns = showLive ? [...vulns, ...liveVulns] : vulns;

  // Ek vuln ki date = vciso_vulnerabilities.uploaded_at (jis din row upload hui).
  // Live integration rows table me nahi hoti, unke liye discovered_at fallback hai.
  const vulnDate = (v) => {
    const raw = v.uploaded_at || v.discovered_at;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // Ek vuln uploaded_at ke hisaab se chune hue date window me aata hai ya nahi
  const inDateRange = (v) => {
    if (!filterDate) return true;
    const d = vulnDate(v);
    if (!d) return false;
    if (filterDate === 'custom') {
      if (dateFrom && d < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59.999`)) return false;
      return true;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (filterDate === 'today') return d >= today;
    if (filterDate === 'yesterday') {
      const yesterday = new Date(today.getTime() - 86400000);
      return d >= yesterday && d < today;
    }
    // '7' = aaj samet pichhle 7 calendar din
    return d >= new Date(today.getTime() - 6 * 86400000);
  };

  // Date window ke andar ki saari rows. Stat cards, charts aur table — sabhi isi
  // par bante hain, taaki filter me date badalte hi upar ka data bhi badal jaaye.
  const scopedVulns = allVulns.filter(inDateRange);

  // Filter + search (date scope ke upar dept aur search)
  const displayed = scopedVulns.filter(v => {
    if (filterDept && v.owner_department !== filterDept) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return ['title', 'cve', 'asset', 'owner_name', 'owner_department'].some(f => (v[f] || '').toLowerCase().includes(q));
  });

  // SLA stats
  const slaStats = { breached: 0, dueSoon: 0, onTrack: 0, remediated: 0 };
  scopedVulns.forEach(v => {
    const s = slaInfo(v);
    if (v.status === 'remediated') slaStats.remediated++;
    else if (s.days !== null && s.days < 0) slaStats.breached++;
    else if (s.days !== null && s.days <= 3) slaStats.dueSoon++;
    else slaStats.onTrack++;
  });

  // Chart data
  const deptData = Object.entries(
    scopedVulns.filter(v => v.status !== 'remediated' && v.owner_department).reduce((acc, v) => { acc[v.owner_department] = (acc[v.owner_department] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));

  const slaChartData = [
    { label: 'Breached', value: slaStats.breached },
    { label: 'Due Soon (≤3d)', value: slaStats.dueSoon },
    { label: 'On Track', value: slaStats.onTrack },
  ];

  const depts = [...new Set(allVulns.map(v => v.owner_department).filter(Boolean))];

  // Table me kis-kis din ka data pada hai (uploaded_at ke hisaab se). Date filter
  // pe 0 rows aayein to user ko yahi batana hai ki data asal me kis din ka hai.
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const uploadDays = [...new Set(allVulns.map(v => { const d = vulnDate(v); return d ? dayKey(d) : null; }).filter(Boolean))].sort().reverse();
  const prettyDay = (k) => new Date(`${k}T00:00:00`).toLocaleDateString();
  const selectedVulns = checked.size > 0 ? displayed.filter(v => checked.has(v.id)) : displayed;

  const toggleCheck = (id) => setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setChecked(checked.size === displayed.length ? new Set() : new Set(displayed.map(v => v.id)));

  return (
    <div className="p-6 font-sans bg-slate-50 min-h-full text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vulnerabilities</h1>
          <p className="text-slate-500 text-xs mt-0.5">Track, own, and remediate security vulnerabilities</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Import File (manual) isi input se chalti hai; menu entry ise click karti hai */}
          <input
            ref={scanFileRef}
            type="file"
            accept={(sourceConfig?.supportedExtensions || ['.csv', '.xlsx', '.xml', '.json']).join(',')}
            className="hidden"
            onChange={(e) => { importScanFile(e.target.files?.[0]); e.target.value = ''; }}
          />

          {/* Jis vCISO ka koi client nahi hai use pehle ek chunna hota hai.
              Chunte hi wo uske account par save ho jaata hai, aur ye control
              gayab — isliye ye sirf orphan account ko hi kabhi dikhta hai. */}
          {user?.role === 'vciso' && !clientId && (
            <div className="relative">
              <select
                value=""
                disabled={claiming}
                onChange={e => claimClient(e.target.value)}
                title="Link your account to a client"
                className="text-xs px-3 py-2.5 rounded-xl font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">{claiming ? 'Linking…' : 'Select Client'}</option>
                {syncClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {claimError && (
                <div className="absolute left-0 top-full mt-1 z-50 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1 whitespace-nowrap">
                  {claimError}
                </div>
              )}
            </div>
          )}
          {/* Schedule Sync — Sync Now ke bilkul baayein. Batch sync ko date
              range, dinon aur ek time pe automatic chalata hai. */}
          <button
            onClick={() => setShowSchedule(true)}
            disabled={!targetClient}
            title={targetClient ? 'Automate Trigger Batch Sync' : 'Pick a client first'}
            className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            🕐 Schedule Sync
            {activeSchedule && (
              <span className="inline-flex items-center gap-1 text-[10px] leading-none font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Scheduled
              </span>
            )}
          </button>

          {/* Sync Now dropdown — scanner export ko is table mein laane ke teen raaste */}
          <div className="relative" ref={syncRef}>
            <button
              onClick={() => setShowSync(s => !s)}
              disabled={Boolean(syncing)}
              className="text-xs px-3 py-2.5 rounded-xl font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {syncing ? '⏳ Syncing…' : '🔄 Sync Now ▾'}
            </button>
            {showSync && (
              <div className="absolute right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden bg-white border border-slate-200" style={{ minWidth: '290px' }}>
                {/* Ek vCISO jo kisi ek client se bandha nahi hai wo pehle client chunta hai */}
                {!clientId && (
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Client</div>
                    <select
                      value={syncClient}
                      onChange={e => setSyncClient(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
                    >
                      <option value="">Select a client…</option>
                      {syncClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {/* Scan folder — Run from Path yahin se padhta hai aur Batch Sync
                    ki download bhi yahin utarti hai. Save backend/.env mein
                    jaata hai, to setting restart ke baad bhi bani rehti hai. */}
                <div className="px-4 pt-3 pb-2.5 border-b border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Scan folder</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={pathDraft}
                      onChange={e => { setPathDraft(e.target.value); setPathNote(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') saveScanPath(); }}
                      placeholder="C:\path\to\scan-folder"
                      spellCheck={false}
                      className="flex-1 min-w-0 text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-mono"
                    />
                    <button
                      onClick={saveScanPath}
                      disabled={pathSaving}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shrink-0"
                    >
                      {pathSaving ? '…' : 'Save'}
                    </button>
                  </div>
                  {pathNote ? (
                    <div className={`text-[10px] mt-1 break-all ${pathNote.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                      {pathNote.ok ? '✓' : '✕'} {pathNote.text}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Used by Run from Path, and where Batch Sync saves its download
                    </div>
                  )}
                </div>
                {SYNC_ACTIONS.map(action => (
                  <button
                    key={action.key}
                    onClick={action.run}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
                  >
                    <div className="text-xs font-semibold text-slate-700">{action.icon} {action.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 break-all">{action.hint}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Download dropdown */}
          <div className="relative" ref={dlRef}>
            <button onClick={() => setShowDownload(s => !s)} className="text-xs px-3 py-2.5 rounded-xl font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
              ⬇ Download ▾
            </button>
            {showDownload && (
              <div className="absolute right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden bg-white border border-slate-200" style={{ minWidth: '190px' }}>
                {[
                  ['📄 Full Report (PDF)', () => exportPDF(displayed)],
                  ['📊 CSV / Excel', () => exportVulnsCSV(displayed)],
                  ['📋 Executive Summary', () => exportPDF(displayed, 'executive')],
                  ['🔍 Scanner Format (CSV)', () => exportScannerCSV(displayed)],
                ].map(([label, fn]) => (
                  <button key={label} onClick={() => { fn(); setShowDownload(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition">{label}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowEmail(true)} className="text-xs px-3.5 py-2.5 rounded-xl font-bold transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Email</button>
          <button onClick={() => setShowJira(true)} className="text-xs px-3.5 py-2.5 rounded-xl font-bold transition bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100">Jira</button>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm">+ Add</button>
        </div>
      </div>


      {/* Pichhli sync ne kya kiya — kaunsi file, kaise mili, DB mein kya gaya */}
      {syncResult && (() => {
        const good = syncResult.ok && !syncResult.error;
        const stored = syncResult.stored || {};
        const isBatch = syncResult.kind === 'batch';
        const stats = good && isBatch ? [
          ['Files', `${syncResult.processed ?? 0} of ${syncResult.totalFiles ?? 0} processed`],
          ['Rows read', syncResult.totalRowsRead],
          ['Saved to database', syncResult.totalSaved],
          ['Rejected rows', syncResult.totalRejected || null],
          ['uploaded_at', syncResult.uploaded_at ? new Date(syncResult.uploaded_at).toLocaleString() : null],
        ].filter(([, v]) => v !== null && v !== undefined && v !== '') : good ? [
          ['Method', syncResult.methodUsed === 'upload' ? 'Uploaded file' : `Found by ${syncResult.methodUsed}`],
          ['File', syncResult.fileProcessed?.name],
          ['Rows read', syncResult.rowsParsed],
          ['Saved to database', `${stored.created ?? 0} new${(stored.updated || stored.skipped) ? `, ${(stored.updated || 0) + (stored.skipped || 0)} already present` : ''}`],
          ['Scanner', (syncResult.sourceTools || []).map(t => `${t.source_tool} (${t.rows})`).join(', ')],
          ['uploaded_at', syncResult.uploaded_at ? new Date(syncResult.uploaded_at).toLocaleString() : null],
        ].filter(([, v]) => v !== null && v !== undefined && v !== '') : [];

        return (
          <div className={`rounded-2xl border p-4 ${good ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={`text-sm font-bold ${good ? 'text-emerald-800' : 'text-red-700'}`}>
                  {good ? '✓ ' : '✕ '}
                  {syncResult.message || syncResult.error || (good ? 'Sync complete' : 'Sync failed')}
                </div>
                {/* Neeche ka poora output button wale run jaisa hi hai; ye tag
                    sirf itna batata hai ki chalaya schedule ne tha. */}
                {syncResult.scheduled && (
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                    🕐 Ran automatically from Schedule Sync
                  </div>
                )}
                {!good && syncResult.message && syncResult.error && (
                  <div className="text-xs text-red-600 mt-1">{syncResult.message}</div>
                )}
                {stats.length > 0 && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                    {stats.map(([label, value]) => (
                      <div key={label} className="text-xs">
                        <span className="text-emerald-700/70">{label}: </span>
                        <span className="font-semibold text-emerald-900 break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Batch: har file ka apna nateeja */}
                {isBatch && Array.isArray(syncResult.perFile) && syncResult.perFile.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {syncResult.perFile.map((f, i) => (
                      <div key={i} className="text-xs flex flex-wrap items-baseline gap-x-2">
                        <span className={f.ok ? 'text-emerald-700' : 'text-red-600'}>{f.ok ? '✓' : '✕'}</span>
                        <span className="font-semibold text-slate-700 break-all">{f.file}</span>
                        <span className="text-slate-500">
                          {f.ok
                            ? `${f.rowsRead ?? 0} read · ${f.saved ?? 0} saved${f.skipped ? ` · ${f.skipped} already present` : ''}${f.rejected ? ` · ${f.rejected} rejected` : ''}${f.note ? ` · ${f.note}` : ''}`
                            : f.error}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Batch run ke browser steps — login, report list, download */}
                {syncResult.automation && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(syncResult.automation.steps || []).map((s, i) => (
                      <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.ok ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {s.ok ? '✓' : '✕'} {s.name}
                      </span>
                    ))}
                  </div>
                )}
                {/* Fallback chain ne kya try kiya — Path → Search → Metadata.
                    Fail hone par headline hi jawab hai ("folder mein nayi file
                    nahi"); teeno methods ki poori wajah screen par ugal dene se
                    ek chhoti si baat error ka pahaad lagti thi. Ab wo Details ke
                    peeche hai — debug karne wale ko ek click door, baaki sabko
                    raaste se hata kar. */}
                {Array.isArray(syncResult.attempts) && syncResult.attempts.length > 0 && (
                  good ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {syncResult.attempts.map((a, i) => (
                        <span key={i} title={a.message} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${a.success ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {a.success ? '✓' : '✕'} {a.method}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <details className="mt-2">
                      <summary className="text-[11px] text-red-600/80 cursor-pointer select-none hover:text-red-700">
                        Details
                      </summary>
                      <div className="mt-1 space-y-1">
                        {syncResult.attempts.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <span className={`font-semibold px-2 py-0.5 rounded-full border shrink-0 ${a.success ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {a.success ? '✓' : '✕'} {a.method}
                            </span>
                            <span className="text-slate-500 break-all">{a.message}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                )}
              </div>
              <button onClick={() => setSyncResult(null)} className={`text-lg font-bold shrink-0 ${good ? 'text-emerald-400 hover:text-emerald-700' : 'text-red-400 hover:text-red-700'}`}>✕</button>
            </div>
          </div>
        );
      })()}

      {/* Tenable Detail Drawer */}
      {tenableSelected && (() => {
        const f = tenableSelected;
        const sevColor = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#16A34A', info: th('#64748B', { dark: '#94A3B8' }) };
        const sc = sevColor[f.severity] || th('#64748B', { dark: '#94A3B8' });
        return (
          <div className="fixed inset-0 z-50 flex bg-slate-900/40 backdrop-blur-sm" onClick={() => setTenableSelected(null)}>
            <div className="ml-auto w-full max-w-2xl h-full overflow-y-auto bg-white border-l border-slate-200 shadow-2xl text-slate-900" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize border" style={{ background: sc + '15', color: sc, borderColor: sc + '40' }}>{f.severity}</span>
                  <span className="text-slate-900 font-bold text-sm">{f.title}</span>
                </div>
                <button onClick={() => setTenableSelected(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
              </div>
              <div className="px-6 py-5 space-y-5 text-xs">
                {/* IDs */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Finding / Plugin ID', f.plugin_id],
                    ['CVE ID', f.cve || '—'],
                    ['CWE ID', f.cwe || '—'],
                    ['CVSS Score', f.cvss_score ? `${f.cvss_score} (${f.cvss_version})` : '—'],
                    ['CVSS Vector', f.cvss_vector || '—'],
                    ['Scanner Source', f.scanner_source],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
                      <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-slate-500">{label}</div>
                      <div className="text-slate-900 font-mono font-semibold break-all">{val}</div>
                    </div>
                  ))}
                </div>

                {/* Asset */}
                <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider">Affected Asset / Component</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Hostname', f.asset_hostname || '—'],
                      ['IP Address', f.asset_ip || '—'],
                      ['FQDN', f.asset_fqdn || '—'],
                      ['Asset UUID', f.asset_uuid ? f.asset_uuid.slice(0,12)+'…' : '—'],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5">{l}</div>
                        <div className="text-slate-900 font-mono text-xs font-semibold">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status & Dates */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Status', f.status],
                    ['First Detected', f.first_found ? new Date(f.first_found).toLocaleDateString() : '—'],
                    ['Last Detected', f.last_found ? new Date(f.last_found).toLocaleDateString() : '—'],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-xl p-3 text-center bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold mb-1 text-slate-500 uppercase">{l}</div>
                      <div className="text-slate-900 font-bold capitalize">{v}</div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {f.description && (
                  <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wider">Description</div>
                    <p className="text-slate-700 leading-relaxed text-xs">{f.description}</p>
                  </div>
                )}

                {/* Remediation */}
                {f.solution && (
                  <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
                    <div className="font-bold mb-2 text-emerald-800 text-xs uppercase tracking-wider">Remediation / Recommendation</div>
                    <p className="text-emerald-950 leading-relaxed text-xs">{f.solution}</p>
                  </div>
                )}

                {/* Owner Assignment */}
                <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
                  <div className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wider">Owner Assignment</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Owner Name', 'owner_name', f.owner_name || ''],
                      ['Owner Department', 'owner_department', f.owner_department || ''],
                      ['Owner Email', 'owner_email', f.owner_email || ''],
                      ['Manager Name', 'owner_manager', f.owner_manager || ''],
                    ].map(([label, field, val]) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
                        <input
                          className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                          defaultValue={val}
                          onChange={e => setTenableOwnerForm(prev => ({ ...prev, [field]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      setTenableOwnerSaving(true);
                      saveOwnerToFinding(f.finding_id, tenableOwnerForm);
                      setTenableOwnerSaving(false);
                      setTenableSelected(prev => ({ ...prev, ...tenableOwnerForm }));
                    }}
                    disabled={tenableOwnerSaving}
                    className="mt-3 text-xs font-bold px-4 py-2 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50">
                    {tenableOwnerSaving ? 'Saving…' : '✓ Save Owner'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tenable.io Integration Panel */}
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
        {/* Header row */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Tenable.io</span>
                {tenableConnected
                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">● Connected</span>
                  : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Not Connected</span>
                }
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {tenableConnected
                  ? tenableLastFetch ? `Last synced ${tenableLastFetch.toLocaleTimeString()}` : 'Connected — click Sync to fetch live data'
                  : 'Connect your Tenable.io account to pull live vulnerability data'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenableConnected && (
              <button onClick={fetchTenableData} disabled={tenableLoading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50">
                {tenableLoading
                  ? <><span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Syncing…</>
                  : '🔄 Sync Now'}
              </button>
            )}
            <button onClick={() => setTenablePanel(p => !p)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl transition bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200">
              {tenablePanel ? 'Close' : tenableConnected ? 'View Data' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Summary tiles when connected */}
        {tenableConnected && tenableSummary && (
          <div className="px-5 pb-4 grid grid-cols-5 gap-3">
            {[
              { label: 'Critical', val: tenableSummary.critical, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
              { label: 'High',     val: tenableSummary.high,     color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
              { label: 'Medium',   val: tenableSummary.medium,   color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
              { label: 'Low',      val: tenableSummary.low,      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Total',    val: tenableSummary.total,    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
            ].map(t => (
              <div key={t.label} className={`rounded-xl px-3 py-2.5 text-center border ${t.bg} ${t.border}`}>
                <div className={`text-xl font-bold ${t.color}`}>{t.val}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">{t.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Expandable panel */}
        {tenablePanel && (
          <div className="border-t border-slate-200 px-5 pb-5 pt-4 bg-slate-50/50">

            {/* Connect form */}
            {!tenableConnected && (
              <div className="space-y-3 max-w-lg">
                <p className="text-xs text-slate-600">
                  Enter your Tenable.io API keys. You can generate them in Tenable.io under <strong className="text-slate-900">My Account → API Keys</strong>.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Access Key</label>
                    <input type="password" value={tenableAccessKey} onChange={e => setTenableAccessKey(e.target.value)}
                      placeholder="Paste Access Key"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Secret Key</label>
                    <input type="password" value={tenableSecretKey} onChange={e => setTenableSecretKey(e.target.value)}
                      placeholder="Paste Secret Key"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                {tenableError && <div className="text-xs px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200">{tenableError}</div>}
                <button onClick={saveTenableKeys} disabled={tenableSaving || tenableTesting || !tenableAccessKey || !tenableSecretKey}
                  className="text-xs font-bold px-4 py-2 rounded-xl transition bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50">
                  {tenableTesting ? 'Testing connection…' : tenableSaving ? 'Saving…' : '✓ Connect & Test'}
                </button>
              </div>
            )}

            {/* Data tabs when connected */}
            {tenableConnected && (
              <div>
                {/* Tabs + filters */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {[['findings','Findings'], ['scans','Scans']].map(([key, label]) => (
                    <button key={key} onClick={() => setTenableTab(key)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${tenableTab === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                      {label}{key === 'findings' && tenableFindings.length > 0 ? ` (${tenableFindings.length})` : ''}
                    </button>
                  ))}
                  {tenableTab === 'findings' && (
                    <>
                      <div className="flex gap-1 ml-2">
                        {['all','critical','high','medium','low'].map(s => (
                          <button key={s} onClick={() => { setTenableSevFilter(s); fetchTenableData(s); }}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize transition ${tenableSevFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <input value={tenableSearch} onChange={e => setTenableSearch(e.target.value)}
                        placeholder="Search findings…"
                        className="ml-auto text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        style={{ width: 180 }} />
                    </>
                  )}
                  {!tenableSummary && (
                    <button onClick={() => fetchTenableData()} disabled={tenableLoading}
                      className="ml-auto text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                      {tenableLoading ? 'Loading…' : 'Load Data'}
                    </button>
                  )}
                </div>

                {tenableLoading && (
                  <div className="flex items-center gap-2 py-6 text-xs text-slate-500">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Fetching findings from Tenable.io — this may take a moment…
                  </div>
                )}

                {/* FINDINGS TABLE — all required fields */}
                {!tenableLoading && tenableTab === 'findings' && (() => {
                  const sevColor = { critical: 'bg-red-50 text-red-700 border-red-200', high: 'bg-orange-50 text-orange-700 border-orange-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', low: 'bg-emerald-50 text-emerald-700 border-emerald-200', info: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const filtered = tenableFindings.filter(f =>
                    !tenableSearch || f.title?.toLowerCase().includes(tenableSearch.toLowerCase()) ||
                    f.cve?.toLowerCase().includes(tenableSearch.toLowerCase()) ||
                    f.asset_hostname?.toLowerCase().includes(tenableSearch.toLowerCase()) ||
                    String(f.plugin_id).includes(tenableSearch)
                  );
                  return filtered.length === 0
                    ? <div className="text-xs py-4 text-slate-500">
                        {tenableFindings.length === 0 ? 'Click Sync Now to fetch findings from Tenable.io.' : 'No findings match your search.'}
                      </div>
                    : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-xs" style={{ minWidth: 1100 }}>
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                            <tr>
                              <th className="text-left px-3 py-2.5">ID</th>
                              <th className="text-left px-3 py-2.5">Vulnerability Title</th>
                              <th className="text-left px-3 py-2.5">Severity</th>
                              <th className="text-left px-3 py-2.5">CVSS</th>
                              <th className="text-left px-3 py-2.5">CVE</th>
                              <th className="text-left px-3 py-2.5">CWE</th>
                              <th className="text-left px-3 py-2.5">Affected Asset</th>
                              <th className="text-left px-3 py-2.5">Status</th>
                              <th className="text-left px-3 py-2.5">First Detected</th>
                              <th className="text-left px-3 py-2.5">Last Detected</th>
                              <th className="text-left px-3 py-2.5">Owner</th>
                              <th className="text-left px-3 py-2.5">Source</th>
                              <th className="px-3 py-2.5"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((f, i) => {
                              const sc = sevColor[f.severity] || 'bg-slate-100 text-slate-700 border-slate-200';
                              return (
                                <tr key={f.finding_id || i} className="hover:bg-slate-50 cursor-pointer transition border-b border-slate-100 text-slate-900"
                                  onClick={() => { setTenableSelected(f); setTenableOwnerForm({ owner_name: f.owner_name||'', owner_department: f.owner_department||'', owner_email: f.owner_email||'', owner_manager: f.owner_manager||'' }); }}>
                                  <td className="px-3 py-2.5 font-mono text-slate-500 font-medium">{f.plugin_id}</td>
                                  <td className="px-3 py-2.5 text-slate-900 font-semibold max-w-[220px]">
                                    <div className="truncate" title={f.title}>{f.title}</div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${sc}`}>{f.severity}</span>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono font-bold">
                                    {f.cvss_score || '—'}
                                  </td>
                                  <td className="px-3 py-2.5 max-w-[100px]">
                                    <div className="truncate font-mono text-[10px] text-blue-600 font-semibold" title={f.cve}>{f.cve || '—'}</div>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[10px] text-purple-700 font-semibold">{f.cwe || '—'}</td>
                                  <td className="px-3 py-2.5 max-w-[140px]">
                                    <div className="truncate text-slate-900 font-medium" title={f.asset_hostname || f.asset_ip}>{f.asset_hostname || f.asset_ip || '—'}</div>
                                    {f.asset_ip && f.asset_hostname && <div className="text-[10px] font-mono text-slate-500">{f.asset_ip}</div>}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-100 text-slate-700 border border-slate-200">{f.status}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500">{f.first_found ? new Date(f.first_found).toLocaleDateString() : '—'}</td>
                                  <td className="px-3 py-2.5 text-slate-500">{f.last_found ? new Date(f.last_found).toLocaleDateString() : '—'}</td>
                                  <td className="px-3 py-2.5 max-w-[110px]">
                                    {f.owner_name
                                      ? <div><div className="text-slate-900 font-semibold truncate">{f.owner_name}</div><div className="text-[10px] text-slate-500 truncate">{f.owner_department}</div></div>
                                      : <span className="text-slate-400">Unassigned</span>}
                                  </td>
                                  <td className="px-3 py-2.5 text-[10px] text-blue-600 font-bold">Tenable.io</td>
                                  <td className="px-3 py-2.5">
                                    <button className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                      onClick={e => { e.stopPropagation(); setTenableSelected(f); setTenableOwnerForm({ owner_name: f.owner_name||'', owner_department: f.owner_department||'', owner_email: f.owner_email||'', owner_manager: f.owner_manager||'' }); }}>
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>;
                })()}

                {/* SCANS TABLE */}
                {!tenableLoading && tenableTab === 'scans' && (
                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    {tenableScans.length === 0
                      ? <div className="text-xs py-3 text-slate-500">No scans found. Click Sync Now to fetch.</div>
                      : <table className="w-full text-xs">
                          <thead className="border-b border-slate-200 text-slate-500 font-bold uppercase"><tr className="pb-2">
                            <th className="text-left py-2 pr-4">Scan Name</th>
                            <th className="text-left py-2 pr-4">Status</th>
                            <th className="text-left py-2 pr-4">Policy</th>
                            <th className="text-left py-2">Last Run</th>
                          </tr></thead>
                          <tbody>
                            {tenableScans.map((s, i) => {
                              return (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="py-2.5 pr-4 text-slate-900 font-semibold">{s.name}</td>
                                  <td className="py-2.5 pr-4">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">{s.status}</span>
                                  </td>
                                  <td className="py-2.5 pr-4 text-slate-600">{s.policy || '—'}</td>
                                  <td className="py-2.5 text-slate-500">{s.last_modification_date ? new Date(s.last_modification_date * 1000).toLocaleDateString() : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SLA Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'SLA Breached', value: slaStats.breached, color: 'text-red-600' },
          { label: 'Due in ≤3 Days', value: slaStats.dueSoon, color: 'text-orange-600' },
          { label: 'On Track', value: slaStats.onTrack, color: 'text-emerald-600' },
          { label: 'Remediated', value: slaStats.remediated, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* SLA rules strip */}
      <div className="flex gap-4 px-1 flex-wrap">
        {Object.entries(SEV).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-[10px] px-2.5 py-0.5 rounded-full border uppercase" style={{ background: v.bg, color: v.text, borderColor: v.border }}>{v.label}</span>
            <span className="text-slate-500 font-medium">SLA: {v.sla}d</span>
          </div>
        ))}
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard title="SLA Status" onDownload={() => dlCSV(['Status,Count', ...slaChartData.map(d => `${d.label},${d.value}`)], 'sla_status.csv')}>
          <HBarChart data={slaChartData} colorFn={(d) => d.label === 'Breached' ? '#DC2626' : d.label.includes('Soon') ? '#EA580C' : '#16A34A'} />
        </ChartCard>
        <ChartCard title="Severity Breakdown" onDownload={() => exportVulnsCSV(scopedVulns)}>
          <DonutChart vulns={scopedVulns} />
        </ChartCard>
        <ChartCard title="By Department" onDownload={() => dlCSV(['Department,Count', ...deptData.map(d => `${d.label},${d.value}`)], 'by_dept.csv')}>
          {deptData.length ? <HBarChart data={deptData} colorFn={() => th('#2563EB', { dark: '#60A5FA' })} /> : <p className="text-slate-400 text-xs py-4 text-center">No data</p>}
        </ChartCard>
        <ChartCard title="Trend (4 weeks)" onDownload={() => exportVulnsCSV(scopedVulns)}>
          <TrendChart vulns={scopedVulns} />
        </ChartCard>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, CVE, asset, owner…"
          className="text-xs rounded-xl px-3.5 py-2 text-slate-900 bg-white border border-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm" />
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)} className="text-xs rounded-xl px-3.5 py-2 text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium">
          <option value="">All Severities</option>
          {Object.entries(SEV).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs rounded-xl px-3.5 py-2 text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium">
          <option value="">All Statuses</option>
          <option value="open">Open</option><option value="in_progress">In Progress</option><option value="remediated">Remediated</option>
        </select>
        <select value={filterDate} onChange={e => { setFilterDate(e.target.value); if (e.target.value !== 'custom') { setDateFrom(''); setDateTo(''); } }}
          title="Filter by uploaded date"
          className="text-xs rounded-xl px-3.5 py-2 text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium">
          <option value="">📅 All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7">Last 7 Days</option>
          <option value="custom">Custom Range…</option>
        </select>
        {filterDate === 'custom' && (
          <>
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
              className="text-xs rounded-xl px-3 py-2 text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium" />
            <span className="text-xs text-slate-400 font-semibold">to</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
              className="text-xs rounded-xl px-3 py-2 text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium" />
          </>
        )}
        {depts.length > 0 && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-xs rounded-xl px-3.5 py-2 text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {(search || filterSev || filterStatus || filterDept || filterDate) && (
          <button onClick={() => { setSearch(''); setFilterSev(''); setFilterStatus(''); setFilterDept(''); setFilterDate(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 transition">✕ Clear</button>
        )}
      </div>

      {/* Date filter kya dikha raha hai — cards/charts/table sab isi scope par hain */}
      {filterDate && (
        <div className="flex items-center gap-2 px-1 -mt-3 text-[11px] text-slate-500 font-medium flex-wrap">
          <span>
            Showing <b className="text-slate-800">{displayed.length}</b> of {allVulns.length} — filtered on <b className="text-slate-800">uploaded_at</b>
          </span>
          {uploadDays.length > 0 && (
            <span className="text-slate-400">
              · data uploaded on: {uploadDays.slice(0, 6).map(prettyDay).join(', ')}{uploadDays.length > 6 ? ' …' : ''}
            </span>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {checked.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm">
          <span className="text-blue-900 text-xs font-bold">{checked.size} selected</span>
          <button onClick={() => setShowEmail(true)} className="text-xs font-bold px-3.5 py-1.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition">Email Selected</button>
          <button onClick={() => setShowJira(true)} className="text-xs font-bold px-3.5 py-1.5 rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition">Create Jira</button>
          <button onClick={() => exportVulnsCSV(selectedVulns)} className="text-xs font-bold px-3.5 py-1.5 rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition">⬇ Export Selected</button>
          <button onClick={() => setChecked(new Set())} className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-800">✕ Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input type="checkbox" checked={checked.size === displayed.length && displayed.length > 0} onChange={toggleAll}
                    className="rounded text-blue-600" />
                </th>
                {['Title', 'CVE / CVSS', 'Severity', 'Asset', 'Owner', 'SLA', 'Start Date', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center text-slate-400 py-12">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-slate-400 py-12">
                  {filterDate && scopedVulns.length === 0 && uploadDays.length > 0 ? (
                    <>
                      Nothing was uploaded in this date range.
                      <div className="text-slate-500 mt-1">Available upload dates: {uploadDays.slice(0, 6).map(prettyDay).join(', ')}</div>
                    </>
                  ) : 'No vulnerabilities found'}
                </td></tr>
              ) : displayed.map(v => {
                const sev = SEV[v.severity] || SEV.medium;
                const stat = STAT[v.status] || STAT.open;
                const sla = slaInfo(v);
                const isChecked = checked.has(v.id);
                return (
                  <tr key={v.id}
                    style={{ borderLeft: isChecked ? `3px solid ${th('#2563eb', { dark: '#60A5FA' })}` : selected?.id === v.id ? `3px solid ${sev.border}` : '3px solid transparent' }}
                    className="hover:bg-slate-50/80 transition border-b border-slate-100 text-slate-900">
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(v.id)} className="rounded text-blue-600" />
                    </td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => setSelected(v)}>
                      <button type="button" className="text-left text-blue-600 hover:text-blue-700 hover:underline font-bold text-xs max-w-[220px] truncate block">
                        {v.title}
                      </button>
                      <div className="text-slate-400 text-[10px] mt-0.5">Open scanner details</div>
                    </td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => setSelected(v)}>
                      <div className="text-slate-700 font-mono font-semibold text-xs">{v.cve || '—'}</div>
                      {v.cvss_score && <div className="text-amber-600 font-bold text-[10px]">CVSS {v.cvss_score}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase" style={{ background: sev.bg, color: sev.text, borderColor: sev.border }}>{sev.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium text-xs">{v.asset || '—'}</td>
                    <td className="px-4 py-3.5">
                      {v.owner_name ? (
                        <div>
                          <div className="text-slate-900 text-xs font-semibold">{v.owner_name}</div>
                          <div className="text-slate-500 text-[10px]">{v.owner_department}</div>
                        </div>
                      ) : (
                        <div className="relative">
                          <button onClick={() => setShowAssignFor(showAssignFor === v.id ? null : v.id)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">Assign →</button>
                          {showAssignFor === v.id && (
                            <AssignOwner assets={assets} onAssign={a => handleAssignOwner(v.id, a)} onClose={() => setShowAssignFor(null)} />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold" style={{ color: sla.color }}>{sla.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium text-xs whitespace-nowrap">
                      {v.discovered_at ? new Date(v.discovered_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase" style={{ background: stat.bg, color: stat.text, borderColor: th('#E2E8F0', { dark: '#334155' }) }}>{stat.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="px-5 py-3 text-slate-500 text-xs border-t border-slate-200 bg-slate-50">
            {displayed.length} vulnerabilit{displayed.length === 1 ? 'y' : 'ies'} · click a row to view details
          </div>
        )}
      </div>

      {/* Detail slide-over */}
      {selected && <VulnDetail vuln={selected} assets={assets} settings={settings} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} onAssignOwner={handleAssignOwner} />}

      {/* Modals */}
      {showEmail && <EmailModal vulns={selectedVulns} assets={assets} onClose={() => setShowEmail(false)} />}
      {showJira && <JiraModal vulns={selectedVulns} settings={settings} onClose={() => setShowJira(false)} />}
      {showSchedule && targetClient && (
        <ScheduleSyncModal
          clientId={targetClient}
          token={token}
          existing={activeSchedule}
          onClose={() => setShowSchedule(false)}
          onSaved={setActiveSchedule}
        />
      )}

      {/* Add Vulnerability Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add Vulnerability</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              <div><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Apache Log4Shell RCE" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">CVE</label>
                  <input value={form.cve} onChange={e => setForm(f => ({ ...f, cve: e.target.value }))} className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="CVE-2021-44228" /></div>
                <div><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">CVSS Score</label>
                  <input type="number" step="0.1" min="0" max="10" value={form.cvss_score} onChange={e => setForm(f => ({ ...f, cvss_score: e.target.value }))} className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="9.8" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Severity</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm font-semibold">
                    {Object.entries(SEV).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Asset</label>
                  <input value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="web-server-01" /></div>
              </div>
              <div><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 shadow-sm resize-none" placeholder="Brief description…" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50">{saving ? 'Adding…' : 'Add Vulnerability'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
