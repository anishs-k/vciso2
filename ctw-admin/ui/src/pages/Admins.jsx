// CTW staff accounts: add, deactivate / reactivate, reset password, reset MFA.
// Temporary passwords are shown once, to the admin who made them.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Alert, Card, ErrorList, Loading, Modal, Text, fmtDateTime } from '../components/ui';

function TemporaryPassword({ who, password, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal
      title={`Temporary password for ${who}`}
      onClose={onClose}
      footer={
        <button type="button" className="primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <Alert tone="warn">
        Shown only now. Give it to {who} over a separate channel (not the same email as the login ID). They must
        change it, and set up multi-factor sign-in, when they first sign in.
      </Alert>
      <div className="row">
        <span className="secret" style={{ fontSize: 15 }}>{password}</span>
        <button
          type="button"
          className="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(password);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </Modal>
  );
}

function AddAdmin({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', login_id: '', email: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onCreated(await api('/admins', { method: 'POST', body: form }));
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Add a CTW admin"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={busy || !form.full_name || !form.login_id || !form.email} onClick={submit}>
            {busy ? 'Adding…' : 'Add admin'}
          </button>
        </>
      }
    >
      {error && <ErrorList error={error} />}
      <Text label="Full name" required value={form.full_name} onChange={set('full_name')} autoFocus />
      <Text label="Login ID" required value={form.login_id} onChange={set('login_id')} placeholder="firstname.lastname" />
      <Text label="Email" required type="email" value={form.email} onChange={set('email')} />
      <span className="muted small">Every admin can onboard clients, generate images and manage other admins.</span>
    </Modal>
  );
}

const ACTIONS = {
  deactivate: ['Deactivate', 'They are signed out at once and can no longer sign in. Their history stays.', 'danger'],
  activate: ['Reactivate', 'They can sign in again with their current password and MFA.', 'primary'],
  'reset-password': ['Reset password', 'They are signed out and get a temporary password, shown to you once.', 'primary'],
  'reset-mfa': ['Reset MFA', 'For a lost phone: they are signed out and set up multi-factor sign-in again at their next sign-in.', 'primary'],
};

export default function AdminsPage() {
  const { admin: me } = useAuth();
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [shown, setShown] = useState(null); // { who, password }
  const [ask, setAsk] = useState(null); // { admin, action }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/admins').then(setAdmins).catch(setError), []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async () => {
    const { admin, action } = ask;
    setBusy(true);
    setError(null);
    try {
      const r = await api(`/admins/${admin.admin_id}/${action}`, { method: 'POST' });
      if (r.temporary_password) setShown({ who: admin.full_name, password: r.temporary_password });
      setAsk(null);
      await load();
    } catch (err) {
      setError(err);
      setAsk(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Admins</h1>
          <p>CyberTrustWorks staff who can use CTW Admin.</p>
        </div>
        <button type="button" className="primary" onClick={() => setAdding(true)}>
          + Add admin
        </button>
      </div>
      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorList error={error} />
        </div>
      )}
      <Card padded={false}>
        {!admins ? (
          <Loading what="Loading admins" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Status</th>
                  <th>Sign-in</th>
                  <th>Last sign-in</th>
                  <th>Added</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const self = a.admin_id === me.admin_id;
                  return (
                    <tr key={a.admin_id}>
                      <td>
                        <strong>{a.full_name}</strong> {self && <span className="badge info">You</span>}
                        <div className="muted small">
                          <span className="mono">{a.login_id}</span> · {a.email}
                        </div>
                      </td>
                      <td>{a.active ? <span className="badge ok">Active</span> : <span className="badge neutral">Deactivated</span>}</td>
                      <td className="small">
                        {a.mfa_enabled ? <span className="badge ok">MFA on</span> : <span className="badge warn">No MFA yet</span>}
                        {a.must_change_password && <div className="muted">temporary password</div>}
                      </td>
                      <td className="small">{fmtDateTime(a.last_login_at)}</td>
                      <td className="small">
                        {fmtDateTime(a.created_at)}
                        {a.created_by_login && <div className="muted">by {a.created_by_login}</div>}
                      </td>
                      <td>
                        {!self && (
                          <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                            {a.active ? (
                              <>
                                <button type="button" className="sm" onClick={() => setAsk({ admin: a, action: 'reset-password' })}>
                                  Reset password
                                </button>
                                {a.mfa_enabled && (
                                  <button type="button" className="sm" onClick={() => setAsk({ admin: a, action: 'reset-mfa' })}>
                                    Reset MFA
                                  </button>
                                )}
                                <button type="button" className="sm link-danger" onClick={() => setAsk({ admin: a, action: 'deactivate' })}>
                                  Deactivate
                                </button>
                              </>
                            ) : (
                              <button type="button" className="sm" onClick={() => setAsk({ admin: a, action: 'activate' })}>
                                Reactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && (
        <AddAdmin
          onClose={() => setAdding(false)}
          onCreated={(r) => {
            setAdding(false);
            setShown({ who: r.admin.full_name, password: r.temporary_password });
            load();
          }}
        />
      )}
      {shown && <TemporaryPassword who={shown.who} password={shown.password} onClose={() => setShown(null)} />}
      {ask && (
        <Modal
          title={`${ACTIONS[ask.action][0]}: ${ask.admin.full_name}`}
          onClose={() => setAsk(null)}
          footer={
            <>
              <button type="button" onClick={() => setAsk(null)}>
                Cancel
              </button>
              <button type="button" className={ACTIONS[ask.action][2]} disabled={busy} onClick={act}>
                {busy ? 'Working…' : ACTIONS[ask.action][0]}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{ACTIONS[ask.action][1]}</p>
        </Modal>
      )}
    </>
  );
}
