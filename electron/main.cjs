const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const { Readable } = require("node:stream");
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
let updateInProgress = false;

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
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
      ],
      {
        windowsHide: true,
        env: { ...process.env, DS_ZIP: zipPath, DS_DEST: destination },
      },
    );
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(stderr.trim() || `Zip extraction failed (${code}).`),
          ),
    );
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
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe"))
        return full;
    }
  }
  return null;
}

async function runDownloadWorker(job, ctx) {
    const { id, slug, url } = job;

    if (!isItch(url))
        throw new Error("This game is not available on itch.io.");

    const downloadRoot = GAMES_DIR;
    const gameFolder = path.join(downloadRoot, sanitizeName(slug || id));
    await fsp.mkdir(downloadRoot, { recursive: true });
    await fsp.rm(gameFolder, { recursive: true, force: true });

    const result = await downloadItchGame({
        itchGameUrl: url,
        downloadDirectory: downloadRoot,
        platform: "windows",
        resume: true,
        retries: 2,
        retryDelayMs: 750,
        writeMetaData: false,
        onProgress: ({ bytesReceived, totalBytes, fileName }) => {
            if (ctx.isAborted()) throw new Error("Cancelled");
            if (ctx.isPaused()) throw new Error("Paused");

            const total = Number(totalBytes) || 0;
            const received = Number(bytesReceived) || 0;
            ctx.onProgress({
                status: "downloading",
                received,
                total,
                percent: total
                    ? Math.min(100, Math.round((received / total) * 100))
                    : 0,
                fileName: fileName || "",
            });
        },
    });

    if (ctx.isAborted()) throw new Error("Cancelled");
    if (ctx.isPaused()) throw new Error("Paused");

    if (!result?.filePath) throw new Error("itch.io download failed.");

    const fileName = path.basename(result.filePath);
    if (!/\.zip$/i.test(fileName)) {
        await fsp.rm(result.filePath, { force: true }).catch(() => {});
        throw new Error(
            "This game is not available on itch.io for Windows yet.",
        );
    }

    ctx.onProgress({
        status: "installing",
        received: result.bytesDownloaded || 0,
        total: result.bytesDownloaded || 0,
        percent: 100,
        fileName,
    });

    await extractZip(result.filePath, gameFolder);

    if (ctx.isAborted()) throw new Error("Cancelled");

    const exePath = await firstExe(gameFolder);
    await fsp.rm(result.filePath, { force: true }).catch(() => {});

    if (!exePath) {
        await fsp
            .rm(gameFolder, { recursive: true, force: true })
            .catch(() => {});
        throw new Error(
            "The Windows download does not contain a game executable.",
        );
    }

    ctx.onProgress({
        status: "complete",
        received: result.bytesDownloaded || 0,
        total: result.bytesDownloaded || 0,
        percent: 100,
        fileName: path.basename(exePath),
    });

    return {
        path: exePath,
        folderPath: gameFolder,
        filename: path.basename(exePath),
        slug,
    };
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
  if (!app.isPackaged)
    return {
      available: false,
      currentVersion: APP_VERSION,
      reason: "development",
    };
  try {
    const response = await session.defaultSession.fetch(GITHUB_RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Deadsmile-Games-Launcher",
      },
    });
    if (!response.ok)
      return {
        available: false,
        currentVersion: APP_VERSION,
        reason: `GitHub returned ${response.status}`,
      };
    const release = await response.json();
    const latestVersion = String(
      release.tag_name || release.name || "",
    ).replace(/^v/i, "");
    if (!latestVersion || compareVersions(latestVersion, APP_VERSION) <= 0)
      return { available: false, currentVersion: APP_VERSION, latestVersion };
    const asset = (release.assets || []).find(
      (x) =>
        /launcher/i.test(x.name || "") &&
        /\.zip$/i.test(x.name || "") &&
        isHttps(x.browser_download_url),
    );
    if (!asset)
      return {
        available: false,
        currentVersion: APP_VERSION,
        latestVersion,
        reason: "No launcher update zip was published.",
      };
    return {
      available: true,
      currentVersion: APP_VERSION,
      latestVersion,
      notes: release.body || "",
      url: asset.browser_download_url,
      name: asset.name,
      size: asset.size || 0,
    };
  } catch (error) {
    return {
      available: false,
      currentVersion: APP_VERSION,
      reason: error?.message || "Update check failed.",
    };
  }
}

async function updateLauncher(sender) {
  const update = await checkForUpdate();
  if (!update.available)
    throw new Error(update.reason || "No update is available.");
  const tempRoot = path.join(app.getPath("temp"), "deadsmile-launcher-update");
  await fsp.rm(tempRoot, { recursive: true, force: true });
  await fsp.mkdir(tempRoot, { recursive: true });
  const zipPath = path.join(tempRoot, sanitizeName(update.name));
  const response = await session.defaultSession.fetch(update.url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "Deadsmile-Games-Launcher",
    },
  });
  if (!response.ok || !response.body)
    throw new Error(`Unable to download launcher update (${response.status}).`);
  const total =
    Number(response.headers.get("content-length")) || update.size || 0;
  let received = 0;
  const stream = Readable.fromWeb(response.body);
  stream.on("data", (chunk) => {
    received += chunk.length;
    send(sender, "deadsmile:update-progress", {
      status: "downloading",
      percent: total ? Math.min(100, Math.round((received / total) * 100)) : 0,
      received,
      total,
    });
  });
  await pipeline(stream, fs.createWriteStream(zipPath));
  send(sender, "deadsmile:update-progress", {
    status: "installing",
    percent: 0,
    received,
    total,
  });

  const helperCandidates = [
    path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "electron",
      "updater.cjs",
    ),
    path.join(process.resourcesPath, "electron", "updater.cjs"),
  ];
  const helper = helperCandidates.find(fs.existsSync);
  if (!helper) throw new Error("Updater helper is missing from this build.");
  const appDir = path.dirname(process.execPath);
  const args = [
    helper,
    "--zip",
    zipPath,
    "--target",
    appDir,
    "--exe",
    process.execPath,
  ];
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  updateInProgress = true;
  setTimeout(() => app.quit(), 250);
  return { started: true };
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
    },
  });
  win.on("close", (event) => {
    if (updateInProgress) event.preventDefault();
  });
  win.once("ready-to-show", () => win.show());
  if (!app.isPackaged) win.loadURL("http://127.0.0.1:5173");
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  return win;
}

app.whenReady().then(() => {
  ipcMain.handle("deadsmile:api", (_event, request) => apiRequest(request));
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
  ipcMain.handle("deadsmile:update-check", () => checkForUpdate());
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
    return shell.openPath(target);
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
          if (playSessions.has(id)) return { error: "Already running." };

          const child = spawn(exePath, args, {
              detached: true,
              stdio: "ignore",
              windowsHide: false,
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