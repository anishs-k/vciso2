// Onboarding: pick the client to continue, or start a new one. The list comes from GET /api/clients.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Alert, Loading, StatusBadge } from '../components/ui';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/clients').then(setClients).catch(setError);
  }, []);

  return (
    <>
      <div className="select-head">
        <div className="big-icon" aria-hidden="true">🏢</div>
        <h1>Select a Client</h1>
        <p>Choose the client you want to onboard. You can switch clients any time from the Clients tab.</p>
      </div>
      {error && <Alert tone="bad">{error.message}</Alert>}
      {!clients && !error && <Loading what="Loading clients" />}
      {clients && (
        <div className="select-list">
          {clients.map((c) => (
            <Link key={c.customer_id} to={`/clients/${encodeURIComponent(c.customer_id)}/edit`} className="select-row">
              <span className="circle" aria-hidden="true">{(c.customer_name || c.customer_id).trim()[0]}</span>
              <span className="grow">
                <strong>{c.customer_name}</strong>
                <small>
                  {c.industry} · <span className="mono">{c.customer_id}</span>
                </small>
              </span>
              <StatusBadge status={c.status} />
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          ))}
          <button type="button" className="primary big" style={{ marginTop: 8 }} onClick={() => navigate('/clients/new')}>
            + Add New Client
          </button>
        </div>
      )}
    </>
  );
}
