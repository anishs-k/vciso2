import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

// ─── Live scanner connectors ──────────────────────────────────────────────────
// Generic UI over /api/connectors. Nothing here names a vendor: the form, the
// scope picker and the sync history are all generated from what the backend
// connector declares, so a new tool shows up here without a frontend change.

const SEV_STYLE = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-sky-100 text-sky-700 border-sky-200',
  Info: 'bg-slate-100 text-slate-600 border-slate-200',
};
const STATUS_STYLE = {
  open: 'bg-red-50 text-red-700',
  closed: 'bg-emerald-50 text-emerald-700',
  accepted: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  running: 'bg-sky-50 text-sky-700',
};
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

function Pill({ children, className = '' }) {
  return <span className={`inline-block rounded-full border border-transparent px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function useApi() {
  const { getToken } = useAuth();
  return useCallback(async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(`/api/connectors${path}`, {
      method,
      headers: { Authorization: `Bearer ${getToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }, [getToken]);
}

// What the client's IT has to arrange so the vCISO platform can reach the tool.
export function NetworkNote({ connector }) {
  if (connector.deployment === 'cloud') {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-700">Cloud service:</span> no network changes needed — the platform calls {connector.label}&apos;s API directly over the internet.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
      <span className="font-semibold">Network access{connector.deployment === 'either' ? ' (self-hosted installs only)' : ''}:</span>{' '}
      the address entered must be reachable from the vCISO platform. The client&apos;s IT team keeps that path open — an allow-listed
      firewall rule for the platform&apos;s IP, a site-to-site VPN, or a tunnel running as a system service (not an open terminal window).
      Ask them for a dedicated read-only account in the tool.
    </div>
  );
}

export function ProvidedLine({ connector }) {
  if (!connector.provided) return <span>Waiting for access details</span>;
  const who = connector.updatedBy ? connector.updatedBy.name : null;
  const test = connector.canTest
    ? ` · test ${connector.testStatus || 'not run'}${connector.lastTestedAt ? ` ${fmt(connector.lastTestedAt)}` : ''}`
    : '';
  return <span>Details provided{who ? ` by ${who}` : ''}{connector.updatedAt ? ` · ${fmt(connector.updatedAt)}` : ''}{test}</span>;
}

