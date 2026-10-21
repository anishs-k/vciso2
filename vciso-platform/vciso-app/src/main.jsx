import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { THEME, th } from './theme';
import './theme/toggle';

// Each theme's stylesheet lives in src/themes/<name>/index.css; only the active one is loaded.
const themeStyles = import.meta.glob('./themes/*/index.css');
document.body.className = th('bg-[#EDF2F7] text-[#1A202C] antialiased', {
  classic: 'bg-[#F1F5F9] text-slate-900 antialiased',
  dark: 'bg-slate-50 text-slate-900 antialiased',
});

// ── Global fetch interceptor ──────────────────────────────────────────────────
// After any successful write to our own API, broadcast via BroadcastChannel so
// other tabs in the same browser refresh immediately (supplements SSE).
(function installSyncBroadcast() {
  const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  let channel;
  try { channel = new BroadcastChannel('vcso-data-sync'); } catch { /* not supported */ }
  let lastBroadcast = 0;

  const _fetch = window.fetch.bind(window);
  window.fetch = async function (input, init = {}) {
    const res = await _fetch(input, init);
    const method = (init.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input?.url || '';
    if (res.ok && WRITE_METHODS.has(method) && url.startsWith('/api/')) {
      const now = Date.now();
      if (now - lastBroadcast > 400) {
        lastBroadcast = now;
        channel?.postMessage({ type: 'data-changed', ts: now, url });
      }
    }
    return res;
  };
})();

themeStyles[`./themes/${THEME}/index.css`]().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
