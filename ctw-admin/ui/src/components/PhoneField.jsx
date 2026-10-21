// A phone number box with its country code in a small dropdown at the left. The code starts as the one of
// `preferred` (the office's country) and can be changed; the number takes only digits, as many as that
// country's numbers have.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field } from './ui';
import { digitsOf, formatPhone, lengthText, parsePhone } from '../lib/phone';

export function PhoneField({ label, required, value, onChange, countries, preferred }) {
  const withCode = useMemo(() => (countries || []).filter((c) => c.phone_code), [countries]);
  const [picked, setPicked] = useState(null); // a code chosen before any digit is typed
  const { country, digits } = parsePhone(value, withCode, picked || preferred);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const search = useRef(null);
  const list = useRef(null);

  const q = query.trim().toLowerCase().replace(/^\+/, '');
  const matches = useMemo(
    () => (q ? withCode.filter((c) => c.name.toLowerCase().startsWith(q) || c.phone_code.startsWith(q)) : withCode),
    [withCode, q],
  );

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);
  useEffect(() => {
    list.current?.querySelectorAll('li')[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const lengths = country?.phone_lengths || [];
  const max = lengths.length ? Math.max(...lengths) : 15;
  const wrong = digits && lengths.length && !lengths.includes(digits.length);

  const choose = (c) => {
    setPicked(c);
    onChange(formatPhone(c, digits));
    setOpen(false);
    setQuery('');
  };
  const key = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(matches.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <Field label={label} required={required}>
      <div className="phone">
        <button
          type="button"
          className="phone-code"
          aria-haspopup="listbox"
          aria-expanded={open}
          title={country ? country.name : 'Choose the country code'}
          disabled={!withCode.length}
          onClick={() => {
            setActive(Math.max(0, matches.indexOf(country)));
            setOpen(!open);
          }}
        >
          {country ? `+${country.phone_code}` : 'Code'} <span aria-hidden="true">▾</span>
        </button>
        <input
          type="tel"
          inputMode="numeric"
          value={digits}
          placeholder={lengths.length ? `${lengthText(lengths)} digits` : 'Phone number'}
          onChange={(e) => onChange(formatPhone(country, digitsOf(e.target.value).slice(0, max)))}
        />
        {open && (
          <div className="combo-list phone-list" ref={list}>
            <input
              ref={search}
              className="combo-search"
              value={query}
              placeholder="Country or code"
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={key}
              onBlur={() => {
                setOpen(false);
                setQuery('');
              }}
            />
            <ul role="listbox">
              {matches.map((c, i) => (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={c === country}
                  className={`${i === active ? 'active' : ''}${c === country ? ' chosen' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                >
                  <span>{c.name}</span>
                  <span className="code">+{c.phone_code}</span>
                </li>
              ))}
              {!matches.length && <li className="combo-note">No match</li>}
            </ul>
          </div>
        )}
      </div>
      <span className={`hint${wrong ? ' bad' : ''}`}>
        {country
          ? `${country.name}: ${lengthText(lengths)} digits${wrong ? `, ${digits.length} entered` : ''}`
          : 'Choose the country code'}
      </span>
    </Field>
  );
}
