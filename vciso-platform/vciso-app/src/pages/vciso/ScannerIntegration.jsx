import React from 'react';
import LiveConnectors from '../../components/LiveConnectors';

// Scanner Integration: the client's vulnerability tools, exactly as selected
// at onboarding, with their access details, sync, rescans and schedules — all
// served by /api/connectors.
export default function ScannerIntegration() {
  return (
    <div className="p-6 font-sans bg-slate-50 min-h-full text-slate-900 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Scanner Integration</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Connect the client&apos;s vulnerability scanners, test access, run scans and pull findings into Vulnerability Management.
        </p>
      </div>
      <LiveConnectors />
    </div>
  );
}
