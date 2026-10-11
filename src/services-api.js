import { friendlyErrorMessage, errorLocale } from './friendly-errors';

let csrfToken = null;

class ApiError extends Error {
  constructor(message, status = 0, code = 'UNKNOWN_ERROR') {
    super(message || friendlyErrorMessage({ code }));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function getCsrfToken(force = false) {
  if (csrfToken && !force) return csrfToken;

  try {
    const result = await window.deadsmile.api({
      path: '/csrf',
      method: 'GET',
      headers: { 'Accept-Language': errorLocale() },
    });

    if (!result?.ok || !result?.data?.data?.token) {
      const code = result?.data?.error?.code || 'CSRF_INIT_FAILED';
      const message = result?.data?.error?.message || friendlyErrorMessage({ code, status: result?.status });
      throw new ApiError(message, result?.status || 0, code);
    }

    csrfToken = result.data.data.token;
    return csrfToken;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(null, 0, 'NETWORK_ERROR');
  }
}

async function request(path, { method = 'GET', body, retryCsrf = true } = {}) {
  try {
    const headers = { 'Accept-Language': errorLocale() };

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      headers['X-CSRF-Token'] = await getCsrfToken();
    }

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

      if (result?.status === 401 && code === 'UNAUTHENTICATED') { csrfToken = null; window.dispatchEvent(new Event('deadsmile:auth-invalidated')); }
      throw new ApiError(
        payload?.error?.message || friendlyErrorMessage({ code, status: result?.status }),
        result?.status || 0,
        code,
      );
    }

    return payload?.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(null, 0, 'NETWORK_ERROR');
  }
}

export const api = {
  get: (path) =>
    request(path, { method: "GET" }),

  post: (path, body) =>
    request(path, { method: "POST", body }),

  delete: (path) => request(path, { method: "DELETE" }),

  resetSecurity: () => {
    csrfToken = null;
  },
};

export { friendlyErrorMessage };
