const path = require('node:path');
const fs = require('node:fs/promises');

function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function verifyGameInstallation(root, entry) {
  if (!entry || typeof entry.path !== 'string' || !entry.path.trim()) return 'invalid';
  const directory = path.resolve(root);
  const executable = path.resolve(entry.path);
  if (!inside(directory, executable) || path.extname(executable).toLowerCase() !== '.exe') return 'invalid';
  const components = path.relative(directory, executable).split(path.sep);
  if (components.length < 2 || components[0] === '.deadsmile-staging') return 'invalid';
  const gameFolder = path.join(directory, components[0]);
  if (entry.folderPath && path.resolve(entry.folderPath) !== gameFolder) return 'invalid';
  let current = directory;
  try {
    const rootStat = await fs.lstat(directory).catch(() => null);
    if (!rootStat) return 'unavailable';
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return 'invalid';
    for (let i = -1; i < components.length; i += 1) {
      if (i >= 0) current = path.join(current, components[i]);
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) return 'invalid';
      if (i === components.length - 1 ? !stat.isFile() : !stat.isDirectory()) return 'invalid';
    }
    const [realRoot, realExecutable] = await Promise.all([fs.realpath(directory), fs.realpath(executable)]);
    return inside(realRoot, realExecutable) ? 'installed' : 'invalid';
  } catch (error) {
    return error?.code === 'ENOENT' ? 'missing' : 'unavailable';
  }
}

const validId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const idle = () => false;
const direct = (_id, operation) => operation();

const recordName = '.deadsmile-install.json';

async function writeInstallRecord(folder, id, executable, version) {
  if (!validId(id) || !inside(folder, executable) || path.extname(executable).toLowerCase() !== '.exe') throw new Error('GAME_PATH_UNSAFE');
  const record = { gameId: id, executable: path.relative(folder, executable).split(path.sep).join('/'), version: typeof version === 'string' ? version.slice(0, 80) : null };
  await fs.writeFile(path.join(folder, recordName), JSON.stringify(record), { mode: 0o600 });
}

async function readInstallRecord(root, id, folder) {
  try {
    const marker = path.join(folder, recordName);
    const stat = await fs.lstat(marker);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) return null;
    const record = JSON.parse(await fs.readFile(marker, 'utf8'));
    if (record.gameId !== id || typeof record.executable !== 'string' || record.executable.length > 2000 || /[\\:\x00-\x1f]/.test(record.executable)) return null;
    const executable = path.resolve(folder, record.executable);
    if (!inside(folder, executable) || path.isAbsolute(record.executable) || record.executable.split('/').some((part) => !part || part === '.' || part === '..')) return null;
    const entry = { path: executable, folderPath: folder, filename: path.basename(executable), version: typeof record.version === 'string' ? record.version.slice(0, 80) : null };
    return await verifyGameInstallation(root, entry) === 'installed' ? entry : null;
  } catch { return null; }
}

async function recoverGameInstallation(root, id, entry, isBusy = idle) {
  if (!validId(id)) return entry;
  const status = await verifyGameInstallation(root, entry);
  if (!['installed', 'missing'].includes(status)) return entry;
  const directory = path.resolve(root);
  const parts = path.relative(directory, path.resolve(entry.path)).split(path.sep);
  const folder = path.join(directory, id);
  const recorded = await readInstallRecord(root, id, folder);
  if (recorded && (status === 'missing' || parts[0] === id)) return { ...entry, ...recorded };
  if (status !== 'missing') return entry;
  const candidate = { ...entry, path: path.join(folder, ...parts.slice(1)), folderPath: folder };
  if (await verifyGameInstallation(root, candidate) === 'installed') return candidate;
  try {
    const occupied = await fs.lstat(folder).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
    if (occupied) return entry;
    const backup = `${folder}.old`;
    const backupEntry = await readInstallRecord(root, id, backup) || { ...candidate, path: path.join(backup, ...parts.slice(1)), folderPath: backup };
    if (await verifyGameInstallation(root, backupEntry) !== 'installed' || isBusy(id)) return entry;
    await fs.rename(backup, folder);
    const restored = { ...entry, ...backupEntry, path: path.join(folder, path.relative(backup, backupEntry.path)), folderPath: folder };
    return await verifyGameInstallation(root, restored) === 'installed' ? restored : entry;
  } catch { return entry; }
}

async function reconcileLibrary(root, library, { isBusy = idle, run = direct } = {}) {
  if (!library || typeof library !== 'object' || Array.isArray(library)) return {};
  const result = {};
  for (const [id, entry] of Object.entries(library)) {
    await run(id, async () => {
      const restored = isBusy(id) ? entry : await recoverGameInstallation(root, id, entry, isBusy);
      const status = await verifyGameInstallation(root, restored);
      if (status === 'installed' || status === 'unavailable' || (status === 'missing' && isBusy(id))) result[id] = restored;
    });
  }
  const folders = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const ids = new Set(folders.filter((item) => item.isDirectory() && !item.isSymbolicLink()).map((item) => item.name.replace(/\.old$/, '')).filter(validId));
  for (const id of ids) {
    if (result[id]) continue;
    await run(id, async () => {
      if (isBusy(id)) return;
      const folder = path.join(path.resolve(root), id);
      const record = await readInstallRecord(root, id, folder);
      if (record) { result[id] = record; return; }
      const backup = await readInstallRecord(root, id, `${folder}.old`);
      if (!backup) return;
      const entry = { ...backup, path: path.join(folder, path.relative(`${folder}.old`, backup.path)), folderPath: folder };
      const restored = await recoverGameInstallation(root, id, entry, isBusy);
      if (await verifyGameInstallation(root, restored) === 'installed') result[id] = restored;
    });
  }
  return result;
}

async function migrateLibraryIdentity(root, library, games, busyIds = new Set(), run = direct) {
  const isBusy = typeof busyIds === 'function' ? busyIds : (id) => busyIds.has(id);
  const metadata = new Map((Array.isArray(games) ? games : []).map((game) => [game.id, game]));
  const result = { ...library };
  for (const [id, entry] of Object.entries(result)) {
    await run(id, async () => {
      const game = metadata.get(id);
      if (!validId(id) || !/^[a-z0-9-]{2,120}$/.test(game?.slug || '') || isBusy(id)) return;
      if (await verifyGameInstallation(root, entry) !== 'installed') return;
      const legacy = path.join(path.resolve(root), game.slug);
      const target = path.join(path.resolve(root), id);
      const folder = path.join(path.resolve(root), path.relative(path.resolve(root), path.resolve(entry.path)).split(path.sep)[0]);
      if (folder !== legacy || folder === target) return;
      try {
        const occupied = await fs.lstat(target).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
        if (occupied || isBusy(id)) return;
        await fs.rename(legacy, target);
        result[id] = { ...entry, path: path.join(target, path.relative(legacy, path.resolve(entry.path))), folderPath: target };
      } catch {}
    });
  }
  return result;
}

module.exports = { inside, verifyGameInstallation, writeInstallRecord, recoverGameInstallation, reconcileLibrary, migrateLibraryIdentity };
