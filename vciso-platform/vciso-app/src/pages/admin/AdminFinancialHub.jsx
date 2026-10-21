import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { useAdminData } from '../../contexts/AdminDataContext';
import { th } from '../../theme';

function fmt$(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Math.floor(Number(n)).toLocaleString('en-US');
}

function Spinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2">
      {children}
    </div>
  );
}

function KCard({ icon, label, value, sub, color }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
      style={{ borderLeft: color ? `4px solid ${color}` : undefined }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      {sub && <div className="text-slate-500 text-xs font-medium mt-1">{sub}</div>}
    </div>
  );
}

function TagCloud({ items, costMap, color, emptyMsg }) {
  if (!items || items.length === 0) {
    return <div className="text-slate-400 text-xs italic font-medium">{emptyMsg || 'None selected'}</div>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const cost = costMap?.[item.toLowerCase()] ?? costMap?.[item] ?? null;
        return (
          <span
            key={item}
            className="text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-slate-200 bg-slate-50 text-slate-700"
          >
            {item}
            {cost > 0 && (
              <span className="bg-white border border-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded text-blue-600">
                {fmt$(cost)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function toStr(v) {
  return typeof v === 'string' ? v : (v?.name || v?.tool || v?.framework || '');
}

function FormulaBlock({ step, children }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        Step {step}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );
}

function FormulaLine({ label, value, accent, indent, bold, topBorder }) {
  return (
    <div className={`flex justify-between items-center ${indent ? 'py-2 pl-9 pr-5' : 'py-2.5 px-5'} ${topBorder ? 'border-t border-slate-200' : 'border-t border-slate-100'} ${bold ? 'bg-slate-50/70' : ''}`}>
      <span className={`text-xs ${bold ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'}`}>{label}</span>
      <span className={`text-xs font-mono ${bold ? 'font-bold text-sm' : 'font-semibold'}`} style={{ color: accent || (bold ? th('#0F172A', { dark: '#F1F5F9' }) : th('#64748B', { dark: '#94A3B8' })) }}>{value}</span>
    </div>
  );
}

function CostCentre({ users, cl, integrationCostMap, frameworkCostMap, toolCostMap,
                       dashboardCost, integrationCost, frameworkCost, securityToolCost,
                       grandTotalCost }) {
  const { internal, external, partner, vciso, directors, total } = users;

  const countItems = (getter) => {
    const map = {};
    cl.forEach(c => {
      (getter(c) || []).forEach(item => {
        const key = toStr(item);
        if (key) map[key] = (map[key] || 0) + 1;
      });
    });
    return Object.entries(map);
  };

  const integrationItems = countItems(c => c.integrations);
  const frameworkItems   = countItems(c => c.frameworks);
  const toolItems        = countItems(c => [...(c.securityTools || []), ...(c.securityModules || [])]);

  const perUserCost = total > 0 ? Math.round(dashboardCost / total) : 100;

  return (
    <div className="mb-6 space-y-4">
      {/* User Breakdown */}
      <FormulaBlock step={1}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-slate-900 font-bold text-xs">👥 User Breakdown</span>
          <span className="text-blue-600 font-bold text-xs font-mono">Total: {total} users</span>
        </div>
        <FormulaLine label="Internal users"  value={`${internal}`} />
        <FormulaLine label="External users"  value={`${external}`} />
        <FormulaLine label="Partner users"   value={`${partner}`} />
        <FormulaLine label="vCISO users"     value={`${vciso}`} />
        <FormulaLine label="Directors"       value={`${directors}`} />
        <FormulaLine label={`= Total users`} value={`${total}`} bold accent={th('#2563EB', { dark: '#60A5FA' })} topBorder />
      </FormulaBlock>

      {/* Dashboard Cost */}
      <FormulaBlock step={2}>
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-slate-900 font-bold text-xs">💻 Dashboard Cost</span>
        </div>
        <FormulaLine label="Cost per user / month"  value={`${fmt$(perUserCost)}`} />
        <FormulaLine label="Number of users"        value={`${total}`} />
        <FormulaLine
          label={`= ${total} users × ${fmt$(perUserCost)}/user`}
          value={fmt$(dashboardCost)}
          bold accent="#059669" topBorder
        />
      </FormulaBlock>

      {/* Integrations */}
      <FormulaBlock step={3}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-slate-900 font-bold text-xs">🔗 Integrations</span>
          <span className="text-blue-600 text-xs font-semibold">{integrationItems.length} selected</span>
        </div>
        {integrationItems.length === 0
          ? <FormulaLine label="No integrations selected" value="$0" />
          : integrationItems.map(([name, count]) => {
              const cost = integrationCostMap[name.toLowerCase()] ?? 0;
              return <FormulaLine key={name} label={`${name} (${count} client${count > 1 ? 's' : ''})`} value={fmt$(cost)} indent />;
            })
        }
        {integrationItems.length > 0 && (
          <>
            <FormulaLine
              label={`Sum: ${integrationItems.map(([n]) => n).join(' + ')}`}
              value=""
              topBorder
            />
            <FormulaLine
              label={`= ${integrationItems.length} integration${integrationItems.length > 1 ? 's' : ''} × avg cost`}
              value={fmt$(integrationCost)}
              bold accent="#0284C7" topBorder
            />
          </>
        )}
      </FormulaBlock>

      {/* Frameworks */}
      <FormulaBlock step={4}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-slate-900 font-bold text-xs">📋 Compliance Frameworks</span>
          <span className="text-purple-600 text-xs font-semibold">{frameworkItems.length} selected</span>
        </div>
        {frameworkItems.length === 0
          ? <FormulaLine label="No frameworks selected" value="$0" />
          : frameworkItems.map(([name, count]) => {
              const cost = frameworkCostMap[name.toLowerCase()] ?? 0;
              return <FormulaLine key={name} label={`${name} (${count} client${count > 1 ? 's' : ''})`} value={fmt$(cost)} indent />;
            })
        }
        {frameworkItems.length > 0 && (
          <FormulaLine
            label={`= ${frameworkItems.length} framework${frameworkItems.length > 1 ? 's' : ''} total`}
            value={fmt$(frameworkCost)}
            bold accent="#7C3AED" topBorder
          />
        )}
      </FormulaBlock>

      {/* Security Tools */}
      <FormulaBlock step={5}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-slate-900 font-bold text-xs">🛡️ Security Tools & Modules</span>
          <span className="text-orange-600 text-xs font-semibold">{toolItems.length} selected</span>
        </div>
        {toolItems.length === 0
          ? <FormulaLine label="No tools selected" value="$0" />
          : toolItems.map(([name, count]) => {
              const cost = toolCostMap[name.toLowerCase()] ?? 0;
              return <FormulaLine key={name} label={`${name} (${count} client${count > 1 ? 's' : ''})`} value={fmt$(cost)} indent />;
            })
        }
        {toolItems.length > 0 && (
          <FormulaLine
            label={`= ${toolItems.length} tool${toolItems.length > 1 ? 's' : ''} total`}
            value={fmt$(securityToolCost)}
            bold accent="#F97316" topBorder
          />
        )}
      </FormulaBlock>

      {/* Grand Total */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-3">
          Total Cost Calculation
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Dashboard ({total} users × {fmt$(perUserCost)})</span>
            <span className="text-slate-900 font-bold font-mono">{fmt$(dashboardCost)}</span>
          </div>
          {integrationCost > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Integrations ({integrationItems.length} selected)</span>
              <span className="text-slate-900 font-bold font-mono">{fmt$(integrationCost)}</span>
            </div>
          )}
          {frameworkCost > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Frameworks ({frameworkItems.length} selected)</span>
              <span className="text-slate-900 font-bold font-mono">{fmt$(frameworkCost)}</span>
            </div>
          )}
          {securityToolCost > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Security Tools ({toolItems.length} selected)</span>
              <span className="text-slate-900 font-bold font-mono">{fmt$(securityToolCost)}</span>
            </div>
          )}
        </div>
        <div className="border-t border-emerald-200 pt-3.5 flex justify-between items-center">
          <div>
            <div className="text-slate-500 text-xs font-medium mb-0.5">
              {fmt$(dashboardCost)}{integrationCost > 0 ? ` + ${fmt$(integrationCost)}` : ''}{frameworkCost > 0 ? ` + ${fmt$(frameworkCost)}` : ''}{securityToolCost > 0 ? ` + ${fmt$(securityToolCost)}` : ''}
            </div>
            <div className="text-emerald-700 text-xs font-bold">Monthly Grand Total</div>
          </div>
          <div className="text-emerald-900 font-black text-3xl font-mono tracking-tight">{fmt$(grandTotalCost)}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminFinancialHub() {
  const { getToken } = useAuth();
  const { engineData, userCounts, loading, error } = useAdminData();
  const [previewClientId, setPreviewClientId] = useState('');
  const [costConfig, setCostConfig] = useState([]);

  useEffect(() => {
    fetch('/api/admin-portal/cost-config', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setCostConfig)
      .catch(() => {});
  }, [getToken]);

  if (loading) return <Spinner />;

  if (error || !engineData) return (
    <div className="flex justify-center items-center h-64 flex-col gap-3">
      <div className="text-4xl">💼</div>
      <div className="text-slate-500 text-xs font-medium">No data yet — complete client onboarding to populate this page.</div>
    </div>
  );

  const s   = engineData.summary || {};
  const cl  = engineData.clients || [];
  const inv = engineData.invoices || {};
  const live = userCounts?.totals || {};

  const integrationCostMap = {};
  const frameworkCostMap   = {};
  const toolCostMap        = {};
  costConfig.forEach(c => {
    const key = c.name.toLowerCase();
    if (c.category === 'integration')   integrationCostMap[key] = Number(c.monthly_cost);
    if (c.category === 'framework')     frameworkCostMap[key]   = Number(c.monthly_cost);
    if (c.category === 'security_tool') toolCostMap[key]        = Number(c.monthly_cost);
  });

  const monthlyRev        = s.totalMonthlyRevenue  || cl.reduce((a, c) => a + (c.costs?.grandTotal || 0), 0);
  const annualRev         = s.totalAnnualRevenue   || monthlyRev * 12;
  const invoicesGenerated = inv.total   ?? cl.length;
  const pendingInvCount   = inv.pending ?? 0;
  const paidInvCount      = inv.paid    ?? 0;
  const grandTotalBilling = inv.paidAmount || annualRev;

  const totalUsers = live.total     ?? s.totalUsers     ?? 0;
  const internal   = live.internal  ?? s.internalUsers  ?? 0;
  const external   = live.external  ?? s.externalUsers  ?? 0;
  const partner    = live.partner   ?? 0;
  const vciso      = live.vciso     ?? 0;
  const directors  = live.directors ?? 0;

  const completedOnb = cl.filter(c => {
    const p = c.onboarding?.progressPercent ?? (c.status === 'active' ? 100 : 0);
    return p >= 100;
  }).length;
  const inProgressCl = cl.filter(c => {
    const p = c.onboarding?.progressPercent ?? 0;
    return p > 0 && p < 100;
  }).length;
  const pendingCl = cl.filter(c => {
    const p = c.onboarding?.progressPercent ?? 0;
    return p === 0;
  }).length;

  const uniq = arr => [...new Set(arr.map(toStr).filter(Boolean))];

  const allIntegrations = uniq(cl.flatMap(c => c.integrations    || []));
  const allFrameworks   = uniq(cl.flatMap(c => c.frameworks      || []));
  const allTools        = uniq(cl.flatMap(c => [
    ...(c.securityTools  || []),
    ...(c.securityModules || []),
  ]));

  const dashboardCost      = cl.reduce((a, c) => a + (c.costs?.dashboardCost      || 0), 0);
  const integrationCost    = cl.reduce((a, c) => a + (c.costs?.integrationCost    || 0), 0);
  const frameworkCost      = cl.reduce((a, c) => a + (c.costs?.frameworkCost      || 0), 0);
  const securityToolCost   = cl.reduce((a, c) => a + (c.costs?.securityToolCost   || 0), 0);
  const securityModuleCost = cl.reduce((a, c) => a + (c.costs?.securityModuleCost || 0), 0);
  const grandTotalCost     = dashboardCost + integrationCost + frameworkCost + securityToolCost + securityModuleCost;

  const pc = cl.find(c => c.id === previewClientId) || cl[0];
  const invNum = pc
    ? `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(cl.indexOf(pc) + 1).padStart(4, '0')}`
    : '';

  return (
    <div className="font-sans text-slate-900 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Hub</h1>
        <p className="text-xs text-slate-500 mt-0.5">High-level financial summaries, billing breakdown, and invoicing forecast.</p>
      </div>

      {/* ── REVENUE SUMMARY ─────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Revenue Summary</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KCard icon="💵" label="Monthly Revenue"     value={fmt$(monthlyRev)}       color="#10B981"  sub="Current month" />
          <KCard icon="💰" label="Annual Revenue"      value={fmt$(annualRev)}         color="#10B981"  sub="12-month projection" />
          <KCard icon="📊" label="Grand Total Billing" value={fmt$(grandTotalBilling)} color={th('#2563EB', { dark: '#60A5FA' })}   sub="Cumulative" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <KCard icon="📄" label="Invoices Generated"  value={invoicesGenerated}              color="#7C3AED" />
          <KCard icon="⏳" label="Pending Invoices"    value={pendingInvCount}                color="#F59E0B" />
          <KCard icon="✅" label="Paid Invoices"       value={paidInvCount}                   color="#10B981"  />
        </div>
      </div>

      {/* ── USER SUMMARY ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>User Summary</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KCard icon="👥" label="Total Users" value={totalUsers} color={th('#2563EB', { dark: '#60A5FA' })}   />
          <KCard icon="🏢" label="Internal"    value={internal}   color="#7C3AED" />
          <KCard icon="🌐" label="External"    value={external}   color="#0284C7"   />
          <KCard icon="🤝" label="Partner"     value={partner}    color="#F97316" />
          <KCard icon="🛡️" label="vCISO"      value={vciso}      color="#D97706" />
          <KCard icon="👔" label="Directors"   value={directors}  color="#059669"  />
        </div>
      </div>

      {/* ── CLIENT SUMMARY ──────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Client Summary</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KCard icon="🏢" label="Total Clients"        value={cl.length}   color={th('#2563EB', { dark: '#60A5FA' })}   />
          <KCard icon="✅" label="Completed Onboarding" value={completedOnb} color="#10B981"  />
          <KCard icon="🔄" label="In Progress"          value={inProgressCl} color="#F59E0B" />
          <KCard icon="⏸️" label="Pending"              value={pendingCl}   color="#94A3B8"  />
        </div>
      </div>

      {/* ── INTEGRATIONS / FRAMEWORKS / TOOLS ───────────────────────────────── */}
      <div>
        <SectionLabel>Selected Services</SectionLabel>
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-3.5 py-2 mb-3 text-xs text-blue-700 font-medium">
          Cost per item shown per month
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-900 text-xs font-bold">🔗 Integrations</span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {allIntegrations.length} total
              </span>
            </div>
            <TagCloud items={allIntegrations} costMap={integrationCostMap} color={th('#2563EB', { dark: '#60A5FA' })} emptyMsg="No integrations selected" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-900 text-xs font-bold">📋 Frameworks</span>
              <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {allFrameworks.length} total
              </span>
            </div>
            <TagCloud items={allFrameworks} costMap={frameworkCostMap} color="#7C3AED" emptyMsg="No frameworks selected" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-900 text-xs font-bold">🛡️ Security Tools</span>
              <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {allTools.length} total
              </span>
            </div>
            <TagCloud items={allTools} costMap={toolCostMap} color="#F97316" emptyMsg="No tools selected" />
          </div>
        </div>
      </div>

      {/* ── COST CENTRE — FORMULA BREAKDOWN ─────────────────────────────────── */}
      <div>
        <SectionLabel>Cost Centre — Detailed Calculation</SectionLabel>
        <CostCentre
          users={{ internal, external, partner, vciso, directors, total: totalUsers }}
          cl={cl}
          integrationCostMap={integrationCostMap}
          frameworkCostMap={frameworkCostMap}
          toolCostMap={toolCostMap}
          dashboardCost={dashboardCost}
          integrationCost={integrationCost}
          frameworkCost={frameworkCost}
          securityToolCost={securityToolCost + securityModuleCost}
          grandTotalCost={grandTotalCost}
          monthlyRev={monthlyRev}
        />
      </div>

      {/* ── PER-CLIENT COST OVERVIEW ─────────────────────────────────────────── */}
      {cl.length > 0 && (
        <div>
          <SectionLabel>Per-Client Cost Overview</SectionLabel>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Client</th>
                    <th className="px-4 py-3 text-center">Users</th>
                    <th className="px-4 py-3 text-center">Dashboard</th>
                    <th className="px-4 py-3 text-center">Integration</th>
                    <th className="px-4 py-3 text-center">Framework</th>
                    <th className="px-4 py-3 text-center">Tools</th>
                    <th className="px-4 py-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cl.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="text-slate-900 font-bold text-xs">{c.companyName || c.name}</div>
                        <div className="text-slate-400 text-[11px]">{c.industry || '—'}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-700 font-medium">{c.users?.total ?? 0}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-700 font-medium">{fmt$(c.costs?.dashboardCost ?? 0)}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-700 font-medium">{fmt$(c.costs?.integrationCost ?? 0)}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-700 font-medium">{fmt$(c.costs?.frameworkCost ?? 0)}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-700 font-medium">{fmt$(c.costs?.securityToolCost ?? 0)}</td>
                      <td className="px-4 py-3.5 text-center text-xs font-bold text-emerald-600 font-mono">{fmt$(c.costs?.grandTotal ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE INVOICE PREVIEW ─────────────────────────────────────────────── */}
      {cl.length > 0 && (
        <div>
          <SectionLabel>Live Invoice Preview</SectionLabel>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-wrap gap-3">
              <span className="font-bold text-sm text-slate-900">Invoice Preview</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-medium">Client:</span>
                <select
                  value={previewClientId}
                  onChange={e => setPreviewClientId(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  {cl.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
                </select>
              </div>
            </div>

            {pc && (
              <div className="p-6 space-y-6">
                {/* Invoice meta */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Invoice Number', value: invNum, highlight: true },
                    { label: 'Client',          value: pc.companyName || pc.name, highlight: false },
                    { label: 'Total Users',     value: pc.users?.total ?? 0, highlight: false },
                    { label: 'Billing Period',  value: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), highlight: false },
                  ].map(row => (
                    <div key={row.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{row.label}</div>
                      <div className={`text-sm font-bold ${row.highlight ? 'text-blue-600 font-mono' : 'text-slate-900'}`}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* Line items table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        {
                          desc: 'Dashboard / User Licensing',
                          details: `${pc.users?.total ?? 0} users × $100/user`,
                          amount: pc.costs?.dashboardCost ?? 0,
                        },
                        {
                          desc: 'Integrations',
                          details: (pc.integrations?.length ? toStr(pc.integrations[0]) + (pc.integrations.length > 1 ? ` +${pc.integrations.length - 1} more` : '') : 'None selected'),
                          amount: pc.costs?.integrationCost ?? 0,
                        },
                        {
                          desc: 'Compliance Frameworks',
                          details: pc.frameworks?.slice(0, 3).map(toStr).join(', ') || 'None selected',
                          amount: pc.costs?.frameworkCost ?? 0,
                        },
                        {
                          desc: 'Security Tools',
                          details: pc.securityTools?.slice(0, 3).map(toStr).join(', ') || 'None selected',
                          amount: pc.costs?.securityToolCost ?? 0,
                        },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 text-slate-900 text-xs font-bold">{row.desc}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs font-medium">{row.details}</td>
                          <td className="px-4 py-3 text-slate-900 font-bold text-xs text-right font-mono">{fmt$(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand total */}
                <div className="flex justify-end">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-right min-w-[220px]">
                    <div className="text-slate-500 text-xs font-medium mb-1">Monthly Grand Total</div>
                    <div className="text-emerald-700 font-black text-2xl font-mono">{fmt$(pc.costs?.grandTotal ?? 0)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
