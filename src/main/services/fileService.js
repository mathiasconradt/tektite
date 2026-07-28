const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_TEMPLATES_PATH = ".tektite/templates";
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);

async function validateVaultRoot(rootPath) {
  const normalizedRoot = path.resolve(rootPath);
  let stat;
  try {
    stat = await fs.stat(normalizedRoot);
  } catch (error) {
    if (error?.code === "ENOENT") return vaultNotFound(normalizedRoot);
    throw error;
  }

  if (!stat.isDirectory()) return vaultNotFound(normalizedRoot);
  return { ok: true };
}

function vaultNotFound(rootPath) {
  return {
    ok: false,
    code: "VAULT_NOT_FOUND",
    message: "The vault folder doesn't exist anymore.",
    path: rootPath
  };
}

async function scanVault(rootPath) {
  assertInsideVault(rootPath, rootPath);
  const tree = await readDirectory(rootPath, rootPath);
  const notes = flattenNotes(tree);
  return { tree, notes };
}

async function readNote(rootPath, relativePath) {
  return fs.readFile(resolveVaultPath(rootPath, relativePath), "utf8");
}

async function noteModifiedTimes(rootPath, relativePaths = []) {
  const paths = Array.isArray(relativePaths) ? relativePaths : [];
  return Promise.all(paths.map(async (relativePath) => {
    const filePath = resolveVaultPath(rootPath, relativePath);
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch (error) {
      if (error?.code === "ENOENT") return { path: relativePath, modifiedAt: null };
      throw error;
    }
    return { path: relativePath, modifiedAt: stat.mtimeMs };
  }));
}

async function writeNote(rootPath, relativePath, content) {
  const filePath = resolveVaultPath(rootPath, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  const stat = await fs.stat(filePath);
  return {
    path: relativePath,
    title: noteTitle(relativePath),
    modifiedAt: stat.mtimeMs
  };
}

async function createNote(rootPath, requestedName, folder = "", templatePath = "") {
  const safeName = sanitizeNoteName(requestedName || "Untitled");
  const baseFolder = normalizeRelative(folder);
  let candidate = path.posix.join(baseFolder, `${safeName}.md`);
  let index = 2;

  while (await exists(resolveVaultPath(rootPath, candidate))) {
    candidate = path.posix.join(baseFolder, `${safeName} ${index}.md`);
    index += 1;
  }

  const filePath = resolveVaultPath(rootPath, candidate);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let content = `# ${path.basename(candidate, ".md")}\n\n`;
  if (templatePath) content = await fs.readFile(resolveVaultPath(rootPath, templatePath), "utf8");

  await fs.writeFile(filePath, content, "utf8");
  return candidate;
}

async function listTemplates(rootPath, templatesPath = "") {
  const relPath = trimSlashes((templatesPath || DEFAULT_TEMPLATES_PATH).replaceAll("\\", "/"));
  const templatesDir = resolveVaultPath(rootPath, relPath);
  try {
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => ({ name: path.basename(entry.name, ".md"), path: `${relPath}/${entry.name}` }));
  } catch {
    return [];
  }
}

async function loadSettings(rootPath) {
  try {
    const settingsFile = resolveVaultPath(rootPath, path.join(".tektite", "settings.json"));
    const raw = await fs.readFile(settingsFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      templatesPath: typeof parsed.templatesPath === "string" ? parsed.templatesPath : "",
      autoLinkUrls: Boolean(parsed.autoLinkUrls),
      tocListStyle: parsed.tocListStyle === "ordered" ? "ordered" : "unordered",
      tocIncludeSubfolders: Boolean(parsed.tocIncludeSubfolders),
      treeFontSize: typeof parsed.treeFontSize === "number" ? parsed.treeFontSize : null,
      editorFontSize: typeof parsed.editorFontSize === "number" ? parsed.editorFontSize : null
    };
  } catch {
    return { templatesPath: "", autoLinkUrls: false, tocListStyle: "unordered", tocIncludeSubfolders: false };
  }
}

async function saveSettings(rootPath, settings) {
  const settingsFile = resolveVaultPath(rootPath, path.join(".tektite", "settings.json"));
  await fs.mkdir(path.dirname(settingsFile), { recursive: true });
  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf8");
  return true;
}

