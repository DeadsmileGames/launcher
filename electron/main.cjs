const { app, BrowserWindow, ipcMain, session, shell, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const { Readable } = require("node:stream");
const crypto = require("node:crypto");
const { Client, Instance } = require("@itchio/butlerd");
const butlerMessages = require("./butlerd-messages.cjs");
const { DownloadQueue } = require("./download-queue.cjs");
const STORAGE_ROOT = path.join(
  app.getPath("documents"),
  "Deadsmile Games Launcher",
);
const SETTINGS_DIR = path.join(STORAGE_ROOT, "settings");
const GAMES_DIR = path.join(STORAGE_ROOT, "Games");
const PLAYTIME_FILE = path.join(SETTINGS_DIR, "playtime.json");
const BUTLER_ROOT = path.join(SETTINGS_DIR, "butler");
const BUTLER_EXE = path.join(BUTLER_ROOT, "butler.exe");
const BUTLER_VERSION_FILE = path.join(BUTLER_ROOT, "version.txt");
const BUTLER_PATH_FILE = path.join(BUTLER_ROOT, "executable.txt");
const BUTLER_DB = path.join(SETTINGS_DIR, "butler.db");
const BUTLER_BROTH = "https://broth.itch.zone/butler/windows-amd64";
const IS_MICROSOFT_STORE = Boolean(process.windowsStore);
const playSessions = new Map();
let butlerInstance = null;
let butlerClient = null;
const API_ALLOWED_PATHS = [
  /^\/csrf$/,
  /^\/auth\/me$/,
  /^\/auth\/mobile-login$/,
  /^\/auth\/verify-2fa$/,
  /^\/auth\/logout$/,
  /^\/games(\?|\/|$)/,
  /^\/news(\?|\/|$)/,
  /^\/videos(\?|\/|$)/,
  /^\/search(\?|$)/,
  /^\/wishlist(\?|\/|$)/,
  /^\/account(\?|\/|$)/,
  /^\/integrations\/itch(?:\?|\/connect$|$)/,
  /^\/library(?:\?|$)/,
  /^\/library\/sync$/,
  /^\/library\/[0-9a-f-]{36}\/verify$/i,
  /^\/platform\/(?:sessions|saves|achievements|telemetry|events|live-ticket)(?:\?|\/|$)/,
  /^\/platform\/telemetry-consent$/,
  /^\/admin\/(game|newsletter|video)(\/|$)/,
];

function readPlaytime() {
    try {
        return JSON.parse(fs.readFileSync(PLAYTIME_FILE, "utf8"));
    } catch {
        return {};
    }
}

function writePlaytime(data) {
    try {
        fs.writeFileSync(PLAYTIME_FILE, JSON.stringify(data, null, 2));
    } catch {}
}
const LEGACY_USER_DATA = app.getPath("userData");
const LEGACY_GAMES_DIR = path.join(app.getPath("downloads"), "Deadsmile Games");

function copyDirectoryContentsSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    if (fs.existsSync(destination)) continue;
    if (entry.isDirectory()) copyDirectoryContentsSync(source, destination);
    else {
      try {
        fs.copyFileSync(source, destination);
      } catch {}
    }
  }
}

fs.mkdirSync(SETTINGS_DIR, { recursive: true });
fs.mkdirSync(GAMES_DIR, { recursive: true });
if (path.resolve(LEGACY_USER_DATA) !== path.resolve(SETTINGS_DIR))
  copyDirectoryContentsSync(LEGACY_USER_DATA, SETTINGS_DIR);
if (
  fs.existsSync(LEGACY_GAMES_DIR) &&
  path.resolve(LEGACY_GAMES_DIR) !== path.resolve(GAMES_DIR)
) {
  try {
    for (const entry of fs.readdirSync(LEGACY_GAMES_DIR, {
      withFileTypes: true,
    })) {
      const source = path.join(LEGACY_GAMES_DIR, entry.name);
      const destination = path.join(GAMES_DIR, entry.name);
      if (fs.existsSync(destination)) continue;
      try {
        fs.renameSync(source, destination);
      } catch {
        copyDirectoryContentsSync(source, destination);
      }
    }
    if (fs.readdirSync(LEGACY_GAMES_DIR).length === 0)
      fs.rmSync(LEGACY_GAMES_DIR, { recursive: true, force: true });
  } catch {}
}
app.setPath("userData", SETTINGS_DIR);
if (!IS_MICROSOFT_STORE) app.setAsDefaultProtocolClient("deadsmile");
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith("deadsmile://"));
    if (url) handleDeepLink(url);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.on("open-url", (_event, url) => {
    _event.preventDefault();
    handleDeepLink(url);
  });
}
function handleDeepLink(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "launch") {
      const gameId = parsed.searchParams.get("gameId");
      if (!gameId) return;
      broadcast("deadsmile:launch-game", gameId);
    }
  } catch {}
}

