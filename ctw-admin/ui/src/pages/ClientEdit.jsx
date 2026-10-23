// New client / edit client: the nine sections, a summary and live checks beside them.
// "Save" stores whatever is there (a draft); "Save & validate", on the last step, also runs the intake
// validator on the server, which is what makes a client ready to build. It is enabled only once every
// check passes.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { applyQuestionnaire } from '../lib/questionnaire';
import { Alert, Card, ErrorList, Icon, Loading, StatusBadge, fmtDate } from '../components/ui';
import { SECTION_COMPONENTS } from '../components/sections';
import { SECTIONS, checkSpec } from '../lib/checks';
import { emptySpec, firstContractStart, lastContractEnd, normalize, toPayload } from '../lib/spec';
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
      <dt>Contracts</dt>
      <dd>
        {spec.contracts.length ? `${spec.contracts.length}: ${fmtDate(firstContractStart(spec))} – ${fmtDate(lastContractEnd(spec))}` : '—'}
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
  // After a new client's first save the page moves to its edit address (a new page): the step on screen and
  // the steps passed come along.
  const carried = useLocation().state?.wizard;
  const { catalogue, error: catError } = useCatalogue();
  const [spec, setSpec] = useState(isNew ? emptySpec() : null);
  const [status, setStatus] = useState(isNew ? null : undefined);
  const [section, setSection] = useState(carried?.section || 0);
  const fileInput = useRef(null);
  const [imported, setImported] = useState(null); // { file, notes } after a questionnaire upload
  // Steps the admin has opened. A step counts as complete only once opened and free of problems, so a new
  // client starts at 0%; a saved client's steps hold what was entered, so they all count as opened.
  const [opened, setOpened] = useState(() => new Set(isNew ? [] : SECTIONS.map((x) => x.key)));
  useEffect(() => {
    setOpened((o) => (o.has(SECTIONS[section].key) ? o : new Set([...o, SECTIONS[section].key])));
  }, [section]);
  // Steps left with "Next" while free of problems. Only these count as complete and open the step after
  // them, for a saved client too: every step is confirmed with "Next", however much is already filled in.
  const [passed, setPassed] = useState(() => new Set(carried?.passed || []));
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
  // A new client's customer ID, checked against the CTW database as it is typed: { id, usedBy } when another
  // client has it.
  const typedId = isNew && !createdId ? spec?.organization.customer_id?.trim() || '' : '';
  const [idTaken, setIdTaken] = useState(null);
  useEffect(() => {
    setIdTaken(null);
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(typedId)) return undefined;
    let stale = false;
    const t = setTimeout(() => {
      api(`/clients/id-check?customer_id=${encodeURIComponent(typedId)}`)
        .then((r) => !stale && r.taken && setIdTaken({ id: typedId, usedBy: r.used_by }))
        .catch(() => {}); // the save refuses a taken ID anyway
    }, 400);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [typedId]);
  const checks = useMemo(() => {
    const out = spec ? checkSpec(spec, countries || []) : [];
    if (idTaken && idTaken.id === typedId) {
      const u = idTaken.usedBy;
      out.unshift({ section: 'organization', message: `Customer ID ${typedId} is already used by ${u.customer_name} (${u.customer_id}): choose another` });
    }
    return out;
  }, [spec, countries, idTaken, typedId]);
  const bySection = useMemo(() => {
    const m = {};
    checks.forEach((c) => (m[c.section] = (m[c.section] || 0) + 1));
    return m;
  }, [checks]);

  if (loadError) return <Alert tone="bad">{loadError.message}</Alert>;
  if (catError) return <Alert tone="bad">{catError.message}</Alert>;
  if (!spec || !catalogue) return <Loading what="Loading the client" />;

  const cid = spec.organization.customer_id;
  const canSave = /^[A-Za-z0-9_-]{3,32}$/.test(cid) && spec.organization.customer_name.trim() && !(idTaken && idTaken.id === typedId);

  // Saves the spec; returns the customer ID it is stored under. A new client is created once: if a later
  // step fails (validation, the network), the next save updates it instead of creating it again.
  const save = async () => {
    const body = toPayload(spec);
    const existing = isNew ? createdId : id;
    const r = existing
      ? await api(`/clients/${encodeURIComponent(existing)}`, { method: 'PUT', body })
      : await api('/clients', { method: 'POST', body });
    if (!existing) setCreatedId(cid);
    // The API gives a contract without an ID its <office ID>_C<NNN>.
    const ids = new Map((r.contracts || []).map((k) => [k.office_id, k.contract_id]));
    setSpec((s) => ({ ...s, contracts: s.contracts.map((k) => ({ ...k, contract_id: ids.get(k.office_id) || k.contract_id })) }));
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
      if (isNew) {
        navigate(`/clients/${encodeURIComponent(saved)}/edit`, { replace: true, state: { wizard: { section, passed: [...passed] } } });
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const Section = SECTION_COMPONENTS[SECTIONS[section].key];
  const here = SECTIONS[section];
  // done: confirmed with Next (the last step, which has no Next: opened) and free of problems.
  const confirmed = (key) => (key === SECTIONS.at(-1).key ? opened.has(key) : passed.has(key));
  const stepState = (key) => (!opened.has(key) ? 'todo' : bySection[key] ? 'fix' : confirmed(key) ? 'done' : 'open');
  const done = SECTIONS.filter((x) => stepState(x.key) === 'done').length;
  const percent = Math.round((done / SECTIONS.length) * 100);
  const sectionChecks = checks.filter((c) => c.section === here.key);
  const title = spec.organization.customer_name || (isNew ? 'New client' : id);
  // The steps are filled in order: a step opens only once every step before it is done.
  const reachable = (i) => SECTIONS.slice(0, i).every((x) => stepState(x.key) === 'done');
  const next = () => {
    setPassed((p) => new Set([...p, here.key]));
    setSection(section + 1);
  };

  // A filled-in client questionnaire replaces what the form holds (not the customer or contract ID).
  // Nothing counts as done afterwards: each step is still checked and confirmed with Next.
  const canImport = /^[A-Za-z0-9_-]{3,32}$/.test(cid);
  const upload = async (file) => {
    if (!file) return;
    const filled = spec.organization.customer_name || spec.organization.offices.length || spec.initial_users.length;
    if (filled && !window.confirm('The questionnaire replaces the details already in the form. Go on?')) return;
    setBusy('upload');
    setError(null);
    setImported(null);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] || '');
        r.onerror = () => reject(new Error('The file could not be read'));
        r.readAsDataURL(file);
      });
      const { answers, warnings } = await api('/questionnaire/read', { method: 'POST', body: { file: base64 } });
      const { spec: filledIn, notes } = applyQuestionnaire(spec, answers, catalogue);
      setSpec(filledIn);
      setDirty(true);
      setResult(null);
      setPassed(new Set());
      setSection(0);
      setImported({ file: file.name, notes: [...warnings, ...notes] });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

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
            <span className="rocket" aria-hidden="true"><Icon name="clipboard" size={20} /></span>
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
              const locked = !reachable(i);
              return (
                <button
                  type="button"
                  key={x.key}
                  className={i === section ? 'active' : ''}
                  disabled={locked}
                  title={locked ? 'Complete the steps before this one first' : undefined}
                  onClick={() => setSection(i)}
                >
                  <span className={`n${i === section ? '' : st === 'fix' && !locked ? ' err' : st === 'done' && !locked ? ' done' : ''}`}>
                    {i === section ? i + 1 : locked ? <Icon name="lock" size={13} /> : st === 'done' ? '✓' : st === 'fix' ? '!' : i + 1}
                  </span>
                  <span>
                    {x.label}
                    <span className={`step-sub${st === 'done' && !locked ? ' ok' : st === 'fix' && !locked ? '' : ' todo'}`}>
                      {locked ? 'Locked' : { todo: 'Not started', open: 'Press Next to complete', fix: `${n} to fix`, done: 'Complete' }[st]}
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
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(e) => {
                upload(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={!canImport || busy}
              title={canImport ? 'Fill the form from a client questionnaire (.xlsx)' : 'Enter the customer ID first (Organisation step)'}
              onClick={() => fileInput.current?.click()}
            >
              {busy === 'upload' ? 'Uploading…' : '⬆ Upload'}
            </button>
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
              {imported && (
                <Alert tone={imported.notes.length ? 'warn' : 'ok'} title={`Filled in from ${imported.file}`}>
                  Check each step and press Next to confirm it.
                  {imported.notes.length > 0 && (
                    <ul>
                      {imported.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  )}
                </Alert>
              )}
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
              <Section spec={spec} edit={edit} catalogue={catalogue} isNew={isNew && !createdId} idError={idTaken && idTaken.id === typedId ? checks[0].message : null} />
              {sectionChecks.length > 0 && (
                <Alert tone="warn" title="Fill in or correct these to go to the next step">
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
              <button
                type="button"
                className="primary"
                disabled={sectionChecks.length > 0}
                title={sectionChecks.length ? `${sectionChecks.length} to fix in this step first` : undefined}
                onClick={next}
              >
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
