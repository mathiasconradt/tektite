const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } = require("electron");
const fsSync = require("node:fs");
const path = require("node:path");

const { ConfigManager } = require("./main/configManager");
const { registerIpcHandlers } = require("./main/ipc");
const { buildApplicationMenu } = require("./main/menu");
const { WindowManager, splashMinimumMs } = require("./main/windowManager");
const fileService = require("./main/services/fileService");
const gitService = require("./main/services/gitService");
const { printPreviewDocument, printWebContents } = require("./main/services/printService");
const { TerminalService } = require("./main/services/terminalService");

app.name = "Tektite";
app.setName("Tektite");

function log() { /* verbose logging disabled */ }

const configManager = new ConfigManager({ app, log });
const windowManager = new WindowManager({
  app,
  BrowserWindow,
  nativeImage,
  onWindowsChanged: buildMenu,
  onSessionsChanged: (sessions) => configManager.saveOpenSessions(sessions)
});
const terminalService = new TerminalService({ app });

function buildMenu() {
  buildApplicationMenu({
    Menu,
    shell,
    recentVaults: configManager.getRecentVaults(),
    getPaneState: () => windowManager.getPaneState(),
    getWindows: () => windowManager.getWindows(),
    getActiveWindow: () => windowManager.activeWindow(),
    windowMenuLabel: (window) => windowManager.windowMenuLabel(window),
    focusWindow: (window) => windowManager.focusWindow(window),
    toggleMaximize: (window) => windowManager.toggleMaximize(window),
    createWindow: (options) => windowManager.createWindow(options),
    showAboutWindow: () => windowManager.showAboutWindow(),
    openRecentVault: openRecentVaultFromMenu,
    sendToActiveWindow: (channel, ...args) => windowManager.sendToActiveWindow(channel, ...args),
    sendToWindowOrCreate: (channel, ...args) => windowManager.sendToWindowOrCreate(channel, ...args)
  });
}

async function openRecentVaultFromMenu(vaultPath) {
  const validation = await validateVaultRoot(vaultPath);
  if (!validation.ok) return;
  windowManager.sendToWindowOrCreate("menu:open-recent-vault", vaultPath);
}

async function validateVaultRoot(rootPath, sender) {
  const validation = await fileService.validateVaultRoot(rootPath);
  if (validation.ok) return validation;
  if (validation.code === "VAULT_NOT_FOUND") return showVaultUnavailableDialog(sender, rootPath);
  return validation;
}

async function showVaultUnavailableDialog(sender, rootPath) {
  const owner = sender ? BrowserWindow.fromWebContents(sender) : windowManager.activeWindow();
  const message = "The vault folder doesn't exist anymore.";
  await dialog.showMessageBox(owner || undefined, {
    type: "warning",
    title: "Vault Folder Not Found",
    message,
    detail: `Tektite tried to open:\n${rootPath}`,
    buttons: ["OK"],
    defaultId: 0,
    noLink: true
  });

  return { ok: false, code: "VAULT_NOT_FOUND", message, path: rootPath };
}

function vaultArgFromArgv(argv) {
  for (const arg of argv.slice(1)) {
    if (arg.startsWith("-")) continue;
    const resolved = path.resolve(arg);
    try {
      if (fsSync.statSync(resolved).isDirectory()) return resolved;
    } catch {
      return { path: resolved, invalid: true };
    }
  }
  return null;
}

async function handleVaultArg(vaultPath) {
  if (!vaultPath || typeof vaultPath !== "string") return;
  if (windowManager.focusVaultWindow(vaultPath)) return;
  windowManager.createWindow({ vaultPath });
}

async function restoreSessions() {
  const store = await configManager.loadWorkspaceStore();
  const sessions = Array.isArray(store.sessions) && store.sessions.length > 0
    ? store.sessions.filter((value) => value === null || (typeof value === "string" && value))
    : null;
  const restoredVaults = new Set();

  if (sessions) {
    for (const vaultPath of sessions) {
      if (vaultPath) {
        restoredVaults.add(path.resolve(vaultPath));
        windowManager.createWindow({ show: false, vaultPath });
      } else {
        windowManager.createWindow({ show: false, restoreLastVault: false });
      }
    }
  } else {
    windowManager.createWindow({ show: false });
  }
  return restoredVaults;
}

function handleArgVaultAfterRestore(normalizedArgVault, invalidArgVault, restoredVaults) {
  if (invalidArgVault) {
    setTimeout(() => showVaultUnavailableDialog(null, invalidArgVault), splashMinimumMs + 200);
    return;
  }
  if (!normalizedArgVault) return;
  if (restoredVaults.has(normalizedArgVault)) {
    setTimeout(() => windowManager.focusVaultWindow(normalizedArgVault), splashMinimumMs + 200);
  } else {
    windowManager.createWindow({ show: false, vaultPath: normalizedArgVault, focusOnShow: true });
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (gotSingleInstanceLock) {
  app.on("second-instance", (_event, argv) => {
    const result = vaultArgFromArgv(argv);
    if (result?.invalid) {
      showVaultUnavailableDialog(null, result.path);
    } else if (result) {
      handleVaultArg(result);
    } else {
      const win = windowManager.activeWindow();
      if (win) windowManager.focusWindow(win);
    }
  });
} else {
  app.quit();
}

app.on("before-quit", () => {
  configManager.saveBeforeQuit(windowManager.openSessions());
  windowManager.setQuitting(true);
});

registerIpcHandlers({
  BrowserWindow,
  dialog,
  ipcMain,
  configManager,
  fileService,
  gitService,
  terminalService,
  windowManager,
  printPreviewDocument,
  printWebContents,
  validateVaultRoot,
  buildMenu,
  log
});

app.on("ready", async () => {
  app.setName("Tektite");
  await configManager.loadRecentVaults();
  buildMenu();
  windowManager.createSplashWindow();

  const argVaultResult = vaultArgFromArgv(process.argv);
  const normalizedArgVault = argVaultResult && !argVaultResult.invalid ? argVaultResult : null;
  const invalidArgVault = argVaultResult?.invalid ? argVaultResult.path : null;

  const restoredVaults = await restoreSessions();
  handleArgVaultAfterRestore(normalizedArgVault, invalidArgVault, restoredVaults);

  app.on("activate", () => {
    if (windowManager.getWindows().length === 0) windowManager.createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
