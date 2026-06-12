const path = require("node:path");

function registerIpcHandlers({
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
  log = () => {}
}) {
  ipcMain.handle("vault:choose", async () => {
    log("vault:choose start");
    const result = await dialog.showOpenDialog(windowManager.activeWindow() || undefined, {
      title: "Open Tektite Vault",
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      log("vault:choose canceled");
      return null;
    }
    log("vault:choose selected", result.filePaths[0]);
    return result.filePaths[0];
  });

  ipcMain.handle("vault:scan", async (event, rootPath) => {
    log("vault:scan start", rootPath);
    fileService.assertInsideVault(rootPath, rootPath);
    const validation = await validateVaultRoot(rootPath, event.sender);
    if (!validation.ok) return validation;

    const { tree, notes } = await fileService.scanVault(rootPath);
    const hasGitRepo = await gitService.hasGitRepository(rootPath);
    const gitProvider = hasGitRepo ? await gitService.gitProviderFor(rootPath) : null;
    await configManager.rememberRecentVault(rootPath);
    buildMenu();
    log("vault:scan complete", { rootPath, notes: notes.length });
    return { ok: true, rootPath, tree, notes, hasGitRepo, gitProvider };
  });

  ipcMain.handle("preview:print", (event, payload = {}) => printPreview({
    BrowserWindow,
    event,
    payload,
    printPreviewDocument,
    printWebContents,
    windowManager
  }));

  ipcMain.handle("workspace:load", async (_event, rootPath = "") => {
    const store = await configManager.loadWorkspaceStore();
    const normalizedRoot = typeof rootPath === "string" && rootPath ? path.resolve(rootPath) : "";
    return {
      lastVault: store.lastVault || configManager.getRecentVaults()[0] || null,
      workspace: normalizedRoot ? store.workspaces[normalizedRoot] || null : null
    };
  });

  ipcMain.handle("workspace:save", async (event, rootPath, workspace) => {
    if (typeof rootPath !== "string" || !rootPath) return false;
    const normalizedRoot = path.resolve(rootPath);
    windowManager.setWindowVault(event.sender, normalizedRoot);
    const store = await configManager.loadWorkspaceStore();
    store.lastVault = normalizedRoot;
    store.workspaces[normalizedRoot] = workspace && typeof workspace === "object" ? workspace : {};
    if (!configManager.isQuitting) store.sessions = windowManager.openSessions();
    await configManager.saveWorkspaceStore(store);
    return true;
  });

  ipcMain.handle("window:pane-state", (event, paneState) => {
    windowManager.setPaneState(event.sender, paneState);
  });
  ipcMain.handle("window:register", () => true);
  ipcMain.handle("window:set-vault-name", (event, vaultName) => windowManager.setVaultName(event.sender, vaultName));

  ipcMain.handle("git:sync", async (event, rootPath) => {
    log("git:sync", rootPath);
    const send = (payload) => event.sender.send("git:sync-output", payload);
    return gitService.sync(rootPath, send);
  });

  ipcMain.handle("note:read", (_event, rootPath, relativePath) => {
    log("note:read", relativePath);
    return fileService.readNote(rootPath, relativePath);
  });
  ipcMain.handle("notes:modified-times", (_event, rootPath, relativePaths = []) => (
    fileService.noteModifiedTimes(rootPath, relativePaths)
  ));
  ipcMain.handle("note:write", (_event, rootPath, relativePath, content) => {
    log("note:write", relativePath, `${content.length} chars`);
    return fileService.writeNote(rootPath, relativePath, content);
  });
  ipcMain.handle("note:create", (_event, rootPath, requestedName, folder = "", templatePath = "") => {
    log("note:create", { requestedName, folder, templatePath });
    return fileService.createNote(rootPath, requestedName, folder, templatePath);
  });
  ipcMain.handle("templates:list", (_event, rootPath, templatesPath = "") => {
    log("templates:list", rootPath, templatesPath);
    return fileService.listTemplates(rootPath, templatesPath);
  });
  ipcMain.handle("settings:load", (_event, rootPath) => {
    log("settings:load", rootPath);
    return fileService.loadSettings(rootPath);
  });
  ipcMain.handle("settings:save", (_event, rootPath, settings) => {
    log("settings:save", rootPath, settings);
    return fileService.saveSettings(rootPath, settings);
  });
  ipcMain.handle("folder:create", (_event, rootPath, requestedName, parentFolder = "") => {
    log("folder:create", { requestedName, parentFolder });
    return fileService.createFolder(rootPath, requestedName, parentFolder);
  });
  ipcMain.handle("entry:delete", (_event, rootPath, relativePath, type) => {
    log("entry:delete", { relativePath, type });
    return fileService.deleteEntry(rootPath, relativePath, type);
  });
  ipcMain.handle("entry:rename", (_event, rootPath, relativePath, type, requestedName) => {
    log("entry:rename", { relativePath, type, requestedName });
    return fileService.renameEntry(rootPath, relativePath, type, requestedName);
  });
  ipcMain.handle("entry:move", (_event, rootPath, relativePath, type, targetFolder = "") => {
    log("entry:move", { relativePath, type, targetFolder });
    return fileService.moveEntry(rootPath, relativePath, type, targetFolder);
  });
  ipcMain.handle("asset:import-image", (_event, rootPath, sourcePath, targetFolder = "") => {
    log("asset:import-image", { sourcePath, targetFolder });
    return fileService.importImage(rootPath, sourcePath, targetFolder);
  });
  ipcMain.handle("asset:import-file-or-directory", (_event, rootPath, sourcePath, targetFolder = "") => {
    log("asset:import-file-or-directory", { sourcePath, targetFolder });
    return fileService.importFileOrDirectory(rootPath, sourcePath, targetFolder);
  });
  ipcMain.handle("asset:save-clipboard-image", (_event, rootPath, targetFolder = "", image = {}) => {
    log("asset:save-clipboard-image", { targetFolder, name: image.name, mimeType: image.mimeType });
    return fileService.saveClipboardImage(rootPath, targetFolder, image);
  });
  ipcMain.handle("asset:read-data-url", (_event, rootPath, relativePath) => {
    log("asset:read-data-url", relativePath);
    return fileService.readAssetDataUrl(rootPath, relativePath);
  });

  ipcMain.handle("terminal:create", (event, cwd, cols, rows) => terminalService.create(event.sender, cwd, cols, rows));
  ipcMain.handle("terminal:write", (_event, pid, data) => terminalService.write(pid, data));
  ipcMain.handle("terminal:resize", (_event, pid, cols, rows) => terminalService.resize(pid, cols, rows));
  ipcMain.handle("terminal:destroy", (_event, pid) => terminalService.destroy(pid));
}

async function printPreview({ BrowserWindow, event, payload, printPreviewDocument, printWebContents, windowManager }) {
  const parent = BrowserWindow.fromWebContents(event.sender) || windowManager.activeWindow() || undefined;
  const printWindow = new BrowserWindow({
    width: 900,
    height: 1100,
    show: false,
    parent,
    title: "Print Preview",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const html = printPreviewDocument(payload);
  try {
    await new Promise((resolve, reject) => {
      printWindow.webContents.once("did-finish-load", resolve);
      printWindow.webContents.once("did-fail-load", (_event, _errorCode, errorDescription) => {
        reject(new Error(errorDescription || "Could not prepare print preview."));
      });
      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    });
    return printWebContents(printWindow);
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close();
  }
}

module.exports = { registerIpcHandlers };
