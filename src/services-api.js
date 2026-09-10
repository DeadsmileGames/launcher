const API_FALLBACK = 'https://apideadsmile.vercel.app/api';
let csrfToken = null;

class ApiError extends Error {
  constructor(message, status = 0, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestViaElectron({ path, method = 'GET', body, headers = {} }) {
  if (!window.deadsmile?.api) {
    throw new ApiError('Launcher bridge is unavailable.', 0, 'BRIDGE_UNAVAILABLE');
  }

  const result = await window.deadsmile.api({ path, method, body, headers });
  const payload = result?.data;

  if (!result?.ok) {
    const code = payload?.error?.code || 'UNKNOWN_ERROR';

    if (result?.status === 403 && code === 'CSRF_VALIDATION_FAILED') {
      csrfToken = null;
      return null;
    }

    throw new ApiError(
      payload?.error?.message || 'Something went wrong.',
      result?.status || 0,
      code,
    );
  }

  return payload?.data;
}

async function getCsrfToken(force = false) {
  if (csrfToken && !force) return csrfToken;

  const result = await window.deadsmile.api({
    path: '/csrf',
    method: 'GET',
  });

  if (!result?.ok || !result?.data?.data?.token) {
    throw new ApiError('Unable to initialize request security.', result?.status || 0, 'CSRF_INIT_FAILED');
  }

  csrfToken = result.data.data.token;
  return csrfToken;
}

async function request(path, { method = 'GET', body, retryCsrf = true } = {}) {
  const headers = {};

  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    headers['X-CSRF-Token'] = await getCsrfToken();
  }

  try {
    const result = await window.deadsmile.api({
      path,
      method,
      body,
      headers,
    });

    const payload = result?.data;

    if (!result?.ok) {
      const code = payload?.error?.code || 'UNKNOWN_ERROR';

      if (result?.status === 403 && code === 'CSRF_VALIDATION_FAILED' && retryCsrf) {
        csrfToken = null;
        await getCsrfToken(true);
        return request(path, { method, body, retryCsrf: false });
      }

      throw new ApiError(
        payload?.error?.message || 'Something went wrong.',
        result?.status || 0,
        code,
      );
    }

    return payload?.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Unable to reach the Deadsmile Games servers.', 0, 'NETWORK_ERROR');
  }
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path, body) => request(path, { method: 'DELETE', body }),
};

export { ApiError, API_FALLBACK };