const API_URL = "https://deadsmile.vercel.app/api";
const GITHUB_REPO = "deadsmilegames/launcher";
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const APP_VERSION = app.getVersion();
const UPDATE_CONFIRM_ARG = "--update-confirm";
const UPDATE_CONFIRM_PATH = (() => {
  const index = process.argv.indexOf(UPDATE_CONFIRM_ARG);
  return index >= 0 ? process.argv[index + 1] : "";
})();
function confirmUpdatedStartup() {
  if (!UPDATE_CONFIRM_PATH) return;
  try {
    fs.mkdirSync(path.dirname(UPDATE_CONFIRM_PATH), { recursive: true });
    fs.writeFileSync(
      UPDATE_CONFIRM_PATH,
      JSON.stringify({ version: APP_VERSION, pid: process.pid, confirmedAt: Date.now() }),
      "utf8",
    );
  } catch {}
}
let updateInProgress = false;
let forceQuit = false;

function sanitizeName(name) {
  return (
    String(name || "game")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "game"
  );
}
function isHttps(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
function isItch(value) {
  try {
    const u = new URL(value);
    return isHttps(value) && /(?:^|\.)itch\.io$/i.test(u.hostname);
  } catch {
    return false;
  }
}
function compareVersions(a, b) {
  const pa = String(a)
    .replace(/^v/i, "")
    .split(".")
    .map((x) => Number.parseInt(x, 10) || 0);
  const pb = String(b)
    .replace(/^v/i, "")
    .split(".")
    .map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if ((pa[i] || 0) !== (pb[i] || 0))
      return (pa[i] || 0) > (pb[i] || 0) ? 1 : -1;
  }
  return 0;
}

