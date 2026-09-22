const fs = require('node:fs/promises');

async function exists(target) {
  try { await fs.lstat(target); return true; }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

// Source and destination must be on the same volume. Do not overwrite an
// unresolved backup: it may be the player's only recoverable installation.
async function swapWithBackup({ gameFolder, stagingFolder, validateInstalled, checkInterrupted = () => {} }) {
  const backupFolder = `${gameFolder}.old`;
  if (await exists(backupFolder)) {
    if (await exists(gameFolder)) throw new Error('GAME_BACKUP_REQUIRES_RECOVERY');
    await fs.rename(backupFolder, gameFolder);
  }
  checkInterrupted();
  let movedOld = false;
  let movedNew = false;
  let executable;
  try {
    if (await exists(gameFolder)) {
      await fs.rename(gameFolder, backupFolder);
      movedOld = true;
    }
    await fs.rename(stagingFolder, gameFolder);
    movedNew = true;
    executable = await validateInstalled(gameFolder);
    if (!executable) throw new Error('WINDOWS_EXECUTABLE_MISSING');
    checkInterrupted();
  } catch (error) {
    if (movedNew) {
      try { await fs.rm(gameFolder, { recursive: true, force: true }); }
      catch (rollbackError) { throw new AggregateError([error, rollbackError], 'GAME_ROLLBACK_FAILED'); }
    }
    if (movedOld) {
      try { await fs.rename(backupFolder, gameFolder); }
      catch (rollbackError) { throw new AggregateError([error, rollbackError], 'GAME_ROLLBACK_FAILED'); }
    }
    throw error;
  }
  // Point of commitment. A late cancellation cannot invalidate this result.
  // Backup cleanup is best-effort and must not roll back a valid install.
  if (movedOld) {
    try { await fs.rm(backupFolder, { recursive: true, force: true }); }
    catch (error) { console.warn('[Install] Preserved old installation backup:', error?.message || error); }
  }
  return executable;
}

module.exports = { swapWithBackup };
