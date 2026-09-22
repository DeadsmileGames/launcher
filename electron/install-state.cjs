// Verify the filesystem rather than trusting the install record stored by the renderer.
// Only ENOENT is evidence that an installation was removed; permission/I/O errors
// must not silently delete the player's install record.
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
  // Each game is installed in its own immediate child directory.
  if (components.length < 2 || components[0] === '.deadsmile-staging') return 'invalid';
  const gameFolder = path.join(directory, components[0]);
  if (entry.folderPath && path.resolve(entry.folderPath) !== gameFolder) return 'invalid';
  let current = directory;
  try {
    // An inaccessible/missing library root may be a disconnected drive, not
    // evidence that the user removed every game in it.
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

async function reconcileLibrary(root, library) {
  if (!library || typeof library !== 'object' || Array.isArray(library)) return {};
  const result = {};
  for (const [id, entry] of Object.entries(library)) {
    const status = await verifyGameInstallation(root, entry);
    if (status === 'installed' || status === 'unavailable') result[id] = entry;
  }
  return result;
}

module.exports = { inside, verifyGameInstallation, reconcileLibrary };