export function ConfigForm({ connector, onSaved }) {
  const api = useApi();
  const initial = Object.fromEntries(connector.fields.map((f) => [f.key, connector.config?.[f.key] ?? f.default ?? (f.type === 'boolean' ? false : '')]));
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }));
  const test = async () => {
    setBusy('test'); setMsg(null);
    try { setMsg({ ok: true, text: (await api(`/${connector.id}/test`, { method: 'POST', body: { config: values } })).detail }); } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy('');
  };
  const save = async () => {
    setBusy('save'); setMsg(null);
    try {
      await api(`/${connector.id}/config`, { method: 'PUT', body: { config: values } });
    } catch (e) { setMsg({ ok: false, text: e.message }); setBusy(''); return; }
    if (connector.canTest) {
      try {
        const t = await api(`/${connector.id}/test`, { method: 'POST' });
        setMsg({ ok: true, text: `Saved and tested — ${t.detail}` });
      } catch (e) { setMsg({ ok: false, text: `Saved, but the connection test failed: ${e.message}` }); }
    } else {
      setMsg({ ok: true, text: 'Saved securely.' });
    }
    setBusy('');
    onSaved();
  };

  return (
    <div className="space-y-3">
      <NetworkNote connector={connector} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {connector.fields.map((f) => (
          <label key={f.key} className={`block ${f.type === 'boolean' ? 'sm:col-span-2' : ''}`}>
            {f.type === 'boolean' ? (
              <span className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => set(f.key, e.target.checked)} />
                {f.label}
              </span>
            ) : (
              <>
                <span className="text-[11px] font-semibold text-slate-600">{f.label}{f.required ? ' *' : ''}</span>
                <input
                  type={f.type === 'secret' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                  value={values[f.key]}
                  placeholder={f.type === 'secret' && connector.provided ? '•••••••• (unchanged)' : f.placeholder || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  autoComplete={f.type === 'secret' ? 'new-password' : 'off'}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
            {f.help && <span className="mt-0.5 block text-[10px] text-slate-400">{f.help}</span>}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {connector.canTest && (
          <button type="button" disabled={!!busy} onClick={test} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {busy === 'test' ? 'Testing…' : 'Test connection'}
          </button>
        )}
        <button type="button" disabled={!!busy} onClick={save} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {busy === 'save' ? 'Saving…' : connector.provided ? 'Save changes' : 'Save'}
        </button>
        {!connector.canTest && <span className="text-[11px] text-slate-400">A connection test for {connector.label} is not available yet.</span>}
        {msg && <span className={`text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.ok ? '✓ ' : '✕ '}{msg.text}</span>}
      </div>
    </div>
  );
}

function FindingRow({ f }) {
  const [open, setOpen] = useState(false);
  const r = f.raw_data || {};
  const detail = [
    ['NVT OID', r['NVT OID']], ['Port', [r.Port, r['Port Protocol']].filter(Boolean).join('/')],
    ['QoD', r.QoD ? `${r.QoD}%` : ''], ['Family', r.Family], ['CVEs', r.CVEs], ['CVSS vector', r['CVSS Vector']],
    ['Task', r['Task Name']], ['Solution type', r['Solution Type']], ['Summary', r.Summary], ['Impact', r.Impact],
    ['Solution', r.Solution], ['Detection output', r['Specific Result']], ['References', r['Other References']],
  ].filter(([, v]) => v);
  return (
    <>
      <tr className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setOpen(!open)}>
        <td className="px-3 py-2"><Pill className={SEV_STYLE[f.severity]}>{f.severity}</Pill></td>
        <td className="px-3 py-2 text-xs text-slate-800">{f.title}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{f.asset_name}{f.asset_ip && f.asset_ip !== f.asset_name ? ` (${f.asset_ip})` : ''}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{f.cvss_score ?? '—'}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{f.cve_id || '—'}</td>
        <td className="px-3 py-2"><Pill className={STATUS_STYLE[f.status]}>{f.status}</Pill></td>
        <td className="px-3 py-2 text-[11px] text-slate-500">{fmt(f.last_seen)}</td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-4 py-3">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-[140px_1fr]">
              {detail.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="font-semibold text-slate-500">{k}</dt>
                  <dd className="whitespace-pre-wrap break-words text-slate-800">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function SchedulePanel({ connector }) {
  const api = useApi();
  const [form, setForm] = useState({ days_of_week: [], trigger_time: '02:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata', is_active: true });
  const [saved, setSaved] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/${connector.id}/schedule`).then(({ schedule }) => {
      setSaved(schedule);
      if (schedule) setForm({ days_of_week: schedule.days_of_week || [], trigger_time: schedule.trigger_time, timezone: schedule.timezone, is_active: schedule.is_active });
    }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, [api, connector.id]);

  const toggleDay = (d) => setForm((f) => ({ ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter((x) => x !== d) : [...f.days_of_week, d].sort() }));
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const { schedule } = await api(`/${connector.id}/schedule`, { method: 'PUT', body: form });
      setSaved(schedule); setMsg({ ok: true, text: 'Schedule saved' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true); setMsg(null);
    try { await api(`/${connector.id}/schedule`, { method: 'DELETE' }); setSaved(null); setMsg({ ok: true, text: 'Schedule removed' }); } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  const summary = form.days_of_week.length ? form.days_of_week.map((d) => DAYS[d]).join(', ') : 'Every day';

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Pull the latest results from {connector.label} automatically. Time it after the client's own scans usually finish. Each run appears in History as a scheduled sync.</p>
      <div>
        <div className="mb-1 text-[11px] font-semibold text-slate-600">Days (none selected = every day)</div>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => toggleDay(i)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${form.days_of_week.includes(i) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>{d}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block"><span className="text-[11px] font-semibold text-slate-600">Time (24h)</span>
          <input type="time" value={form.trigger_time} onChange={(e) => setForm((f) => ({ ...f, trigger_time: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs" /></label>
        <label className="block sm:col-span-2"><span className="text-[11px] font-semibold text-slate-600">Timezone</span>
          <input value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} placeholder="Asia/Kolkata" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs" /></label>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Enabled
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saved ? 'Update schedule' : 'Save schedule'}</button>
        {saved && <button type="button" disabled={busy} onClick={remove} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Remove</button>}
        {msg && <span className={`text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.ok ? '✓ ' : '✕ '}{msg.text}</span>}
      </div>
      {saved && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <div><span className="font-semibold">{saved.is_active ? 'Active' : 'Paused'}</span> · {summary} at {saved.trigger_time} ({saved.timezone})</div>
          <div className="mt-1 text-slate-500">Last run: {saved.last_triggered_at ? `${fmt(saved.last_triggered_at)} — ${saved.last_status}${saved.last_message ? `: ${saved.last_message}` : ''}` : 'not yet'}</div>
        </div>
      )}
    </div>
  );
}

function ConnectorCard({ connector, reload }) {
  const api = useApi();
  const [tab, setTab] = useState(connector.provided && connector.canSync ? 'sync' : 'connect');
  const [scopes, setScopes] = useState(null);
  const [picked, setPicked] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [runs, setRuns] = useState([]);
  const [findings, setFindings] = useState(null);
  const [filter, setFilter] = useState('open');
  const [error, setError] = useState('');
  // A rescan in flight: { scopeId, name, prevReportId, openBefore, startedAt }
  const [watch, setWatch] = useState(null);
  const [rescanResult, setRescanResult] = useState(null);

  const loadSide = useCallback(async () => {
    if (!connector.provided || !connector.canSync) return;
    try {
      const [r, f] = await Promise.all([api(`/${connector.id}/runs?limit=10`), api(`/${connector.id}/findings`)]);
      setRuns(r.runs); setFindings(f);
    } catch (e) { setError(e.message); }
  }, [api, connector.id, connector.provided, connector.canSync]);

  useEffect(() => { loadSide(); }, [loadSide]);

  const loadScopes = async () => {
    setError('');
    try { setScopes((await api(`/${connector.id}/scopes`)).scopes); } catch (e) { setError(e.message); }
  };

  const openTotal = (f) => (f?.summary || []).filter((x) => x.status === 'open').reduce((n, x) => n + x.c, 0);

  useEffect(() => {
    if (tab === 'sync' && connector.provided && connector.canSync && scopes === null) loadScopes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, connector.provided]);

  const rescan = async (scope) => {
    setError(''); setRescanResult(null);
    try {
      const r = await api(`/${connector.id}/scopes/${scope.id}/scan`, { method: 'POST' });
      setWatch({ scopeId: scope.id, name: scope.name, prevReportId: r.previousReportId, openBefore: openTotal(findings), startedAt: Date.now() });
      setScopes((list) => list.map((x) => (x.id === scope.id ? { ...x, status: 'Requested', progress: 0 } : x)));
    } catch (e) { setError(e.message); }
  };

  // While a rescan runs: refresh the task list every 10 s; once the task has
  // finished with a new report, pull it in automatically.
  useEffect(() => {
    if (!watch) return undefined;
    let stopped = false;
    const tick = async () => {
      try {
        const { scopes: list } = await api(`/${connector.id}/scopes`);
        if (stopped) return;
        setScopes(list);
        const s = list.find((x) => x.id === watch.scopeId);
        if (!s) return;
        if (['Stopped', 'Interrupted'].includes(s.status)) {
          setError(`"${watch.name}" ${s.status.toLowerCase()} before finishing`); setWatch(null); return;
        }
        if (s.status === 'Done' && s.lastReport && s.lastReport.id !== watch.prevReportId) {
          stopped = true;
          setWatch(null);
          setSyncing(true);
          const r = await api(`/${connector.id}/sync`, { method: 'POST', body: { scopes: [watch.scopeId] } });
          const f = await api(`/${connector.id}/findings`);
          setFindings(f);
          setRescanResult({ ...r, name: watch.name, openBefore: watch.openBefore, openAfter: openTotal(f), minutes: Math.round((Date.now() - watch.startedAt) / 60000) });
          setSyncing(false);
          loadSide(); reload();
        }
      } catch (e) { setError(e.message); }
    };
    const id = setInterval(tick, 10000);
    tick();
    return () => { stopped = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  const sync = async () => {
    setSyncing(true); setError(''); setResult(null);
    try {
      setResult(await api(`/${connector.id}/sync`, { method: 'POST', body: { scopes: picked } }));
    } catch (e) { setError(e.message); }
    setSyncing(false);
    loadSide(); reload();
  };

  const counts = {};
  (findings?.summary || []).forEach((s) => {
    if (s.status === 'open') counts[s.severity] = (counts[s.severity] || 0) + s.c;
  });
  const shown = (findings?.findings || []).filter((f) => filter === 'all' || f.status === filter)
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || (b.cvss_score || 0) - (a.cvss_score || 0));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{connector.label}</span>
            <Pill className={connector.canSync ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{connector.canSync ? 'live sync' : 'live sync coming'}</Pill>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            <ProvidedLine connector={connector} />
            {connector.canSync && connector.provided && <> · last sync {connector.lastRun ? `${connector.lastRun.status} ${fmt(connector.lastRun.started_at)}` : 'never'}</>}
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(connector.canSync ? ['connect', 'sync', 'findings', 'history', 'schedule'] : ['connect']).map((t) => (
            <button key={t} type="button" disabled={t !== 'connect' && !connector.provided} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize disabled:opacity-40 ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        {tab === 'connect' && (
          <div className="space-y-3">
            {!connector.canSync && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                Live sync for {connector.label} is not built yet. The access details are stored encrypted for this client and will be used as soon as it is; meanwhile its exports can be imported through Sync Now on the Vulnerability Management page.
              </div>
            )}
            <ConfigForm connector={connector} onSaved={reload} />
          </div>
        )}

        {tab === 'schedule' && <SchedulePanel connector={connector} />}

        {tab === 'sync' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={loadScopes} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Load {connector.scopeLabel.toLowerCase()}s
              </button>
              <button type="button" disabled={syncing} onClick={sync} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {syncing ? '⏳ Syncing…' : `🔄 Sync now${picked.length ? ` (${picked.length} selected)` : ' (all)'}`}
              </button>
            </div>
            {scopes && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr><th className="w-8 px-3 py-2" /><th className="px-3 py-2">{connector.scopeLabel}</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last report</th>{connector.canScan && <th className="px-3 py-2" />}</tr>
                  </thead>
                  <tbody>
                    {scopes.length === 0 && <tr><td colSpan={6} className="px-3 py-3 text-xs text-slate-500">No {connector.scopeLabel.toLowerCase()}s visible to this account.</td></tr>}
                    {scopes.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100 text-xs">
                        <td className="px-3 py-2"><input type="checkbox" checked={picked.includes(s.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} /></td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{s.name}</td>
                        <td className="px-3 py-2 text-slate-600">{s.target || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{s.status}{s.status === 'Running' ? ` ${s.progress}%` : ''}</td>
                        <td className="px-3 py-2 text-slate-500">{s.lastReport ? fmt(s.lastReport.scanEnd) : 'none yet'}</td>
                        {connector.canScan && (
                          <td className="px-3 py-2 text-right">
                            {['Running', 'Requested', 'Queued'].includes(s.status)
                              ? <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-sky-700">
                                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-sky-100"><span className="block h-full bg-sky-500" style={{ width: `${Math.max(3, s.progress || 0)}%` }} /></span>
                                  scanning {s.progress > 0 ? `${s.progress}%` : '…'}
                                </span>
                              : <button type="button" disabled={!!watch} onClick={() => rescan(s)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40">↻ Rescan</button>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {watch && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
                <span className="font-semibold">Rescanning “{watch.name}” in {connector.label}…</span> Results are pulled in automatically when the scan finishes. You can leave this page open.
              </div>
            )}
            {rescanResult && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-900">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Rescan of “{rescanResult.name}” complete · {rescanResult.minutes} min</div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-black">{rescanResult.openBefore}</span>
                  <span className="text-lg text-emerald-700">→</span>
                  <span className="text-3xl font-black">{rescanResult.openAfter}</span>
                  <span className="text-xs text-emerald-800">open findings</span>
                </div>
                {rescanResult.closedFindings?.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs">
                    {rescanResult.closedFindings.map((f) => (
                      <li key={`${f.title}|${f.asset}`}>✓ <span className="font-semibold">Fixed:</span> {f.title} <span className="text-emerald-700">on {f.asset}{f.cve ? ` (${f.cve})` : ''}</span></li>
                    ))}
                  </ul>
                ) : <div className="mt-2 text-xs">No previously reported finding has gone away yet.</div>}
                {rescanResult.created > 0 && <div className="mt-2 text-xs text-amber-800">⚠ {rescanResult.created} new finding(s) appeared in this scan.</div>}
              </div>
            )}
            {result && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <div className="font-semibold">Sync complete — {result.rowsFetched} result(s) pulled</div>
                <div className="mt-1">{result.created} new · {result.updated} updated · {result.closed} closed (no longer reported){result.rejected ? ` · ${result.rejected} rejected` : ''}</div>
                {result.stored && <div className="mt-1">Vulnerability Management table: {result.stored.created} added, {(result.stored.updated || 0) + (result.stored.skipped || 0)} already present{result.stored.error ? ` — not saved: ${result.stored.error}` : ''}{result.remediatedInProductTable ? `, ${result.remediatedInProductTable} marked remediated` : ''}</div>}
                <ul className="mt-1 list-disc pl-4">
                  {result.scopes.map((s) => <li key={s.id}>{s.name}: {s.skipped ? s.skipped : `${s.rows} result(s)`}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'findings' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {SEVERITIES.map((s) => <Pill key={s} className={SEV_STYLE[s]}>{s}: {counts[s] || 0}</Pill>)}
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="ml-auto rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
                <option value="open">Open</option><option value="closed">Closed</option><option value="accepted">Accepted / false positive</option><option value="all">All</option>
              </select>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Asset</th><th className="px-3 py-2">CVSS</th><th className="px-3 py-2">CVE</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last seen</th></tr>
                </thead>
                <tbody>
                  {shown.length === 0 && <tr><td colSpan={7} className="px-3 py-3 text-xs text-slate-500">Nothing here yet — run a sync.</td></tr>}
                  {shown.map((f) => <FindingRow key={f.id} f={f} />)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Started</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Pulled</th><th className="px-3 py-2">New</th><th className="px-3 py-2">Updated</th><th className="px-3 py-2">Closed</th><th className="px-3 py-2">Error</th></tr>
              </thead>
              <tbody>
                {runs.length === 0 && <tr><td colSpan={7} className="px-3 py-3 text-xs text-slate-500">No syncs yet.</td></tr>}
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-xs">
                    <td className="px-3 py-2 text-slate-600">{fmt(r.started_at)}</td>
                    <td className="px-3 py-2"><Pill className={STATUS_STYLE[r.status]}>{r.status}</Pill></td>
                    <td className="px-3 py-2">{r.rows_fetched}</td><td className="px-3 py-2">{r.created}</td>
                    <td className="px-3 py-2">{r.updated}</td><td className="px-3 py-2">{r.closed}</td>
                    <td className="px-3 py-2 text-red-600">{r.error_message || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function useConnectorList() {
  const api = useApi();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setData(await api('')); setError(''); } catch (e) { setError(e.message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  return { connectors: data?.connectors || null, summary: data?.summary || null, error, load };
}

export default function LiveConnectors() {
  const { connectors, summary, error, load } = useConnectorList();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Client security tools</h2>
          <p className="text-xs text-slate-500">Exactly the vulnerability tools selected for this client during onboarding. Access details are stored encrypted for this client only; findings from tools with live sync flow into Vulnerability Management. To add or remove a tool, change the client&apos;s onboarding selection.</p>
        </div>
        {summary && summary.total > 0 && (
          <Pill className={summary.provided === summary.total ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}>
            {summary.provided} of {summary.total} provided
          </Pill>
        )}
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {!connectors && !error && <div className="text-xs text-slate-500">Loading…</div>}
      {connectors && connectors.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500">
          No vulnerability tools were selected for this client during onboarding.
        </div>
      )}
      {connectors?.map((c) => <ConnectorCard key={c.id} connector={c} reload={load} />)}
    </section>
  );
}
