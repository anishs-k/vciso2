import React from 'react';
import { useAuth } from '../../AuthContext';
import SourceConfigPanel from '../../components/SourceConfigPanel';

// ─── File Sources (WS3) ───────────────────────────────────────────────────────
// Home for the file-based scanner ingestion panel. Everything it writes goes to
// the isolated scanner store; the vCISO tables are untouched by this page.

export default function FileSources() {
  const { getToken, user } = useAuth();

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-white font-black text-xl">File Sources</h1>
        <p className="text-sm mt-1" style={{ color: '#8892a4' }}>
          Ingest scanner exports straight from disk — no scanner API needed.
        </p>
      </div>
      <SourceConfigPanel token={getToken()} clientId={user?.client_id} />
    </div>
  );
}
