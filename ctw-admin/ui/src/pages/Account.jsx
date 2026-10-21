// The signed-in admin's own account: password, multi-factor sign-in, sessions. An admin with a temporary
// password or without MFA (when it is required) is sent here and can use nothing else until done.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api, session } from '../api';
import { useAuth } from '../auth';
import { Alert, Card, ErrorList, Text } from '../components/ui';

const MIN_PASSWORD = 12;

function PasswordCard({ required }) {
  const { adoptSession } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const problem =
    next && next.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters` : again && next !== again ? 'The two new passwords differ' : null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api('/auth/password', { method: 'POST', body: { current_password: current, new_password: next } });
      setCurrent('');
      setNext('');
      setAgain('');
      setDone(true);
      await adoptSession(r.token);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Password" subtitle={required ? 'Your password is temporary: choose your own to continue.' : 'Changing it signs you out on other devices.'}>
      <form className="stack" onSubmit={submit} style={{ maxWidth: 420 }}>
        {done && <Alert tone="ok">Password changed.</Alert>}
        {error && <ErrorList error={error} />}
        <Text label={required ? 'Temporary password' : 'Current password'} type="password" value={current} onChange={setCurrent} autoComplete="current-password" required />
        <Text
          label="New password"
          type="password"
          value={next}
          onChange={(v) => {
            setNext(v);
            setDone(false);
          }}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters, not containing your login ID. A passphrase works well.`}
          required
        />
        <Text label="New password again" type="password" value={again} onChange={setAgain} autoComplete="new-password" required />
        {problem && <span className="small" style={{ color: 'var(--bad)' }}>{problem}</span>}
        <div>
          <button type="submit" className="primary" disabled={busy || !current || !next || next !== again || next.length < MIN_PASSWORD}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </Card>
  );
}

function RecoveryCodes({ codes, onDone }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="stack">
      <Alert tone="warn" title="Save your recovery codes now">
        Each one signs you in once if you lose your phone. They are shown only this time: keep them in your password
        manager, not on the phone.
      </Alert>
      <div className="grid-2" style={{ maxWidth: 360, gap: 8 }}>
        {codes.map((c) => (
          <span key={c} className="secret" style={{ textAlign: 'center' }}>
            {c}
          </span>
        ))}
      </div>
      <div className="row">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(codes.join('\n'));
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy codes'}
        </button>
        <button type="button" className="primary" onClick={onDone}>
          I have saved them
        </button>
      </div>
    </div>
  );
}

function MfaCard({ me, blocked }) {
  const { adoptSession } = useAuth();
  const [setup, setSetup] = useState(null); // { secret, otpauth_uri, qr }
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await api('/auth/mfa/setup', { method: 'POST' });
      const qr = await QRCode.toDataURL(r.otpauth_uri, { margin: 1, width: 200 });
      setSetup({ ...r, qr });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api('/auth/mfa/confirm', { method: 'POST', body: { code: code.replace(/\s/g, '') } });
      setCodes(r.recovery_codes);
      setSetup(null);
      // The session changes now (MFA on); the codes stay on screen until the admin confirms saving them.
      session.set(r.token);
    } catch (err) {
      setError(err);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (codes) {
    return (
      <Card title="Multi-factor sign-in" subtitle="Set up.">
        <RecoveryCodes
          codes={codes}
          onDone={async () => {
            await adoptSession(session.token);
            setCodes(null);
          }}
        />
      </Card>
    );
  }

  if (me.mfa_enabled) {
    return (
      <Card title="Multi-factor sign-in" subtitle="On: every sign-in asks for a code from your authenticator app.">
        <div className="stack">
          <span>
            <span className="badge ok">On</span> <span className="muted">{me.recovery_codes_left} recovery codes left</span>
          </span>
          {me.recovery_codes_left <= 3 && (
            <Alert tone="warn">Few recovery codes left. Ask another admin to reset your MFA to get new ones.</Alert>
          )}
          <span className="muted small">New phone? Ask another admin to reset your MFA, then set it up again here.</span>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Multi-factor sign-in" subtitle={blocked ? 'Required: set it up to continue.' : 'Off.'}>
      <div className="stack">
        {error && <ErrorList error={error} />}
        {!setup ? (
          <>
            <p style={{ margin: 0 }}>
              Use an authenticator app on your phone (Microsoft Authenticator, Google Authenticator, 1Password…). Each
              sign-in then needs your password and the 6-digit code the app shows.
            </p>
            <div>
              <button type="button" className="primary" disabled={busy} onClick={start}>
                {busy ? 'Starting…' : 'Set up multi-factor sign-in'}
              </button>
            </div>
          </>
        ) : (
          <form className="stack" onSubmit={confirm}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
              <img src={setup.qr} alt="QR code for your authenticator app" width="200" height="200" style={{ borderRadius: 8, background: '#fff' }} />
              <div className="stack" style={{ flex: '1 1 240px', gap: 10 }}>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>In the app, add an account and scan this code.</li>
                  <li>Enter the 6-digit code it shows.</li>
                </ol>
                <div className="small muted">Cannot scan? Enter this key in the app:</div>
                <span className="secret" style={{ overflowWrap: 'anywhere' }}>{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</span>
              </div>
            </div>
            <div style={{ maxWidth: 240 }}>
              <Text
                label="Code from the app"
                value={code}
                onChange={(v) => setCode(v.replace(/[^\d\s]/g, '').slice(0, 7))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123 456"
                autoFocus
              />
            </div>
            <div className="row">
              <button type="submit" className="primary" disabled={busy || code.replace(/\s/g, '').length !== 6}>
                {busy ? 'Checking…' : 'Turn on'}
              </button>
              <button type="button" onClick={() => setSetup(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

function SessionsCard() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Sessions" subtitle="Lost a laptop or signed in somewhere you should not have?">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('/auth/logout-all', { method: 'POST' });
          } finally {
            signOut();
          }
        }}
      >
        Sign out everywhere
      </button>
    </Card>
  );
}

export default function AccountPage() {
  const { admin, me, refresh } = useAuth();
  useEffect(() => {
    refresh();
  }, [refresh]);
  if (!me) return null;
  const pending = me.pending;
  const needPassword = pending.includes('password_change_required');
  const needMfa = pending.includes('mfa_setup_required');

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>My account</h1>
          <p>
            {admin.full_name} · <span className="mono">{admin.login_id}</span> · {admin.email}
          </p>
        </div>
      </div>
      <div className="stack" style={{ maxWidth: 820 }}>
        {pending.length > 0 && (
          <Alert tone="warn" title="Finish setting up your account">
            {needPassword && needMfa
              ? 'Choose your own password, then set up multi-factor sign-in. The rest of CTW Admin opens after that.'
              : needPassword
                ? 'Choose your own password. The rest of CTW Admin opens after that.'
                : 'Set up multi-factor sign-in. The rest of CTW Admin opens after that.'}
          </Alert>
        )}
        <PasswordCard required={needPassword} />
        {!needPassword && <MfaCard me={me} blocked={needMfa} />}
        {pending.length === 0 && <SessionsCard />}
      </div>
    </>
  );
}
