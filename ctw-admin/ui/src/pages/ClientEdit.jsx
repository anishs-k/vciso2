// New client / edit client: the nine sections, a summary and live checks beside them.
// "Save" stores whatever is there (a draft); "Save & validate", on the last step, also runs the intake
// validator on the server, which is what makes a client ready to build. It is enabled only once every
// check passes.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Alert, Card, ErrorList, Loading, StatusBadge, fmtDate } from '../components/ui';
import { SECTION_COMPONENTS } from '../components/sections';
import { SECTIONS, checkSpec } from '../lib/checks';
import { emptySpec, normalize, toPayload } from '../lib/spec';
import { useCatalogue } from '../lib/catalogue';
import { useCountries } from '../lib/geo';

function Summary({ spec, catalogue }) {
  const o = spec.organization;
  const l = spec.licensing_limits;
  const names = new Map(catalogue.frameworks.map((f) => [f.framework_id, f.framework_name]));
  return (
    <dl className="facts small">
      <dt>Client</dt>
      <dd>{o.customer_name || <span className="muted">—</span>}</dd>
      <dt>ID</dt>
      <dd className="mono">{o.customer_id || '—'}</dd>
      <dt>Offices</dt>
      <dd>{o.offices.length}</dd>
      <dt>Contacts</dt>
      <dd>{o.contacts.length}</dd>
      <dt>Contract</dt>
      <dd>
        {fmtDate(spec.contract.contract_start_date)} – {fmtDate(spec.contract.contract_end_date)}
      </dd>
      <dt>Licence</dt>
      <dd>
        {l.max_users || '?'} users, till {fmtDate(l.valid_to)}
      </dd>
      <dt>Frameworks</dt>
      <dd>
        {spec.selected_frameworks.length ? spec.selected_frameworks.map((f) => (names.get(f.framework_id) || `#${f.framework_id}`).split(' (')[0]).join(', ') : '—'}
      </dd>
      <dt>Modules</dt>
      <dd>{spec.enabled_modules.join(', ')}</dd>
      <dt>Users</dt>
      <dd>{spec.initial_users.length}</dd>
    </dl>
  );
}

