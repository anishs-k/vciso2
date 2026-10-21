import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useCurrency, CURRENCIES } from '../../contexts/CurrencyContext';
import { fmt$, fmtDate, Loader, Empty, ClientAvatar, StatusPill } from './OwnerShared';
import { th } from '../../theme';

/* ── Shared helper: read billing details from localStorage ── */
export function readBillingDetails() {
  try { return JSON.parse(localStorage.getItem('vcso-billing-details') || '{}'); }
  catch { return {}; }
}

/* ─── Palette ─── */
const C = {
  purple:'#7c3aed', purpleL:th('#f5f3ff', { dark: '#2E1065' }), purpleM:th('#ede9fe', { dark: '#2E1065' }),
  green:'#16a34a',  greenL:th('#f0fdf4', { dark: '#0B2E24' }),
  blue:th('#2563eb', { dark: '#60A5FA' }),   blueL:th('#eff6ff', { dark: '#172554' }),
  orange:'#ea580c', orangeL:th('#fff7ed', { dark: '#3A1F0A' }),
  teal:'#0d9488',   tealL:'#f0fdfa',
  red:'#dc2626',    redL:th('#fef2f2', { dark: '#3A1418' }),
  yellow:'#d97706', yellowL:th('#fffbeb', { dark: '#3A2A0A' }),
  ink:th('#0f172a', { dark: '#F1F5F9' }),    mid:th('#334155', { dark: '#CBD5E1' }),    muted:th('#64748b', { dark: '#94A3B8' }),
  border:th('#e2e8f0', { dark: '#334155' }), bg:th('#f8fafc', { dark: '#0F172A' }),     card:th('#ffffff', { dark: '#1E293B' }),
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CATEGORIES = ['Cloud Hosting','Consulting','Travel','Contractor','Software','Vendor','Other'];

function last12Labels() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return MONTHS[d.getMonth()];
  });
}

function costSeries(total, n = 12) {
  const s = [];
  let v = total;
  for (let i = n - 1; i >= 0; i--) {
    const jitter = 0.968 + (((total * (i + 9)) % 19) / 200);
    s.unshift(parseFloat((v * jitter).toFixed(2)));
    v = v / 1.028;
  }
  s[n - 1] = total;
  return s;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ─── Shared UI primitives ─── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: th('2px', { classic: '14px', dark: '14px' }), padding: '20px 22px',
      boxShadow: th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }), ...style,
    }}>{children}</div>
  );
}

function SHead({ title, sub, action, onAction }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px' }}>
      <div>
        <div style={{ fontSize:'15px', fontWeight:700, color:C.ink }}>{title}</div>
        {sub && <div style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>{sub}</div>}
      </div>
      {action && (
        <button onClick={onAction} style={{ background:'none', border:'none', color:C.purple, fontSize:'12px', fontWeight:700, cursor:'pointer', padding:0 }}>
          {action}
        </button>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent, alert: isAlert }) {
  return (
    <div style={{
      background: isAlert ? `${C.red}06` : C.card,
      border: `1px solid ${isAlert ? C.red+'35' : C.border}`,
      borderRadius:th('2px', { classic: '14px', dark: '14px' }), padding:'18px 20px',
      boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }),
      position:'relative', overflow:'hidden',
    }}>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'3px',
        background: isAlert ? C.red : (accent || C.purple),
        borderRadius:'14px 14px 0 0',
      }} />
      <div style={{
        width:'32px', height:'32px', borderRadius:th('2px', { classic: '8px', dark: '8px' }),
        background: isAlert ? `${C.red}15` : `${accent||C.purple}15`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'15px', marginBottom:'10px',
      }}>{icon}</div>
      <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.muted, marginBottom:'4px' }}>{label}</div>
      <div style={{ fontSize:'22px', fontWeight:800, color: isAlert ? C.red : C.ink, lineHeight:1.1, letterSpacing:'-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize:'11px', color:C.muted, marginTop:'4px' }}>{sub}</div>}
    </div>
  );
}

