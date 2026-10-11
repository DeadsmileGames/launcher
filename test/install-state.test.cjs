const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { verifyGameInstallation, writeInstallRecord, reconcileLibrary, migrateLibraryIdentity } = require('../electron/install-state.cjs');
const { swapWithBackup } = require('../electron/install-transaction.cjs');
async function sandbox(t) { const dir=await fs.mkdtemp(path.join(os.tmpdir(),'deadsmile-test-')); t.after(()=>fs.rm(dir,{recursive:true,force:true})); return dir; }

test('an erased game is no longer installed, but an intact game remains', async t => {
  const root=await sandbox(t);const dir=path.join(root,'one');await fs.mkdir(dir);
  const exe=path.join(dir,'game.exe');await fs.writeFile(exe,'bin');
  const entry={path:exe,folderPath:dir};
  assert.equal(await verifyGameInstallation(root,entry),'installed');
  assert.deepEqual(await reconcileLibrary(root,{one:entry}),{one:entry});
  await fs.rm(dir,{recursive:true});
  assert.equal(await verifyGameInstallation(root,entry),'missing');
  assert.deepEqual(await reconcileLibrary(root,{one:entry}),{});
});

test('an inaccessible library root does not erase the install registry', async t => {
  const root=path.join(await sandbox(t),'disconnected');
  const entry={path:path.join(root,'one','game.exe'), folderPath:path.join(root,'one')};
  assert.equal(await verifyGameInstallation(root,entry),'unavailable');
  assert.deepEqual(await reconcileLibrary(root,{one:entry}),{one:entry});
});

test('an entry outside the game root or pointing through a symlink is invalid', async t => {
  const root=await sandbox(t);const dir=path.join(root,'one');await fs.mkdir(dir);
  assert.equal(await verifyGameInstallation(root,{path:path.join(os.tmpdir(),'outside.exe')}),'invalid');
  const other=path.join(root,'other');await fs.mkdir(other);await fs.writeFile(path.join(other,'game.exe'),'bin');
  await fs.symlink(other,path.join(dir,'linked'),'dir');
  assert.equal(await verifyGameInstallation(root,{path:path.join(dir,'linked','game.exe')}),'invalid');
});

test('legacy installs move to immutable game IDs and survive slug changes', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000001';
  const folder = path.join(root, 'original-slug');
  await fs.mkdir(folder); await fs.writeFile(path.join(folder, 'game.exe'), 'bin');
  const library = { [id]: { path: path.join(folder, 'game.exe'), folderPath: folder } };
  const migrated = await migrateLibraryIdentity(root, library, [{ id, slug: 'original-slug' }]);
  assert.equal(migrated[id].folderPath, path.join(root, id));
  assert.equal(await verifyGameInstallation(root, migrated[id]), 'installed');
  assert.deepEqual(await migrateLibraryIdentity(root, migrated, [{ id, slug: 'changed-slug' }]), migrated);
});

test('legacy migration cannot move another game, overwrite a destination or move running games', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000002';
  const folder = path.join(root, 'original-slug');
  await fs.mkdir(folder); await fs.writeFile(path.join(folder, 'game.exe'), 'bin');
  const library = { [id]: { path: path.join(folder, 'game.exe'), folderPath: folder } };
  assert.deepEqual(await migrateLibraryIdentity(root, library, [{ id, slug: 'another-game' }]), library);
  assert.deepEqual(await migrateLibraryIdentity(root, library, [{ id, slug: 'original-slug' }], new Set([id])), library);
  await fs.mkdir(path.join(root, id)); await fs.writeFile(path.join(root, id, 'keep.txt'), 'original');
  assert.deepEqual(await migrateLibraryIdentity(root, library, [{ id, slug: 'original-slug' }]), library);
  assert.equal(await fs.readFile(path.join(root, id, 'keep.txt'), 'utf8'), 'original');
});

