const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  Menu,
  globalShortcut,
  screen,
  desktopCapturer,
  clipboard,
  ClipboardItem,
  net,
  protocol,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const { Readable, Transform } = require("node:stream");
const crypto = require("node:crypto");
const { Client, Instance } = require("@itchio/butlerd");
const butlerMessages = require("./butlerd-messages.cjs");
const { DownloadQueue } = require("./download-queue.cjs");
const APP_SCHEME = "deadsmile-app";
const APP_HOST = "launcher";
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
  },
]);
const STORAGE_ROOT = path.join(
  app.getPath("documents"),
  "Deadsmile Games Launcher",
);
const SETTINGS_DIR = path.join(STORAGE_ROOT, "settings");
const GAMES_DIR = path.join(STORAGE_ROOT, "Games");
const SCREENSHOTS_DIR = path.join(app.getPath("pictures"), "Deadsmile Games", "Screenshots");
const GAME_VIEW_SETTINGS_FILE = path.join(
  SETTINGS_DIR,
  "game-view.json"
);

const DEFAULT_GAME_VIEW_SETTINGS = {
  enabled: true,
  shortcut: "Control+D",
};
const PLAYTIME_FILE = path.join(SETTINGS_DIR, "playtime.json");
const ACHIEVEMENT_SYNC_FILE = path.join(SETTINGS_DIR, "achievement-sync.json");
const ACHIEVEMENT_LOG_FILE = path.join(SETTINGS_DIR, "achievement-sync.log");
const CLOUD_SAVE_CONFLICTS_DIR = path.join(SETTINGS_DIR, "cloud-save-conflicts");
const BUTLER_ROOT = path.join(SETTINGS_DIR, "butler");
const BUTLER_EXE = path.join(BUTLER_ROOT, "butler.exe");
const BUTLER_VERSION_FILE = path.join(BUTLER_ROOT, "version.txt");
const BUTLER_PATH_FILE = path.join(BUTLER_ROOT, "executable.txt");
const BUTLER_DB = path.join(SETTINGS_DIR, "butler.db");
const BUTLER_BROTH = "https://broth.itch.zone/butler/windows-amd64";
const IS_MICROSOFT_STORE = Boolean(process.windowsStore);
const playSessions = new Map();
let mainWindow = null;
let overlayWindow = null;
let gameViewSettings = {
  ...DEFAULT_GAME_VIEW_SETTINGS,
};

let registeredGameViewShortcut = null;
let gameViewShortcutCaptureTimer = null;
let overlayShowPending = false;
let overlayHideTimer = null;
const minimizedGameIds = new Set();
const gameWindowWatchers = new Map();
let gameViewLanguageState = {
  language: "en",
  strings: {},
};
let achievementWindow = null;
let achievementHideTimer = null;
let achievementSyncPromise = null;
let achievementSyncTimer = null;
let gameUpdateCheckQueue = Promise.resolve();
let gameUpdateCheckNextAt = 0;
const gameUpdateChecksInFlight = new Map();
const GAME_UPDATE_AUTH_INTERVAL_MS = 10_000;
let pendingLaunchGameId = null;
let butlerInstance = null;
let butlerClient = null;
const API_ALLOWED_REQUESTS = [
  ["GET", /^\/csrf$/],
  ["GET", /^\/auth\/me$/],
  ["POST", /^\/auth\/mobile-login$/],
  ["POST", /^\/auth\/verify-2fa$/],
  ["POST", /^\/auth\/logout$/],
  ["GET", /^\/games(?:\?|\/|$)/],
  ["GET", /^\/news(?:\?|\/|$)/],
  ["GET", /^\/videos(?:\?|\/|$)/],
  ["GET", /^\/search(?:\?|$)/],
  ["GET", /^\/wishlist(?:\?|$)/],
  ["POST", /^\/wishlist$/],
  ["DELETE", /^\/wishlist\/[0-9a-f-]{36}$/i],
  ["GET", /^\/account\/totp\/status$/],
  ["PATCH", /^\/account$/],
  ["GET", /^\/integrations\/itch$/],
  ["POST", /^\/integrations\/itch\/connect$/],
  ["DELETE", /^\/integrations\/itch$/],
  ["GET", /^\/library(?:\?|$)/],
  ["POST", /^\/library\/sync$/],
  ["POST", /^\/library\/[0-9a-f-]{36}\/verify$/i],
  ["GET", /^\/platform\/saves\/[0-9a-f-]{36}(?:\/[a-z0-9_-]{1,40})?(?:\?|$)/i],
  ["DELETE", /^\/platform\/saves\/[0-9a-f-]{36}\/[a-z0-9_-]{1,40}$/i],
  ["GET", /^\/platform\/achievements\/[0-9a-f-]{36}(?:\?|$)/i],
  ["GET", /^\/platform\/events(?:\?|$)/],
  ["GET", /^\/platform\/live-ticket$/],
  ["PATCH", /^\/platform\/telemetry-consent$/],
  ["POST", /^\/platform\/telemetry$/],
  ["POST", /^\/admin\/(?:game|newsletter|video)$/],
  ["DELETE", /^\/admin\/(?:game|newsletter|video)\/[0-9a-f-]{36}$/i],
];
const GAME_VIEW_API_ALLOWED_REQUESTS = [
  ["GET", /^\/csrf$/],
  ["GET", /^\/auth\/me$/],
  ["GET", /^\/games(?:\?|\/|$)/],
  ["GET", /^\/library(?:\?|$)/],
  ["GET", /^\/platform\/saves\/[0-9a-f-]{36}(?:\/[a-z0-9_-]{1,40})?(?:\?|$)/i],
  ["DELETE", /^\/platform\/saves\/[0-9a-f-]{36}\/[a-z0-9_-]{1,40}$/i],
  ["GET", /^\/platform\/achievements\/[0-9a-f-]{36}(?:\?|$)/i],
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RENDERER_API_BODY_BYTES = 1024 * 1024;
const MAX_GAME_ARCHIVE_BYTES = 20 * 1024 * 1024 * 1024;
const MAX_LAUNCHER_UPDATE_BYTES = 1024 * 1024 * 1024;
const MAX_BUTLER_ARCHIVE_BYTES = 512 * 1024 * 1024;
let gameViewLibraryState = [];

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

function readAchievementSyncQueue() {
  try {
    const parsed = JSON.parse(fs.readFileSync(ACHIEVEMENT_SYNC_FILE, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item &&
      UUID_PATTERN.test(String(item.gameId || "")) &&
      /^[a-z0-9_]{2,80}$/.test(String(item.key || ""))
    );
  } catch {
    return [];
  }
}

function writeAchievementSyncQueue(items) {
  try {
    fs.writeFileSync(
      ACHIEVEMENT_SYNC_FILE,
      JSON.stringify(Array.isArray(items) ? items : [], null, 2),
      "utf8",
    );
  } catch {}
}

function achievementLog(message, details = null) {
  const line = `[${new Date().toISOString()}] ${message}${details ? ` ${JSON.stringify(details)}` : ""}\n`;
  try {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    fs.appendFileSync(ACHIEVEMENT_LOG_FILE, line, "utf8");
  } catch (error) {
    console.warn("[Achievements] Could not write diagnostic log:", error?.message || error);
  }
}

function initializeAchievementDiagnostics() {
  try {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    if (!fs.existsSync(ACHIEVEMENT_SYNC_FILE)) {
      fs.writeFileSync(ACHIEVEMENT_SYNC_FILE, "[]\n", "utf8");
    }
    if (!fs.existsSync(ACHIEVEMENT_LOG_FILE)) {
      fs.writeFileSync(ACHIEVEMENT_LOG_FILE, "", "utf8");
    }
    const pending = readAchievementSyncQueue();
    achievementLog("launcher_started", {
      pid: process.pid,
      platform: process.platform,
      pendingUnlocks: pending.length,
      logFile: ACHIEVEMENT_LOG_FILE,
      queueFile: ACHIEVEMENT_SYNC_FILE,
    });
  } catch (error) {
    console.warn("[Achievements] Could not initialize diagnostics:", error?.message || error);
  }
}

const ACHIEVEMENT_SYNC_BATCH_SIZE = 2;
const ACHIEVEMENT_RETRY_BASE_MS = 30_000;
const ACHIEVEMENT_RETRY_MAX_MS = 30 * 60_000;

function enqueueAchievementUnlock(gameId, key) {
  const id = String(gameId || "");
  const achievementKey = String(key || "");
  if (!UUID_PATTERN.test(id) || !/^[a-z0-9_]{2,80}$/.test(achievementKey)) return;
  const items = readAchievementSyncQueue();
  if (items.some((item) => item.gameId === id && item.key === achievementKey)) return;
  items.push({
    gameId: id,
    key: achievementKey,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
    nextAttemptAt: null,
    attempts: 0,
  });
  writeAchievementSyncQueue(items);
}

function removeQueuedAchievementUnlock(gameId, key) {
  const items = readAchievementSyncQueue();
  writeAchievementSyncQueue(
    items.filter((item) => !(item.gameId === String(gameId) && item.key === String(key))),
  );
}

function achievementRetryDelay(attempts) {
  const exponent = Math.max(0, Math.min(10, Number(attempts || 1) - 1));
  const base = Math.min(ACHIEVEMENT_RETRY_MAX_MS, ACHIEVEMENT_RETRY_BASE_MS * (2 ** exponent));
  return base + Math.floor(Math.random() * 5_000);
}

function markQueuedAchievementAttempt(gameId, key) {
  const items = readAchievementSyncQueue();
  const now = Date.now();
  let updated = null;
  for (const item of items) {
    if (item.gameId === String(gameId) && item.key === String(key)) {
      item.attempts = Number(item.attempts || 0) + 1;
      item.lastAttemptAt = new Date(now).toISOString();
      item.nextAttemptAt = new Date(now + achievementRetryDelay(item.attempts)).toISOString();
      updated = { ...item };
      break;
    }
  }
  if (updated) writeAchievementSyncQueue(items);
  return updated;
}

function delayQueuedAchievementUnlock(gameId, key, minimumDelayMs) {
  const items = readAchievementSyncQueue();
  const now = Date.now();
  let changed = false;
  for (const item of items) {
    if (item.gameId === String(gameId) && item.key === String(key)) {
      const current = Date.parse(item.nextAttemptAt || 0) || now;
      const requested = now + Math.max(0, Number(minimumDelayMs) || 0);
      item.nextAttemptAt = new Date(Math.max(current, requested)).toISOString();
      changed = true;
      break;
    }
  }
  if (changed) writeAchievementSyncQueue(items);
}

function apiFailureDetails(result) {
  return {
    status: Number(result?.status || 0),
    code: result?.data?.error?.code || "UNKNOWN_ERROR",
    message: result?.data?.error?.message || "Request failed.",
    retryAfterMs: Number(result?.retryAfterMs || 0),
  };
}

function achievementFailureIsPermanent(failure) {
  if (failure.code === "ACHIEVEMENT_NOT_FOUND" || failure.code === "GAME_NOT_FOUND") return true;
  if (failure.status === 400 || failure.status === 422) return true;
  return false;
}

async function attemptQueuedAchievementUnlock(gameId, key) {
  markQueuedAchievementAttempt(gameId, key);
  try {
    const result = await protectedApi(
      `/platform/achievements/${gameId}/${key}/unlock`,
      "POST",
      {},
    );
    if (!result?.ok) {
      const failure = apiFailureDetails(result);
      if (achievementFailureIsPermanent(failure)) {
        removeQueuedAchievementUnlock(gameId, key);
        achievementLog("unlock_dropped", { gameId, key, ...failure });
      } else {
        const minimumDelay = failure.status === 429
          ? Math.max(60_000, failure.retryAfterMs)
          : failure.code === "GAME_ACCESS_REQUIRED"
            ? 30 * 60_000
            : failure.retryAfterMs;
        if (minimumDelay > 0) delayQueuedAchievementUnlock(gameId, key, minimumDelay);
        achievementLog("unlock_failed", { gameId, key, ...failure });
      }
      console.warn(
        `[Achievements] Unlock ${gameId}/${key} failed: HTTP ${failure.status} ${failure.code} - ${failure.message}`,
      );
      return false;
    }
    removeQueuedAchievementUnlock(gameId, key);
    console.info(`[Achievements] Synced ${gameId}/${key}.`);
    achievementLog("unlock_synced", { gameId, key });
    return true;
  } catch (error) {
    console.warn(
      `[Achievements] Unlock ${gameId}/${key} could not reach the server:`,
      error?.message || error,
    );
    achievementLog("unlock_network_error", { gameId, key, message: error?.message || String(error) });
    return false;
  }
}

async function syncPendingAchievementUnlocks(gameId = null) {
  if (achievementSyncPromise) return achievementSyncPromise;
  achievementSyncPromise = (async () => {
    const now = Date.now();
    const items = readAchievementSyncQueue()
      .filter((item) => !gameId || item.gameId === String(gameId))
      .filter((item) => {
        const next = Date.parse(item.nextAttemptAt || 0) || 0;
        return next <= now;
      })
      .slice(0, ACHIEVEMENT_SYNC_BATCH_SIZE);
    for (const item of items) {
      await attemptQueuedAchievementUnlock(item.gameId, item.key);
    }
  })().finally(() => {
    achievementSyncPromise = null;
  });
  return achievementSyncPromise;
}

function readGameViewSettings() {
  try {
    const data = JSON.parse(
      fs.readFileSync(
        GAME_VIEW_SETTINGS_FILE,
        "utf8"
      )
    );

    return {
      enabled: data?.enabled !== false,

      shortcut:
        typeof data?.shortcut === "string" &&
        data.shortcut.trim()
          ? data.shortcut.trim()
          : DEFAULT_GAME_VIEW_SETTINGS.shortcut,
    };
  } catch {
    return {
      ...DEFAULT_GAME_VIEW_SETTINGS,
    };
  }
}

function writeGameViewSettings(settings) {
  try {
    fs.writeFileSync(
      GAME_VIEW_SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      "utf8"
    );
  } catch {}
}

function gameViewShortcutLabel(accelerator) {
  return String(
    accelerator ||
      DEFAULT_GAME_VIEW_SETTINGS.shortcut
  )
    .replace(
      /CommandOrControl/gi,
      process.platform === "darwin"
        ? "Cmd"
        : "Ctrl"
    )
    .replace(/Control/gi, "Ctrl")
    .replace(/Super/gi, "Win")
    .replace(/\+/g, " + ");
}

function publicGameViewSettings(
  settings = gameViewSettings
) {
  return {
    enabled: settings.enabled,
    shortcut: settings.shortcut,
    label: gameViewShortcutLabel(
      settings.shortcut
    ),
  };
}

function unregisterGameViewShortcut() {
  if (!registeredGameViewShortcut) {
    return;
  }

  try {
    globalShortcut.unregister(
      registeredGameViewShortcut
    );
  } catch {}

  registeredGameViewShortcut = null;
}

function clearGameViewShortcutCaptureTimer() {
  if (!gameViewShortcutCaptureTimer) return;
  clearTimeout(gameViewShortcutCaptureTimer);
  gameViewShortcutCaptureTimer = null;
}

function armGameViewShortcutCaptureRestore() {
  clearGameViewShortcutCaptureTimer();
  gameViewShortcutCaptureTimer = setTimeout(() => {
    gameViewShortcutCaptureTimer = null;
    unregisterGameViewShortcut();
    registerGameViewShortcut(gameViewSettings);
  }, 30_000);
}

function registerGameViewShortcut(
  settings = gameViewSettings,
  { validateOnly = false } = {},
) {
  if (!settings.enabled) {
    return { ok: true };
  }

  const shortcut =
    String(settings.shortcut || "").trim() ||
    DEFAULT_GAME_VIEW_SETTINGS.shortcut;

  if (!playSessions.size && !validateOnly) {
    return { ok: true };
  }

  try {
    const registered = globalShortcut.register(shortcut, () => {
      if (!gameViewSettings.enabled || !playSessions.size) return;
      toggleGameOverlay();
    });

    if (!registered) {
      return {
        ok: false,
        error: "SHORTCUT_UNAVAILABLE",
      };
    }

    if (validateOnly) {
      globalShortcut.unregister(shortcut);
    } else {
      registeredGameViewShortcut = shortcut;
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "SHORTCUT_INVALID",
    };
  }
}

function broadcastGameViewSettings() {
  if (
    overlayWindow &&
    !overlayWindow.isDestroyed()
  ) {
    try {
      overlayWindow.webContents.send(
        "deadsmile:gameview-settings-changed",
        publicGameViewSettings()
      );
    } catch {}
  }
}

function updateGameViewSettings(patch = {}) {
  clearGameViewShortcutCaptureTimer();
  const previous = {
    ...gameViewSettings,
  };

  const candidate = {
    enabled:
      patch.enabled === undefined
        ? previous.enabled
        : Boolean(patch.enabled),

    shortcut:
      typeof patch.shortcut === "string" &&
      patch.shortcut.trim()
        ? patch.shortcut.trim()
        : previous.shortcut,
  };

  unregisterGameViewShortcut();

  const registration = registerGameViewShortcut(candidate, {
    validateOnly: candidate.enabled && !playSessions.size,
  });

  if (!registration.ok) {
    unregisterGameViewShortcut();

    registerGameViewShortcut(previous);

    return {
      ...registration,
      settings:
        publicGameViewSettings(previous),
    };
  }

  gameViewSettings = candidate;

  writeGameViewSettings(
    gameViewSettings
  );

  if (!gameViewSettings.enabled) {
    overlayShowPending = false;

    if (
      overlayWindow &&
      !overlayWindow.isDestroyed()
    ) {
      overlayWindow.hide();
    }
  }

  broadcastGameViewSettings();

  return {
    ok: true,
    settings:
      publicGameViewSettings(),
  };
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
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
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

gameViewSettings = readGameViewSettings();

app.setPath("userData", SETTINGS_DIR);
if (!IS_MICROSOFT_STORE) app.setAsDefaultProtocolClient("deadsmile");
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    let win = mainWindow;
    if (!win || win.isDestroyed()) win = createWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) {
        if (playSessions.size) win.showInactive();
        else win.show();
      }
      if (!playSessions.size) win.focus();
    }
    const url = argv.find((arg) => arg.startsWith("deadsmile://"));
    if (url) handleDeepLink(url);
  });
  app.on("open-url", (_event, url) => {
    _event.preventDefault();
    handleDeepLink(url);
  });
}
function dispatchLaunchGame(gameId) {
  if (!gameId) return;
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
    send(mainWindow.webContents, "deadsmile:launch-game", gameId);
    return;
  }
  pendingLaunchGameId = gameId;
}

