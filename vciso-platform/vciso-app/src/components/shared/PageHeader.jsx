import React from 'react';

/**
 * PageHeader — the breadcrumb / context row that sits above the content card.
 *
 * Matches the reference page exactly: muted 12.5px line on the left reading
 * "Viewing <b>Client</b> ... workspace", right-aligned action button(s).
 *
 * Usage:
 *   <PageHeader
 *     client="Acme Corp"
 *     context="ISMS implementation workspace"
 *     meta={[{ label: 'Industry', value: 'Fintech' }]}
 *     actions={<button className="reg-btn-primary reg-btn-sm">+ New Policy Draft</button>}
 *   />
 *
 * Pass `children` instead of client/context to render a fully custom breadcrumb.
 */
export default function PageHeader({
  client,
  context,
  meta = [],
  actions,
  children,
}) {
  return (
    <div className="reg-topline reg-topline-row">
      <div>
        {children ?? (
          <>
            Viewing <b>{client}</b>{context ? ` ${context}` : ''}
          </>
        )}
        {meta
          .filter(m => m && m.value)
          .map(m => (
            <span key={m.label}> · {m.label}: <b>{m.value}</b></span>
          ))}
      </div>
      {actions && <div className="reg-topline-actions">{actions}</div>}
    </div>
  );
}
