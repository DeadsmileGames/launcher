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
const zip = arg("--zip");
const target = path.resolve(arg("--target"));
const exe = path.resolve(arg("--exe"));
const confirmFile = path.resolve(arg("--confirm"));
const expectedVersion = arg("--expected-version").replace(/^v/i, "");
const tempRoot = path.dirname(zip);
const oldTarget = `${target}.old`;

if (!zip || !target || !exe || !confirmFile) {
  log("missing updater arguments");
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = async (p) => {
  try { await fsp.access(p); return true; } catch { return false; }
};

async function report(status, percent, extra = {}) {
  try {
    await fsp.writeFile(
      path.join(tempRoot, "progress.json"),
      JSON.stringify({ status, percent, updatedAt: Date.now(), ...extra }),
      "utf8",
    );
  } catch {}
}

async function extract() {
  const destination = path.join(tempRoot, "extracted");
  await fsp.rm(destination, { recursive: true, force: true });
  await fsp.mkdir(destination, { recursive: true });
  const command = "Expand-Archive -LiteralPath $env:DS_ZIP -DestinationPath $env:DS_DEST -Force";
  await new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command
    ], { windowsHide: true, env: { ...process.env, DS_ZIP: zip, DS_DEST: destination } });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim() || `extract:${code}`)));
  });
  return destination;
}

async function waitForProcessExit() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      await fsp.rename(exe, `${exe}.update-probe`);
      await fsp.rename(`${exe}.update-probe`, exe);
      return;
    } catch {}
    await sleep(250);
  }
  throw new Error("Launcher process did not release its executable in time.");
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
  const child = spawn(launcherExe, ["--update-confirm", confirmFile], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    cwd: path.dirname(launcherExe),
  });
  child.unref();

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await exists(confirmFile)) {
      const raw = await fsp.readFile(confirmFile, "utf8");
      const result = JSON.parse(raw);
      if (result?.version && (!expectedVersion || result.version.replace(/^v/i, "") === expectedVersion)) {
        return { child, version: result.version };
      }
      if (result?.version && expectedVersion) {
        throw new Error(`Startup version mismatch: expected ${expectedVersion}, got ${result.version}.`);
      }
    }
    await sleep(250);
  }

  try { process.kill(child.pid); } catch {}
  throw new Error("Updated launcher did not confirm startup.");
}

async function rollback() {
  try {
    await fsp.rm(target, { recursive: true, force: true });
  } catch {}
  if (await exists(oldTarget)) {
    await fsp.rename(oldTarget, target).catch((error) => {
      log(`rollback rename failed: ${error.message}`);
    });
  }
}

async function relaunchOriginal() {
  const child = spawn(exe, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    cwd: path.dirname(exe),
  });
  child.unref();
}

(async () => {
  let oldMoved = false;
  let newMoved = false;
  try {
    log(`=== updater started === zip=${zip} target=${target} exe=${exe}`);
    await report("installing", 1);
    await waitForProcessExit();

    const extracted = await extract();
    await report("installing", 25);

    // electron-builder's --dir artifact contains the launcher files at the
    // archive root. Reject malformed archives rather than partially replacing
    // the current installation.
    const newExe = await validateInstall(extracted);
    await report("installing", 45);

    await fsp.rm(oldTarget, { recursive: true, force: true });
    if (await exists(target)) {
      await moveDirectory(target, oldTarget);
      oldMoved = true;
    }

    try {
      await moveDirectory(extracted, target);
      newMoved = true;
      await report("installing", 75);

      const installedExe = await validateInstall(target);
      const confirmation = await launchAndConfirm(installedExe);
      await report("complete", 100, { version: confirmation.version });

      // The new process has confirmed that it booted. The .old tree is now
      // disposable. If Windows/antivirus temporarily keeps a handle open,
      // leaving .old behind is safe; it must never invalidate the new install.
      await fsp.rm(oldTarget, { recursive: true, force: true }).catch((cleanupError) => {
        log(`old install cleanup deferred: ${cleanupError.message}`);
      });
      await fsp.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
      log(`update successful: ${confirmation.version}`);
      process.exit(0);
    } catch (error) {
      log(`new install failed: ${error.stack || error.message}`);
      if (newMoved) await fsp.rm(target, { recursive: true, force: true }).catch(() => {});
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