async function createFolder(rootPath, requestedName, parentFolder = "") {
  const safeName = sanitizeEntryName(requestedName || "Untitled folder", "Untitled folder");
  const baseFolder = normalizeRelative(parentFolder);
  let candidate = path.posix.join(baseFolder, safeName);
  let index = 2;

  while (await exists(resolveVaultPath(rootPath, candidate))) {
    candidate = path.posix.join(baseFolder, `${safeName} ${index}`);
    index += 1;
  }

  await fs.mkdir(resolveVaultPath(rootPath, candidate), { recursive: false });
  return candidate;
}

async function deleteEntry(rootPath, relativePath, type) {
  const normalized = normalizeRelative(relativePath);
  if (!normalized) throw new Error("Cannot delete the vault root.");

  const entryPath = resolveVaultPath(rootPath, normalized);
  const stat = await fs.stat(entryPath);
  assertEntryType(stat, type);

  if (stat.isDirectory()) await fs.rm(entryPath, { recursive: true, force: false });
  else await fs.unlink(entryPath);
  return true;
}

async function renameEntry(rootPath, relativePath, type, requestedName) {
  const normalized = normalizeRelative(relativePath);
  if (!normalized) throw new Error("Cannot rename the vault root.");

  const fromPath = resolveVaultPath(rootPath, normalized);
  const stat = await fs.stat(fromPath);
  assertEntryType(stat, type);

  const currentName = path.basename(normalized);
  const nextName = renamedEntryName(currentName, requestedName, type);
  if (!nextName || nextName === currentName) return normalized;

  const candidate = path.posix.join(parentPosix(normalized), nextName);
  const toPath = resolveVaultPath(rootPath, candidate);
  if (await exists(toPath)) throw new Error(`"${nextName}" already exists.`);

  await fs.rename(fromPath, toPath);
  await updateMovedReferences(rootPath, type, normalized, candidate);
  return candidate;
}

async function moveEntry(rootPath, relativePath, type, targetFolder = "") {
  const normalized = normalizeRelative(relativePath);
  if (!normalized) throw new Error("Cannot move the vault root.");

  const fromPath = resolveVaultPath(rootPath, normalized);
  const stat = await fs.stat(fromPath);
  assertEntryType(stat, type);

  const destinationFolder = normalizeRelative(targetFolder);
  if (type === "folder" && destinationFolder && (destinationFolder === normalized || destinationFolder.startsWith(`${normalized}/`))) {
    throw new Error("Cannot move a folder inside itself.");
  }

  const baseName = path.basename(normalized);
  let candidate = path.posix.join(destinationFolder, baseName);
  let index = 2;
  const parsed = path.parse(baseName);

  while (await exists(resolveVaultPath(rootPath, candidate))) {
    const nextName = stat.isDirectory() ? `${baseName} ${index}` : `${parsed.name} ${index}${parsed.ext}`;
    candidate = path.posix.join(destinationFolder, nextName);
    index += 1;
  }

  const toPath = resolveVaultPath(rootPath, candidate);
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.rename(fromPath, toPath);
  await updateMovedReferences(rootPath, type, normalized, candidate);
  return candidate;
}

async function importImage(rootPath, sourcePath, targetFolder = "") {
  const sourceStat = await fs.stat(sourcePath);
  if (!sourceStat.isFile()) throw new Error("Dropped item is not a file.");

  const extension = path.extname(sourcePath).toLowerCase();
  if (!imageExtensions.has(extension)) throw new Error("Dropped file is not a supported image.");

  const baseFolder = normalizeRelative(targetFolder);
  const sourceName = sanitizeEntryName(path.basename(sourcePath, extension), "image");
  let candidate = path.posix.join(baseFolder, `${sourceName}${extension}`);
  let index = 2;

  while (await exists(resolveVaultPath(rootPath, candidate))) {
    candidate = path.posix.join(baseFolder, `${sourceName} ${index}${extension}`);
    index += 1;
  }

  const destinationPath = resolveVaultPath(rootPath, candidate);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
  return assetPayload(candidate);
}

