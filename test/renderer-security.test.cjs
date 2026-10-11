const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../electron/main.cjs'), 'utf8');
const constants = ['API_ALLOWED_REQUESTS', 'GAME_VIEW_API_ALLOWED_REQUESTS'].map((name) => `const ${name} = ${source.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`))[1]};`).join('\n');
const functions = ['errorLocale', 'canonicalRendererApiPath', 'sanitizeRendererApiRequest', 'sameUnderlyingFrame'].map((name) => source.match(new RegExp(`^function ${name}\\([\\s\\S]*?^}`, 'm'))[0]).join('\n');
const context = { URL, Buffer, API_URL: 'https://api-ust8.onrender.com/api', MAX_RENDERER_API_BODY_BYTES: 16 * 1024 };
vm.createContext(context);
vm.runInContext(`${constants}\n${functions}\nthis.sanitize = sanitizeRendererApiRequest; this.sameFrame = sameUnderlyingFrame;`, context);
const request = (path, method = 'GET', extras = {}, kind = 'main') => context.sanitize({ path, method, ...extras }, kind);

test('native itch disconnect is blocked during games and downloads when renderer controls are bypassed', async () => {
  const start = source.indexOf('  secureIpcHandle("deadsmile:api",');
  const end = source.indexOf('\nsecureIpcHandle(', start);
  let handler;
  let forwarded = 0;
  const state = {
    secureIpcHandle: (_name, callback) => { handler = callback; },
    rendererKindForEvent: () => 'main', sanitizeRendererApiRequest: (value) => value,
    playSessions: new Map(), launchRequests: new Set(), gameOperations: { size: 0 },
    downloadQueue: { active: 0, jobs: new Map() },
    publicMessage: ({ code }) => code,
    apiRequest: async () => { forwarded++; return { ok: true }; },
  };
  vm.runInNewContext(source.slice(start, end), state);
  const disconnect = { path: '/integrations/itch', method: 'DELETE' };
  state.playSessions.set('game', {});
  assert.equal((await handler({}, disconnect)).data.error.code, 'GAME_RUNNING');
  state.playSessions.clear(); state.launchRequests.add('game');
  assert.equal((await handler({}, disconnect)).data.error.code, 'GAME_RUNNING');
  state.launchRequests.clear(); state.gameOperations.size = 1;
  assert.equal((await handler({}, disconnect)).data.error.code, 'GAME_DOWNLOAD_IN_PROGRESS');
  state.gameOperations.size = 0; state.downloadQueue.jobs.set('game', { status: 'paused' });
  assert.equal((await handler({}, disconnect)).data.error.code, 'GAME_DOWNLOAD_IN_PROGRESS');
  state.downloadQueue.jobs.clear(); state.downloadQueue.active = 1;
  assert.equal((await handler({}, disconnect)).data.error.code, 'GAME_DOWNLOAD_IN_PROGRESS');
  assert.equal(forwarded, 0); state.downloadQueue.active = 0;
  assert.equal((await handler({}, disconnect)).ok, true); assert.equal(forwarded, 1);
});

test('only an identified native main frame matches its alternate wrapper', () => {
  assert.equal(context.sameFrame({ frameTreeNodeId: 71 }, { frameTreeNodeId: 71 }), true);
  assert.equal(context.sameFrame({ frameTreeNodeId: 72 }, { frameTreeNodeId: 71 }), false);
  assert.equal(context.sameFrame({ processId: 10, routingId: 8 }, { processId: 10, routingId: 8 }), true);
  assert.equal(context.sameFrame({ processId: 11, routingId: 8 }, { processId: 10, routingId: 8 }), false);
  assert.equal(context.sameFrame({}, {}), false);
});

test('renderer permits login, 2FA and library reads but excludes removed capabilities', () => {
  assert(request('/auth/mobile-login', 'POST', { body: { email: 'player@example.test', password: 'test' } }));
  assert(request('/auth/verify-2fa', 'POST', { body: { token: '123456' } }));
  assert(request('/library'));
  assert(request('/library/catalog'));
  assert(request('/library/00000000-0000-4000-8000-000000000001', 'POST'));
  assert(request('/integrations/itch', 'DELETE'));
  assert.equal(request('/library/catalog', 'POST'), null);
  assert.equal(request('/library/invalid', 'POST'), null);
  for (const path of ['/admin/game', '/account/profile', '/account/avatar', '/wishlist', '/newswire', '/games']) {
    assert.equal(request(path), null);
    assert.equal(request(path, 'POST'), null);
  }
});

test('renderer cannot redirect authenticated API requests outside the allowlist', () => {
  for (const path of ['https://evil.test', '//evil.test/api/auth/me', '/../../admin/game', '/games/../../admin/game', '/%2e%2e/admin/game', '/auth/me/../logout', '/auth/me?redirect=https://evil.test']) assert.equal(request(path), null, path);
  assert.equal(request('/auth/me', 'DELETE'), null);
  assert.equal(request('/auth/me', 'TRACE'), null);
});

test('overlay can read profile, library and save metadata without accessing writes or save payloads', () => {
  const path = '/platform/achievements/00000000-0000-4000-8000-000000000001';
  assert(request(path, 'GET', {}, 'overlay'));
  for (const route of ['/auth/me', '/library', '/platform/saves/00000000-0000-4000-8000-000000000001']) {
    assert(request(route, 'GET', {}, 'overlay'));
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal(request(route, method, {}, 'overlay'), null);
  }
  for (const route of ['/library/catalog', '/auth/logout', '/platform/live-ticket', '/platform/saves/00000000-0000-4000-8000-000000000001/main.p8d.txt', '/platform/saves/invalid']) assert.equal(request(route, route === '/auth/logout' ? 'POST' : 'GET', {}, 'overlay'), null);
  assert.equal(request('/integrations/itch', 'DELETE', {}, 'overlay'), null);
  assert.equal(request('/library/00000000-0000-4000-8000-000000000001', 'POST', {}, 'overlay'), null);
  assert.equal(request(path, 'POST', {}, 'overlay'), null);
});

test('headers and request bodies are bounded before reaching native networking', () => {
  const result = request('/auth/me', 'GET', { headers: { Cookie: 'stolen', Authorization: 'Bearer stolen', 'Accept-Language': 'pt-BR', 'X-CSRF-Token': 'csrf' } });
  assert.equal(result.headers['Accept-Language'], 'pt-BR');
  assert.equal(result.headers['X-CSRF-Token'], 'csrf');
  assert.equal(result.headers.Cookie, undefined);
  assert.equal(result.headers.Authorization, undefined);
  assert.equal(request('/auth/mobile-login', 'POST', { body: { password: '😀'.repeat(5000) } }), null);
  const circular = {}; circular.self = circular;
  assert.equal(request('/auth/mobile-login', 'POST', { body: circular }), null);
  assert.equal(request('/auth/mobile-login', 'POST', { body: () => {} }), null);
});
