// Calls to the CTW admin API. The session token lives in sessionStorage: it ends with the browser tab.
const KEY = 'ctw_admin_token';

export const session = {
  get token() {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      sessionStorage.setItem(KEY, token);
    } catch {
      /* private mode: the session lasts until reload */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
  },
};

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (HTTP ${status})`);
    this.status = status;
    this.body = body || {};
  }
}

function headers(json) {
  const h = {};
  if (json) h['content-type'] = 'application/json';
  if (session.token) h.authorization = `Bearer ${session.token}`;
  return h;
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: headers(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { error: 'The CTW admin API cannot be reached. Is it running?' });
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (res.status === 401 && !path.startsWith('/auth/login') && path !== '/auth/password') {
    session.clear();
    window.dispatchEvent(new Event('ctw-signed-out'));
  }
  // The admin still has to change a temporary password or set up MFA: the app sends them to My account.
  if (res.status === 403 && data?.pending) window.dispatchEvent(new Event('ctw-pending'));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// Downloads a build file with the session header (a plain link could not send it).
export async function download(path, filename) {
  const res = await fetch(`/api${path}`, { headers: headers(false) });
  if (!res.ok) {
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    throw new ApiError(res.status, data);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