async function apiRequest({
  path: endpoint,
  method = "GET",
  body,
  headers = {},
}) {
  const response = await session.defaultSession.fetch(`${API_URL}${endpoint}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}

async function csrfForMain() {
  const result = await apiRequest({ path: "/csrf" });
  const token = result?.data?.data?.token;
  if (!result.ok || !token) throw new Error("REQUEST_SECURITY_UNAVAILABLE");
  return token;
}

async function protectedApi(endpoint, method, body) {
  const token = await csrfForMain();
  return apiRequest({
    path: endpoint,
    method,
    body,
    headers: { "X-CSRF-Token": token },
  });
}

function resolveSavePath(template) {
  if (!template || typeof template !== "string") return null;
  const expanded = template.replace("{appdata}", app.getPath("appData"));
  const resolved = path.resolve(expanded);
  const allowed = path.resolve(path.join(app.getPath("appData"), "pico-8", "cdata"));
  if (!resolved.startsWith(`${allowed}${path.sep}`) || !resolved.endsWith(".p8d.txt")) return null;
  return resolved;
}

async function restoreCloudSave(gameId, template) {
  const target = resolveSavePath(template);
  if (!target) return null;
  const result = await apiRequest({ path: `/platform/saves/${gameId}/default` });
  if (!result.ok || !result.data?.data?.payload) return { target, revision: null };
  const remote = result.data.data;
  const remoteTime = Date.parse(remote.updated_at || remote.updatedAt || 0) || 0;
  let localTime = 0;
  try { localTime = (await fsp.stat(target)).mtimeMs; } catch {}
  if (!localTime || remoteTime > localTime) {
    const bytes = Buffer.from(remote.payload, "base64");
    if (bytes.length <= 256 * 1024) {
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, bytes, { mode: 0o600 });
    }
  }
  return { target, revision: remote.revision || null };
}

async function uploadCloudSave(gameId, state) {
  if (!state?.target || !(await pathExists(state.target))) return;
  const bytes = await fsp.readFile(state.target);
  if (!bytes.length || bytes.length > 256 * 1024) return;
  await protectedApi(`/platform/saves/${gameId}/default`, "PUT", {
    payload: bytes.toString("base64"),
    revision: state.revision,
  });
}

async function readPicoNumber(target, index) {
  try {
    const source = (await fsp.readFile(target, "utf8")).replace(/\s+/g, "");
    if (!/^[a-f0-9]{512}$/i.test(source)) return null;
    const bytes = Buffer.from(source, "hex");
    return bytes.readInt32LE(index * 4) / 65536;
  } catch {
    return null;
  }
}

async function downloadAuthorization(gameId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(gameId || ""))) throw new Error("GAME_INVALID");
  const csrf = await csrfForMain();
  const result = await apiRequest({
    path: `/library/${gameId}/download-authorization`,
    method: "POST",
    headers: { "X-CSRF-Token": csrf },
  });
  if (!result.ok || !result.data?.data?.accessToken || !Number.isSafeInteger(Number(result.data.data.itchGameId)) || !isItch(result.data.data.itchGameUrl)) {
    throw new Error(result.data?.error?.code || "DOWNLOAD_NOT_AUTHORIZED");
  }
  return result.data.data;
}

async function downloadFile(url, destination) {
  const response = await session.defaultSession.fetch(url, {
    headers: { Accept: "application/octet-stream", "User-Agent": `Deadsmile-Games-Launcher/${APP_VERSION}` },
  });
  if (!response.ok || !response.body) throw new Error("BUTLER_DOWNLOAD_FAILED");
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination, { mode: 0o600 }));
}

async function ensureButler() {
  if (process.platform !== "win32") throw new Error("BUTLER_PLATFORM_UNSUPPORTED");
  let remoteVersion = "";
  try {
    const response = await session.defaultSession.fetch(`${BUTLER_BROTH}/LATEST`, {
      headers: { Accept: "text/plain", "User-Agent": `Deadsmile-Games-Launcher/${APP_VERSION}` },
    });
    if (response.ok) remoteVersion = (await response.text()).trim();
  } catch {}
  let localVersion = "";
  try { localVersion = (await fsp.readFile(BUTLER_VERSION_FILE, "utf8")).trim(); } catch {}
  let localExecutable = BUTLER_EXE;
  try {
    const relative = (await fsp.readFile(BUTLER_PATH_FILE, "utf8")).trim();
    const resolved = path.resolve(BUTLER_ROOT, relative);
    if (resolved.startsWith(`${path.resolve(BUTLER_ROOT)}${path.sep}`)) localExecutable = resolved;
  } catch {}
  if (await pathExists(localExecutable) && (!remoteVersion || remoteVersion === localVersion)) return localExecutable;
  if (!remoteVersion && !(await pathExists(localExecutable))) throw new Error("BUTLER_UNAVAILABLE");
  const staging = `${BUTLER_ROOT}.staging-${process.pid}`;
  const archive = path.join(app.getPath("temp"), `deadsmile-butler-${process.pid}.zip`);
  await fsp.rm(staging, { recursive: true, force: true });
  await fsp.mkdir(staging, { recursive: true });
  try {
    await downloadFile(`${BUTLER_BROTH}/${encodeURIComponent(remoteVersion)}/archive/default`, archive);
    await extractZip(archive, staging);
    const executable = await findNamedFile(staging, "butler.exe");
    if (!executable) throw new Error("BUTLER_INVALID_ARCHIVE");
    const relativeExecutable = path.relative(staging, executable);
    if (!relativeExecutable || relativeExecutable.startsWith("..") || path.isAbsolute(relativeExecutable)) throw new Error("BUTLER_INVALID_ARCHIVE");
    await fsp.writeFile(path.join(staging, "version.txt"), remoteVersion, { mode: 0o600 });
    await fsp.writeFile(path.join(staging, "executable.txt"), relativeExecutable, { mode: 0o600 });
    const previous = `${BUTLER_ROOT}.previous-${process.pid}`;
    await fsp.rm(previous, { recursive: true, force: true });
    if (await pathExists(BUTLER_ROOT)) await fsp.rename(BUTLER_ROOT, previous);
    try {
      await fsp.rename(staging, BUTLER_ROOT);
      await fsp.rm(previous, { recursive: true, force: true });
    } catch (error) {
      if (!(await pathExists(BUTLER_ROOT)) && await pathExists(previous)) await fsp.rename(previous, BUTLER_ROOT);
      throw error;
    }
  } finally {
    await fsp.rm(archive, { force: true }).catch(() => {});
    await fsp.rm(staging, { recursive: true, force: true }).catch(() => {});
  }
  const relativeExecutable = (await fsp.readFile(BUTLER_PATH_FILE, "utf8")).trim();
  const installedExecutable = path.resolve(BUTLER_ROOT, relativeExecutable);
  if (!installedExecutable.startsWith(`${path.resolve(BUTLER_ROOT)}${path.sep}`) || !(await pathExists(installedExecutable))) throw new Error("BUTLER_INVALID_INSTALL");
  return installedExecutable;
}

async function findNamedFile(directory, filename) {
  const queue = [directory];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of await fsp.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(full);
      else if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) return full;
    }
  }
  return null;
}

async function getButlerClient() {
  if (butlerClient) return butlerClient;
  const executable = await ensureButler();
  butlerInstance = new Instance({
    butlerExecutable: executable,
    args: [
      "--dbpath", BUTLER_DB,
      "--address", "https://itch.io",
      "--user-agent", `Deadsmile-Games-Launcher/${APP_VERSION}`,
      "--destiny-pid", String(process.pid),
    ],
  });
  butlerClient = new Client(await butlerInstance.getEndpoint());
  butlerClient.onError(() => {});
  butlerClient.onWarning(() => {});
  butlerInstance.promise().catch(() => {}).finally(() => {
    butlerInstance = null;
    butlerClient = null;
  });
  return butlerClient;
}

async function resolveButlerGame({ accessToken, itchGameId, preferredItchChannel = null }) {
  const client = await getButlerClient();
  let profileId = 0;
  if (accessToken) {
    const profileResult = await client.call(butlerMessages.ProfileLoginWithAPIKey, { apiKey: accessToken });
    profileId = Number(profileResult?.profile?.id) || 0;
  }
  const [gameResult, uploadResult] = await Promise.all([
    client.call(butlerMessages.FetchGame, { gameId: Number(itchGameId), fresh: true }),
    client.call(butlerMessages.FetchGameUploads, { gameId: Number(itchGameId), compatible: true, fresh: true }),
  ]);
  const uploads = Array.isArray(uploadResult?.uploads) ? uploadResult.uploads : [];
  const channelUploads = preferredItchChannel
    ? uploads.filter((item) => String(item?.channelName || "").toLowerCase() === String(preferredItchChannel).toLowerCase())
    : uploads;
  const upload = channelUploads
    .filter((item) => item && item.id)
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0];
  if (!gameResult?.game || !upload) throw new Error("WINDOWS_BUILD_UNAVAILABLE");
  return { client, profileId, game: gameResult.game, upload };
}

function send(sender, channel, payload) {
  try {
    if (!sender.isDestroyed()) sender.send(channel, payload);
  } catch {}
}

async function extractZip(zipPath, destination) {
  await fsp.mkdir(destination, { recursive: true });
  const script = `Expand-Archive -LiteralPath $env:DS_ZIP -DestinationPath $env:DS_DEST -Force`;
  await new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script
    ], { windowsHide: true, env: { ...process.env, DS_ZIP: zipPath, DS_DEST: destination }});
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `Zip extraction failed (${code}).`)));
  });
}

async function firstExe(directory) {
  const queue = [directory];
  while (queue.length) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) return full;
    }
  }
  return null;
}

async function pathExists(target) {
  try { await fsp.access(target); return true; } catch { return false; }
}

function normalizeVersion(value) {
  const match = String(value || "").trim().match(/^v?(\d+)$/i);
  return match ? String(Number.parseInt(match[1], 10)) : null;
}

function versionFromFilename(filename) {
  const base = path.basename(String(filename || "")).trim();
  const matches = [...base.matchAll(/v(\d{3})(?!\d)/gi)];
  if (!matches.length) {
    return null;
  }
  const version = matches[matches.length - 1][1];
  return String(Number.parseInt(version, 10));
}

async function swapGameInstall({ gameFolder, stagingFolder, ctx }) {
  const oldFolder = `${gameFolder}.old`;
  await fsp.rm(oldFolder, { recursive: true, force: true });
  if (ctx.isAborted()) throw new Error("Cancelled");
  if (ctx.isPaused()) throw new Error("Paused");
  let movedOld = false, installedNew = false;
  try {
    if (await pathExists(gameFolder)) { await fsp.rename(gameFolder, oldFolder); movedOld = true; }
    await fsp.rename(stagingFolder, gameFolder); installedNew = true;
    const newExe = await firstExe(gameFolder);
    if (!newExe) throw new Error("The Windows update does not contain a game executable.");
    if (ctx.isAborted()) throw new Error("Cancelled");
    if (ctx.isPaused()) throw new Error("Paused");
    ctx.onProgress({ status: "updating", percent: 99, fileName: path.basename(newExe) });
    await fsp.rm(oldFolder, { recursive: true, force: true });
    return { path: newExe, folderPath: gameFolder, filename: path.basename(newExe) };
  } catch (error) {
    if (installedNew) await fsp.rm(gameFolder, { recursive: true, force: true }).catch(() => {});
    if (movedOld && !(await pathExists(gameFolder))) await fsp.rename(oldFolder, gameFolder).catch(() => {});
    throw error;
  }
}

async function runDownloadWorker(job, ctx) {
  const { id, slug, commerceEnabled, mode = "download", currentVersion = null } = job;
  let accessToken = job.apiKey || "";
  let itchGameId = job.itchGameId;
  let preferredItchChannel = job.preferredItchChannel || null;
  if (commerceEnabled) {
    const authorization = await downloadAuthorization(id);
    accessToken = authorization.accessToken;
    itchGameId = authorization.itchGameId;
    preferredItchChannel = authorization.preferredItchChannel || null;
  }
  if (!Number.isSafeInteger(Number(itchGameId))) throw new Error("DOWNLOAD_NOT_AUTHORIZED");
  const gameFolder = path.join(GAMES_DIR, sanitizeName(slug || id));
  await fsp.mkdir(GAMES_DIR, { recursive: true });

  if (mode === "update" && playSessions.has(id)) throw new Error("GAME_RUNNING");

  const jobRoot = path.join(app.getPath("temp"), "deadsmile-game-downloads", sanitizeName(slug || id));
  const stagingFolder = path.join(jobRoot, "install");
  await fsp.rm(jobRoot, { recursive: true, force: true });
  await fsp.mkdir(jobRoot, { recursive: true });

  try {
    const { client, profileId, game, upload } = await resolveButlerGame({ accessToken, itchGameId, preferredItchChannel });
    const remoteVersion = versionFromFilename(upload.filename || "");
    if (mode === "update" && remoteVersion && currentVersion && compareVersions(remoteVersion, currentVersion) <= 0) {
      throw new Error("NO_UPDATE_AVAILABLE");
    }
    const queued = await client.call(butlerMessages.InstallQueue, {
      reason: mode === "update" ? "update" : "install",
      noCave: true,
      installFolder: stagingFolder,
      game,
      upload,
      ignoreInstallers: true,
      stagingFolder: path.join(jobRoot, "staging"),
      profileId,
    });
    let conversation = null;
    await client.call(
      butlerMessages.InstallPerform,
      { id: queued.id, stagingFolder: queued.stagingFolder },
      (active) => {
        conversation = active;
        active.onNotification(butlerMessages.Progress, (progress) => {
          if (ctx.isAborted() || ctx.isPaused()) {
            active.cancel();
            return;
          }
          const percent = Math.max(0, Math.min(100, Math.round(Number(progress.progress || 0) * 100)));
          const total = Number(upload.size) || 0;
          ctx.onProgress({
            status: mode === "update" ? "updating" : "downloading",
            percent,
            received: total ? Math.round(total * percent / 100) : 0,
            total,
            fileName: upload.filename || "",
          });
        });
      },
    ).catch((error) => {
      if (ctx.isAborted()) throw new Error("Cancelled");
      if (ctx.isPaused()) throw new Error("Paused");
      throw error;
    });
    if (conversation && (ctx.isAborted() || ctx.isPaused())) conversation.cancel();
    if (ctx.isAborted()) throw new Error("Cancelled");
    if (ctx.isPaused()) throw new Error("Paused");

    const exePath = await firstExe(stagingFolder);
    if (!exePath) throw new Error("WINDOWS_EXECUTABLE_MISSING");

    if (mode === "update") {
      const swapped = await swapGameInstall({ gameFolder, stagingFolder, ctx });
      return { ...swapped, slug, version: remoteVersion || currentVersion };
    }

    await fsp.rm(gameFolder, { recursive: true, force: true });
    await fsp.rename(stagingFolder, gameFolder);
    const installedExe = await firstExe(gameFolder);
    if (!installedExe) throw new Error("WINDOWS_EXECUTABLE_MISSING");
    ctx.onProgress({ status: "complete", percent: 100, fileName: path.basename(installedExe) });
    return { path: installedExe, folderPath: gameFolder, filename: path.basename(installedExe),
      version: remoteVersion || versionFromFilename(path.basename(installedExe)), slug };
  } finally {
    await fsp.rm(jobRoot, { recursive: true, force: true }).catch(() => {});
  }
}
function broadcast(channel, payload) {
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
            try {
                win.webContents.send(channel, payload);
            } catch {}
        }
    }
}

const downloadQueue = new DownloadQueue({
    worker: runDownloadWorker,
    broadcast,
    maxConcurrent: 2,
});

async function checkForUpdate() {
  if (!app.isPackaged) return { available: false, currentVersion: APP_VERSION, reason: "development" };
  if (IS_MICROSOFT_STORE)
    return {
      available: false,
      currentVersion: APP_VERSION,
      reason: "microsoft-store",
      managedBy: "microsoft-store",
    };
  try {
    const response = await session.defaultSession.fetch(GITHUB_RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Deadsmile-Games-Launcher" },
    });
    if (!response.ok) return { available: false, currentVersion: APP_VERSION, reason: `GitHub returned ${response.status}` };
    const release = await response.json();
    const latestVersion = String(release.tag_name || release.name || "").replace(/^v/i, "");
    if (!latestVersion || compareVersions(latestVersion, APP_VERSION) <= 0)
      return { available: false, currentVersion: APP_VERSION, latestVersion };
    const asset = (release.assets || []).find((x) =>
      /launcher/i.test(x.name || "") && /\.zip$/i.test(x.name || "") && isHttps(x.browser_download_url));
    if (!asset) return { available: false, currentVersion: APP_VERSION, latestVersion, reason: "No launcher update zip was published." };
    return { available: true, currentVersion: APP_VERSION, latestVersion, notes: release.body || "",
      url: asset.browser_download_url, name: asset.name, size: asset.size || 0, digest: asset.digest || null };
  } catch (error) {
    return { available: false, currentVersion: APP_VERSION, reason: error?.message || "Update check failed." };
  }
}

async function updateLauncher(sender) {
  if (IS_MICROSOFT_STORE) throw new Error("UPDATE_MANAGED_BY_MICROSOFT_STORE");
  if (updateInProgress) throw new Error("Launcher update already in progress.");
  const update = await checkForUpdate();
  if (!update.available) throw new Error(update.reason || "No update is available.");

  const tempRoot = path.join(app.getPath("temp"), `deadsmile-launcher-update-${process.pid}`);
  await fsp.rm(tempRoot, { recursive: true, force: true });
  await fsp.mkdir(tempRoot, { recursive: true });
  const zipPath = path.join(tempRoot, sanitizeName(update.name));
  const response = await session.defaultSession.fetch(update.url, {
    headers: { Accept: "application/octet-stream", "User-Agent": "Deadsmile-Games-Launcher" },
  });
  if (!response.ok || !response.body) throw new Error(`Unable to download launcher update (${response.status}).`);

  const total = Number(response.headers.get("content-length")) || update.size || 0;
  let received = 0;
  const hash = crypto.createHash("sha256");
  const stream = Readable.fromWeb(response.body);
  stream.on("data", (chunk) => {
    received += chunk.length;
    hash.update(chunk);
    send(sender, "deadsmile:update-progress", {
      status: "downloading", percent: total ? Math.min(100, Math.round((received / total) * 100)) : 0,
      received, total,
    });
  });
  await pipeline(stream, fs.createWriteStream(zipPath));
  if (update.digest && /^sha256:/i.test(update.digest)) {
    const expected = update.digest.slice("sha256:".length).toLowerCase();
    const actual = hash.digest("hex").toLowerCase();
    if (actual !== expected) throw new Error("Launcher update checksum verification failed.");
  }
  const staging = path.join(tempRoot, "staging");
  await extractZip(zipPath, staging);
  const stagedExe = await findLauncherExe(staging, path.basename(process.execPath));
  if (!stagedExe) throw new Error("Updated launcher executable is missing from the archive.");
  const runnerDir = path.join(tempRoot, "runner");
  await fsp.mkdir(runnerDir, { recursive: true });

  const stagedDir = path.dirname(stagedExe);
  const exeName = path.basename(stagedExe);
  const runnerExe = path.join(runnerDir, exeName);
  const electronRuntimeFiles = [
    exeName,
    "ffmpeg.dll",
    "libEGL.dll",
    "libGLESv2.dll",
    "vk_swiftshader.dll",
    "vk_swiftshader_icd.json",
    "vulkan-1.dll",
    "d3dcompiler_47.dll",
    "icudtl.dat",
    "resources.pak",
    "chrome_100_percent.pak",
    "chrome_200_percent.pak",
    "snapshot_blob.bin",
    "v8_context_snapshot.bin",
  ];

  for (const name of electronRuntimeFiles) {
    const src = path.join(stagedDir, name);
    const dst = path.join(runnerDir, name);
    if (await pathExists(src)) {
      await fsp.copyFile(src, dst);
    }
  }

  if (!(await pathExists(runnerExe))) {
    throw new Error("Failed to stage the Electron runtime for the updater.");
  }

  const helperSourceCandidates = [
    path.join(process.resourcesPath, "app.asar.unpacked", "electron", "updater.cjs"),
    path.join(process.resourcesPath, "electron", "updater.cjs"),
    path.join(__dirname, "updater.cjs"),
  ];
  const helperSource = helperSourceCandidates.find(fs.existsSync);
  if (!helperSource) throw new Error("Updater helper is missing from this build.");
  const helper = path.join(tempRoot, "updater.cjs");
  await fsp.copyFile(helperSource, helper);

  const appDir = path.dirname(process.execPath);
  const confirmFile = path.join(tempRoot, "update-confirmed.json");
  const args = [
    helper,
    "--target", appDir,
    "--exe", process.execPath,
    "--staging", staging,
    "--confirm", confirmFile,
    "--expected-version", update.latestVersion,
  ];
  try {
    const pendingPath = path.join(SETTINGS_DIR, "pending-update.json");
    await fsp.writeFile(
      pendingPath,
      JSON.stringify(
        {
          version: update.latestVersion,
          previousVersion: APP_VERSION,
          notes: update.notes || "",
          htmlUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v${update.latestVersion}`,
          installedAt: Date.now(),
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {}

  send(sender, "deadsmile:update-progress", { status: "updating", percent: 0, received, total });
  updateInProgress = true;
  forceQuit = true;
  const child = spawn(runnerExe, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    cwd: tempRoot,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", ELECTRON_NO_ATTACH_CONSOLE: "1" },
  });
  child.unref();
  setTimeout(() => app.quit(), 200);
  return { started: true, latestVersion: update.latestVersion };
}

