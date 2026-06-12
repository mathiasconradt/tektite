const path = require("node:path");

const appIconPath = path.join(__dirname, "..", "..", "assets", "app", "tektive-icon.webp");
const fallbackAppIconPath = path.join(__dirname, "..", "..", "assets", "icons", "tektite-icon.png");
const splashMinimumMs = 3000;

class WindowManager {
  constructor({ app, BrowserWindow, nativeImage, onWindowsChanged = () => {}, onSessionsChanged = () => {} }) {
    this.app = app;
    this.BrowserWindow = BrowserWindow;
    this.nativeImage = nativeImage;
    this.onWindowsChanged = onWindowsChanged;
    this.onSessionsChanged = onSessionsChanged;
    this.mainWindow = null;
    this.aboutWindow = null;
    this.splashWindow = null;
    this.splashShownAt = 0;
    this.windowPaneStates = new Map();
    this.windowVaults = new Map();
    this.tektiteWindows = new Set();
    this.isQuitting = false;
  }

  createWindow(options = {}) {
    const shouldShowImmediately = options.show !== false;
    const appIcon = this.loadAppIcon();
    const window = new this.BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 980,
      minHeight: 640,
      title: "Tektite",
      icon: appIcon,
      show: shouldShowImmediately,
      backgroundColor: "#f7f4ed",
      webPreferences: {
        preload: path.join(__dirname, "..", "preload.js"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.mainWindow = window;
    this.tektiteWindows.add(window);
    this.onWindowsChanged();

    window.loadFile(path.join(__dirname, "..", "renderer", "index.html"), {
      query: {
        restoreLastVault: (options.vaultPath || options.restoreLastVault === false) ? "0" : "1",
        ...(options.vaultPath ? { vault: options.vaultPath } : {})
      }
    });
    window.once("ready-to-show", () => {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        const elapsed = Date.now() - this.splashShownAt;
        setTimeout(() => {
          if (this.splashWindow && !this.splashWindow.isDestroyed()) this.splashWindow.close();
          this.splashWindow = null;
          if (!window.isDestroyed()) {
            window.show();
            if (options.focusOnShow) window.focus();
          }
        }, Math.max(0, splashMinimumMs - elapsed));
      } else if (!shouldShowImmediately && !window.isDestroyed()) {
        window.show();
        if (options.focusOnShow) window.focus();
      }
    });

    window.on("focus", () => {
      this.mainWindow = window;
      this.onWindowsChanged();
    });

    window.on("closed", () => {
      this.tektiteWindows.delete(window);
      if (this.mainWindow === window) this.mainWindow = [...this.tektiteWindows][0] || null;
      this.onWindowsChanged();
      if (!this.isQuitting) {
        this.windowVaults.delete(window);
        this.onSessionsChanged(this.openSessions());
      }
    });

    if (process.platform === "darwin" && this.app.dock) this.app.dock.setIcon(appIcon);
    return window;
  }

  createSplashWindow() {
    this.splashShownAt = Date.now();
    this.splashWindow = new this.BrowserWindow({
      width: 520,
      height: 520,
      frame: false,
      resizable: false,
      movable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      center: true,
      title: "Tektite",
      icon: this.loadAppIcon(),
      backgroundColor: "#ffffff",
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.splashWindow.loadFile(path.join(__dirname, "..", "splash.html"), {
      query: { version: this.app.getVersion() }
    });
    this.splashWindow.once("ready-to-show", () => {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) this.splashWindow.show();
    });
    this.splashWindow.on("closed", () => {
      this.splashWindow = null;
    });
  }

  showAboutWindow() {
    if (this.aboutWindow && !this.aboutWindow.isDestroyed()) {
      this.aboutWindow.focus();
      return;
    }

    this.aboutWindow = new this.BrowserWindow({
      width: 420,
      height: 520,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: "About Tektite",
      parent: this.activeWindow() || undefined,
      modal: false,
      icon: this.loadAppIcon(),
      backgroundColor: "#111318",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.aboutWindow.setMenuBarVisibility(false);
    this.aboutWindow.loadFile(path.join(__dirname, "..", "about.html"), {
      query: { version: this.app.getVersion() }
    });
    this.aboutWindow.on("closed", () => {
      this.aboutWindow = null;
    });
  }

  activeWindow() {
    const focusedWindow = this.BrowserWindow.getFocusedWindow();
    if (focusedWindow && this.tektiteWindows.has(focusedWindow)) return focusedWindow;
    return this.mainWindow || [...this.tektiteWindows][0] || null;
  }

  sendToActiveWindow(channel, ...args) {
    this.activeWindow()?.webContents.send(channel, ...args);
  }

  sendToWindowOrCreate(channel, ...args) {
    const window = this.activeWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, ...args);
      return;
    }

    const newWindow = this.createWindow({ restoreLastVault: false });
    newWindow.webContents.once("did-finish-load", () => {
      if (!newWindow.isDestroyed()) newWindow.webContents.send(channel, ...args);
    });
  }

  loadAppIcon() {
    const icon = this.nativeImage.createFromPath(appIconPath);
    if (!icon.isEmpty()) return icon;
    return this.nativeImage.createFromPath(fallbackAppIconPath);
  }

  getWindows() {
    return [...this.tektiteWindows].filter((window) => !window.isDestroyed());
  }

  getPaneState(window = this.activeWindow()) {
    return this.windowPaneStates.get(window);
  }

  setPaneState(sender, paneState) {
    const win = this.BrowserWindow.fromWebContents(sender);
    if (win) {
      this.windowPaneStates.set(win, paneState);
      this.onWindowsChanged();
    }
  }

  setWindowVault(sender, rootPath) {
    const win = this.BrowserWindow.fromWebContents(sender);
    if (win && this.tektiteWindows.has(win)) this.windowVaults.set(win, rootPath);
  }

  setVaultName(sender, vaultName) {
    const window = this.BrowserWindow.fromWebContents(sender);
    if (!window || !this.tektiteWindows.has(window)) return false;

    const label = typeof vaultName === "string" && vaultName.trim() ? vaultName.trim() : "";
    window.vaultName = label;
    window.setTitle(label ? `Tektite - ${label}` : "Tektite");
    this.onWindowsChanged();
    return true;
  }

  focusWindow(window) {
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }

  focusVaultWindow(vaultPath) {
    for (const [win, windowVaultPath] of this.windowVaults) {
      if (!win.isDestroyed() && windowVaultPath === vaultPath) {
        this.focusWindow(win);
        return true;
      }
    }
    return false;
  }

  toggleMaximize(window) {
    if (!window || window.isDestroyed()) return;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  }

  windowMenuLabel(window) {
    return window.vaultName || window.getTitle() || "Tektite";
  }

  openSessions() {
    return this.getWindows().map((window) => this.windowVaults.get(window) || null);
  }

  setQuitting(value) {
    this.isQuitting = Boolean(value);
  }
}

module.exports = { WindowManager, splashMinimumMs };
