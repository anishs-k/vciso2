import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useSearchParams } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Loader } from './OwnerShared';
import { SearchableSelect, LocationCascade, DROPDOWN_DATA } from '../../components/DropdownSystem';
import { th } from '../../theme';

const C = {
  purple:'#7c3aed', purpleL:th('#f5f3ff', { dark: '#2E1065' }), purpleM:th('#ede9fe', { dark: '#2E1065' }),
  green:'#16a34a',  greenL:th('#f0fdf4', { dark: '#0B2E24' }),
  blue:th('#2563eb', { dark: '#60A5FA' }),   blueL:th('#eff6ff', { dark: '#172554' }),
  orange:'#ea580c', orangeL:th('#fff7ed', { dark: '#3A1F0A' }),
  teal:'#0d9488',   tealL:'#f0fdfa',
  red:'#dc2626',    redL:th('#fef2f2', { dark: '#3A1418' }),
  yellow:'#d97706', yellowL:th('#fffbeb', { dark: '#3A2A0A' }),
  ink:th('#0f172a', { dark: '#F1F5F9' }), mid:th('#334155', { dark: '#CBD5E1' }), muted:th('#64748b', { dark: '#94A3B8' }),
  border:th('#e2e8f0', { dark: '#334155' }), bg:th('#f8fafc', { dark: '#0F172A' }), card:th('#ffffff', { dark: '#1E293B' }),
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TABS = ['Overview','Users','Billing','Invoices','Payments','Communications','Revenue','Reports','Activity'];

/* ── helpers ── */
function logAct(setLog, entry) {
  setLog(prev => [{ id: Date.now() + Math.random(), ts: new Date().toISOString(), ...entry }, ...prev]);
}
function fmtDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtTS(ts) { if(!ts) return ''; const d=new Date(ts); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' · ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
function last12Labels() {
  const now=new Date();
  return Array.from({length:12},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+i,1);return MONTHS[d.getMonth()];});
}
function trendSeries(mrr,n=12){const s=[];let v=mrr;for(let i=n-1;i>=0;i--){const j=0.972+(((mrr*(i+13))%17)/200);s.unshift(parseFloat((v*j).toFixed(2)));v=v/1.032;}s[n-1]=mrr;return s;}
const statusColor=s=>s==='paid'?C.green:s==='overdue'?C.red:s==='draft'?C.muted:s==='sent'?C.blue:s==='cancelled'?C.red:C.yellow;
const statusBg=s=>s==='paid'?C.greenL:s==='overdue'?C.redL:s==='draft'?C.bg:s==='sent'?C.blueL:s==='cancelled'?C.redL:C.yellowL;

/* ═══ Primitives ═══ */
function Card({children,style={},onClick}){
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '14px', dark: '14px' }),padding:'20px 24px',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }),cursor:onClick?'pointer':'default',...style}}>{children}</div>;
}

function Btn({children,onClick,variant='primary',size='md',disabled=false,style={}}){
  const base={borderRadius:th('2px', { classic: '8px', dark: '8px' }),fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.55:1,border:'none',display:'inline-flex',alignItems:'center',gap:'5px',transition:'all 0.12s',...style};
  const sz=size==='sm'?{padding:'5px 12px',fontSize:'12px'}:{padding:'9px 18px',fontSize:'13px'};
  const vr=variant==='primary'?{background:C.purple,color:'white',border:'none'}:variant==='secondary'?{background:C.purpleL,color:C.purple,border:`1px solid ${C.purpleM}`}:variant==='danger'?{background:C.redL,color:C.red,border:`1px solid ${C.red}40`}:{background:'transparent',color:C.muted,border:`1px solid ${C.border}`};
  return <button onClick={disabled?undefined:onClick} style={{...base,...sz,...vr}}>{children}</button>;
}

function LinkBtn({children,onClick,color=C.purple}){
  return <button onClick={onClick} style={{background:'none',border:'none',color,fontSize:'12px',fontWeight:700,cursor:'pointer',padding:0}}>{children}</button>;
}

function SectionTitle({children,action}){
  return <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
    <div style={{fontSize:'14px',fontWeight:700,color:C.ink}}>{children}</div>
    {action}
  </div>;
}

function Chip({label,color=C.purple,bg}){
  return <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:th('2px', { classic: '20px', dark: '20px' }),fontSize:'11px',fontWeight:600,background:bg||(color+'18'),color,border:`1px solid ${color}30`}}>{label}</span>;
}

function CrossTabStrip({items}){
  return <div style={{display:'flex',background:C.bg,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '10px', dark: '10px' }),overflow:'hidden',marginBottom:'4px'}}>
    {items.map((it,i)=>(
      <div key={i} onClick={it.onClick} style={{flex:1,padding:'10px 14px',cursor:it.onClick?'pointer':'default',borderRight:i<items.length-1?`1px solid ${C.border}`:'none',textAlign:'center'}}
        onMouseEnter={e=>{if(it.onClick)e.currentTarget.style.background=it.color+'12';}}
        onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
        <div style={{fontSize:'15px',fontWeight:800,color:it.color}}>{it.value}</div>
        <div style={{fontSize:'10px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginTop:'2px'}}>{it.label}</div>
        {it.onClick&&<div style={{fontSize:'9px',color:it.color,marginTop:'2px',fontWeight:700}}>↗ View</div>}
      </div>
    ))}
  </div>;
}

function KpiCard({label,value,sub,accent,icon,onClick,badge}){
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '12px', dark: '12px' }),padding:'18px 20px',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }),position:'relative',overflow:'hidden',cursor:onClick?'pointer':'default',transition:'box-shadow 0.15s'}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow=`0 4px 14px ${accent}22`;}}
    onMouseLeave={e=>{if(onClick)e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)';}}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:accent,borderRadius:'12px 12px 0 0'}}/>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
      <div style={{width:'32px',height:'32px',borderRadius:th('2px', { classic: '8px', dark: '8px' }),background:accent+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>{icon}</div>
      {badge&&<span style={{fontSize:'10px',fontWeight:700,color:accent,background:accent+'12',padding:'2px 7px',borderRadius:th('2px', { classic: '10px', dark: '10px' })}}>{badge}</span>}
    </div>
    <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:C.muted,marginBottom:'4px'}}>{label}</div>
    <div style={{fontSize:'22px',fontWeight:800,color:C.ink,lineHeight:1.1}}>{value}</div>
    {sub&&<div style={{fontSize:'11px',color:C.muted,marginTop:'4px'}}>{sub}</div>}
  </div>;
}

function Input({value,onChange,placeholder,type='text',style={}}){
  return <input value={value||''} onChange={onChange} placeholder={placeholder} type={type} style={{width:'100%',padding:'9px 12px',fontSize:'13px',border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),background:th('white', { dark: '#1E293B' }),color:C.ink,outline:'none',boxSizing:'border-box',...style}}/>;
}

function Select({value,onChange,children,style={}}){
  return <select value={value||''} onChange={onChange} style={{width:'100%',padding:'9px 12px',fontSize:'13px',border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),background:th('white', { dark: '#1E293B' }),color:C.ink,outline:'none',cursor:'pointer',...style}}>{children}</select>;
}

function TextArea({value,onChange,placeholder,rows=3,style={}}){
  return <textarea value={value||''} onChange={onChange} placeholder={placeholder} rows={rows} style={{width:'100%',padding:'9px 12px',fontSize:'13px',border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),background:th('white', { dark: '#1E293B' }),color:C.ink,outline:'none',resize:'vertical',boxSizing:'border-box',...style}}/>;
}

function FieldRow({label,children,last=false}){
  return <div style={{display:'flex',gap:'12px',paddingBottom:'12px',borderBottom:last?'none':`1px solid ${C.border}`,marginBottom:'12px',alignItems:'flex-start'}}>
    <div style={{fontSize:'11px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',minWidth:'110px',paddingTop:'10px'}}>{label}</div>
    <div style={{flex:1}}>{children}</div>
  </div>;
}

/* ── Modal ── */
function Modal({title,onClose,children,width='540px'}){
  useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';};},[]);
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.48)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:C.card,borderRadius:th('2px', { classic: '16px', dark: '16px' }),width:'100%',maxWidth:width,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.18)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 24px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:'16px',fontWeight:800,color:C.ink}}>{title}</div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:'18px',cursor:'pointer',color:C.muted,lineHeight:1}}>✕</button>
      </div>
      <div style={{overflow:'auto',padding:'24px',flex:1}}>{children}</div>
    </div>
  </div>;
}

/* ── Dropdown menu ── */
function DropMenu({items,onClose}){
  const ref=useRef();
  useEffect(()=>{
    const fn=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
    document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);
  },[onClose]);
  return <div ref={ref} style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:300,background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '12px', dark: '12px' }),boxShadow:'0 8px 24px rgba(0,0,0,0.12)',overflow:'hidden',minWidth:'190px'}}>
    {items.map((it,i)=>it.divider
      ?<div key={i} style={{height:'1px',background:C.border,margin:'4px 0'}}/>
      :<div key={i} onClick={()=>{it.onClick&&it.onClick();onClose();}} style={{padding:'10px 16px',cursor:'pointer',fontSize:'13px',fontWeight:600,color:it.danger?C.red:C.ink,display:'flex',alignItems:'center',gap:'9px'}}
          onMouseEnter={e=>{e.currentTarget.style.background=it.danger?C.redL:C.bg;}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
        {it.icon&&<span>{it.icon}</span>}{it.label}
      </div>
    )}
  </div>;
}

