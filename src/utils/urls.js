function safeRelativeUrl(raw) {
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) return false;
  try { return new URL(raw, 'https://deadsmile.invalid').origin === 'https://deadsmile.invalid'; } catch { return false; }
}

function parseUrl(value, { allowRelative = false } = {}) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  if (allowRelative && safeRelativeUrl(raw)) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function safeHttpsUrl(value) {
  const parsed = parseUrl(value);
  return parsed ? parsed.toString() : null;
}

export function safeItchUrl(value) {
  const parsed = parseUrl(value);
  if (!parsed || typeof parsed === 'string') return null;
  const host = parsed.hostname.toLowerCase();
  return host === 'itch.io' || host.endsWith('.itch.io') ? parsed.toString() : null;
}

export function safeImageUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  if (safeRelativeUrl(raw)) return new URL(raw, 'https://rlxtfzt3-5174.brs.devtunnels.ms').href;
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(raw)) return raw;
  return safeHttpsUrl(raw);
}

export function safeOAuthItchUrl(value) {
  const parsed = parseUrl(value);
  if (!parsed || typeof parsed === 'string') return null;
  return parsed.hostname.toLowerCase() === 'itch.io' && parsed.pathname === '/user/oauth'
    ? parsed.toString()
    : null;
}
