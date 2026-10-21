import React, { useState, useEffect, useCallback } from 'react';

function getValidToken() {
  return (
    localStorage.getItem('vciso_token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('owner_token') ||
    sessionStorage.getItem('vciso_token') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    ''
  );
}

function authHdr() {
  const token = getValidToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [actionMsg, setActionMsg] = useState({});

  const load = useCallback(() => {
    const ah = authHdr();
    if (!ah.Authorization) return;
    fetch('/api/notifications?status=unread', { headers: ah })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setNotifs(list);
        setCount(list.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // Poll every 10s
    window.addEventListener('notification-updated', load);
    window.addEventListener('onboarding-status-updated', load);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-updated', load);
      window.removeEventListener('onboarding-status-updated', load);
    };
  }, [load]);

  async function markRead(id) {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHdr() },
      body: JSON.stringify({ status: 'read', resolved_by: 'admin' }),
    }).catch(() => {});
    load();
  }

  async function markAllRead() {
    for (const n of notifs) {
      await fetch(`/api/notifications/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHdr() },
        body: JSON.stringify({ status: 'read', resolved_by: 'admin' }),
      }).catch(() => {});
    }
    load();
    setOpen(false);
  }

  async function handleApprove(notif) {
    const crId = notif.metadata?.change_request_id;
    const clientId = notif.client_id || notif.metadata?.client_id;
    const section = notif.metadata?.section || (notif.title ? notif.title.replace('Change Request: ', '') : '');

    setActionLoading(p => ({ ...p, [notif.id]: true }));
    try {
      let ok = false;
      if (crId) {
        const res = await fetch(`/api/change-requests/${crId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHdr() },
          body: JSON.stringify({ status: 'approved', reviewed_by: 'Admin' }),
        });
        if (res.ok) ok = true;
      }
      if (!ok && clientId && section) {
        const res = await fetch('/api/onboarding-status/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHdr() },
          body: JSON.stringify({ client_id: clientId, section }),
        });
        if (res.ok) ok = true;
      }
      await markRead(notif.id);

      setActionMsg(p => ({ ...p, [notif.id]: '✓ Approved & Unlocked for 24 hours' }));
      window.dispatchEvent(new Event('onboarding-status-updated'));
      window.dispatchEvent(new Event('notification-updated'));
      setTimeout(() => {
        load();
      }, 1500);
    } catch (e) {
      console.error('Failed to approve change request:', e);
    } finally {
      setActionLoading(p => ({ ...p, [notif.id]: false }));
    }
  }

  async function handleReject(notif) {
    const crId = notif.metadata?.change_request_id;
    if (!crId) {
      await markRead(notif.id);
      return;
    }
    setActionLoading(p => ({ ...p, [notif.id]: true }));
    try {
      const res = await fetch(`/api/change-requests/${crId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHdr() },
        body: JSON.stringify({ status: 'rejected', reviewed_by: 'Admin', rejection_reason: 'Rejected by admin' }),
      });
      if (res.ok) {
        setActionMsg(p => ({ ...p, [notif.id]: '✕ Change request rejected' }));
        window.dispatchEvent(new Event('notification-updated'));
        setTimeout(() => {
          load();
        }, 1500);
      }
    } catch (e) {
      console.error('Failed to reject change request:', e);
    } finally {
      setActionLoading(p => ({ ...p, [notif.id]: false }));
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none flex items-center justify-center border border-slate-200 bg-white shadow-sm"
        title="Notifications & Change Requests"
      >
        <span className="text-base">🔔</span>
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-40" />

          {/* Dropdown Card */}
          <div className="absolute right-0 top-11 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[520px] flex flex-col font-sans">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Notifications</span>
                {count > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                    {count} new
                  </span>
                )}
              </div>
              {count > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {notifs.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500">
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="text-sm font-semibold text-slate-900">All caught up!</div>
                  <div className="text-xs text-slate-400 mt-1">No unread notifications or edit requests</div>
                </div>
              ) : (
                notifs.map(n => {
                  const isChangeReq = n.type === 'change_request' || n.request_type === 'edit_request';
                  const msg = actionMsg[n.id];
                  const isLoading = actionLoading[n.id];

                  return (
                    <div key={n.id} className="p-4 hover:bg-slate-50/70 transition space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isChangeReq ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {isChangeReq ? '📝' : 'ℹ️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 leading-snug">{n.title}</div>
                          {n.client_name && (
                            <div className="text-[11px] font-semibold text-blue-600 mt-0.5 truncate">
                              🏢 {n.client_name}
                            </div>
                          )}
                          {n.message && (
                            <div className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-2">
                              {n.message}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
                            <span>
                              {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''}
                            </span>
                            {n.requested_by && <span className="font-medium text-slate-500">By: {n.requested_by}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Action status message */}
                      {msg && (
                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-center">
                          {msg}
                        </div>
                      )}

                      {/* Change Request Action Buttons */}
                      {isChangeReq && !msg && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleApprove(n)}
                            className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {isLoading ? '⏳ Working…' : '🔓 Approve & Unlock'}
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleReject(n)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {!isChangeReq && !msg && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            className="text-xs text-slate-500 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