test('restart recovers an ID folder when migration ended before the renderer saved its path', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000003';
  const migrated = path.join(root, id);
  await fs.mkdir(path.join(migrated, 'bin'), { recursive: true });
  await fs.writeFile(path.join(migrated, 'bin', 'game.exe'), 'original');
  const restored = await reconcileLibrary(root, { [id]: { path: path.join(root, 'old-slug', 'bin', 'game.exe'), folderPath: path.join(root, 'old-slug'), version: '1.0.0' } });
  assert.equal(restored[id]?.path, path.join(migrated, 'bin', 'game.exe'));
  assert.equal(restored[id]?.version, '1.0.0');
  assert.equal(await verifyGameInstallation(root, restored[id]), 'installed');
});

test('restart restores an orphan backup without replacing another existing installation', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000004';
  const folder = path.join(root, id);
  await fs.mkdir(`${folder}.old`);
  await fs.writeFile(path.join(`${folder}.old`, 'game.exe'), 'old');
  const library = { [id]: { path: path.join(folder, 'game.exe'), folderPath: folder } };
  const restored = await reconcileLibrary(root, library);
  assert.equal(await verifyGameInstallation(root, restored[id]), 'installed');
  assert.equal(await fs.readFile(path.join(folder, 'game.exe'), 'utf8'), 'old');
  await fs.mkdir(`${folder}.old`); await fs.writeFile(path.join(`${folder}.old`, 'game.exe'), 'backup');
  assert.deepEqual(await reconcileLibrary(root, restored), restored);
  assert.equal(await fs.readFile(path.join(`${folder}.old`, 'game.exe'), 'utf8'), 'backup');
});

test('install failure restores previous directory', async t => {
  const root=await sandbox(t), gameFolder=path.join(root,'game'), stagingFolder=path.join(root,'stage');
  await fs.mkdir(gameFolder);await fs.writeFile(path.join(gameFolder,'game.exe'),'old');
  await fs.mkdir(stagingFolder);
  await assert.rejects(swapWithBackup({gameFolder,stagingFolder,validateInstalled:async()=>null}),/WINDOWS_EXECUTABLE_MISSING/);
  assert.equal(await fs.readFile(path.join(gameFolder,'game.exe'),'utf8'),'old');
  await assert.rejects(fs.stat(`${gameFolder}.old`),{code:'ENOENT'});
});

test('existing backup is never overwritten, and orphan backup is recovered', async t => {
  const root=await sandbox(t), gameFolder=path.join(root,'game'), stagingFolder=path.join(root,'stage');
  await fs.mkdir(gameFolder);await fs.mkdir(`${gameFolder}.old`);await fs.mkdir(stagingFolder);
  await assert.rejects(swapWithBackup({gameFolder,stagingFolder,validateInstalled:async()=>true}),/GAME_BACKUP_REQUIRES_RECOVERY/);
  await fs.rm(gameFolder,{recursive:true});
  await fs.writeFile(path.join(`${gameFolder}.old`,'game.exe'),'old');
  await assert.rejects(swapWithBackup({gameFolder,stagingFolder,validateInstalled:async()=>null}),/WINDOWS_EXECUTABLE_MISSING/);
  assert.equal(await fs.readFile(path.join(gameFolder,'game.exe'),'utf8'),'old');
});

test('successful install moves staging into place and removes old version', async t=>{
 const root=await sandbox(t), gameFolder=path.join(root,'game'), stagingFolder=path.join(root,'stage');
 await fs.mkdir(gameFolder);await fs.writeFile(path.join(gameFolder,'game.exe'),'old');
 await fs.mkdir(stagingFolder);await fs.writeFile(path.join(stagingFolder,'game.exe'),'new');
 const exe=await swapWithBackup({gameFolder,stagingFolder,validateInstalled:async dir=>path.join(dir,'game.exe')});
 assert.equal(exe,path.join(gameFolder,'game.exe'));
 assert.equal(await fs.readFile(exe,'utf8'),'new');
 await assert.rejects(fs.stat(`${gameFolder}.old`),{code:'ENOENT'});
});

