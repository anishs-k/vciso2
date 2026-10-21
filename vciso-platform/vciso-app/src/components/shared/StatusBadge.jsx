import React from 'react';

/**
 * StatusBadge — every pill/stamp style that exists on the reference page.
 *
 * Two shapes, both taken verbatim from the reference:
 *
 *   STAMP  (paper surfaces) — serif 10.5px, 1.4px outline, rotate(-2deg)
 *     mandatory  crimson  #3182CE outline + text
 *     optional   grey     #A0AEC0 outline, #A0AEC0 text
 *
 *   TAG    (dark sidebar)   — Inter 9.5px bold, solid fill, 3px radius
 *     neutral    #3A475C on #CBD5E0   (counts)
 *     crimson    #3182CE on #FFFFFF   (open vulnerabilities)
 *     amber      #8C5810 on #FEF3C7   (threat alerts)
 *     live       #22543D on #9AE6B4   (live workspace)
 *
 * `custom` falls back to the neutral stamp and accepts a className passthrough,
 * so a one-off never needs an inline style.
 */
const VARIANTS = {
  mandatory: 'reg-stamp',
  optional: 'reg-stamp opt',
  neutral: 'tag',
  count: 'tag',
  crimson: 'reg-badge-crimson',
  amber: 'reg-badge-amber',
  live: 'reg-badge-live',
  custom: 'reg-stamp opt',
};

export default function StatusBadge({
  variant = 'optional',
  children,
  className = '',
  title,
  ...rest
}) {
  const base = VARIANTS[variant] ?? VARIANTS.custom;
  return (
    <span className={`${base} ${className}`.trim()} title={title} {...rest}>
      {children}
    </span>
  );
}

/**
 * Convenience: mandatory / optional from a boolean, the exact pairing the
 * reference page uses on every step row.
 */
export function RequirementBadge({ isMandatory }) {
  return (
    <StatusBadge variant={isMandatory ? 'mandatory' : 'optional'}>
      {isMandatory ? 'Mandatory' : 'Optional'}
    </StatusBadge>
  );
}
