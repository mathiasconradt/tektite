const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const DEFAULT_STORE = { lastVault: null, workspaces: {}, sessions: [] };

class ConfigManager {
  constructor({ app, recentVaultLimit = 10, log = () => {} }) {
    this.app = app;
    this.recentVaultLimit = recentVaultLimit;
    this.log = log;
    this.recentVaults = [];
    this.cachedStore = { ...DEFAULT_STORE };
    this.isQuitting = false;
  }

  recentVaultsPath() {
    return path.join(this.app.getPath("userData"), "recent-vaults.json");
  }

  workspaceStatePath() {
    return path.join(this.app.getPath("userData"), "workspace-state.json");
  }

  getRecentVaults() {
    return [...this.recentVaults];
  }

  async loadRecentVaults() {
    try {
      const raw = await fs.readFile(this.recentVaultsPath(), "utf8");
      const parsed = JSON.parse(raw);
      this.recentVaults = Array.isArray(parsed)
        ? parsed.filter((value) => typeof value === "string").slice(0, this.recentVaultLimit)
        : [];
    } catch {
      this.recentVaults = [];
    }
    return this.getRecentVaults();
  }

  async rememberRecentVault(rootPath) {
    const normalized = path.resolve(rootPath);
    this.recentVaults = [
      normalized,
      ...this.recentVaults.filter((vaultPath) => path.resolve(vaultPath) !== normalized)
    ].slice(0, this.recentVaultLimit);

    await fs.mkdir(path.dirname(this.recentVaultsPath()), { recursive: true });
    await fs.writeFile(this.recentVaultsPath(), JSON.stringify(this.recentVaults, null, 2), "utf8");
    return this.getRecentVaults();
  }

  async loadWorkspaceStore() {
    try {
      const raw = await fs.readFile(this.workspaceStatePath(), "utf8");
      const parsed = JSON.parse(raw);
      this.cachedStore = this.normalizeStore(parsed);
    } catch {
      this.cachedStore = { ...DEFAULT_STORE };
    }
    return this.storeSnapshot();
  }

  async saveWorkspaceStore(store) {
    this.cachedStore = this.normalizeStore(store);
    const p = this.workspaceStatePath();
    const tmp = `${p}.${process.hrtime.bigint()}.tmp`;
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(this.cachedStore, null, 2), "utf8");
    await fs.rename(tmp, p);
  }

  async saveOpenSessions(sessions) {
    if (this.isQuitting) return;
    this.log("saveOpenSessions", sessions);
    const store = await this.loadWorkspaceStore();
    store.sessions = sessions;
    await this.saveWorkspaceStore(store);
  }

  saveBeforeQuit(sessions) {
    this.isQuitting = true;
    try {
      this.cachedStore.sessions = sessions;
      const p = this.workspaceStatePath();
      const tmp = `${p}.tmp`;
      fsSync.mkdirSync(path.dirname(p), { recursive: true });
      fsSync.writeFileSync(tmp, JSON.stringify(this.cachedStore, null, 2), "utf8");
      fsSync.renameSync(tmp, p);
      this.log("before-quit sessions saved", sessions);
    } catch (error) {
      this.log("before-quit sessions save failed", error.message);
    }
  }

  normalizeStore(parsed = {}) {
    return {
      lastVault: typeof parsed.lastVault === "string" ? parsed.lastVault : null,
      workspaces: parsed.workspaces && typeof parsed.workspaces === "object" ? parsed.workspaces : {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
    };
  }

  storeSnapshot() {
    return {
      ...this.cachedStore,
      workspaces: { ...this.cachedStore.workspaces },
      sessions: [...this.cachedStore.sessions]
    };
  }
}

module.exports = { ConfigManager };
