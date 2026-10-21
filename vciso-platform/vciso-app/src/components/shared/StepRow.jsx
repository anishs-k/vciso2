import React from 'react';

/**
 * StepRow / ListRow — the core row pattern from the reference page.
 *
 *   ( 3 )  Scope of the ISMS   4.3            [ Mandatory ]
 *   ^      ^                   ^              ^
 *   number title (serif-bold)  mono clause    right-side badge
 *
 * 18px vertical padding, 16px gap, 1px #EDF2F7 top divider, hover underlines
 * the title. The circle turns crimson-filled when `status="done"` (rendering a
 * check) and crimson-outlined when `status="in_progress"`.
 */
export default function StepRow({
  number,
  status,
  title,
  meta,
  description,
  badge,
  onClick,
  className = '',
}) {
  const done = status === 'done' || status === 'completed';
  const inProgress = status === 'in_progress' || status === 'prog';
  const interactive = typeof onClick === 'function';

  return (
    <div
      className={`reg-row ${interactive ? '' : 'static'} ${className}`.trim()}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
    >
      {number !== undefined && number !== null && (
        <div className={`reg-num ${done ? 'done' : inProgress ? 'prog' : ''}`.trim()}>
          {done ? '✓' : number}
        </div>
      )}
      <div className="reg-row-main">
        <span className="reg-row-title">{title}</span>
        {meta && <span className="reg-row-clause">{meta}</span>}
        {description && <div className="reg-row-desc">{description}</div>}
      </div>
      {badge}
    </div>
  );
}

/** ListRow — same row without a leading number circle. */
export function ListRow(props) {
  return <StepRow {...props} number={null} />;
}
