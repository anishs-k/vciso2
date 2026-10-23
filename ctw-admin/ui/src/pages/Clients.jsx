// Every client CTW has onboarded, as cards. All figures come from GET /api/clients.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Alert, ErrorList, Icon, Loading, Modal, StatusBadge, daysUntil } from '../components/ui';

// Delivered clients count as active; drafts and validated clients are still being onboarded.
const GROUPS = {
  active: ['generated', 'live'],
  onboarding: ['draft', 'ready'],
  suspended: ['suspended'],
};
const TABS = [
  ['', 'All'],
  ['active', 'Active'],
  ['onboarding', 'Onboarding'],
  ['suspended', 'Suspended'],
];

function ClientCard({ c, onDelete }) {
  const expires = daysUntil(c.valid_to);
  return (
    <article className="client-card">
      {!c.last_build && (
        <div className="actions">
          <button type="button" className="icon-btn" title="Delete this client (never built)" aria-label={`Delete ${c.customer_name}`} onClick={() => onDelete(c)}>
            <Icon name="trash" size={16} />
          </button>
        </div>
      )}
      <div className="top">
        <span className="letter" aria-hidden="true">{(c.customer_name || c.customer_id).trim()[0]}</span>
        <div style={{ minWidth: 0, paddingRight: c.last_build ? 0 : 40 }}>
          <div className="name" title={c.customer_name}>{c.customer_name}</div>
          <div className="sub">{c.industry}</div>
        </div>
      </div>
      <div className="meta">
        <StatusBadge status={c.status} />
        <span>
          {c.modules.length} module{c.modules.length === 1 ? '' : 's'}
        </span>
        {expires !== null && expires <= 60 && (
          <span className={`badge ${expires < 0 ? 'bad' : 'warn'}`}>{expires < 0 ? 'licence expired' : `licence ends in ${expires} days`}</span>
        )}
      </div>
      <div className="foot">
        <span>Since {String(c.created_at).slice(0, 10)}</span>
        <Link to={`/clients/${encodeURIComponent(c.customer_id)}`}>View Profile →</Link>
      </div>
    </article>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(() => api('/clients').then(setClients).catch(setError), []);
  useEffect(() => {
    load();
  }, [load]);

  const count = (group) => (clients || []).filter((c) => GROUPS[group].includes(c.status)).length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (clients || []).filter(
      (c) =>
        (!tab || GROUPS[tab].includes(c.status)) &&
        (!needle || `${c.customer_id} ${c.customer_name} ${c.industry}`.toLowerCase().includes(needle)),
    );
  }, [clients, q, tab]);

  const remove = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/clients/${encodeURIComponent(deleting.customer_id)}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Clients</h1>
          <p>Manage your vCISO client accounts and security programs</p>
        </div>
        <button type="button" className="primary big" onClick={() => navigate('/clients/new')}>
          + Add New Client
        </button>
      </div>

      {error && <Alert tone="bad">{error.message}</Alert>}
      {!clients && !error && <Loading what="Loading clients" />}

      {clients && (
        <>
          <div className="stats">
            <div className="stat-card">
              <span className="icon"><Icon name="building" size={22} /></span>
              <div>
                <div className="v">{clients.length}</div>
                <div className="k">Total Clients</div>
              </div>
            </div>
            <div className="stat-card ok">
              <span className="icon"><Icon name="check" size={22} /></span>
              <div>
                <div className="v">{count('active')}</div>
                <div className="k">Active</div>
              </div>
            </div>
            <div className="stat-card info">
              <span className="icon"><Icon name="clock" size={22} /></span>
              <div>
                <div className="v">{count('onboarding')}</div>
                <div className="k">Onboarding</div>
              </div>
            </div>
          </div>

          <div className="toolbar">
            <label className="search">
              <input placeholder="Search by name or industry..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
            </label>
            <div className="tabs" role="tablist" aria-label="Filter by status">
              {TABS.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!shown.length ? (
            <div className="card empty">{clients.length ? 'No client matches.' : 'No clients yet. Start with “+ Add New Client”.'}</div>
          ) : (
            <div className="client-grid">
              {shown.map((c) => (
                <ClientCard key={c.customer_id} c={c} onDelete={setDeleting} />
              ))}
            </div>
          )}
        </>
      )}

      {deleting && (
        <Modal
          title={`Delete ${deleting.customer_name}?`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button type="button" className="danger" disabled={busy} onClick={remove}>
                {busy ? 'Deleting…' : 'Delete client'}
              </button>
            </>
          }
        >
          {actionError && <ErrorList error={actionError} />}
          <p style={{ margin: 0 }}>
            <span className="mono">{deleting.customer_id}</span> has never been built, so it can be deleted with everything entered
            for it. The audit log keeps the record of it.
          </p>
        </Modal>
      )}
    </>
  );
}
