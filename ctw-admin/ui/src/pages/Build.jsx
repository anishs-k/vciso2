// One build: live progress and log while it runs; then the files to hand over and, for a full build,
// the initial users' one-time passwords (shown once).
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, download } from '../api';
import { Alert, Card, ErrorList, Loading, Modal, StatusBadge, fmtBytes, fmtDateTime } from '../components/ui';

const STEPS = {
  full: ['Client spec from the CTW database', 'Bundle: validate, seal, schema, compose', 'Docker image', 'Image file'],
  image_only: ['Instance of the base build', 'Docker image', 'Image file'],
};

const FILE_INFO = {
  'vciso-platform': 'Docker image (docker load -i …)',
  '_init.sql': 'Database: tables, licence, catalogue, users (passwords hashed)',
  'docker-compose.yml': 'Starts the database and the platform',
  'README.md': 'Deployment guide for the client',
  'UPGRADE.md': 'How to apply this update',
  'instance.json': 'Identity of this instance (already inside the image)',
  'client_spec.json': 'The sealed spec this was built from (CTW record)',
  'build.log': 'Full build log (CTW record)',
};
const describe = (name) =>
  FILE_INFO[name] || FILE_INFO[Object.keys(FILE_INFO).find((k) => name.startsWith(k) || name.endsWith(k))] || '';

