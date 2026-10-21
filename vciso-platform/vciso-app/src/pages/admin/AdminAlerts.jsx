import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';

const ALERT_ICONS = {
  contract_expiry: '📅', audit_due: '📋', framework_expiry: '🛡️',
  missing_policies: '📄', failed_integration: '🔗', mfa_disabled: '🔐',
  inactive_users: '👤', license_expiry: '🎫', invoice_overdue: '💳', critical_risk: '🚨',
};

const MOCK_ALERTS = [
  { id: '1', type: 'contract_expiry', title: 'Contract Expiring — HealthFirst Medical', description: 'Contract expires in 15 days on 27 Jun 2026', priority: 'critical', createdAt: '2026-06-12T10:00:00Z', status: 'unread', assignedTo: null },
  { id: '2', type: 'critical_risk', title: 'Critical Risk: Unpatched CVE-2024-1234', description: 'High severity vulnerability detected on HealthFirst Medical systems', priority: 'critical', createdAt: '2026-06-12T08:30:00Z', status: 'unread', assignedTo: 'Vikram' },
  { id: '3', type: 'mfa_disabled', title: 'MFA Disabled — 20 users without MFA', description: '20 users do not have MFA enabled, posing a security risk', priority: 'high', createdAt: '2026-06-11T14:00:00Z', status: 'unread', assignedTo: null },
  { id: '4', type: 'failed_integration', title: 'Integration Failed — Okta SSO', description: 'Okta SSO integration has been failing for 2 hours', priority: 'high', createdAt: '2026-06-11T10:00:00Z', status: 'unread', assignedTo: 'Ajay' },
  { id: '5', type: 'invoice_overdue', title: 'Invoice Overdue — RetailChain Inc', description: 'Invoice #INV-2026-042 is 7 days overdue ($2,800)', priority: 'high', createdAt: '2026-06-10T09:00:00Z', status: 'read', assignedTo: null },
  { id: '6', type: 'missing_policies', title: 'Missing Policies — 2 Required Policies', description: 'Incident Response Policy and BYOD Policy are not uploaded', priority: 'medium', createdAt: '2026-06-10T08:00:00Z', status: 'read', assignedTo: 'Mahesh' },
  { id: '7', type: 'audit_due', title: 'Audit Due — SOC 2 Audit in 30 Days', description: 'Annual SOC 2 audit scheduled for 12 Jul 2026', priority: 'medium', createdAt: '2026-06-09T12:00:00Z', status: 'read', assignedTo: null },
  { id: '8', type: 'license_expiry', title: 'License Expiring — Qualys (30 days)', description: 'Qualys license expires on 30 Sep 2026', priority: 'medium', createdAt: '2026-06-09T10:00:00Z', status: 'read', assignedTo: null },
  { id: '9', type: 'inactive_users', title: '4 Dormant Accounts Detected', description: 'Users with no login activity in 90+ days', priority: 'low', createdAt: '2026-06-08T16:00:00Z', status: 'read', assignedTo: null },
  { id: '10', type: 'framework_expiry', title: 'ISO 27001 Certification Expiring', description: 'ISO 27001 certification expires in 90 days', priority: 'low', createdAt: '2026-06-07T09:00:00Z', status: 'read', assignedTo: 'Vikram' },
];

