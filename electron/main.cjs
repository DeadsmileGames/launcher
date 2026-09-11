const { app, BrowserWindow, ipcMain, session, shell, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const { Readable } = require("node:stream");
const crypto = require("node:crypto");
const { downloadGame: downloadItchGame } = require("itchio-downloader");
const { DownloadQueue } = require("./download-queue.cjs");
const STORAGE_ROOT = path.join(
  app.getPath("documents"),
  "Deadsmile Games Launcher",
);
const SETTINGS_DIR = path.join(STORAGE_ROOT, "settings");
const GAMES_DIR = path.join(STORAGE_ROOT, "Games");
const PLAYTIME_FILE = path.join(SETTINGS_DIR, "playtime.json");
const playSessions = new Map();

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

const API_URL = "https://apideadsmile.vercel.app/api";
const GITHUB_REPO = "teamdeadsmile/launcher";
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

function isWindowsArtifactName(filename) {
  const name = path.basename(String(filename || "")).trim();
  return /\.zip$/i.test(name);
}
function parseItchPublicWindowsFiles(html) {
  const decoded = String(html || "")
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  const names = new Set();
  const patterns = [
    /(?:^|["' >])([^"'<>]{1,220}\.(?:zip|7z|rar|exe))(?=["'<\s]|$)/gi,
    /(?:filename|name)\s*[:=]\s*["']([^"']+\.(?:zip|7z|rar|exe))["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of decoded.matchAll(pattern)) {
      const name = path.basename(String(match[1]).trim());
      if (name && !/[\\/:*?"<>|]/.test(name)) names.add(name);
    }
  }
  const allFiles = [...names];
  const windowsFiles = allFiles.filter(isWindowsArtifactName);
  return { allFiles, windowsFiles };
}

async function getItchWindowsUpdate(url, localVersion) {
  if (!isItch(url)) throw new Error("This game is not available on itch.io.");
  const response = await session.defaultSession.fetch(url, {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Deadsmile-Games-Launcher" },
  });
  if (!response.ok) throw new Error(`itch.io returned ${response.status}.`);
  const parsed = parseItchPublicWindowsFiles(await response.text());
  const candidates = parsed.windowsFiles
    .map((name) => ({ name, version: versionFromFilename(name) }))
    .filter((item) => item.version)
    .sort((a, b) => compareVersions(a.version, b.version));
  const currentVersion = normalizeVersion(localVersion) || null;
  const latest = candidates[candidates.length - 1] || null;
  return {
    available: Boolean(latest && currentVersion && compareVersions(latest.version, currentVersion) > 0),
    currentVersion, latestVersion: latest?.version || null, fileName: latest?.name || null,
    files: parsed.allFiles, windowsFiles: parsed.windowsFiles,
  };
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
  const { id, slug, url, mode = "download", currentVersion = null } = job;
  if (!isItch(url)) throw new Error("This game is not available on itch.io.");
  const gameFolder = path.join(GAMES_DIR, sanitizeName(slug || id));
  await fsp.mkdir(GAMES_DIR, { recursive: true });

  let remoteUpdate = null;
  if (mode === "update") {
    remoteUpdate = await getItchWindowsUpdate(url, currentVersion);
    if (!remoteUpdate.available) throw new Error("No game update is available.");
    if (playSessions.has(id)) throw new Error("Close the game before updating it.");
  }

  const jobRoot = path.join(app.getPath("temp"), "deadsmile-game-downloads",
    `${sanitizeName(slug || id)}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const downloadRoot = path.join(jobRoot, "download");
  const stagingFolder = path.join(jobRoot, "staging");
  await fsp.mkdir(downloadRoot, { recursive: true });

  try {
    const result = await downloadItchGame({
      itchGameUrl: url, downloadDirectory: downloadRoot, platform: "windows",
      resume: true, retries: 2, retryDelayMs: 750, writeMetaData: false,
      onProgress: ({ bytesReceived, totalBytes, fileName }) => {
        if (ctx.isAborted()) throw new Error("Cancelled");
        if (ctx.isPaused()) throw new Error("Paused");
        const total = Number(totalBytes) || 0, received = Number(bytesReceived) || 0;
        ctx.onProgress({
          status: "downloading", received, total,
          percent: total ? Math.min(100, Math.round((received / total) * 100)) : 0,
          fileName: fileName || "",
        });
      },
    });
    if (ctx.isAborted()) throw new Error("Cancelled");
    if (ctx.isPaused()) throw new Error("Paused");
    if (!result?.filePath) throw new Error("itch.io download failed.");
    const fileName = path.basename(result.filePath);
    if (!/\.zip$/i.test(fileName)) throw new Error("This game is not available on itch.io for Windows yet.");
    if (mode === "update" && remoteUpdate?.latestVersion) {
      const downloadedVersion = remoteUpdate.latestVersion;
      if (!downloadedVersion) {
        throw new Error("Could not determine the itch.io game version.");
      }
    }

    ctx.onProgress({ status: mode === "update" ? "updating" : "installing",
      received: result.bytesDownloaded || 0, total: result.bytesDownloaded || 0,
      percent: mode === "update" ? 20 : 100, fileName });

    await extractZip(result.filePath, stagingFolder);
    if (ctx.isAborted()) throw new Error("Cancelled");
    if (ctx.isPaused()) throw new Error("Paused");

    const exePath = await firstExe(stagingFolder);
    if (!exePath) throw new Error("The Windows download does not contain a game executable.");

    if (mode === "update") {
      const swapped = await swapGameInstall({ gameFolder, stagingFolder, ctx });
      return { ...swapped, slug, version: versionFromFilename(path.basename(swapped.path)) || currentVersion };
    }

    await fsp.rm(gameFolder, { recursive: true, force: true });
    await fsp.rename(stagingFolder, gameFolder);
    const installedExe = await firstExe(gameFolder);
    if (!installedExe) throw new Error("The Windows download does not contain a game executable.");
    ctx.onProgress({ status: "complete", received: result.bytesDownloaded || 0,
      total: result.bytesDownloaded || 0, percent: 100, fileName: path.basename(installedExe) });
    return { path: installedExe, folderPath: gameFolder, filename: path.basename(installedExe),
      version: versionFromFilename(path.basename(installedExe)), slug };
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
  const args = [helper, "--zip", zipPath, "--target", appDir, "--exe", process.execPath, "--confirm", confirmFile, "--expected-version", update.latestVersion];

  send(sender, "deadsmile:update-progress", { status: "updating", percent: 0, received, total });
  updateInProgress = true;
  forceQuit = true;

  const child = spawn(process.execPath, args, {
    detached: true, stdio: "ignore", windowsHide: true, cwd: tempRoot,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", ELECTRON_NO_ATTACH_CONSOLE: "1" },
  });
  child.unref();
  setTimeout(() => app.quit(), 150);
  return { started: true, latestVersion: update.latestVersion };
}

async function checkGameUpdate(request) {
  const { id, slug, url, currentVersion, filename, path: installedPath } = request || {};
  if (!id || !isItch(url)) return { available: false, reason: "Invalid itch.io game." };
  const localVersion = normalizeVersion(currentVersion) || versionFromFilename(filename) || versionFromFilename(installedPath);
  try {
    const result = await getItchWindowsUpdate(url, localVersion);
    return { ...result, id, slug, localVersion: localVersion || null };
  } catch (error) {
    return { available: false, id, slug, localVersion: localVersion || null,
      reason: error?.message || "Game update check failed." };
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
      devTools: false,
    },
  });
  win.on("close", (event) => {
    if (updateInProgress && !forceQuit) event.preventDefault();
  });
  win.once("ready-to-show", () => {
    win.show();
    confirmUpdatedStartup();
  });
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
  ipcMain.handle("deadsmile:api", (_event, request) => apiRequest(request));
  ipcMain.handle("deadsmile:storage-paths", () => ({
    root: STORAGE_ROOT,
    settings: SETTINGS_DIR,
    games: GAMES_DIR,
  }));

  ipcMain.handle("check-game-update", async (_event, game) => {
  if (!game?.downloadUrl) {
    throw new Error("Game does not have an itch.io URL.");
  }

  return await getItchWindowsUpdate(
    game.downloadUrl,
    game.currentVersion
  );
});
  
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
  ipcMain.handle("deadsmile:download-game", (_event, request) =>
      downloadQueue.enqueue(request),
  );
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
      async (_event, { id, exePath, args = [] }) => {
          if (!id || !exePath) return { error: "Invalid game." };
          const gamesRoot = path.resolve(GAMES_DIR);
          const resolvedExe = path.resolve(exePath);
          if (!resolvedExe.startsWith(`${gamesRoot}${path.sep}`) ||
              !resolvedExe.toLowerCase().endsWith(".exe")) {
              return { error: "Invalid game executable." };
          }
          if (!(await pathExists(resolvedExe))) return { error: "Game executable not found." };
          if (playSessions.has(id)) return { error: "Already running." };

          const child = spawn(resolvedExe, Array.isArray(args) ? args : [], {
              detached: true,
              stdio: "ignore",
              windowsHide: false,
              cwd: path.dirname(resolvedExe),
          });
          child.unref();

          const startedAt = Date.now();
          playSessions.set(id, { startedAt, child });

          const finish = () => {
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

          child.on("exit", finish);
          child.on("error", finish);

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