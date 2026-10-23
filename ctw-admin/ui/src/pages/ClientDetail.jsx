// One client: what is on record, "Generate Docker Image" (full / image-only) and its build history.
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Alert, Card, ErrorList, Loading, Modal, StatusBadge, fmtBytes, fmtDate, fmtDateTime } from '../components/ui';
import { useCatalogue } from '../lib/catalogue';

const FREQ = { M: 'Monthly', Q: 'Quarterly', H: 'Half-yearly', Y: 'Yearly' };

function Overview({ spec, catalogue }) {
  const o = spec.organization;
  const contracts = spec.contracts || [];
  const l = spec.licensing_limits;
  const names = new Map(catalogue.frameworks.map((f) => [f.framework_id, f.framework_name]));
  const offices = new Map(o.offices.map((x) => [x.office_id, x.city || x.office_id]));
  return (
    <div className="grid-3">
      <Card title="Organisation">
        <dl className="facts">
          <dt>Category</dt>
          <dd>{o.category}</dd>
          <dt>Industry</dt>
          <dd>{o.industry}</dd>
          <dt>Domain</dt>
          <dd>{o.primary_domain}</dd>
          <dt>Offices</dt>
          <dd>{o.offices.map((x) => `${x.city} (${x.office_type})`).join(', ') || '—'}</dd>
          <dt>Contacts</dt>
          <dd>{o.contacts.length}</dd>
        </dl>
      </Card>
      <Card title={contracts.length > 1 ? `Contracts (${contracts.length})` : 'Contract'}>
        {contracts.length ? (
          contracts.map((k) => (
            <dl className="facts" key={k.contract_id}>
              <dt>Contract</dt>
              <dd>
                <span className="mono">{k.contract_id}</span> <span className="muted">({offices.get(k.office_id) || k.office_id}{k.contract_type ? `, ${k.contract_type}` : ''})</span>
              </dd>
              <dt>PO</dt>
              <dd>{k.customer_ref_po}</dd>
              <dt>Period</dt>
              <dd>
                {fmtDate(k.contract_start_date)} – {fmtDate(k.contract_end_date)}
              </dd>
              <dt>Value</dt>
              <dd>
                {Number(k.contract_value || 0).toLocaleString('en-IN')} {k.currency}
              </dd>
              <dt>Invoicing</dt>
              <dd>{FREQ[k.invoicing_frequency] || k.invoicing_frequency}</dd>
            </dl>
          ))
        ) : (
          <span className="muted">No contract yet.</span>
        )}
      </Card>
      <Card title="Licence">
        {l ? (
          <dl className="facts">
            <dt>Users</dt>
            <dd>
              {l.max_users} (vCISOs {l.max_vcisos}, Org Owners {l.max_org_owners}, IT Admins {l.max_it_admins ?? '—'})
            </dd>
            <dt>Control owners</dt>
            <dd>{l.max_control_owners ?? '—'}</dd>
            <dt>Integrations</dt>
            <dd>{l.max_api_integrations}</dd>
            <dt>Valid till</dt>
            <dd>{fmtDate(l.valid_to)}</dd>
            <dt>Modules</dt>
            <dd>{(spec.enabled_modules || []).join(', ')}</dd>
          </dl>
        ) : (
          <span className="muted">No licence yet.</span>
        )}
      </Card>
      <Card title="Frameworks">
        {(spec.selected_frameworks || []).length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {spec.selected_frameworks.map((f) => (
              <li key={f.framework_id}>
                {names.get(f.framework_id) || `#${f.framework_id}`}
                <span className="muted small">
                  {' '}· {f.office_ids.map((x) => offices.get(x) || x).join(', ')}
                  {f.review_frequency_months ? ` · review every ${f.review_frequency_months} months` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted">None selected.</span>
        )}
      </Card>
      <Card title="Initial users">
        {spec.initial_users.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {spec.initial_users.map((u) => (
              <li key={u.user_id}>
                {u.user_name} <span className="muted small">· {u.role_type} · {u.login_id}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted">None yet.</span>
        )}
      </Card>
      <Card title="Integrations & sign-in">
        <dl className="facts">
          <dt>Tools</dt>
          <dd>{spec.integrations?.tools?.filter((t) => t.enabled).map((t) => t.tool_name).join(', ') || '—'}</dd>
          <dt>Sign-in</dt>
          <dd>{spec.security_policies?.sso_type || 'LOCAL'}</dd>
          <dt>MFA</dt>
          <dd>{spec.security_policies?.mfa_enforced ? 'On' : 'Off'}</dd>
        </dl>
      </Card>
    </div>
  );
}

function BuildChoice({ title, description, option, children, button, onStart, disabled }) {
  return (
    <div className="pick" style={{ flexDirection: 'column', gap: 10 }}>
      <div>
        <h3>{title}</h3>
        <div className="muted small">{description}</div>
      </div>
      {!option.allowed && option.reason && <Alert tone="info">{option.reason}</Alert>}
      {children}
      <div>
        <button type="button" className="primary" disabled={!option.allowed || disabled} onClick={onStart}>
          {button}
        </button>
      </div>
    </div>
  );
}

function ConfirmFull({ client, warning, onCancel, onConfirm, busy }) {
  const [typed, setTyped] = useState('');
  return (
    <Modal
      title="Full build: new instance"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger" disabled={typed !== client.customer_id || busy} onClick={onConfirm}>
            {busy ? 'Starting…' : 'Start full build'}
          </button>
        </>
      }
    >
      <Alert tone="warn">{warning}</Alert>
      <p style={{ margin: 0 }}>
        Use a full build only when the licence or the database must change. For a platform update, use
        <strong> Update image only</strong>.
      </p>
      <label className="field">
        <span className="small">
          Type <span className="mono">{client.customer_id}</span> to confirm
        </span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
      </label>
    </Modal>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { catalogue } = useCatalogue();
  const [client, setClient] = useState(null);
  const [options, setOptions] = useState(null);
  const [builds, setBuilds] = useState(null);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [askCleanup, setAskCleanup] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || null);

  const load = useCallback(() => {
    const enc = encodeURIComponent(id);
    return Promise.all([api(`/clients/${enc}`), api(`/clients/${enc}/build-options`), api(`/clients/${enc}/builds`)])
      .then(([c, o, b]) => {
        setClient(c);
        setOptions(o);
        setBuilds(b);
      })
      .catch(setError);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert tone="bad">{error.message}</Alert>;
  if (!client || !options || !builds || !catalogue) return <Loading what="Loading the client" />;

  const enc = encodeURIComponent(id);
  const active = builds.find((b) => b.status === 'queued' || b.status === 'running');

  const validate = async () => {
    setBusy('validate');
    setActionError(null);
    setNotice(null);
    try {
      const r = await api(`/clients/${enc}/validate`, { method: 'POST' });
      if (r.valid) setNotice('The client is valid and ready to build.');
      else setActionError({ message: 'The validator found problems', body: { errors: r.errors } });
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(null);
    }
  };

  const start = async (type) => {
    setBusy(type);
    setActionError(null);
    try {
      const b = await api(`/clients/${enc}/builds`, {
        method: 'POST',
        body: { build_type: type, confirm_new_instance: type === 'full' && options.full.needs_confirm },
      });
      navigate(`/builds/${b.build_id}`);
    } catch (err) {
      setActionError(err);
      setBusy(null);
      setConfirm(false);
      load();
    }
  };

  const diskUsed = builds.reduce((n, b) => n + (b.disk_bytes || 0), 0);
  const removable = builds.filter((b) => !b.kept_because && !b.files_removed_at && b.disk_bytes > 0 && !['queued', 'running'].includes(b.status));

  const removeFiles = async (b) => {
    setBusy('remove');
    setActionError(null);
    try {
      const r = await api(`/builds/${b.build_id}/files`, { method: 'DELETE' });
      setNotice(`Removed the files of v${b.version}: ${fmtBytes(r.freed_bytes)} freed. Its record and log stay.`);
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(null);
    }
  };

  const cleanup = async () => {
    setBusy('cleanup');
    setActionError(null);
    try {
      const r = await api(`/clients/${enc}/builds/cleanup`, { method: 'POST' });
      setNotice(`Removed the files of ${r.removed} build${r.removed === 1 ? '' : 's'}: ${fmtBytes(r.freed_bytes)} freed.`);
      setAskCleanup(false);
      await load();
    } catch (err) {
      setActionError(err);
      setAskCleanup(false);
    } finally {
      setBusy(null);
    }
  };

  const spec = client.spec;
  return (
    <>
      <div className="page-head">
        <div className="grow">
          <div className="crumbs">
            <Link to="/clients">Clients</Link> / <span className="mono">{client.customer_id}</span>
          </div>
          <h1>{spec.organization.customer_name}</h1>
          <p>
            <StatusBadge status={client.status} /> <span className="mono">{client.customer_id}</span> · updated{' '}
            {fmtDateTime(client.updated_at)}
          </p>
        </div>
        <div className="row">
          {client.status === 'draft' && (
            <button type="button" disabled={busy} onClick={validate}>
              {busy === 'validate' ? 'Validating…' : 'Validate'}
            </button>
          )}
          <button type="button" onClick={() => navigate(`/clients/${enc}/edit`)}>
            Edit client
          </button>
        </div>
      </div>

      <div className="stack">
        {notice && <Alert tone="ok">{notice}</Alert>}
        {actionError && <ErrorList error={actionError} />}

        <Card title="Generate Docker Image" subtitle="Builds the client's platform image (UI + API) and its deployment files.">
          {active ? (
            <Alert tone="info" title={`Build v${active.version} is ${active.status}`}>
              <Link to={`/builds/${active.build_id}`}>Follow it →</Link>
            </Alert>
          ) : (
            <div className="grid-2">
              <BuildChoice
                title="Full build"
                description="New database schema, instance and one-time passwords. For the first delivery, or when the licence changes."
                option={options.full}
                button="Generate full build"
                disabled={busy}
                onStart={() => (options.full.needs_confirm ? setConfirm(true) : start('full'))}
              >
                {options.full.allowed && options.full.warning && <Alert tone="warn">{options.full.warning}</Alert>}
              </BuildChoice>
              <BuildChoice
                title="Update image only"
                description="New platform version for the instance already delivered. The client keeps its database, users and data."
                option={options.image_only}
                button="Update image only"
                disabled={busy}
                onStart={() => start('image_only')}
              >
                {options.image_only.base_build && (
                  <span className="small muted">
                    Based on build v{options.image_only.base_build.version} · instance{' '}
                    <span className="mono">{options.image_only.base_build.instance_id.slice(0, 8)}…</span>
                  </span>
                )}
                {options.image_only.allowed && options.image_only.unapplied_changes.length > 0 && (
                  <Alert tone="warn" title="Not carried by an image-only update">
                    Changes since v{options.image_only.base_build.version} to{' '}
                    {options.image_only.unapplied_changes.map((c) => c.label).join(', ')}. They live in the client's
                    database and need a full build.
                  </Alert>
                )}
              </BuildChoice>
            </div>
          )}
        </Card>

        <Overview spec={spec} catalogue={catalogue} />

        <Card
          title="Build history"
          subtitle={diskUsed ? `Build files use ${fmtBytes(diskUsed)} on the CTW build machine.` : undefined}
          padded={false}
          actions={
            removable.length > 0 && (
              <button type="button" className="sm" disabled={busy} onClick={() => setAskCleanup(true)}>
                Free disk space ({fmtBytes(removable.reduce((n, b) => n + b.disk_bytes, 0))})
              </button>
            )
          }
        >
          {!builds.length ? (
            <div className="empty">No builds yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Image</th>
                    <th>Size</th>
                    <th>By</th>
                    <th>Finished</th>
                    <th>Files</th>
                  </tr>
                </thead>
                <tbody>
                  {builds.map((b) => (
                    <tr key={b.build_id} className="clickable" onClick={() => navigate(`/builds/${b.build_id}`)}>
                      <td>
                        <Link to={`/builds/${b.build_id}`} onClick={(e) => e.stopPropagation()}>
                          v{b.version}
                        </Link>
                      </td>
                      <td>{b.build_type === 'full' ? 'Full' : 'Image only'}</td>
                      <td>
                        <StatusBadge kind="build" status={b.status} />
                      </td>
                      <td className="mono small">{b.image_tag || '—'}</td>
                      <td className="small">{fmtBytes(b.image_size_bytes)}</td>
                      <td className="small">{b.requested_by_login || '—'}</td>
                      <td className="small">{fmtDateTime(b.finished_at)}</td>
                      <td className="small" onClick={(e) => e.stopPropagation()}>
                        {b.files_removed_at ? (
                          <span className="muted">removed</span>
                        ) : b.kept_because ? (
                          <span className="muted" title={`Kept: ${b.kept_because}`}>
                            {fmtBytes(b.disk_bytes)} · kept
                          </span>
                        ) : b.disk_bytes > 0 ? (
                          <button type="button" className="sm link-danger" disabled={busy} onClick={() => removeFiles(b)}>
                            Remove {fmtBytes(b.disk_bytes)}
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {askCleanup && (
        <Modal
          title="Free disk space"
          onClose={() => setAskCleanup(false)}
          footer={
            <>
              <button type="button" onClick={() => setAskCleanup(false)}>
                Cancel
              </button>
              <button type="button" className="danger" disabled={busy} onClick={cleanup}>
                {busy === 'cleanup' ? 'Removing…' : `Remove files of ${removable.length} build${removable.length === 1 ? '' : 's'}`}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            Removes the image and bundle files of {removable.map((b) => `v${b.version}`).join(', ')}. Their records and logs
            stay, but the files cannot be downloaded again. Kept: the last full build (image-only updates start from it) and
            the latest build.
          </p>
        </Modal>
      )}
      {confirm && (
        <ConfirmFull
          client={client}
          warning={options.full.warning}
          busy={busy === 'full'}
          onCancel={() => setConfirm(false)}
          onConfirm={() => start('full')}
        />
      )}
    </>
  );
}