function handleDeepLink(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "deadsmile:" && parsed.hostname === "launch") {
      const gameId = parsed.searchParams.get("gameId");
      if (UUID_PATTERN.test(String(gameId || ""))) dispatchLaunchGame(gameId);
    }
  } catch {}
}

const API_URL = "https://deadsmile.vercel.app/api";

function canonicalRendererApiPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  try {
    const base = new URL(API_URL);
    const url = new URL(`${API_URL}${value}`);
    const apiPrefix = `${base.pathname.replace(/\/$/, "")}/`;
    if (url.origin !== base.origin || !url.pathname.startsWith(apiPrefix)) {
      return null;
    }
    return `${url.pathname.slice(base.pathname.replace(/\/$/, "").length)}${url.search}`;
  } catch {
    return null;
  }
}

const GITHUB_REPO = "deadsmilegames/launcher";
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const APP_VERSION = app.getVersion();
initializeAchievementDiagnostics();
achievementLog("launcher_version", { version: APP_VERSION });
const UPDATE_CONFIRM_ARG = "--update-confirm";
const UPDATE_CONFIRM_PATH = (() => {
  const index = process.argv.indexOf(UPDATE_CONFIRM_ARG);
  const raw = index >= 0 ? process.argv[index + 1] : "";
  if (!raw || typeof raw !== "string") return "";
  const candidate = path.resolve(raw);
  const tempRoot = path.resolve(app.getPath("temp"));
  const parent = path.dirname(candidate);
  if (!candidate.startsWith(`${tempRoot}${path.sep}`)) return "";
  if (!path.basename(parent).startsWith("deadsmile-launcher-update-")) return "";
  if (path.basename(candidate).toLowerCase() !== "update-confirmed.json") return "";
  return candidate;
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
function safeExternalUrl(value) {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol === "https:") return url.toString();
    if (url.protocol === "mailto:" && !/[\r\n]/.test(value)) return url.toString();
    return null;
  } catch {
    return null;
  }
}

async function openExternalSafely(value) {
  const url = safeExternalUrl(value);
  if (!url) return false;
  await shell.openExternal(url);
  return true;
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

function retryAfterMs(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Math.min(24 * 60 * 60_000, Number(raw) * 1000);
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? Math.max(0, Math.min(24 * 60 * 60_000, timestamp - Date.now())) : 0;
}

async function apiRequest({
  path: endpoint,
  method = "GET",
  body,
  headers = {},
}) {
  const response = await session.defaultSession.fetch(`${API_URL}${endpoint}`, {
    method,
    signal: AbortSignal.timeout(30_000),
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
  return {
    ok: response.ok,
    status: response.status,
    data,
    retryAfterMs: retryAfterMs(response.headers.get("retry-after")),
  };
}

async function clearLocalAuthSession() {
  const jar = session.defaultSession.cookies;
  const names = new Set(["deadsmile.sid", "deadsmile.csrf"]);
  const cookies = await jar.get({ url: API_URL });
  for (const cookie of cookies) {
    if (!names.has(cookie.name)) continue;
    const host = String(cookie.domain || new URL(API_URL).hostname).replace(/^\./, "");
    const pathname = String(cookie.path || "/").startsWith("/") ? String(cookie.path || "/") : "/";
    const scheme = cookie.secure === false ? "http" : "https";
    await jar.remove(`${scheme}://${host}${pathname}`, cookie.name);
  }
  await jar.flushStore();
  return true;
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

async function endPlatformSessionWithRetry(sessionId, maxAttempts = 3) {
  if (!UUID_PATTERN.test(String(sessionId || ""))) return false;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await protectedApi(`/platform/sessions/${sessionId}/end`, "POST", {});
      if (result?.ok) return true;
      const failure = apiFailureDetails(result);
      if (failure.status === 409 && failure.code === "SESSION_NOT_ACTIVE") return true;
      if (attempt >= maxAttempts) {
        achievementLog("session_end_failed", { sessionId, attempt, ...failure });
        return false;
      }
      const delay = Math.max(500, Math.min(5_000, failure.retryAfterMs || (500 * (2 ** (attempt - 1)))));
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      if (attempt >= maxAttempts) {
        achievementLog("session_end_network_error", { sessionId, attempt, message: error?.message || String(error) });
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** (attempt - 1))));
    }
  }
  return false;
}

function isAbbysRestlessHeartTitle(title) {
  const normalized = String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return normalized.includes("abby") && normalized.includes("restlessheart");
}

function isAbbyPicoIntegration(title, savePathTemplate = null) {
  return (
    isAbbysRestlessHeartTitle(title) ||
    String(savePathTemplate || "")
      .toLowerCase()
      .includes("deadsmile_abbys_restless_heart")
  );
}

function resolveSavePath(template, title = null) {
  let candidate = template;
  if ((!candidate || typeof candidate !== "string") && isAbbysRestlessHeartTitle(title)) {
    candidate = "{appdata}/pico-8/cdata/deadsmile_abbys_restless_heart.p8d.txt";
  }
  if (!candidate || typeof candidate !== "string") return null;
  const expanded = candidate.replace("{appdata}", app.getPath("appData"));
  const resolved = path.resolve(expanded);
  const allowed = path.resolve(path.join(app.getPath("appData"), "pico-8", "cdata"));
  if (!isPathInside(allowed, resolved) || !resolved.toLowerCase().endsWith(".p8d.txt")) return null;
  return resolved;
}

async function safePicoSaveTarget(target, { createParent = false } = {}) {
  if (!target) return null;
  const appDataRoot = path.resolve(app.getPath("appData"));
  const resolved = path.resolve(target);
  if (!isPathInside(appDataRoot, resolved) || !resolved.toLowerCase().endsWith(".p8d.txt")) return null;
  const relative = path.relative(appDataRoot, resolved);
  const parts = relative.split(path.sep).filter(Boolean);
  if (parts.length < 3 || parts[0].toLowerCase() !== "pico-8" || parts[1].toLowerCase() !== "cdata") return null;
  let appDataReal;
  try { appDataReal = await fsp.realpath(appDataRoot); } catch { return null; }
  let current = appDataRoot;
  for (const part of parts.slice(0, -1)) {
    const next = path.join(current, part);
    try {
      const stat = await fsp.lstat(next);
      if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
    } catch (error) {
      if (error?.code !== "ENOENT" || !createParent) return null;
      await fsp.mkdir(next);
    }
    let real;
    try { real = await fsp.realpath(next); } catch { return null; }
    if (!isPathInside(appDataReal, real, { allowRoot: true })) return null;
    current = next;
  }
  const filePath = path.join(current, parts[parts.length - 1]);
  try {
    const stat = await fsp.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) return null;
  } catch (error) {
    if (error?.code !== "ENOENT") return null;
  }
  return filePath;
}

