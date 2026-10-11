const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const product = fs.readFileSync(path.join(root, 'src/product-ui.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8')
  .replace(/^@import\s+["']\.\/product-ui\.css["'];\s*/m, '');
fs.writeFileSync(path.join(root, 'public/launcher-ui.css'), `${product}\n${ui}`);