function priorityBadgeClass(p) {
  switch (p) {
    case 'critical': return 'bg-red-50 text-red-700 border-red-200';
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function priorityBorder(p) {
  switch (p) {
    case 'critical': return 'border-l-red-500';
    case 'high': return 'border-l-orange-500';
    case 'medium': return 'border-l-amber-500';
    case 'low': return 'border-l-blue-500';
    default: return 'border-l-slate-300';
  }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminAlerts() {
  const { getToken } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [localAlerts, setLocalAlerts] = useState(null);

  useEffect(() => {
    fetch('/api/admin-portal/alerts', { headers: { 'Authorization': `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setAlerts(data); setLocalAlerts(data); })
      .catch(() => { setAlerts(MOCK_ALERTS); setLocalAlerts(MOCK_ALERTS); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-72">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  const src = localAlerts || alerts;
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  src.forEach(a => { if (counts[a.priority] !== undefined) counts[a.priority]++; });

  const filtered = src.filter(a =>
    (filterPriority === 'all' || a.priority === filterPriority) &&
    (filterType === 'all' || a.type === filterType) &&
    (filterStatus === 'all' || a.status === filterStatus)
  );

  const markRead = (id) => {
    setLocalAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'read' } : a));
  };

  const resolve = (id) => {
    setLocalAlerts(prev => prev.filter(a => a.id !== id));
  };

  const markAllRead = () => {
    setLocalAlerts(prev => prev.map(a => ({ ...a, status: 'read' })));
  };

  return (
    <div className="font-sans text-slate-900 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Alerts</h1>
        <p className="text-xs text-slate-500 mt-0.5">Real-time alerts, operational warnings, and security notices.</p>
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Critical', count: counts.critical, border: 'border-l-red-500', text: 'text-red-700', badgeCls: 'bg-red-50 text-red-700 border-red-200' },
          { label: 'High', count: counts.high, border: 'border-l-orange-500', text: 'text-orange-700', badgeCls: 'bg-orange-50 text-orange-700 border-orange-200' },
          { label: 'Medium', count: counts.medium, border: 'border-l-amber-500', text: 'text-amber-700', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Low', count: counts.low, border: 'border-l-blue-500', text: 'text-blue-700', badgeCls: 'bg-blue-50 text-blue-700 border-blue-200' },
        ].map(s => (
          <div
            key={s.label}
            className={`bg-white border border-slate-200 border-l-4 ${s.border} rounded-2xl p-5 shadow-sm cursor-pointer hover:border-slate-300 transition`}
            onClick={() => setFilterPriority(filterPriority === s.label.toLowerCase() ? 'all' : s.label.toLowerCase())}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${s.badgeCls}`}>
                {s.label}
              </span>
            </div>
            <div className={`text-3xl font-black mt-2 tracking-tight ${s.text}`}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Filters + bulk actions */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
        {[
          { val: filterPriority, set: setFilterPriority, options: [['all', 'All Priorities'], ['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']] },
          { val: filterType, set: setFilterType, options: [['all', 'All Types'], ['contract_expiry', 'Contract Expiry'], ['critical_risk', 'Critical Risk'], ['mfa_disabled', 'MFA Disabled'], ['failed_integration', 'Failed Integration'], ['invoice_overdue', 'Invoice Overdue'], ['missing_policies', 'Missing Policies'], ['audit_due', 'Audit Due'], ['license_expiry', 'License Expiry'], ['inactive_users', 'Inactive Users'], ['framework_expiry', 'Framework Expiry']] },
          { val: filterStatus, set: setFilterStatus, options: [['all', 'All Status'], ['unread', 'Unread'], ['read', 'Read']] },
        ].map((f, i) => (
          <select
            key={i}
            value={f.val}
            onChange={e => f.set(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            onClick={markAllRead}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition"
          >
            Mark All Read
          </button>
          <button
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition"
          >
            Export
          </button>
        </div>
      </div>

      {/* Alert count */}
      <div className="text-xs text-slate-500 font-medium">{filtered.length} alert(s) shown</div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map(a => (
          <div
            key={a.id}
            className={`bg-white border border-slate-200 border-l-4 ${priorityBorder(a.priority)} rounded-2xl p-5 shadow-sm transition ${
              a.status === 'read' ? 'opacity-75' : ''
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex gap-3.5 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0 mt-0.5">{ALERT_ICONS[a.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{a.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${priorityBadgeClass(a.priority)}`}>
                      {a.priority}
                    </span>
                    {a.status === 'unread' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        UNREAD
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mb-2 leading-relaxed">{a.description}</div>
                  <div className="flex gap-4 flex-wrap text-[11px] text-slate-400 font-medium">
                    <span>🕐 {timeAgo(a.createdAt)}</span>
                    {a.assignedTo ? <span>👤 Assigned to {a.assignedTo}</span> : <span>👤 Unassigned</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {a.status === 'unread' && (
                  <button
                    onClick={() => markRead(a.id)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  onClick={() => resolve(a.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-slate-400 text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-sm font-medium">
            No alerts match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