const ABBY_PICO_ACHIEVEMENT_DATA_INDICES = [1, 4, 5, 6, 7];

function picoDataHex(fileBytes) {
  try {
    const source = Buffer.isBuffer(fileBytes)
      ? fileBytes.toString("utf8").replace(/\s+/g, "")
      : String(fileBytes || "").replace(/\s+/g, "");
    if (!/^[a-f0-9]{512}$/i.test(source)) return null;
    return source.toLowerCase();
  } catch {
    return null;
  }
}

function picoFixedFromWord(word) {
  if (!/^[a-f0-9]{8}$/i.test(String(word || ""))) return null;
  let raw = Number.parseInt(word, 16) >>> 0;
  if (raw >= 0x80000000) raw -= 0x100000000;
  return raw / 0x10000;
}

function picoWordAt(source, index) {
  if (!source || !Number.isInteger(index) || index < 0 || index > 63) return null;
  return source.slice(index * 8, index * 8 + 8);
}

function mergePicoAchievementFlags(remoteFileBytes, localFileBytes) {
  const remote = picoDataHex(remoteFileBytes);
  const local = picoDataHex(localFileBytes);
  if (!remote || !local) return remoteFileBytes;

  const words = Array.from({ length: 64 }, (_, index) => picoWordAt(remote, index));

  for (const index of ABBY_PICO_ACHIEVEMENT_DATA_INDICES) {
    const localWord = picoWordAt(local, index);
    const remoteWord = words[index];
    const localValue = picoFixedFromWord(localWord);
    const remoteValue = picoFixedFromWord(remoteWord);
    if (localValue != null && remoteValue != null && localValue > remoteValue) {
      words[index] = localWord;
    }
  }

  const hex = words.join("");
  const formatted = `${hex.match(/.{1,64}/g).join("\n")}\n`;
  return Buffer.from(formatted, "utf8");
}

function validatedCloudSaveBytes(remote) {
  const encoded = String(remote?.payload || "");
  if (!encoded || encoded.length > 350_000 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error("CLOUD_SAVE_INVALID_PAYLOAD");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > 256 * 1024 || bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new Error("CLOUD_SAVE_INVALID_PAYLOAD");
  }
  const expectedHash = String(remote?.sha256 || "").toLowerCase();
  if (/^[a-f0-9]{64}$/.test(expectedHash)) {
    const actualHash = crypto.createHash("sha256").update(bytes).digest("hex");
    if (actualHash !== expectedHash) throw new Error("CLOUD_SAVE_CHECKSUM_MISMATCH");
  }
  return bytes;
}

async function preserveCloudSaveConflict(gameId, state) {
  const target = await safePicoSaveTarget(state?.target);
  if (!target) return null;
  const folder = path.join(CLOUD_SAVE_CONFLICTS_DIR, String(gameId));
  await fsp.mkdir(folder, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.basename(target).replace(/\.p8d\.txt$/i, "");
  let localBackup = null;
  let remoteBackup = null;
  let remoteRevision = null;
  try {
    if (await pathExists(target)) {
      localBackup = path.join(folder, `${base}.local-${stamp}.p8d.txt`);
      await fsp.copyFile(target, localBackup);
      try { await fsp.chmod(localBackup, 0o600); } catch {}
    }
  } catch {
    localBackup = null;
  }
  try {
    const remoteResult = await apiRequest({ path: `/platform/saves/${gameId}/default` });
    const remote = remoteResult?.data?.data;
    if (remoteResult?.ok && remote?.payload) {
      const bytes = validatedCloudSaveBytes(remote);
      remoteRevision = remote.revision ?? null;
      remoteBackup = path.join(folder, `${base}.remote-r${String(remoteRevision ?? "unknown").replace(/[^0-9A-Za-z_-]/g, "")}-${stamp}.p8d.txt`);
      await fsp.writeFile(remoteBackup, bytes, { mode: 0o600 });
    }
  } catch {
    remoteBackup = null;
  }
  state.conflict = true;
  state.remoteRevision = remoteRevision;
  const payload = {
    gameId: String(gameId),
    code: "SAVE_CONFLICT",
    localBackup: localBackup ? path.basename(localBackup) : null,
    remoteBackup: remoteBackup ? path.basename(remoteBackup) : null,
  };
  broadcast("deadsmile:cloud-save-conflict", payload);
  achievementLog("cloud_save_conflict", payload);
  return payload;
}

async function restoreCloudSave(gameId, template, title = null) {
  const target = await safePicoSaveTarget(resolveSavePath(template, title), { createParent: true });
  if (!target) return null;
  const result = await apiRequest({ path: `/platform/saves/${gameId}/default` });
  if (!result.ok || !result.data?.data?.payload) return { target, revision: null };
  const remote = result.data.data;
  const remoteTime = Date.parse(remote.updated_at || remote.updatedAt || 0) || 0;
  let localTime = 0;
  try { localTime = (await fsp.stat(target)).mtimeMs; } catch {}
  if (!localTime || remoteTime > localTime) {
    let bytes = validatedCloudSaveBytes(remote);
    if (bytes.length <= 256 * 1024) {
      try {
        const localBytes = await fsp.readFile(target);
        bytes = mergePicoAchievementFlags(bytes, localBytes);
      } catch {}
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, bytes, { mode: 0o600 });
    }
  }
  return { target, revision: remote.revision ?? null };
}

async function uploadCloudSave(gameId, state) {
  if (state?.conflict) {
    return {
      ok: false,
      status: 409,
      data: { error: { code: "SAVE_CONFLICT", message: "Cloud save conflict requires review." } },
    };
  }
  const target = await safePicoSaveTarget(state?.target);
  if (!target || !(await pathExists(target))) return null;
  const bytes = await fsp.readFile(target);
  if (!bytes.length || bytes.length > 256 * 1024) return null;
  const result = await protectedApi(`/platform/saves/${gameId}/default`, "PUT", {
    payload: bytes.toString("base64"),
    revision: state.revision,
  });
  const saved = result?.data?.data;
  if (result?.ok && saved?.revision != null) {
    state.revision = saved.revision;
    state.conflict = false;
    state.remoteRevision = null;
  } else if (result?.status === 409 && result?.data?.error?.code === "SAVE_CONFLICT") {
    await preserveCloudSaveConflict(gameId, state);
  }
  return result;
}

async function readPicoNumber(target, index) {
  try {
    const safeTarget = await safePicoSaveTarget(target);
    if (!safeTarget) return null;
    const source = picoDataHex(await fsp.readFile(safeTarget));
    const word = picoWordAt(source, index);
    return picoFixedFromWord(word);
  } catch {
    return null;
  }
}

const ABBY_PICO_ACHIEVEMENTS = [
  {
    key: "finish_story",
    index: 1,
    title: "Restless no more",
    description: "Reach the end of Abby's journey.",
    points: 100,
  },
  {
    key: "first_checkpoint",
    index: 4,
    title: "Keep moving",
    description: "Reach your first checkpoint.",
    points: 20,
  },
  {
    key: "first_coin",
    index: 5,
    title: "A little spark",
    description: "Collect your first coin.",
    points: 20,
  },
  {
    key: "all_coins",
    index: 6,
    title: "Every little piece",
    description: "Collect every coin in a run.",
    points: 75,
  },
  {
    key: "no_death_finish",
    index: 7,
    title: "Unbroken Heart",
    description: "Finish Abby's journey without dying.",
    points: 150,
    hidden: true,
  },
];

function picoAchievementDefinitions(target, title) {
  const filename = path.basename(String(target || "")).toLowerCase();
  if (filename === "deadsmile_abbys_restless_heart.p8d.txt" || isAbbysRestlessHeartTitle(title)) {
    return ABBY_PICO_ACHIEVEMENTS;
  }
  return [];
}

async function readPicoAchievementState(target, definitions) {
  const values = new Map();
  for (const definition of definitions) {
    values.set(definition.key, await readPicoNumber(target, definition.index));
  }
  return values;
}

async function trustedGameMetadata(gameId, gameSlug = null) {
  const id = String(gameId || "");
  if (!UUID_PATTERN.test(id)) return null;

  const slug =
    typeof gameSlug === "string" &&
    /^[a-z0-9-]{1,120}$/.test(gameSlug)
      ? gameSlug
      : null;

  if (slug) {
    try {
      const detail = await apiRequest({
        path: `/games/${encodeURIComponent(slug)}`,
      });

      const game = detail?.data?.data;

      if (
        detail?.ok &&
        game &&
        String(game.id) === id
      ) {
        return game;
      }
    } catch {}
  }

  try {
    const library = await apiRequest({ path: "/library" });

    const items = Array.isArray(library?.data?.data?.items)
      ? library.data.data.items
      : [];

    const match = items.find(
      (item) => String(item?.id) === id,
    );

    if (match) {
      const commerceEnabled = Boolean(
        match.purchaseUrl && match.itchGameId,
      );

      return {
        ...match,
        commerceEnabled,
        downloadUrl: commerceEnabled
          ? null
          : match.downloadUrl || null,
      };
    }
  } catch {}

  try {
    const catalog = await apiRequest({
      path: "/games?page=1&limit=48",
    });

    const items = Array.isArray(
      catalog?.data?.data?.items,
    )
      ? catalog.data.data.items
      : [];

    return (
      items.find((item) => String(item?.id) === id) ||
      null
    );
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
  const authorization = result.data?.data;
  if (!result.ok || !authorization || !isHttps(authorization.downloadUrl) || !Number.isSafeInteger(Number(authorization.itchGameId))) {
    throw new Error(result.data?.error?.code || "DOWNLOAD_NOT_AUTHORIZED");
  }
  return authorization;
}

async function downloadGameArchive({ url, destination, expectedSize, expectedSha256 = null, filename, mode, ctx }) {
  if (!isHttps(url)) throw new Error("DOWNLOAD_NOT_AUTHORIZED");
  const declaredExpectedSize = Number(expectedSize) || 0;
  if (declaredExpectedSize > MAX_GAME_ARCHIVE_BYTES) throw new Error("GAME_DOWNLOAD_TOO_LARGE");
  const expectedHash = /^[a-f0-9]{64}$/i.test(String(expectedSha256 || "")) ? String(expectedSha256).toLowerCase() : null;
  const controller = new AbortController();
  const watcher = setInterval(() => {
    if (ctx.isAborted() || ctx.isPaused()) controller.abort();
  }, 200);
  try {
    const response = await session.defaultSession.fetch(url, {
      headers: {
        Accept: "application/octet-stream",
        "User-Agent": `Deadsmile-Games-Launcher/${APP_VERSION}`,
      },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error("GAME_DOWNLOAD_FAILED");
    const total = Number(response.headers.get("content-length")) || Number(expectedSize) || 0;
    if (total > MAX_GAME_ARCHIVE_BYTES) throw new Error("GAME_DOWNLOAD_TOO_LARGE");
    let received = 0;
    const hash = expectedHash ? crypto.createHash("sha256") : null;
    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        if (ctx.isAborted()) return callback(new Error("Cancelled"));
        if (ctx.isPaused()) return callback(new Error("Paused"));
        received += chunk.length;
        if (hash) hash.update(chunk);
        if (received > MAX_GAME_ARCHIVE_BYTES) return callback(new Error("GAME_DOWNLOAD_TOO_LARGE"));
        ctx.onProgress({
          status: mode === "update" ? "updating" : "downloading",
          percent: total ? Math.min(95, Math.round((received / total) * 95)) : 0,
          received,
          total,
          fileName: filename,
        });
        callback(null, chunk);
      },
    });
    await pipeline(
      Readable.fromWeb(response.body),
      meter,
      fs.createWriteStream(destination, { mode: 0o600 }),
    );
    if (declaredExpectedSize > 0 && received !== declaredExpectedSize) throw new Error("GAME_DOWNLOAD_SIZE_MISMATCH");
    if (hash && hash.digest("hex").toLowerCase() !== expectedHash) throw new Error("GAME_DOWNLOAD_CHECKSUM_MISMATCH");
  } catch (error) {
    if (ctx.isAborted()) throw new Error("Cancelled");
    if (ctx.isPaused()) throw new Error("Paused");
    if (error?.name === "AbortError") throw new Error("GAME_DOWNLOAD_FAILED");
    throw error;
  } finally {
    clearInterval(watcher);
  }
}

