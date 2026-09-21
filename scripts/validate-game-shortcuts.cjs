const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'electron/preload.cjs'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');

const checks = [
  ['Steam-style .url shortcut is implemented', /\[InternetShortcut\]/.test(main) && /URL=\$\{launchUrl\}/.test(main)],
  ['Shortcut uses deadsmile launch protocol', /deadsmile:\/\/launch\?gameId=\$\{encodeURIComponent\(id\)\}/.test(main)],
  ['Shortcut is verified after writing', /GAME_URL_SHORTCUT_VERIFY_FAILED/.test(main)],
  ['Windows development mode is not blocked by app.isPackaged', /async function createGameDesktopShortcut[\s\S]*?if \(process\.platform !== ["']win32["']\)/.test(main) && !/async function createGameDesktopShortcut[\s\S]{0,500}!app\.isPackaged/.test(main)],
  ['Shell Link fallback remains available', /createLegacyGameLinkShortcut/.test(main) && /shell\.writeShortcutLink/.test(main)],
  ['Fresh installs create a game shortcut', /createGameDesktopShortcut\(\{ id, title: job\.title \|\| slug \|\| id, installedExe \}\)/.test(main)],
  ['Game updates also ensure a shortcut exists', /installedExe: swapped\.path/.test(main)],
  ['Uninstall removes both .url and .lnk shortcuts', /endsWith\(["']\.url["']\)/.test(main) && /endsWith\(["']\.lnk["']\)/.test(main)],
  ['Renderer can request shortcut repair for existing installs', /ensureGameShortcut/.test(preload) && /deadsmile:ensure-game-shortcut/.test(main) && /ensureGameShortcut/.test(app)],
  ['Shortcut repair validates installed executable inside managed Games directory', /resolveExistingPathInsideRoot\(GAMES_DIR, requestedExe\)/.test(main)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} game shortcut validation check(s) failed.`);
  process.exit(1);
}
console.log(`\nGame shortcut validation passed (${checks.length} checks).`);
