const fsSync = require("node:fs");

let pty;

class TerminalService {
  constructor({ app }) {
    this.app = app;
    this.sessions = new Map();
  }

  create(sender, cwd, cols, rows) {
    if (pty === undefined) pty = loadPty();
    if (!pty) return null;
    const shell = process.env.SHELL || "/bin/sh";
    const safeCwd = cwd && fsSync.existsSync(cwd) ? cwd : this.app.getPath("home");
    const ptyProc = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: cols || 80,
      rows: rows || 24,
      cwd: safeCwd,
      env: { ...process.env, TERM: "xterm-256color" }
    });
    const { pid } = ptyProc;
    this.sessions.set(pid, ptyProc);
    ptyProc.onData((data) => sender.send(`terminal:data:${pid}`, data));
    ptyProc.onExit(() => {
      sender.send("terminal:kill");
      this.sessions.delete(pid);
    });
    return pid;
  }

  write(pid, data) {
    this.sessions.get(pid)?.write(data);
  }

  resize(pid, cols, rows) {
    this.sessions.get(pid)?.resize(cols, rows);
  }

  destroy(pid) {
    const proc = this.sessions.get(pid);
    if (proc) {
      try {
        proc.kill();
      } catch {}
      this.sessions.delete(pid);
    }
  }
}

function loadPty() {
  try {
    return require("node-pty");
  } catch {
    return null;
  }
}

module.exports = { TerminalService };