async function downloadFile(url, destination) {
  const response = await session.defaultSession.fetch(url, {
    headers: { Accept: "application/octet-stream", "User-Agent": `Deadsmile-Games-Launcher/${APP_VERSION}` },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || !response.body) throw new Error("BUTLER_DOWNLOAD_FAILED");
  const declared = Number(response.headers.get("content-length")) || 0;
  if (declared > MAX_BUTLER_ARCHIVE_BYTES) throw new Error("BUTLER_DOWNLOAD_TOO_LARGE");
  let received = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > MAX_BUTLER_ARCHIVE_BYTES) return callback(new Error("BUTLER_DOWNLOAD_TOO_LARGE"));
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), limiter, fs.createWriteStream(destination, { mode: 0o600 }));
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
  const staging = await fsp.mkdtemp(path.join(SETTINGS_DIR, ".butler-staging-"));
  const butlerTempRoot = await fsp.mkdtemp(path.join(app.getPath("temp"), "deadsmile-butler-"));
  const archive = path.join(butlerTempRoot, "butler.zip");
  try {
    await downloadFile(`${BUTLER_BROTH}/${encodeURIComponent(remoteVersion)}/archive/default`, archive);
    await extractZip(archive, staging, { maxExtractedBytes: 1024 * 1024 * 1024, maxEntries: 20000 });
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
    await fsp.rm(butlerTempRoot, { recursive: true, force: true }).catch(() => {});
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

async function validateExtractedTree(root) {
  const expectedRoot = path.resolve(root);
  const queue = [expectedRoot];
  while (queue.length) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const stat = await fsp.lstat(full);
      if (stat.isSymbolicLink()) throw new Error("ZIP_LINK_ENTRY_BLOCKED");
      const real = path.resolve(await fsp.realpath(full));
      if (real !== expectedRoot && !real.startsWith(`${expectedRoot}${path.sep}`)) {
        throw new Error("ZIP_PATH_TRAVERSAL_BLOCKED");
      }
      if (entry.isDirectory()) queue.push(full);
    }
  }
}