async function findLauncherExe(root, preferredName) {
  const direct = path.join(root, preferredName);
  if (await pathExists(direct)) return direct;
  const entries = await fsp.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidate = path.join(root, entry.name, preferredName);
      if (await pathExists(candidate)) return candidate;
    }
  }
  return firstExe(root);
}

async function checkGameUpdate(request) {
  const { id, slug, currentVersion, filename, path: installedPath, commerceEnabled, itchGameId } = request || {};
  if (!id) return { available: false, reason: "GAME_INVALID" };
  const localVersion = normalizeVersion(currentVersion) || versionFromFilename(filename) || versionFromFilename(installedPath);
  try {
    const authorization = commerceEnabled
      ? await downloadAuthorization(id)
      : { accessToken: "", itchGameId: Number(itchGameId) };
    if (!Number.isSafeInteger(Number(authorization.itchGameId))) throw new Error("ITCH_GAME_NOT_CONFIGURED");
    const { upload } = await resolveButlerGame({
      accessToken: authorization.accessToken,
      itchGameId: authorization.itchGameId,
      preferredItchChannel: authorization.preferredItchChannel,
    });
    const latestVersion = versionFromFilename(upload.filename || "");
    return {
      available: Boolean(latestVersion && localVersion && compareVersions(latestVersion, localVersion) > 0),
      id,
      slug,
      localVersion: localVersion || null,
      latestVersion: latestVersion || null,
      fileName: upload.filename || null,
    };
  } catch {
    return { available: false, id, slug, localVersion: localVersion || null,
      reason: "UPDATE_CHECK_UNAVAILABLE" };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0b0c10",
    title: "Deadsmile Games Launcher",
    icon: path.join(
      __dirname,
      "..",
      app.isPackaged ? "dist" : "public",
      "favicon.ico",
    ),
    frame: false,
    autoHideMenuBar: true,
    show: false,
    resizable: true,
    maximizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: true,
    },
  });
  win.on("close", (event) => {
    if (updateInProgress && !forceQuit) event.preventDefault();
  });
  win.once("ready-to-show", () => {
    win.show();
    confirmUpdatedStartup();
  });
  win.on("focus", () => send(win.webContents, "deadsmile:app-focus", true));
  if (!app.isPackaged) win.loadURL("http://127.0.0.1:5173");
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  return win;
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    const debugArgs = [...process.argv, ...process.execArgv];
    if (app.commandLine.hasSwitch("remote-debugging-port") ||
        app.commandLine.hasSwitch("inspect") ||
        app.commandLine.hasSwitch("inspect-brk") ||
        debugArgs.some((arg) => /^--inspect(?:-brk)?(?:=|$)/i.test(arg))) {
      app.quit();
      return;
    }
    Menu.setApplicationMenu(null);
    app.on("web-contents-created", (_event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        if (/^(?:https?:|mailto:)/i.test(url)) shell.openExternal(url).catch(() => {});
        return { action: "deny" };
      });
      contents.on("devtools-opened", () => contents.closeDevTools());
      contents.on("before-input-event", (event, input) => {
        const key = String(input.key || "").toLowerCase();
        const blocked = input.type === "keyDown" &&
          (key === "f12" ||
            (input.control && input.shift && ["i", "j", "c"].includes(key)) ||
            (input.meta && input.alt && ["i", "j", "c"].includes(key)));
        if (blocked) event.preventDefault();
      });
    });
  }
  ipcMain.handle("deadsmile:api", (_event, request) => {
  const reqPath = String(request?.path || "");
  if (!API_ALLOWED_PATHS.some((re) => re.test(reqPath))) {
    return {
      ok: false,
      status: 403,
      data: {
        error: {
          code: "BLOCKED_PATH",
          message: "This request is not available in the launcher.",
        },
      },
    };
  }
  return apiRequest(request);
});
    ipcMain.handle("deadsmile:consume-pending-update", async () => {
    const pendingPath = path.join(SETTINGS_DIR, "pending-update.json");
    try {
      const raw = await fsp.readFile(pendingPath, "utf8");
      await fsp.rm(pendingPath, { force: true });
      const data = JSON.parse(raw);
      if (!data?.version) return null;
      const installed = String(data.version).replace(/^v/i, "");
      const current = String(APP_VERSION).replace(/^v/i, "");
      if (installed !== current) return null;

      return data;
    } catch {
      return null;
    }
  });
  ipcMain.handle("deadsmile:storage-paths", () => ({
    root: STORAGE_ROOT,
    settings: SETTINGS_DIR,
    games: GAMES_DIR,
  }));

  ipcMain.handle("deadsmile:normalize-library", (_event, library) => {
    if (!library || typeof library !== "object") return {};
    const legacyRoot = path.resolve(LEGACY_GAMES_DIR);
    const newRoot = path.resolve(GAMES_DIR);
    const normalized = {};
    for (const [id, entry] of Object.entries(library)) {
      if (!entry || typeof entry !== "object") continue;
      const next = { ...entry };
      for (const key of ["folderPath", "path"]) {
        if (typeof next[key] !== "string") continue;
        const absolute = path.resolve(next[key]);
        if (absolute.startsWith(`${legacyRoot}${path.sep}`)) {
          const relative = path.relative(legacyRoot, absolute);
          const candidate = path.join(newRoot, relative);
          if (fs.existsSync(candidate)) next[key] = candidate;
        }
      }
      normalized[id] = next;
    }
    return normalized;
  });
  ipcMain.handle("deadsmile:app-version", () => APP_VERSION);
  ipcMain.handle("deadsmile:update-check", () => checkForUpdate());
  ipcMain.handle("deadsmile:game-update-check", (_event, request) => checkGameUpdate(request));
  ipcMain.handle("deadsmile:update-start", (event) =>
    updateLauncher(event.sender),
  );
  ipcMain.handle("deadsmile:open-external", async (_event, url) => {
    if (typeof url !== "string" || !/^(?:https?:\/\/|mailto:)/i.test(url))
      return false;
    await shell.openExternal(url);
    return true;
  });
  ipcMain.handle("deadsmile:window", (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (action === "minimize") win.minimize();
    if (action === "close" && !updateInProgress) win.close();
    if (action === "toggleMaximize")
      win.isMaximized() ? win.unmaximize() : win.maximize();
    return win.isMaximized();
  });
  ipcMain.handle("deadsmile:open-path", async (_event, target) => {
    if (typeof target !== "string") return "Invalid file path.";
    const root = path.resolve(GAMES_DIR);
    const targetPath = path.resolve(target);
    if (!targetPath.startsWith(`${root}${path.sep}`) || targetPath === root)
      return "Invalid file path.";
    return shell.openPath(targetPath);
  });
  ipcMain.handle("deadsmile:download-game", async (_event, request) => {
      if (!request?.id || !isItch(request?.url)) throw new Error("DOWNLOAD_NOT_AVAILABLE");
      return downloadQueue.enqueue({
        ...request,
        itchGameId: Number(request.itchGameId),
      });
  });
  ipcMain.handle("deadsmile:download-pause", (_event, id) =>
      downloadQueue.pause(id),
  );
  ipcMain.handle("deadsmile:download-resume", (_event, id) =>
      downloadQueue.resume(id),
  );
  ipcMain.handle("deadsmile:download-cancel", (_event, id) =>
      downloadQueue.cancel(id),
  );
  ipcMain.handle("deadsmile:download-reorder", (_event, ids) =>
      downloadQueue.reorder(ids),
  );
  ipcMain.handle("deadsmile:download-set-concurrent", (_event, n) => {
      downloadQueue.setMaxConcurrent(n);
      return downloadQueue.maxConcurrent;
  });
  ipcMain.handle("deadsmile:download-snapshot", () =>
      downloadQueue.snapshot(),
  );
  ipcMain.handle("deadsmile:playtime-get", () => readPlaytime());

  ipcMain.handle("deadsmile:playtime-clear", () => {
      writePlaytime({});
      return {};
  });

  ipcMain.handle(
      "deadsmile:play-game",
      async (_event, { id, exePath, args = [], gameVersion = null, engine = "native", savePathTemplate = null, cloudSavesEnabled = false }) => {
          if (!id || !exePath) return { error: "Invalid game." };
          const gamesRoot = path.resolve(GAMES_DIR);
          const resolvedExe = path.resolve(exePath);
          if (!resolvedExe.startsWith(`${gamesRoot}${path.sep}`) ||
              !resolvedExe.toLowerCase().endsWith(".exe")) {
              return { error: "Invalid game executable." };
          }
          if (!(await pathExists(resolvedExe))) return { error: "Game executable not found." };
          if (playSessions.has(id)) return { error: "Already running." };

          let platformSession = null;
          let cloudSave = null;
          try {
            if (cloudSavesEnabled && engine === "pico8") cloudSave = await restoreCloudSave(id, savePathTemplate);
            const created = await protectedApi("/platform/sessions", "POST", {
              gameId: id,
              launcherVersion: APP_VERSION,
              gameVersion,
              platform: process.platform === "darwin" ? "macos" : process.platform === "linux" ? "linux" : "windows",
            });
            platformSession = created?.data?.data || null;
          } catch {}

          const child = spawn(resolvedExe, Array.isArray(args) ? args : [], {
              detached: true,
              stdio: "ignore",
              windowsHide: false,
              cwd: path.dirname(resolvedExe),
          });
          child.unref();

          const startedAt = Date.now();
          playSessions.set(id, { startedAt, child });

          let finished = false;
          const finish = async () => {
              if (finished) return;
              finished = true;
              const session = playSessions.get(id);
              if (!session) return;
              playSessions.delete(id);

              const durationMs = Date.now() - session.startedAt;
              const data = readPlaytime();
              const prev = data[id] || { totalMs: 0, sessions: 0 };
              data[id] = {
                  totalMs: prev.totalMs + durationMs,
                  lastPlayedAt: Date.now(),
                  sessions: prev.sessions + 1,
              };
              writePlaytime(data);

              try {
                if (platformSession?.id) {
                  await protectedApi(`/platform/sessions/${platformSession.id}/end`, "POST", { durationMs });
                }
                if (cloudSavesEnabled && engine === "pico8") {
                  await uploadCloudSave(id, cloudSave);
                  if (cloudSave?.target && (await readPicoNumber(cloudSave.target, 1)) >= 1) {
                    await protectedApi(`/platform/achievements/${id}/finish_story/unlock`, "POST", {});
                  }
                }
              } catch {}

              for (const win of BrowserWindow.getAllWindows()) {
                  if (!win.isDestroyed()) {
                      try {
                          win.webContents.send(
                              "deadsmile:playtime-update",
                              data,
                          );
                      } catch {}
                  }
              }
          };

          child.once("exit", finish);
          child.once("error", finish);

          return { pid: child.pid, startedAt };
      },
  );

  ipcMain.handle("deadsmile:delete-game", async (_event, target) => {
    if (typeof target !== "string" || !target.trim())
      return "Invalid game path.";
    const root = path.resolve(GAMES_DIR);
    const targetPath = path.resolve(target);
    if (!targetPath.startsWith(`${root}${path.sep}`) || targetPath === root)
      return "Invalid game path.";
    try {
      await fsp.rm(targetPath, { recursive: true, force: true });
      return "";
    } catch (error) {
      return error?.message || "Unable to delete the local game.";
    }
  });
  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  butlerInstance?.cancel().catch(() => {});
});
