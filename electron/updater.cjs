const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : ''; }
const zip = arg('--zip');
const target = arg('--target');
const exe = arg('--exe');
if (!zip || !target || !exe) process.exit(2);
const progressFile = path.join(path.dirname(zip), 'progress.json');
async function report(status, percent) { try { await fsp.writeFile(progressFile, JSON.stringify({ status, percent, updatedAt: Date.now() })); } catch {} }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function extract() {
  const temp = path.join(path.dirname(zip), 'extracted');
  await fsp.rm(temp, { recursive: true, force: true });
  await fsp.mkdir(temp, { recursive: true });
  const command = 'Expand-Archive -LiteralPath $env:DS_ZIP -DestinationPath $env:DS_DEST -Force';
  await new Promise((resolve, reject) => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true, env: { ...process.env, DS_ZIP: zip, DS_DEST: temp } });
    p.once('error', reject); p.once('close', code => code === 0 ? resolve() : reject(new Error(`extract:${code}`)));
  });
  return temp;
}
async function copyTree(from, to) {
  await fsp.mkdir(to, { recursive: true });
  for (const entry of await fsp.readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name); const dst = path.join(to, entry.name);
    if (entry.isDirectory()) await copyTree(src, dst);
    else await fsp.copyFile(src, dst);
  }
}
(async () => {
  for (let i = 0; i < 60; i += 1) { try { await fsp.access(exe, fs.constants.W_OK); break; } catch {} await sleep(250); }
  await report('installing', 5);
  const extracted = await extract();
  const countFiles = async dir => { let n = 0; for (const e of await fsp.readdir(dir, { withFileTypes: true })) n += e.isDirectory() ? await countFiles(path.join(dir, e.name)) : 1; return n; };
  const totalFiles = Math.max(1, await countFiles(extracted));
  let copied = 0;
  const copyTreeProgress = async (from, to) => { await fsp.mkdir(to, { recursive: true }); for (const entry of await fsp.readdir(from, { withFileTypes: true })) { const src = path.join(from, entry.name); const dst = path.join(to, entry.name); if (entry.isDirectory()) await copyTreeProgress(src, dst); else { await fsp.copyFile(src, dst); copied += 1; await report('installing', Math.min(99, 5 + Math.round(copied / totalFiles * 94))); } } };
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { await copyTreeProgress(extracted, target); lastError = null; break; }
    catch (error) { lastError = error; await sleep(250); }
  }
  if (lastError) throw lastError;
  await report('complete', 100);
  await sleep(250);
  await fsp.rm(path.dirname(zip), { recursive: true, force: true }).catch(() => {});
  spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  process.exit(0);
})().catch(async () => { await sleep(1000); try { spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch {} process.exit(1); });