async function extractZip(zipPath, destination, { maxExtractedBytes = 40 * 1024 * 1024 * 1024, maxEntries = 100000 } = {}) {
  await fsp.mkdir(destination, { recursive: true });
  const script = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($env:DS_ZIP)
try {
  $root = [System.IO.Path]::GetFullPath($env:DS_DEST)
  $prefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  [Int64]$maxBytes = [Int64]::Parse($env:DS_MAX_BYTES)
  [Int32]$maxEntries = [Int32]::Parse($env:DS_MAX_ENTRIES)
  [Int64]$totalBytes = 0
  [Int32]$entryCount = 0
  foreach ($entry in $zip.Entries) {
    $entryCount += 1
    if ($entryCount -gt $maxEntries) { throw 'ZIP_TOO_MANY_ENTRIES' }
    if ($entry.Length -lt 0) { throw 'ZIP_INVALID_ENTRY_SIZE' }
    $totalBytes += [Int64]$entry.Length
    if ($totalBytes -gt $maxBytes) { throw 'ZIP_EXTRACTED_SIZE_LIMIT' }
    $name = $entry.FullName.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    if ([System.IO.Path]::IsPathRooted($name)) { throw 'ZIP_PATH_TRAVERSAL_BLOCKED' }
    $segments = $name.Split([System.IO.Path]::DirectorySeparatorChar, [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($segment in $segments) {
      if ($segment -eq '.' -or $segment -eq '..' -or $segment.Contains(':') -or $segment.EndsWith('.') -or $segment.EndsWith(' ')) { throw 'ZIP_UNSAFE_ENTRY_BLOCKED' }
      $stem = [System.IO.Path]::GetFileNameWithoutExtension($segment).ToUpperInvariant()
      if ($stem -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$') { throw 'ZIP_UNSAFE_ENTRY_BLOCKED' }
    }
    $target = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $name))
    if (($target -ne $root) -and -not $target.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw 'ZIP_PATH_TRAVERSAL_BLOCKED'
    }
  }
} finally {
  $zip.Dispose()
}
Expand-Archive -LiteralPath $env:DS_ZIP -DestinationPath $env:DS_DEST -Force
`;
  await new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script
    ], {
      windowsHide: true,
      env: {
        ...process.env,
        DS_ZIP: zipPath,
        DS_DEST: destination,
        DS_MAX_BYTES: String(Math.max(1, Math.floor(maxExtractedBytes))),
        DS_MAX_ENTRIES: String(Math.max(1, Math.floor(maxEntries))),
      },
    });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `Zip extraction failed (${code}).`)));
  });
  await validateExtractedTree(destination);
}

async function firstExe(directory) {
  const rootEntries = await fsp.readdir(directory, { withFileTypes: true });
  const rootExecutables = rootEntries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".exe"))
    .map((entry) => path.join(directory, entry.name));
  if (rootExecutables.length === 1) return rootExecutables[0];
  if (rootExecutables.length > 1) return null;

  const executables = [];
  const queue = rootEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name));
  while (queue.length) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) executables.push(full);
      if (executables.length > 1) return null;
    }
  }
  return executables[0] || null;
}

async function pathExists(target) {
  try { await fsp.access(target); return true; } catch { return false; }
}

function isPathInside(root, candidate, { allowRoot = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (!relative) return Boolean(allowRoot);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function resolveExistingPathInsideRoot(root, candidate, { allowRoot = false } = {}) {
  if (typeof candidate !== "string" || !candidate.trim()) return null;
  const rootPath = path.resolve(root);
  const candidatePath = path.resolve(candidate);
  if (!isPathInside(rootPath, candidatePath, { allowRoot })) return null;
  try {
    const rootStat = await fsp.lstat(rootPath);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) return null;
    const relative = path.relative(rootPath, candidatePath);
    let current = rootPath;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      const stat = await fsp.lstat(current);
      if (stat.isSymbolicLink()) return null;
    }
    const [rootReal, candidateReal] = await Promise.all([
      fsp.realpath(rootPath),
      fsp.realpath(candidatePath),
    ]);
    return isPathInside(rootReal, candidateReal, { allowRoot }) ? candidateReal : null;
  } catch {
    return null;
  }
}

async function assertSafeManagedGameDirectory(candidate, { allowMissing = true } = {}) {
  const rootPath = path.resolve(GAMES_DIR);
  const candidatePath = path.resolve(candidate);
  if (!isPathInside(rootPath, candidatePath)) throw new Error("GAME_PATH_INVALID");
  try {
    const stat = await fsp.lstat(candidatePath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("GAME_PATH_UNSAFE");
    const resolved = await resolveExistingPathInsideRoot(rootPath, candidatePath);
    if (!resolved) throw new Error("GAME_PATH_UNSAFE");
  } catch (error) {
    if (error?.code === "ENOENT" && allowMissing) return;
    throw error;
  }
}

function normalizeVersion(value) {
  const match = String(value || "").trim().match(/^v?(\d+(?:\.\d+){0,3})$/i);
  return match ? match[1].split(".").map((part) => String(Number.parseInt(part, 10))).join(".") : null;
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
  await assertSafeManagedGameDirectory(gameFolder, { allowMissing: true });
  await assertSafeManagedGameDirectory(oldFolder, { allowMissing: true });
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
  const authorization = commerceEnabled
    ? await downloadAuthorization(id)
    : {
        downloadUrl: job.url,
        filename: job.filename,
        sizeBytes: 0,
        version: versionFromFilename(job.filename || job.url),
      };
  if (!isHttps(authorization.downloadUrl)) throw new Error("DOWNLOAD_NOT_AUTHORIZED");
  const archiveName = sanitizeName(authorization.filename || `${slug || id}.zip`);
  const remoteVersion = String(authorization.version || versionFromFilename(archiveName) || "").trim() || null;
  if (mode === "update" && remoteVersion && currentVersion && compareVersions(remoteVersion, currentVersion) <= 0) {
    throw new Error("NO_UPDATE_AVAILABLE");
  }
  const gameFolder = path.join(GAMES_DIR, sanitizeName(slug || id));
  await fsp.mkdir(GAMES_DIR, { recursive: true });

  if (mode === "update" && playSessions.has(id)) throw new Error("GAME_RUNNING");

  const downloadRoot = path.join(app.getPath("temp"), "deadsmile-game-downloads");
  await fsp.mkdir(downloadRoot, { recursive: true });
  const jobRoot = await fsp.mkdtemp(path.join(downloadRoot, `${sanitizeName(slug || id).slice(0, 60)}-`));
  const stagingFolder = path.join(jobRoot, "install");
  const archivePath = path.join(jobRoot, "game.zip");

  try {
    await downloadGameArchive({
      url: authorization.downloadUrl,
      destination: archivePath,
      expectedSize: authorization.sizeBytes,
      expectedSha256: authorization.sha256 || null,
      filename: archiveName,
      mode,
      ctx,
    });
    if (ctx.isAborted()) throw new Error("Cancelled");
    if (ctx.isPaused()) throw new Error("Paused");
    ctx.onProgress({
      status: mode === "update" ? "updating" : "downloading",
      percent: 96,
      received: Number(authorization.sizeBytes) || 0,
      total: Number(authorization.sizeBytes) || 0,
      fileName: archiveName,
    });
    await extractZip(archivePath, stagingFolder, { maxExtractedBytes: 40 * 1024 * 1024 * 1024, maxEntries: 100000 });
    const exePath = await firstExe(stagingFolder);
    if (!exePath) throw new Error("WINDOWS_EXECUTABLE_MISSING");

    if (mode === "update") {
      const swapped = await swapGameInstall({ gameFolder, stagingFolder, ctx });
      return { ...swapped, slug, version: remoteVersion || currentVersion };
    }

    await assertSafeManagedGameDirectory(gameFolder, { allowMissing: true });
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
function broadcast(channel, payload, excludeWindow = null) {
    for (const win of BrowserWindow.getAllWindows()) {
        if (win === excludeWindow) continue;
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
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = assets.find((x) =>
      /launcher/i.test(x.name || "") && /\.zip$/i.test(x.name || "") && isHttps(x.browser_download_url));
    if (!asset) return { available: false, currentVersion: APP_VERSION, latestVersion, reason: "No launcher update zip was published." };
    const digest = /^sha256:[a-f0-9]{64}$/i.test(String(asset.digest || "")) ? String(asset.digest) : null;
    const checksumAsset = assets.find((x) =>
      String(x.name || "").toLowerCase() === `${String(asset.name || "").toLowerCase()}.sha256` && isHttps(x.browser_download_url));
    if (!digest && !checksumAsset) {
      return { available: false, currentVersion: APP_VERSION, latestVersion, reason: "The launcher update is missing a SHA-256 digest." };
    }
    return { available: true, currentVersion: APP_VERSION, latestVersion, notes: release.body || "",
      url: asset.browser_download_url, name: asset.name, size: asset.size || 0, digest,
      checksumUrl: checksumAsset?.browser_download_url || null };
  } catch (error) {
    return { available: false, currentVersion: APP_VERSION, reason: error?.message || "Update check failed." };
  }
}

async function updateLauncher(sender) {
  if (IS_MICROSOFT_STORE) throw new Error("UPDATE_MANAGED_BY_MICROSOFT_STORE");
  if (updateInProgress) throw new Error("Launcher update already in progress.");
  const update = await checkForUpdate();
  if (!update.available) throw new Error(update.reason || "No update is available.");

  const tempRoot = await fsp.mkdtemp(path.join(app.getPath("temp"), "deadsmile-launcher-update-"));
  const zipPath = path.join(tempRoot, sanitizeName(update.name));
  const response = await session.defaultSession.fetch(update.url, {
    headers: { Accept: "application/octet-stream", "User-Agent": "Deadsmile-Games-Launcher" },
  });
  if (!response.ok || !response.body) throw new Error(`Unable to download launcher update (${response.status}).`);

  const total = Number(response.headers.get("content-length")) || update.size || 0;
  if (total > MAX_LAUNCHER_UPDATE_BYTES) throw new Error("Launcher update is too large.");
  let received = 0;
  const hash = crypto.createHash("sha256");
  const stream = Readable.fromWeb(response.body);
  stream.on("data", (chunk) => {
    received += chunk.length;
    if (received > MAX_LAUNCHER_UPDATE_BYTES) {
      stream.destroy(new Error("Launcher update is too large."));
      return;
    }
    hash.update(chunk);
    send(sender, "deadsmile:update-progress", {
      status: "downloading", percent: total ? Math.min(100, Math.round((received / total) * 100)) : 0,
      received, total,
    });
  });
  await pipeline(stream, fs.createWriteStream(zipPath, { mode: 0o600 }));
  let expected = /^sha256:[a-f0-9]{64}$/i.test(String(update.digest || ""))
    ? String(update.digest).slice("sha256:".length).toLowerCase()
    : null;
  if (!expected && update.checksumUrl) {
    const checksumResponse = await session.defaultSession.fetch(update.checksumUrl, {
      headers: { Accept: "text/plain", "User-Agent": "Deadsmile-Games-Launcher" },
      signal: AbortSignal.timeout(30_000),
    });
    if (checksumResponse.ok) {
      const checksumText = await checksumResponse.text();
      const match = checksumText.match(/\b([a-f0-9]{64})\b/i);
      expected = match ? match[1].toLowerCase() : null;
    }
  }
  if (!expected) throw new Error("Launcher update checksum is unavailable.");
  const actual = hash.digest("hex").toLowerCase();
  if (actual !== expected) throw new Error("Launcher update checksum verification failed.");
  const staging = path.join(tempRoot, "staging");
  await extractZip(zipPath, staging, { maxExtractedBytes: 4 * 1024 * 1024 * 1024, maxEntries: 50000 });
  const stagedExe = await findLauncherExe(staging, path.basename(process.execPath));
  if (!stagedExe) throw new Error("Updated launcher executable is missing from the archive.");
  await verifyLauncherUpdateSignature(stagedExe);
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
    path.join(process.resourcesPath, "app.asar", "electron", "updater.cjs"),
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

async function authenticodeIdentity(filePath) {
  if (process.platform !== "win32" || typeof filePath !== "string" || !filePath) return null;
  const script = String.raw`
$signature = Get-AuthenticodeSignature -LiteralPath $env:DS_SIGNATURE_FILE
$result = [ordered]@{
  status = [string]$signature.Status
  subject = if ($signature.SignerCertificate) { [string]$signature.SignerCertificate.Subject } else { '' }
  thumbprint = if ($signature.SignerCertificate) { [string]$signature.SignerCertificate.Thumbprint } else { '' }
}
$result | ConvertTo-Json -Compress
`;
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, DS_SIGNATURE_FILE: filePath },
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (output.length < 32_768) output += chunk;
    });
    child.once("error", () => resolve(null));
    child.once("close", (code) => {
      if (code !== 0) return resolve(null);
      try {
        const value = JSON.parse(output.trim());
        resolve({
          valid: value?.status === "Valid",
          subject: String(value?.subject || ""),
          thumbprint: String(value?.thumbprint || ""),
        });
      } catch {
        resolve(null);
      }
    });
  });
}

async function verifyLauncherUpdateSignature(stagedExe) {
  if (process.platform !== "win32" || !app.isPackaged) return;
  const current = await authenticodeIdentity(process.execPath);
  if (!current?.valid || !current.subject) return;
  const staged = await authenticodeIdentity(stagedExe);
  if (!staged?.valid || !staged.subject || staged.subject !== current.subject) {
    throw new Error("Launcher update Authenticode verification failed.");
  }
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

async function withGameUpdateCheckSlot(task) {
  const previous = gameUpdateCheckQueue.catch(() => {});
  let release;
  gameUpdateCheckQueue = new Promise((resolve) => { release = resolve; });
  await previous;
  try {
    const waitMs = Math.max(0, gameUpdateCheckNextAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    gameUpdateCheckNextAt = Date.now() + GAME_UPDATE_AUTH_INTERVAL_MS;
    return await task();
  } finally {
    release();
  }
}

async function checkGameUpdate(request) {
  const {
    id,
    slug: requestSlug,
    currentVersion,
    filename,
    path: installedPath,
  } = request || {};
  if (!UUID_PATTERN.test(String(id || ""))) return { available: false, reason: "GAME_INVALID" };
  const localVersion = normalizeVersion(currentVersion) || versionFromFilename(filename) || versionFromFilename(installedPath);
  try {
    const metadata = await trustedGameMetadata(
      id,
      requestSlug,
    );
    if (!metadata) return { available: false, id, localVersion: localVersion || null, reason: "GAME_METADATA_UNAVAILABLE" };
    const slug = String(metadata.slug || id);
    let authorization;
    if (metadata.commerceEnabled) {
      authorization = await withGameUpdateCheckSlot(() => downloadAuthorization(id));
    } else {
      const url = metadata.downloadUrl;
      if (!isHttps(url)) return { available: false, id, slug, localVersion: localVersion || null, reason: "UPDATE_CHECK_UNAVAILABLE" };
      const parsed = new URL(url);
      const remoteFilename = decodeURIComponent(path.basename(parsed.pathname || ""));
      authorization = { version: versionFromFilename(remoteFilename), filename: remoteFilename };
    }
    const latestVersion = String(authorization.version || versionFromFilename(authorization.filename || "") || "").trim() || null;
    return {
      available: Boolean(latestVersion && localVersion && compareVersions(latestVersion, localVersion) > 0),
      id,
      slug: typeof slug === "string" ? slug.slice(0, 160) : null,
      localVersion: localVersion || null,
      latestVersion: latestVersion || null,
      fileName: authorization.filename || null,
    };
  } catch {
    return {
      available: false,
      id,
      slug: typeof requestSlug === "string" ? requestSlug.slice(0, 160) : null,
      localVersion: localVersion || null,
      reason: "UPDATE_CHECK_UNAVAILABLE",
    };
  }
}


function checkGameUpdateDeduped(request) {
  const id = String(request?.id || "");
  const key = `${id}:${String(request?.currentVersion || "")}:${String(request?.filename || "")}:${String(request?.path || "")}`;
  if (gameUpdateChecksInFlight.has(key)) return gameUpdateChecksInFlight.get(key);
  const promise = checkGameUpdate(request).finally(() => {
    if (gameUpdateChecksInFlight.get(key) === promise) gameUpdateChecksInFlight.delete(key);
  });
  gameUpdateChecksInFlight.set(key, promise);
  return promise;
}

function runningGamesSnapshot() {
  return [...playSessions.entries()].map(([id, session]) => ({
    id,
    startedAt: session.startedAt,
    title: session.title || null,
    coverImage: session.coverImage || null,
    cloudSavesEnabled: Boolean(session.cloudSavesEnabled),
  }));
}

function closeAuxiliaryWindows() {
  for (const win of [overlayWindow, achievementWindow]) {
    if (win && !win.isDestroyed()) {
      try { win.close(); } catch {}
    }
  }
}

function getOverlayDisplay() {
  const point = screen.getCursorScreenPoint();
  return screen.getDisplayNearestPoint(point) || screen.getPrimaryDisplay();
}

function placeOverlayOnDisplay(win, display = getOverlayDisplay()) {
  if (!win || win.isDestroyed() || !display?.bounds) return;
  const { x, y, width, height } = display.bounds;
  win.setBounds({ x, y, width, height }, false);
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;
  const display = getOverlayDisplay();
  overlayWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    transparent: true,
    frame: false,
    focusable: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'game-view-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.on('show', () => {
    placeOverlayOnDisplay(overlayWindow);

    try {
      overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    } catch {}
  });
  overlayWindow.on('closed', () => {
    overlayShowPending = false;
    cancelOverlayHide();
    overlayWindow = null;
  });
  overlayWindow.loadURL(app.isPackaged ? packagedRendererUrl("overlay") : "http://127.0.0.1:5173/game-view.html");
  return overlayWindow;
}

const OVERLAY_FADE_MS = 180;

function hasRunningGame() {
  return playSessions.size > 0;
}

function hasVisibleRunningGame() {
  for (const gameId of playSessions.keys()) {
    if (!minimizedGameIds.has(String(gameId))) return true;
  }
  return false;
}

function canOpenGameView() {
  return Boolean(gameViewSettings.enabled && hasVisibleRunningGame());
}

function cancelOverlayHide() {
  if (!overlayHideTimer) return;
  clearTimeout(overlayHideTimer);
  overlayHideTimer = null;
}

function hideGameOverlay({ close = false, immediate = false } = {}) {
  overlayShowPending = false;
  cancelOverlayHide();
  const win = overlayWindow;
  if (!win || win.isDestroyed()) return false;

  const complete = () => {
    if (!win || win.isDestroyed()) return;
    try { win.setIgnoreMouseEvents(true, { forward: true }); } catch {}
    try { close ? win.close() : win.hide(); } catch {}
  };

  try { win.webContents.send("deadsmile:overlay-hiding", { durationMs: OVERLAY_FADE_MS }); } catch {}
  try { win.setIgnoreMouseEvents(true, { forward: true }); } catch {}

  if (immediate || !win.isVisible()) {
    complete();
    return true;
  }

  overlayHideTimer = setTimeout(() => {
    overlayHideTimer = null;
    complete();
  }, OVERLAY_FADE_MS);
  overlayHideTimer.unref?.();
  return true;
}

function stopGameWindowWatcher(gameId) {
  const key = String(gameId);
  const watcher = gameWindowWatchers.get(key);
  gameWindowWatchers.delete(key);
  minimizedGameIds.delete(key);
  if (!watcher || watcher.killed) return;
  try { watcher.kill(); } catch {}
}

function startGameWindowWatcher(gameId, pid) {
  if (process.platform !== "win32" || !Number.isSafeInteger(Number(pid)) || Number(pid) <= 0) return;
  const key = String(gameId);
  stopGameWindowWatcher(key);
  const script = String.raw`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class DeadsmileNativeWindow {
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
'@
$targetPid = [int]$env:DS_GAME_PID
$lastState = ''
while ($true) {
  try { $process = Get-Process -Id $targetPid -ErrorAction Stop } catch { break }
  $handle = $process.MainWindowHandle
  if ($handle -ne [IntPtr]::Zero) {
    $state = if ([DeadsmileNativeWindow]::IsIconic($handle)) { 'minimized' } else { 'restored' }
    if ($state -ne $lastState) {
      [Console]::WriteLine($state)
      [Console]::Out.Flush()
      $lastState = $state
    }
  }
  Start-Sleep -Milliseconds 250
}
`;
  const watcher = spawn("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, DS_GAME_PID: String(Math.trunc(Number(pid))) },
  });
  gameWindowWatchers.set(key, watcher);
  watcher.unref?.();
  watcher.stdout?.unref?.();
  watcher.stdout?.setEncoding("utf8");
  let output = "";
  watcher.stdout?.on("data", (chunk) => {
    output += chunk;
    const lines = output.split(/\r?\n/);
    output = lines.pop() || "";
    for (const line of lines) {
      const state = line.trim().toLowerCase();
      if (state === "minimized") {
        minimizedGameIds.add(key);
        if (!hasVisibleRunningGame() && (overlayShowPending || (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()))) {
          hideGameOverlay({ close: true });
        }
      } else if (state === "restored") {
        minimizedGameIds.delete(key);
      }
    }
  });
  const release = () => {
    if (gameWindowWatchers.get(key) === watcher) gameWindowWatchers.delete(key);
    minimizedGameIds.delete(key);
  };
  watcher.once("close", release);
  watcher.once("error", release);
}

function showGameOverlay() {

  if (!canOpenGameView()) {
    overlayShowPending = false;

    if (
      overlayWindow &&
      !overlayWindow.isDestroyed()
    ) {
      hideGameOverlay({ immediate: true });
    }

    return false;
  }

  const win = createOverlayWindow();
  cancelOverlayHide();

  overlayShowPending = true;

  const reveal = () => {


    if (!canOpenGameView()) {
      overlayShowPending = false;

      if (!win.isDestroyed()) {
        hideGameOverlay({ immediate: true });
      }

      return;
    }

    if (
      !overlayShowPending ||
      !win ||
      win.isDestroyed()
    ) {
      return;
    }

    overlayShowPending = false;

    placeOverlayOnDisplay(win);

    try {
      win.setAlwaysOnTop(
        true,
        "screen-saver",
        1
      );

      win.setVisibleOnAllWorkspaces(
        true,
        {
          visibleOnFullScreen: true,
        }
      );


      win.setFocusable(false);



      win.setIgnoreMouseEvents(
        true,
        { forward: true }
      );



      win.showInactive();




      try {
        win.webContents.send("deadsmile:overlay-shown", true);
      } catch {}
    } catch (error) {
      console.warn(
        "[Game View]",
        error?.message || error
      );
    }
  };

  if (win.webContents.isLoadingMainFrame()) {
    win.webContents.once(
      "did-finish-load",
      reveal
    );
  } else {
    reveal();
  }

  return true;
}

function toggleGameOverlay() {
  if (!canOpenGameView()) {
    hideGameOverlay();
    return;
  }

  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    hideGameOverlay();
    return;
  }

  showGameOverlay();
}

async function takeGameScreenshot(options = {}) {
  const restoreOverlay = options.restoreOverlay !== false;
  const copyToClipboard = options.copyToClipboard === true;
  const display = overlayWindow && !overlayWindow.isDestroyed()
    ? screen.getDisplayMatching(overlayWindow.getBounds())
    : getOverlayDisplay();
  const wasVisible = Boolean(
    overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible(),
  );
  if (wasVisible) overlayWindow.hide();

  try {

    await new Promise((resolve) => setTimeout(resolve, 180));
    const scale = Number(display?.scaleFactor || 1);
    const width = Math.max(1, Math.round((display?.bounds?.width || 1920) * scale));
    const height = Math.max(1, Math.round((display?.bounds?.height || 1080) * scale));
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height },
      fetchWindowIcons: false,
    });
    const source =
      sources.find((item) => String(item.display_id) === String(display?.id)) ||
      sources[0];
    if (!source || source.thumbnail.isEmpty()) {
      throw new Error("Unable to capture the display.");
    }

    await fsp.mkdir(SCREENSHOTS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const runningId = [...playSessions.keys()][0];
    const suffix = runningId
      ? `-${String(runningId).replace(/[^a-z0-9_-]/gi, "")}`
      : "";
    const filePath = path.join(
      SCREENSHOTS_DIR,
      `Deadsmile-${stamp}${suffix}.png`,
    );

    const png = source.thumbnail.toPNG();
    await fsp.writeFile(filePath, png);
    if (copyToClipboard) {
      await clipboard.write([
        new ClipboardItem({
          "image/png": new Blob([png], { type: "image/png" }),
        }),
      ]);
    }

    return { ok: true, path: filePath, folder: SCREENSHOTS_DIR };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Unable to take screenshot.",
    };
  } finally {
    if (
      restoreOverlay &&
      wasVisible &&
      canOpenGameView() &&
      overlayWindow &&
      !overlayWindow.isDestroyed()
    ) {
      showGameOverlay();
    }
  }
}

async function shareGameOnX(payload = {}) {
  if (!canOpenGameView()) {
    return { ok: false, error: "GAME_NOT_RUNNING" };
  }

  const text = String(payload?.text || "").trim();
  if (!text) return { ok: false, error: "EMPTY_SHARE_TEXT" };

  const screenshot = await takeGameScreenshot({
    restoreOverlay: false,
    copyToClipboard: true,
  });

  if (!screenshot?.ok) {
    if (canOpenGameView()) showGameOverlay();
    return screenshot;
  }

  try {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text.slice(0, 280),
    )}`;
    await openExternalSafely(url);
    return {
      ok: true,
      path: screenshot.path,
      folder: screenshot.folder,
      imageCopied: true,
    };
  } catch (error) {
    if (canOpenGameView()) showGameOverlay();
    return {
      ok: false,
      error: error?.message || "Unable to open X.",
    };
  }
}

function createAchievementWindow() {
  if (achievementWindow && !achievementWindow.isDestroyed()) return achievementWindow;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width = 420, height = 126, margin = 28;
  achievementWindow = new BrowserWindow({
    x: display.workArea.x + display.workArea.width - width - margin,
    y: display.workArea.y + display.workArea.height - height - margin,
    width, height, transparent: true, frame: false, resizable: false, fullscreenable: false,
    skipTaskbar: true, alwaysOnTop: true, show: false, focusable: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'achievement-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  achievementWindow.setAlwaysOnTop(true, 'screen-saver');
  achievementWindow.setIgnoreMouseEvents(true);
  achievementWindow.loadURL(app.isPackaged ? packagedRendererUrl("toast") : "http://127.0.0.1:5173/achievement-toast.html");
  achievementWindow.on('closed', () => { achievementWindow = null; });
  return achievementWindow;
}

function showAchievementToast(payload) {
  const win = createAchievementWindow();
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const bounds = win.getBounds();
  const margin = 28;
  win.setPosition(
    display.workArea.x + display.workArea.width - bounds.width - margin,
    display.workArea.y + display.workArea.height - bounds.height - margin,
  );
  const deliver = () => {
    if (!win.isDestroyed()) {
      send(win.webContents, 'deadsmile:achievement-unlocked', payload);
      win.showInactive();
      clearTimeout(achievementHideTimer);
      achievementHideTimer = setTimeout(() => {
        if (achievementWindow && !achievementWindow.isDestroyed()) achievementWindow.hide();
      }, 5600);
    }
  };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', deliver); else deliver();
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
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
      devTools: !app.isPackaged,
    },
  });
  mainWindow = win;
  win.on("close", (event) => {
    if (updateInProgress && !forceQuit) event.preventDefault();
  });
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
    if (!playSessions.size) closeAuxiliaryWindows();
  });
  win.once("ready-to-show", () => {
    if (playSessions.size) win.showInactive();
    else {
      win.show();
      win.focus();
    }
    confirmUpdatedStartup();
  });
  win.on("focus", () => send(win.webContents, "deadsmile:app-focus", true));
  win.webContents.on("did-finish-load", () => {
    if (mainWindow === win && pendingLaunchGameId) {
      const gameId = pendingLaunchGameId;
      pendingLaunchGameId = null;
      send(win.webContents, "deadsmile:launch-game", gameId);
    }
  });
  if (!app.isPackaged) win.loadURL("http://127.0.0.1:5173");
  else win.loadURL(packagedRendererUrl("main"));
  return win;
}

