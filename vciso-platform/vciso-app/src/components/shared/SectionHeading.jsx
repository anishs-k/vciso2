import React from 'react';

/**
 * SectionHeading — serif-bold subheading, e.g. "1. Project preparation".
 * Source Serif 4, 15.5px, 600, #1A202C, 4px bottom margin.
 */
export default function SectionHeading({ children, className = '' }) {
  return <div className={`reg-section ${className}`.trim()}>{children}</div>;
}

/**
 * Section — a heading plus its rows, with the 28px group gap the reference page
 * puts between phases. Use this instead of an inline marginBottom.
 */
export function Section({ title, children, className = '' }) {
  return (
    <div className={`reg-group ${className}`.trim()}>
      {title && <SectionHeading>{title}</SectionHeading>}
      {children}
    </div>
  );
}