async function importFileOrDirectory(rootPath, sourcePath, targetFolder = "") {
  const sourceStat = await fs.stat(sourcePath);
  const isDirectory = sourceStat.isDirectory();
  const isFile = sourceStat.isFile();
  if (!isFile && !isDirectory) throw new Error("Dropped item is neither a file nor a directory.");

  const baseFolder = normalizeRelative(targetFolder);
  let candidate = "";
  if (isFile) {
    const extension = path.extname(sourcePath).toLowerCase();
    const baseName = sanitizeEntryName(path.basename(sourcePath, extension), "file");
    candidate = path.posix.join(baseFolder, `${baseName}${extension}`);
    let index = 2;
    while (await exists(resolveVaultPath(rootPath, candidate))) {
      candidate = path.posix.join(baseFolder, `${baseName} ${index}${extension}`);
      index += 1;
    }
  } else {
    const sourceName = sanitizeEntryName(path.basename(sourcePath), "folder");
    candidate = path.posix.join(baseFolder, sourceName);
    let index = 2;
    while (await exists(resolveVaultPath(rootPath, candidate))) {
      candidate = path.posix.join(baseFolder, `${sourceName} ${index}`);
      index += 1;
    }
  }

  const destinationPath = resolveVaultPath(rootPath, candidate);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.cp(sourcePath, destinationPath, { recursive: true });
  return {
    path: candidate,
    name: path.basename(candidate),
    label: isFile ? path.basename(candidate, path.extname(candidate)) : path.basename(candidate)
  };
}

