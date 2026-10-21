import React, { useState, useMemo } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { th } from '../../theme';

const T = {
  bg: th('#f8fafc', { dark: '#0F172A' }), surface: th('#ffffff', { dark: '#1E293B' }), border: th('#e5e7eb', { dark: '#334155' }),
  brand: th('#2563eb', { dark: '#60A5FA' }), brandBg: th('#eff6ff', { dark: '#172554' }), brandMid: th('#dbeafe', { dark: '#172554' }),
  green: '#059669', greenBg: th('#ecfdf5', { dark: '#0B2E24' }),
  yellow: '#d97706', yellowBg: th('#fffbeb', { dark: '#3A2A0A' }),
  red: '#dc2626', redBg: th('#fef2f2', { dark: '#3A1418' }),
  blue: th('#2563eb', { dark: '#60A5FA' }), blueBg: th('#eff6ff', { dark: '#172554' }),
  text: th('#0f172a', { dark: '#F1F5F9' }), textMid: th('#334155', { dark: '#CBD5E1' }), muted: th('#64748b', { dark: '#94A3B8' }),
  shadow: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
  shadowMd: '0 4px 6px -1px rgba(16,24,40,0.08)',
};

export function fmt$(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <div style={{ width: '28px', height: '28px', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.brand}`, borderRadius: '50%', animation: 'ownerSpin 0.8s linear infinite' }} />
      <style>{`@keyframes ownerSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function Empty({ msg }) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', color: T.muted, fontSize: '14px' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>○</div>
      {msg}
    </div>
  );
}

export function Badge({ label, color = T.brand, bg }) {
  return (
    <span style={{
      background: bg || `${color}12`,
      color, border: `1px solid ${color}25`,
      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: th('2px', { classic: '20px', dark: '20px' }),
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

export function ClientAvatar({ name, size = 36 }) {
  const colors = [T.brand, '#059669', th('#2563eb', { dark: '#60A5FA' }), '#d97706', '#dc2626', '#7c3aed'];
  const idx = (name || '?').charCodeAt(0) % colors.length;
  const color = colors[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: th('2px', { classic: '10px', dark: '10px' }), flexShrink: 0,
      background: `${color}15`, border: `1px solid ${color}25`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontWeight: 800, fontSize: Math.round(size * 0.38) + 'px',
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    active:      { label: 'Active',      color: T.green,  bg: T.greenBg  },
    inactive:    { label: 'Inactive',    color: T.muted,  bg: T.bg       },
    paid:        { label: 'Paid',        color: T.green,  bg: T.greenBg  },
    pending:     { label: 'Pending',     color: T.yellow, bg: T.yellowBg },
    overdue:     { label: 'Overdue',     color: T.red,    bg: T.redBg    },
    in_progress: { label: 'In Progress', color: T.blue,   bg: T.blueBg   },
    completed:   { label: 'Completed',   color: T.green,  bg: T.greenBg  },
    not_started: { label: 'Not Started', color: T.muted,  bg: T.bg       },
  };
  const s = map[status] || { label: status, color: T.muted, bg: T.bg };
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}20`,
      fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: th('2px', { classic: '20px', dark: '20px' }),
    }}>{s.label}</span>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{ color: T.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', marginTop: '4px' }}>
      {children}
    </div>
  );
}

export { T };
export default { fmt$, fmtDate, Loader, Empty, Badge, ClientAvatar, StatusPill, SectionLabel, T };