function rendererKindForContents(contents) {
  if (!contents || contents.isDestroyed()) return null;
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents === contents) return "main";
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents === contents) return "overlay";
  if (achievementWindow && !achievementWindow.isDestroyed() && achievementWindow.webContents === contents) return "toast";
  return null;
}

function rendererKindForEvent(event) {
  if (!event?.sender || event.sender.isDestroyed()) return null;
  if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) return null;
  return rendererKindForContents(event.sender);
}

const IPC_RENDERER_ACCESS = new Map([
  ["deadsmile:api", new Set(["main", "overlay"])],
  ["deadsmile:overlay-bootstrap", new Set(["overlay", "toast"])],
  ["deadsmile:overlay-close", new Set(["overlay"])],
  ["deadsmile:overlay-screenshot", new Set(["overlay"])],
  ["deadsmile:overlay-share-x", new Set(["overlay"])],
  ["deadsmile:overlay-screenshot-folder", new Set(["overlay"])],
  ["deadsmile:overlay-interactive", new Set(["overlay"])],
]);

function secureIpcHandle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    const kind = rendererKindForEvent(event);
    const allowed = IPC_RENDERER_ACCESS.get(channel) || new Set(["main"]);
    if (!kind || !allowed.has(kind)) throw new Error("IPC_FORBIDDEN");
    return handler(event, ...args);
  });
}

function rendererDocumentPathname(kind) {
  if (kind === "main") return "/index.html";
  if (kind === "overlay") return "/game-view.html";
  if (kind === "toast") return "/achievement-toast.html";
  return null;
}

function packagedRendererUrl(kind) {
  const pathname = rendererDocumentPathname(kind);
  return pathname ? `${APP_SCHEME}://${APP_HOST}${pathname}` : null;
}

function isAllowedRendererNavigation(contents, value) {
  const kind = rendererKindForContents(contents);
  if (!kind) return false;
  try {
    const url = new URL(value);
    if (!app.isPackaged) {
      if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.port !== "5173" || url.search || url.hash) return false;
      if (kind === "main") return url.pathname === "/" || url.pathname === "/index.html";
      return url.pathname === rendererDocumentPathname(kind);
    }
    return (
      url.protocol === `${APP_SCHEME}:` &&
      url.hostname === APP_HOST &&
      url.pathname === rendererDocumentPathname(kind) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function handlePackagedAssetRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.protocol !== `${APP_SCHEME}:` || url.hostname !== APP_HOST || url.search || url.hash || url.pathname.length > 2048) {
      return new Response("Not found", { status: 404 });
    }
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes("\\") || decoded.includes("\0")) return new Response("Forbidden", { status: 403 });
    const segments = decoded.split("/").filter(Boolean);
    for (const segment of segments) {
      const stem = path.parse(segment).name.toUpperCase();
      if (segment === "." || segment === ".." || segment.includes(":") || /[. ]$/.test(segment) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(stem)) {
        return new Response("Forbidden", { status: 403 });
      }
    }
    const relative = segments.join(path.sep) || "index.html";
    const root = path.resolve(path.join(__dirname, "..", "dist"));
    const target = path.resolve(root, relative);
    if (!isPathInside(root, target)) return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(target).toString());
  } catch {
    return new Response("Bad request", { status: 400 });
  }
}

function sanitizeRendererApiRequest(request, kind) {
  const reqPath = canonicalRendererApiPath(request?.path);
  const method = String(request?.method || "GET").toUpperCase();
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) return null;
  const allowlist = kind === "overlay" ? GAME_VIEW_API_ALLOWED_REQUESTS : API_ALLOWED_REQUESTS;
  if (!reqPath || !allowlist.some(([allowedMethod, re]) => allowedMethod === method && re.test(reqPath))) return null;
  const headers = {};
  const csrf = request?.headers?.["X-CSRF-Token"] || request?.headers?.["x-csrf-token"];
  if (typeof csrf === "string" && csrf.length <= 512) headers["X-CSRF-Token"] = csrf;
  let body = request?.body;
  if (body !== undefined) {
    let serialized;
    try { serialized = JSON.stringify(body); } catch { return null; }
    if (Buffer.byteLength(serialized, "utf8") > MAX_RENDERER_API_BODY_BYTES) return null;
  }
  return { path: reqPath, method, body, headers };
}

app.whenReady().then(() => {
  if (app.isPackaged) protocol.handle(APP_SCHEME, handlePackagedAssetRequest);
  const gameViewRegistration = registerGameViewShortcut(gameViewSettings);
  if (!gameViewRegistration.ok) {
    console.warn(
      "[Game View] Could not register shortcut:",
      gameViewRegistration.error,
    );
  }
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
  }
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  if (!app.isPackaged) {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["<all_urls>"] },
    (details, callback) => {
      if (
        details.resourceType !== "webSocket" ||
        !String(details.url || "").startsWith(
          "wss://deadsmile.vercel.app/api/live"
        )
      ) {
        callback({
          requestHeaders: details.requestHeaders
        });
        return;
      }

      const requestHeaders = {
        ...details.requestHeaders
      };

      for (const key of Object.keys(requestHeaders)) {
        if (key.toLowerCase() === "origin") {
          delete requestHeaders[key];
        }
      }

      requestHeaders.Origin = "deadsmile-app://launcher";

      callback({
        requestHeaders
      });
    }
  );
}

  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      openExternalSafely(url).catch(() => {});
      return { action: "deny" };
    });
    const preventUnexpectedNavigation = (event, url) => {
      if (isAllowedRendererNavigation(contents, url)) return;
      event.preventDefault();
      openExternalSafely(url).catch(() => {});
    };
    contents.on("will-navigate", preventUnexpectedNavigation);
    contents.on("will-redirect", preventUnexpectedNavigation);
    if (app.isPackaged) {
      contents.on("devtools-opened", () => contents.closeDevTools());
      contents.on("before-input-event", (event, input) => {
        const key = String(input.key || "").toLowerCase();
        const blocked = input.type === "keyDown" &&
          (key === "f12" ||
            (input.control && input.shift && ["i", "j", "c"].includes(key)) ||
            (input.meta && input.alt && ["i", "j", "c"].includes(key)));
        if (blocked) event.preventDefault();
      });
    }
  });
  secureIpcHandle("deadsmile:api", (event, request) => {
    const kind = rendererKindForEvent(event);
    const normalized = sanitizeRendererApiRequest(request, kind);
    if (!normalized) {
      return {
        ok: false,
        status: 403,
        data: { error: { code: "BLOCKED_REQUEST", message: "This request is not available in the launcher." } },
      };
    }
    return apiRequest(normalized);
  });

