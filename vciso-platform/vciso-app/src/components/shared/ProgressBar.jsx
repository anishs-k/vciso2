import React from 'react';

/**
 * ProgressBar — the right-aligned monospace counter plus segmented tick bar
 * from the reference page head.
 *
 *   "4 of 27 complete"        <- JetBrains Mono 13px, #1A202C
 *   ▪▪▪▪□□□□□□□□□□□□□□□□□□□   <- 9x5px ticks, gap 3px, done = #3182CE
 *
 * Usage (simple count):
 *   <ProgressBar value={completed} total={steps.length} />
 *
 * Usage (per-tick tooltips, as the reference page does):
 *   <ProgressBar
 *     value={completed}
 *     total={steps.length}
 *     segments={steps.map(s => ({
 *       key: s.id,
 *       done: map[s.id]?.status === 'completed',
 *       title: `Step ${s.num}: ${s.title}`,
 *     }))}
 *   />
 */
export default function ProgressBar({
  value = 0,
  total = 0,
  label,
  noun = 'complete',
  segments,
  className = '',
}) {
  const ticks =
    segments ??
    Array.from({ length: total }, (_, i) => ({ key: i, done: i < value }));

  return (
    <div className={`reg-meta ${className}`.trim()}>
      <div className="reg-meta-num">
        {label ?? `${value} of ${total} ${noun}`}
      </div>
      <div className="reg-ticks">
        {ticks.map((t, i) => (
          <div
            key={t.key ?? i}
            className={`reg-tick ${t.done ? 'done' : ''}`.trim()}
            title={t.title}
          />
        ))}
      </div>
    </div>
  );
}
