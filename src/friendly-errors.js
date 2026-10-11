import catalog from './generated/errors.json';

export function errorLocale() {
  let value = 'en';
  try { value = localStorage.getItem('deadsmile.language') || document.documentElement.lang || 'en'; } catch {}
  if (/^pt(?:-|$)/i.test(value)) return 'pt-BR';
  if (/^es(?:-|$)/i.test(value)) return 'es';
  return 'en';
}

export function friendlyErrorMessage(error) {
  if (error?.name === 'ApiError' && error.message) return error.message;
  const code = String(error?.code || error?.message || '').match(/\b[A-Z][A-Z_]{2,}\b/)?.[0] || 'INTERNAL_ERROR';
  return catalog[errorLocale()][code] || catalog[errorLocale()].INTERNAL_ERROR;
}
