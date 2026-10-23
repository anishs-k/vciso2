// Small building blocks shared by the pages.
import { useEffect, useMemo, useRef, useState } from 'react';

export const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (s) =>
  s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtBytes = (n) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : '—');

export function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(`${date}T00:00:00`) - new Date()) / 86_400_000);
}

const CLIENT_STATUS = {
  draft: ['neutral', 'Draft'],
  ready: ['info', 'Ready'],
  generated: ['ok', 'Generated'],
  live: ['ok', 'Live'],
  suspended: ['bad', 'Suspended'],
};
const BUILD_STATUS = {
  queued: ['neutral', 'Queued'],
  running: ['info', 'Running'],
  success: ['ok', 'Success'],
  failed: ['bad', 'Failed'],
};

export function StatusBadge({ status, kind = 'client' }) {
  const [tone, label] = (kind === 'build' ? BUILD_STATUS : CLIENT_STATUS)[status] || ['neutral', status];
  return <span className={`badge ${tone}`}>{label}</span>;
}

export function Card({ title, subtitle, actions, children, padded = true, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div className="grow">
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {padded ? <div className="card-body">{children}</div> : children}
    </section>
  );
}

export function Field({ label, required, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Text({ label, required, hint, value, onChange, type = 'text', ...rest }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

// Keeps '' while the box is empty, a number otherwise.
export function NumberField({ label, required, hint, value, onChange, min, ...rest }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input
        type="number"
        min={min}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        {...rest}
      />
    </Field>
  );
}

export function Select({ label, required, hint, value, onChange, options, placeholder, ...rest }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const [v, l] = typeof o === 'object' ? [o.value, o.label] : [o, o];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

// A choice from a long list that can be searched: typing keeps the entries that start with what was typed.
// `options` are strings. With `freeText`, what is typed is kept even if the list has no such entry (used
// while the list is empty, e.g. a country without states).
const SHOWN = 200;
export function SearchSelect({ label, required, hint, value, onChange, options, placeholder, disabled, freeText }) {
  const [query, setQuery] = useState(null); // null while not typing
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef(null);
  const q = (query ?? '').trim().toLowerCase();
  const matches = useMemo(() => (q ? options.filter((o) => o.toLowerCase().startsWith(q)) : options), [options, q]);
  const shown = matches.slice(0, SHOWN);

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (v) => {
    onChange(v);
    setQuery(null);
    setOpen(false);
  };
  const leave = () => {
    if (query !== null && freeText) onChange(query.trim());
    setQuery(null);
    setOpen(false);
  };
  const key = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.max(0, Math.min(shown.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
      else leave();
    } else if (e.key === 'Escape') {
      setQuery(null);
      setOpen(false);
    }
  };

  return (
    <Field label={label} required={required} hint={hint}>
      <div className="combo">
        <input
          value={query ?? value ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={(e) => {
            e.target.select();
            setActive(Math.max(0, options.indexOf(value)));
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={key}
          onBlur={leave}
        />
        <span className="combo-caret" aria-hidden="true">▾</span>
        {open && !disabled && (shown.length > 0 || q) && (
          <ul className="combo-list" role="listbox" ref={list}>
            {shown.map((o, i) => (
              <li
                key={o}
                role="option"
                aria-selected={o === value}
                className={`${i === active ? 'active' : ''}${o === value ? ' chosen' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                {o}
              </li>
            ))}
            {!shown.length && <li className="combo-note">{freeText ? `Keep “${query.trim()}”` : 'No match'}</li>}
            {matches.length > SHOWN && <li className="combo-note">{matches.length - SHOWN} more: keep typing</li>}
          </ul>
        )}
      </div>
    </Field>
  );
}

export function Alert({ tone = 'info', title, children }) {
  return (
    <div className={`alert ${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function ErrorList({ error }) {
  if (!error) return null;
  const list = error.body?.errors || [];
  return (
    <Alert tone="bad" title={error.message}>
      {list.length > 0 && (
        <ul>
          {list.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}

export function Modal({ title, children, footer, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="card modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="card-head">
          <h2 className="grow">{title}</h2>
        </div>
        <div className="card-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Line icons (24×24, drawn in the text colour), in place of emoji.
const ICONS = {
  building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
  logout: <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M19 12H9" />,
};
export function Icon({ name, size = 18, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {ICONS[name]}
    </svg>
  );
}

export const Spinner = () => <span className="spinner" aria-label="Loading" />;

export function Loading({ what = 'Loading' }) {
  return (
    <div className="empty">
      <Spinner /> {what}…
    </div>
  );
}