test('recovery rejects unsafe registry paths, symbolic backups and occupied ID folders', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000005';
  const folder = path.join(root, id);
  const elsewhere = path.join(root, 'elsewhere');
  await fs.mkdir(elsewhere); await fs.writeFile(path.join(elsewhere, 'game.exe'), 'bin');
  await fs.symlink(elsewhere, `${folder}.old`, 'dir');
  const entry = { path: path.join(folder, 'game.exe'), folderPath: folder };
  assert.deepEqual(await reconcileLibrary(root, { [id]: entry }), {});
  await fs.rm(`${folder}.old`); await fs.mkdir(`${folder}.old`); await fs.writeFile(path.join(`${folder}.old`, 'game.exe'), 'backup');
  assert.deepEqual(await reconcileLibrary(root, { [id]: { path: path.join(root, '..', 'outside.exe') } }), {});
  await fs.mkdir(folder); await fs.writeFile(path.join(folder, 'keep.txt'), 'keep');
  assert.deepEqual(await reconcileLibrary(root, { [id]: entry }), {});
  assert.equal(await fs.readFile(path.join(folder, 'keep.txt'), 'utf8'), 'keep');
  assert.equal(await fs.readFile(path.join(`${folder}.old`, 'game.exe'), 'utf8'), 'backup');
});

test('migration rechecks live activity immediately before moving a legacy folder', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000006';
  const folder = path.join(root, 'original-slug');
  await fs.mkdir(folder); await fs.writeFile(path.join(folder, 'game.exe'), 'bin');
  const library = { [id]: { path: path.join(folder, 'game.exe'), folderPath: folder } };
  let checks = 0;
  const result = await migrateLibraryIdentity(root, library, [{ id, slug: 'original-slug' }], () => ++checks > 1);
  assert.deepEqual(result, library);
  assert.equal(await verifyGameInstallation(root, library[id]), 'installed');
});

test('reconciliation retains an entry while an install is committing', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000007';
  const library = { [id]: { path: path.join(root, id, 'game.exe'), folderPath: path.join(root, id) } };
  assert.deepEqual(await reconcileLibrary(root, library, { isBusy: () => true }), library);
  assert.deepEqual(await reconcileLibrary(root, library), {});
});

test('an install committed before the renderer received its result is rediscovered with its real version', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000009';
  const folder = path.join(root, id); await fs.mkdir(folder);
  const executable = path.join(folder, 'new.exe'); await fs.writeFile(executable, 'new');
  await writeInstallRecord(folder, id, executable, '2.0.0');
  const discovered = await reconcileLibrary(root, {});
  assert.equal(discovered[id]?.path, executable); assert.equal(discovered[id]?.version, '2.0.0');
  const refreshed = await reconcileLibrary(root, { [id]: { path: path.join(folder, 'old.exe'), folderPath: folder, version: '1.0.0' } });
  assert.equal(refreshed[id]?.path, executable); assert.equal(refreshed[id]?.version, '2.0.0');
});

test('only a matching safe install record can rediscover a game and restore an orphan backup', async (t) => {
  const root = await sandbox(t);
  const id = '00000000-0000-4000-8000-000000000010';
  const folder = path.join(root, id); const backup = `${folder}.old`; await fs.mkdir(backup);
  const executable = path.join(backup, 'game.exe'); await fs.writeFile(executable, 'backup');
  await writeInstallRecord(backup, id, executable, '1.0.0');
  const restored = await reconcileLibrary(root, {});
  assert.equal(restored[id]?.path, path.join(folder, 'game.exe'));
  assert.equal(restored[id]?.version, '1.0.0');
  const marker = path.join(folder, '.deadsmile-install.json');
  await fs.writeFile(marker, JSON.stringify({ gameId: id, executable: '../outside.exe' }));
  assert.deepEqual(await reconcileLibrary(root, {}), {});
  await fs.writeFile(marker, JSON.stringify({ gameId: 'another-game', executable: 'game.exe' }));
  assert.deepEqual(await reconcileLibrary(root, {}), {});
  await fs.writeFile(marker, 'x'.repeat(4097));
  assert.deepEqual(await reconcileLibrary(root, {}), {});
  await fs.rm(marker); const other = path.join(root, 'other.json'); await fs.writeFile(other, JSON.stringify({ gameId: id, executable: 'game.exe' })); await fs.symlink(other, marker);
  assert.deepEqual(await reconcileLibrary(root, {}), {});
});