export default function ClientEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { catalogue, error: catError } = useCatalogue();
  const [spec, setSpec] = useState(isNew ? emptySpec() : null);
  const [status, setStatus] = useState(isNew ? null : undefined);
  const [section, setSection] = useState(0);
  // Steps the admin has opened. A step counts as complete only once opened and free of problems, so a new
  // client starts at 0%; a saved client's steps hold what was entered, so they all count as opened.
  const [opened, setOpened] = useState(() => new Set(isNew ? [] : SECTIONS.map((x) => x.key)));
  useEffect(() => {
    setOpened((o) => (o.has(SECTIONS[section].key) ? o : new Set([...o, SECTIONS[section].key])));
  }, [section]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null); // 'save' | 'validate'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // validator result
  const [loadError, setLoadError] = useState(null);
  const [createdId, setCreatedId] = useState(null); // a new client once its first save went through

  useEffect(() => {
    if (isNew) return;
    api(`/clients/${encodeURIComponent(id)}`)
      .then((c) => {
        setSpec(normalize(c.spec));
        setStatus(c.status);
      })
      .catch(setLoadError);
  }, [id, isNew]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const edit = useCallback((fn) => {
    setSpec((s) => {
      const next = structuredClone(s);
      fn(next);
      return next;
    });
    setDirty(true);
    setResult(null);
  }, []);

  const countries = useCountries();
  const checks = useMemo(() => (spec ? checkSpec(spec, countries || []) : []), [spec, countries]);
  const bySection = useMemo(() => {
    const m = {};
    checks.forEach((c) => (m[c.section] = (m[c.section] || 0) + 1));
    return m;
  }, [checks]);

  if (loadError) return <Alert tone="bad">{loadError.message}</Alert>;
  if (catError) return <Alert tone="bad">{catError.message}</Alert>;
  if (!spec || !catalogue) return <Loading what="Loading the client" />;

  const cid = spec.organization.customer_id;
  const canSave = /^[A-Za-z0-9_-]{3,32}$/.test(cid) && spec.organization.customer_name.trim();

  // Saves the spec; returns the customer ID it is stored under. A new client is created once: if a later
  // step fails (validation, the network), the next save updates it instead of creating it again.
  const save = async () => {
    const body = toPayload(spec);
    const existing = isNew ? createdId : id;
    const r = existing
      ? await api(`/clients/${encodeURIComponent(existing)}`, { method: 'PUT', body })
      : await api('/clients', { method: 'POST', body });
    if (!existing) setCreatedId(cid);
    // The API generates the contract ID.
    setSpec((s) => (s.contract.contract_id === r.contract_id ? s : { ...s, contract: { ...s.contract, contract_id: r.contract_id } }));
    setDirty(false);
    return existing || cid;
  };

  const run = async (what) => {
    setBusy(what);
    setError(null);
    setResult(null);
    try {
      const saved = await save();
      if (what === 'validate') {
        const r = await api(`/clients/${encodeURIComponent(saved)}/validate`, { method: 'POST' });
        setStatus(r.status);
        if (r.valid) {
          navigate(`/clients/${encodeURIComponent(saved)}`, { state: { notice: 'Saved and validated: the client is ready to build.' } });
          return;
        }
        setResult(r);
      } else {
        setStatus((s) => (s === 'ready' || !s ? 'draft' : s));
      }
      if (isNew) navigate(`/clients/${encodeURIComponent(saved)}/edit`, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const Section = SECTION_COMPONENTS[SECTIONS[section].key];
  const here = SECTIONS[section];
  const stepState = (key) => (!opened.has(key) ? 'todo' : bySection[key] ? 'fix' : 'done');
  const done = SECTIONS.filter((x) => stepState(x.key) === 'done').length;
  const percent = Math.round((done / SECTIONS.length) * 100);
  const sectionChecks = checks.filter((c) => c.section === here.key);
  const title = spec.organization.customer_name || (isNew ? 'New client' : id);

  return (
    <>
      <div className="crumbs">
        <Link to="/onboarding">Onboarding</Link>
        {!isNew && (
          <>
            {' / '}
            <Link to={`/clients/${encodeURIComponent(id)}`}>{id}</Link>
          </>
        )}
      </div>

      <div className="wizard">
        <aside className="wizard-side">
          <div className="wizard-title">
            <span className="rocket" aria-hidden="true">🚀</span>
            <span>
              <strong>Client Onboarding</strong>
              <small>{title}</small>
            </span>
          </div>
          <div className="wizard-progress">
            <div className="line">
              <span>Onboarding Progress</span>
              <strong>{percent}%</strong>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="sub">
              <span>
                {done}/{SECTIONS.length} steps
              </span>
              <span className={`state${checks.length ? '' : ' done'}`}>
                {done === SECTIONS.length && !checks.length ? 'Ready to validate' : done ? 'In progress' : 'Getting started'}
              </span>
            </div>
          </div>
          <nav className="steps" aria-label="Sections">
            {SECTIONS.map((x, i) => {
              const n = bySection[x.key] || 0;
              const st = stepState(x.key);
              return (
                <button type="button" key={x.key} className={i === section ? 'active' : ''} onClick={() => setSection(i)}>
                  <span className={`n${i === section ? '' : st === 'fix' ? ' err' : st === 'done' ? ' done' : ''}`}>
                    {i === section || st === 'todo' ? i + 1 : st === 'fix' ? '!' : '✓'}
                  </span>
                  <span>
                    {x.label}
                    <span className={`step-sub${st === 'done' ? ' ok' : st === 'todo' ? ' todo' : ''}`}>
                      {st === 'todo' ? 'Not started' : st === 'fix' ? `${n} to fix` : 'Complete'}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="wizard-main">
          <div className="wizard-head">
            <button type="button" className="sm" disabled={section === 0} onClick={() => setSection(section - 1)}>
              ← Back
            </button>
            <span className="sep" />
            <span className="step-title">{here.label}</span>
            <span className="step-pill">
              Step {section + 1} of {SECTIONS.length}
            </span>
            <span className="grow" />
            {status && <StatusBadge status={status} />}
            <button type="button" className="primary" disabled={!canSave || busy || (!dirty && !isNew)} onClick={() => run('save')}>
              {busy === 'save' ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div className="wizard-body">
            <h2>{here.label}</h2>
            <p className="lead">
              {here.lead} {dirty ? '· Unsaved changes' : isNew && !createdId ? '· Not saved yet' : '· All changes saved'}
            </p>
            <div className="stack">
              {error && <ErrorList error={error} />}
              {result && !result.valid && (
                <Alert tone="bad" title="The validator found problems">
                  <ul>
                    {result.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {!canSave && <span className="muted small">A customer ID and a company name are needed to save.</span>}
              {/* Once created, the customer ID is fixed even before the page moves to the edit address. */}
              <Section spec={spec} edit={edit} catalogue={catalogue} isNew={isNew && !createdId} />
              {sectionChecks.length > 0 && (
                <Alert tone="warn" title="To fix in this section">
                  <ul>
                    {sectionChecks.map((c) => (
                      <li key={c.message}>{c.message}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </div>
          </div>

          <div className="wizard-foot">
            <button type="button" disabled={section === 0} onClick={() => setSection(section - 1)}>
              ← Previous
            </button>
            {section < SECTIONS.length - 1 ? (
              <button type="button" className="primary" onClick={() => setSection(section + 1)}>
                Next: {SECTIONS[section + 1].label} →
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={!canSave || busy || checks.length > 0}
                title={checks.length ? `${checks.length} still to fix: see the steps marked ! or Not started` : undefined}
                onClick={() => run('validate')}
              >
                {busy === 'validate' ? 'Validating…' : 'Save & validate'}
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="below">
        {/* Only the step on screen: what is left to fix in it. */}
        <Card
          title={`Checks: ${here.label}`}
          subtitle={sectionChecks.length ? `${sectionChecks.length} to fix in this step` : 'Everything in this step is fine'}
        >
          {sectionChecks.length ? (
            <ul className="checklist">
              {sectionChecks.map((c) => (
                <li key={c.message}>
                  <span className="x">✕</span>
                  <span>{c.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="checklist">
              <li>
                <span className="v">✓</span> {checks.length ? 'This step is complete' : 'All steps complete: ready for “Save & validate”'}
              </li>
            </ul>
          )}
        </Card>
        <Card title="Summary">
          <Summary spec={spec} catalogue={catalogue} />
        </Card>
      </div>
    </>
  );
}