function LogView({ text, live }) {
  const ref = useRef(null);
  const stick = useRef(true);
  useEffect(() => {
    if (ref.current && stick.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);
  const lines = text.split('\n');
  return (
    <pre
      className="log"
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
      aria-live={live ? 'polite' : undefined}
    >
      {lines.map((l, i) => {
        const cls = /^== /.test(l) ? 'h' : /^SUCCESS/.test(l) ? 'ok' : /^FAILED/.test(l) ? 'bad'
          : /WARNING|note:/.test(l) ? 'warn' : '';
        return (
          <span key={i} className={cls}>
            {l}
            {'\n'}
          </span>
        );
      })}
    </pre>
  );
}

function Progress({ build, log }) {
  const names = STEPS[build.build_type] || [];
  const started = (log.match(/^== /gm) || []).length;
  return (
    <ol className="progress">
      {names.map((name, i) => {
        let state = '';
        if (build.status === 'success' || i < started - 1) state = 'done';
        else if (i === started - 1) state = build.status === 'failed' ? 'fail' : 'now';
        return (
          <li key={name} className={state}>
            <span className="dot">{state === 'done' ? '✓' : state === 'fail' ? '✕' : i + 1}</span>
            <span className={state ? '' : 'muted'}>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Credentials({ build }) {
  const [creds, setCreds] = useState(null);
  const [error, setError] = useState(null);
  const [asking, setAsking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(null);

  const reveal = async () => {
    setAsking(false);
    try {
      const r = await api(`/builds/${build.build_id}/credentials`, { method: 'POST' });
      setCreds(r.credentials);
    } catch (err) {
      setError(err);
    }
  };
  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied('failed');
    }
  };

  if (saved) {
    return (
      <Card title="One-time passwords">
        <Alert tone="ok">Passwords handed over. They are not stored anywhere in CTW Admin.</Alert>
      </Card>
    );
  }
  return (
    <Card title="One-time passwords" subtitle="For the client's initial users. Each must change it at first sign-in.">
      {error && <ErrorList error={error} />}
      {!creds && !error && (
        <div className="stack">
          <Alert tone="warn">
            They can be shown <strong style={{ display: 'inline' }}>once</strong>, and only within an hour of the
            build. CTW Admin does not keep them: copy them into the handover now, and send them to the client
            separately from the image.
          </Alert>
          <div>
            <button type="button" className="primary" onClick={() => setAsking(true)}>
              Show passwords
            </button>
          </div>
        </div>
      )}
      {creds && (
        <div className="stack">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Login ID</th>
                  <th>Role</th>
                  <th>One-time password</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {creds.map((c) => (
                  <tr key={c.login_id}>
                    <td className="mono">{c.login_id}</td>
                    <td>{c.role_type}</td>
                    <td>
                      <span className="secret">{c.password}</span>
                    </td>
                    <td>
                      <button type="button" className="sm" onClick={() => copy(c.password, c.login_id)}>
                        {copied === c.login_id ? 'Copied' : 'Copy'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button
              type="button"
              onClick={() => copy(creds.map((c) => `${c.login_id}\t${c.role_type}\t${c.password}`).join('\n'), 'all')}
            >
              {copied === 'all' ? 'Copied' : 'Copy all'}
            </button>
            {copied === 'failed' && <span className="muted small">The browser blocked copying: select the text instead.</span>}
            <div style={{ flex: 1 }} />
            <label className="check">
              <input type="checkbox" onChange={(e) => e.target.checked && setSaved(true)} />
              <span>I have saved them: hide</span>
            </label>
          </div>
        </div>
      )}
      {asking && (
        <Modal
          title="Show the one-time passwords?"
          onClose={() => setAsking(false)}
          footer={
            <>
              <button type="button" onClick={() => setAsking(false)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={reveal}>
                Show now
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            After this they cannot be shown again. If they are lost, the only way to new passwords is a new full build,
            which means a new database for the client.
          </p>
        </Modal>
      )}
    </Card>
  );
}

export default function BuildPage() {
  const { id } = useParams();
  const [build, setBuild] = useState(null);
  const [log, setLog] = useState('');
  const [error, setError] = useState(null);
  const [dlError, setDlError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const logLength = useRef(0);

  useEffect(() => {
    let stop = false;
    let timer;
    logLength.current = 0;
    setLog('');
    const poll = async () => {
      try {
        const b = await api(`/builds/${id}?log_from=${logLength.current}`);
        if (stop) return;
        logLength.current = b.log_length;
        setLog((l) => l + b.log);
        setBuild(b);
        if (b.status === 'queued' || b.status === 'running') timer = setTimeout(poll, 1500);
      } catch (err) {
        if (!stop) setError(err);
      }
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (error) return <Alert tone="bad">{error.message}</Alert>;
  if (!build) return <Loading what="Loading the build" />;

  const live = build.status === 'queued' || build.status === 'running';
  const get = async (name) => {
    setDownloading(name);
    setDlError(null);
    try {
      await download(`/builds/${build.build_id}/files/${encodeURIComponent(name)}`, name);
    } catch (err) {
      setDlError(err);
    } finally {
      setDownloading(null);
    }
  };
  const deliverables = build.files.filter((f) => !['client_spec.json', 'build.log', 'instance.json'].includes(f));
  const records = build.files.filter((f) => !deliverables.includes(f));
  const isFull = build.build_type === 'full';

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <div className="crumbs">
            <Link to="/clients">Clients</Link> / <Link to={`/clients/${encodeURIComponent(build.customer_id)}`}>{build.customer_id}</Link> / build v{build.version}
          </div>
          <h1>
            Build v{build.version} · {isFull ? 'Full' : 'Image only'}
          </h1>
          <p>
            <StatusBadge kind="build" status={build.status} /> started {fmtDateTime(build.started_at || build.created_at)}
            {build.finished_at && ` · finished ${fmtDateTime(build.finished_at)}`}
          </p>
        </div>
      </div>

      <div className="stack">
        {build.status === 'failed' && <Alert tone="bad" title="The build failed">{build.error}</Alert>}
        {build.files_removed_at && (
          <Alert tone="info" title="Files removed">
            The files of this build were removed on {fmtDateTime(build.files_removed_at)} to free disk space. Its record and
            log stay below.
          </Alert>
        )}
        {build.status === 'success' && !build.files_removed_at && (
          <Alert tone="ok" title="Image ready">
            {isFull
              ? 'Hand the files below to the client together with the passwords (sent separately). Their database is created from the SQL on first start.'
              : 'A platform update: the client loads the image and restarts the platform with the new compose file. Their database is kept.'}
          </Alert>
        )}

        <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)' }}>
          <Card title="Progress">
            <div className="stack">
              <Progress build={build} log={log} />
              {build.status === 'success' && (
                <dl className="facts small">
                  <dt>Image</dt>
                  <dd className="mono">{build.image_tag}</dd>
                  <dt>Size</dt>
                  <dd>{fmtBytes(build.image_size_bytes)}</dd>
                  <dt>Instance</dt>
                  <dd className="mono">{build.instance_id}</dd>
                  <dt>Licence seal</dt>
                  <dd className="mono">{build.licence_seal?.slice(0, 16)}…</dd>
                </dl>
              )}
            </div>
          </Card>
          <Card title="Log" padded={false} actions={live && <span className="muted small">live</span>}>
            <LogView text={log || 'Waiting for the build to start…'} live={live} />
          </Card>
        </div>

        {build.status === 'success' && !build.files_removed_at && (
          <div className="grid-2">
            <Card title="Files for the client" subtitle="Send these to the client.">
              <div className="stack">
                {dlError && <ErrorList error={dlError} />}
                {deliverables.map((f) => (
                  <div className="row" key={f} style={{ flexWrap: 'nowrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono">{f}</div>
                      <div className="muted small">{describe(f)}</div>
                    </div>
                    <button type="button" className="sm" disabled={downloading} onClick={() => get(f)}>
                      {downloading === f ? 'Downloading…' : 'Download'}
                    </button>
                  </div>
                ))}
                {records.length > 0 && (
                  <>
                    <div className="muted small" style={{ marginTop: 6 }}>CTW records</div>
                    {records.map((f) => (
                      <div className="row" key={f} style={{ flexWrap: 'nowrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="mono">{f}</div>
                          <div className="muted small">{describe(f)}</div>
                        </div>
                        <button type="button" className="sm" disabled={downloading} onClick={() => get(f)}>
                          {downloading === f ? 'Downloading…' : 'Download'}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
            {isFull ? (
              <Credentials build={build} />
            ) : (
              <Card title="At the client">
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Back up the database and the <code>vciso_data</code> volume.</li>
                  <li>
                    <code>docker load -i {build.files.find((f) => f.endsWith('.tar.gz'))}</code>
                  </li>
                  <li>Replace <code>docker-compose.yml</code> with the new one (only the image changed).</li>
                  <li>
                    <code>docker compose up -d api</code>, then check <code>/api/health</code> shows linked.
                  </li>
                </ol>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