async function saveClipboardImage(rootPath, targetFolder = "", image = {}) {
  const dataUrl = typeof image.dataUrl === "string" ? image.dataUrl : "";
  const match = dataUrl.match(/^data:(image\/[a-z0-9+.-]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw new Error("Clipboard image data is invalid.");

  const mimeType = match[1].toLowerCase();
  const extension = clipboardImageExtension(mimeType, image.name);
  if (!imageExtensions.has(extension)) throw new Error("Clipboard image type is not supported.");

  const baseFolder = normalizeRelative(targetFolder);
  const candidate = await clipboardImageCandidate(rootPath, baseFolder, image.name, extension);
  const destinationPath = resolveVaultPath(rootPath, candidate);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.writeFile(destinationPath, Buffer.from(match[2], "base64"));
  return assetPayload(candidate);
}

async function readAssetDataUrl(rootPath, relativePath) {
  const filePath = resolveVaultPath(rootPath, relativePath);
  const extension = path.extname(filePath).toLowerCase();
  if (!imageExtensions.has(extension)) throw new Error("Selected file is not a supported image.");
  const data = await fs.readFile(filePath);
  return `data:${imageMimeType(extension)};base64,${data.toString("base64")}`;
}

async function readDirectory(rootPath, currentPath) {
  assertInsideVault(rootPath, currentPath);
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const absolute = path.join(currentPath, entry.name);
    const relative = toPosix(path.relative(rootPath, absolute));

    if (entry.isDirectory()) {
      children.push(await readDirectory(rootPath, absolute));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      const stat = await fs.stat(absolute);
      children.push({ type: "note", name: entry.name, title: noteTitle(relative), path: relative, modifiedAt: stat.mtimeMs });
    } else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      const stat = await fs.stat(absolute);
      children.push({
        type: "asset",
        kind: "image",
        name: entry.name,
        title: path.basename(entry.name, path.extname(entry.name)),
        path: relative,
        modifiedAt: stat.mtimeMs
      });
    }
  }

  children.sort((a, b) => {
    const order = { folder: 0, note: 1, asset: 2 };
    if (a.type !== b.type) return order[a.type] - order[b.type];
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return {
    type: "folder",
    name: path.basename(currentPath),
    path: toPosix(path.relative(rootPath, currentPath)),
    children
  };
}

function flattenNotes(node) {
  if (node.type === "note") return [node];
  if (!Array.isArray(node.children)) return [];

  const notes = [];
  for (const child of node.children) notes.push(...flattenNotes(child));
  return notes;
}

async function updateMovedReferences(rootPath, type, oldPath, newPath) {
  if (type === "asset" && imageExtensions.has(path.extname(newPath).toLowerCase())) {
    await updateMovedAssetReferences(rootPath, oldPath, newPath);
  } else if (type === "note") {
    await updateMovedNoteReferences(rootPath, oldPath, newPath);
  } else if (type === "folder") {
    await updateMovedFolderReferences(rootPath, oldPath, newPath);
  }
}

async function updateMovedAssetReferences(rootPath, oldAssetPath, newAssetPath) {
  const notes = flattenNotes(await readDirectory(rootPath, rootPath));
  for (const note of notes) {
    const notePath = resolveVaultPath(rootPath, note.path);
    const original = await fs.readFile(notePath, "utf8");
    const updated = rewriteAssetLinks(original, note.path, oldAssetPath, newAssetPath);
    if (updated !== original) await fs.writeFile(notePath, updated, "utf8");
  }
}

async function updateMovedNoteReferences(rootPath, oldNotePath, newNotePath) {
  const notes = flattenNotes(await readDirectory(rootPath, rootPath));
  for (const note of notes) {
    const notePath = resolveVaultPath(rootPath, note.path);
    const original = await fs.readFile(notePath, "utf8");
    let updated = rewriteAssetLinks(original, note.path, oldNotePath, newNotePath);
    updated = rewriteWikiNoteLinks(updated, note.path, oldNotePath, newNotePath);
    if (updated !== original) await fs.writeFile(notePath, updated, "utf8");
  }
}

async function updateMovedFolderReferences(rootPath, oldFolderPath, newFolderPath) {
  const notes = flattenNotes(await readDirectory(rootPath, rootPath));
  for (const note of notes) {
    const notePath = resolveVaultPath(rootPath, note.path);
    const original = await fs.readFile(notePath, "utf8");
    let updated = rewriteFolderMarkdownLinks(original, note.path, oldFolderPath, newFolderPath);
    updated = rewriteFolderWikiLinks(updated, note.path, oldFolderPath, newFolderPath);
    if (updated !== original) await fs.writeFile(notePath, updated, "utf8");
  }
}

function rewriteAssetLinks(markdown, notePath, oldAssetPath, newAssetPath) {
  return replaceMarkdownLinks(markdown, ({ match, prefix, href, suffix }) => {
    const decodedHref = decodeMarkdownLink(href);
    if (/^[a-z]+:\/\//i.test(decodedHref)) return match;
    if (resolveMarkdownReference(notePath, decodedHref) !== oldAssetPath) return match;
    return `${prefix}${encodeMarkdownLink(relativeMarkdownPath(notePath, newAssetPath))}${suffix}`;
  });
}

function rewriteFolderMarkdownLinks(markdown, notePath, oldFolderPath, newFolderPath) {
  return replaceMarkdownLinks(markdown, ({ match, prefix, href, suffix }) => {
    const decodedHref = decodeMarkdownLink(href);
    if (/^[a-z]+:\/\//i.test(decodedHref)) return match;
    const moved = movedPathInsideFolder(resolveMarkdownReference(notePath, decodedHref), oldFolderPath, newFolderPath);
    if (!moved) return match;
    return `${prefix}${encodeMarkdownLink(relativeMarkdownPath(notePath, moved))}${suffix}`;
  });
}

function rewriteWikiNoteLinks(markdown, notePath, oldNotePath, newNotePath) {
  return replaceWikiLinks(markdown, ({ match, target }) => {
    const pipeIndex = target.indexOf("|");
    const targetPart = pipeIndex >= 0 ? target.slice(0, pipeIndex) : target;
    const aliasPart = pipeIndex >= 0 ? target.slice(pipeIndex) : "";
    const headingIndex = targetPart.indexOf("#");
    const pathPart = headingIndex >= 0 ? targetPart.slice(0, headingIndex) : targetPart;
    const headingPart = headingIndex >= 0 ? targetPart.slice(headingIndex) : "";
    if (resolveWikiReference(notePath, pathPart) !== oldNotePath) return match;
    return `[[${wikiTargetFor(notePath, pathPart, newNotePath)}${headingPart}${aliasPart}]]`;
  });
}

function rewriteFolderWikiLinks(markdown, notePath, oldFolderPath, newFolderPath) {
  return replaceWikiLinks(markdown, ({ match, target }) => {
    const pipeIndex = target.indexOf("|");
    const targetPart = pipeIndex >= 0 ? target.slice(0, pipeIndex) : target;
    const aliasPart = pipeIndex >= 0 ? target.slice(pipeIndex) : "";
    const headingIndex = targetPart.indexOf("#");
    const pathPart = headingIndex >= 0 ? targetPart.slice(0, headingIndex) : targetPart;
    const headingPart = headingIndex >= 0 ? targetPart.slice(headingIndex) : "";
    const moved = movedPathInsideFolder(resolveWikiReference(notePath, pathPart), oldFolderPath, newFolderPath);
    if (!moved) return match;
    return `[[${wikiTargetFor(notePath, pathPart, moved)}${headingPart}${aliasPart}]]`;
  });
}

function replaceMarkdownLinks(markdown, transform) {
  let output = "";
  let index = 0;

  while (index < markdown.length) {
    const openBracket = markdown.indexOf("[", index);
    if (openBracket === -1) {
      output += markdown.slice(index);
      break;
    }

    const prefixStart = openBracket > 0 && markdown[openBracket - 1] === "!" ? openBracket - 1 : openBracket;
    const closeBracket = markdown.indexOf("]", openBracket + 1);
    if (closeBracket === -1 || markdown[closeBracket + 1] !== "(") {
      output += markdown.slice(index, openBracket + 1);
      index = openBracket + 1;
      continue;
    }

    const closeParen = markdown.indexOf(")", closeBracket + 2);
    if (closeParen === -1) {
      output += markdown.slice(index, openBracket + 1);
      index = openBracket + 1;
      continue;
    }

    const match = markdown.slice(prefixStart, closeParen + 1);
    const prefix = markdown.slice(prefixStart, closeBracket + 2);
    const href = markdown.slice(closeBracket + 2, closeParen);
    const suffix = ")";
    output += markdown.slice(index, prefixStart);
    output += transform({ match, prefix, href, suffix });
    index = closeParen + 1;
  }

  return output;
}

function replaceWikiLinks(markdown, transform) {
  let output = "";
  let index = 0;

  while (index < markdown.length) {
    const start = markdown.indexOf("[[", index);
    if (start === -1) {
      output += markdown.slice(index);
      break;
    }

    const end = markdown.indexOf("]]", start + 2);
    if (end === -1) {
      output += markdown.slice(index);
      break;
    }

    const match = markdown.slice(start, end + 2);
    output += markdown.slice(index, start);
    output += transform({ match, target: markdown.slice(start + 2, end) });
    index = end + 2;
  }

  return output;
}

function movedPathInsideFolder(resolvedPath, oldFolderPath, newFolderPath) {
  if (!resolvedPath || resolvedPath === oldFolderPath) return "";
  if (!resolvedPath.startsWith(`${oldFolderPath}/`)) return "";
  return `${newFolderPath}${resolvedPath.slice(oldFolderPath.length)}`;
}

function resolveWikiReference(notePath, target) {
  const clean = trimLeadingSlashes(decodeMarkdownLink(target).trim());
  if (!clean) return "";
  const candidates = path.extname(clean) ? [clean] : [`${clean}.md`, clean];
  for (const candidate of candidates) {
    const resolved = resolveMarkdownReference(notePath, candidate);
    if (resolved) return resolved;
  }
  return "";
}

function wikiTargetFor(notePath, oldTarget, newNotePath) {
  const relative = removeMarkdownExtension(relativeMarkdownPath(notePath, newNotePath));
  if (oldTarget.includes("/") || oldTarget.startsWith(".") || oldTarget.startsWith("/")) return trimLeadingDotSlash(relative);
  return path.basename(newNotePath, path.extname(newNotePath));
}

function resolveMarkdownReference(notePath, href) {
  const clean = stripFragment(stripWrappingAngles(href));
  const noteFolder = parentPosix(notePath);
  const joined = clean.startsWith("/") ? trimLeadingSlashes(clean) : path.posix.join(noteFolder, clean);
  return normalizePosix(joined);
}

function relativeMarkdownPath(notePath, assetPath) {
  const noteFolder = parentPosix(notePath);
  const relative = path.posix.relative(noteFolder || ".", assetPath);
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function decodeMarkdownLink(value) {
  const trimmed = stripWrappingAngles(value);
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function encodeMarkdownLink(value) {
  return encodeURI(value).replaceAll("%5B", "[").replaceAll("%5D", "]");
}

function parentPosix(value) {
  const parts = value.split("/");
  parts.pop();
  return parts.join("/");
}

function resolveVaultPath(rootPath, relativePath) {
  const normalizedRoot = path.resolve(rootPath);
  const resolved = path.resolve(normalizedRoot, relativePath);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error("Requested path is outside the vault.");
  }
  return resolved;
}

function assertInsideVault(rootPath, candidatePath) {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedCandidate = path.resolve(candidatePath);
  if (normalizedCandidate !== normalizedRoot && !normalizedCandidate.startsWith(normalizedRoot + path.sep)) {
    throw new Error("Requested path is outside the vault.");
  }
}

function noteTitle(relativePath) {
  return path.basename(relativePath, path.extname(relativePath));
}

function sanitizeNoteName(value) {
  return removeMarkdownExtension(sanitizeEntryName(value, "Untitled")) || "Untitled";
}

function renamedEntryName(currentName, requestedName, type) {
  if (type === "folder") return sanitizeEntryName(requestedName || currentName, currentName);

  const currentExtension = path.extname(currentName);
  const fallback = path.basename(currentName, currentExtension);
  const requested = sanitizeEntryName(requestedName || fallback, fallback);
  const requestedExtension = path.extname(requested);

  if (type === "note") return `${removeMarkdownExtension(requested) || fallback}.md`;
  if (requestedExtension && imageExtensions.has(requestedExtension.toLowerCase())) return requested;
  return `${path.basename(requested, path.extname(requested)) || fallback}${currentExtension}`;
}

function imageMimeType(extension) {
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    default:
      return "image/png";
  }
}

function clipboardImageExtension(mimeType, requestedName = "") {
  const requestedExtension = path.extname(requestedName).toLowerCase();
  if (imageExtensions.has(requestedExtension)) return requestedExtension;
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "image/avif":
      return ".avif";
    default:
      return ".png";
  }
}

async function clipboardImageCandidate(rootPath, baseFolder, requestedName, extension) {
  if (hasOriginalClipboardName(requestedName)) {
    const parsed = path.parse(requestedName);
    const sourceName = sanitizeEntryName(parsed.name, "image");
    return uniqueOriginalAssetPath(rootPath, baseFolder, sourceName, extension);
  }

  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return uniqueGeneratedAssetPath(rootPath, baseFolder, `image-${yyyy}${mm}${dd}`, extension);
}

function hasOriginalClipboardName(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  return !/^image\.(png|jpe?g|gif|webp|svg|avif)$/i.test(value.trim());
}

async function uniqueOriginalAssetPath(rootPath, baseFolder, baseName, extension) {
  let candidate = path.posix.join(baseFolder, `${baseName}${extension}`);
  let index = 2;
  while (await exists(resolveVaultPath(rootPath, candidate))) {
    candidate = path.posix.join(baseFolder, `${baseName} ${index}${extension}`);
    index += 1;
  }
  return candidate;
}

async function uniqueGeneratedAssetPath(rootPath, baseFolder, baseName, extension) {
  let index = 1;
  let candidate = path.posix.join(baseFolder, `${baseName}-${index}${extension}`);
  while (await exists(resolveVaultPath(rootPath, candidate))) {
    index += 1;
    candidate = path.posix.join(baseFolder, `${baseName}-${index}${extension}`);
  }
  return candidate;
}

function sanitizeEntryName(value, fallback) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim() || fallback;
}

function normalizeRelative(value) {
  return normalizePosix(trimLeadingSlashes(toPosix(value || "")));
}

function normalizePosix(value) {
  const parts = [];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertEntryType(stat, type) {
  if (type === "folder" && !stat.isDirectory()) throw new Error("Selected entry is not a folder.");
  if ((type === "note" || type === "asset") && !stat.isFile()) throw new Error("Selected entry is not a file.");
}

function assetPayload(candidate) {
  return {
    path: candidate,
    name: path.basename(candidate),
    label: path.basename(candidate, path.extname(candidate))
  };
}

function trimSlashes(value) {
  return trimTrailingSlashes(trimLeadingSlashes(value));
}

function trimLeadingSlashes(value) {
  let index = 0;
  while (value[index] === "/") index += 1;
  return value.slice(index);
}

function trimTrailingSlashes(value) {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end -= 1;
  return value.slice(0, end);
}

function trimLeadingDotSlash(value) {
  return value.startsWith("./") ? value.slice(2) : value;
}

function stripWrappingAngles(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) return trimmed.slice(1, -1);
  return trimmed;
}

function stripFragment(value) {
  const index = value.indexOf("#");
  return index >= 0 ? value.slice(0, index) : value;
}

function removeMarkdownExtension(value) {
  return value.toLowerCase().endsWith(".md") ? value.slice(0, -3) : value;
}

module.exports = {
  assertInsideVault,
  createFolder,
  createNote,
  deleteEntry,
  flattenNotes,
  importFileOrDirectory,
  importImage,
  listTemplates,
  loadSettings,
  moveEntry,
  noteModifiedTimes,
  readAssetDataUrl,
  readNote,
  renameEntry,
  saveClipboardImage,
  saveSettings,
  scanVault,
  validateVaultRoot,
  writeNote
};
