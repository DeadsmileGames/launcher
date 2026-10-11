const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const source = require('node:fs').readFileSync(require.resolve('../electron/main.cjs'), 'utf8');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createGameOperations } = require('../electron/game-operations.cjs');
const id = '00000000-0000-4000-8000-000000000008';
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'deadsmile-native-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(root, id);
  await fs.mkdir(folder); await fs.writeFile(path.join(folder, 'game.exe'), 'original');
  const handlers = new Map();
  const context = { path, fsp: fs, console, GAMES_DIR: root, updateInProgress: false, playSessions: new Map(), launchRequests: new Set(), gameOperations: createGameOperations(), downloadQueue: { jobs: new Map(), snapshot: () => [] }, UUID_PATTERN: /^[0-9a-f-]{36}$/i, trustedGameMetadata: async () => ({ slug: 'game' }), sanitizeName: (value) => value, removeGameDesktopShortcuts: async () => {}, isPathInside: (parent, child) => { const relative = path.relative(parent, child); return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); }, resolveExistingPathInsideRoot: async (_root, candidate) => candidate, secureIpcHandle: (name, handler) => handlers.set(name, handler) };
  vm.createContext(context);
  const start = source.indexOf('  secureIpcHandle("deadsmile:delete-game",');
  vm.runInContext(source.slice(start, source.indexOf('  createWindow();', start)), context);
  return { context, folder, uninstall: () => handlers.get('deadsmile:delete-game')(null, { id, target: folder, slug: 'game' }) };
}

test('native uninstall rechecks a launch that begins during metadata verification', async (t) => {
  const { context, folder, uninstall } = await fixture(t);
  let finish;
  context.trustedGameMetadata = () => new Promise((resolve) => { finish = resolve; });
  const result = uninstall(); await tick();
  context.launchRequests.add(id); finish({ slug: 'game' });
  assert.equal((await result).code, 'GAME_RUNNING');
  assert.equal(await fs.readFile(path.join(folder, 'game.exe'), 'utf8'), 'original');
});

test('native uninstall rechecks a download that starts during metadata verification', async (t) => {
  const { context, folder, uninstall } = await fixture(t);
  let finish;
  context.trustedGameMetadata = () => new Promise((resolve) => { finish = resolve; });
  const result = uninstall(); await tick();
  context.downloadQueue.jobs.set(id, { _workerActive: true, status: 'installing' }); finish({ slug: 'game' });
  assert.equal((await result).code, 'GAME_DOWNLOAD_IN_PROGRESS');
  assert.equal(await fs.readFile(path.join(folder, 'game.exe'), 'utf8'), 'original');
});

test('native uninstall waits for an existing game operation and removes only its own folder', async (t) => {
  const { context, folder, uninstall } = await fixture(t);
  const other = path.join(context.GAMES_DIR, 'other'); await fs.mkdir(other); await fs.writeFile(path.join(other, 'keep.txt'), 'keep');
  let finish;
  const operation = context.gameOperations.run(id, () => new Promise((resolve) => { finish = resolve; }));
  const result = uninstall(); await tick();
  assert.equal(await fs.readFile(path.join(folder, 'game.exe'), 'utf8'), 'original');
  finish(); await operation;
  assert.equal(await result, '');
  await assert.rejects(fs.stat(folder), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(other, 'keep.txt'), 'utf8'), 'keep');
});

test('native updater blocks pending launches and filesystem operations before fetching an update', async () => {
  const context = { IS_MICROSOFT_STORE: false, updateInProgress: false, playSessions: new Map(), launchRequests: new Set([id]), gameOperations: createGameOperations(), downloadQueue: { snapshot: () => [] }, checkForUpdate: () => { throw new Error('Must not fetch'); } };
  vm.createContext(context);
  const start = source.indexOf('async function updateLauncher(');
  vm.runInContext(source.slice(start, source.indexOf('\nasync function authenticodeIdentity', start)), context);
  await assert.rejects(context.updateLauncher({}), /UPDATE_BUSY/);
  context.launchRequests.clear();
  let finish;
  const operation = context.gameOperations.run(id, () => new Promise((resolve) => { finish = resolve; }));
  await tick();
  await assert.rejects(context.updateLauncher({}), /UPDATE_BUSY/);
  finish(); await operation;
});
