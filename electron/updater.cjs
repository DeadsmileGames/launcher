const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const LOG_FILE = path.join(os.tmpdir(), "updater.log");
function log(message) {
  try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`); } catch {}
}
function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}
const staging = path.resolve(arg("--staging"));
const target  = path.resolve(arg("--target"));
const exe     = path.resolve(arg("--exe"));
const confirmFile = path.resolve(arg("--confirm"));
const expectedVersion = arg("--expected-version").replace(/^v/i, "");
const tempRoot = path.dirname(staging);
const oldTarget = `${target}.old-${Date.now()}-${process.pid}`;

if (!staging || !target || !exe || !confirmFile) {
  log("missing updater arguments");
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = async (p) => {
  try { await fsp.access(p); return true; } catch { return false; }
};
let childProcess = null;
function cleanElectronEnv() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.ELECTRON_NO_ATTACH_CONSOLE;
  delete env.ELECTRON_ENABLE_LOGGING;
  delete env.ELECTRON_ENABLE_STACK_DUMPING;
  return env;
}

function spawnDetachedViaCmd(exe, args, cwd, env) {
  const startArgs = ["/c", "start", "", "/D", cwd, exe, ...args];
  const child = spawn("cmd.exe", startArgs, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    cwd,
    env,
  });
  child.unref();
  return child;
}

async function report(status, percent, extra = {}) {
  try {
    await fsp.writeFile(
      path.join(tempRoot, "progress.json"),
      JSON.stringify({ status, percent, updatedAt: Date.now(), ...extra }),
      "utf8",
    );
  } catch {}
}

function cleanupStaleBackups() {
  const parent = path.dirname(target);
  const base = path.basename(target);
  fsp.readdir(parent)
    .then((entries) => {
      for (const entry of entries) {
        if (entry === base) continue;
        if (entry === `${base}.old` || entry.startsWith(`${base}.old.stale-`)) {
          fsp
            .rm(path.join(parent, entry), { recursive: true, force: true })
            .catch(() => {});
        }
      }
    })
    .catch(() => {});
}

async function clearDestination(to) {
  if (!(await exists(to))) return;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      await fsp.rm(to, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 14) {
        log(`clearDestination: rm(${to}) failed: ${error.message}`);
      }
      await sleep(200);
    }
  }

  const stale = `${to}.stale-${Date.now()}-${process.pid}`;
  try {
    await fsp.rename(to, stale);
    log(`clearDestination: moved locked ${to} -> ${stale}`);
  } catch (error) {
    log(`clearDestination: rename(${to}) also failed: ${error.message}`);
    throw error;
  }
}

async function moveDirectory(from, to) {
  await fsp.rm(to, { recursive: true, force: true });
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await fsp.rename(from, to);
      return;
    } catch (error) {
      lastError = error;
      if (error.code === "EXDEV") {
        await fsp.cp(from, to, { recursive: true });
        await fsp.rm(from, { recursive: true, force: true });
        return;
      }
      await sleep(250);
    }
  }
  throw lastError || new Error(`Unable to move ${from} to ${to}.`);
}

async function validateInstall(directory) {
  const launcherExe = path.join(directory, path.basename(exe));
  if (!(await exists(launcherExe))) {
    throw new Error(`Updated launcher executable is missing: ${launcherExe}`);
  }
  const resources = path.join(directory, "resources");
  if (!(await exists(resources))) throw new Error("Updated launcher resources are missing.");
  return launcherExe;
}

async function launchAndConfirm(launcherExe) {
  await fsp.rm(confirmFile, { force: true });
  spawnDetachedViaCmd(
    launcherExe,
    ["--update-confirm", confirmFile],
    path.dirname(launcherExe),
    cleanElectronEnv(),
  );

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await exists(confirmFile)) {
      const raw = await fsp.readFile(confirmFile, "utf8");
      let result = null;
      try { result = JSON.parse(raw); } catch {}
      if (result?.version && (!expectedVersion || result.version.replace(/^v/i, "") === expectedVersion)) {
        await sleep(1500);
        return { version: result.version };
      }
      if (result?.version && expectedVersion) {
        throw new Error(`Startup version mismatch: expected ${expectedVersion}, got ${result.version}.`);
      }
    }
    await sleep(250);
  }

  throw new Error("Updated launcher did not confirm startup.");
}

async function rollback() {
  if (childProcess) {
    try { process.kill(childProcess.pid); } catch {}
    childProcess = null;
    await sleep(1000);
  }

  try {
    await fsp.rm(target, { recursive: true, force: true });
  } catch (error) {
    log(`rollback rm target failed: ${error.message}`);
  }

  if (await exists(oldTarget)) {
    await fsp.rename(oldTarget, target).catch((error) => {
      log(`rollback rename failed: ${error.message}`);
    });
  }
}

async function relaunchOriginal() {
  spawnDetachedViaCmd(
    exe,
    [],
    path.dirname(exe),
    cleanElectronEnv(),
  );
}

(async () => {
  let oldMoved = false;
  let newMoved = false;
  try {
    log(`=== updater started === staging=${staging} target=${target} exe=${exe}`);
    await report("installing", 1);

    if (!(await exists(staging))) throw new Error("Staging folder is missing.");
    const newExe = await validateInstall(staging);
    await report("installing", 25);

    await report("installing", 45);
    let movedTarget = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try {
        await fsp.rename(target, oldTarget);
        movedTarget = true;
        break;
      } catch (error) {
        const code = error.code;
        if (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") {
          throw error;
        }
        if (attempt === 0 || attempt % 10 === 0) {
          log(`waiting for target release, attempt ${attempt}: ${error.message}`);
        }
        await sleep(500);
      }
    }
    if (!movedTarget) {
      throw new Error("Launcher did not release its installation directory in time.");
    }
    oldMoved = true;

    try {
      await moveDirectory(staging, target);
      newMoved = true;
      await report("installing", 75);

      const installedExe = await validateInstall(target);
      const confirmation = await launchAndConfirm(installedExe);
      await report("complete", 100, { version: confirmation.version });
      await fsp.rm(oldTarget, { recursive: true, force: true }).catch((cleanupError) => {
        log(`old install cleanup deferred: ${cleanupError.message}`);
      });
      cleanupStaleBackups();
      await fsp.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
      log(`update successful: ${confirmation.version}`);
      process.exit(0);
    } catch (error) {
      log(`new install failed: ${error.stack || error.message}`);
      if (childProcess) {
        try { process.kill(childProcess.pid); } catch {}
        childProcess = null;
        await sleep(1000);
      }

      if (newMoved) {
        await fsp.rm(target, { recursive: true, force: true }).catch((rmError) => {
          log(`rollback rm target failed: ${rmError.message}`);
        });
      }
      if (oldMoved && await exists(oldTarget)) {
        await fsp.rename(oldTarget, target).catch((rollbackError) => {
          log(`rollback failed: ${rollbackError.stack || rollbackError.message}`);
        });
      }
      await report("failed", 0, { error: error.message });
      await sleep(500);
      if (await exists(exe)) await relaunchOriginal().catch(() => {});
      process.exit(1);
    }
  } catch (error) {
    log(`fatal: ${error.stack || error.message}`);
    await report("failed", 0, { error: error.message });
    if (oldMoved) await rollback();
    await sleep(500);
    if (await exists(exe)) await relaunchOriginal().catch(() => {});
    process.exit(1);
  }
})();