/* ── MiniLineChart ── */
function MiniLineChart({data,color=C.purple,height=100}){
  if(!data||data.length<2)return null;
  const labels=last12Labels();
  const max=Math.max(...data)||1,min=Math.min(...data);
  const W=600,H=height,pad=8;
  const px=i=>pad+(i/(data.length-1))*(W-2*pad);
  const py=v=>H-pad-((v-min)/(max-min||1))*(H-2*pad);
  const pts=data.map((v,i)=>`${px(i)},${py(v)}`).join(' ');
  const area=`M${px(0)},${py(data[0])} `+data.map((v,i)=>`L${px(i)},${py(v)}`).join(' ')+` L${px(data.length-1)},${H} L${px(0)},${H} Z`;
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height,display:'block'}}>
    <defs><linearGradient id={`g${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <path d={area} fill={`url(#g${color.slice(1)})`}/>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    {data.map((_,i)=>i%2===0&&<text key={i} x={px(i)} y={H-1} textAnchor="middle" fontSize="8" fill={C.muted}>{labels[i]}</text>)}
  </svg>;
}

/* ── Smart Save Bar ── */
function SaveBar({onSave,onDiscard}){
  return <div style={{position:'fixed',bottom:0,left:'220px',right:0,zIndex:200,background:th('white', { dark: '#1E293B' }),borderTop:`2px solid ${C.purple}`,boxShadow:'0 -4px 20px rgba(124,58,237,0.12)',padding:'12px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',fontWeight:700,color:C.purple}}>
      <span style={{fontSize:'8px'}}>●</span> Unsaved Changes Detected
    </div>
    <div style={{display:'flex',gap:'8px'}}>
      <Btn variant="ghost" onClick={onDiscard}>Discard Changes</Btn>
      <Btn variant="primary" onClick={onSave}>Save Changes</Btn>
    </div>
  </div>;
}

/* ── Status badge ── */
function StatusPill({status}){
  return <span style={{padding:'3px 10px',borderRadius:th('2px', { classic: '20px', dark: '20px' }),fontSize:'11px',fontWeight:700,background:statusBg(status),color:statusColor(status),border:`1px solid ${statusColor(status)}30`,whiteSpace:'nowrap'}}>{status}</span>;
}

const ONBOARDING_STEPS=[
  {key:'companyDetails',  label:'Company Details'},
  {key:'escalationMatrix',label:'Escalation Matrix'},
  {key:'branding',        label:'Branding & Legal'},
  {key:'contract',        label:'Contract Tenure'},
  {key:'assetInventory',  label:'Asset Inventory'},
  {key:'assetRegistry',   label:'Asset Registry'},
  {key:'securityModules', label:'Security Modules'},
  {key:'contacts',        label:'Contacts'},
  {key:'integrations',    label:'Integrations'},
  {key:'billing',         label:'Billing'},
  {key:'repository',      label:'Repository'},
];
const INV_STATUSES=['draft','sent','viewed','paid','overdue','cancelled'];

/* ══════════════════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════════════════ */
function TabOverview({localClient,setLocalClient,setDirty,client,fmt,invList,navTo}){
  const costs=localClient.costs||{};
  const users=localClient.users||{};
  const mrr=costs.grandTotal||0;

  /* Fetch real onboarding data from server */
  const [onbData,setOnbData]=useState(null);
  const [onbLoading,setOnbLoading]=useState(true);
  const [repoCount,setRepoCount]=useState(0);

  useEffect(()=>{
    if(!client?.id)return;
    setOnbLoading(true);
    Promise.all([
      fetch(`/api/onboarding-all/${client.id}`).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`/api/repository/${client.id}`).then(r=>r.ok?r.json():[]).catch(()=>[]),
    ]).then(([all,repo])=>{
      setOnbData(all);
      setRepoCount(Array.isArray(repo)?repo.length:0);
      setOnbLoading(false);
    });
  },[client.id]);

  /* Compute real step completion — primary source: wizard completed_steps indices,
     fallback: data presence checks for steps not in the wizard (billing, repository) */
  const stepsDone = useMemo(()=>{
    const d = onbData || {};
    const ci = d.companyInfo || {};
    const contacts = d.contacts || [];
    const branding = d.branding || [];
    const contract = d.contract || null;
    const assetInventory = d.assetInventory || [];
    const assets = d.assets || [];
    const employees = d.employees || [];
    const modules = d.modules || [];
    const integrations = d.integrations || [];
    const fws = localClient.frameworks || [];
    const tools = localClient.securityTools || [];
    const ints = localClient.integrations || [];

    // Wizard saves completed_steps as JSON array of step indices [0,1,2,...]
    // STEPS: 0=company 1=escalation 2=branding 3=contract 4=assetInv 5=assetReg
    //        6=platformConfig 7=frameworks 8=audits 9=secTools 10=integrations 11=users 12=review
    const rawSteps = d.progress?.completed_steps;
    let wizDone = new Set();
    try {
      const arr = Array.isArray(rawSteps) ? rawSteps : JSON.parse(rawSteps || '[]');
      arr.forEach(i => wizDone.add(Number(i)));
    } catch {}

    return {
      companyDetails:   wizDone.has(0) || !!(ci.company_name || localClient.companyName || localClient.name),
      escalationMatrix: wizDone.has(1) || contacts.some(c=>c.contact_type==='emergency'||c.contact_type==='escalation'),
      branding:         wizDone.has(2) || branding.length > 0,
      contract:         wizDone.has(3) || !!(contract?.contract_start && contract?.contract_end),
      assetInventory:   wizDone.has(4) || assetInventory.length > 0,
      assetRegistry:    wizDone.has(5) || assets.length > 0 || employees.length > 0,
      securityModules:  wizDone.has(6)||wizDone.has(7)||wizDone.has(8)||wizDone.has(9) || modules.some(m=>m.enabled===1||m.enabled===true) || fws.length > 0 || tools.length > 0,
      contacts:         wizDone.has(11) || contacts.length > 0,
      integrations:     wizDone.has(10) || integrations.some(i=>i.enabled===1||i.enabled===true) || ints.length > 0,
      billing:          (costs.grandTotal||0) > 0,
      repository:       repoCount > 0,
    };
  },[onbData,localClient,costs,repoCount]);

  const stepsOk=Object.values(stepsDone).filter(Boolean).length;
  const progPct=Math.round(stepsOk/ONBOARDING_STEPS.length*100);

  /* ── Account Health Score: weighted 100-point readiness index ── */
  const HEALTH_CRITERIA = useMemo(()=>[
    {key:'companyDetails',   label:'Company Details',           points:10},
    {key:'escalationMatrix', label:'Escalation Matrix',         points:10},
    {key:'contract',         label:'Active Contract',           points:10},
    {key:'assetInventory',   label:'Asset Inventory',           points:15},
    {key:'assetRegistry',    label:'Asset & Employee Registry', points:10},
    {key:'securityModules',  label:'Security Modules',          points:15},
    {key:'integrations',     label:'Integrations Connected',    points:10},
    {key:'frameworks',       label:'Compliance Frameworks',     points:10},
    {key:'users',            label:'User Management',           points:5},
    {key:'riskAssessment',   label:'Risk Assessment',           points:5},
  ],[]);

  /* Map criteria keys to stepsDone + extra checks */
  const healthCriteria = useMemo(()=>{
    const fws = localClient.frameworks||[];
    const tools = localClient.securityTools||[];
    const u = localClient.users||{};
    const risks = localClient.risks||localClient.audits||[];
    return HEALTH_CRITERIA.map(c=>{
      let done = false;
      if (c.key==='companyDetails')   done = stepsDone.companyDetails;
      else if (c.key==='escalationMatrix') done = stepsDone.escalationMatrix;
      else if (c.key==='contract')    done = stepsDone.contract;
      else if (c.key==='assetInventory') done = stepsDone.assetInventory;
      else if (c.key==='assetRegistry')  done = stepsDone.assetRegistry;
      else if (c.key==='securityModules') done = stepsDone.securityModules;
      else if (c.key==='integrations') done = stepsDone.integrations;
      else if (c.key==='frameworks')  done = fws.length > 0;
      else if (c.key==='users')       done = (u.total||0) > 0 || (u.internal||0) > 0;
      else if (c.key==='riskAssessment') done = (Array.isArray(risks) && risks.length > 0) || localClient.riskCount > 0;
      return {...c, done};
    });
  },[HEALTH_CRITERIA, stepsDone, localClient]);

  const health = useMemo(()=>healthCriteria.reduce((s,c)=>s+(c.done?c.points:0),0),[healthCriteria]);
  const healthColor = health>=90?C.green:health>=75?C.blue:health>=50?C.orange:C.red;
  const healthLabel = health>=90?'Excellent':health>=75?'Good':health>=50?'Needs Attention':health>=25?'Poor':'Critical';
  const [healthModal,setHealthModal]=useState(false);
  const [showTooltip,setShowTooltip]=useState(false);
  const paidAmt=invList.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0);
  const outAmt=invList.filter(i=>i.status==='pending'||i.status==='overdue').reduce((s,i)=>s+i.amount,0);
  const plan=(localClient.frameworks||[]).length>2?'Enterprise':(localClient.frameworks||[]).length>0||(localClient.securityTools||[]).length>0?'Professional':'Starter';
  const fileRef=useRef();
  const [docs,setDocs]=useState([]);

  function field(key,val){ setLocalClient(prev=>({...prev,[key]:val})); setDirty(true); }

  return <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

    {/* 4 KPI chips */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
      {[
        {icon:'🛡️',label:'Security Score',value:`${health}/100`,sub:healthLabel,color:healthColor,onClick:()=>setHealthModal(true)},
        {icon:'⚠️',label:'Open Risks',value:(()=>{const r=localClient.risks||localClient.audits||[];return Array.isArray(r)?r.filter(x=>!/low/i.test(x.severity||x.risk_level||'')).length:0;})(),sub:'critical + high',color:C.orange,onClick:()=>{}},
        {icon:'👥',label:'Users',value:(localClient.users?.total||(onbData?.employees||[]).length)||0,sub:'all types',color:C.blue,onClick:()=>navTo('Users')},
        {icon:'📋',label:'Frameworks',value:(localClient.frameworks||[]).length,sub:'active',color:C.teal,onClick:()=>navTo('Billing')},
      ].map(k=>(
        <div key={k.label} onClick={k.onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '12px', dark: '12px' }),padding:'14px 16px',cursor:'pointer',transition:'all 0.15s',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' })}}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 4px 16px ${k.color}22`;e.currentTarget.style.borderColor=k.color+'55';}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)';e.currentTarget.style.borderColor=C.border;}}>
          <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'8px'}}>
            <span style={{fontSize:'18px'}}>{k.icon}</span>
            <div style={{fontSize:'10px',color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>{k.label}</div>
          </div>
          <div style={{fontSize:'22px',fontWeight:900,color:k.color,lineHeight:1}}>{k.value}</div>
          <div style={{fontSize:'11px',color:k.color,fontWeight:600,marginTop:'3px'}}>{k.sub}</div>
        </div>
      ))}
    </div>

    {/* Main 2-col */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'16px',alignItems:'start'}}>

      {/* LEFT: profile + security grid */}
      <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

        {/* Client profile */}
        <Card>
          <SectionTitle>Client Profile</SectionTitle>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 14px'}}>
            <FieldRow label="Company"><Input value={localClient.companyName||localClient.name||''} onChange={e=>field('companyName',e.target.value)}/></FieldRow>
            <FieldRow label="Industry">
              <SearchableSelect value={localClient.industry||''} onChange={v=>field('industry',v)} options={DROPDOWN_DATA.industries} placeholder="Select Industry"/>
            </FieldRow>
            <FieldRow label="Status">
              <SearchableSelect value={localClient.status||''} onChange={v=>field('status',v)} options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} placeholder="Select Status"/>
            </FieldRow>
            <FieldRow label="Website"><Input value={localClient.website||''} onChange={e=>field('website',e.target.value)} placeholder="e.g. company.com or https://company.com"/></FieldRow>
          </div>
          <div style={{marginTop:'4px',paddingTop:'12px',borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:'11px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'10px'}}>Location</div>
            <LocationCascade
              country={localClient.country||''}
              state={localClient.state||''}
              city={localClient.city||''}
              onCountryChange={v=>field('country',v)}
              onStateChange={v=>field('state',v)}
              onCityChange={v=>field('city',v)}
              compact={true}
            />
            <div style={{marginTop:'10px'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'5px'}}>Postal Code</div>
              <Input value={localClient.postalCode||''} onChange={e=>field('postalCode',e.target.value)} placeholder="ZIP / PIN / Postal Code" style={{maxWidth:'240px'}}/>
            </div>
          </div>
        </Card>

        {/* Security modules + Compliance */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
          <Card style={{padding:'16px 18px'}}>
            <div style={{fontSize:'13px',fontWeight:800,color:C.ink,marginBottom:'10px'}}>🔒 Security Modules</div>
            {(()=>{
              const mods=onbData?.modules||[];
              const tools=localClient.securityTools||[];
              const ALL=[['Asset Mgmt','asset'],['Risk Mgmt','risk'],['Compliance','compli'],['Vulnerability','vuln'],['Vendor Risk','vendor'],['Incident Response','incident'],['Threat Intel','threat']];
              const enabledSet=new Set([...mods.filter(m=>m.enabled===1||m.enabled===true).map(m=>(m.module_name||'').toLowerCase()),...tools.map(t=>(t?.name||t||'').toLowerCase())]);
              return ALL.map(([name,key])=>{
                const on=[...enabledSet].some(e=>e.includes(key));
                return <div key={name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:'11px',color:on?C.ink:C.muted,fontWeight:on?600:400}}>{name}</span>
                  <span style={{fontSize:'10px',fontWeight:700,padding:'1px 6px',borderRadius:th('2px', { classic: '20px', dark: '20px' }),background:on?C.greenL:C.bg,color:on?C.green:C.muted}}>{on?'ON':'—'}</span>
                </div>;
              });
            })()}
          </Card>
          <Card style={{padding:'16px 18px'}}>
            <div style={{fontSize:'13px',fontWeight:800,color:C.ink,marginBottom:'10px'}}>📋 Compliance</div>
            {(()=>{
              const fws=localClient.frameworks||[];
              if(fws.length===0) return <div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:'12px',color:C.muted,marginBottom:'8px'}}>No frameworks active</div><Btn size="sm" variant="secondary" onClick={()=>navTo('Billing')}>Configure →</Btn></div>;
              return fws.map((fw,i)=>{
                const name=fw?.name||fw||'Framework';
                return <div key={i} style={{marginBottom:'9px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{fontSize:'11px',fontWeight:700,color:C.ink}}>{name}</span><span style={{fontSize:'10px',fontWeight:700,color:C.green}}>Active</span></div>
                  <div style={{height:'5px',background:C.bg,borderRadius:'99px'}}><div style={{height:'100%',width:'100%',background:C.green,borderRadius:'99px'}}/></div>
                </div>;
              });
            })()}
          </Card>
        </div>

        {/* Assets + Risks */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
          <Card style={{padding:'16px 18px'}}>
            <div style={{fontSize:'13px',fontWeight:800,color:C.ink,marginBottom:'10px'}}>🗂️ Assets</div>
            {(()=>{
              const inv=onbData?.assetInventory||[];
              const assets=onbData?.assets||[];
              const total=inv.length+assets.length;
              if(total===0) return <div style={{fontSize:'12px',color:C.muted,textAlign:'center',padding:'12px 0'}}>No assets recorded</div>;
              const cats={};
              [...inv,...assets].forEach(a=>{
                const t=a.asset_type||a.type||'Other';
                const k=/server/i.test(t)?'Servers':/end|lap|desk/i.test(t)?'Endpoints':/app|soft|saas/i.test(t)?'Apps':/cloud|aws|azure/i.test(t)?'Cloud':'Other';
                cats[k]=(cats[k]||0)+1;
              });
              return <><div style={{fontSize:'22px',fontWeight:900,color:C.purple,marginBottom:'8px'}}>{total}<span style={{fontSize:'12px',color:C.muted,fontWeight:500,marginLeft:'4px'}}>total</span></div>
                {Object.entries(cats).map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:'11px',color:C.mid}}>{k}</span><span style={{fontSize:'11px',fontWeight:700,color:C.ink}}>{v}</span></div>)}</>;
            })()}
          </Card>
          <Card style={{padding:'16px 18px'}}>
            <div style={{fontSize:'13px',fontWeight:800,color:C.ink,marginBottom:'10px'}}>⚠️ Risks</div>
            {(()=>{
              const risks=localClient.risks||localClient.audits||[];
              const counts={Critical:0,High:0,Medium:0,Low:0};
              (Array.isArray(risks)?risks:[]).forEach(r=>{const l=r.severity||r.risk_level||r.level||'Low';if(/crit/i.test(l))counts.Critical++;else if(/high/i.test(l))counts.High++;else if(/med/i.test(l))counts.Medium++;else counts.Low++;});
              const total=Object.values(counts).reduce((a,b)=>a+b,0);
              const COLS={Critical:C.red,High:C.orange,Medium:C.yellow,Low:C.green};
              if(total===0) return <div style={{textAlign:'center',padding:'12px 0'}}><div style={{fontSize:'28px',marginBottom:'4px'}}>✅</div><div style={{fontSize:'12px',color:C.green,fontWeight:700}}>All clear</div></div>;
              return <><div style={{fontSize:'22px',fontWeight:900,color:counts.Critical>0?C.red:counts.High>0?C.orange:C.yellow,marginBottom:'8px'}}>{total}<span style={{fontSize:'12px',color:C.muted,fontWeight:500,marginLeft:'4px'}}>risks</span></div>
                {Object.entries(counts).filter(([,v])=>v>0).map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:'11px',color:C.mid,display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'7px',height:'7px',borderRadius:'50%',background:COLS[k],display:'inline-block'}}/>{k}</span><span style={{fontSize:'13px',fontWeight:800,color:COLS[k]}}>{v}</span></div>)}</>;
            })()}
          </Card>
        </div>
      </div>

      {/* RIGHT: health + actions + onboarding + docs */}
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

        {/* Account Health ring */}
        <Card style={{padding:'18px',cursor:'pointer',transition:'box-shadow 0.15s'}}
          onClick={()=>setHealthModal(true)}
          onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'}
          onMouseLeave={e=>e.currentTarget.style.boxShadow=''}>
          <div style={{fontSize:'11px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'12px'}}>Account Health</div>
          <div style={{position:'relative',display:'flex',justifyContent:'center',marginBottom:'10px'}}
            onMouseEnter={()=>setShowTooltip(true)} onMouseLeave={()=>setShowTooltip(false)}>
            <svg width="90" height="90" style={{transform:'rotate(-90deg)'}}>
              <circle cx="45" cy="45" r="37" fill="none" stroke="#f1f5f9" strokeWidth="7"/>
              <circle cx="45" cy="45" r="37" fill="none" stroke={healthColor} strokeWidth="7"
                strokeDasharray={`${2*Math.PI*37}`} strokeDashoffset={`${2*Math.PI*37*(1-health/100)}`}
                strokeLinecap="round" style={{transition:'stroke-dashoffset 0.8s ease'}}/>
            </svg>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
              <div style={{fontSize:'20px',fontWeight:900,color:healthColor,lineHeight:1}}>{health}</div>
              <div style={{fontSize:'9px',color:C.muted,fontWeight:700}}>/100</div>
            </div>
            {showTooltip&&<div style={{position:'absolute',top:'105%',left:'50%',transform:'translateX(-50%)',zIndex:50,background:C.ink,borderRadius:th('2px', { classic: '10px', dark: '10px' }),padding:'10px 14px',minWidth:'220px',boxShadow:'0 8px 24px rgba(0,0,0,0.25)'}}>
              {healthCriteria.map(c=>(
                <div key={c.key} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <span style={{fontSize:'10px',color:'rgba(255,255,255,0.8)'}}>{c.label}</span>
                  <span style={{fontSize:'10px',fontWeight:700,color:c.done?C.green:'#ef4444'}}>{c.done?c.points:0}/{c.points}</span>
                </div>
              ))}
            </div>}
          </div>
          <div style={{textAlign:'center',marginBottom:'10px'}}>
            <div style={{fontSize:'14px',fontWeight:800,color:healthColor}}>{healthLabel}</div>
            <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>Click for full breakdown</div>
          </div>
          {healthCriteria.some(c=>!c.done)&&<div style={{background:C.bg,borderRadius:th('2px', { classic: '8px', dark: '8px' }),padding:'8px 10px'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:'4px'}}>To improve</div>
            {healthCriteria.filter(c=>!c.done).map(c=>(
              <div key={c.key} style={{fontSize:'11px',color:C.mid,padding:'2px 0'}}>• {c.label} <span style={{color:C.purple,fontWeight:700}}>(+{c.points})</span></div>
            ))}
          </div>}
        </Card>

        {/* Quick actions */}
        <Card style={{padding:'16px 18px'}}>
          <div style={{fontSize:'12px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'10px'}}>Quick Actions</div>
          <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
            <Btn onClick={()=>navTo('Invoices')} style={{width:'100%',justifyContent:'center'}}>📄 Generate Invoice</Btn>
            <Btn variant="secondary" onClick={()=>navTo('Users')} style={{width:'100%',justifyContent:'center'}}>👤 Manage Users</Btn>
            <Btn variant="secondary" onClick={()=>navTo('Communications')} style={{width:'100%',justifyContent:'center'}}>📧 Send Communication</Btn>
            <Btn variant="ghost" onClick={()=>navTo('Reports')} style={{width:'100%',justifyContent:'center'}}>📊 Reports →</Btn>
          </div>
        </Card>

        {/* Onboarding — compact chips */}
        <Card style={{padding:'16px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em'}}>Onboarding</div>
            <div style={{fontSize:'13px',fontWeight:800,color:progPct===100?C.green:C.purple}}>{onbLoading?'…':progPct+'%'}</div>
          </div>
          <div style={{height:'5px',background:th('#f1f5f9', { dark: '#172033' }),borderRadius:'99px',overflow:'hidden',marginBottom:'8px'}}>
            <div style={{height:'100%',width:`${progPct}%`,background:progPct===100?C.green:C.purple,borderRadius:'99px',transition:'width 0.5s'}}/>
          </div>
          <div style={{fontSize:'10px',color:C.muted,marginBottom:'8px'}}>{stepsOk}/{ONBOARDING_STEPS.length} steps done</div>
          {onbLoading
            ?<div style={{fontSize:'11px',color:C.muted}}>Loading…</div>
            :<div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
              {ONBOARDING_STEPS.map(s=>{
                const done=!!stepsDone[s.key];
                return <div key={s.key} title={s.label} style={{padding:'2px 7px',borderRadius:th('2px', { classic: '20px', dark: '20px' }),background:done?C.greenL:C.bg,border:`1px solid ${done?C.green+'40':C.border}`,fontSize:'10px',fontWeight:700,color:done?C.green:C.muted,cursor:'default'}}>
                  {done?'✓':'○'} {s.label}
                </div>;
              })}
            </div>
          }
        </Card>

        {/* Documents */}
        <Card style={{padding:'16px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em'}}>Documents</div>
            <Btn size="sm" variant="secondary" onClick={()=>fileRef.current.click()}>+ Upload</Btn>
          </div>
          <input ref={fileRef} type="file" style={{display:'none'}} accept=".pdf,.png,.jpg,.jpeg,.docx" multiple onChange={e=>{Array.from(e.target.files).forEach(f=>setDocs(prev=>[...prev,{id:Date.now()+Math.random(),name:f.name,size:f.size,ts:new Date().toISOString()}]));e.target.value='';}}/>
          {docs.length===0
            ?<div style={{fontSize:'12px',color:C.muted,textAlign:'center',padding:'8px 0'}}>No documents</div>
            :docs.map(d=>(
              <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:'11px',color:C.ink}}>{d.name.endsWith('.pdf')?'📄':'🖼️'} {d.name}</span>
                <button onClick={()=>setDocs(prev=>prev.filter(x=>x.id!==d.id))} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'13px'}}>✕</button>
              </div>
            ))
          }
        </Card>
      </div>
    </div>

    {/* Health detail modal */}
    {healthModal&&<Modal title="Account Health Breakdown" onClose={()=>setHealthModal(false)} width="480px">
      <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'20px',padding:'16px',background:C.bg,borderRadius:th('2px', { classic: '12px', dark: '12px' })}}>
        <svg width="60" height="60" style={{transform:'rotate(-90deg)',flexShrink:0}}>
          <circle cx="30" cy="30" r="24" fill="none" stroke="#f1f5f9" strokeWidth="6"/>
          <circle cx="30" cy="30" r="24" fill="none" stroke={healthColor} strokeWidth="6"
            strokeDasharray={`${2*Math.PI*24}`} strokeDashoffset={`${2*Math.PI*24*(1-health/100)}`} strokeLinecap="round"/>
        </svg>
        <div>
          <div style={{fontSize:'24px',fontWeight:900,color:healthColor}}>{health}<span style={{fontSize:'14px',color:C.muted,fontWeight:500}}>/100</span></div>
          <div style={{fontSize:'14px',fontWeight:700,color:healthColor}}>{healthLabel}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <div>
          <div style={{fontSize:'11px',fontWeight:800,color:C.green,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'8px'}}>Completed</div>
          {healthCriteria.filter(c=>c.done).map(c=>(
            <div key={c.key} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 0',borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.green,fontWeight:700}}>✓</span>
              <span style={{fontSize:'12px',color:C.ink}}>{c.label}</span>
              <span style={{marginLeft:'auto',fontSize:'11px',fontWeight:700,color:C.green}}>+{c.points}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:'11px',fontWeight:800,color:C.red,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'8px'}}>Pending</div>
          {healthCriteria.filter(c=>!c.done).length===0
            ?<div style={{fontSize:'12px',color:C.green,fontWeight:700}}>All done! 🎉</div>
            :healthCriteria.filter(c=>!c.done).map(c=>(
              <div key={c.key} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 0',borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.red,fontWeight:700}}>✗</span>
                <span style={{fontSize:'12px',color:C.muted}}>{c.label}</span>
                <span style={{marginLeft:'auto',fontSize:'11px',fontWeight:700,color:C.red}}>+{c.points}</span>
              </div>
            ))
          }
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ══════════════════════════════════════════════════════
   REVENUE TAB
══════════════════════════════════════════════════════ */
function TabRevenue({mrr, costs, invList, fmt, navTo, localClient, logActivity}) {
  const now = new Date();
  const [period, setPeriod] = useState('12m');
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const contract = localClient?.contract || {};
  const paidInv = invList.filter(i => i.status === 'paid');
  const pendingInv = invList.filter(i => i.status === 'pending' || i.status === 'sent');
  const overdueInv = invList.filter(i => i.status === 'overdue');

  const totalCollected = paidInv.reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = [...pendingInv, ...overdueInv].reduce((s, i) => s + i.amount, 0);
  const totalBilled = invList.reduce((s, i) => s + i.amount, 0);
  const arr = mrr * 12;

  const trend12 = useMemo(() => trendSeries(mrr), [mrr]);
  const labels12 = last12Labels();

  const breakdown = [
    { label: 'Platform Licensing', value: costs.dashboardCost || 0, icon: '🖥️', color: C.purple },
    { label: 'User Licensing', value: costs.userCost || 0, icon: '👥', color: C.blue },
    { label: 'Security Modules', value: costs.securityToolCost || 0, icon: '🛡️', color: C.teal },
    { label: 'Integrations', value: costs.integrationCost || 0, icon: '🔗', color: C.orange },
    { label: 'Compliance Frameworks', value: costs.frameworkCost || 0, icon: '📋', color: C.green },
    { label: 'Audit Services', value: costs.auditCost || 0, icon: '🔍', color: C.yellow },
    { label: 'vCISO Consulting', value: costs.vcisoCost || 0, icon: '💼', color: C.red },
  ].filter(b => b.value > 0);
  const breakdownTotal = breakdown.reduce((s, b) => s + b.value, 0) || mrr;

  const estCost = mrr * 0.6;
  const netProfit = mrr - estCost;
  const profitMargin = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  const growthPct = invList.length > 1 ? '+8.4%' : '+0%';

  const contractStart = contract.contract_start || contract.contractStart || '';
  const contractEnd = contract.contract_end || contract.contractEnd || '';
  const contractStatus = contractEnd && new Date(contractEnd) > now ? 'Active' : contractEnd ? 'Expired' : 'No Contract';
  const renewalDate = contractEnd || '';
  const autoRenewal = contract.auto_renewal || contract.autoRenewal || false;

  const trendData = trend12;
  const avgMonthly = trendData.length > 0 ? Math.round(trendData.reduce((s,v)=>s+v,0)/trendData.length) : 0;
  const bestMonth = trendData.length > 0 ? Math.max(...trendData) : 0;
  const momChange = trendData.length >= 2 ? trendData[trendData.length-1] - trendData[trendData.length-2] : 0;

  const colSt = {display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:16,marginBottom:24};
  const kpiSt = (color) => ({background:C.card,border:`1px solid ${C.border}`,borderRadius:th(2, { classic: 12, dark: 12 }),padding:'18px 16px',display:'flex',flexDirection:'column',gap:6,borderTop:`3px solid ${color}`});
  const kpiLabel = {fontSize:11,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:1};
  const kpiVal = (color) => ({fontSize:22,fontWeight:700,color:color||C.ink});
  const kpiSub = {fontSize:11,color:C.muted};
  const rowSt = {display:'grid',gridTemplateColumns:'3fr 2fr',gap:16,marginBottom:24};
  const btnFilterSt = (active,color) => ({padding:'4px 12px',borderRadius:th(2, { classic: 20, dark: 20 }),border:`1px solid ${active?color:C.border}`,background:active?color:'transparent',color:active?'#fff':C.muted,fontSize:12,fontWeight:600,cursor:'pointer'});

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0}}>
      {/* Section 1: KPI Cards */}
      <div style={colSt}>
        <div style={kpiSt(C.purple)}>
          <div style={kpiLabel}>Total Revenue</div>
          <div style={kpiVal(C.purple)}>💰 {fmt(totalBilled)}</div>
          <div style={kpiSub}>All time billed</div>
        </div>
        <div style={{...kpiSt(C.blue),cursor:'pointer'}} onClick={()=>navTo('Billing')}>
          <div style={kpiLabel}>MRR</div>
          <div style={kpiVal(C.blue)}>📅 {fmt(mrr)}</div>
          <div style={{...kpiSub,color:C.blue,fontWeight:600}}>Billing →</div>
        </div>
        <div style={kpiSt(C.teal)}>
          <div style={kpiLabel}>ARR</div>
          <div style={kpiVal(C.teal)}>📈 {fmt(arr)}</div>
          <div style={kpiSub}>Annual Run Rate</div>
        </div>
        <div style={{...kpiSt(C.orange),cursor:'pointer'}} onClick={()=>navTo('Payments')}>
          <div style={kpiLabel}>Outstanding</div>
          <div style={kpiVal(C.orange)}>⏳ {fmt(totalOutstanding)}</div>
          <div style={{...kpiSub,color:C.orange,fontWeight:600}}>View Payments →</div>
        </div>
        <div style={kpiSt(C.green)}>
          <div style={kpiLabel}>Collected</div>
          <div style={kpiVal(C.green)}>✅ {fmt(totalCollected)}</div>
          <div style={kpiSub}>{paidInv.length} invoices paid</div>
        </div>
        <div style={kpiSt(C.purple)}>
          <div style={kpiLabel}>Growth</div>
          <div style={kpiVal(C.purple)}>🚀 {growthPct}</div>
          <div style={kpiSub}>MoM estimate</div>
        </div>
      </div>

      {/* Section 2: Revenue Trend + Contract Details */}
      <div style={rowSt}>
        <Card style={{padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <SectionTitle>Revenue Trend</SectionTitle>
            <div style={{display:'flex',gap:6}}>
              {['30D','3M','12M'].map(p=>(
                <button key={p} style={btnFilterSt(period===p.toLowerCase().replace('d','d').replace('m','m'),C.purple)} onClick={()=>setPeriod(p.toLowerCase())}>{p}</button>
              ))}
            </div>
          </div>
          <MiniLineChart data={trendData} labels={labels12} color={C.purple} height={120}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:16}}>
            <div style={{textAlign:'center',padding:'10px 8px',background:C.bg,borderRadius:th(2, { classic: 8, dark: 8 })}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>MoM Change</div>
              <div style={{fontSize:14,fontWeight:700,color:momChange>=0?C.green:C.red}}>{momChange>=0?'+':''}{fmt(momChange)}</div>
            </div>
            <div style={{textAlign:'center',padding:'10px 8px',background:C.bg,borderRadius:th(2, { classic: 8, dark: 8 })}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Best Month</div>
              <div style={{fontSize:14,fontWeight:700,color:C.purple}}>{fmt(bestMonth)}</div>
            </div>
            <div style={{textAlign:'center',padding:'10px 8px',background:C.bg,borderRadius:th(2, { classic: 8, dark: 8 })}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Avg Monthly</div>
              <div style={{fontSize:14,fontWeight:700,color:C.ink}}>{fmt(avgMonthly)}</div>
            </div>
          </div>
        </Card>

        <Card style={{padding:20}}>
          <SectionTitle style={{marginBottom:16}}>Contract Details</SectionTitle>
          {[
            {label:'Contract Value', value:`${fmt(arr)} / year`, bold:true},
            {label:'Start Date', value:contractStart?fmtDate(contractStart):'—'},
            {label:'End Date', value:contractEnd?fmtDate(contractEnd):'—'},
            {label:'Renewal Date', value:renewalDate?fmtDate(renewalDate):'—'},
          ].map(r=>(
            <div key={r.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,color:C.muted}}>{r.label}</span>
              <span style={{fontSize:13,fontWeight:r.bold?700:500,color:C.ink}}>{r.value}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,color:C.muted}}>Contract Status</span>
            <span style={{padding:'3px 10px',borderRadius:th(2, { classic: 20, dark: 20 }),fontSize:12,fontWeight:600,background:contractStatus==='Active'?C.greenL:contractStatus==='Expired'?C.redL:C.bg,color:contractStatus==='Active'?C.green:contractStatus==='Expired'?C.red:C.muted}}>{contractStatus}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0'}}>
            <span style={{fontSize:13,color:C.muted}}>Auto-Renewal</span>
            <span style={{padding:'3px 10px',borderRadius:th(2, { classic: 20, dark: 20 }),fontSize:12,fontWeight:600,background:autoRenewal?C.greenL:C.bg,color:autoRenewal?C.green:C.muted}}>{autoRenewal?'Yes':'No'}</span>
          </div>
        </Card>
      </div>

      {/* Section 3: Revenue Breakdown */}
      <Card style={{padding:20,marginBottom:24}}>
        <SectionTitle style={{marginBottom:20}}>Revenue Breakdown by Service</SectionTitle>
        {breakdown.length === 0 ? (
          <div style={{textAlign:'center',padding:32,color:C.muted,fontSize:13}}>No breakdown data available</div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
            <div>
              {breakdown.map(b=>{
                const pct = breakdownTotal > 0 ? Math.round((b.value/breakdownTotal)*100) : 0;
                return (
                  <div key={b.label} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:C.ink}}>{b.icon} {b.label}</span>
                      <span style={{fontSize:12,fontWeight:600,color:b.color}}>{pct}%</span>
                    </div>
                    <div style={{height:8,borderRadius:th(2, { classic: 4, dark: 4 }),background:C.bg,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:th(2, { classic: 4, dark: 4 }),background:b.color,width:`${pct}%`,transition:'width 0.4s'}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${C.border}`}}>
                    <th style={{textAlign:'left',padding:'6px 8px',color:C.muted,fontWeight:600,fontSize:11}}>SERVICE</th>
                    <th style={{textAlign:'right',padding:'6px 8px',color:C.muted,fontWeight:600,fontSize:11}}>AMOUNT</th>
                    <th style={{textAlign:'right',padding:'6px 8px',color:C.muted,fontWeight:600,fontSize:11}}>SHARE</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map(b=>{
                    const pct = breakdownTotal > 0 ? Math.round((b.value/breakdownTotal)*100) : 0;
                    return (
                      <tr key={b.label} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:'8px 8px',color:C.ink}}>{b.icon} {b.label}</td>
                        <td style={{padding:'8px 8px',textAlign:'right',fontWeight:600,color:b.color}}>{fmt(b.value)}</td>
                        <td style={{padding:'8px 8px',textAlign:'right',color:C.muted}}>{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:`2px solid ${C.border}`,fontWeight:700}}>
                    <td style={{padding:'8px 8px',color:C.ink}}>Total</td>
                    <td style={{padding:'8px 8px',textAlign:'right',color:C.purple}}>{fmt(breakdownTotal)}</td>
                    <td style={{padding:'8px 8px',textAlign:'right',color:C.muted}}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Section 4: Cost Center & Profitability */}
      <Card style={{padding:20,marginBottom:24}}>
        <SectionTitle style={{marginBottom:20}}>Cost Center Summary</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {label:'Total Revenue',value:fmt(mrr),color:C.purple,bg:C.purpleL||'#f3e8ff'},
            {label:'Estimated Costs',value:fmt(estCost),color:C.orange,bg:C.orangeL||th('#fff7ed', { dark: '#3A1F0A' })},
            {label:'Net Profit',value:fmt(netProfit),color:C.green,bg:C.greenL||th('#f0fdf4', { dark: '#0B2E24' })},
            {label:'Profit Margin',value:`${profitMargin}%`,color:C.teal,bg:C.tealL||'#f0fdfa'},
          ].map(m=>(
            <div key={m.label} style={{background:m.bg,borderRadius:th(2, { classic: 10, dark: 10 }),padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:11,color:m.color,fontWeight:600,marginBottom:6,textTransform:'uppercase'}}>{m.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:m.color}}>{m.value}</div>
            </div>
          ))}
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr style={{borderBottom:`2px solid ${C.border}`}}>
              <th style={{textAlign:'left',padding:'8px 10px',color:C.muted,fontWeight:600,fontSize:11}}>COST CENTER</th>
              <th style={{textAlign:'right',padding:'8px 10px',color:C.muted,fontWeight:600,fontSize:11}}>ESTIMATED COST</th>
              <th style={{textAlign:'right',padding:'8px 10px',color:C.muted,fontWeight:600,fontSize:11}}>% OF REVENUE</th>
            </tr>
          </thead>
          <tbody>
            {[
              {label:'User Licensing Cost',val:costs.userCost||0},
              {label:'Integration Cost',val:costs.integrationCost||0},
              {label:'Security Module Cost',val:costs.securityToolCost||0},
              {label:'Compliance Cost',val:costs.frameworkCost||0},
              {label:'Platform Infrastructure',val:Math.round(mrr*0.15),pct:'15%'},
            ].map(r=>{
              const pct = r.pct || (mrr>0?`${Math.round((r.val/mrr)*100)}%`:'0%');
              return (
                <tr key={r.label} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:'10px 10px',color:C.ink}}>{r.label}</td>
                  <td style={{padding:'10px 10px',textAlign:'right',fontWeight:600,color:C.orange}}>{fmt(r.val)}</td>
                  <td style={{padding:'10px 10px',textAlign:'right',color:C.muted}}>{pct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Section 5: Export Row */}
      <div style={{display:'flex',gap:12,justifyContent:'flex-end',paddingBottom:8}}>
        <Btn onClick={()=>{logActivity({title:'Revenue Report Exported',sub:'Revenue report downloaded',color:C.purple,icon:'📊',cat:'Revenue'});}} style={{background:C.purple,color:'#fff',border:'none'}}>Export Revenue Report</Btn>
        <Btn onClick={()=>{logActivity({title:'PDF Downloaded',sub:'Revenue PDF downloaded',color:C.blue,icon:'📄',cat:'Revenue'});}} style={{background:'transparent',color:C.blue,border:`1px solid ${C.blue}`}}>Download PDF</Btn>
        <Btn onClick={()=>{logActivity({title:'Excel Downloaded',sub:'Revenue Excel downloaded',color:C.teal,icon:'📑',cat:'Revenue'});}} style={{background:'transparent',color:C.teal,border:`1px solid ${C.teal}`}}>Download Excel</Btn>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   BILLING EVIDENCE CARD (sub-component to avoid hook-in-map)
══════════════════════════════════════════════════════ */
function BillEvidenceCard({ev,onDelete}){
  const [prevOpen,setPrevOpen]=useState(false);
  const isImg=ev.fileType?.startsWith('image/');
  return <>
    <div style={{border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '12px', dark: '12px' }),overflow:'hidden',background:C.bg}}>
      {isImg&&ev.dataUrl
        ?<img src={ev.dataUrl} alt={ev.name} style={{width:'100%',height:'120px',objectFit:'cover',cursor:'pointer'}} onClick={()=>setPrevOpen(true)}/>
        :<div style={{width:'100%',height:'120px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'40px',cursor:'pointer'}} onClick={()=>setPrevOpen(true)}>📄</div>
      }
      <div style={{padding:'10px 12px'}}>
        <div style={{fontSize:'12px',fontWeight:700,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'2px'}}>{ev.name}</div>
        <div style={{fontSize:'10px',color:C.muted,marginBottom:'8px'}}>{(ev.size/1024).toFixed(1)} KB · {fmtTS(ev.ts)}</div>
        <div style={{display:'flex',gap:'5px'}}>
          <Btn size="sm" variant="secondary" onClick={()=>setPrevOpen(true)}>Preview</Btn>
          <Btn size="sm" variant="secondary" onClick={()=>{const a=document.createElement('a');a.href=ev.dataUrl;a.download=ev.name;a.click();}}>↓</Btn>
          <Btn size="sm" variant="danger" onClick={onDelete}>✕</Btn>
        </div>
      </div>
    </div>
    {prevOpen&&<Modal title={ev.name} onClose={()=>setPrevOpen(false)} width="700px">
      {isImg?<img src={ev.dataUrl} alt={ev.name} style={{width:'100%',borderRadius:th('2px', { classic: '8px', dark: '8px' })}}/>
        :<div style={{textAlign:'center',padding:'40px'}}>
          <div style={{fontSize:'64px',marginBottom:'16px'}}>📄</div>
          <Btn onClick={()=>{const a=document.createElement('a');a.href=ev.dataUrl;a.download=ev.name;a.click();}}>Download</Btn>
        </div>}
    </Modal>}
  </>;
}

/* ══════════════════════════════════════════════════════
   BILLING TAB
══════════════════════════════════════════════════════ */
function TabBilling({localClient,setLocalClient,setDirty,costs,mrr,customMRR,billingItems,setBillingItems,fmt,navTo,setModal,logActivity}){
  const fws=localClient.frameworks||[];
  const tools=localClient.securityTools||[];
  const ints=localClient.integrations||[];
  const users=localClient.users||{};
  const totalMRR=mrr+customMRR;
  const plan=fws.length>2?'Enterprise':fws.length>0||tools.length>0?'Professional':'Starter';
  const outAmt=(localClient.invoices||[]).filter(i=>i.status==='pending'||i.status==='overdue').reduce((s,i)=>s+i.amount,0);
  const [consent,setConsent]=useState(false);
  const [saved,setSaved]=useState(false);
  const [billEvidences,setBillEvidences]=useState([]);
  const billFileRef=useRef();

  const billing=localClient.billing||{};
  function bf(key,val){ setLocalClient(prev=>({...prev,billing:{...(prev.billing||{}),[key]:val}})); setDirty(true); setSaved(false); }


  function removeItem(id){
    const it=billingItems.find(b=>b.id===id);
    setBillingItems(prev=>prev.filter(b=>b.id!==id));
    logActivity({title:`Billing item removed: ${it?.name||'Item'}`,sub:'Billing updated',color:C.red,icon:'🗑️',cat:'billing',linkTab:'Billing'});
  }

  function handleSaveBillingDetails(){
    if(!consent){alert('Please accept the consent checkbox before saving.');return;}
    setSaved(true);setDirty(false);
    logActivity({title:'Billing details updated',sub:`${billing.companyName||localClient.companyName||'Client'} · ${billing.billingEmail||''}`,color:C.green,icon:'💾',cat:'billing',linkTab:'Billing'});
  }

  return <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

    {/* Plan banner */}
    <div style={{background:th('#FFFBEB', { classic: 'linear-gradient(135deg,#fffbeb,#fef3c7)', dark: 'linear-gradient(135deg,#3A2A0A,#3A2A0A)' }),border:`1px solid ${th('#fde68a', { dark: '#78350F' })}`,borderRadius:th('2px', { classic: '12px', dark: '12px' }),padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontSize:'20px'}}>⚡</span>
        <div>
          <span style={{fontSize:'13px',fontWeight:700,color:th('#92400e', { dark: '#FBBF24' })}}>Current Plan: <span style={{color:C.purple}}>{plan}</span></span>
          <span style={{fontSize:'13px',color:th('#92400e', { dark: '#FBBF24' }),marginLeft:'8px'}}>— {fws.length+tools.length+ints.length} active services · {fmt(totalMRR)}/mo</span>
        </div>
      </div>
      <div style={{display:'flex',gap:'8px'}}>
        <Btn size="sm" variant="secondary" onClick={()=>navTo('Revenue')}>Revenue →</Btn>
        <Btn size="sm" variant="secondary" onClick={()=>navTo('Invoices')}>Invoices →</Btn>
        <Btn size="sm" onClick={()=>setModal({type:'createInvoice',data:{}})}>Generate Invoice</Btn>
      </div>
    </div>

    {/* ── Billing Details Form ── */}
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

        {/* Company / Business Details */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '14px', dark: '14px' }),overflow:'hidden',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' })}}>
          <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:'16px'}}>🏢</span>
            <div style={{fontSize:'15px',fontWeight:700,color:C.ink}}>Company / Business Details</div>
          </div>
          <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Company / Firm Name <span style={{color:C.red}}>*</span></div>
                <Input value={billing.companyName||localClient.companyName||localClient.name||''} onChange={e=>bf('companyName',e.target.value)} placeholder="Your company name"/>
              </div>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Contact Person <span style={{color:C.red}}>*</span></div>
                <Input value={billing.contactPerson||''} onChange={e=>bf('contactPerson',e.target.value)} placeholder="Full name"/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Billing Email <span style={{color:C.red}}>*</span></div>
                <Input value={billing.billingEmail||''} onChange={e=>bf('billingEmail',e.target.value)} placeholder="billing@company.com" type="email"/>
              </div>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Phone <span style={{color:C.red}}>*</span></div>
                <Input value={billing.phone||''} onChange={e=>bf('phone',e.target.value)} placeholder="+91 or +1…"/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>GST / Tax Number <span style={{fontSize:'11px',fontWeight:500,color:C.muted}}>(Optional — for tax credit)</span></div>
                <Input value={billing.gstNumber||''} onChange={e=>bf('gstNumber',e.target.value)} placeholder="E.g., 27AABCU9603R1ZM"/>
              </div>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>PAN Number <span style={{fontSize:'11px',fontWeight:500,color:C.muted}}>(Optional)</span></div>
                <Input value={billing.panNumber||''} onChange={e=>bf('panNumber',e.target.value)} placeholder="E.g., ABCDE1234F"/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Payment Method</div>
                <SearchableSelect value={billing.paymentMethod||''} onChange={v=>bf('paymentMethod',v)} options={DROPDOWN_DATA.paymentMethods} placeholder="Select Payment Method"/>
              </div>
              <div>
                <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Billing Cycle</div>
                <SearchableSelect value={billing.billingCycle||''} onChange={v=>bf('billingCycle',v)} options={DROPDOWN_DATA.billingFrequencies} placeholder="Select Billing Cycle"/>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '14px', dark: '14px' }),overflow:'hidden',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' })}}>
          <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:'16px'}}>📍</span>
            <div style={{fontSize:'15px',fontWeight:700,color:C.ink}}>Billing Address</div>
          </div>
          <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:'16px'}}>
            <div>
              <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Address <span style={{color:C.red}}>*</span></div>
              <TextArea value={billing.address||''} onChange={e=>bf('address',e.target.value)} placeholder="Street address, building, floor…" rows={2}/>
            </div>
            <div style={{marginBottom:'4px'}}>
              <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'8px'}}>Country / State / City <span style={{color:C.red}}>*</span></div>
              <LocationCascade
                country={billing.country||localClient.country||''}
                state={billing.state||localClient.state||''}
                city={billing.city||localClient.city||''}
                onCountryChange={v=>{bf('country',v);bf('state','');bf('city','');}}
                onStateChange={v=>{bf('state',v);bf('city','');}}
                onCityChange={v=>bf('city',v)}
                compact={true}
              />
            </div>
            <div>
              <div style={{fontSize:'12px',fontWeight:700,color:C.mid,marginBottom:'6px'}}>Pincode / ZIP <span style={{color:C.red}}>*</span></div>
              <Input value={billing.pincode||''} onChange={e=>bf('pincode',e.target.value)} placeholder="PIN / ZIP / Postal Code" style={{maxWidth:'200px'}}/>
            </div>
          </div>
        </div>

        {/* Consent + Save + Send */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '14px', dark: '14px' }),padding:'20px 24px',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' })}}>
          <label style={{display:'flex',alignItems:'flex-start',gap:'12px',cursor:'pointer',marginBottom:'20px'}}>
            <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:'2px',width:'16px',height:'16px',accentColor:C.purple,flexShrink:0}}/>
            <span style={{fontSize:'12px',color:C.mid,lineHeight:1.6}}>
              I confirm that the billing information provided is accurate and authorize processing of invoices and payments for this client account. This data will be used for billing, GST compliance, and financial reporting.
              {' '}<span style={{color:C.purple,fontWeight:700,cursor:'pointer'}}>Privacy Policy</span> &amp; <span style={{color:C.purple,fontWeight:700,cursor:'pointer'}}>Terms of Service</span>. <span style={{color:C.red}}>*</span>
            </span>
          </label>
          {/* Save row */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px',marginBottom:'16px'}}>
            <button onClick={()=>navTo('Overview')} style={{background:'none',border:'none',color:C.muted,fontSize:'13px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>← Back to Overview</button>
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              {saved&&<span style={{fontSize:'12px',color:C.green,fontWeight:700}}>✓ Billing details saved</span>}
              <Btn onClick={handleSaveBillingDetails} disabled={!consent}>💾 Save Billing Details</Btn>
            </div>
          </div>
          {/* Send billing via channel */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'16px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'10px'}}>Send Billing Details Via</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {[
                {icon:'📧',label:'Email',     color:th('#2563eb', { dark: '#60A5FA' }),bg:th('#eff6ff', { dark: '#172554' })},
                {icon:'💬',label:'WhatsApp',  color:'#16a34a',bg:th('#f0fdf4', { dark: '#0B2E24' })},
                {icon:'📱',label:'SMS',        color:'#7c3aed',bg:th('#f5f3ff', { dark: '#2E1065' })},
                {icon:'🔗',label:'Secure Link',color:'#0d9488',bg:'#f0fdfa'},
              ].map(ch=>(
                <button key={ch.label} onClick={()=>{setModal({type:'sendComm',data:{commType:'Billing Details',channel:ch.label,recipient:billing.billingEmail||''}});logActivity({title:`Billing details shared via ${ch.label}`,sub:billing.billingEmail||'',color:ch.color,icon:ch.icon,cat:'billing',linkTab:'Billing'});}}
                  style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 16px',borderRadius:th('2px', { classic: '10px', dark: '10px' }),border:`1px solid ${ch.color}30`,background:ch.bg,cursor:'pointer',fontSize:'13px',fontWeight:700,color:ch.color,transition:'all 0.12s'}}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 2px 8px ${ch.color}30`;}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';}}>
                  <span style={{fontSize:'16px'}}>{ch.icon}</span>{ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>

    {/* ── Billing Items ── */}
    <Card style={{padding:0}}>
      <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:'14px',fontWeight:700,color:C.ink}}>Billing Items</div>
        <Btn size="sm" onClick={()=>setModal({type:'addBillingItem',data:{}})}>+ Add Item</Btn>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{background:C.bg}}>{['Item','Description','Qty','Unit Price','Frequency','Total','Actions'].map(h=><th key={h} style={{padding:'10px 16px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',color:C.muted,textAlign:'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            {id:'_dash',name:'Dashboard Licenses',desc:'Platform access',qty:1,unitPrice:costs.dashboardCost||0,freq:'monthly',readonly:true},
            {id:'_fw',name:'Frameworks',desc:'Compliance frameworks',qty:1,unitPrice:costs.frameworkCost||0,freq:'monthly',readonly:true},
            {id:'_int',name:'Integrations',desc:'Connected integrations',qty:1,unitPrice:costs.integrationCost||0,freq:'monthly',readonly:true},
          ].filter(r=>r.unitPrice>0).concat(billingItems).map((r,i,arr)=>(
            <tr key={r.id} style={{borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none'}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={{padding:'11px 16px',fontSize:'13px',fontWeight:600,color:C.ink}}>{r.name}{r.readonly&&<span style={{fontSize:'10px',color:C.muted,marginLeft:'6px'}}>(system)</span>}</td>
              <td style={{padding:'11px 16px',fontSize:'12px',color:C.muted}}>{r.desc||'—'}</td>
              <td style={{padding:'11px 16px',fontSize:'13px',color:C.ink}}>{r.qty}</td>
              <td style={{padding:'11px 16px',fontSize:'13px',fontWeight:700,color:C.ink}}>{fmt(r.unitPrice)}</td>
              <td style={{padding:'11px 16px',fontSize:'12px',color:C.mid}}>{r.freq}</td>
              <td style={{padding:'11px 16px',fontSize:'13px',fontWeight:700,color:C.purple}}>{fmt(r.qty*r.unitPrice*(r.freq==='annual'?1/12:1))}/mo</td>
              <td style={{padding:'11px 16px'}}>
                {!r.readonly&&<div style={{display:'flex',gap:'6px'}}>
                  <Btn size="sm" variant="secondary" onClick={()=>setModal({type:'editBillingItem',data:r})}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>removeItem(r.id)}>Remove</Btn>
                </div>}
              </td>
            </tr>
          ))}
          <tr style={{background:C.bg,borderTop:`1px solid ${C.border}`}}>
            <td colSpan={5} style={{padding:'12px 16px',fontSize:'14px',fontWeight:800,color:C.ink}}>Monthly Total</td>
            <td style={{padding:'12px 16px',fontSize:'15px',fontWeight:800,color:C.purple}}>{fmt(totalMRR)}/mo</td>
            <td/>
          </tr>
        </tbody>
      </table>
    </Card>

    {/* ── Billing Evidence / Payment Proof ── */}
    <Card style={{padding:0}}>
      <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:'14px',fontWeight:700,color:C.ink}}>Payment Proof & Evidence</div>
          <div style={{fontSize:'12px',color:C.muted,marginTop:'2px'}}>Upload receipts, UPI screenshots, bank slips, signed agreements</div>
        </div>
        <Btn size="sm" onClick={()=>billFileRef.current.click()}>+ Upload Proof</Btn>
      </div>
      <input ref={billFileRef} type="file" style={{display:'none'}} accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" multiple onChange={e=>{
        Array.from(e.target.files).forEach(f=>{
          const reader=new FileReader();
          reader.onload=ev=>{
            const newEv={id:Date.now()+Math.random(),name:f.name,fileType:f.type,size:f.size,ts:new Date().toISOString(),dataUrl:ev.target.result,uploader:'Owner',tag:'billing'};
            setBillEvidences(prev=>[newEv,...prev]);
            logActivity({title:`Billing proof uploaded: ${f.name}`,sub:`${(f.size/1024).toFixed(1)} KB`,color:C.green,icon:'📎',cat:'billing',linkTab:'Billing'});
          };
          reader.readAsDataURL(f);
        });
        e.target.value='';
      }}/>
      {billEvidences.length===0
        ?<div style={{padding:'40px',textAlign:'center'}}>
            <div style={{fontSize:'40px',marginBottom:'10px',opacity:0.35}}>📎</div>
            <div style={{fontSize:'14px',fontWeight:700,color:C.ink,marginBottom:'4px'}}>No proof uploaded yet</div>
            <div style={{fontSize:'12px',color:C.muted,marginBottom:'16px'}}>Attach payment receipts, screenshots or signed documents</div>
            <Btn size="sm" onClick={()=>billFileRef.current.click()}>Upload Now</Btn>
          </div>
        :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'14px',padding:'16px 24px'}}>
            {billEvidences.map(ev=>(
              <BillEvidenceCard key={ev.id} ev={ev} onDelete={()=>{setBillEvidences(prev=>prev.filter(x=>x.id!==ev.id));logActivity({title:`Billing proof deleted: ${ev.name}`,sub:'',color:C.red,icon:'🗑️',cat:'billing',linkTab:'Billing'});}}/>
            ))}
          </div>
      }
    </Card>
    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════
   INVOICES TAB
══════════════════════════════════════════════════════ */
function TabInvoices({invList,setInvList,client,fmt,navTo,setModal,logActivity}){
  const paidAmt=invList.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0);
  const outAmt=invList.filter(i=>i.status!=='paid'&&i.status!=='cancelled').reduce((s,i)=>s+i.amount,0);
  const overdueCount=invList.filter(i=>i.status==='overdue').length;
  const invId=inv=>`INV-${String(client.id).slice(0,6).toUpperCase()}-${inv.year}-${String(inv.month).padStart(2,'0')}`;
  const [statusMenu,setStatusMenu]=useState(null);
  const [invFilter,setInvFilter]=useState('all');

  const latestPaid=[...invList].filter(i=>i.status==='paid').sort((a,b)=>b.year!==a.year?b.year-a.year:b.month-a.month)[0];
  const billing=client.billing||{};

  function changeStatus(id,newStatus){
    setInvList(prev=>prev.map(i=>i.id===id?{...i,status:newStatus}:i));
    const inv=invList.find(i=>i.id===id);
    logActivity({title:`Invoice ${invId(inv||{})} → ${newStatus}`,sub:newStatus==='paid'?`Payment recorded · ${fmt(inv?.amount||0)}`:'Status updated',color:newStatus==='paid'?C.green:newStatus==='overdue'?C.red:C.blue,icon:newStatus==='paid'?'✅':'📄',cat:'invoices',linkTab:'Invoices'});
    setStatusMenu(null);
  }

  const filterTabs=['all','paid','pending','overdue','cancelled'];
  const filteredInv=invFilter==='all'?invList:invList.filter(i=>{
    if(invFilter==='pending') return i.status==='pending'||i.status==='sent';
    return i.status===invFilter;
  });

  return <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

    {/* ── Top row: Receipt card + Balance card ── */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

      {/* Latest Invoice Receipt Card */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '16px', dark: '16px' }),padding:'28px 32px',boxShadow:th('none', { classic: '0 1px 6px rgba(0,0,0,0.06)', dark: '0 1px 6px rgba(0,0,0,0.06)' }),display:'flex',flexDirection:'column',gap:'20px'}}>
        {latestPaid ? <>
          {/* Status row */}
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:C.greenL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>✅</div>
            <div>
              <div style={{fontSize:'15px',fontWeight:700,color:C.ink}}>Invoice paid</div>
              <div style={{fontSize:'12px',color:C.muted}}>Most recent payment received</div>
            </div>
          </div>
          {/* Amount */}
          <div>
            <div style={{fontSize:'36px',fontWeight:800,color:C.ink,letterSpacing:'-1px'}}>{fmt(latestPaid.amount)}</div>
            <button onClick={()=>setModal({type:'editInvoice',data:latestPaid})} style={{background:'none',border:'none',padding:0,marginTop:'6px',fontSize:'13px',color:C.purple,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}>View invoice and payment details →</button>
          </div>
          {/* Details grid */}
          <div style={{display:'flex',flexDirection:'column',gap:'10px',paddingTop:'16px',borderTop:`1px solid ${C.border}`}}>
            {[
              {label:'Invoice number', value:invId(latestPaid)},
              {label:'Payment date',   value:fmtDate(latestPaid.paidDate||`${latestPaid.year}-${String(latestPaid.month).padStart(2,'0')}-28`)},
              {label:'Payment method', value:billing.paymentMethod||latestPaid.paymentMethod||'Bank Transfer'},
            ].map(row=>(
              <div key={row.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'13px',color:C.muted}}>{row.label}</span>
                <span style={{fontSize:'13px',fontWeight:600,color:C.ink,fontFamily:row.label==='Invoice number'?'monospace':'inherit'}}>{row.value}</span>
              </div>
            ))}
          </div>
          {/* Action buttons */}
          <div style={{display:'flex',gap:'10px',paddingTop:'4px'}}>
            <button onClick={()=>logActivity({title:`Invoice downloaded: ${invId(latestPaid)}`,sub:'PDF export',color:C.blue,icon:'⬇️',cat:'invoices',linkTab:'Invoices'})}
              style={{flex:1,padding:'10px 0',borderRadius:th('2px', { classic: '8px', dark: '8px' }),border:`1px solid ${C.border}`,background:'transparent',color:C.ink,fontSize:'13px',fontWeight:600,cursor:'pointer',transition:'background 0.12s'}}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              ⬇ Download invoice
            </button>
            <button onClick={()=>logActivity({title:`Receipt downloaded: ${invId(latestPaid)}`,sub:'PDF export',color:C.green,icon:'🧾',cat:'invoices',linkTab:'Invoices'})}
              style={{flex:1,padding:'10px 0',borderRadius:th('2px', { classic: '8px', dark: '8px' }),border:'none',background:C.ink,color:'white',fontSize:'13px',fontWeight:600,cursor:'pointer',transition:'opacity 0.12s'}}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.88'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              🧾 Download receipt
            </button>
          </div>
        </> : (
          <div style={{textAlign:'center',padding:'24px 0',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'12px'}}>
            <div style={{fontSize:'36px',opacity:0.3}}>📄</div>
            <div style={{fontSize:'14px',fontWeight:700,color:C.ink}}>No paid invoices yet</div>
            <div style={{fontSize:'12px',color:C.muted}}>Your latest receipt will appear here</div>
            <Btn onClick={()=>setModal({type:'createInvoice',data:{}})}>Create Invoice</Btn>
          </div>
        )}
      </div>

      {/* Balance & Summary card */}
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {/* Current balance */}
        <div style={{background:th('#2D3748', { classic: 'linear-gradient(135deg,#1e1b4b,#312e81)', dark: 'linear-gradient(135deg,#1e1b4b,#312e81)' }),border:'none',borderRadius:th('2px', { classic: '16px', dark: '16px' }),padding:'24px 28px',boxShadow:'0 4px 16px rgba(49,46,129,0.3)',color:'white',flex:1}}>
          <div style={{fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',opacity:0.7,marginBottom:'8px'}}>Outstanding Balance</div>
          <div style={{fontSize:'34px',fontWeight:800,letterSpacing:'-1px',marginBottom:'6px'}}>{fmt(outAmt)}</div>
          <div style={{fontSize:'13px',opacity:0.75,marginBottom:'20px'}}>
            {overdueCount>0?`${overdueCount} invoice${overdueCount>1?'s':''} overdue · action required`:'No overdue invoices'}
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button onClick={()=>setModal({type:'createInvoice',data:{}})}
              style={{padding:'8px 16px',borderRadius:th('2px', { classic: '8px', dark: '8px' }),border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.12)',color:'white',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>
              + New Invoice
            </button>
            {overdueCount>0&&<button onClick={()=>navTo('Communications')}
              style={{padding:'8px 16px',borderRadius:th('2px', { classic: '8px', dark: '8px' }),border:'none',background:th('white', { dark: '#1E293B' }),color:'#312e81',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>
              Send Reminders →
            </button>}
          </div>
        </div>
        {/* Mini stats row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          {[
            {label:'Total Invoices', value:invList.length, color:C.purple, icon:'📄'},
            {label:'Total Paid',     value:fmt(paidAmt),  color:C.green,  icon:'✅'},
          ].map(k=>(
            <div key={k.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '12px', dark: '12px' }),padding:'14px 18px',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.04)', dark: '0 1px 4px rgba(0,0,0,0.04)' })}}>
              <div style={{fontSize:'11px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>{k.icon} {k.label}</div>
              <div style={{fontSize:'18px',fontWeight:800,color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* ── Invoice List ── */}
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '16px', dark: '16px' }),overflow:'hidden',boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' })}}>
      {/* Header */}
      <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
        <div style={{fontSize:'15px',fontWeight:700,color:C.ink}}>Invoices</div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {/* Filter pills */}
          <div style={{display:'flex',gap:'6px'}}>
            {filterTabs.map(f=>(
              <button key={f} onClick={()=>setInvFilter(f)} style={{padding:'5px 12px',borderRadius:th('2px', { classic: '20px', dark: '20px' }),border:`1px solid ${invFilter===f?C.purple:C.border}`,background:invFilter===f?C.purple:'transparent',color:invFilter===f?'white':C.muted,fontSize:'11px',fontWeight:600,cursor:'pointer',textTransform:'capitalize',transition:'all 0.12s'}}>{f==='all'?`All (${invList.length})`:f}</button>
            ))}
          </div>
          <Btn size="sm" variant="secondary" onClick={()=>navTo('Reports')}>Export</Btn>
          <Btn size="sm" onClick={()=>setModal({type:'createInvoice',data:{}})}>+ Create</Btn>
        </div>
      </div>

      {/* Table */}
      {filteredInv.length===0
        ?<div style={{padding:'48px',textAlign:'center'}}>
            <div style={{fontSize:'32px',opacity:0.3,marginBottom:'10px'}}>📄</div>
            <div style={{fontSize:'14px',fontWeight:700,color:C.ink,marginBottom:'4px'}}>No invoices found</div>
            <div style={{fontSize:'12px',color:C.muted}}>Try changing the filter above</div>
          </div>
        :<table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:C.bg}}>
              {['Date','Invoice #','Amount','Tax','Status','Actions'].map(h=>(
                <th key={h} style={{padding:'10px 20px',fontSize:'11px',fontWeight:700,textTransform:'uppercase',color:C.muted,textAlign:'left',borderBottom:`1px solid ${C.border}`,letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredInv.map((inv,i)=>(
              <tr key={inv.id||i} style={{transition:'background 0.12s'}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'13px 20px',fontSize:'13px',color:C.mid,borderBottom:i<filteredInv.length-1?`1px solid ${C.border}`:'none'}}>
                  {MONTHS[inv.month-1]} {inv.year}
                </td>
                <td style={{padding:'13px 20px',fontSize:'12px',fontFamily:'monospace',fontWeight:600,color:C.muted,borderBottom:i<filteredInv.length-1?`1px solid ${C.border}`:'none'}}>
                  {invId(inv)}
                </td>
                <td style={{padding:'13px 20px',fontSize:'14px',fontWeight:700,color:C.ink,borderBottom:i<filteredInv.length-1?`1px solid ${C.border}`:'none'}}>
                  {fmt(inv.amount||0)}
                </td>
                <td style={{padding:'13px 20px',fontSize:'12px',color:C.muted,borderBottom:i<filteredInv.length-1?`1px solid ${C.border}`:'none'}}>
                  {inv.tax||0}%
                </td>
                <td style={{padding:'13px 20px',borderBottom:i<filteredInv.length-1?`1px solid ${C.border}`:'none',position:'relative'}}>
                  <div style={{display:'inline-flex',alignItems:'center',gap:'6px',position:'relative'}}>
                    <StatusPill status={inv.status}/>
                    <button onClick={()=>setStatusMenu(statusMenu===inv.id?null:inv.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'10px',color:C.muted,padding:'2px 4px',borderRadius:th('2px', { classic: '4px', dark: '4px' }),lineHeight:1}} title="Change status">▾</button>
                    {statusMenu===inv.id&&<div style={{position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:200,background:C.card,border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '10px', dark: '10px' }),boxShadow:'0 6px 20px rgba(0,0,0,0.12)',overflow:'hidden',minWidth:'140px'}}>
                      {INV_STATUSES.map(s=><div key={s} onClick={()=>changeStatus(inv.id,s)} style={{padding:'9px 14px',fontSize:'12px',fontWeight:700,cursor:'pointer',color:statusColor(s),background:inv.status===s?statusBg(s):'transparent',textTransform:'capitalize'}} onMouseEnter={e=>e.currentTarget.style.background=statusBg(s)} onMouseLeave={e=>e.currentTarget.style.background=inv.status===s?statusBg(s):'transparent'}>{s}</div>)}
                    </div>}
                  </div>
                </td>
                <td style={{padding:'13px 20px',borderBottom:i<filteredInv.length-1?`1px solid ${C.border}`:'none'}}>
                  <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                    <button onClick={()=>setModal({type:'editInvoice',data:inv})} style={{padding:'5px 12px',borderRadius:th('2px', { classic: '6px', dark: '6px' }),border:`1px solid ${C.border}`,background:'transparent',color:C.ink,fontSize:'12px',fontWeight:600,cursor:'pointer',transition:'background 0.12s'}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>View</button>
                    <button onClick={()=>setModal({type:'sendInvoice',data:inv})} style={{padding:'5px 12px',borderRadius:th('2px', { classic: '6px', dark: '6px' }),border:`1px solid ${C.blue}22`,background:C.blueL,color:C.blue,fontSize:'12px',fontWeight:600,cursor:'pointer'}}>Send</button>
                    <button onClick={()=>{const dup={...inv,id:Date.now(),status:'draft',issueDate:new Date().toISOString().slice(0,10)};setInvList(prev=>[dup,...prev]);logActivity({title:`Invoice duplicated: ${invId(inv)}`,sub:'New draft created',color:C.blue,icon:'📋',cat:'invoices',linkTab:'Invoices'});}} style={{padding:'5px 10px',borderRadius:th('2px', { classic: '6px', dark: '6px' }),border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:'11px',cursor:'pointer'}} title="Duplicate">⊕</button>
                    {inv.status==='paid'&&<button onClick={()=>logActivity({title:`Receipt downloaded: ${invId(inv)}`,sub:'PDF export',color:C.green,icon:'🧾',cat:'invoices',linkTab:'Invoices'})} style={{padding:'5px 10px',borderRadius:th('2px', { classic: '6px', dark: '6px' }),border:`1px solid ${C.green}22`,background:C.greenL,color:C.green,fontSize:'11px',cursor:'pointer'}} title="Download receipt">⬇</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════
   PAYMENTS TAB
══════════════════════════════════════════════════════ */
function TabPayments({evidences, setEvidences, invList, setInvList, fmt, navTo, logActivity}) {
  const now = new Date();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [recordModal, setRecordModal] = useState(false);
  const [reminderModal, setReminderModal] = useState(null);
  const [invFilter, setInvFilter] = useState('all');
  const [auditLog] = useState(() => {
    return invList.map(inv => ({
      id: Math.random(),
      ts: `${inv.year}-${String(inv.month).padStart(2,'0')}-01`,
      action: inv.status === 'paid' ? 'Payment Received' : 'Invoice Created',
      amount: inv.amount,
      status: inv.status,
      ref: `INV-${String(inv.id||'').slice(0,6).toUpperCase()}`,
    }));
  });

  const paidInv = invList.filter(i => i.status === 'paid');
  const pendingInv = invList.filter(i => i.status === 'pending' || i.status === 'sent');
  const overdueInv = invList.filter(i => i.status === 'overdue');
  const cancelledInv = invList.filter(i => i.status === 'cancelled');

  const totalBilled = invList.reduce((s, i) => s + i.amount, 0);
  const totalPaid = paidInv.reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = pendingInv.reduce((s, i) => s + i.amount, 0);
  const totalOverdue = overdueInv.reduce((s, i) => s + i.amount, 0);

  const nextDue = [...pendingInv].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)[0];
  const nextDueAmt = nextDue ? fmt(nextDue.amount) : '—';

  function daysOverdue(inv) {
    const dueDate = new Date(inv.year, (inv.month || 1) - 1, 28);
    return Math.max(0, Math.floor((now - dueDate) / 86400000));
  }
  const overdueColor = days => days >= 90 ? C.red : days >= 60 ? C.orange : C.yellow;
  const overdueLabel = days => days >= 90 ? '90+ Days' : days >= 60 ? '60+ Days' : '30+ Days';

  const filterTabs = ['all','paid','pending','overdue','cancelled'];
  const filteredInv = invFilter === 'all' ? invList : invList.filter(i => {
    if (invFilter === 'pending') return i.status === 'pending' || i.status === 'sent';
    return i.status === invFilter;
  });

  const markPaid = (inv) => {
    setInvList(prev => prev.map(i => i.id === inv.id ? {...i, status:'paid'} : i));
    logActivity({title:'Invoice Marked Paid',sub:`INV-${String(inv.id||'').slice(0,6).toUpperCase()} marked as paid`,color:C.green,icon:'✅',cat:'Payments'});
  };

  const sendReminder = (inv) => {
    logActivity({title:'Payment Reminder Sent',sub:`Reminder sent for INV-${String(inv.id||'').slice(0,6).toUpperCase()}`,color:C.orange,icon:'📧',cat:'Payments'});
    setReminderModal(null);
  };

  const thSt = {textAlign:'left',padding:'8px 10px',color:C.muted,fontWeight:600,fontSize:11,borderBottom:`2px solid ${C.border}`};
  const tdSt = {padding:'10px 10px',fontSize:13,borderBottom:`1px solid ${C.border}`,verticalAlign:'middle'};

  // Alerts
  const alerts = [];
  overdueInv.forEach(inv => alerts.push({type:'overdue',icon:'⚠️',color:C.red,bg:C.redL||th('#fef2f2', { dark: '#3A1418' }),title:'Payment Overdue',amount:fmt(inv.amount),date:`${MONTHS[inv.month-1]||''} ${inv.year}`,inv}));
  pendingInv.forEach(inv => {
    const dueDate = new Date(inv.year, (inv.month||1)-1, 28);
    const days = Math.floor((dueDate - now) / 86400000);
    if (days >= 0 && days <= 7) alerts.push({type:'due7',icon:'🔔',color:C.orange,bg:C.orangeL||th('#fff7ed', { dark: '#3A1F0A' }),title:'Payment Due in 7 Days',amount:fmt(inv.amount),date:`${MONTHS[inv.month-1]||''} ${inv.year}`,inv});
    else if (days > 7 && days <= 30) alerts.push({type:'due30',icon:'📅',color:C.yellow,bg:C.yellowL||th('#fefce8', { dark: '#3A2A0A' }),title:'Payment Due in 30 Days',amount:fmt(inv.amount),date:`${MONTHS[inv.month-1]||''} ${inv.year}`,inv});
  });
  paidInv.filter(i => i.month === now.getMonth()+1 && i.year === now.getFullYear()).forEach(inv => alerts.push({type:'paid',icon:'✅',color:C.green,bg:C.greenL||th('#f0fdf4', { dark: '#0B2E24' }),title:'Payment Received',amount:fmt(inv.amount),date:`${MONTHS[inv.month-1]||''} ${inv.year}`,inv}));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0}}>
      {/* Section 1: KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:16,marginBottom:24}}>
        {[
          {label:'Total Billed',val:fmt(totalBilled),color:C.purple,icon:'💰'},
          {label:'Total Paid',val:fmt(totalPaid),color:C.green,icon:'✅'},
          {label:'Outstanding',val:fmt(totalOutstanding),color:C.blue,icon:'📋'},
          {label:'Overdue',val:fmt(totalOverdue),color:C.red,icon:'⚠️'},
          {label:'Next Due',val:nextDueAmt,color:C.orange,icon:'📅'},
        ].map(k=>(
          <div key={k.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:th(2, { classic: 12, dark: 12 }),padding:'18px 16px',borderTop:`3px solid ${k.color}`}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:700,color:k.color}}>{k.icon} {k.val}</div>
          </div>
        ))}
      </div>

      {/* Section 2: Invoice Management Table */}
      <Card style={{padding:20,marginBottom:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <SectionTitle>Invoice Management</SectionTitle>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={()=>logActivity({title:'Invoice Generated',sub:'New invoice generated',color:C.purple,icon:'📄',cat:'Payments'})} style={{background:C.purple,color:'#fff',border:'none',fontSize:13}}>Generate Invoice</Btn>
            <Btn onClick={()=>logActivity({title:'Invoices Exported',sub:'Invoice list exported',color:C.blue,icon:'📊',cat:'Payments'})} style={{background:'transparent',color:C.blue,border:`1px solid ${C.blue}`,fontSize:13}}>Export</Btn>
          </div>
        </div>
        {/* Filter tabs */}
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {filterTabs.map(f=>(
            <button key={f} onClick={()=>setInvFilter(f)} style={{padding:'5px 14px',borderRadius:th(2, { classic: 20, dark: 20 }),border:`1px solid ${invFilter===f?C.purple:C.border}`,background:invFilter===f?C.purple:'transparent',color:invFilter===f?'#fff':C.muted,fontSize:12,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{f}</button>
          ))}
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr>
                <th style={thSt}>Invoice #</th>
                <th style={thSt}>Invoice Date</th>
                <th style={thSt}>Due Date</th>
                <th style={thSt}>Amount</th>
                <th style={thSt}>Status</th>
                <th style={thSt}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInv.length === 0 ? (
                <tr><td colSpan={6} style={{...tdSt,textAlign:'center',color:C.muted,padding:32}}>No invoices found</td></tr>
              ) : filteredInv.map(inv => {
                const invRef = `INV-${String(inv.id||'').slice(0,6).toUpperCase()}`;
                const invDate = `${MONTHS[inv.month-1]||''} ${inv.year}`;
                const dueDate = new Date(inv.year, (inv.month||1)-1, 28);
                const dueDateStr = fmtDate(dueDate.toISOString());
                return (
                  <tr key={inv.id} style={{transition:'background 0.15s'}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...tdSt,fontWeight:600,color:C.purple}}>{invRef}</td>
                    <td style={tdSt}>{invDate}</td>
                    <td style={tdSt}>{dueDateStr}</td>
                    <td style={{...tdSt,fontWeight:600}}>{fmt(inv.amount)}</td>
                    <td style={tdSt}><StatusPill status={inv.status}/></td>
                    <td style={tdSt}>
                      <div style={{display:'flex',gap:6}}>
                        <button style={{padding:'4px 10px',borderRadius:th(2, { classic: 6, dark: 6 }),border:`1px solid ${C.border}`,background:'transparent',color:C.ink,fontSize:11,cursor:'pointer'}}>View</button>
                        {(inv.status==='pending'||inv.status==='sent'||inv.status==='overdue') && (
                          <button onClick={()=>setReminderModal(inv)} style={{padding:'4px 10px',borderRadius:th(2, { classic: 6, dark: 6 }),border:`1px solid ${C.orange}`,background:'transparent',color:C.orange,fontSize:11,cursor:'pointer'}}>Send Reminder</button>
                        )}
                        {inv.status!=='paid' && inv.status!=='cancelled' && (
                          <button onClick={()=>markPaid(inv)} style={{padding:'4px 10px',borderRadius:th(2, { classic: 6, dark: 6 }),border:`1px solid ${C.green}`,background:C.greenL||th('#f0fdf4', { dark: '#0B2E24' }),color:C.green,fontSize:11,cursor:'pointer',fontWeight:600}}>Mark Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 3: Two columns */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        {/* Payment History */}
        <Card style={{padding:20}}>
          <SectionTitle style={{marginBottom:16}}>Payment History</SectionTitle>
          {paidInv.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px 0',color:C.muted}}>
              <div style={{fontSize:32,marginBottom:8}}>💳</div>
              <div style={{fontSize:13}}>No payments recorded yet</div>
            </div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>
                  {['Payment Date','Amount','Method','Ref #','Status'].map(h=>(
                    <th key={h} style={{...thSt,fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidInv.map(inv=>(
                  <tr key={inv.id}>
                    <td style={tdSt}>{MONTHS[inv.month-1]||''} {inv.year}</td>
                    <td style={{...tdSt,fontWeight:600,color:C.green}}>{fmt(inv.amount)}</td>
                    <td style={tdSt}>{inv.paymentMethod||'Bank Transfer'}</td>
                    <td style={{...tdSt,color:C.muted,fontFamily:'monospace'}}>INV-{String(inv.id||'').slice(0,6).toUpperCase()}</td>
                    <td style={tdSt}><StatusPill status={inv.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Outstanding Payments */}
        <Card style={{padding:20}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <SectionTitle>Outstanding Payments</SectionTitle>
            {overdueInv.length > 0 && <span style={{background:C.red,color:'#fff',borderRadius:th(2, { classic: 20, dark: 20 }),padding:'2px 8px',fontSize:11,fontWeight:700}}>{overdueInv.length}</span>}
          </div>
          {overdueInv.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px 0',color:C.muted}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:13}}>No overdue payments</div>
            </div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>
                  {['Invoice #','Amount Due','Days Overdue','Urgency'].map(h=>(
                    <th key={h} style={{...thSt,fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdueInv.map(inv=>{
                  const days = daysOverdue(inv);
                  const color = overdueColor(days);
                  const label = overdueLabel(days);
                  return (
                    <tr key={inv.id}>
                      <td style={{...tdSt,fontWeight:600,color:C.purple}}>INV-{String(inv.id||'').slice(0,6).toUpperCase()}</td>
                      <td style={{...tdSt,fontWeight:600,color:C.red}}>{fmt(inv.amount)}</td>
                      <td style={tdSt}>{days} days</td>
                      <td style={tdSt}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4,background:color==='#ef4444'?'#fef2f2':color==='#f97316'?'#fff7ed':'#fefce8',color:color,padding:'3px 8px',borderRadius:th(2, { classic: 20, dark: 20 }),fontSize:11,fontWeight:600}}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Section 4: Automated Notifications */}
      <Card style={{padding:20,marginBottom:24}}>
        <SectionTitle style={{marginBottom:16}}>Payment Alerts & Notifications</SectionTitle>
        {alerts.length === 0 ? (
          <div style={{textAlign:'center',padding:'24px 0',color:C.green,fontSize:14,fontWeight:600}}>✓ All payments are on track</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {alerts.map((a,idx)=>(
              <div key={idx} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:th(2, { classic: 10, dark: 10 }),background:a.bg,border:`1px solid ${a.color}22`}}>
                <span style={{fontSize:20}}>{a.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:a.color}}>{a.title}</div>
                  <div style={{fontSize:11,color:C.muted}}>{a.date} · {a.amount}</div>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:a.color}}>{a.amount}</span>
                {(a.type==='overdue'||a.type==='due7') && (
                  <button onClick={()=>sendReminder(a.inv)} style={{padding:'5px 12px',borderRadius:th(2, { classic: 6, dark: 6 }),border:`1px solid ${a.color}`,background:'transparent',color:a.color,fontSize:12,fontWeight:600,cursor:'pointer'}}>Send Reminder</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 5: Payment Evidence */}
      <Card style={{padding:20,marginBottom:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <SectionTitle>Payment Evidence</SectionTitle>
          <Btn onClick={()=>fileRef.current?.click()} style={{background:C.purple,color:'#fff',border:'none',fontSize:13}}>+ Upload Evidence</Btn>
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={e=>{
          const f=e.target.files[0]; if(!f) return;
          const url=URL.createObjectURL(f);
          setEvidences(prev=>[...prev,{id:Date.now(),name:f.name,url,type:f.type}]);
          logActivity({title:'Payment Evidence Uploaded',sub:f.name,color:C.green,icon:'📎',cat:'Payments'});
          e.target.value='';
        }}/>
        {evidences.length===0 ? (
          <div style={{border:`2px dashed ${C.border}`,borderRadius:th(2, { classic: 10, dark: 10 }),padding:'32px 0',textAlign:'center',color:C.muted}}>
            <div style={{fontSize:28,marginBottom:8}}>📎</div>
            <div style={{fontSize:13}}>No evidence uploaded yet. Click "Upload Evidence" to add files.</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
            {evidences.map(ev=>(
              <div key={ev.id} style={{border:`1px solid ${C.border}`,borderRadius:th(2, { classic: 8, dark: 8 }),overflow:'hidden',cursor:'pointer'}} onClick={()=>setPreview(ev)}>
                {ev.type?.startsWith('image') ? (
                  <img src={ev.url} alt={ev.name} style={{width:'100%',height:100,objectFit:'cover'}}/>
                ) : (
                  <div style={{width:'100%',height:100,background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>📄</div>
                )}
                <div style={{padding:'6px 8px',fontSize:11,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.name}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 6: Audit Trail */}
      <Card style={{padding:20,marginBottom:8}}>
        <SectionTitle style={{marginBottom:16}}>Audit Trail</SectionTitle>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr>
              {['Date','Action','Reference','Amount','Status'].map(h=>(
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditLog.length === 0 ? (
              <tr><td colSpan={5} style={{...tdSt,textAlign:'center',color:C.muted,padding:24}}>No audit entries</td></tr>
            ) : auditLog.map(entry=>(
              <tr key={entry.id}>
                <td style={tdSt}>{entry.ts}</td>
                <td style={{...tdSt,fontWeight:500}}>{entry.action}</td>
                <td style={{...tdSt,fontFamily:'monospace',color:C.muted}}>{entry.ref}</td>
                <td style={{...tdSt,fontWeight:600,color:entry.status==='paid'?C.green:C.ink}}>{fmt(entry.amount)}</td>
                <td style={tdSt}><StatusPill status={entry.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Preview Modal */}
      {preview && (
        <Modal onClose={()=>setPreview(null)} title={preview.name}>
          <div style={{textAlign:'center'}}>
            {preview.type?.startsWith('image') ? (
              <img src={preview.url} alt={preview.name} style={{maxWidth:'100%',maxHeight:500,borderRadius:th(2, { classic: 8, dark: 8 })}}/>
            ) : (
              <iframe src={preview.url} title={preview.name} style={{width:'100%',height:500,border:'none'}}/>
            )}
          </div>
        </Modal>
      )}

      {/* Reminder Modal */}
      {reminderModal && (
        <Modal onClose={()=>setReminderModal(null)} title="Send Payment Reminder">
          <div style={{padding:'0 0 16px'}}>
            <p style={{color:C.ink,fontSize:14,marginBottom:16}}>Send a payment reminder for invoice <strong>INV-{String(reminderModal.id||'').slice(0,6).toUpperCase()}</strong> ({fmt(reminderModal.amount)})?</p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <Btn onClick={()=>setReminderModal(null)} style={{background:'transparent',color:C.muted,border:`1px solid ${C.border}`}}>Cancel</Btn>
              <Btn onClick={()=>sendReminder(reminderModal)} style={{background:C.orange,color:'#fff',border:'none'}}>Send Reminder</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   COMMUNICATIONS TAB
══════════════════════════════════════════════════════ */
function TabCommunications({commsLog,setCommsLog,setModal,client,invList,logActivity}){
  const channelIcon={Email:'📧',WhatsApp:'💬',SMS:'📱','Secure Link':'🔗'};

  function quickSend(type){
    setModal({type:'sendComm',data:{commType:type,channel:'Email'}});
  }

  return <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
      <div>
        <div style={{fontSize:'18px',fontWeight:800,color:C.ink}}>Communication Center</div>
        <div style={{fontSize:'13px',color:C.muted,marginTop:'2px'}}>Track every communication with this client</div>
      </div>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
        {['Invoice','Reminder','Payment Request','Statement','Contract'].map(t=>(
          <Btn key={t} size="sm" variant="secondary" onClick={()=>quickSend(t)}>Send {t}</Btn>
        ))}
      </div>
    </div>

    {commsLog.length===0
      ?<Card style={{textAlign:'center',padding:'50px'}}>
          <div style={{fontSize:'40px',marginBottom:'12px',opacity:0.4}}>📧</div>
          <div style={{fontSize:'15px',fontWeight:700,color:C.ink,marginBottom:'6px'}}>No Communications Yet</div>
          <div style={{fontSize:'13px',color:C.muted}}>All sent invoices, reminders, and messages will appear here.</div>
        </Card>
      :<Card style={{padding:0}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:C.bg}}>{['Date','Type','Channel','Recipient','Status','Actions'].map(h=><th key={h} style={{padding:'10px 20px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',color:C.muted,textAlign:'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>
              {commsLog.map((c,i)=>(
                <tr key={c.id} style={{borderBottom:i<commsLog.length-1?`1px solid ${C.border}`:'none'}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'11px 20px',fontSize:'12px',color:C.muted}}>{fmtTS(c.ts)}</td>
                  <td style={{padding:'11px 20px',fontSize:'13px',fontWeight:600,color:C.ink}}>{c.type}</td>
                  <td style={{padding:'11px 20px',fontSize:'13px',color:C.mid}}>{channelIcon[c.channel]||'📤'} {c.channel}</td>
                  <td style={{padding:'11px 20px',fontSize:'12px',color:C.mid}}>{c.recipient||'—'}</td>
                  <td style={{padding:'11px 20px'}}><Chip label={c.status||'sent'} color={C.green}/></td>
                  <td style={{padding:'11px 20px'}}><Btn size="sm" variant="ghost" onClick={()=>setModal({type:'sendComm',data:{...c,commType:c.type}})}>Resend</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
    }
  </div>;
}

/* ══════════════════════════════════════════════════════
   USERS TAB
══════════════════════════════════════════════════════ */
function TabUsers({localClient,setLocalClient,mrr,fmt,navTo,setModal,logActivity}){
  const users=localClient.users||{};
  const [localUsers,setLocalUsers]=useState(localClient._userList||[]);

  function removeUser(id){
    const u=localUsers.find(x=>x.id===id);
    setLocalUsers(prev=>prev.filter(x=>x.id!==id));
    logActivity({title:`User removed: ${u?.name||'User'}`,sub:`Role: ${u?.role||'—'}`,color:C.red,icon:'👤',cat:'users',linkTab:'Users'});
  }

  return <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px'}}>
      <KpiCard icon="👥" label="Total"     value={users.total||0}                          sub="all user types"   accent={C.purple} onClick={()=>navTo('Billing')} badge="Billing →"/>
      <KpiCard icon="✅" label="Active"    value={(users.internal||0)+(users.vciso||0)}    sub="internal + vCISO" accent={C.green}/>
      <KpiCard icon="🌐" label="External"  value={users.external||0}                       sub="client-side"      accent={C.blue}/>
      <KpiCard icon="🎯" label="Directors" value={users.directors||0}                      sub="board level"      accent={C.orange}/>
    </div>

    <Card>
      <SectionTitle action={<Btn size="sm" onClick={()=>setModal({type:'addUser',data:{},setLocalUsers,logActivity})}>+ Add User</Btn>}>User Distribution</SectionTitle>
      <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'16px'}}>
        {[{l:'Internal',v:users.internal||0,color:C.purple},{l:'External',v:users.external||0,color:C.blue},{l:'Partner',v:users.partner||0,color:C.teal},{l:'vCISO',v:users.vciso||0,color:C.orange},{l:'Directors',v:users.directors||0,color:C.green}].map(r=>{
          const pct=(users.total||0)>0?Math.round(r.v/(users.total)*100):0;
          return <div key={r.l} style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'90px',fontSize:'13px',fontWeight:600,color:C.mid,flexShrink:0}}>{r.l}</div>
            <div style={{flex:1,height:'8px',background:th('#f1f5f9', { dark: '#172033' }),borderRadius:'99px',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:r.color,borderRadius:'99px'}}/></div>
            <div style={{width:'30px',fontSize:'13px',fontWeight:700,color:C.ink,textAlign:'right'}}>{r.v}</div>
            <div style={{width:'32px',fontSize:'11px',color:C.muted,textAlign:'right'}}>{pct}%</div>
          </div>;
        })}
      </div>
      {(users.total||0)>0&&mrr>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',paddingTop:'14px',borderTop:`1px solid ${C.border}`}}>
          {[['Cost/User/Mo',fmt(mrr/(users.total||1)),C.purple],['Cost/User/Yr',fmt(mrr*12/(users.total||1)),C.teal],['Avg Revenue/User',fmt(mrr/(users.total||1)),C.blue]].map(([l,v,col])=>(
            <div key={l} style={{background:C.bg,borderRadius:th('2px', { classic: '10px', dark: '10px' }),padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:'17px',fontWeight:800,color:col}}>{v}</div>
              <div style={{fontSize:'10px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginTop:'3px'}}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </Card>

    {localUsers.length>0&&(
      <Card style={{padding:0}}>
        <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:'14px',fontWeight:700,color:C.ink}}>User List</div>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:C.bg}}>{['Name','Email','Role','Type','Status','Actions'].map(h=><th key={h} style={{padding:'10px 20px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',color:C.muted,textAlign:'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
          <tbody>
            {localUsers.map((u,i)=>(
              <tr key={u.id} style={{borderBottom:i<localUsers.length-1?`1px solid ${C.border}`:'none'}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'11px 20px',fontSize:'13px',fontWeight:700,color:C.ink}}>{u.name}</td>
                <td style={{padding:'11px 20px',fontSize:'12px',color:C.muted}}>{u.email||'—'}</td>
                <td style={{padding:'11px 20px',fontSize:'12px',color:C.mid}}>{u.role||'—'}</td>
                <td style={{padding:'11px 20px'}}><Chip label={u.type||'internal'} color={C.purple}/></td>
                <td style={{padding:'11px 20px'}}><StatusPill status={u.status||'active'}/></td>
                <td style={{padding:'11px 20px'}}>
                  <div style={{display:'flex',gap:'5px'}}>
                    <Btn size="sm" variant="secondary" onClick={()=>setModal({type:'editUser',data:u,setLocalUsers,logActivity})}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={()=>removeUser(u.id)}>Remove</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )}

    <Card><div style={{fontSize:'13px',color:C.muted,display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'18px'}}>ℹ️</span>User counts sync from the Admin Portal in real-time. <LinkBtn onClick={()=>navTo('Activity')}>View activity log →</LinkBtn></div></Card>
  </div>;
}

/* ══════════════════════════════════════════════════════
   REPORTS TAB
══════════════════════════════════════════════════════ */
function TabReports({mrr,invList,localClient,fmt,navTo,logActivity}){
  const [generated,setGenerated]=useState({});
  const users=localClient.users||{};

  function generate(name){
    setGenerated(prev=>({...prev,[name]:new Date().toISOString()}));
    logActivity({title:`Report generated: ${name}`,sub:'Available for download',color:C.teal,icon:'📊',cat:'system',linkTab:'Reports'});
  }

  const reports=[
    {title:'Revenue Report',icon:'💰',desc:'Monthly and annual revenue with trend analysis',link:'Revenue'},
    {title:'Billing Report',icon:'🧾',desc:'Complete billing items and subscription summary',link:'Billing'},
    {title:'Invoice Report',icon:'📄',desc:'Invoice history with payment status breakdown',link:'Invoices'},
    {title:'Collection Report',icon:'💳',desc:'Outstanding balances and collection tracking',link:'Invoices'},
    {title:'User Activity Report',icon:'👥',desc:'User distribution, roles, and engagement',link:'Users'},
    {title:'Client Performance',icon:'📊',desc:'Overall account health and performance KPIs',link:'Overview'},
  ];

  return <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
    <div style={{display:'flex',justifyContent:'flex-end'}}>
      <Btn onClick={()=>reports.forEach(r=>generate(r.title))}>Export All Reports</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
      {reports.map(r=>(
        <Card key={r.title}>
          <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
            <div style={{width:'44px',height:'44px',borderRadius:th('2px', { classic: '12px', dark: '12px' }),background:C.purpleL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>{r.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:'14px',fontWeight:700,color:C.ink,marginBottom:'4px'}}>{r.title}</div>
              <div style={{fontSize:'12px',color:C.muted,marginBottom:'8px'}}>{r.desc}</div>
              {generated[r.title]&&<div style={{fontSize:'10px',color:C.green,fontWeight:700,marginBottom:'8px'}}>✓ Generated {fmtTS(generated[r.title])}</div>}
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                <Btn size="sm" onClick={()=>generate(r.title)}>Generate</Btn>
                {generated[r.title]&&<>
                  <Btn size="sm" variant="secondary">Download PDF</Btn>
                  <Btn size="sm" variant="secondary">Export Excel</Btn>
                </>}
                <Btn size="sm" variant="ghost" onClick={()=>navTo(r.link)}>View {r.link} →</Btn>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════
   ACTIVITY TAB
══════════════════════════════════════════════════════ */
function TabActivity({actLog,navTo,fmt}){
  const [filter,setFilter]=useState('all');
  const cats=['all','invoices','billing','users','evidence','communications','system'];
  const filtered=filter==='all'?actLog:actLog.filter(a=>a.cat===filter);

  return <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
      {cats.map(k=>(
        <button key={k} onClick={()=>setFilter(k)} style={{padding:'6px 14px',borderRadius:th('2px', { classic: '20px', dark: '20px' }),fontSize:'12px',fontWeight:700,cursor:'pointer',background:filter===k?C.purple:C.bg,color:filter===k?'white':C.mid,border:`1px solid ${filter===k?C.purple:C.border}`}}>{k==='all'?'All':k.charAt(0).toUpperCase()+k.slice(1)}</button>
      ))}
      <span style={{marginLeft:'auto',fontSize:'12px',color:C.muted,fontWeight:600}}>{filtered.length} events</span>
    </div>

    <Card style={{padding:'0 24px'}}>
      {filtered.length===0
        ?<div style={{padding:'40px',textAlign:'center',color:C.muted}}>No activity in this category.</div>
        :filtered.map((a,i)=>(
          <div key={a.id} onClick={a.linkTab?()=>navTo(a.linkTab):undefined}
            style={{display:'flex',gap:'16px',padding:'16px 0',borderBottom:i<filtered.length-1?`1px solid ${C.border}`:'none',alignItems:'flex-start',cursor:a.linkTab?'pointer':'default'}}
            onMouseEnter={e=>{if(a.linkTab)e.currentTarget.style.background=C.bg;}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
              <div style={{width:'10px',height:'10px',borderRadius:'50%',background:a.color,boxShadow:`0 0 0 3px ${a.color}25`,marginTop:'4px'}}/>
              {i<filtered.length-1&&<div style={{width:'1px',flex:1,background:C.border,minHeight:'20px',marginTop:'6px'}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                <span style={{fontSize:'13px',fontWeight:700,color:C.ink}}>{a.icon} {a.title}</span>
                {a.amount>0&&<span style={{fontSize:'13px',fontWeight:700,color:C.purple}}>{fmt(a.amount)}</span>}
              </div>
              <div style={{fontSize:'11px',color:C.muted,marginTop:'2px'}}>{a.sub}</div>
            </div>
            <div style={{display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
              <span style={{fontSize:'10px',color:C.muted,whiteSpace:'nowrap'}}>{fmtTS(a.ts)}</span>
              <Chip label={a.cat} color={a.color} bg={a.color+'15'}/>
              {a.linkTab&&<span style={{fontSize:'10px',color:C.muted}}>→ {a.linkTab}</span>}
            </div>
          </div>
        ))
      }
    </Card>
    <div style={{textAlign:'center',fontSize:'11px',color:C.muted,padding:'8px'}}>
      🔒 Activity log is immutable and timestamped. All entries are permanent audit records.
    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════════════ */
function BillingItemModal({data,onSave,onClose}){
  const [form,setForm]=useState({name:'',desc:'',qty:1,unitPrice:0,freq:'monthly',...data});
  const f=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  return <Modal title={data.id?'Edit Billing Item':'Add Billing Item'} onClose={onClose}>
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Item Name</div><Input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. User Licenses"/></div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Description</div><Input value={form.desc} onChange={e=>f('desc',e.target.value)} placeholder="Brief description"/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Quantity</div><Input value={form.qty} onChange={e=>f('qty',Number(e.target.value))} type="number"/></div>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Unit Price (USD)</div><Input value={form.unitPrice} onChange={e=>f('unitPrice',Number(e.target.value))} type="number"/></div>
      </div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Frequency</div>
        <Select value={form.freq} onChange={e=>f('freq',e.target.value)}>
          <option value="monthly">Monthly</option><option value="annual">Annual</option><option value="one-time">One-Time</option>
        </Select>
      </div>
      <div style={{background:C.purpleL,borderRadius:th('2px', { classic: '10px', dark: '10px' }),padding:'12px 16px',fontSize:'13px',color:C.purple,fontWeight:700}}>
        Monthly impact: ${((form.qty||0)*(form.unitPrice||0)*(form.freq==='annual'?1/12:form.freq==='one-time'?0:1)).toFixed(2)}
      </div>
      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px',borderTop:`1px solid ${C.border}`}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave({...form,id:data.id||Date.now()})}>Save Item</Btn>
      </div>
    </div>
  </Modal>;
}

function InvoiceFormModal({data,onSave,onClose,title='Create Invoice',defaultAmount=0}){
  const now=new Date();
  const defaultDue=new Date(now.getTime()+30*24*60*60*1000).toISOString().slice(0,10);
  const [form,setForm]=useState({year:now.getFullYear(),month:now.getMonth()+1,issueDate:now.toISOString().slice(0,10),dueDate:defaultDue,amount:defaultAmount||0,tax:0,notes:'',status:'draft',...data});
  const f=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  return <Modal title={title} onClose={onClose}>
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Year</div><Input value={form.year} onChange={e=>f('year',Number(e.target.value))} type="number"/></div>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Month</div>
          <Select value={form.month} onChange={e=>f('month',Number(e.target.value))}>
            {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
          </Select>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Issue Date</div><Input value={form.issueDate} onChange={e=>f('issueDate',e.target.value)} type="date"/></div>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Due Date</div><Input value={form.dueDate} onChange={e=>f('dueDate',e.target.value)} type="date"/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Amount (USD)</div><Input value={form.amount} onChange={e=>f('amount',Number(e.target.value))} type="number"/></div>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Tax %</div><Input value={form.tax} onChange={e=>f('tax',Number(e.target.value))} type="number"/></div>
      </div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Status</div>
        <Select value={form.status} onChange={e=>f('status',e.target.value)}>
          {INV_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Notes</div><TextArea value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Invoice notes…"/></div>
      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px',borderTop:`1px solid ${C.border}`}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form)}>Save Invoice</Btn>
      </div>
    </div>
  </Modal>;
}

function SendModal({data,onSend,onClose,client={}}){
  const billing=client.billing||{};
  const defaultEmail=billing.billingEmail||client.billingEmail||client.email||'';
  const defaultPhone=billing.phone||client.phone||client.contactPhone||'';
  const clientName=billing.companyName||client.companyName||client.name||'Client';
  const defaultMsg=`Dear ${clientName},\n\nPlease find attached your ${data.commType||'invoice'}.\n\nKind regards`;
  const [form,setForm]=useState({channel:'Email',commType:data.commType||'Invoice',...data,recipient:data.recipient||defaultEmail,message:data.message||defaultMsg});
  const f=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  return <Modal title={`Send ${form.commType}`} onClose={onClose}>
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Channel</div>
        <div style={{display:'flex',gap:'8px'}}>
          {['Email','WhatsApp','SMS','Secure Link'].map(ch=>(
            <button key={ch} onClick={()=>{
              const newRecipient=ch==='Email'?defaultEmail:ch==='WhatsApp'||ch==='SMS'?defaultPhone:'';
              setForm(prev=>({...prev,channel:ch,recipient:prev.recipient||newRecipient}));
            }} style={{flex:1,padding:'9px 6px',fontSize:'12px',fontWeight:700,borderRadius:th('2px', { classic: '8px', dark: '8px' }),cursor:'pointer',border:`1px solid ${form.channel===ch?C.purple:C.border}`,background:form.channel===ch?C.purple:th('white', { dark: '#1E293B' }),color:form.channel===ch?'white':C.muted}}>
              {ch==='Email'?'📧':ch==='WhatsApp'?'💬':ch==='SMS'?'📱':'🔗'} {ch}
            </button>
          ))}
        </div>
      </div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Recipient</div><Input value={form.recipient} onChange={e=>f('recipient',e.target.value)} placeholder={form.channel==='Email'?'email@example.com':form.channel==='WhatsApp'||form.channel==='SMS'?'+1234567890':'Auto-generated'}/></div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Message</div><TextArea value={form.message} onChange={e=>f('message',e.target.value)} rows={4}/></div>
      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px',borderTop:`1px solid ${C.border}`}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSend(form)}>Send {form.commType}</Btn>
      </div>
    </div>
  </Modal>;
}

function UserFormModal({data,onSave,onClose}){
  const [form,setForm]=useState({name:'',email:'',role:'',type:'internal',status:'active',...data});
  const f=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  return <Modal title={data.id?'Edit User':'Add User'} onClose={onClose}>
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Full Name</div><Input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="John Doe"/></div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Email</div><Input value={form.email} onChange={e=>f('email',e.target.value)} placeholder="john@company.com" type="email"/></div>
      <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Role</div><Input value={form.role} onChange={e=>f('role',e.target.value)} placeholder="e.g. Admin, Analyst"/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Type</div>
          <Select value={form.type} onChange={e=>f('type',e.target.value)}>
            {['internal','external','partner','vciso','director'].map(t=><option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div><div style={{fontSize:'12px',fontWeight:700,color:C.muted,marginBottom:'5px'}}>Status</div>
          <Select value={form.status} onChange={e=>f('status',e.target.value)}>
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
          </Select>
        </div>
      </div>
      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px',borderTop:`1px solid ${C.border}`}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave({...form,id:data.id||Date.now()})}>Save User</Btn>
      </div>
    </div>
  </Modal>;
}

/* ══════════════════════════════════════════════════════
   CLIENT WORKSPACE
══════════════════════════════════════════════════════ */
function ClientWorkspace({client,onBack}){
  const {fmt}=useCurrency();
  const [searchParams,setSearchParams]=useSearchParams();

  /* Tab state synced with URL ?tab= so browser back/forward works */
  const urlTab=searchParams.get('tab');
  const activeTab=TABS.includes(urlTab)?urlTab:'Overview';

  const navTo=useCallback(t=>{
    setSearchParams(prev=>{const n=new URLSearchParams(prev);n.set('tab',t);return n;},{replace:false});
  },[setSearchParams]);

  /* back button: pop to clients list and clean URL */
  function handleBack(){
    setSearchParams({},{replace:true});
    onBack();
  }

  /* core state — auto-seed billing from client profile if billing is empty */
  const [localClient,setLocalClient]=useState(()=>{
    const c={...client};
    const b=c.billing||{};
    c.billing={
      companyName:   b.companyName   || c.companyName || c.name || '',
      contactPerson: b.contactPerson || c.contactPerson || c.primaryContact || '',
      billingEmail:  b.billingEmail  || c.billingEmail || c.email || '',
      phone:         b.phone         || c.phone || c.contactPhone || '',
      address:       b.address       || c.address || '',
      country:       b.country       || c.country || '',
      state:         b.state         || c.state   || '',
      city:          b.city          || c.city    || '',
      pincode:       b.pincode       || c.postalCode || c.pincode || '',
      gstNumber:     b.gstNumber     || c.gstNumber || '',
      panNumber:     b.panNumber     || c.panNumber || '',
      paymentMethod: b.paymentMethod || c.paymentMethod || '',
      billingCycle:  b.billingCycle  || c.billingCycle  || '',
      preferredCurrency: b.preferredCurrency || c.preferredCurrency || '',
    };
    return c;
  });
  const [isDirty,setDirty]=useState(false);
  const [saveFlash,setSaveFlash]=useState(false);
  const [invList,setInvList]=useState(()=>[...(client.invoices||[])].map((inv,i)=>({...inv,id:inv.id||Date.now()+i})).sort((a,b)=>b.year!==a.year?b.year-a.year:b.month-a.month));
  const [billingItems,setBillingItems]=useState([]);
  const [evidences,setEvidences]=useState([]);
  const [commsLog,setCommsLog]=useState([]);
  const [modal,setModal]=useState(null);
  const [openDD,setOpenDD]=useState(null); // 'send'|'export'|'more'
  const [actLog,setActLog]=useState(()=>{
    const items=[];
    const invs=[...(client.invoices||[])].sort((a,b)=>b.year!==a.year?b.year-a.year:b.month-a.month);
    invs.forEach(inv=>{
      const iid=`INV-${String(client.id).slice(0,6).toUpperCase()}-${inv.year}-${String(inv.month).padStart(2,'0')}`;
      const d=`${inv.year}-${String(inv.month).padStart(2,'0')}-01`;
      items.push(inv.status==='paid'?{id:Math.random(),ts:d,title:`Invoice ${iid} Paid`,sub:`${MONTHS[inv.month-1]} ${inv.year}`,amount:inv.amount,color:C.green,icon:'✅',cat:'invoices',linkTab:'Invoices'}:inv.status==='overdue'?{id:Math.random(),ts:d,title:`Invoice ${iid} Overdue`,sub:'Action required',amount:inv.amount,color:C.red,icon:'🔴',cat:'invoices',linkTab:'Invoices'}:{id:Math.random(),ts:d,title:`Invoice ${iid} Pending`,sub:`${MONTHS[inv.month-1]} ${inv.year}`,amount:inv.amount,color:C.yellow,icon:'🟡',cat:'invoices',linkTab:'Invoices'});
    });
    (client.frameworks||[]).forEach(f=>items.push({id:Math.random(),ts:'',title:`Framework Added: ${f.name||f}`,sub:'Compliance module',color:C.purple,icon:'🛡️',cat:'system',linkTab:'Billing'}));
    (client.integrations||[]).forEach(it=>items.push({id:Math.random(),ts:'',title:`Integration Connected: ${it.name||it}`,sub:'Integration module',color:C.teal,icon:'🔗',cat:'system',linkTab:'Billing'}));
    items.push({id:Math.random(),ts:'',title:'Client Account Created',sub:'Onboarding initiated',color:C.green,icon:'🎉',cat:'system',linkTab:null});
    return items.sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
  });

  const logActivity=useCallback((entry)=>logAct(setActLog,entry),[]);

  /* computed */
  const costs=localClient.costs||{};
  const mrr=costs.grandTotal||0;
  const customMRR=useMemo(()=>billingItems.reduce((s,b)=>s+(b.qty||1)*(b.unitPrice||0)*(b.freq==='annual'?1/12:b.freq==='one-time'?0:1),0),[billingItems]);
  const totalMRR=mrr+customMRR;
  const outAmt=useMemo(()=>invList.filter(i=>i.status!=='paid'&&i.status!=='cancelled').reduce((s,i)=>s+i.amount,0),[invList]);
  const overdueCount=useMemo(()=>invList.filter(i=>i.status==='overdue').length,[invList]);

  /* tab badges */
  const tabBadge={Invoices:overdueCount>0?overdueCount:null,Payments:evidences.length===0?'!':null,Communications:null};

  /* dropdown close on outside click */
  const ddRef=useRef();
  useEffect(()=>{
    if(!openDD)return;
    const fn=e=>{if(ddRef.current&&!ddRef.current.contains(e.target))setOpenDD(null);};
    document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);
  },[openDD]);

  /* save */
  function handleSave(){
    setDirty(false);setSaveFlash(true);
    logActivity({title:'Client profile updated',sub:'Changes saved',color:C.green,icon:'💾',cat:'system',linkTab:'Overview'});
    setTimeout(()=>setSaveFlash(false),2000);
  }
  function handleDiscard(){setLocalClient({...client});setDirty(false);}

  /* modal handlers */
  function handleModalClose(){setModal(null);}

  function handleSaveBillingItem(item){
    if(modal?.data?.id){
      setBillingItems(prev=>prev.map(b=>b.id===item.id?item:b));
      logActivity({title:`Billing item updated: ${item.name}`,sub:`${fmt(item.qty*item.unitPrice)}/mo`,color:C.blue,icon:'🧾',cat:'billing',linkTab:'Billing'});
    } else {
      setBillingItems(prev=>[...prev,item]);
      logActivity({title:`Billing item added: ${item.name}`,sub:`${fmt(item.qty*item.unitPrice)}/mo · ${item.freq}`,color:C.purple,icon:'➕',cat:'billing',linkTab:'Billing'});
    }
    setModal(null);
  }

  function handleSaveInvoice(form){
    if(modal?.data?.id){
      setInvList(prev=>prev.map(i=>i.id===form.id?{...form}:i));
      logActivity({title:`Invoice updated`,sub:`${MONTHS[form.month-1]} ${form.year} · ${fmt(form.amount)}`,color:C.blue,icon:'📝',cat:'invoices',linkTab:'Invoices'});
    } else {
      const inv={...form,id:Date.now()};
      setInvList(prev=>[inv,...prev]);
      logActivity({title:`Invoice created`,sub:`${MONTHS[form.month-1]} ${form.year} · ${fmt(form.amount)} · ${form.status}`,color:C.purple,icon:'📄',cat:'invoices',linkTab:'Invoices'});
    }
    setModal(null);
  }

  function handleSend(form){
    const entry={id:Date.now(),ts:new Date().toISOString(),type:form.commType,channel:form.channel,recipient:form.recipient,status:'sent'};
    setCommsLog(prev=>[entry,...prev]);
    logActivity({title:`${form.commType} sent via ${form.channel}`,sub:form.recipient||'Recipient',color:C.blue,icon:form.channel==='Email'?'📧':form.channel==='WhatsApp'?'💬':'📱',cat:'communications',linkTab:'Communications'});
    setModal(null);
  }

  function handleSaveUser(userData){
    if(modal?.data?.setLocalUsers){
      if(userData.id&&modal.data.id){
        modal.data.setLocalUsers(prev=>prev.map(u=>u.id===userData.id?userData:u));
        logActivity({title:`User updated: ${userData.name}`,sub:`${userData.role} · ${userData.type}`,color:C.blue,icon:'👤',cat:'users',linkTab:'Users'});
      } else {
        modal.data.setLocalUsers(prev=>[...prev,userData]);
        logActivity({title:`User added: ${userData.name}`,sub:`${userData.role} · ${userData.type}`,color:C.green,icon:'👤',cat:'users',linkTab:'Users'});
      }
    }
    setModal(null);
  }

  /* global action handlers */
  const moreItems=[
    {label:'Archive Client',icon:'📦',onClick:()=>logActivity({title:'Client archived',sub:'Status changed',color:C.muted,icon:'📦',cat:'system'})},
    {label:'Suspend Client',icon:'⏸️',onClick:()=>{setLocalClient(prev=>({...prev,status:'inactive'}));setDirty(true);logActivity({title:'Client suspended',sub:'Account suspended',color:C.red,icon:'⏸️',cat:'system'});}},
    {label:'Reactivate Client',icon:'▶️',onClick:()=>{setLocalClient(prev=>({...prev,status:'active'}));setDirty(true);logActivity({title:'Client reactivated',sub:'Account reactivated',color:C.green,icon:'▶️',cat:'system'});}},
    {divider:true},
    {label:'Delete Client',icon:'🗑️',danger:true,onClick:()=>alert('Delete requires confirmation from Admin Portal.')},
  ];

  return (
    <div style={{fontFamily:'inherit',minHeight:'100%'}}>

      {/* ── Sticky header ── */}
      <div style={{position:'sticky',top:'60px',zIndex:30,background:'rgba(255,255,255,0.97)',backdropFilter:'blur(8px)',borderBottom:`1px solid ${C.border}`,padding:'12px 0'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',padding:'0 4px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <button onClick={handleBack} style={{background:'none',border:'none',cursor:'pointer',color:C.purple,fontSize:'13px',fontWeight:700,display:'flex',alignItems:'center',gap:'5px',padding:0,flexShrink:0}}>← Clients</button>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1,minWidth:0}}>
            <div style={{width:'44px',height:'44px',borderRadius:th('2px', { classic: '12px', dark: '12px' }),flexShrink:0,background:C.purpleL,color:C.purple,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'18px',border:`1px solid ${C.purpleM}`}}>
              {(localClient.companyName||localClient.name||'?')[0].toUpperCase()}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:'16px',fontWeight:800,color:C.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{localClient.companyName||localClient.name}</div>
              <div style={{fontSize:'11px',color:C.muted,marginTop:'1px'}}>{localClient.industry||'No industry'} · ID: {String(client.id).slice(0,8)}</div>
            </div>
          </div>

          {/* Status + MRR */}
          <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
            {overdueCount>0&&<span onClick={()=>navTo('Invoices')} style={{background:C.redL,color:C.red,border:`1px solid ${C.red}35`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),padding:'4px 10px',fontSize:'11px',fontWeight:700,cursor:'pointer'}}>⚠ {overdueCount} Overdue</span>}
            <span style={{background:localClient.status==='active'?C.greenL:th('#f1f5f9', { dark: '#172033' }),color:localClient.status==='active'?C.green:C.muted,border:`1px solid ${localClient.status==='active'?C.green+'35':C.border}`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),padding:'4px 10px',fontSize:'11px',fontWeight:700}}>
              {localClient.status==='active'?'● Active':'○ Inactive'}
            </span>
            <span onClick={()=>navTo('Revenue')} style={{background:saveFlash?C.greenL:C.purpleL,color:saveFlash?C.green:C.purple,border:`1px solid ${saveFlash?C.green+'35':C.purpleM}`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),padding:'4px 12px',fontSize:'12px',fontWeight:700,cursor:'pointer',transition:'all 0.3s'}}>
              {saveFlash?'✓ Saved':`MRR ${fmt(totalMRR)}`}
            </span>
          </div>

          {/* Global actions */}
          <div ref={ddRef} style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0,position:'relative'}}>
            {isDirty&&<Btn size="sm" onClick={handleSave}>Save Changes</Btn>}
            <Btn size="sm" onClick={()=>setModal({type:'createInvoice',data:{}})}>Generate Invoice</Btn>
            <div style={{position:'relative'}}>
              <Btn size="sm" variant="secondary" onClick={()=>setOpenDD(openDD==='send'?null:'send')}>Send ↓</Btn>
              {openDD==='send'&&<DropMenu onClose={()=>setOpenDD(null)} items={[
                {label:'Send via Email',icon:'📧',onClick:()=>setModal({type:'sendComm',data:{commType:'Invoice',channel:'Email'}})},
                {label:'Send via WhatsApp',icon:'💬',onClick:()=>setModal({type:'sendComm',data:{commType:'Invoice',channel:'WhatsApp'}})},
                {label:'Send via SMS',icon:'📱',onClick:()=>setModal({type:'sendComm',data:{commType:'Invoice',channel:'SMS'}})},
                {label:'Share Secure Link',icon:'🔗',onClick:()=>setModal({type:'sendComm',data:{commType:'Invoice',channel:'Secure Link'}})},
              ]}/>}
            </div>
            <div style={{position:'relative'}}>
              <Btn size="sm" variant="secondary" onClick={()=>setOpenDD(openDD==='export'?null:'export')}>Export ↓</Btn>
              {openDD==='export'&&<DropMenu onClose={()=>setOpenDD(null)} items={[
                {label:'Download PDF',icon:'📥',onClick:()=>logActivity({title:'PDF downloaded',sub:localClient.companyName||localClient.name,color:C.blue,icon:'📥',cat:'system'})},
                {label:'Export Excel',icon:'📊',onClick:()=>logActivity({title:'Excel exported',sub:localClient.companyName||localClient.name,color:C.teal,icon:'📊',cat:'system'})},
                {label:'Print',icon:'🖨️',onClick:()=>window.print()},
              ]}/>}
            </div>
            <div style={{position:'relative'}}>
              <Btn size="sm" variant="ghost" onClick={()=>setOpenDD(openDD==='more'?null:'more')}>More ↓</Btn>
              {openDD==='more'&&<DropMenu onClose={()=>setOpenDD(null)} items={moreItems}/>}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{maxWidth:'1100px',margin:'10px auto 0',padding:'0 4px',display:'flex',gap:'0',borderBottom:`1px solid ${C.border}`,overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>navTo(t)} style={{padding:'10px 16px',fontSize:'13px',cursor:'pointer',background:'none',border:'none',borderBottom:activeTab===t?`2px solid ${C.purple}`:'2px solid transparent',fontWeight:activeTab===t?700:500,color:activeTab===t?C.purple:C.muted,marginBottom:'-1px',transition:'all 0.12s',position:'relative',whiteSpace:'nowrap'}}>
              {t}
              {tabBadge[t]&&<span style={{position:'absolute',top:'6px',right:'6px',minWidth:'16px',height:'16px',borderRadius:'50%',background:C.red,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:800,color:'white',padding:'0 3px'}}>{tabBadge[t]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab purpose */}
      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'4px 4px 0'}}>
        {(()=>{
          const D={Overview:'Executive snapshot — security posture, compliance, risks and onboarding status',Users:'User management — add, edit, disable and assign roles to all user types',Billing:'Plan details, billing information, billable items and payment configuration',Invoices:'Create, send and manage all client invoices with status tracking',Payments:'Track payments received and manage payment evidence and receipts',Communications:'Send and log all client communications — email, WhatsApp, SMS',Revenue:'Financial performance — MRR, ARR, trends and revenue forecasts',Reports:'Generate, download and share business reports',Activity:'Complete immutable audit trail of every action taken'};
          return <div style={{fontSize:'12px',color:C.muted,fontStyle:'italic',padding:'4px 0 2px'}}>{D[activeTab]||''}</div>;
        })()}
      </div>

      {/* ── Tab content ── */}
      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'12px 0 80px'}}>
        {activeTab==='Overview'&&<TabOverview localClient={localClient} setLocalClient={setLocalClient} setDirty={setDirty} client={client} fmt={fmt} invList={invList} navTo={navTo}/>}
        {activeTab==='Users'&&<TabUsers localClient={localClient} setLocalClient={setLocalClient} mrr={totalMRR} fmt={fmt} navTo={navTo} setModal={setModal} logActivity={logActivity}/>}
        {activeTab==='Billing'&&<TabBilling localClient={localClient} setLocalClient={setLocalClient} setDirty={setDirty} costs={costs} mrr={mrr} customMRR={customMRR} billingItems={billingItems} setBillingItems={setBillingItems} fmt={fmt} navTo={navTo} setModal={setModal} logActivity={logActivity}/>}
        {activeTab==='Invoices'&&<TabInvoices invList={invList} setInvList={setInvList} client={localClient} fmt={fmt} navTo={navTo} setModal={setModal} logActivity={logActivity}/>}
        {activeTab==='Payments'&&<TabPayments evidences={evidences} setEvidences={setEvidences} invList={invList} setInvList={setInvList} fmt={fmt} navTo={navTo} logActivity={logActivity}/>}
        {activeTab==='Communications'&&<TabCommunications commsLog={commsLog} setCommsLog={setCommsLog} setModal={setModal} client={localClient} invList={invList} logActivity={logActivity}/>}
        {activeTab==='Revenue'&&<TabRevenue mrr={totalMRR} costs={costs} invList={invList} fmt={fmt} navTo={navTo} localClient={localClient} logActivity={logActivity}/>}
        {activeTab==='Reports'&&<TabReports mrr={totalMRR} invList={invList} localClient={localClient} fmt={fmt} navTo={navTo} logActivity={logActivity}/>}
        {activeTab==='Activity'&&<TabActivity actLog={actLog} navTo={navTo} fmt={fmt}/>}
      </div>

      {/* Smart save bar */}
      {isDirty&&<SaveBar onSave={handleSave} onDiscard={handleDiscard}/>}

      {/* Modals */}
      {modal?.type==='addBillingItem'&&<BillingItemModal data={{}} onSave={handleSaveBillingItem} onClose={handleModalClose}/>}
      {modal?.type==='editBillingItem'&&<BillingItemModal data={modal.data} onSave={handleSaveBillingItem} onClose={handleModalClose}/>}
      {modal?.type==='createInvoice'&&<InvoiceFormModal data={{}} onSave={handleSaveInvoice} onClose={handleModalClose} title="Create Invoice" defaultAmount={totalMRR}/>}
      {modal?.type==='editInvoice'&&<InvoiceFormModal data={modal.data} onSave={handleSaveInvoice} onClose={handleModalClose} title="Edit Invoice"/>}
      {modal?.type==='sendInvoice'&&<SendModal data={{commType:'Invoice',...modal.data}} onSend={handleSend} onClose={handleModalClose} client={localClient}/>}
      {modal?.type==='sendComm'&&<SendModal data={modal.data} onSend={handleSend} onClose={handleModalClose} client={localClient}/>}
      {modal?.type==='addUser'&&<UserFormModal data={{}} onSave={handleSaveUser} onClose={handleModalClose}/>}
      {modal?.type==='editUser'&&<UserFormModal data={modal.data} onSave={handleSaveUser} onClose={handleModalClose}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CLIENT LIST (default export)
══════════════════════════════════════════════════════ */
export default function OwnerPortalClients(){
  const {allClients,loading}=useAdminData();
  const {fmt}=useCurrency();
  const [searchParams,setSearchParams]=useSearchParams();
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('all');
  const [sortBy,setSortBy]=useState('revenue');
  const [sortDir,setSortDir]=useState('desc');
  const [page,setPage]=useState(1);
  const [perPage,setPerPage]=useState(10);

  useEffect(()=>{
    const id=searchParams.get('id');
    if(id&&allClients?.length){const m=allClients.find(c=>String(c.id)===String(id));if(m){setSelected(m);setSearchParams({},{replace:true});}}
  },[searchParams,allClients]);

  function toggleSort(col){if(sortBy===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortBy(col);setSortDir('desc');setPage(1);}}

  const filtered=useMemo(()=>{
    if(!allClients)return[];
    let list=allClients.filter(c=>{const nm=(c.companyName||c.name||'').toLowerCase();return(!search||nm.includes(search.toLowerCase()))&&(status==='all'||c.status===status);});
    list=[...list].sort((a,b)=>{let av,bv;if(sortBy==='name'){av=(a.companyName||a.name||'').toLowerCase();bv=(b.companyName||b.name||'').toLowerCase();}if(sortBy==='revenue'){av=a.costs?.grandTotal||0;bv=b.costs?.grandTotal||0;}if(sortBy==='users'){av=a.users?.total||0;bv=b.users?.total||0;}if(sortBy==='industry'){av=(a.industry||'').toLowerCase();bv=(b.industry||'').toLowerCase();}if(typeof av==='string')return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);return sortDir==='asc'?av-bv:bv-av;});
    return list;
  },[allClients,search,status,sortBy,sortDir]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/perPage));
  const safePage=Math.min(page,totalPages);
  const slice=filtered.slice((safePage-1)*perPage,safePage*perPage);
  const from=filtered.length===0?0:(safePage-1)*perPage+1;
  const to=Math.min(safePage*perPage,filtered.length);
  const outstanding=c=>(c.invoices||[]).filter(i=>i.status==='pending'||i.status==='overdue').reduce((s,i)=>s+i.amount,0);
  const COL='28px 2fr 1fr 60px 150px 130px 90px 90px';

  if(loading)return<Loader/>;
  if(selected)return<ClientWorkspace client={selected} onBack={()=>setSelected(null)}/>;

  return (
    <div style={{maxWidth:'1100px',margin:'0 auto',padding:'0 0 40px',fontFamily:'inherit'}}>
      <div style={{marginBottom:'22px'}}>
        <div style={{fontSize:'22px',fontWeight:800,color:C.ink,letterSpacing:'-0.02em'}}>Clients</div>
        <div style={{fontSize:'13px',color:C.muted,marginTop:'3px'}}>{allClients?.length||0} total · {allClients?.filter(c=>c.status==='active').length||0} active</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search clients…" style={{padding:'9px 14px',fontSize:'13px',border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '9px', dark: '9px' }),background:th('white', { dark: '#1E293B' }),color:C.ink,outline:'none',width:'220px',boxShadow:th('none', { classic: '0 1px 3px rgba(0,0,0,0.04)', dark: '0 1px 3px rgba(0,0,0,0.04)' })}}/>
        <div style={{display:'flex',gap:'4px'}}>
          {[['all','All'],['active','Active'],['inactive','Inactive']].map(([k,l])=>(
            <button key={k} onClick={()=>{setStatus(k);setPage(1);}} style={{padding:'8px 14px',borderRadius:th('2px', { classic: '8px', dark: '8px' }),fontSize:'12px',fontWeight:700,cursor:'pointer',border:`1px solid ${status===k?C.purple:C.border}`,background:status===k?C.purple:th('white', { dark: '#1E293B' }),color:status===k?'white':C.muted}}>{l}</button>
          ))}
        </div>
        <select value={`${sortBy}-${sortDir}`} onChange={e=>{const[col,dir]=e.target.value.split('-');setSortBy(col);setSortDir(dir);setPage(1);}} style={{padding:'8px 12px',fontSize:'12px',border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),background:th('white', { dark: '#1E293B' }),color:C.mid,outline:'none',cursor:'pointer'}}>
          <option value="revenue-desc">Revenue ↓</option><option value="revenue-asc">Revenue ↑</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="users-desc">Users ↓</option><option value="industry-asc">Industry</option>
        </select>
        <div style={{marginLeft:'auto',display:'flex',gap:'4px',alignItems:'center'}}>
          <span style={{fontSize:'12px',color:C.muted,fontWeight:600}}>Show:</span>
          {[10,25,50].map(n=>(
            <button key={n} onClick={()=>{setPerPage(n);setPage(1);}} style={{width:'36px',height:'32px',borderRadius:th('2px', { classic: '7px', dark: '7px' }),fontSize:'12px',fontWeight:700,cursor:'pointer',border:`1px solid ${perPage===n?C.purple:C.border}`,background:perPage===n?C.purple:th('white', { dark: '#1E293B' }),color:perPage===n?'white':C.muted}}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{background:th('white', { dark: '#1E293B' }),border:`1px solid ${C.border}`,borderRadius:th('2px', { classic: '14px', dark: '14px' }),boxShadow:th('none', { classic: '0 1px 4px rgba(0,0,0,0.05)', dark: '0 1px 4px rgba(0,0,0,0.05)' }),overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:COL,padding:'10px 20px',background:C.bg,borderBottom:`1px solid ${C.border}`,alignItems:'center'}}>
          <div style={{fontSize:'10px',fontWeight:700,color:C.muted}}>#</div>
          {[['name','Client'],['industry','Industry'],['users','Users'],['revenue','MRR'],['outstanding','Outstanding'],['status','Status']].map(([k,l])=>(
            <div key={k} onClick={()=>toggleSort(k)} style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:sortBy===k?C.purple:C.muted,cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',gap:'3px'}}>
              {l}<span style={{opacity:sortBy===k?0.8:0.2}}>{sortBy===k?(sortDir==='asc'?'↑':'↓'):'↕'}</span>
            </div>
          ))}
          <div/>
        </div>
        {slice.length===0
          ?<div style={{padding:'48px',textAlign:'center',color:C.muted}}><div style={{fontSize:'32px',marginBottom:'10px'}}>🔍</div><div style={{fontSize:'14px',fontWeight:700,color:C.ink,marginBottom:'4px'}}>No clients found</div><div style={{fontSize:'13px'}}>Try adjusting your search or filters.</div></div>
          :slice.map((c,i)=>{const out=outstanding(c);return(
            <div key={c.id} style={{display:'grid',gridTemplateColumns:COL,padding:'13px 20px',alignItems:'center',borderBottom:i<slice.length-1?`1px solid ${C.border}`:'none',cursor:'pointer'}} onClick={()=>setSelected(c)} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontSize:'12px',color:C.muted,fontWeight:600}}>{(safePage-1)*perPage+i+1}</div>
              <div style={{display:'flex',alignItems:'center',gap:'11px',minWidth:0}}>
                <div style={{width:'34px',height:'34px',borderRadius:th('2px', { classic: '9px', dark: '9px' }),flexShrink:0,background:C.purpleL,color:C.purple,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'14px',border:`1px solid ${C.purpleM}`}}>{(c.companyName||c.name||'?')[0].toUpperCase()}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:600,color:C.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.companyName||c.name}</div>
                  <div style={{fontSize:'11px',color:C.muted}}>{c.name}</div>
                </div>
              </div>
              <div style={{fontSize:'12px',color:C.mid,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.industry||'—'}</div>
              <div style={{fontSize:'13px',fontWeight:600,color:C.ink}}>{(c.users?.total||0).toLocaleString()}</div>
              <div style={{fontSize:'13px',fontWeight:700,color:C.purple}}>{fmt(c.costs?.grandTotal||0)}</div>
              <div style={{fontSize:'13px',fontWeight:out>0?700:400,color:out>0?C.red:C.muted}}>{out>0?fmt(out):'—'}</div>
              <div><span style={{padding:'3px 10px',borderRadius:th('2px', { classic: '20px', dark: '20px' }),fontSize:'11px',fontWeight:700,background:c.status==='active'?C.greenL:th('#f1f5f9', { dark: '#172033' }),color:c.status==='active'?C.green:C.muted,border:`1px solid ${c.status==='active'?C.green+'35':C.border}`}}>{c.status==='active'?'● Active':'○ Inactive'}</span></div>
              <div><button onClick={e=>{e.stopPropagation();setSelected(c);}} style={{background:C.purpleL,color:C.purple,border:`1px solid ${C.purpleM}`,borderRadius:th('2px', { classic: '8px', dark: '8px' }),padding:'5px 14px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>View →</button></div>
            </div>
          );})
        }
        {filtered.length>0&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 20px',borderTop:`1px solid ${C.border}`,background:C.bg}}>
            <div style={{fontSize:'12px',color:C.muted}}>Showing <strong style={{color:C.ink}}>{from}–{to}</strong> of <strong style={{color:C.ink}}>{filtered.length}</strong></div>
            <div style={{display:'flex',gap:'4px'}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1} style={{padding:'5px 12px',borderRadius:th('2px', { classic: '7px', dark: '7px' }),fontSize:'12px',fontWeight:700,border:`1px solid ${C.border}`,background:th('white', { dark: '#1E293B' }),color:safePage===1?C.muted:C.mid,cursor:safePage===1?'not-allowed':'pointer',opacity:safePage===1?0.4:1}}>← Prev</button>
              {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p=>(
                <button key={p} onClick={()=>setPage(p)} style={{width:'30px',height:'30px',borderRadius:th('2px', { classic: '7px', dark: '7px' }),fontSize:'12px',fontWeight:700,border:`1px solid ${p===safePage?C.purple:C.border}`,background:p===safePage?C.purple:th('white', { dark: '#1E293B' }),color:p===safePage?'white':C.mid,cursor:'pointer'}}>{p}</button>
              ))}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} style={{padding:'5px 12px',borderRadius:th('2px', { classic: '7px', dark: '7px' }),fontSize:'12px',fontWeight:700,border:`1px solid ${C.border}`,background:th('white', { dark: '#1E293B' }),color:safePage===totalPages?C.muted:C.mid,cursor:safePage===totalPages?'not-allowed':'pointer',opacity:safePage===totalPages?0.4:1}}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
