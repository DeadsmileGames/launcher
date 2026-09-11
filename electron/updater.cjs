const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

// ⬇️ LOG em %TEMP%\updater.log
const LOG_FILE = path.join(os.tmpdir(), 'updater.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : '';
}

const zip = arg('--zip');
const target = arg('--target');
const exe = arg('--exe');

log('=== updater started ===');
log(`zip=${zip}`);
log(`target=${target}`);
log(`exe=${exe}`);

if (!zip || !target || !exe) {
  log('missing args, exit 2');
  process.exit(2);
}

const progressFile = path.join(path.dirname(zip), 'progress.json');
async function report(status, percent) {
  try {
    await fsp.writeFile(progressFile, JSON.stringify({ status, percent, updatedAt: Date.now() }));
  } catch {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function extract() {
  const temp = path.join(path.dirname(zip), 'extracted');
  await fsp.rm(temp, { recursive: true, force: true });
  await fsp.mkdir(temp, { recursive: true });
  const command = 'Expand-Archive -LiteralPath $env:DS_ZIP -DestinationPath $env:DS_DEST -Force';
  await new Promise((resolve, reject) => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      windowsHide: true,
      env: { ...process.env, DS_ZIP: zip, DS_DEST: temp },
    });
    p.once('error', reject);
    p.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`extract:${code}`))));
  });
  return temp;
}

// ⬇️ relança com listener e retry
async function relaunch() {
  log('relaunch: waiting 2s for old process to release files');
  await sleep(2000);

  for (let attempt = 1; attempt <= 5; attempt++) {
    log(`relaunch attempt ${attempt}: ${exe}`);
    try {
      const child = spawn(exe, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        cwd: path.dirname(exe), // ⬅️ working directory correto
      });

      child.on('error', (err) => {
        log(`relaunch attempt ${attempt} error: ${err.message}`);
      });

      child.unref();
      log(`relaunch spawned pid ${child.pid}`);
      await sleep(800);
      return true;
    } catch (err) {
      log(`relaunch attempt ${attempt} threw: ${err.message}`);
      await sleep(1500);
    }
  }
  log('relaunch FAILED after 5 attempts');
  return false;
}

(async () => {
  try {
    log('waiting for exe to be writable');
    for (let i = 0; i < 60; i += 1) {
      try {
        await fsp.access(exe, fs.constants.W_OK);
        log(`exe writable after ${i * 250}ms`);
        break;
      } catch {}
      await sleep(250);
    }

    await report('installing', 5);

    log('extracting zip');
    const extracted = await extract();
    log(`extracted to ${extracted}`);

    const countFiles = async (dir) => {
      let n = 0;
      for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
        n += e.isDirectory() ? await countFiles(path.join(dir, e.name)) : 1;
      }
      return n;
    };

    const totalFiles = Math.max(1, await countFiles(extracted));
    log(`total files: ${totalFiles}`);

    let copied = 0;
    const copyTreeProgress = async (from, to) => {
      await fsp.mkdir(to, { recursive: true });
      for (const entry of await fsp.readdir(from, { withFileTypes: true })) {
        const src = path.join(from, entry.name);
        const dst = path.join(to, entry.name);
        if (entry.isDirectory()) await copyTreeProgress(src, dst);
        else {
          await fsp.copyFile(src, dst);
          copied += 1;
          await report('installing', Math.min(99, 5 + Math.round((copied / totalFiles) * 94)));
        }
      }
    };

    let lastError;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        await copyTreeProgress(extracted, target);
        lastError = null;
        log(`copy completed on attempt ${attempt + 1}`);
        break;
      } catch (error) {
        lastError = error;
        log(`copy attempt ${attempt + 1} failed: ${error.message}`);
        await sleep(250);
      }
    }

    if (lastError) {
      log(`copy FAILED after 60 attempts: ${lastError.message}`);
      throw lastError;
    }

    await report('complete', 100);
    await sleep(250);

    log('cleaning temp dir');
    await fsp.rm(path.dirname(zip), { recursive: true, force: true }).catch(() => {});

    log('starting relaunch');
    await relaunch();

    log('done, exit 0');
    process.exit(0);
  } catch (error) {
    log(`FATAL: ${error.message}`);
    log(`stack: ${error.stack}`);
    await sleep(1000);
    log('fallback relaunch');
    await relaunch();
    process.exit(1);
  }
})();