import React from 'react';

/**
 * Card — the light "document" container from the reference page (.reg-doc).
 *
 * White surface, 1px #D7DEE7 outline, 2px radius. The optional head holds a
 * serif title on the left and a meta slot (typically <ProgressBar />) or action
 * buttons on the right.
 *
 * Usage:
 *   <Card title="Implementation steps" meta={<ProgressBar value={4} total={27} />}>
 *     ...rows...
 *   </Card>
 *
 * Set `padded={false}` when the body holds a full-bleed element such as a table.
 */
export default function Card({
  title,
  subtitle,
  meta,
  actions,
  children,
  padded = true,
  className = '',
  bodyClassName = '',
}) {
  const hasHead = title || subtitle || meta || actions;

  return (
    <div className={`reg-doc ${className}`.trim()}>
      {hasHead && (
        <div className="reg-doc-head">
          <div>
            {title && <h1 className="reg-title">{title}</h1>}
            {subtitle && <p className="reg-subtitle">{subtitle}</p>}
          </div>
          {(meta || actions) && (
            <div className="reg-topline-actions">
              {meta}
              {actions}
            </div>
          )}
        </div>
      )}
      {padded
        ? <div className={`reg-body ${bodyClassName}`.trim()}>{children}</div>
        : children}
    </div>
  );
}

/**
 * InnerCard — the nested, tinted panel used inside a Card body (.reg-card).
 */
export function InnerCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`reg-card ${className}`.trim()}>
      {title && <div className="reg-card-title">{title}</div>}
      {subtitle && <div className="reg-card-sub">{subtitle}</div>}
      {children}
    </div>
  );
}

/**
 * NoticeBox — the dashed informational callout (.reg-notice-box).
 */
export function NoticeBox({ children, className = '' }) {
  return <div className={`reg-notice-box ${className}`.trim()}>{children}</div>;
}
