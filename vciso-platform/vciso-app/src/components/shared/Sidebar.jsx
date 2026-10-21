import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import StatusBadge from './StatusBadge';

/**
 * Sidebar family — the dark navigation shell from the reference page.
 *
 * 240px, #1A202C, sticky full-height. Composition:
 *
 *   <Sidebar brand="vCISO" sub="Compliance register · Acme" user={...} onLogout={...}>
 *     <SidebarSelect label="ISO 27001" onClick={...} />
 *     <SidebarSection label="Compliance Register">
 *       <SidebarNavItem label="Implementation steps" active onClick={...} />
 *       <SidebarNavItem label="Draft workspace" badge="Live" badgeVariant="live" />
 *     </SidebarSection>
 *   </Sidebar>
 *
 * SidebarNavItem renders a <NavLink> when given `to` (active state handled by
 * the router) and a plain div when given `onClick` + `active`.
 */
export default function Sidebar({
  brand,
  sub,
  selector,
  children,
  user,
  onLogout,
}) {
  return (
    <aside className="reg-side">
      <div className="reg-brand">
        <div className="reg-brand-name">{brand}</div>
        {sub && <div className="reg-brand-sub" title={sub}>{sub}</div>}
      </div>

      {selector}

      <div className="reg-nav-scroll">{children}</div>

      {(user || onLogout) && (
        <div className="reg-user-footer">
          {user && (
            <div className="reg-user-row">
              <div className="reg-user-avatar">{user.initials}</div>
              <div className="reg-user-info">
                <div className="reg-user-name">{user.name}</div>
                <div className="reg-user-email">{user.email}</div>
              </div>
            </div>
          )}
          {onLogout && (
            <button onClick={onLogout} className="reg-logout-btn">
              <span>⏻</span> Logout
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

/** SidebarSelect — the framework picker row under the brand. */
export function SidebarSelect({ label, onClick }) {
  return (
    <div className="reg-select" onClick={onClick}>
      <span>{label}</span>
      <span>⌄</span>
    </div>
  );
}

/** SidebarSection — collapsible uppercase group header. */
export function SidebarSection({ label, defaultOpen = true, open, onToggle, children }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const toggle = () => {
    if (isControlled) onToggle?.();
    else setInternalOpen(o => !o);
  };

  if (React.Children.toArray(children).filter(Boolean).length === 0) return null;

  return (
    <>
      <div className="reg-nav-section-hdr" onClick={toggle}>
        <span>{label}</span>
        <span className="reg-nav-section-chevron">{isOpen ? '⌄' : '›'}</span>
      </div>
      {isOpen && <div>{children}</div>}
    </>
  );
}

/** SidebarNavItem — one nav row, optionally with a trailing badge. */
export function SidebarNavItem({
  label,
  icon,
  to,
  end,
  onClick,
  active,
  badge,
  badgeVariant = 'neutral',
}) {
  const inner = (
    <>
      {icon && <span className="reg-nav-item-icon" aria-hidden="true">{icon}</span>}
      <span className="reg-nav-item-text">{label}</span>
      {badge !== undefined && badge !== null && badge !== 0 && badge !== '' && (
        <StatusBadge variant={badgeVariant}>{badge}</StatusBadge>
      )}
    </>
  );

  if (to) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => `reg-nav-item ${isActive ? 'active' : ''}`.trim()}
      >
        {inner}
      </NavLink>
    );
  }

  return (
    <div className={`reg-nav-item ${active ? 'active' : ''}`.trim()} onClick={onClick}>
      {inner}
    </div>
  );
}