/* ─── SVG cost trend chart ─── */
function CostTrendChart({ data, labels }) {
  const { fmt } = useCurrency();
  const [hover, setHover] = useState(null);
  const W = 100, H = 120;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * W,
    y: H - ((v / max) * (H - 20)) - 10,
    v,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length-1].x},${H} L0,${H} Z`;
  return (
    <div>
      <svg viewBox={`0 0 100 ${H}`} style={{ width:'100%', height:H+'px', overflow:'visible' }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.teal} stopOpacity="0.18" />
            <stop offset="100%" stopColor={C.teal} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75,1].map(f => (
          <line key={f} x1="0" y1={H-f*(H-20)-10} x2="100" y2={H-f*(H-20)-10}
            stroke={C.border} strokeWidth="0.25" strokeDasharray="1,3" />
        ))}
        <path d={areaD} fill="url(#costGrad)" />
        <path d={pathD} fill="none" stroke={C.teal} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <line x1={pts[hover].x} y1="10" x2={pts[hover].x} y2={H}
            stroke={C.teal} strokeWidth="0.3" strokeDasharray="1,2" opacity="0.6" />
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover===i ? 2 : 0.9}
            fill={C.teal} stroke={C.card} strokeWidth="0.6"
            style={{ cursor:'crosshair', transition:'r 0.1s' }}
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {hover !== null && (() => {
          const p = pts[hover];
          const tx = p.x > 72 ? p.x - 18 : p.x + 2;
          return (
            <g>
              <rect x={tx} y={p.y-10} width="16" height="8" rx="2" fill={C.ink} opacity="0.85" />
              <text x={tx+8} y={p.y-4.5} textAnchor="middle" fill="white" fontSize="3" fontWeight="700">{fmt(p.v)}</text>
              <text x={tx+8} y={p.y-1.5} textAnchor="middle" fill="#a5b4fc" fontSize="2.4">{labels[hover]}</text>
            </g>
          );
        })()}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'5px' }}>
        {labels.map((l, i) => <span key={i} style={{ fontSize:'9px', color:C.muted }}>{l}</span>)}
      </div>
    </div>
  );
}

/* ─── Tab bar ─── */
const TABS = ['Overview','Billing Details','Cost Management','Billing History','Export & Share','Cost History & Activity','Cost Evidence'];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:'4px', borderBottom:`2px solid ${C.border}`, marginBottom:'24px', overflowX:'auto' }}>
      {TABS.map((t, i) => (
        <button key={i} onClick={() => onChange(i)} style={{
          background:'none', border:'none', cursor:'pointer', padding:'10px 16px',
          fontSize:'13px', fontWeight: active===i ? 700 : 500,
          color: active===i ? C.purple : C.muted,
          borderBottom: active===i ? `2px solid ${C.purple}` : '2px solid transparent',
          marginBottom:'-2px', whiteSpace:'nowrap', transition:'color 0.15s',
        }}>{t}</button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 0 — OVERVIEW
═══════════════════════════════════════════════════════════ */
function TabOverview({ clients, allInvoices, customCosts }) {
  const { fmt } = useCurrency();
  const totals = useMemo(() => {
    const dashboard    = clients.reduce((s,c) => s+(c.costs?.dashboardCost    ||0), 0);
    const frameworks   = clients.reduce((s,c) => s+(c.costs?.frameworkCost    ||0), 0);
    const audits       = clients.reduce((s,c) => s+(c.costs?.auditCost        ||0), 0);
    const tools        = clients.reduce((s,c) => s+(c.costs?.securityToolCost ||0), 0);
    const integrations = clients.reduce((s,c) => s+(c.costs?.integrationCost  ||0), 0);
    const grand        = clients.reduce((s,c) => s+(c.costs?.grandTotal       ||0), 0);
    const users        = clients.reduce((s,c) => s+(c.users?.total            ||0), 0);
    return { dashboard, frameworks, audits, tools, integrations, grand, users };
  }, [clients]);

  const activeCustomMonthly = useMemo(() => {
    return (customCosts||[]).filter(x=>x.status==='active').reduce((s,x) => {
      if (x.frequency==='monthly') return s+x.amount;
      if (x.frequency==='annual')  return s+x.amount/12;
      return s;
    }, 0);
  }, [customCosts]);

  const monthlyCost  = totals.grand + activeCustomMonthly;
  const annualCost   = monthlyCost * 12;
  const nextInvoice  = parseFloat((monthlyCost * 1.02).toFixed(2));
  const pendingAmt   = allInvoices.filter(i=>i.status==='pending'||i.status==='overdue').reduce((s,i)=>s+i.amount,0);
  const services     = useMemo(() => {
    const fw  = [...new Set(clients.flatMap(c=>(c.frameworks   ||[]).map(f=>f.name)))];
    const tls = [...new Set(clients.flatMap(c=>(c.securityTools||[]).map(t=>t.name)))];
    const int = [...new Set(clients.flatMap(c=>(c.integrations ||[]).map(i=>i.name)))];
    const aud = [...new Set(clients.flatMap(c=>(c.audits       ||[]).map(a=>a.name)))];
    return { fw, tls, int, aud };
  }, [clients]);
  const activeServices = services.fw.length+services.tls.length+services.int.length+services.aud.length;
  const totalUsers   = totals.users;
  const hasActive    = clients.some(c=>c.status==='active');
  const trendData    = useMemo(()=>costSeries(monthlyCost),[monthlyCost]);
  const trendLabels  = useMemo(()=>last12Labels(),[]);
  const nextDate = (() => {
    const d = new Date(); d.setMonth(d.getMonth()+1,1);
    return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  })();
  const activeCustomCount = (customCosts||[]).filter(x=>x.status==='active').length;

  /* cost breakdown table rows */
  const allFwCount  = clients.flatMap(c=>c.frameworks   ||[]).length;
  const allAudCount = clients.flatMap(c=>c.audits       ||[]).length;
  const allTlCount  = clients.flatMap(c=>c.securityTools||[]).length;
  const allIntCount = clients.flatMap(c=>c.integrations ||[]).length;
  const avgFwUnit   = allFwCount  ? parseFloat((totals.frameworks   / allFwCount).toFixed(2))  : 0;
  const avgAudUnit  = allAudCount ? parseFloat((totals.audits       / allAudCount).toFixed(2)) : 0;
  const avgTlUnit   = allTlCount  ? parseFloat((totals.tools        / allTlCount).toFixed(2))  : 0;
  const avgIntUnit  = allIntCount ? parseFloat((totals.integrations / allIntCount).toFixed(2)) : 0;

  const tableRows = [
    { component:'Dashboard Licenses', desc:'Platform access',             qty:totalUsers,   unit:'$100/user',          total:totals.dashboard    },
    { component:'Integrations',       desc:'Selected integrations',       qty:allIntCount,  unit:avgIntUnit?fmt(avgIntUnit)+'avg':'—', total:totals.integrations},
    { component:'Custom Costs',       desc:'Additional charges',          qty:activeCustomCount, unit:'—',               total:activeCustomMonthly  },
  ];

  const ytd = (() => {
    const now = new Date();
    return trendData.slice(12-now.getMonth()-1).reduce((s,v)=>s+v,0);
  })();
  const growth = trendData.length>=2 ? ((trendData[11]-trendData[10])/Math.max(trendData[10],1)*100).toFixed(1) : '0.0';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      {/* KPI row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
        <KpiCard icon="💰" label="Monthly Cost"    value={fmt(monthlyCost)} sub={`${clients.length} client(s)`} accent={C.purple} />
        <KpiCard icon="📅" label="Annual Cost"     value={fmt(annualCost)}  sub="projected"                    accent={C.teal}   />
        <KpiCard icon="🗓️" label="Next Invoice"   value={fmt(nextInvoice)} sub={`Due ${nextDate}`}            accent={C.blue}   />
        <KpiCard icon="⚠️" label="Pending Amount" value={fmt(pendingAmt)}  sub="pending + overdue"            accent={C.yellow} alert={pendingAmt>0} />
      </div>
      {/* KPI row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
        <KpiCard icon="🔧" label="Active Services"       value={activeServices} sub={`${services.fw.length} fw · ${services.tls.length} tools`} accent={C.green}  />
        <KpiCard icon="👥" label="Total Users"           value={totalUsers}     sub="across all clients"                                        accent={C.orange} />
        <KpiCard icon="✅" label="Subscription Status"  value={hasActive?'Active':'No Active Clients'} sub={hasActive?'All systems operational':''}  accent={hasActive?C.green:C.red} alert={!hasActive} />
        <KpiCard icon="📈" label="MoM Growth"           value={`+${growth}%`}  sub="month over month"                                          accent={C.teal}   />
      </div>

      {/* Cost Breakdown Table */}
      <Card style={{ padding:0 }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'15px', fontWeight:700, color:C.ink }}>Cost Breakdown</div>
          <div style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>Detailed billing by component</div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {['Component','Description','Qty','Unit Cost','Monthly Total'].map(h=>(
                  <th key={h} style={{ padding:'10px 22px', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted, textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r,i)=>(
                <tr key={i} style={{ background: i%2===1?C.bg:th('white', { dark: '#1E293B' }), borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:'12px 22px', fontSize:'13px', fontWeight:600, color:C.ink }}>{r.component}</td>
                  <td style={{ padding:'12px 22px', fontSize:'12px', color:C.muted }}>{r.desc}</td>
                  <td style={{ padding:'12px 22px', fontSize:'13px', color:C.mid }}>{r.qty}</td>
                  <td style={{ padding:'12px 22px', fontSize:'12px', color:C.muted }}>{r.unit}</td>
                  <td style={{ padding:'12px 22px', fontSize:'13px', fontWeight:700, color:C.ink }}>{fmt(r.total)}</td>
                </tr>
              ))}
              <tr style={{ borderTop:`2px solid ${C.border}`, background:C.bg }}>
                <td colSpan={4} style={{ padding:'14px 22px', fontSize:'13px', fontWeight:800, color:C.ink }}>Monthly Total</td>
                <td style={{ padding:'14px 22px', fontSize:'16px', fontWeight:800, color:C.purple }}>{fmt(monthlyCost)}</td>
              </tr>
              <tr style={{ background:`${C.purple}06`, borderTop:`1px solid ${C.purple}20` }}>
                <td colSpan={4} style={{ padding:'12px 22px', fontSize:'13px', fontWeight:800, color:C.ink }}>Annual Total</td>
                <td style={{ padding:'12px 22px', fontSize:'15px', fontWeight:800, color:C.purple }}>{fmt(annualCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cost Trend Chart */}
      <Card>
        <SHead title="Cost Trend — Last 12 Months" sub="Monthly billing over time" />
        <CostTrendChart data={trendData} labels={trendLabels} />
        <div style={{ display:'flex', gap:'32px', marginTop:'14px', paddingTop:'14px', borderTop:`1px solid ${C.border}` }}>
          {[
            { label:'Current MRR', value:fmt(monthlyCost), color:C.teal   },
            { label:'YTD Total',   value:fmt(ytd),         color:C.purple },
            { label:'Growth %',    value:`+${growth}%`,     color:C.green  },
          ].map((s,i)=>(
            <div key={i}>
              <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'2px' }}>{s.label}</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 1 — BILLING DETAILS
═══════════════════════════════════════════════════════════ */
const BD_EMPTY = {
  companyName:'', contactPerson:'', billingEmail:'', phone:'',
  gstNumber:'', panNumber:'', taxInformation:'',
  address:'', city:'', state:'', country:'', pincode:'',
  preferredCurrency:'USD', _updatedAt:null, _history:[],
};

const BD_LABELS = {
  companyName:'Company Name', contactPerson:'Contact Person',
  billingEmail:'Billing Email', phone:'Phone Number',
  gstNumber:'GST Number', panNumber:'PAN Number', taxInformation:'Tax Information',
  address:'Address', city:'City', state:'State', country:'Country',
  pincode:'Pincode', preferredCurrency:'Preferred Currency',
};

function TabBillingDetails() {
  const { syncFromBillingDetails } = useCurrency();
  const [form,  setForm]  = useState(BD_EMPTY);
  const [saved, setSaved] = useState(BD_EMPTY);
  const [toast, setToast] = useState(false);
  const [focus, setFocus] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(()=>{
    try {
      const raw = localStorage.getItem('vcso-billing-details');
      if (raw) { const v = { ...BD_EMPTY, ...JSON.parse(raw) }; setForm(v); setSaved(v); }
    } catch {}
  },[]);

  const handleSave = useCallback(()=>{
    const now = new Date().toISOString();
    /* Build change log */
    const changes = [];
    const TRACK_FIELDS = ['companyName','contactPerson','billingEmail','phone','gstNumber','panNumber','taxInformation','address','city','state','country','pincode','preferredCurrency'];
    TRACK_FIELDS.forEach(f => {
      if ((saved[f]||'') !== (form[f]||'')) {
        changes.push({ field: BD_LABELS[f]||f, from: saved[f]||'—', to: form[f]||'—' });
      }
    });
    const histEntry = changes.length > 0
      ? { date: now, changes }
      : null;
    const history = histEntry
      ? [histEntry, ...(saved._history || [])].slice(0, 50)
      : (saved._history || []);
    const next = { ...form, _updatedAt: now, _history: history };
    localStorage.setItem('vcso-billing-details', JSON.stringify(next));
    setSaved(next);
    setForm(next);
    syncFromBillingDetails();
    setToast(true);
    setTimeout(()=>setToast(false), 2500);
  },[form, saved, syncFromBillingDetails]);

  function inp(field, label, full=false, type='text') {
    return (
      <div style={{ gridColumn: full?'1/-1':'auto' }}>
        <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:C.mid, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
        <input
          type={type}
          value={form[field]||''}
          onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}
          onFocus={()=>setFocus(field)}
          onBlur={()=>setFocus(null)}
          style={{
            width:'100%', boxSizing:'border-box',
            border:`1.5px solid ${focus===field?C.purple:C.border}`,
            borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px',
            fontSize:'13px', color:C.ink, outline:'none', background:th('white', { dark: '#1E293B' }),
            transition:'border-color 0.15s',
          }}
        />
      </div>
    );
  }

  const hasChanges = ['companyName','contactPerson','billingEmail','phone','gstNumber','panNumber','taxInformation','address','city','state','country','pincode','preferredCurrency']
    .some(f => (saved[f]||'') !== (form[f]||''));

  const selCurrency = CURRENCIES.find(c=>c.code===form.preferredCurrency) || CURRENCIES[0];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* ── Active summary card ── */}
      {saved.companyName && (
        <Card style={{ background:`${C.purple}04`, border:`1px solid ${C.purple}20` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'18px', fontWeight:800, color:C.ink }}>{saved.companyName}</div>
              {saved.contactPerson && <div style={{ fontSize:'13px', color:C.mid, marginTop:'3px' }}>{saved.contactPerson}</div>}
              {saved.billingEmail  && <div style={{ fontSize:'12px', color:C.muted, marginTop:'4px' }}>✉ {saved.billingEmail}{saved.phone?`  ·  📱 ${saved.phone}`:''}</div>}
              {(saved.gstNumber||saved.panNumber) && (
                <div style={{ fontSize:'12px', color:C.muted, marginTop:'3px' }}>
                  {saved.gstNumber&&`GST: ${saved.gstNumber}`}{saved.gstNumber&&saved.panNumber?' · ':''}{saved.panNumber&&`PAN: ${saved.panNumber}`}
                </div>
              )}
              {saved.address && <div style={{ fontSize:'12px', color:C.muted, marginTop:'3px' }}>📍 {[saved.address,saved.city,saved.state,saved.pincode,saved.country].filter(Boolean).join(', ')}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px', flexShrink:0 }}>
              {saved._updatedAt && (
                <div style={{ fontSize:'11px', color:C.muted, textAlign:'right' }}>
                  Last updated<br/>
                  <strong style={{ color:C.ink }}>{new Date(saved._updatedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</strong>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:'6px', background:C.purpleL, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'5px 10px' }}>
                <span style={{ fontSize:'14px' }}>{selCurrency.flag}</span>
                <span style={{ fontSize:'12px', fontWeight:700, color:C.purple }}>{selCurrency.code} · {selCurrency.label}</span>
              </div>
              {(saved._history||[]).length > 0 && (
                <button onClick={()=>setShowHistory(h=>!h)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 10px', fontSize:'11px', cursor:'pointer', color:C.mid }}>
                  {showHistory?'Hide':'Show'} change history ({(saved._history||[]).length})
                </button>
              )}
            </div>
          </div>

          {/* ── Usage indicators ── */}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'14px', paddingTop:'12px', borderTop:`1px solid ${C.purple}15` }}>
            {[
              { icon:'📄', label:'Auto-fills Invoices'     },
              { icon:'📧', label:'Auto-fills Email Sender'  },
              { icon:'💬', label:'Auto-fills WhatsApp'      },
              { icon:'📊', label:'Powers PDF Reports'       },
              { icon:'💱', label:'Sets Default Currency'    },
            ].map((u,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px', background:th('white', { dark: '#1E293B' }), borderRadius:th('2px', { classic: '20px', dark: '20px' }), padding:'4px 10px', fontSize:'11px', fontWeight:600, color:C.purple, border:`1px solid ${C.purple}20` }}>
                <span>{u.icon}</span><span>{u.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Change History ── */}
      {showHistory && (saved._history||[]).length > 0 && (
        <Card style={{ padding:'18px 22px' }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:C.ink, marginBottom:'14px' }}>Change History</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
            {(saved._history||[]).map((h,i)=>(
              <div key={i} style={{ display:'flex', gap:'14px', marginBottom:'16px' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:C.purple, marginTop:'3px' }} />
                  {i < (saved._history||[]).length-1 && <div style={{ width:'2px', flex:1, background:C.border, marginTop:'4px' }} />}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'11px', color:C.muted, marginBottom:'6px' }}>
                    {new Date(h.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </div>
                  {h.changes.map((ch,j)=>(
                    <div key={j} style={{ fontSize:'12px', color:C.mid, marginBottom:'3px' }}>
                      <strong style={{ color:C.ink }}>{ch.field}</strong>
                      <span style={{ color:C.muted }}> changed from </span>
                      <span style={{ background:C.redL, color:C.red, borderRadius:th('2px', { classic: '4px', dark: '4px' }), padding:'1px 6px', fontFamily:'monospace', fontSize:'11px' }}>{ch.from}</span>
                      <span style={{ color:C.muted }}> to </span>
                      <span style={{ background:C.greenL, color:C.green, borderRadius:th('2px', { classic: '4px', dark: '4px' }), padding:'1px 6px', fontFamily:'monospace', fontSize:'11px' }}>{ch.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Edit Form ── */}
      <Card>
        <SHead title="Billing Details" sub="Master source for all invoices, reports, emails, and WhatsApp sharing" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {inp('companyName',   'Company Name')}
          {inp('contactPerson', 'Contact Person')}
          {inp('billingEmail',  'Billing Email', false, 'email')}
          {inp('phone',         'Phone Number',  false, 'tel')}
          {inp('gstNumber',     'GST Number')}
          {inp('panNumber',     'PAN Number')}
          {/* Preferred Currency */}
          <div>
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:C.mid, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Preferred Currency</label>
            <select value={form.preferredCurrency||'USD'} onChange={e=>setForm(p=>({...p,preferredCurrency:e.target.value}))}
              style={{ width:'100%', border:`1.5px solid ${focus==='preferredCurrency'?C.purple:C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', color:C.ink, outline:'none', background:th('white', { dark: '#1E293B' }) }}
              onFocus={()=>setFocus('preferredCurrency')} onBlur={()=>setFocus(null)}>
              {CURRENCIES.map(c=>(
                <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:C.mid, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Tax Information</label>
            <textarea value={form.taxInformation||''} onChange={e=>setForm(p=>({...p,taxInformation:e.target.value}))} rows={2}
              onFocus={()=>setFocus('taxInformation')} onBlur={()=>setFocus(null)}
              placeholder="Any additional tax registration numbers, VAT ID, TIN, etc."
              style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${focus==='taxInformation'?C.purple:C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', color:C.ink, outline:'none', resize:'vertical', background:th('white', { dark: '#1E293B' }), transition:'border-color 0.15s' }} />
          </div>
          {inp('address',       'Billing Address', true)}
          {inp('city',          'City')}
          {inp('state',         'State / Province')}
          {inp('country',       'Country')}
          {inp('pincode',       'Pincode / ZIP')}
        </div>
        <div style={{ marginTop:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={handleSave} style={{
            background: hasChanges ? C.purple : '#94a3b8', color:'white', border:'none',
            borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 24px', fontSize:'13px', fontWeight:700, cursor:'pointer',
            transition:'background 0.15s',
          }}>Save Details</button>
          {hasChanges && <div style={{ fontSize:'12px', color:C.yellow, fontWeight:600 }}>⚠ You have unsaved changes</div>}
          {toast && !hasChanges && (
            <div style={{ background:C.greenL, color:C.green, border:`1px solid ${C.green}30`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'8px 16px', fontSize:'13px', fontWeight:700 }}>
              ✓ Saved — currency & billing info updated across the portal
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 2 — COST MANAGEMENT
═══════════════════════════════════════════════════════════ */
const CC_EMPTY = { id:'', name:'', description:'', category:'Software', amount:0, frequency:'monthly', status:'active' };

function TabCostManagement({ customCosts, setCustomCosts }) {
  const { fmt } = useCurrency();
  const [modal, setModal]     = useState(null);   // null | CC_EMPTY-like object
  const [deleteTarget, setDeleteTarget] = useState(null); // null | cost object

  const monthlyTotal = useMemo(()=>
    customCosts.filter(x=>x.status==='active').reduce((s,x)=>{
      if (x.frequency==='monthly') return s+x.amount;
      if (x.frequency==='annual')  return s+x.amount/12;
      return s;
    },0)
  ,[customCosts]);

  function saveCustomCosts(next) {
    setCustomCosts(next);
    localStorage.setItem('vcso-custom-costs', JSON.stringify(next));
  }

  function handleSave() {
    if (!modal.name.trim()) return;
    const next = modal.id
      ? customCosts.map(x => x.id === modal.id ? modal : x)
      : [...customCosts, { ...modal, id: genId(), createdAt: new Date().toISOString() }];
    saveCustomCosts(next);
    setModal(null);
  }

  function handleDelete() {
    saveCustomCosts(customCosts.filter(x => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function toggleStatus(id) {
    saveCustomCosts(customCosts.map(x => x.id === id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x));
  }

  const freqLabel = f => f === 'monthly' ? 'Monthly' : f === 'annual' ? 'Annual' : 'One-time';
  const freqColor = f => f === 'monthly' ? C.blue : f === 'annual' ? C.purple : C.orange;
  const freqBg    = f => f === 'monthly' ? C.blueL  : f === 'annual' ? C.purpleL  : C.orangeL;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px' }}>
        <div>
          <div style={{ fontSize:'15px', fontWeight:700, color:C.ink }}>Custom Costs</div>
          <div style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>Additional charges outside the standard billing engine</div>
        </div>
        <button onClick={() => setModal({ ...CC_EMPTY })} style={{
          background: C.purple, color: 'white', border: 'none',
          borderRadius: th('2px', { classic: '9px', dark: '9px' }), padding: '10px 20px', fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: `0 2px 8px ${C.purple}40`,
        }}>+ Add Cost</button>
      </div>

      {/* Summary strip */}
      {customCosts.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
          {[
            { label:'Total Costs',    value: customCosts.length,                          color: C.purple },
            { label:'Active',         value: customCosts.filter(x=>x.status==='active').length,  color: C.green  },
            { label:'Monthly Impact', value: fmt(monthlyTotal),                           color: C.blue   },
          ].map(s => (
            <div key={s.label} style={{
              background:th('white', { dark: '#1E293B' }), border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '10px', dark: '10px' }),
              padding:'14px 18px', textAlign:'center',
            }}>
              <div style={{ fontSize:'20px', fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'11px', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:'3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table / empty state */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {customCosts.length === 0 ? (
          <div style={{ padding:'52px 32px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'14px' }}>💰</div>
            <div style={{ fontSize:'15px', fontWeight:700, color:C.ink, marginBottom:'6px' }}>No custom costs yet</div>
            <div style={{ fontSize:'13px', color:C.muted, marginBottom:'20px' }}>
              Add charges like software subscriptions, one-time fees, or annual contracts.
            </div>
            <button onClick={() => setModal({ ...CC_EMPTY })} style={{
              background: C.purple, color: 'white', border: 'none',
              borderRadius: th('2px', { classic: '9px', dark: '9px' }), padding: '10px 22px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            }}>+ Add Your First Cost</button>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {['Cost Name & Description','Category','Amount','Frequency','Status','Actions'].map(h=>(
                    <th key={h} style={{
                      padding:'11px 18px', fontSize:'10px', fontWeight:700,
                      textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted,
                      textAlign:'left', whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customCosts.map((cc, i) => (
                  <tr key={cc.id} style={{
                    borderBottom: i < customCosts.length-1 ? `1px solid ${C.border}` : 'none',
                    background: cc.status === 'inactive' ? th('#fafafa', { dark: '#0F172A' }) : th('white', { dark: '#1E293B' }),
                    opacity: cc.status === 'inactive' ? 0.7 : 1,
                  }}>
                    <td style={{ padding:'14px 18px', maxWidth:'220px' }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>{cc.name}</div>
                      {cc.description && (
                        <div style={{ fontSize:'11px', color:C.muted, marginTop:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cc.description}</div>
                      )}
                    </td>
                    <td style={{ padding:'14px 18px', fontSize:'12px', color:C.mid, whiteSpace:'nowrap' }}>{cc.category}</td>
                    <td style={{ padding:'14px 18px', fontSize:'14px', fontWeight:700, color:C.ink, whiteSpace:'nowrap' }}>{fmt(cc.amount)}</td>
                    <td style={{ padding:'14px 18px', whiteSpace:'nowrap' }}>
                      <span style={{
                        fontSize:'11px', fontWeight:600, padding:'3px 10px', borderRadius:th('2px', { classic: '20px', dark: '20px' }),
                        background: freqBg(cc.frequency), color: freqColor(cc.frequency),
                      }}>{freqLabel(cc.frequency)}</span>
                    </td>
                    <td style={{ padding:'14px 18px', whiteSpace:'nowrap' }}>
                      {/* Clickable status toggle */}
                      <button onClick={() => toggleStatus(cc.id)} title="Click to toggle" style={{
                        background: cc.status==='active' ? C.greenL : th('#f1f5f9', { dark: '#172033' }),
                        color: cc.status==='active' ? C.green : C.muted,
                        border: `1px solid ${cc.status==='active' ? C.green+'40' : C.border}`,
                        borderRadius:th('2px', { classic: '20px', dark: '20px' }), padding:'3px 12px', fontSize:'11px', fontWeight:700,
                        cursor:'pointer',
                      }}>
                        {cc.status==='active' ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td style={{ padding:'14px 18px' }}>
                      <div style={{ display:'flex', gap:'7px', alignItems:'center' }}>
                        {/* Edit */}
                        <button
                          onClick={() => setModal({ ...cc })}
                          style={{
                            padding:'6px 14px', fontSize:'12px', fontWeight:700,
                            border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }),
                            background:th('white', { dark: '#1E293B' }), color:C.mid, cursor:'pointer',
                          }}
                        >Edit</button>
                        {/* Remove */}
                        <button
                          onClick={() => setDeleteTarget(cc)}
                          style={{
                            padding:'6px 14px', fontSize:'12px', fontWeight:700,
                            border:`1px solid ${C.red}40`, borderRadius:th('2px', { classic: '7px', dark: '7px' }),
                            background:`${C.red}08`, color:C.red, cursor:'pointer',
                          }}
                        >Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{
            background:th('white', { dark: '#1E293B' }), borderRadius:th('2px', { classic: '16px', dark: '16px' }), padding:'28px 32px',
            width:'100%', maxWidth:'500px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)',
          }}>
            <div style={{ fontSize:'17px', fontWeight:800, color:C.ink, marginBottom:'22px' }}>
              {modal.id ? '✏️ Edit Cost' : '➕ Add New Cost'}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {/* Name */}
              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cost Name *</label>
                <input
                  value={modal.name}
                  onChange={e => setModal(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. AWS Cloud Infrastructure"
                  style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${modal.name ? C.purple : C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 13px', fontSize:'13px', outline:'none' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Description</label>
                <textarea
                  value={modal.description}
                  onChange={e => setModal(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional details about this cost..."
                  rows={2}
                  style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 13px', fontSize:'13px', outline:'none', resize:'vertical', fontFamily:'inherit' }}
                />
              </div>

              {/* Category + Amount */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Category</label>
                  <select
                    value={modal.category}
                    onChange={e => setModal(p => ({ ...p, category: e.target.value }))}
                    style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 13px', fontSize:'13px', outline:'none', background:th('white', { dark: '#1E293B' }), cursor:'pointer' }}
                  >
                    {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Amount (USD)</label>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:C.muted, fontWeight:700 }}>$</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={modal.amount}
                      onChange={e => setModal(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                      style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 13px 10px 26px', fontSize:'13px', outline:'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Billing Frequency</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[
                    { val:'monthly', label:'Monthly' },
                    { val:'annual',  label:'Annual'  },
                    { val:'onetime', label:'One-time' },
                  ].map(f => (
                    <button
                      key={f.val}
                      onClick={() => setModal(p => ({ ...p, frequency: f.val }))}
                      style={{
                        flex:1, padding:'9px', fontSize:'12px', fontWeight:700, borderRadius:th('2px', { classic: '8px', dark: '8px' }), cursor:'pointer',
                        border: `1.5px solid ${modal.frequency === f.val ? freqColor(f.val) : C.border}`,
                        background: modal.frequency === f.val ? freqBg(f.val) : th('white', { dark: '#1E293B' }),
                        color: modal.frequency === f.val ? freqColor(f.val) : C.muted,
                      }}
                    >{f.label}</button>
                  ))}
                </div>
              </div>

              {/* Status toggle */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.bg, borderRadius:th('2px', { classic: '9px', dark: '9px' }), padding:'12px 16px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>Status</div>
                  <div style={{ fontSize:'11px', color:C.muted }}>Inactive costs won't affect billing totals</div>
                </div>
                <div
                  onClick={() => setModal(p => ({ ...p, status: p.status === 'active' ? 'inactive' : 'active' }))}
                  style={{ width:'44px', height:'24px', borderRadius:th('2px', { classic: '12px', dark: '12px' }), background: modal.status === 'active' ? C.green : th('#cbd5e1', { dark: '#334155' }), cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}
                >
                  <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:th('white', { dark: '#1E293B' }), position:'absolute', top:'3px', left: modal.status === 'active' ? '23px' : '3px', transition:'left 0.2s', boxShadow:th('none', { classic: '0 1px 3px rgba(0,0,0,0.2)', dark: '0 1px 3px rgba(0,0,0,0.2)' }) }} />
                </div>
              </div>

              {/* Amount preview */}
              {modal.amount > 0 && (
                <div style={{ background:`${C.purple}08`, border:`1px solid ${C.purple}25`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 14px', fontSize:'12px', color:C.ink }}>
                  This will add <strong style={{ color:C.purple }}>
                    {modal.frequency === 'monthly' ? fmt(modal.amount) + '/month'
                     : modal.frequency === 'annual' ? fmt(modal.amount) + '/year (' + fmt(parseFloat((modal.amount/12).toFixed(2))) + '/month)'
                     : fmt(modal.amount) + ' one-time'}
                  </strong> to your billing.
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:'10px', marginTop:'24px', justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 20px', fontSize:'13px', fontWeight:600, cursor:'pointer', color:C.mid }}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={!modal.name.trim()}
                style={{ background: modal.name.trim() ? C.purple : '#94a3b8', color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 24px', fontSize:'13px', fontWeight:700, cursor: modal.name.trim() ? 'pointer' : 'not-allowed' }}
              >{modal.id ? 'Save Changes' : 'Add Cost'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:th('white', { dark: '#1E293B' }), borderRadius:th('2px', { classic: '14px', dark: '14px' }), padding:'28px 32px', width:'100%', maxWidth:'380px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize:'24px', marginBottom:'12px', textAlign:'center' }}>🗑️</div>
            <div style={{ fontSize:'16px', fontWeight:800, color:C.ink, marginBottom:'6px', textAlign:'center' }}>Remove Cost?</div>
            <div style={{ fontSize:'13px', color:C.muted, marginBottom:'6px', textAlign:'center' }}>
              You're about to remove <strong style={{ color:C.ink }}>{deleteTarget.name}</strong>.
            </div>
            <div style={{ fontSize:'13px', color:C.muted, marginBottom:'24px', textAlign:'center' }}>This cannot be undone.</div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer', color:C.mid }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex:1, background:C.red, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 3 — BILLING HISTORY
═══════════════════════════════════════════════════════════ */
const PAGE_SIZE = 10;

function TabBillingHistory({ allInvoices, navigate }) {
  const { fmt } = useCurrency();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const counts = useMemo(()=>({
    all:     allInvoices.length,
    paid:    allInvoices.filter(i=>i.status==='paid').length,
    pending: allInvoices.filter(i=>i.status==='pending').length,
    overdue: allInvoices.filter(i=>i.status==='overdue').length,
  }),[allInvoices]);

  const filtered = useMemo(()=>{
    let list = allInvoices;
    if (filter!=='all') list = list.filter(i=>i.status===filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i=>(i.client.companyName||i.client.name||'').toLowerCase().includes(q)||i.id.toLowerCase().includes(q));
    }
    return list;
  },[allInvoices,filter,search]);

  const totalPages = Math.ceil(filtered.length/PAGE_SIZE) || 1;
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const totalPaid    = allInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0);
  const totalPending = allInvoices.filter(i=>i.status==='pending').reduce((s,i)=>s+i.amount,0);
  const totalOverdue = allInvoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+i.amount,0);

  const FILTERS = [
    { key:'all',     label:'All',     count:counts.all,     color:C.purple },
    { key:'paid',    label:'Paid',    count:counts.paid,    color:C.green  },
    { key:'pending', label:'Pending', count:counts.pending, color:C.yellow },
    { key:'overdue', label:'Overdue', count:counts.overdue, color:C.red    },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* Filters + search */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
        <div style={{ display:'flex', gap:'6px' }}>
          {FILTERS.map(f=>(
            <button key={f.key} onClick={()=>{setFilter(f.key);setPage(1);}} style={{
              background: filter===f.key?f.color:'none',
              color: filter===f.key?'white':C.mid,
              border:`1.5px solid ${filter===f.key?f.color:C.border}`,
              borderRadius:th('2px', { classic: '20px', dark: '20px' }), padding:'5px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', gap:'6px',
            }}>
              {f.label}
              <span style={{ background: filter===f.key?'rgba(255,255,255,0.25)':C.bg, borderRadius:th('2px', { classic: '10px', dark: '10px' }), padding:'1px 7px', fontSize:'11px' }}>{f.count}</span>
            </button>
          ))}
        </div>
        <input placeholder="Search by client or invoice #…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
          style={{ border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'7px 14px', fontSize:'12px', outline:'none', width:'240px' }} />
      </div>

      {/* Table */}
      <Card style={{ padding:0 }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {['Invoice #','Client','Period','Amount','Due Date','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted, textAlign:'left', whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length===0?(
                <tr><td colSpan={7} style={{ padding:'32px', textAlign:'center' }}><Empty msg="No invoices match your filter." /></td></tr>
              ):paged.map((inv,i)=>(
                <tr key={inv.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===1?C.bg:th('white', { dark: '#1E293B' }) }}>
                  <td style={{ padding:'12px 16px', fontSize:'12px', fontWeight:600, color:C.mid, fontFamily:'monospace' }}>{inv.id}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <ClientAvatar name={inv.client.companyName||inv.client.name} size={24} />
                      <span style={{ fontSize:'12px', color:C.ink, fontWeight:500 }}>{inv.client.companyName||inv.client.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:'12px', color:C.mid }}>{inv.period}</td>
                  <td style={{ padding:'12px 16px', fontSize:'13px', fontWeight:700, color:C.ink }}>{fmt(inv.amount)}</td>
                  <td style={{ padding:'12px 16px', fontSize:'12px', color:C.mid }}>{inv.dueDate?fmtDate(inv.dueDate):'—'}</td>
                  <td style={{ padding:'12px 16px' }}><StatusPill status={inv.status} /></td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={()=>navigate(`/owner-portal/clients?id=${inv.client.id}`)}
                        style={{ background:C.blueL, color:C.blue, border:'none', borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 12px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>View</button>
                      <button onClick={()=>alert('PDF download coming soon')}
                        style={{ background:C.bg, color:C.mid, border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 12px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages>1 && (
          <div style={{ padding:'14px 16px', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:'6px', justifyContent:'center' }}>
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
              style={{ border:`1px solid ${C.border}`, background:'none', borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'5px 12px', fontSize:'12px', cursor:page===1?'default':'pointer', color:page===1?C.muted:C.mid }}>Prev</button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
              <button key={n} onClick={()=>setPage(n)}
                style={{ border:`1px solid ${n===page?C.purple:C.border}`, background:n===page?C.purple:'none', color:n===page?'white':C.mid, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'5px 10px', fontSize:'12px', cursor:'pointer' }}>{n}</button>
            ))}
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}
              style={{ border:`1px solid ${C.border}`, background:'none', borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'5px 12px', fontSize:'12px', cursor:page===totalPages?'default':'pointer', color:page===totalPages?C.muted:C.mid }}>Next</button>
          </div>
        )}
      </Card>

      {/* Summary footer */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
        {[
          { label:'Total Paid',    value:totalPaid,    color:C.green,  bg:C.greenL  },
          { label:'Total Pending', value:totalPending, color:C.yellow, bg:C.yellowL },
          { label:'Total Overdue', value:totalOverdue, color:C.red,    bg:C.redL    },
        ].map((s,i)=>(
          <div key={i} style={{ background:s.bg, border:`1px solid ${s.color}25`, borderRadius:th('2px', { classic: '10px', dark: '10px' }), padding:'14px 18px', textAlign:'center' }}>
            <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', color:s.color, marginBottom:'4px' }}>{s.label}</div>
            <div style={{ fontSize:'20px', fontWeight:800, color:s.color }}>{fmt(s.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 4 — EXPORT & SHARE
═══════════════════════════════════════════════════════════ */
function TabExportShare() {
  const bd = readBillingDetails();
  const [email,       setEmail]       = useState(bd.billingEmail || '');
  const [phone,       setPhone]       = useState(bd.phone || '');
  const [shareLink,   setShareLink]   = useState('');
  const [linkCopied,  setLinkCopied]  = useState(false);

  /* Keep email/phone in sync if billing details change while tab is open */
  useEffect(() => {
    const sync = () => {
      const fresh = readBillingDetails();
      if (!email && fresh.billingEmail) setEmail(fresh.billingEmail);
      if (!phone && fresh.phone)        setPhone(fresh.phone);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [email, phone]);

  const bdHeader = bd.companyName ? (
    <div style={{ background:`${C.purple}06`, border:`1px solid ${C.purple}20`, borderRadius:th('2px', { classic: '10px', dark: '10px' }), padding:'12px 16px', marginBottom:'16px', fontSize:'12px', color:C.mid }}>
      <span style={{ fontWeight:700, color:C.ink }}>{bd.companyName}</span>
      {bd.billingEmail && <span> · {bd.billingEmail}</span>}
      {bd.gstNumber    && <span> · GST: {bd.gstNumber}</span>}
    </div>
  ) : null;

  const soon = (title) => alert(`${title} — PDF generation with Billing Details will be available soon.`);

  const downloads = [
    { icon:'📄', title:'Invoice PDF',          desc:'Current month invoice in PDF format'           },
    { icon:'📊', title:'Billing Summary',       desc:'Monthly cost breakdown report'                  },
    { icon:'📋', title:'Cost Breakdown',        desc:'Detailed service costs itemized'               },
    { icon:'📑', title:'Subscription Summary',  desc:'Active services and license list'              },
    { icon:'📈', title:'Annual Billing Report', desc:'Year-to-date revenue and usage report'         },
  ];

  function handleGenerateLink() {
    const fake = `https://vcso.app/share/${genId()}`;
    setShareLink(fake);
    setLinkCopied(false);
  }

  function handleCopyLink() {
    setLinkCopied(true);
    alert('Link copied!');
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      {bdHeader}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
      {/* Left: Download Reports */}
      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        <div style={{ fontSize:'15px', fontWeight:700, color:C.ink }}>Download Reports</div>
        {downloads.map((d,i)=>(
          <Card key={i} style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:th('2px', { classic: '10px', dark: '10px' }), background:C.purpleL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{d.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:C.ink }}>{d.title}</div>
                <div style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>{d.desc}</div>
                {bd.companyName && <div style={{ fontSize:'10px', color:C.purple, marginTop:'3px', fontWeight:600 }}>Includes {bd.companyName} billing info</div>}
              </div>
              <button onClick={()=>soon(d.title)} style={{ background:C.purple, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'7px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer', flexShrink:0 }}>Download</button>
            </div>
          </Card>
        ))}
      </div>

      {/* Right: Share Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        <div style={{ fontSize:'15px', fontWeight:700, color:C.ink }}>Share Options</div>

        {/* Email */}
        <Card style={{ padding:'18px' }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:th('2px', { classic: '10px', dark: '10px' }), background:C.blueL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>✉️</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:C.ink, marginBottom:'2px' }}>Send Invoice via Email</div>
              <div style={{ fontSize:'12px', color:C.muted, marginBottom:'6px' }}>Email the current invoice as a PDF attachment</div>
              {bd.billingEmail && email === bd.billingEmail && (
                <div style={{ fontSize:'11px', color:C.purple, fontWeight:600, marginBottom:'8px' }}>✓ Auto-filled from Billing Details</div>
              )}
              <div style={{ display:'flex', gap:'8px' }}>
                <input type="email" placeholder="recipient@email.com" value={email} onChange={e=>setEmail(e.target.value)}
                  style={{ flex:1, border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 12px', fontSize:'12px', outline:'none' }} />
                <button onClick={()=>alert(`Invoice will be sent to ${email||'recipient'}`)}
                  style={{ background:C.blue, color:'white', border:'none', borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>Send</button>
              </div>
            </div>
          </div>
        </Card>

        {/* WhatsApp */}
        <Card style={{ padding:'18px' }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:th('2px', { classic: '10px', dark: '10px' }), background:C.greenL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>💬</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:C.ink, marginBottom:'2px' }}>Send via WhatsApp</div>
              <div style={{ fontSize:'12px', color:C.muted, marginBottom:'6px' }}>Share invoice link via WhatsApp message</div>
              {bd.phone && phone === bd.phone && (
                <div style={{ fontSize:'11px', color:C.purple, fontWeight:600, marginBottom:'8px' }}>✓ Auto-filled from Billing Details</div>
              )}
              <div style={{ display:'flex', gap:'8px' }}>
                <input type="tel" placeholder="+91 98765 43210" value={phone} onChange={e=>setPhone(e.target.value)}
                  style={{ flex:1, border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 12px', fontSize:'12px', outline:'none' }} />
                <button onClick={()=>alert(`WhatsApp message will be sent to ${phone||'number'}`)}
                  style={{ background:C.green, color:'white', border:'none', borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>Send</button>
              </div>
            </div>
          </div>
        </Card>

        {/* Share Link */}
        <Card style={{ padding:'18px' }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:th('2px', { classic: '10px', dark: '10px' }), background:C.orangeL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>🔗</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:C.ink, marginBottom:'2px' }}>Generate Share Link</div>
              <div style={{ fontSize:'12px', color:C.muted, marginBottom:'10px' }}>Create a secure link to share billing information</div>
              {!shareLink ? (
                <button onClick={handleGenerateLink}
                  style={{ background:C.orange, color:'white', border:'none', borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>Generate Link</button>
              ) : (
                <div style={{ display:'flex', gap:'8px' }}>
                  <input readOnly value={shareLink}
                    style={{ flex:1, border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 12px', fontSize:'11px', outline:'none', color:C.mid, background:C.bg }} />
                  <button onClick={handleCopyLink}
                    style={{ background:linkCopied?C.green:C.orange, color:'white', border:'none', borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>
                    {linkCopied?'Copied!':'Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
      </div>{/* end 2-col grid */}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 5 — COST HISTORY & ACTIVITY
═══════════════════════════════════════════════════════════ */

/* Color legend:
   green  = cost reduction / payment received
   red    = cost increase / overdue
   blue   = configuration change (tools, integrations)
   purple = billing / subscription update
   yellow = pending / invoice outstanding
   teal   = custom / manual cost
   orange = audit / security
*/

const ACT_TYPES = [
  'All Types',
  'Framework Added','Framework Removed',
  'Audit Added','Audit Removed',
  'Security Tool Added','Security Tool Removed',
  'Integration Added','Integration Removed',
  'User Added','User Removed',
  'Invoice Generated','Invoice Paid','Invoice Overdue',
  'Custom Cost Added','Custom Cost Edited','Custom Cost Deleted',
  'Billing Details Updated','Currency Changed',
];

function impactColor(delta) {
  if (delta > 0)  return C.red;
  if (delta < 0)  return C.green;
  return C.purple;
}
function impactBg(delta) {
  if (delta > 0)  return C.redL;
  if (delta < 0)  return C.greenL;
  return C.purpleL;
}
function impactSign(delta, fmtFn, abs) {
  if (delta > 0) return `+${fmtFn(abs)} /mo`;
  if (delta < 0) return `-${fmtFn(abs)} /mo`;
  return null;
}

function fmtFullDate(isoOrStr) {
  if (!isoOrStr) return null;
  try {
    const d = new Date(isoOrStr);
    if (isNaN(d)) return isoOrStr;
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return isoOrStr; }
}

function fmtMonthYear(month, year) {
  return `${MONTHS[(month||1)-1]} ${year}`;
}

function StatusBadge({ status }) {
  const cfg = {
    completed: { bg:C.greenL, color:C.green },
    paid:      { bg:C.greenL, color:C.green },
    pending:   { bg:C.yellowL, color:C.yellow },
    overdue:   { bg:C.redL,   color:C.red    },
    active:    { bg:C.blueL,  color:C.blue   },
    synced:    { bg:C.purpleL,color:C.purple  },
  }[status] || { bg:C.bg, color:C.muted };
  return (
    <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 9px', borderRadius:th('2px', { classic: '20px', dark: '20px' }), background:cfg.bg, color:cfg.color }}>
      {status ? status.charAt(0).toUpperCase()+status.slice(1) : 'Completed'}
    </span>
  );
}

function ActivityCard({ entry, isLast }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasDetail = entry.description || (entry.attachments||[]).length > 0 || entry.changedBy;
  return (
    <div style={{ display:'flex', gap:'0', marginBottom: isLast?0:'12px' }}>
      {/* Timeline spine */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'40px', flexShrink:0 }}>
        <div style={{
          width:'14px', height:'14px', borderRadius:'50%',
          background: entry.dotColor || C.purple,
          border:'3px solid white',
          boxShadow:`0 0 0 2px ${entry.dotColor||C.purple}40`,
          zIndex:1, flexShrink:0,
          marginTop:'18px',
        }} />
        {!isLast && <div style={{ width:'2px', flex:1, background:C.border, marginTop:'4px' }} />}
      </div>

      {/* Card */}
      <div style={{
        flex:1,
        background:th('white', { dark: '#1E293B' }),
        border:`1px solid ${entry.dotColor||C.border}22`,
        borderLeft:`3px solid ${entry.dotColor||C.purple}`,
        borderRadius:th('2px', { classic: '10px', dark: '10px' }),
        boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }),
        overflow:'hidden',
        marginLeft:'12px',
      }}>
        {/* Main row */}
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:'12px', flexWrap:'wrap' }}>
          {/* Icon */}
          <div style={{
            width:'34px', height:'34px', borderRadius:th('2px', { classic: '8px', dark: '8px' }), flexShrink:0,
            background:`${entry.dotColor||C.purple}12`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px',
          }}>{entry.icon}</div>

          {/* Main info */}
          <div style={{ flex:1, minWidth:'200px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'3px' }}>
              <span style={{ fontSize:'13px', fontWeight:700, color:C.ink }}>{entry.activityType}</span>
              <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:th('2px', { classic: '20px', dark: '20px' }),
                background:`${entry.dotColor||C.purple}15`, color:entry.dotColor||C.purple }}>
                {entry.category}
              </span>
            </div>
            <div style={{ fontSize:'12px', color:C.mid, marginBottom:'4px' }}>{entry.action}</div>
            {entry.clientName && (
              <div style={{ fontSize:'11px', color:C.muted }}>
                <span style={{ fontWeight:600, color:C.ink }}>{entry.clientName}</span>
                {entry.changedBy && <span style={{ color:C.muted }}> · Changed by: <strong>{entry.changedBy}</strong></span>}
              </div>
            )}
            {entry.date && (
              <div style={{ fontSize:'11px', color:C.muted, marginTop:'3px' }}>{fmtFullDate(entry.date)}</div>
            )}
          </div>

          {/* Right: impact + status */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px', flexShrink:0 }}>
            {entry.impactLabel && (
              <div style={{
                fontSize:'13px', fontWeight:800,
                color: entry.impactDelta > 0 ? C.red : entry.impactDelta < 0 ? C.green : C.purple,
                background: entry.impactDelta > 0 ? C.redL : entry.impactDelta < 0 ? C.greenL : C.purpleL,
                padding:'4px 12px', borderRadius:th('2px', { classic: '8px', dark: '8px' }),
              }}>
                {entry.impactLabel}
              </div>
            )}
            <StatusBadge status={entry.status} />
            {hasDetail && (
              <button onClick={()=>setExpanded(e=>!e)} style={{
                background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '6px', dark: '6px' }),
                padding:'3px 10px', fontSize:'10px', fontWeight:600, cursor:'pointer', color:C.muted,
              }}>{expanded?'▲ Less':'▼ More'}</button>
            )}
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && hasDetail && (
          <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, background:C.bg, display:'flex', flexDirection:'column', gap:'8px' }}>
            {entry.description && (
              <div style={{ fontSize:'12px', color:C.mid, lineHeight:1.6 }}>{entry.description}</div>
            )}
            {(entry.attachments||[]).length > 0 && (
              <div>
                <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'6px' }}>Supporting Documents</div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {entry.attachments.map((doc, di) => (
                    <div key={di} style={{
                      display:'flex', alignItems:'center', gap:'5px',
                      background:th('white', { dark: '#1E293B' }), border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 10px',
                    }}>
                      <span style={{ fontSize:'13px' }}>{doc.icon}</span>
                      <span style={{ fontSize:'11px', color:C.mid, fontWeight:600 }}>{doc.name}</span>
                      <span style={{ fontSize:'10px', color:C.muted }}>· {doc.docType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabCostHistoryActivity({ clients, customCosts }) {
  const { fmt } = useCurrency();

  /* ── Load evidence for attachment cross-reference ── */
  const [evidence] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('vcso-cost-evidence') || '[]'); }
    catch { return []; }
  });

  /* ── Build activity list ── */
  const allActivities = useMemo(() => {
    const list = [];

    /* Helper to find evidence docs for a cost name */
    function evidenceDocs(costName) {
      const rec = evidence.find(e => e.costName && costName &&
        e.costName.toLowerCase().includes(costName.toLowerCase().slice(0,8)));
      if (!rec) return [];
      return (rec.documents||[]).slice(0,3).map(d => ({
        name: d.name, docType: d.docType||'Document',
        icon: { pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',png:'🖼️',jpg:'🖼️',jpeg:'🖼️',zip:'🗜️' }[(d.name||'').split('.').pop().toLowerCase()]||'📎',
      }));
    }

    /* ── Per-client activities ── */
    clients.forEach(c => {
      const clientName = c.companyName || c.name || 'Unknown Client';

      /* Frameworks */
      (c.frameworks||[]).forEach(f => {
        const delta = f.monthlyCost || 0;
        list.push({
          id: `fw-${c.id}-${f.name}`, date: null, sortKey: 2,
          icon: '📋', activityType: 'Framework Added', category: 'Framework',
          clientName, action: `${f.name} compliance framework activated`,
          description: `Framework "${f.name}" was added to ${clientName}'s compliance programme.`,
          impactDelta: delta, impactLabel: delta > 0 ? `+${fmt(delta)} /user/mo` : null,
          changedBy: 'Admin', status: 'completed', dotColor: C.purple,
          attachments: evidenceDocs(f.name),
        });
      });

      /* Security Tools */
      (c.securityTools||[]).forEach(t => {
        const delta = t.totalCost || 0;
        list.push({
          id: `tl-${c.id}-${t.name}`, date: null, sortKey: 3,
          icon: '🛡️', activityType: 'Security Tool Added', category: 'Security Tool',
          clientName, action: `${t.name} security tool activated`,
          description: `Security tool "${t.name}" was added to ${clientName}'s security stack.`,
          impactDelta: delta, impactLabel: delta > 0 ? `+${fmt(delta)} /user/mo` : null,
          changedBy: 'Admin', status: 'completed', dotColor: C.blue,
          attachments: evidenceDocs(t.name),
        });
      });

      /* Integrations */
      (c.integrations||[]).forEach(ig => {
        const delta = ig.cost || 0;
        list.push({
          id: `ig-${c.id}-${ig.name}`, date: null, sortKey: 3,
          icon: '🔗', activityType: 'Integration Added', category: 'Integration',
          clientName, action: `${ig.name} integration connected`,
          description: `Integration "${ig.name}" was connected to ${clientName}'s environment.`,
          impactDelta: delta, impactLabel: delta > 0 ? `+${fmt(delta)} /user/mo` : null,
          changedBy: 'Admin', status: 'completed', dotColor: C.blue,
          attachments: evidenceDocs(ig.name),
        });
      });

      /* Audits */
      (c.audits||[]).forEach(a => {
        const delta = a.cost || 0;
        list.push({
          id: `au-${c.id}-${a.name}`, date: null, sortKey: 3,
          icon: '🔍', activityType: 'Audit Added', category: 'Audit',
          clientName, action: `${a.name} audit scheduled`,
          description: `Audit "${a.name}" was added for ${clientName}.${a.status ? ` Status: ${a.status}.` : ''}`,
          impactDelta: delta, impactLabel: delta > 0 ? `+${fmt(delta)}` : null,
          changedBy: 'Admin', status: a.status || 'active', dotColor: C.orange,
          attachments: evidenceDocs(a.name),
        });
      });

      /* Users */
      const totalUsers = c.users?.total || 0;
      if (totalUsers > 0) {
        const delta = totalUsers * 100;
        list.push({
          id: `us-${c.id}`, date: null, sortKey: 4,
          icon: '👥', activityType: 'User Added', category: 'Users',
          clientName, action: `${totalUsers} user${totalUsers>1?'s':''} provisioned`,
          description: `${clientName} has ${totalUsers} active users (${c.users?.internal||0} internal, ${c.users?.external||0} external, ${c.users?.vciso||0} vCISO, ${c.users?.directors||0} directors).`,
          impactDelta: delta, impactLabel: `+${fmt(delta)} /mo`,
          changedBy: 'Admin', status: 'completed', dotColor: C.green,
          attachments: [],
        });
      }

      /* Invoices */
      (c.invoices||[]).forEach(inv => {
        const isPaid    = inv.status === 'paid';
        const isOverdue = inv.status === 'overdue';
        const invId     = `INV-${c.id}-${inv.year}-${String(inv.month||1).padStart(2,'0')}`;
        list.push({
          id: `inv-${invId}`, date: `${inv.year}-${String(inv.month||1).padStart(2,'0')}-01`, sortKey: 1,
          icon: isPaid ? '✅' : isOverdue ? '🚨' : '📄',
          activityType: isPaid ? 'Invoice Paid' : isOverdue ? 'Invoice Overdue' : 'Invoice Generated',
          category: 'Invoice',
          clientName, action: `${invId} · ${fmtMonthYear(inv.month, inv.year)}`,
          description: `Invoice of ${fmt(inv.amount||0)} for ${fmtMonthYear(inv.month, inv.year)} billing period.${inv.dueDate?' Due: '+new Date(inv.dueDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):''}`,
          impactDelta: isPaid ? -1 : 1,
          impactLabel: isPaid ? fmt(inv.amount||0) : isOverdue ? `Overdue ${fmt(inv.amount||0)}` : fmt(inv.amount||0),
          changedBy: 'System', status: inv.status || 'pending',
          dotColor: isPaid ? C.green : isOverdue ? C.red : C.yellow,
          attachments: [],
        });
      });
    });

    /* ── Custom Costs ── */
    (customCosts||[]).forEach(cc => {
      list.push({
        id: `cc-${cc.id}`, date: cc.createdAt || null, sortKey: 2,
        icon: '💼', activityType: 'Custom Cost Added', category: 'Custom Cost',
        clientName: 'All Clients',
        action: `${cc.name} · ${cc.category} · ${cc.frequency}`,
        description: cc.description || '',
        impactDelta: cc.status === 'active' ? (cc.amount||0) : 0,
        impactLabel: cc.status === 'active' ? `+${fmt(cc.amount||0)} ${cc.frequency}` : `${fmt(cc.amount||0)} (inactive)`,
        changedBy: 'Owner', status: cc.status === 'active' ? 'active' : 'completed',
        dotColor: C.teal,
        attachments: evidenceDocs(cc.name),
      });
    });

    /* ── Billing Details history ── */
    const bd = readBillingDetails();
    (bd._history||[]).forEach((h, i) => {
      list.push({
        id: `bd-${i}`, date: h.date, sortKey: 0,
        icon: '🏢', activityType: 'Billing Details Updated', category: 'Billing',
        clientName: bd.companyName || 'Owner',
        action: `${h.changes.length} field${h.changes.length>1?'s':''} updated`,
        description: h.changes.map(ch => `${ch.field}: "${ch.from}" → "${ch.to}"`).join(' | '),
        impactDelta: 0, impactLabel: null,
        changedBy: 'Owner', status: 'completed', dotColor: C.purple,
        attachments: [],
      });
    });

    /* ── Evidence records with approval history ── */
    evidence.forEach(ev => {
      (ev.changeHistory||[]).forEach((h, i) => {
        list.push({
          id: `ev-${ev.id}-${i}`, date: h.date, sortKey: 0,
          icon: ev.approvalStatus === 'approved' ? '✅' : ev.approvalStatus === 'rejected' ? '❌' : '📎',
          activityType: h.action || 'Cost Evidence Updated', category: 'Cost Evidence',
          clientName: 'Owner',
          action: `${ev.costName} — ${h.action}`,
          description: [h.reason, (h.changes||[]).join(' | ')].filter(Boolean).join(' · '),
          impactDelta: 0, impactLabel: ev.amount > 0 ? fmt(ev.amount) : null,
          changedBy: h.by || 'Owner', status: ev.approvalStatus || 'pending',
          dotColor: ev.approvalStatus === 'approved' ? C.green : ev.approvalStatus === 'rejected' ? C.red : C.purple,
          attachments: (ev.documents||[]).slice(0,3).map(d => ({
            name: d.name, docType: d.docType||'Document',
            icon: { pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',png:'🖼️',jpg:'🖼️',jpeg:'🖼️',zip:'🗜️' }[(d.name||'').split('.').pop().toLowerCase()]||'📎',
          })),
        });
      });
    });

    /* Sort: dated entries by date desc, undated entries by category priority */
    return list.sort((a, b) => {
      if (a.date && b.date) return new Date(b.date) - new Date(a.date);
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return a.sortKey - b.sortKey;
    });
  }, [clients, customCosts, evidence, fmt]);

  /* ── Filters ── */
  const [search,      setSearch]      = React.useState('');
  const [typeFilter,  setTypeFilter]  = React.useState('All Types');
  const [clientFilter,setClientFilter]= React.useState('All Clients');
  const [impactFilter,setImpactFilter]= React.useState('all');
  const [showFilters, setShowFilters] = React.useState(false);
  const [page,        setPage]        = React.useState(1);
  const PER = 20;

  const clientNames = useMemo(() => {
    const names = [...new Set(allActivities.map(a => a.clientName).filter(Boolean))];
    return ['All Clients', ...names.sort()];
  }, [allActivities]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allActivities.filter(a => {
      if (typeFilter   !== 'All Types'   && a.activityType !== typeFilter)   return false;
      if (clientFilter !== 'All Clients' && a.clientName   !== clientFilter) return false;
      if (impactFilter === 'increase'    && !(a.impactDelta > 0))            return false;
      if (impactFilter === 'decrease'    && !(a.impactDelta < 0))            return false;
      if (impactFilter === 'neutral'     && a.impactDelta !== 0)             return false;
      if (q && !`${a.action} ${a.clientName} ${a.activityType} ${a.description} ${a.changedBy}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allActivities, search, typeFilter, clientFilter, impactFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const safePage   = Math.min(page, totalPages);
  const slice      = filtered.slice((safePage-1)*PER, safePage*PER);

  /* ── Summary KPIs ── */
  const kpi = useMemo(() => ({
    total:      allActivities.length,
    increases:  allActivities.filter(a => a.impactDelta > 0).length,
    decreases:  allActivities.filter(a => a.impactDelta < 0).length,
    invoices:   allActivities.filter(a => a.category === 'Invoice').length,
    withDocs:   allActivities.filter(a => (a.attachments||[]).length > 0).length,
  }), [allActivities]);

  /* ── CSV export ── */
  function exportCSV() {
    const rows = [
      ['Date','Client','Activity Type','Category','Action','Cost Impact','Changed By','Status'],
      ...filtered.map(a => [
        a.date ? new Date(a.date).toLocaleDateString('en-GB') : '',
        a.clientName || '',
        a.activityType || '',
        a.category || '',
        `"${(a.action||'').replace(/"/g,'""')}"`,
        a.impactLabel || '',
        a.changedBy || '',
        a.status || '',
      ]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'cost-history.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <div style={{ fontSize:'15px', fontWeight:700, color:C.ink }}>Cost History & Activity</div>
          <div style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>Complete billing audit trail — every change that impacted cost, subscriptions, invoices, or pricing</div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={()=>setShowFilters(f=>!f)} style={{
            background: showFilters?C.purpleL:'none', border:`1px solid ${showFilters?C.purple:C.border}`,
            borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer',
            color: showFilters?C.purple:C.mid,
          }}>⚙ Filters {(typeFilter!=='All Types'||clientFilter!=='All Clients'||impactFilter!=='all') && '●'}</button>
          <button onClick={exportCSV} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer', color:C.mid }}>
            ↓ Export CSV
          </button>
          <button onClick={()=>alert('PDF export coming soon')} style={{ background:C.purple, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>
            ↓ PDF
          </button>
        </div>
      </div>

      {/* ── KPI bar ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px' }}>
        {[
          { label:'Total Activities', value:kpi.total,     color:C.purple },
          { label:'Cost Increases',   value:kpi.increases, color:C.red    },
          { label:'Cost Reductions',  value:kpi.decreases, color:C.green  },
          { label:'Invoices',         value:kpi.invoices,  color:C.yellow },
          { label:'With Attachments', value:kpi.withDocs,  color:C.blue   },
        ].map((k,i)=>(
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '10px', dark: '10px' }), padding:'12px 14px', boxShadow:th('none', { classic: '0 1px 3px rgba(0,0,0,0.04)', dark: '0 1px 3px rgba(0,0,0,0.04)' }) }}>
            <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted, marginBottom:'3px' }}>{k.label}</div>
            <div style={{ fontSize:'20px', fontWeight:800, color:k.value>0?k.color:C.ink }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Color legend ── */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', padding:'10px 14px', background:C.bg, borderRadius:th('2px', { classic: '8px', dark: '8px' }), border:`1px solid ${C.border}` }}>
        <span style={{ fontSize:'10px', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', alignSelf:'center' }}>Legend:</span>
        {[
          { color:C.red,    label:'Cost Increase'   },
          { color:C.green,  label:'Cost Reduction / Payment' },
          { color:C.blue,   label:'Configuration Change' },
          { color:C.purple, label:'Billing / Subscription' },
          { color:C.yellow, label:'Pending / Outstanding' },
          { color:C.orange, label:'Audit / Security' },
          { color:C.teal,   label:'Custom Cost' },
        ].map((l,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:th('2px', { classic: '3px', dark: '3px' }), background:l.color, flexShrink:0 }} />
            <span style={{ fontSize:'11px', color:C.mid }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Search + filter panel ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:'220px' }}>
            <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', color:C.muted }}>🔍</span>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="Search by client, activity, framework, tool, invoice…"
              style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'8px 12px 8px 34px', fontSize:'12px', outline:'none' }} />
          </div>
          {search && (
            <button onClick={()=>{setSearch('');setPage(1);}} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'8px 12px', fontSize:'12px', cursor:'pointer', color:C.muted }}>✕ Clear</button>
          )}
        </div>

        {showFilters && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'10px', padding:'14px 16px', background:C.bg, borderRadius:th('2px', { classic: '10px', dark: '10px' }), border:`1px solid ${C.border}` }}>
            <div>
              <label style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:'5px' }}>Activity Type</label>
              <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}}
                style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 10px', fontSize:'12px', outline:'none', background:th('white', { dark: '#1E293B' }), color:C.mid }}>
                {ACT_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:'5px' }}>Client</label>
              <select value={clientFilter} onChange={e=>{setClientFilter(e.target.value);setPage(1);}}
                style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 10px', fontSize:'12px', outline:'none', background:th('white', { dark: '#1E293B' }), color:C.mid }}>
                {clientNames.map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:'5px' }}>Cost Impact</label>
              <select value={impactFilter} onChange={e=>{setImpactFilter(e.target.value);setPage(1);}}
                style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 10px', fontSize:'12px', outline:'none', background:th('white', { dark: '#1E293B' }), color:C.mid }}>
                <option value="all">All</option>
                <option value="increase">Cost Increases</option>
                <option value="decrease">Cost Decreases</option>
                <option value="neutral">No Cost Impact</option>
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end' }}>
              <button onClick={()=>{setTypeFilter('All Types');setClientFilter('All Clients');setImpactFilter('all');setPage(1);}}
                style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '7px', dark: '7px' }), padding:'7px 14px', fontSize:'12px', cursor:'pointer', color:C.muted, width:'100%' }}>
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Results count ── */}
      <div style={{ fontSize:'12px', color:C.muted, fontWeight:500 }}>
        {filtered.length === allActivities.length
          ? `${allActivities.length} activities`
          : `${filtered.length} of ${allActivities.length} activities`}
        {filtered.length === 0 && search && ' — no results found'}
      </div>

      {/* ── Timeline ── */}
      {slice.length === 0 ? (
        <div style={{ padding:'40px', textAlign:'center' }}>
          <div style={{ fontSize:'32px', marginBottom:'10px' }}>📭</div>
          <div style={{ fontSize:'14px', fontWeight:600, color:C.muted }}>No activities match your filters.</div>
        </div>
      ) : (
        <div style={{ position:'relative' }}>
          {/* Spine */}
          <div style={{ position:'absolute', left:'19px', top:0, bottom:0, width:'2px', background:C.border, zIndex:0 }} />
          <div style={{ position:'relative', zIndex:1 }}>
            {slice.map((entry, i) => (
              <ActivityCard key={entry.id || i} entry={entry} isLast={i === slice.length - 1} />
            ))}
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'8px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'12px', color:C.muted }}>
            Showing {(safePage-1)*PER+1}–{Math.min(safePage*PER, filtered.length)} of {filtered.length}
          </div>
          <div style={{ display:'flex', gap:'4px' }}>
            <button disabled={safePage===1} onClick={()=>setPage(p=>p-1)}
              style={{ border:`1px solid ${C.border}`, background:'none', borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'5px 12px', fontSize:'12px', cursor:safePage===1?'default':'pointer', color:safePage===1?C.muted:C.mid }}>← Prev</button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
              const p = totalPages<=7 ? i+1 : safePage<=4 ? i+1 : safePage>=totalPages-3 ? totalPages-6+i : safePage-3+i;
              return (
                <button key={p} onClick={()=>setPage(p)}
                  style={{ border:`1px solid ${p===safePage?C.purple:C.border}`, background:p===safePage?C.purple:'none', color:p===safePage?'white':C.mid, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'5px 10px', fontSize:'12px', cursor:'pointer', minWidth:'32px' }}>{p}</button>
              );
            })}
            <button disabled={safePage===totalPages} onClick={()=>setPage(p=>p+1)}
              style={{ border:`1px solid ${C.border}`, background:'none', borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'5px 12px', fontSize:'12px', cursor:safePage===totalPages?'default':'pointer', color:safePage===totalPages?C.muted:C.mid }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 6 — COST EVIDENCE & APPROVALS
═══════════════════════════════════════════════════════════ */

const LS_EVIDENCE = 'vcso-cost-evidence';
const DOC_TYPES = ['Quote / Vendor Quote','Vendor Invoice','Purchase Order','Contract','Statement of Work','Approval Email','Receipt','Screenshot','Other'];
const APPROVAL_STATUSES = ['pending','approved','rejected','archived'];
const APPROVAL_COLORS = { pending: C.yellow, approved: C.green, rejected: C.red, archived: C.muted };
const APPROVAL_BG = { pending: C.yellowL, approved: C.greenL, rejected: C.redL, archived: th('#f1f5f9', { dark: '#172033' }) };
const FILE_ICONS = { pdf:'📄', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', zip:'🗜️', default:'📎' };

function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function fmtBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}

function fmtFull(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function ApprovalBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
  const s = status || 'pending';
  return (
    <span style={{
      fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:th('2px', { classic: '20px', dark: '20px' }),
      background: APPROVAL_BG[s] || C.yellowL,
      color: APPROVAL_COLORS[s] || C.yellow,
    }}>{label}</span>
  );
}

const EVID_EMPTY = {
  id:'', costName:'', amount:0, category:'Software', description:'', reason:'',
  createdBy:'', documents:[], approvalStatus:'pending',
  approvedBy:'', approvedDate:'', dateAdded:'', changeHistory:[],
};

function TabCostEvidence({ customCosts }) {
  const { fmt } = useCurrency();

  /* ── State ── */
  const [records,    setRecords]    = useState([]);
  const [modal,      setModal]      = useState(null);   // null | record obj
  const [detailId,   setDetailId]   = useState(null);   // view detail panel
  const [approveId,  setApproveId]  = useState(null);   // approval modal
  const [approveForm, setApproveForm] = useState({ status:'approved', approvedBy:'', note:'' });
  const [libSearch,  setLibSearch]  = useState('');
  const [libFilter,  setLibFilter]  = useState('all');
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = React.useRef(null);

  /* ── Load from localStorage ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_EVIDENCE);
      if (raw) setRecords(JSON.parse(raw));
    } catch {}
  }, []);

  function save(next) {
    setRecords(next);
    localStorage.setItem(LS_EVIDENCE, JSON.stringify(next));
  }

  /* ── Open modal to add new evidence record ── */
  function openAdd() {
    setModal({ ...EVID_EMPTY, dateAdded: new Date().toISOString() });
  }

  /* ── Open modal to edit existing record ── */
  function openEdit(rec) {
    setModal({ ...rec });
  }

  /* ── Handle file input ── */
  function handleFiles(files) {
    if (!modal || !files) return;
    const newDocs = Array.from(files).map(f => ({
      id:        genId(),
      name:      f.name,
      size:      f.size,
      type:      f.type,
      docType:   'Other',
      uploadedAt: new Date().toISOString(),
    }));
    setModal(p => ({ ...p, documents: [...(p.documents || []), ...newDocs] }));
  }

  function removeDoc(docId) {
    setModal(p => ({ ...p, documents: (p.documents || []).filter(d => d.id !== docId) }));
  }

  function setDocType(docId, type) {
    setModal(p => ({ ...p, documents: (p.documents || []).map(d => d.id === docId ? { ...d, docType: type } : d) }));
  }

  /* ── Save evidence record ── */
  function handleSaveModal() {
    if (!modal.costName.trim()) return;
    const now = new Date().toISOString();
    let next;
    if (modal.id) {
      /* editing — add change history entry */
      const old = records.find(r => r.id === modal.id);
      const historyEntry = {
        date: now, by: modal.createdBy || 'Owner',
        action: 'Record updated',
        changes: [
          old.amount !== modal.amount && `Amount: ${fmt(old.amount)} → ${fmt(modal.amount)}`,
          old.approvalStatus !== modal.approvalStatus && `Status: ${old.approvalStatus} → ${modal.approvalStatus}`,
          modal.documents.length > (old.documents || []).length && `${modal.documents.length - (old.documents||[]).length} document(s) added`,
        ].filter(Boolean),
        reason: modal.reason,
      };
      next = records.map(r => r.id === modal.id
        ? { ...modal, changeHistory: [...(r.changeHistory || []), historyEntry] }
        : r
      );
    } else {
      const newRec = {
        ...modal,
        id: genId(),
        dateAdded: now,
        changeHistory: [{
          date: now, by: modal.createdBy || 'Owner',
          action: 'Evidence record created',
          changes: [`Cost: ${modal.costName}`, `Amount: ${fmt(modal.amount)}`],
          reason: modal.reason,
        }],
      };
      next = [newRec, ...records];
    }
    save(next);
    setModal(null);
  }

  /* ── Approval action ── */
  function handleApprove() {
    if (!approveId || !approveForm.approvedBy.trim()) return;
    const now = new Date().toISOString();
    const next = records.map(r => {
      if (r.id !== approveId) return r;
      const histEntry = {
        date: now, by: approveForm.approvedBy,
        action: `Status changed to ${approveForm.status}`,
        changes: [`${r.approvalStatus} → ${approveForm.status}`],
        reason: approveForm.note,
      };
      return {
        ...r,
        approvalStatus: approveForm.status,
        approvedBy:    approveForm.approvedBy,
        approvedDate:  now,
        changeHistory: [...(r.changeHistory || []), histEntry],
      };
    });
    save(next);
    setApproveId(null);
    setApproveForm({ status:'approved', approvedBy:'', note:'' });
  }

  /* ── Delete record ── */
  function deleteRecord(id) {
    if (window.confirm('Delete this evidence record? This cannot be undone.')) {
      save(records.filter(r => r.id !== id));
      if (detailId === id) setDetailId(null);
    }
  }

  /* ── KPI summary ── */
  const kpi = useMemo(() => ({
    total:    records.length,
    pending:  records.filter(r => r.approvalStatus === 'pending').length,
    approved: records.filter(r => r.approvalStatus === 'approved').length,
    rejected: records.filter(r => r.approvalStatus === 'rejected').length,
    docs:     records.reduce((s, r) => s + (r.documents || []).length, 0),
    undocumented: records.filter(r => !(r.documents || []).length).length,
  }), [records]);

  /* ── All documents flat list (for library) ── */
  const allDocs = useMemo(() => {
    const list = [];
    records.forEach(r => (r.documents || []).forEach(d => list.push({ ...d, record: r })));
    return list;
  }, [records]);

  /* ── Library filter ── */
  const filteredDocs = useMemo(() => {
    let list = allDocs;
    if (libSearch.trim()) {
      const q = libSearch.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.record.costName.toLowerCase().includes(q) ||
        (d.docType || '').toLowerCase().includes(q)
      );
    }
    if (libFilter !== 'all') {
      list = list.filter(d => d.record.approvalStatus === libFilter);
    }
    return list;
  }, [allDocs, libSearch, libFilter]);

  /* ── Detail panel record ── */
  const detailRec = detailId ? records.find(r => r.id === detailId) : null;

  /* ── "Link costs from Cost Management" helper ── */
  const costOptions = useMemo(() => [
    { name: 'Manual Entry', amount: 0, category: 'Other' },
    ...(customCosts || []).map(cc => ({ name: cc.name, amount: cc.amount, category: cc.category })),
  ], [customCosts]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:'15px', fontWeight:700, color:C.ink }}>Cost Evidence & Approvals</div>
          <div style={{ fontSize:'12px', color:C.muted, marginTop:'2px' }}>Complete audit trail — every cost must have supporting documentation and approval</div>
        </div>
        <button onClick={openAdd} style={{
          background:C.purple, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }),
          padding:'9px 18px', fontSize:'13px', fontWeight:700, cursor:'pointer',
          display:'flex', alignItems:'center', gap:'6px',
        }}>+ Add Evidence Record</button>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'10px' }}>
        {[
          { label:'Total Records',  value:kpi.total,       icon:'📁', color:C.purple },
          { label:'Pending',        value:kpi.pending,     icon:'⏳', color:C.yellow },
          { label:'Approved',       value:kpi.approved,    icon:'✅', color:C.green  },
          { label:'Rejected',       value:kpi.rejected,    icon:'❌', color:C.red    },
          { label:'Documents',      value:kpi.docs,        icon:'📎', color:C.blue   },
          { label:'Undocumented',   value:kpi.undocumented,icon:'⚠️', color:kpi.undocumented>0?C.red:C.muted },
        ].map((k, i) => (
          <div key={i} style={{
            background:C.card, border:`1px solid ${k.value>0&&k.label==='Undocumented'?k.color+'40':C.border}`,
            borderRadius:th('2px', { classic: '12px', dark: '12px' }), padding:'14px 16px',
            boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.04)', dark: '0 1px 4px rgba(0,0,0,0.04)' }),
          }}>
            <div style={{ fontSize:'18px', marginBottom:'6px' }}>{k.icon}</div>
            <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted, marginBottom:'3px' }}>{k.label}</div>
            <div style={{ fontSize:'20px', fontWeight:800, color:k.value>0&&k.label==='Undocumented'?C.red:C.ink }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Undocumented warning banner ── */}
      {kpi.undocumented > 0 && (
        <div style={{
          background:C.redL, border:`1px solid ${C.red}30`, borderRadius:th('2px', { classic: '10px', dark: '10px' }), padding:'14px 18px',
          display:'flex', alignItems:'center', gap:'12px',
        }}>
          <span style={{ fontSize:'18px' }}>⚠️</span>
          <div>
            <div style={{ fontSize:'13px', fontWeight:700, color:C.red }}>{kpi.undocumented} cost record{kpi.undocumented>1?'s':''} have no supporting documents.</div>
            <div style={{ fontSize:'12px', color:C.red, opacity:0.8, marginTop:'2px' }}>Every cost must have at least one supporting document for audit compliance.</div>
          </div>
        </div>
      )}

      {/* ── Evidence Records table ── */}
      <Card style={{ padding:0 }}>
        <div style={{ padding:'16px 20px 12px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:C.ink }}>Evidence Records</div>
        </div>
        {records.length === 0 ? (
          <div style={{ padding:'40px 24px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>📂</div>
            <div style={{ fontSize:'14px', fontWeight:600, color:C.muted }}>No evidence records yet.</div>
            <div style={{ fontSize:'12px', color:C.muted, marginTop:'4px', marginBottom:'16px' }}>Add an evidence record to create an audit trail for your costs.</div>
            <button onClick={openAdd} style={{ background:C.purple, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 20px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>+ Add First Record</button>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {['Cost Name','Amount','Category','Documents','Approval','Added By','Date Added','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:C.muted, textAlign:'left', whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <tr key={rec.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===1?C.bg:th('white', { dark: '#1E293B' }) }}
                    onMouseEnter={e => e.currentTarget.style.background=C.purpleL}
                    onMouseLeave={e => e.currentTarget.style.background=i%2===1?C.bg:th('white', { dark: '#1E293B' })}
                  >
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:C.ink }}>{rec.costName}</div>
                      {rec.description && <div style={{ fontSize:'11px', color:C.muted, marginTop:'2px', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rec.description}</div>}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:'13px', fontWeight:700, color:C.ink }}>{fmt(rec.amount)}</td>
                    <td style={{ padding:'12px 16px', fontSize:'12px', color:C.mid }}>{rec.category || '—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {(rec.documents || []).length === 0 ? (
                        <span style={{ fontSize:'11px', color:C.red, fontWeight:700, background:C.redL, padding:'2px 8px', borderRadius:th('2px', { classic: '20px', dark: '20px' }) }}>⚠ No docs</span>
                      ) : (
                        <span style={{ fontSize:'11px', fontWeight:700, color:C.blue, background:C.blueL, padding:'2px 10px', borderRadius:th('2px', { classic: '20px', dark: '20px' }) }}>
                          📎 {rec.documents.length} file{rec.documents.length>1?'s':''}
                        </span>
                      )}
                    </td>
                    <td style={{ padding:'12px 16px' }}><ApprovalBadge status={rec.approvalStatus} /></td>
                    <td style={{ padding:'12px 16px', fontSize:'12px', color:C.mid }}>{rec.createdBy || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:'12px', color:C.muted }}>{fmtDate(rec.dateAdded)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:'5px' }}>
                        <button onClick={() => setDetailId(rec.id)} title="View Detail"
                          style={{ background:C.blueL, color:C.blue, border:'none', borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 10px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>View</button>
                        <button onClick={() => openEdit(rec)} title="Edit"
                          style={{ background:C.bg, color:C.mid, border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 10px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>Edit</button>
                        {rec.approvalStatus === 'pending' && (
                          <button onClick={() => { setApproveId(rec.id); setApproveForm({ status:'approved', approvedBy:'', note:'' }); }} title="Approve/Reject"
                            style={{ background:C.greenL, color:C.green, border:'none', borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 10px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>Approve</button>
                        )}
                        <button onClick={() => deleteRecord(rec.id)} title="Delete"
                          style={{ background:'none', color:C.red, border:`1px solid ${C.red}30`, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 8px', fontSize:'11px', cursor:'pointer' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Document Library ── */}
      <Card style={{ padding:0 }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:C.ink }}>Document Library</div>
            <div style={{ fontSize:'12px', color:C.muted, marginTop:'1px' }}>{allDocs.length} document{allDocs.length!==1?'s':''} across all evidence records</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="Search documents…"
              style={{ border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'7px 14px', fontSize:'12px', outline:'none', width:'220px' }} />
            <select value={libFilter} onChange={e=>setLibFilter(e.target.value)}
              style={{ border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'7px 12px', fontSize:'12px', outline:'none', background:th('white', { dark: '#1E293B' }), color:C.mid }}>
              <option value="all">All Statuses</option>
              {APPROVAL_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        {filteredDocs.length === 0 ? (
          <div style={{ padding:'32px', textAlign:'center', color:C.muted, fontSize:'13px' }}>No documents found.</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'12px', padding:'16px 20px' }}>
            {filteredDocs.map((doc, i) => (
              <div key={i} style={{
                border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '10px', dark: '10px' }), padding:'14px 16px',
                background:C.bg, display:'flex', gap:'12px', alignItems:'flex-start',
              }}>
                <div style={{ fontSize:'24px', flexShrink:0, marginTop:'2px' }}>{fileIcon(doc.name)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{doc.name}</div>
                  <div style={{ fontSize:'11px', color:C.muted, marginTop:'2px' }}>{doc.docType} · {fmtBytes(doc.size)}</div>
                  <div style={{ fontSize:'11px', color:C.muted, marginTop:'1px' }}>Cost: {doc.record.costName}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' }}>
                    <ApprovalBadge status={doc.record.approvalStatus} />
                    <span style={{ fontSize:'10px', color:C.muted }}>{fmtDate(doc.uploadedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════
          DETAIL PANEL (slide-in overlay)
      ══════════════════════════════════════════════ */}
      {detailRec && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }} onClick={() => setDetailId(null)}>
          <div style={{ flex:1, background:'rgba(0,0,0,0.35)' }} />
          <div style={{ width:'520px', background:th('white', { dark: '#1E293B' }), height:'100%', overflowY:'auto', boxShadow:'-8px 0 32px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column' }}
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding:'22px 24px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:'16px', fontWeight:800, color:C.ink }}>{detailRec.costName}</div>
                <div style={{ fontSize:'12px', color:C.muted, marginTop:'3px' }}>{detailRec.category}</div>
              </div>
              <button onClick={()=>setDetailId(null)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:C.muted, marginTop:'-4px' }}>×</button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'20px', flex:1 }}>

              {/* Meta grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                {[
                  { label:'Amount',        value:fmt(detailRec.amount) },
                  { label:'Status',        value:<ApprovalBadge status={detailRec.approvalStatus} /> },
                  { label:'Created By',    value:detailRec.createdBy || '—' },
                  { label:'Date Added',    value:fmtDate(detailRec.dateAdded) },
                  { label:'Approved By',   value:detailRec.approvedBy || '—' },
                  { label:'Approved Date', value:detailRec.approvedDate ? fmtDate(detailRec.approvedDate) : '—' },
                ].map((row,i) => (
                  <div key={i} style={{ background:C.bg, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'10px 14px' }}>
                    <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'4px' }}>{row.label}</div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* Reason */}
              {detailRec.reason && (
                <div>
                  <div style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'6px' }}>Reason / Notes</div>
                  <div style={{ background:C.bg, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'12px 14px', fontSize:'13px', color:C.mid, lineHeight:1.5 }}>{detailRec.reason}</div>
                </div>
              )}

              {/* Documents */}
              <div>
                <div style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'8px' }}>
                  Supporting Documents ({(detailRec.documents||[]).length})
                </div>
                {(detailRec.documents||[]).length === 0 ? (
                  <div style={{ background:C.redL, border:`1px solid ${C.red}25`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'12px 14px', fontSize:'12px', color:C.red, fontWeight:600 }}>
                    ⚠️ No documents attached. Add supporting evidence to comply with audit requirements.
                  </div>
                ) : (detailRec.documents||[]).map((doc,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:th('2px', { classic: '8px', dark: '8px' }), background:C.bg, border:`1px solid ${C.border}`, marginBottom:'6px' }}>
                    <span style={{ fontSize:'18px' }}>{fileIcon(doc.name)}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                      <div style={{ fontSize:'10px', color:C.muted, marginTop:'2px' }}>{doc.docType} · {fmtBytes(doc.size)} · {fmtDate(doc.uploadedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Change History timeline */}
              <div>
                <div style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'10px' }}>Change History</div>
                {(detailRec.changeHistory||[]).length === 0 ? (
                  <div style={{ fontSize:'12px', color:C.muted }}>No history yet.</div>
                ) : [...(detailRec.changeHistory||[])].reverse().map((h, i) => (
                  <div key={i} style={{ display:'flex', gap:'12px', marginBottom:'14px' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                      <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:C.purple, marginTop:'3px' }} />
                      {i < (detailRec.changeHistory||[]).length-1 && <div style={{ width:'2px', flex:1, background:C.border, marginTop:'4px' }} />}
                    </div>
                    <div style={{ flex:1, paddingBottom:'4px' }}>
                      <div style={{ fontSize:'12px', fontWeight:700, color:C.ink }}>{h.action}</div>
                      <div style={{ fontSize:'11px', color:C.muted, marginTop:'2px' }}>{fmtFull(h.date)} · {h.by}</div>
                      {(h.changes||[]).length > 0 && (
                        <div style={{ marginTop:'5px' }}>
                          {h.changes.map((ch,j) => (
                            <div key={j} style={{ fontSize:'11px', color:C.mid, background:C.bg, borderRadius:th('2px', { classic: '4px', dark: '4px' }), padding:'2px 8px', display:'inline-block', marginRight:'6px', marginBottom:'3px' }}>{ch}</div>
                          ))}
                        </div>
                      )}
                      {h.reason && <div style={{ fontSize:'11px', color:C.muted, marginTop:'4px', fontStyle:'italic' }}>{h.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div style={{ display:'flex', gap:'8px', paddingTop:'4px', borderTop:`1px solid ${C.border}`, flexWrap:'wrap' }}>
                <button onClick={()=>{openEdit(detailRec);setDetailId(null);}} style={{ background:C.purple, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'8px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>Edit Record</button>
                {detailRec.approvalStatus==='pending' && (
                  <button onClick={()=>{ setApproveId(detailRec.id); setApproveForm({ status:'approved', approvedBy:'', note:'' }); setDetailId(null); }}
                    style={{ background:C.green, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'8px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>Approve / Reject</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════ */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'24px 16px', overflowY:'auto' }}>
          <div style={{ background:th('white', { dark: '#1E293B' }), borderRadius:th('2px', { classic: '16px', dark: '16px' }), width:'100%', maxWidth:'600px', boxShadow:'0 8px 40px rgba(0,0,0,0.2)', marginTop:'24px', marginBottom:'24px' }}>
            <div style={{ padding:'22px 24px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'16px', fontWeight:800, color:C.ink }}>{modal.id ? 'Edit' : 'Add'} Evidence Record</div>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:C.muted }}>×</button>
            </div>
            <div style={{ padding:'22px 24px', display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* Quick-fill from existing custom cost */}
              {!modal.id && (
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Link to Existing Cost (optional)</label>
                  <select onChange={e => {
                    const opt = costOptions.find(o=>o.name===e.target.value);
                    if (opt && opt.name !== 'Manual Entry') setModal(p=>({...p, costName:opt.name, amount:opt.amount, category:opt.category}));
                  }} defaultValue=""
                    style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none', background:th('white', { dark: '#1E293B' }), color:C.mid }}>
                    <option value="" disabled>— Select a cost to pre-fill —</option>
                    {costOptions.map((o,i) => <option key={i} value={o.name}>{o.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Cost Name *</label>
                  <input value={modal.costName} onChange={e=>setModal(p=>({...p,costName:e.target.value}))}
                    style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none' }}
                    placeholder="e.g. Cloud Hosting - AWS" />
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Amount ($)</label>
                  <input type="number" min="0" value={modal.amount} onChange={e=>setModal(p=>({...p,amount:parseFloat(e.target.value)||0}))}
                    style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none' }} />
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Category</label>
                  <select value={modal.category} onChange={e=>setModal(p=>({...p,category:e.target.value}))}
                    style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none', background:th('white', { dark: '#1E293B' }) }}>
                    {CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Created By</label>
                  <input value={modal.createdBy} onChange={e=>setModal(p=>({...p,createdBy:e.target.value}))}
                    style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none' }}
                    placeholder="Your name / role" />
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Approval Status</label>
                  <select value={modal.approvalStatus} onChange={e=>setModal(p=>({...p,approvalStatus:e.target.value}))}
                    style={{ width:'100%', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none', background:th('white', { dark: '#1E293B' }) }}>
                    {APPROVAL_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Description</label>
                  <input value={modal.description} onChange={e=>setModal(p=>({...p,description:e.target.value}))}
                    style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none' }}
                    placeholder="Brief description of what this cost covers" />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Reason / Justification</label>
                  <textarea value={modal.reason} onChange={e=>setModal(p=>({...p,reason:e.target.value}))} rows={2}
                    style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none', resize:'vertical' }}
                    placeholder="Why is this cost necessary? What business purpose does it serve?" />
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'8px', textTransform:'uppercase' }}>Supporting Documents</label>
                <div
                  onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
                  onClick={()=>fileRef.current?.click()}
                  style={{
                    border:`2px dashed ${dragOver?C.purple:C.border}`, borderRadius:th('2px', { classic: '10px', dark: '10px' }), padding:'20px',
                    textAlign:'center', cursor:'pointer', transition:'all 0.15s',
                    background: dragOver?C.purpleL:'#fafafe',
                  }}>
                  <div style={{ fontSize:'24px', marginBottom:'6px' }}>📁</div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:dragOver?C.purple:C.mid }}>Drop files here or click to browse</div>
                  <div style={{ fontSize:'11px', color:C.muted, marginTop:'3px' }}>PDF, DOCX, XLSX, PNG, JPG, ZIP · Max 10 files</div>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.eml"
                    style={{ display:'none' }} onChange={e=>handleFiles(e.target.files)} />
                </div>

                {/* Quick upload type buttons */}
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'10px' }}>
                  {['Upload Quote','Upload Invoice','Upload Contract','Upload PO','Upload Approval'].map((btn,i) => (
                    <button key={i} onClick={()=>fileRef.current?.click()} style={{
                      background:C.bg, color:C.mid, border:`1px solid ${C.border}`,
                      borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'5px 12px', fontSize:'11px', fontWeight:600, cursor:'pointer',
                    }}>📎 {btn}</button>
                  ))}
                </div>

                {/* Attached files list */}
                {(modal.documents||[]).length > 0 && (
                  <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
                    {modal.documents.map((doc,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'8px 12px' }}>
                        <span style={{ fontSize:'16px' }}>{fileIcon(doc.name)}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'12px', fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                          <div style={{ fontSize:'10px', color:C.muted }}>{fmtBytes(doc.size)}</div>
                        </div>
                        <select value={doc.docType} onChange={e=>setDocType(doc.id,e.target.value)}
                          style={{ border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '6px', dark: '6px' }), padding:'4px 8px', fontSize:'11px', outline:'none', background:th('white', { dark: '#1E293B' }), color:C.mid }}>
                          {DOC_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                        <button onClick={()=>removeDoc(doc.id)}
                          style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:'14px', flexShrink:0, padding:'2px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={()=>setModal(null)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 20px', fontSize:'13px', fontWeight:600, cursor:'pointer', color:C.mid }}>Cancel</button>
              <button onClick={handleSaveModal} style={{ background:C.purple, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 24px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                {modal.id ? 'Update Record' : 'Save Evidence Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          APPROVAL MODAL
      ══════════════════════════════════════════════ */}
      {approveId && (() => {
        const rec = records.find(r => r.id === approveId);
        if (!rec) return null;
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
            <div style={{ background:th('white', { dark: '#1E293B' }), borderRadius:th('2px', { classic: '16px', dark: '16px' }), padding:'28px', width:'100%', maxWidth:'440px', boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize:'16px', fontWeight:800, color:C.ink, marginBottom:'4px' }}>Approval Decision</div>
              <div style={{ fontSize:'12px', color:C.muted, marginBottom:'20px' }}>Cost: <strong>{rec.costName}</strong> · {fmt(rec.amount)}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'8px', textTransform:'uppercase' }}>Decision</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {['approved','rejected','archived'].map(s => (
                      <button key={s} onClick={()=>setApproveForm(p=>({...p,status:s}))} style={{
                        flex:1, padding:'9px 8px', borderRadius:th('2px', { classic: '8px', dark: '8px' }), border:`2px solid ${approveForm.status===s?APPROVAL_COLORS[s]:C.border}`,
                        background: approveForm.status===s?APPROVAL_BG[s]:C.bg,
                        color: approveForm.status===s?APPROVAL_COLORS[s]:C.muted,
                        fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'all 0.12s',
                      }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Approver Name *</label>
                  <input value={approveForm.approvedBy} onChange={e=>setApproveForm(p=>({...p,approvedBy:e.target.value}))}
                    placeholder="Full name of approver"
                    style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none' }} />
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:C.mid, display:'block', marginBottom:'5px', textTransform:'uppercase' }}>Note (optional)</label>
                  <textarea value={approveForm.note} onChange={e=>setApproveForm(p=>({...p,note:e.target.value}))} rows={2}
                    placeholder="Reason for approval / rejection…"
                    style={{ width:'100%', boxSizing:'border-box', border:`1.5px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 12px', fontSize:'13px', outline:'none', resize:'vertical' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'20px', justifyContent:'flex-end' }}>
                <button onClick={()=>setApproveId(null)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 18px', fontSize:'13px', fontWeight:600, cursor:'pointer', color:C.mid }}>Cancel</button>
                <button onClick={handleApprove} disabled={!approveForm.approvedBy.trim()}
                  style={{ background: approveForm.status==='approved'?C.green:approveForm.status==='rejected'?C.red:C.muted, color:'white', border:'none', borderRadius:th('2px', { classic: '8px', dark: '8px' }), padding:'9px 22px', fontSize:'13px', fontWeight:700, cursor:'pointer', opacity:approveForm.approvedBy.trim()?1:0.5 }}>
                  Confirm {approveForm.status.charAt(0).toUpperCase()+approveForm.status.slice(1)}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function OwnerPortalInvoices() {
  const { allClients, loading } = useAdminData();
  const navigate  = useNavigate();
  const clients   = allClients || [];
  const [tabIndex, setTabIndex] = useState(0);

  /* Custom costs state (localStorage) */
  const [customCosts, setCustomCosts] = useState([]);
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('vcso-custom-costs');
      if (raw) setCustomCosts(JSON.parse(raw));
    } catch {}
  },[]);

  /* All invoices */
  const allInvoices = useMemo(()=>{
    const list = [];
    clients.forEach(c=>{
      (c.invoices||[]).forEach(inv=>{
        list.push({
          id:`INV-${c.id}-${inv.year}-${String(inv.month).padStart(2,'0')}`,
          client:c,
          period:`${MONTHS[(inv.month||1)-1]} ${inv.year}`,
          amount:inv.amount||0,
          status:inv.status||'pending',
          dueDate:inv.dueDate||null,
        });
      });
    });
    return list.sort((a,b)=>b.id.localeCompare(a.id));
  },[clients]);

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth:'1000px', fontFamily:'inherit' }}>
      {/* Page header */}
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'22px', fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Billing Center</div>
        <div style={{ fontSize:'13px', color:C.muted, marginTop:'2px' }}>Premium billing management · auto-synced from Admin Portal</div>
      </div>

      <TabBar active={tabIndex} onChange={i=>{setTabIndex(i);}} />

      {tabIndex===0 && <TabOverview clients={clients} allInvoices={allInvoices} customCosts={customCosts} />}
      {tabIndex===1 && <TabBillingDetails />}
      {tabIndex===2 && <TabCostManagement customCosts={customCosts} setCustomCosts={setCustomCosts} />}
      {tabIndex===3 && <TabBillingHistory allInvoices={allInvoices} navigate={navigate} />}
      {tabIndex===4 && <TabExportShare />}
      {tabIndex===5 && <TabCostHistoryActivity clients={clients} customCosts={customCosts} />}
      {tabIndex===6 && <TabCostEvidence customCosts={customCosts} />}
    </div>
  );
}
