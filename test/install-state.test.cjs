const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { verifyGameInstallation, reconcileLibrary } = require('../electron/install-state.cjs');
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