secureIpcHandle(
  "deadsmile:gameview-language-set",
  (_event, payload = {}) => {
    const allowedLanguages = new Set(["en", "pt-BR", "es"]);

    const language = allowedLanguages.has(payload.language)
      ? payload.language
      : "en";

    const strings = {};
    if (payload.strings && typeof payload.strings === "object" && !Array.isArray(payload.strings)) {
      for (const [key, value] of Object.entries(payload.strings).slice(0, 500)) {
        if (/^[A-Za-z0-9_.-]{1,80}$/.test(key) && typeof value === "string") {
          strings[key] = value.slice(0, 1000);
        }
      }
    }
    gameViewLanguageState = { language, strings };

    if (
      overlayWindow &&
      !overlayWindow.isDestroyed()
    ) {
      try {
        overlayWindow.webContents.send(
          "deadsmile:gameview-language-changed",
          gameViewLanguageState
        );
      } catch {}
    }

    return true;
  }
);
  secureIpcHandle("deadsmile:gameview-library-set", (_event, ids) => {
    const next = Array.isArray(ids) ? ids.map(String).filter((id) => UUID_PATTERN.test(id)).slice(0, 500) : [];
    gameViewLibraryState = [...new Set(next)];
    return true;
  });
  secureIpcHandle("deadsmile:gameview-settings-get", () => ({
    ok: true,
    settings: publicGameViewSettings(),
  }));
  secureIpcHandle("deadsmile:gameview-settings-set", (_event, patch) =>
    updateGameViewSettings(patch || {}),
  );
  secureIpcHandle("deadsmile:gameview-shortcut-capture-start", () => {
    unregisterGameViewShortcut();
    armGameViewShortcutCaptureRestore();
    return true;
  });
  secureIpcHandle("deadsmile:gameview-shortcut-capture-cancel", () => {
    clearGameViewShortcutCaptureTimer();
    unregisterGameViewShortcut();
    return registerGameViewShortcut(gameViewSettings).ok;
  });

    secureIpcHandle("deadsmile:consume-pending-update", async () => {
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
  secureIpcHandle("deadsmile:storage-paths", () => ({
    root: STORAGE_ROOT,
    settings: SETTINGS_DIR,
    games: GAMES_DIR,
  }));

  secureIpcHandle("deadsmile:normalize-library", (_event, library) => {
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
  secureIpcHandle("deadsmile:app-version", () => APP_VERSION);
  secureIpcHandle("deadsmile:clear-auth-session", () => clearLocalAuthSession());
  secureIpcHandle("deadsmile:update-check", () => checkForUpdate());
  secureIpcHandle("deadsmile:game-update-check", (_event, request) => checkGameUpdateDeduped(request));
  secureIpcHandle("deadsmile:update-start", (event) =>
    updateLauncher(event.sender),
  );
  secureIpcHandle("deadsmile:open-external", async (_event, url) => openExternalSafely(url));
  secureIpcHandle("deadsmile:window", (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (action === "minimize") win.minimize();
    if (action === "close" && !updateInProgress) win.close();
    if (action === "toggleMaximize")
      win.isMaximized() ? win.unmaximize() : win.maximize();
    return win.isMaximized();
  });
  secureIpcHandle("deadsmile:download-game", async (_event, request) => {
      const id = String(request?.id || "");
      if (!UUID_PATTERN.test(id)) throw new Error("DOWNLOAD_NOT_AVAILABLE");
      const metadata = await trustedGameMetadata(
        id,
        request?.slug,
      );
      if (!metadata) throw new Error("GAME_METADATA_UNAVAILABLE");
      const commerceEnabled = Boolean(metadata.commerceEnabled);
      if (!commerceEnabled && !isHttps(metadata.downloadUrl)) throw new Error("DOWNLOAD_NOT_AVAILABLE");
      const mode = request?.mode === "update" ? "update" : "download";
      return downloadQueue.enqueue({
        id,
        slug: String(metadata.slug || id).slice(0, 160),
        title: String(metadata.title || "").slice(0, 200),
        url: commerceEnabled ? null : metadata.downloadUrl,
        commerceEnabled,
        itchGameId: Number.isSafeInteger(Number(metadata.itchGameId)) ? Number(metadata.itchGameId) : null,
        preferredItchChannel: null,
        mode,
        currentVersion: normalizeVersion(request?.currentVersion),
        filename: typeof request?.filename === "string" ? path.basename(request.filename).slice(0, 200) : "",
        path: typeof request?.path === "string" ? request.path : null,
      });
  });
  secureIpcHandle("deadsmile:download-pause", (_event, id) =>
      downloadQueue.pause(id),
  );
  secureIpcHandle("deadsmile:download-resume", (_event, id) =>
      downloadQueue.resume(id),
  );
  secureIpcHandle("deadsmile:download-cancel", (_event, id) =>
      downloadQueue.cancel(id),
  );
  secureIpcHandle("deadsmile:download-reorder", (_event, ids) =>
      downloadQueue.reorder(ids),
  );
  secureIpcHandle("deadsmile:download-set-concurrent", (_event, n) => {
      downloadQueue.setMaxConcurrent(n);
      return downloadQueue.maxConcurrent;
  });
  secureIpcHandle("deadsmile:download-snapshot", () =>
      downloadQueue.snapshot(),
  );
  secureIpcHandle("deadsmile:playtime-get", () => readPlaytime());
  secureIpcHandle("deadsmile:running-games", () => runningGamesSnapshot());
  secureIpcHandle("deadsmile:overlay-bootstrap", async () => ({
    language: gameViewLanguageState.language,
    installedIds: gameViewLibraryState,
    running: runningGamesSnapshot(),
    gameViewSettings: publicGameViewSettings(),
    i18n: gameViewLanguageState,
  }));
  secureIpcHandle("deadsmile:overlay-close", () => {
    hideGameOverlay();
    return true;
  });
  secureIpcHandle("deadsmile:overlay-screenshot", () => takeGameScreenshot());
  secureIpcHandle("deadsmile:overlay-share-x", (_event, payload) =>
    shareGameOnX(payload),
  );
  secureIpcHandle("deadsmile:overlay-screenshot-folder", async () => {
    await fsp.mkdir(SCREENSHOTS_DIR, { recursive: true });
    return shell.openPath(SCREENSHOTS_DIR);
  });
secureIpcHandle(
  "deadsmile:overlay-interactive",
  (_event, interactive) => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      return false;
    }

    try {
      overlayWindow.setFocusable(false);

      overlayWindow.setIgnoreMouseEvents(
        !Boolean(interactive),
        { forward: true }
      );

      return true;
    } catch {
      return false;
    }
  }
);

  secureIpcHandle("deadsmile:playtime-clear", () => {
      writePlaytime({});
      return {};
  });

  secureIpcHandle(
      "deadsmile:play-game",
      async (_event, { id, slug = null, title = null, coverImage = null, exePath, gameVersion = null }) => {
          if (!UUID_PATTERN.test(String(id || "")) || typeof exePath !== "string") return { error: "Invalid game.", code: "GAME_INVALID" };
          const resolvedExe = await resolveExistingPathInsideRoot(GAMES_DIR, exePath);
          if (!resolvedExe || !resolvedExe.toLowerCase().endsWith(".exe")) {
              return { error: "Invalid game executable.", code: "GAME_EXECUTABLE_INVALID" };
          }
          if (playSessions.has(id)) return { error: "Already running.", code: "GAME_ALREADY_RUNNING" };

          const metadata = await trustedGameMetadata(id, slug);
          if (!metadata) {
            return { error: "The launcher could not verify this game with Deadsmile Games.", code: "GAME_METADATA_UNAVAILABLE" };
          }
          if (metadata.slug) {
            const expectedFolder = path.join(GAMES_DIR, sanitizeName(metadata.slug));
            const relativeExecutable = path.relative(path.resolve(expectedFolder), path.resolve(resolvedExe));
            if (!relativeExecutable || relativeExecutable === ".." || relativeExecutable.startsWith(`..${path.sep}`) || path.isAbsolute(relativeExecutable)) {
              return { error: "Game executable does not match this game.", code: "GAME_EXECUTABLE_MISMATCH" };
            }
          }
          const safeTitle = String(metadata.title || title || "").slice(0, 200) || null;
          const safeCoverImage = isHttps(metadata.coverImage || coverImage) ? String(metadata.coverImage || coverImage) : null;
          const safeEngine = metadata.engine === "pico8" ? "pico8" : "native";
          const safeSavePathTemplate = typeof metadata.savePathTemplate === "string" ? metadata.savePathTemplate.slice(0, 500) : null;
          const abbyPicoIntegration = isAbbyPicoIntegration(safeTitle, safeSavePathTemplate);
          const picoIntegrationEnabled = safeEngine === "pico8" || abbyPicoIntegration;
          const effectiveCloudSavesEnabled = Boolean(metadata.cloudSavesEnabled);
          const safeGameVersion = normalizeVersion(gameVersion);

          const localPicoSaveTarget = picoIntegrationEnabled
            ? resolveSavePath(safeSavePathTemplate, safeTitle)
            : null;
          let cloudSave = localPicoSaveTarget
            ? { target: localPicoSaveTarget, revision: null, conflict: false }
            : null;

          if (effectiveCloudSavesEnabled && picoIntegrationEnabled) {
            try {
              const restored = await restoreCloudSave(id, safeSavePathTemplate, safeTitle);
              if (restored?.target) cloudSave = { ...restored, conflict: false };
            } catch (error) {
              console.warn("[Achievements] Cloud-save restore failed; local tracking remains active:", error?.message || error);
            }
          }

          let created;
          try {
            created = await protectedApi("/platform/sessions", "POST", {
              gameId: id,
              launcherVersion: APP_VERSION,
              gameVersion: safeGameVersion,
              platform: process.platform === "darwin" ? "macos" : process.platform === "linux" ? "linux" : "windows",
            });
          } catch (error) {
            achievementLog("session_network_error", { gameId: id, message: error?.message || String(error) });
            return { error: "Deadsmile Games could not verify game access right now.", code: "GAME_ACCESS_UNAVAILABLE" };
          }
          if (!created?.ok || !created?.data?.data?.id) {
            const failure = apiFailureDetails(created);
            achievementLog("session_rejected", { gameId: id, ...failure });
            return {
              error: failure.message || "This game is not available in your library.",
              code: failure.code || "GAME_ACCESS_REQUIRED",
              status: failure.status || 0,
            };
          }
          const platformSession = created.data.data;

          syncPendingAchievementUnlocks(id).catch(() => {});

          const liveAchievementFile = picoIntegrationEnabled
            ? path.join(path.dirname(resolvedExe), "deadsmile_achievements.txt")
            : null;
          if (liveAchievementFile) {
            try {
              fs.writeFileSync(liveAchievementFile, "", "utf8");
              achievementLog("live_channel_ready", { gameId: id, file: liveAchievementFile });
            } catch (error) {
              achievementLog("live_channel_prepare_failed", {
                gameId: id,
                file: liveAchievementFile,
                message: error?.message || String(error),
              });
            }
          }

          let child;
          try {
            child = spawn(resolvedExe, [], {
              detached: true,
              stdio: "ignore",
              windowsHide: false,
              cwd: path.dirname(resolvedExe),
            });
            await new Promise((resolve, reject) => {
              const onSpawn = () => {
                child.off("error", onError);
                resolve();
              };
              const onError = (error) => {
                child.off("spawn", onSpawn);
                reject(error);
              };
              child.once("spawn", onSpawn);
              child.once("error", onError);
            });
            child.unref();
          } catch (error) {
            await endPlatformSessionWithRetry(platformSession.id, 2);
            achievementLog("game_spawn_failed", { gameId: id, message: error?.message || String(error) });
            return { error: "The game could not be started.", code: "GAME_LAUNCH_FAILED" };
          }

          const startedAt = Date.now();
          let achievementTimer = null;
          let achievementEventTimer = null;
          let achievementEventLineCount = 0;
          let achievementEventPromise = null;
          let achievementCheckPromise = null;
          const achievementDefinitions = picoIntegrationEnabled
            ? picoAchievementDefinitions(cloudSave?.target || localPicoSaveTarget, safeTitle)
            : [];
          achievementLog("tracking_started", {
            gameId: id,
            title: safeTitle,
            engine: safeEngine,
            abbyPicoIntegration,
            picoIntegrationEnabled,
            cloudSavesEnabled: effectiveCloudSavesEnabled,
            save: cloudSave?.target || localPicoSaveTarget || null,
            saveExists: Boolean((cloudSave?.target || localPicoSaveTarget) && fs.existsSync(cloudSave?.target || localPicoSaveTarget)),
            achievementKeys: achievementDefinitions.map((item) => item.key),
          });
          const achievementBaseline = new Map();
          const achievementCatalog = new Map();
          const pendingAchievementKeys = new Set();
          const achievementToastShown = new Set();

          const refreshAchievementCatalog = async () => {
            try {
              const response = await apiRequest({ path: `/platform/achievements/${id}` });
              if (!response?.ok) {
                const failure = apiFailureDetails(response);
                achievementLog("catalog_failed", { gameId: id, ...failure });
                return;
              }
              const items = Array.isArray(response?.data?.data) ? response.data.data : [];
              achievementCatalog.clear();
              for (const item of items) {
                if (item?.key) achievementCatalog.set(item.key, item);
              }
              achievementLog("catalog_loaded", {
                gameId: id,
                count: items.length,
                keys: items.map((item) => item?.key).filter(Boolean),
                unlocked: items.filter((item) => item?.unlocked_at || item?.unlockedAt).map((item) => item.key),
              });
            } catch (error) {
              achievementLog("catalog_network_error", {
                gameId: id,
                message: error?.message || String(error),
              });
            }
          };

          const catalogUnlocked = (key) => {
            const item = achievementCatalog.get(key);
            return Boolean(item?.unlocked_at || item?.unlockedAt);
          };

          const emitAchievementToast = (definition, { force = false } = {}) => {
            if (achievementToastShown.has(definition.key) || (!force && catalogUnlocked(definition.key))) return;
            achievementToastShown.add(definition.key);
            const item = achievementCatalog.get(definition.key) || {
              key: definition.key,
              title: definition.title,
              description: definition.description,
              points: definition.points,
              hidden: Boolean(definition.hidden),
              unlocked_at: new Date().toISOString(),
            };
            const payload = {
              gameId: id,
              gameTitle: sessionInfo?.title || safeTitle || null,
              achievement: {
                ...item,
                unlocked_at: item.unlocked_at || item.unlockedAt || new Date().toISOString(),
              },
            };
            showAchievementToast(payload);
            broadcast("deadsmile:achievement-unlocked", payload, achievementWindow);
          };

          const tryServerUnlock = async (definition) => {
            if (catalogUnlocked(definition.key)) {
              removeQueuedAchievementUnlock(id, definition.key);
              return true;
            }

            enqueueAchievementUnlock(id, definition.key);
            const synced = await attemptQueuedAchievementUnlock(id, definition.key);
            if (!synced) return false;

            try {
              await refreshAchievementCatalog();
            } catch {}
            return catalogUnlocked(definition.key) || synced;
          };

          const handleLiveAchievementEvent = async (key) => {
            const definition = achievementDefinitions.find((item) => item.key === key);
            if (!definition) {
              achievementLog("live_event_unknown", { gameId: id, key });
              return;
            }

            const previous = achievementBaseline.has(key)
              ? achievementBaseline.get(key)
              : 0;

            if (previous >= 1 || catalogUnlocked(key)) {
              achievementLog("live_event_already_known", { gameId: id, key, previous });
              return;
            }

            achievementBaseline.set(key, 1);
            pendingAchievementKeys.add(key);
            achievementLog("live_event_unlocked", { gameId: id, key, file: liveAchievementFile });

            emitAchievementToast(definition);

            const unlocked = await tryServerUnlock(definition);
            if (unlocked) pendingAchievementKeys.delete(key);
          };

          const pollLiveAchievementEvents = () => {
            if (!liveAchievementFile || !achievementDefinitions.length) return Promise.resolve();
            if (achievementEventPromise) return achievementEventPromise;

            achievementEventPromise = (async () => {
              let raw;
              try {
                raw = await fsp.readFile(liveAchievementFile, "utf8");
              } catch (error) {
                if (error?.code !== "ENOENT") {
                  achievementLog("live_channel_read_failed", {
                    gameId: id,
                    file: liveAchievementFile,
                    message: error?.message || String(error),
                  });
                }
                return;
              }

              const lines = raw
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

              if (lines.length < achievementEventLineCount) achievementEventLineCount = 0;
              const fresh = lines.slice(achievementEventLineCount);
              achievementEventLineCount = lines.length;

              for (const key of fresh) {
                await handleLiveAchievementEvent(key);
              }
            })().finally(() => {
              achievementEventPromise = null;
            });

            return achievementEventPromise;
          };

          const primeAchievementTracking = async () => {
            if (!cloudSave?.target || !achievementDefinitions.length) return;

            for (const definition of achievementDefinitions) {
              achievementBaseline.set(definition.key, 0);
            }

            await refreshAchievementCatalog();
            const state = await readPicoAchievementState(cloudSave.target, achievementDefinitions);
            achievementLog("local_state_prime", {
              gameId: id,
              save: cloudSave.target,
              saveExists: fs.existsSync(cloudSave.target),
              flags: Object.fromEntries(achievementDefinitions.map((definition) => [definition.key, state.get(definition.key)])),
            });
            for (const definition of achievementDefinitions) {
              const value = state.get(definition.key);
              if (value == null) continue;
              achievementBaseline.set(definition.key, value);

              if (value >= 1 && !catalogUnlocked(definition.key)) {
                pendingAchievementKeys.add(definition.key);
                const unlocked = await tryServerUnlock(definition);
                if (unlocked) {
                  pendingAchievementKeys.delete(definition.key);
                  emitAchievementToast(definition, { force: true });
                }
              }
            }
          };

          const checkGameAchievements = (options = {}) => {
            const forceUnlock = Boolean(options.forceUnlock);
            if (!cloudSave?.target || !achievementDefinitions.length) return Promise.resolve();

            if (achievementCheckPromise) {
              if (forceUnlock) {
                return achievementCheckPromise.then(() =>
                  checkGameAchievements({ forceUnlock: true }),
                );
              }
              return achievementCheckPromise;
            }

            achievementCheckPromise = (async () => {
              const state = await readPicoAchievementState(
                cloudSave.target,
                achievementDefinitions,
              );
              const newlyUnlocked = [];

              for (const definition of achievementDefinitions) {
                const observedValue = state.get(definition.key);
                if (observedValue == null) continue;

                const previous = achievementBaseline.has(definition.key)
                  ? achievementBaseline.get(definition.key)
                  : 0;
                const value = Math.max(previous, observedValue);
                achievementBaseline.set(definition.key, value);

                if (value >= 1 && previous < 1) {
                  achievementLog("local_flag_unlocked", { gameId: id, key: definition.key, save: cloudSave.target });
                  newlyUnlocked.push(definition);
                  pendingAchievementKeys.add(definition.key);
                  emitAchievementToast(definition);
                }
              }

              if (newlyUnlocked.length) {
                try {
                  await uploadCloudSave(id, cloudSave);
                } catch {}
              }

              for (const definition of achievementDefinitions) {
                const value = state.get(definition.key);
                if (value == null || value < 1) continue;
                if (!forceUnlock && !newlyUnlocked.some((item) => item.key === definition.key)) {
                  continue;
                }
                if (catalogUnlocked(definition.key)) {
                  pendingAchievementKeys.delete(definition.key);
                  continue;
                }
                const unlocked = await tryServerUnlock(definition);
                if (unlocked) pendingAchievementKeys.delete(definition.key);
                else pendingAchievementKeys.add(definition.key);
              }
            })().finally(() => {
              achievementCheckPromise = null;
            });

            return achievementCheckPromise;
          };

          const sessionInfo = {
            startedAt,
            child,
            title: safeTitle,
            coverImage: safeCoverImage,
            cloudSavesEnabled: effectiveCloudSavesEnabled,
          };
          const wasFirstRunningGame = playSessions.size === 0;
          playSessions.set(id, sessionInfo);
          startGameWindowWatcher(id, child.pid);
          if (wasFirstRunningGame && gameViewSettings.enabled) {
            const shortcutRegistration = registerGameViewShortcut(gameViewSettings);
            if (!shortcutRegistration.ok) {
              console.warn(
                "[Game View] Could not register shortcut for the active game:",
                shortcutRegistration.error,
              );
            }
          }
          broadcast("deadsmile:game-state", {
            id,
            running: true,
            startedAt,
            title: sessionInfo.title,
            coverImage: sessionInfo.coverImage,
            cloudSavesEnabled: sessionInfo.cloudSavesEnabled,
          });
          if (picoIntegrationEnabled && cloudSave?.target && achievementDefinitions.length) {
            try {
              await primeAchievementTracking();
            } catch (error) {
              achievementLog("tracking_prime_error", {
                gameId: id,
                save: cloudSave?.target || null,
                message: error?.message || String(error),
              });
            }
            achievementTimer = setInterval(() => {
              checkGameAchievements().catch(() => {});
            }, 500);

            achievementEventTimer = setInterval(() => {
              pollLiveAchievementEvents().catch(() => {});
            }, 100);
            pollLiveAchievementEvents().catch(() => {});
          }

          let finished = false;
          const finish = async () => {
              if (finished) return;
              finished = true;
              const session = playSessions.get(id);
              if (!session) return;
              if (achievementTimer) clearInterval(achievementTimer);
              if (achievementEventTimer) clearInterval(achievementEventTimer);
              try { await pollLiveAchievementEvents(); } catch {}
              stopGameWindowWatcher(id);
              playSessions.delete(id);
              broadcast("deadsmile:game-state", { id, running: false, startedAt: session.startedAt });
              if (!playSessions.size) {
                overlayShowPending = false;
                unregisterGameViewShortcut();

                hideGameOverlay({ close: true });
              }
              const durationMs = Date.now() - session.startedAt;
              const data = readPlaytime();
              const prev = data[id] || { totalMs: 0, sessions: 0 };
              data[id] = {
                  totalMs: prev.totalMs + durationMs,
                  lastPlayedAt: Date.now(),
                  sessions: prev.sessions + 1,
              };
              writePlaytime(data);

              if (platformSession?.id) {
                const ended = await endPlatformSessionWithRetry(platformSession.id);
                if (!ended) {
                  console.warn("[Achievements] Could not close platform session after retries.");
                }
              }

              try {
                await checkGameAchievements();
              } catch {}

              if (effectiveCloudSavesEnabled && picoIntegrationEnabled && cloudSave?.target) {
                try {
                  await uploadCloudSave(id, cloudSave);
                } catch (error) {
                  console.warn("[Achievements] Final cloud-save upload failed:", error?.message || error);
                }
              }

              if (picoIntegrationEnabled && cloudSave?.target && achievementDefinitions.length) {
                try {
                  await checkGameAchievements({ forceUnlock: true });
                } catch (error) {
                  console.warn("[Achievements] Final unlock retry failed:", error?.message || error);
                }
              }

              if (!playSessions.size && (!mainWindow || mainWindow.isDestroyed())) {
                closeAuxiliaryWindows();
                app.quit();
              }

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

  secureIpcHandle("deadsmile:delete-game", async (_event, target) => {
    const targetPath = await resolveExistingPathInsideRoot(GAMES_DIR, target);
    if (!targetPath) return "Invalid game path.";
    try {
      await fsp.rm(targetPath, { recursive: true, force: true });
      return "";
    } catch (error) {
      return error?.message || "Unable to delete the local game.";
    }
  });
  createWindow();

  syncPendingAchievementUnlocks().catch(() => {});
  achievementSyncTimer = setInterval(() => {
    syncPendingAchievementUnlocks().catch(() => {});
  }, 30_000);
  achievementSyncTimer.unref?.();

  const initialDeepLink = process.argv.find((arg) => arg.startsWith("deadsmile://"));
  if (initialDeepLink) handleDeepLink(initialDeepLink);
  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !playSessions.size) app.quit();
});
app.on("will-quit", () => {
  try { globalShortcut.unregisterAll(); } catch {}
  for (const gameId of [...gameWindowWatchers.keys()]) stopGameWindowWatcher(gameId);
  if (achievementSyncTimer) {
    clearInterval(achievementSyncTimer);
    achievementSyncTimer = null;
  }
});
app.on("before-quit", () => {
  butlerInstance?.cancel().catch(() => {});
});
