const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const main = read('electron/main.cjs');
const preload = read('electron/preload.cjs');
const app = read('src/App.jsx');
const service = read('src/services-api.js');

const checks = [
  ['preload exposes deadsmile:api through invoke', /api:\s*\(request\)\s*=>\s*ipcRenderer\.invoke\(['"]deadsmile:api['"]/.test(preload)],
  ['main process handles deadsmile:api', /secureIpcHandle\(['"]deadsmile:api['"]/.test(main)],
  ['launcher main API URL is production API', /const API_URL\s*=\s*['"]https:\/\/deadsmile\.vercel\.app\/api['"]/.test(main)],
  ['renderer API fallback is production API', /API_FALLBACK\s*=\s*['"]https:\/\/deadsmile\.vercel\.app\/api['"]/.test(service)],
  ['mobile login remains in main-process allowlist', /\[\s*['"]POST['"]\s*,\s*\/\^\\\/auth\\\/mobile-login\$\//.test(main)],
  ['2FA remains in main-process allowlist', /\[\s*['"]POST['"]\s*,\s*\/\^\\\/auth\\\/verify-2fa\$\//.test(main)],
  ['launcher login still calls mobile-login', /api\.post\(['"]\/auth\/mobile-login['"]\s*,\s*\{\s*email\s*,\s*password\s*\}\)/.test(app)],
  ['launcher still restores session with auth/me', /api\.get\(['"]\/auth\/me['"]\)/.test(app)],
  ['launcher still obtains CSRF token before writes', /headers\[['"]X-CSRF-Token['"]\]\s*=\s*await getCsrfToken\(\)/.test(service)],
  ['network errors are normalized instead of leaking ipcRenderer.invoke text', /Unable to reach the Deadsmile Games servers\./.test(service)],
  ['main process normalizes transport failures', /function apiTransportFailure\(/.test(main)],
  ['IPC frame validation compares the underlying frame', /function sameUnderlyingFrame\(/.test(main) && /sameUnderlyingFrame\(senderFrame, mainFrame\)/.test(main)],
  ['fragile WebFrameMain wrapper identity check is gone', !/event\.senderFrame\s*!==\s*event\.sender\.mainFrame/.test(main)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} auth bridge validation check(s) failed.`);
  process.exit(1);
}
console.log(`\nAuth bridge validation passed (${checks.length} checks).`);
