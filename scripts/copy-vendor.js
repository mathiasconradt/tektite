const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const vendorDir = path.join(root, "src", "vendor");

fs.mkdirSync(vendorDir, { recursive: true });

const files = [
  ["node_modules/@xterm/xterm/lib/xterm.js", "src/vendor/xterm.js"],
  ["node_modules/@xterm/xterm/css/xterm.css", "src/vendor/xterm.css"],
  ["node_modules/@xterm/addon-fit/lib/addon-fit.js", "src/vendor/addon-fit.js"],
  ["node_modules/@highlightjs/cdn-assets/highlight.min.js", "src/vendor/highlight.min.js"],
  ["node_modules/@highlightjs/cdn-assets/styles/github-dark.min.css", "src/vendor/highlight-github-dark.min.css"]
];

for (const [src, dest] of files) {
  try {
    fs.copyFileSync(path.join(root, src), path.join(root, dest));
  } catch {}
}

// Ensure node-pty spawn-helper is executable (required outside .asar)
for (const arch of ["darwin-arm64", "darwin-x64"]) {
  const p = path.join(root, "node_modules/node-pty/prebuilds", arch, "spawn-helper");
  try { fs.chmodSync(p, 0o755); } catch {}
}
