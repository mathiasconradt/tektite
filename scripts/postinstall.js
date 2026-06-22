const { spawnSync } = require("node:child_process");
const path = require("node:path");

require("./copy-vendor");

if (process.platform !== "linux") process.exit(0);

const root = path.join(__dirname, "..");
const electronRebuild = path.join(root, "node_modules", ".bin", "electron-rebuild");

console.log("Rebuilding native Electron modules for Linux...");
const result = spawnSync(electronRebuild, ["-f", "-w", "node-pty"], {
  cwd: root,
  stdio: "inherit"
});

if (result.error) {
  console.warn(`Could not rebuild native modules automatically: ${result.error.message}`);
  console.warn("Run `npm run rebuild:native` before `npm run dev` if the terminal module fails to load.");
  process.exit(0);
}

if (result.status !== 0) {
  console.warn("Could not rebuild native modules automatically.");
  console.warn("Run `npm run rebuild:native` before `npm run dev` if the terminal module fails to load.");
}
