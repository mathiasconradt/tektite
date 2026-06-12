const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { assertInsideVault } = require("./fileService");

const gitExecutableCandidates = [
  "/usr/bin/git",
  "/bin/git",
  "/usr/local/bin/git",
  "/opt/homebrew/bin/git"
];
const gitSafePath = "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin";

async function sync(rootPath, send = () => {}) {
  const fail = (output) => {
    send({ type: "done", ok: false });
    return { ok: false, output };
  };

  assertInsideVault(rootPath, rootPath);
  if (!(await hasGitRepository(rootPath))) {
    send({ type: "chunk", text: "This vault does not contain a .git directory.\n" });
    return fail("This vault does not contain a .git directory.");
  }

  await checkSshAuth(rootPath, send);

  const outputs = [];
  let pull;
  try {
    pull = await runGit(rootPath, ["pull", "--ff-only"], send);
  } catch (error) {
    send({ type: "chunk", text: `${error.message}\n` });
    return fail(error.message);
  }

  const pullOutput = formatGitCommandOutput("git pull --ff-only", pull);
  outputs.push(pullOutput);
  if (pull.code !== 0) return fail(pullOutput);

  const status = await runGit(rootPath, ["status", "--porcelain"], send, { emptyOutput: "Working tree clean." });
  outputs.push(formatGitCommandOutput("git status --porcelain", status, status.stdout.trim() ? "" : "Working tree clean."));
  if (status.code !== 0) return fail(outputs.join("\n\n"));

  if (status.stdout.trim()) {
    const add = await runGit(rootPath, ["add", "-A"], send);
    outputs.push(formatGitCommandOutput("git add -A", add));
    if (add.code !== 0) return fail(outputs.join("\n\n"));

    const commit = await runGit(rootPath, ["commit", "-m", "Update Tektite vault"], send);
    outputs.push(formatGitCommandOutput("git commit -m \"Update Tektite vault\"", commit));
    if (commit.code !== 0) return fail(outputs.join("\n\n"));
  }

  const push = await runGit(rootPath, ["push"], send);
  const pushOutput = formatGitCommandOutput("git push", push);
  outputs.push(pushOutput);
  send({ type: "done", ok: push.code === 0 });
  return { ok: push.code === 0, output: outputs.join("\n\n") };
}

async function hasGitRepository(rootPath) {
  try {
    assertInsideVault(rootPath, path.join(rootPath, ".git"));
    await fs.access(path.join(rootPath, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function gitProviderFor(rootPath) {
  try {
    const configPath = path.join(rootPath, ".git", "config");
    assertInsideVault(rootPath, configPath);
    const config = await fs.readFile(configPath, "utf8");
    return /\bgithub\.com[:/]/i.test(config) || /\bgithub\.com\b/i.test(config) ? "github" : "git";
  } catch {
    return "git";
  }
}

async function checkSshAuth(rootPath, send) {
  const remoteResult = await runGit(rootPath, ["remote", "get-url", "origin"]);
  if (remoteResult.code !== 0) return;

  const remoteUrl = remoteResult.stdout.trim();
  if (!remoteUrl || remoteUrl.startsWith("http://") || remoteUrl.startsWith("https://")) return;

  const hostMatch = remoteUrl.match(/[@/]([a-zA-Z0-9._-]+)[:/]/);
  if (!hostMatch) return;
  const host = hostMatch[1];

  await new Promise((resolve) => {
    execFile(
      "ssh",
      ["-T", `git@${host}`, "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "-o", "StrictHostKeyChecking=accept-new"],
      { env: { PATH: gitSafePath, SSH_AUTH_SOCK: process.env.SSH_AUTH_SOCK || "" } },
      (error, _stdout, stderr) => {
        const output = (stderr || "").toLowerCase();
        const authenticated = !error || output.includes("successfully authenticated") || output.includes("welcome to");
        if (!authenticated) {
          send({
            type: "chunk",
            text: `Warning: SSH authentication to ${host} failed. Git sync will likely fail.\n${stderr ? `${stderr.trim()}\n` : ""}`
          });
        }
        resolve();
      }
    );
  });
}

async function runGit(rootPath, args, send = () => {}, options = {}) {
  const gitExecutable = await resolveGitExecutable();
  return new Promise((resolve) => {
    const command = `git ${args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(" ")}`;
    send({ type: "command", text: `$ ${command}\n` });

    const child = spawn(gitExecutable, args, {
      cwd: rootPath,
      env: gitEnvironment()
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 120000);

    child.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      send({ type: "chunk", text });
    });
    child.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      send({ type: "chunk", text });
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      const message = `${error.message}\n`;
      send({ type: "chunk", text: message });
      resolve({ code: 1, signal: null, stdout, stderr, error: error.message });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      const exitCode = timedOut ? 1 : code || 0;
      const failureReason = gitFailureReason({ timedOut, signal, exitCode });
      const status = exitCode === 0 ? "OK" : `FAILED (${failureReason})`;
      if (!stdout.trim() && options.emptyOutput) send({ type: "chunk", text: `${options.emptyOutput}\n` });
      send({ type: "status", text: `${status}\n\n` });
      resolve({
        code: exitCode,
        signal: timedOut ? "timeout" : signal,
        stdout,
        stderr,
        error: timedOut ? "Command timed out." : ""
      });
    });
  });
}

function gitFailureReason({ timedOut, signal, exitCode }) {
  if (timedOut) return "timeout";
  return signal || exitCode;
}

async function resolveGitExecutable() {
  for (const candidate of gitExecutableCandidates) {
    if (await isSafeExecutable(candidate)) return candidate;
  }
  throw new Error("Git executable was not found in a trusted system location.");
}

async function isSafeExecutable(candidate) {
  try {
    const stat = await fs.stat(candidate);
    if (!stat.isFile()) return false;
    await fs.access(candidate, fs.constants.X_OK);

    const parent = await fs.stat(path.dirname(candidate));
    return (parent.mode & 0o002) === 0;
  } catch {
    return false;
  }
}

function gitEnvironment() {
  return {
    HOME: process.env.HOME || "",
    LANG: process.env.LANG || "en_US.UTF-8",
    LC_ALL: process.env.LC_ALL || "",
    SSH_AUTH_SOCK: process.env.SSH_AUTH_SOCK || "",
    GIT_TERMINAL_PROMPT: "0",
    PATH: gitSafePath
  };
}

function formatGitCommandOutput(command, result, emptyOutput = "") {
  const status = result.code === 0 ? "OK" : `FAILED (${result.signal || result.code})`;
  const parts = [`$ ${command}`, status];
  if (result.stdout.trim()) parts.push("", result.stdout.trim());
  else if (emptyOutput) parts.push("", emptyOutput);
  if (result.stderr.trim()) parts.push("", result.stderr.trim());
  if (result.error && result.code !== 0 && !result.stderr.trim()) parts.push("", result.error);
  return parts.join("\n");
}

module.exports = {
  gitProviderFor,
  hasGitRepository,
  sync
};
