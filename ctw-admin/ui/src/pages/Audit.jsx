// The audit trail: who did what, newest first, filtered by action and client.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Alert, Card, Loading, fmtDateTime } from '../components/ui';

const GROUPS = [
  ['', 'All actions'],
  ['admin.', 'Admins and sign-ins'],
  ['client.', 'Clients'],
  ['build.', 'Builds'],
];

// One line about the details, without dumping JSON at the reader.
function detail(e) {
  const d = e.details || {};
  const parts = [];
  if (d.version) parts.push(`v${d.version}`);
  if (d.build_type) parts.push(d.build_type === 'image_only' ? 'image only' : 'full');
  if (d.login_id) parts.push(d.login_id);
  if (d.file) parts.push(d.file);
  if (d.method) parts.push(d.method === 'recovery_code' ? 'with a recovery code' : 'with the app code');
  if (d.valid === false) parts.push(`${d.errors} problem${d.errors === 1 ? '' : 's'}`);
  if (d.valid === true) parts.push('valid');
  if (d.freed) parts.push(`${(d.freed / 1048576).toFixed(0)} MB freed`);
  if (d.error) parts.push(d.error);
  return parts.join(' · ');
}

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [customer, setCustomer] = useState('');
  const [entries, setEntries] = useState(null);
  const [next, setNext] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = (before) => {
    const q = new URLSearchParams({ limit: '50' });
    if (action) q.set('action', action);
    if (customer.trim()) q.set('customer_id', customer.trim());
    if (before) q.set('before', before);
    return api(`/audit?${q}`);
  };

  useEffect(() => {
    let stale = false;
    setEntries(null);
    const t = setTimeout(() => {
      query()
        .then((r) => {
          if (stale) return;
          setEntries(r.entries);
          setNext(r.next_before);
        })
        .catch((e) => !stale && setError(e));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [action, customer]); // `query` reads exactly these two

  const more = async () => {
    setLoadingMore(true);
    try {
      const r = await query(next);
      setEntries((e) => [...e, ...r.entries]);
      setNext(r.next_before);
    } catch (e) {
      setError(e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Audit log</h1>
          <p>Every sign-in, client change, build, download and admin change.</p>
        </div>
      </div>
      <Card
        padded={false}
        title="Activity"
        actions={
          <div className="filters">
            <input placeholder="Customer ID" value={customer} onChange={(e) => setCustomer(e.target.value)} aria-label="Customer ID" />
            <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
              {GROUPS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {error && (
          <div className="card-body">
            <Alert tone="bad">{error.message}</Alert>
          </div>
        )}
        {!entries && !error && <Loading what="Loading activity" />}
        {entries && !entries.length && <div className="empty">Nothing matches.</div>}
        {entries && entries.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>Client</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.audit_id}>
                      <td className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.at)}</td>
                      <td className="small">{e.admin_login || '—'}</td>
                      <td className="mono small">{e.action}</td>
                      <td className="small">
                        {e.customer_id ? <Link to={`/clients/${encodeURIComponent(e.customer_id)}`}>{e.customer_id}</Link> : '—'}
                      </td>
                      <td className="small">
                        {e.details?.build_id ? <Link to={`/builds/${e.details.build_id}`}>{detail(e) || 'build'}</Link> : detail(e)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {next && (
              <div className="card-body" style={{ textAlign: 'center' }}>
                <button type="button" disabled={loadingMore} onClick={more}>
                  {loadingMore ? 'Loading…' : 'Load older'}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
