const state = {
  rootPath: null,
  tree: null,
  notes: [],
  noteByPath: new Map(),
  noteByTitle: new Map(),
  noteContent: new Map(),
  noteDiskModifiedAt: new Map(),
  externalNoteChanges: new Map(),
  ignoredExternalNoteChanges: new Map(),
  tags: [],
  activePath: null,
  activeType: null,
  activeContent: "",
  previewRevision: 0,
  openTabs: [],
  selectedPath: "",
  selectedType: "folder",
  showFileExtensions: false,
  showEditorPane: true,
  showPreviewPane: true,
  showTerminalPane: false,
  showLineNumbers: false,
  terminalContentCollapsed: false,
  showTagsPane: true,
  showGraphPane: true,
  tagsContentCollapsed: false,
  graphContentCollapsed: false,
  hasGitRepo: false,
  gitProvider: null,
  gitSyncInProgress: false,
  gitOutputUnsubscribe: null,
  saveTimer: null,
  graph: null,
  collapsedFolders: new Set(),
  nameDialogResolve: null,
  layout: {
    sidebarWidth: 300,
    editorRatio: 0.52,
    sidebarTagsHeight: 118,
    sidebarGraphHeight: 240
  },
  activeResize: null,
  graphViewport: {
    scale: 1,
    x: 0,
    y: 0
  },
  graphPositions: new Map(),
  graphLayoutSignature: "",
  graphDrag: null,
  previewHistory: [],
  previewForwardHistory: [],
  mention: {
    active: false,
    start: -1,
    query: "",
    selectedIndex: 0,
    items: []
  },
  editorHistory: {
    path: null,
    stack: [],
    index: -1,
    restoring: false
  },
  moveDialogResolve: null,
  find: {
    active: false,
    matches: [],
    index: -1
  },
  settings: {
    templatesPath: "",
    autoLinkUrls: false,
    tocListStyle: "unordered",
    tocIncludeSubfolders: false
  }
};

const WORKSPACE_STORAGE_PREFIX = "tektite:workspace:";
const FILE_TREE_MIN_HEIGHT = 56;
const TAGS_MIN_HEIGHT = 56;
const GRAPH_MIN_HEIGHT = 100;
const SIDEBAR_PANE_HEADER_HEIGHT = 42;
const MENTION_ACTION_COUNT = 2;
const EXTERNAL_NOTE_POLL_MS = 2000;

function log() { /* verbose logging disabled */ }

const els = {
  vaultName: document.getElementById("vaultName"),
  openVaultButton: document.getElementById("openVaultButton"),
  refreshButton: document.getElementById("refreshButton"),
  gitSyncButton: document.getElementById("gitSyncButton"),
  githubSyncButton: document.getElementById("githubSyncButton"),
  themeButton: document.getElementById("themeButton"),
  themeIcon: document.getElementById("themeIcon"),
  suffixButton: document.getElementById("suffixButton"),
  suffixIcon: document.getElementById("suffixIcon"),
  searchInput: document.getElementById("searchInput"),
  fileTree: document.getElementById("fileTree"),
  noteTitle: document.getElementById("noteTitle"),
  notePath: document.getElementById("notePath"),
  saveState: document.getElementById("saveState"),
  editorTabs: document.getElementById("editorTabs"),
  editor: document.getElementById("editor"),
  imageViewer: document.getElementById("imageViewer"),
  imageViewerImage: document.getElementById("imageViewerImage"),
  mentionMenu: document.getElementById("mentionMenu"),
  preview: document.getElementById("preview"),
  previewPrintButton: document.getElementById("previewPrintButton"),
  previewBackButton: document.getElementById("previewBackButton"),
  previewForwardButton: document.getElementById("previewForwardButton"),
  graph: document.getElementById("graph"),
  graphSvg: document.getElementById("graphSvg"),
  graphEmpty: document.getElementById("graphEmpty"),
  tagCloud: document.getElementById("tagCloud"),
  collapseTagsButton: document.getElementById("collapseTagsButton"),
  collapseGraphButton: document.getElementById("collapseGraphButton"),
  sidebarTagsPane: document.querySelector(".sidebar-tags-pane"),
  sidebarTagsResizer: document.getElementById("sidebarTagsResizer"),
  sidebarGraphPane: document.querySelector(".sidebar-graph-pane"),
  sidebar: document.querySelector(".sidebar"),
  appShell: document.querySelector(".app-shell"),
  workspace: document.querySelector(".workspace"),
  sidebarResizer: document.getElementById("sidebarResizer"),
  workspaceResizer: document.getElementById("workspaceResizer"),
  sidebarGraphResizer: document.getElementById("sidebarGraphResizer"),
  treeContextMenu: document.getElementById("treeContextMenu"),
  tabContextMenu: document.getElementById("tabContextMenu"),
  nameDialog: document.getElementById("nameDialog"),
  nameForm: document.getElementById("nameForm"),
  nameDialogTitle: document.getElementById("nameDialogTitle"),
  nameInput: document.getElementById("nameInput"),
  confirmNameButton: document.getElementById("confirmNameButton"),
  cancelNameButton: document.getElementById("cancelNameButton"),
  cancelNameXButton: document.getElementById("cancelNameXButton"),
  templateRow: document.getElementById("templateRow"),
  templateSelect: document.getElementById("templateSelect"),
  moveDialog: document.getElementById("moveDialog"),
  moveDialogTitle: document.getElementById("moveDialogTitle"),
  moveForm: document.getElementById("moveForm"),
  moveFolderSelect: document.getElementById("moveFolderSelect"),
  cancelMoveButton: document.getElementById("cancelMoveButton"),
  cancelMoveXButton: document.getElementById("cancelMoveXButton"),
  settingsButton: document.getElementById("settingsButton"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  templatesPathInput: document.getElementById("templatesPathInput"),
  autoLinkUrlsCheckbox: document.getElementById("autoLinkUrlsCheckbox"),
  treeFontSizeInput: document.getElementById("treeFontSizeInput"),
  editorFontSizeInput: document.getElementById("editorFontSizeInput"),
  tocUnorderedRadio: document.getElementById("tocUnorderedRadio"),
  tocOrderedRadio: document.getElementById("tocOrderedRadio"),
  tocIncludeSubfoldersCheckbox: document.getElementById("tocIncludeSubfoldersCheckbox"),
  cancelSettingsButton: document.getElementById("cancelSettingsButton"),
  cancelSettingsXButton: document.getElementById("cancelSettingsXButton"),
  gitOutputDialog: document.getElementById("gitOutputDialog"),
  gitOutputText: document.getElementById("gitOutputText"),
  closeGitOutputButton: document.getElementById("closeGitOutputButton"),
  closeGitOutputXButton: document.getElementById("closeGitOutputXButton"),
  formattingBar: document.getElementById("formattingBar"),
  fmtBold: document.getElementById("fmtBold"),
  fmtItalic: document.getElementById("fmtItalic"),
  fmtStrike: document.getElementById("fmtStrike"),
  fmtSup: document.getElementById("fmtSup"),
  fmtH1: document.getElementById("fmtH1"),
  fmtH2: document.getElementById("fmtH2"),
  fmtH3: document.getElementById("fmtH3"),
  fmtH4: document.getElementById("fmtH4"),
  fmtSeparator: document.getElementById("fmtSeparator"),
  fmtList: document.getElementById("fmtList"),
  fmtOrderedList: document.getElementById("fmtOrderedList"),
  fmtLink: document.getElementById("fmtLink"),
  fmtImage: document.getElementById("fmtImage"),
  fmtTable: document.getElementById("fmtTable"),
  fmtToc: document.getElementById("fmtToc"),
  findBar: document.getElementById("findBar"),
  findInput: document.getElementById("findInput"),
  findCount: document.getElementById("findCount"),
  findPrevButton: document.getElementById("findPrevButton"),
  findNextButton: document.getElementById("findNextButton"),
  findCloseButton: document.getElementById("findCloseButton"),
  editorFindOverlay: document.getElementById("editorFindOverlay"),
  workspaceContent: document.getElementById("workspaceContent"),
  terminalResizer: document.getElementById("terminalResizer"),
  terminalPane: document.getElementById("terminalPane"),
  terminalContainer: document.getElementById("terminalContainer"),
  collapseTerminalButton: document.getElementById("collapseTerminalButton"),
  lineNumbers: document.getElementById("lineNumbers"),
  currentLineHighlight: document.getElementById("currentLineHighlight")
};

let termInstance = null;
let externalNoteCheckInFlight = false;

boot();

function boot() {
  state.showFileExtensions = localStorage.getItem("tektite:showFileExtensions") === "1";
  state.showEditorPane = localStorage.getItem("tektite:showEditorPane") !== "0";
  state.showPreviewPane = localStorage.getItem("tektite:showPreviewPane") !== "0";
  state.showTerminalPane = localStorage.getItem("tektite:showTerminalPane") === "1";
  state.showLineNumbers = localStorage.getItem("tektite:showLineNumbers") === "1";
  state.terminalContentCollapsed = localStorage.getItem("tektite:terminalContentCollapsed") === "1";
  state.showTagsPane = localStorage.getItem("tektite:showTagsPane") !== "0";
  state.showGraphPane = localStorage.getItem("tektite:showGraphPane") !== "0";
  state.tagsContentCollapsed = localStorage.getItem("tektite:tagsContentCollapsed") === "1";
  state.graphContentCollapsed = localStorage.getItem("tektite:graphContentCollapsed") === "1";
  loadLayout();
  applyLayout();
  updateSuffixButton();
  els.openVaultButton.addEventListener("click", chooseVault);
  els.refreshButton.addEventListener("click", refreshVault);
  els.gitSyncButton.addEventListener("click", syncGitVault);
  els.githubSyncButton.addEventListener("click", syncGitVault);
  els.themeButton.addEventListener("click", toggleTheme);
  els.suffixButton.addEventListener("click", toggleFileExtensions);
  els.searchInput.addEventListener("input", renderTree);
  els.editor.addEventListener("input", onEditorInput);
  els.editor.addEventListener("keydown", onEditorKeydown);
  els.editor.addEventListener("click", () => { updateMentionMenu(); updateCurrentLineHighlight(); });
  els.editor.addEventListener("scroll", () => { positionMentionMenu(); updateCurrentLineHighlight(); });
  els.editor.addEventListener("keyup", updateCurrentLineHighlight);
  els.editor.addEventListener("focus", updateCurrentLineHighlight);
  els.editor.addEventListener("blur", () => els.currentLineHighlight.style.opacity = "0");
  document.addEventListener("selectionchange", () => { if (document.activeElement === els.editor) updateCurrentLineHighlight(); });
  els.editor.addEventListener("paste", onEditorPaste);
  els.editor.addEventListener("dragover", onEditorDragOver);
  els.editor.addEventListener("drop", onEditorDrop);
  els.fileTree.addEventListener("dragstart", onTreeDragStart);
  els.fileTree.addEventListener("dragover", onTreeDragOver);
  els.fileTree.addEventListener("drop", onTreeDrop);
  els.fileTree.addEventListener("contextmenu", onTreeContextMenu);
  els.fileTree.addEventListener("click", closeTreeContextMenu);
  els.fileTree.addEventListener("keydown", onTreeKeydown);
  els.preview.addEventListener("click", onPreviewClick);
  els.preview.addEventListener("contextmenu", onPreviewContextMenu);
  els.previewPrintButton.addEventListener("click", printCurrentPreview);
  els.previewBackButton.addEventListener("click", goBackPreviewHistory);
  els.previewForwardButton.addEventListener("click", goForwardPreviewHistory);
  els.graphSvg.addEventListener("click", onGraphClick);
  els.graphSvg.addEventListener("wheel", onGraphWheel, { passive: false });
  els.graphSvg.addEventListener("pointerdown", onGraphPointerDown);
  els.sidebarResizer.addEventListener("pointerdown", (event) => startResize(event, "sidebar"));
  els.workspaceResizer.addEventListener("pointerdown", (event) => startResize(event, "editor"));
  els.sidebarTagsResizer.addEventListener("pointerdown", (event) => startResize(event, "sidebarTags"));
  els.sidebarGraphResizer.addEventListener("pointerdown", (event) => startResize(event, "sidebarGraph"));
  els.collapseTagsButton.addEventListener("click", toggleTagsContent);
  els.collapseGraphButton.addEventListener("click", toggleGraphContent);
  els.nameForm.addEventListener("submit", onNameSubmit);
  els.cancelNameButton.addEventListener("click", () => closeNameDialog(null));
  els.cancelNameXButton.addEventListener("click", () => closeNameDialog(null));
  els.nameDialog.addEventListener("click", (event) => {
    if (event.target === els.nameDialog) closeNameDialog(null);
  });
  els.moveForm.addEventListener("submit", onMoveSubmit);
  els.cancelMoveButton.addEventListener("click", () => closeMoveDialog(null));
  els.cancelMoveXButton.addEventListener("click", () => closeMoveDialog(null));
  els.moveDialog.addEventListener("click", (event) => {
    if (event.target === els.moveDialog) closeMoveDialog(null);
  });
  els.closeGitOutputButton.addEventListener("click", closeGitOutputDialog);
  els.closeGitOutputXButton.addEventListener("click", closeGitOutputDialog);
  els.gitOutputDialog.addEventListener("click", (event) => {
    if (event.target === els.gitOutputDialog) closeGitOutputDialog();
  });
  globalThis.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      refreshVault();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyF") {
      event.preventDefault();
      createFolder();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyR") {
      event.preventDefault();
      if (state.selectedPath) renameSelectedEntry();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f" && !event.shiftKey) {
      event.preventDefault();
      openFindBar();
      return;
    }
    if (event.key === "Escape") onGlobalEscape();
  });

  els.formattingBar.addEventListener("mousedown", (event) => {
    if (event.target.closest(".fmt-button")) event.preventDefault();
  });
  els.fmtBold.addEventListener("click", () => toggleInlineFormat("**", "**", "bold text"));
  els.fmtItalic.addEventListener("click", () => toggleInlineFormat("*", "*", "italic text"));
  els.fmtStrike.addEventListener("click", () => toggleInlineFormat("~~", "~~", "strikethrough"));
  els.fmtSup.addEventListener("click", () => toggleInlineFormat("^", "^", "superscript"));
  els.fmtH1.addEventListener("click", () => toggleHeading(1));
  els.fmtH2.addEventListener("click", () => toggleHeading(2));
  els.fmtH3.addEventListener("click", () => toggleHeading(3));
  els.fmtH4.addEventListener("click", () => toggleHeading(4));
  els.fmtSeparator.addEventListener("click", insertSeparator);
  els.fmtList.addEventListener("click", () => toggleListOnLines("ul"));
  els.fmtOrderedList.addEventListener("click", () => toggleListOnLines("ol"));
  els.fmtLink.addEventListener("click", () => insertMarkdownLink(false));
  els.fmtImage.addEventListener("click", () => insertMarkdownLink(true));
  els.fmtTable.addEventListener("click", insertTable);
  els.fmtToc.addEventListener("click", () => insertTableOfContents());
  els.editor.addEventListener("scroll", () => { syncFindOverlayScroll(); syncLineNumbersScroll(); });
  els.settingsButton.addEventListener("click", openSettingsDialog);
  els.settingsForm.addEventListener("submit", onSettingsSubmit);
  els.cancelSettingsButton.addEventListener("click", closeSettingsDialog);
  els.cancelSettingsXButton.addEventListener("click", closeSettingsDialog);
  els.settingsDialog.addEventListener("click", (event) => {
    if (event.target === els.settingsDialog) closeSettingsDialog();
  });
  els.findInput.addEventListener("input", updateFindMatches);
  els.findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      navigateFind(event.shiftKey ? -1 : 1);
    }
  });
  els.findPrevButton.addEventListener("click", () => navigateFind(-1));
  els.findNextButton.addEventListener("click", () => navigateFind(1));
  els.findCloseButton.addEventListener("click", closeFindBar);
  globalThis.addEventListener("click", (event) => {
    if (!event.target.closest?.("#treeContextMenu")) closeTreeContextMenu();
    if (!event.target.closest?.("#tabContextMenu") && typeof closeTabContextMenu === "function") closeTabContextMenu();
  });
  globalThis.addEventListener("resize", () => {
    applyLayout();
    updateGraph();
    fitTerminal();
    if (state.showLineNumbers) renderLineNumbers();
  });
  globalThis.addEventListener("focus", () => {
    checkForExternalNoteChanges({ promptActive: true }).catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    checkForExternalNoteChanges({ promptActive: true }).catch(() => {});
  });
  globalThis.addEventListener("beforeunload", saveWorkspaceState);

  globalThis.tektite.onOpenVault(chooseVault);
  globalThis.tektite.onOpenRecentVault(openVault);
  globalThis.tektite.onNewNote(() => createNote());
  globalThis.tektite.onNewFolder(() => createFolder());
  globalThis.tektite.onCloseTab(closeActiveEditorTab);
  globalThis.tektite.onCloseAllTabs(closeAllEditorTabs);
  globalThis.tektite.onPrintPreview(printCurrentPreview);
  globalThis.tektite.onRefreshVault(refreshVault);
  globalThis.tektite.onToggleFileSuffixes(toggleFileExtensions);
  globalThis.tektite.onToggleTheme(toggleTheme);
  globalThis.tektite.onToggleEditorPane(toggleEditorPane);
  globalThis.tektite.onTogglePreviewPane(togglePreviewPane);
  globalThis.tektite.onToggleTagsPane(toggleTagsPane);
  globalThis.tektite.onToggleGraphPane(toggleGraphPane);
  globalThis.tektite.onToggleTerminalPane(toggleTerminalPane);
  globalThis.tektite.onToggleLineNumbers(toggleLineNumbers);
  els.collapseTerminalButton.addEventListener("click", toggleTerminalContent);
  els.terminalResizer.addEventListener("pointerdown", onTerminalResizerDown);
  globalThis.tektite.onOpenSettings(openSettingsDialog);

  applyTheme(localStorage.getItem("tektite:theme") || "dark");
  applyEditorPaneVisibility();
  applyPreviewPaneVisibility();
  applyTerminalPaneVisibility();
  applyFontSizes();
  applyLineNumbers();
  syncPaneStateToMenu();
  applyTagsPaneVisibility();
  applyGraphPaneVisibility();
  globalThis.tektite.registerWindow();
  const params = new URLSearchParams(globalThis.location.search);
  if (params.get("restoreLastVault") === "0" && !params.get("vault")) {
    showEmptyState();
  } else {
    restoreLastVault().catch(() => showEmptyState());
  }

  globalThis.tektite.onTerminalKill(() => {
    destroyTerminal();
    toggleTerminalContent();
  });

  globalThis.setInterval(() => {
    checkForExternalNoteChanges().catch(() => {});
  }, EXTERNAL_NOTE_POLL_MS);
}

async function restoreLastVault() {
  const params = new URLSearchParams(globalThis.location.search);
  const specificVault = params.get("vault");
  if (specificVault) {
    try {
      await openVault(specificVault);
    } catch {
      showEmptyState();
    }
    return;
  }

  const persisted = await globalThis.tektite.loadWorkspaceState("");
  const lastVault = persisted?.lastVault || localStorage.getItem("tektite:lastVault");
  if (!lastVault) return;

  try {
    await openVault(lastVault);
  } catch {
    localStorage.removeItem("tektite:lastVault");
    showEmptyState();
  }
}

function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem("tektite:layout") || "{}");
    const defaultPaneHeight = defaultSidebarPaneHeight();
    state.layout.sidebarWidth = clamp(Number(saved.sidebarWidth) || 300, 220, 520);
    state.layout.editorRatio = clamp(Number(saved.editorRatio) || 0.52, 0.28, 0.78);
    state.layout.sidebarTagsHeight = clamp(
      hasSavedLayoutNumber(saved.sidebarTagsHeight) ? Number(saved.sidebarTagsHeight) : defaultPaneHeight,
      TAGS_MIN_HEIGHT,
      globalThis.innerHeight
    );
    state.layout.sidebarGraphHeight = clamp(
      savedGraphHeight(saved, defaultPaneHeight),
      GRAPH_MIN_HEIGHT,
      globalThis.innerHeight
    );
  } catch {
    const defaultPaneHeight = defaultSidebarPaneHeight();
    state.layout.sidebarWidth = 300;
    state.layout.editorRatio = 0.52;
    state.layout.sidebarTagsHeight = defaultPaneHeight;
    state.layout.sidebarGraphHeight = defaultPaneHeight;
  }
}

function hasSavedLayoutNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function savedGraphHeight(saved, defaultPaneHeight) {
  if (hasSavedLayoutNumber(saved.sidebarGraphHeight)) return Number(saved.sidebarGraphHeight);
  if (hasSavedLayoutNumber(saved.sidebarGraphRatio)) return Math.round(Number(saved.sidebarGraphRatio) * globalThis.innerHeight);
  return defaultPaneHeight;
}

function defaultSidebarPaneHeight() {
  return Math.max(TAGS_MIN_HEIGHT, Math.round(availableSidebarPaneHeight() / 3));
}

function saveLayout() {
  localStorage.setItem("tektite:layout", JSON.stringify(state.layout));
}

function applyLayout() {
  const windowWidth = globalThis.innerWidth || 1200;
  const maxSidebar = Math.max(220, Math.min(620, windowWidth - 720));
  state.layout.sidebarWidth = clamp(state.layout.sidebarWidth, 220, maxSidebar);
  state.layout.editorRatio = clamp(state.layout.editorRatio, 0.28, 0.78);
  state.layout.sidebarTagsHeight = clamp(state.layout.sidebarTagsHeight, TAGS_MIN_HEIGHT, globalThis.innerHeight);
  state.layout.sidebarGraphHeight = clamp(state.layout.sidebarGraphHeight, GRAPH_MIN_HEIGHT, globalThis.innerHeight);
  constrainSidebarPaneHeights();

  els.appShell.style.gridTemplateColumns = `${state.layout.sidebarWidth}px 6px minmax(0, 1fr)`;
  const tagsRows = sidebarPaneRows({
    visible: state.showTagsPane,
    collapsed: state.tagsContentCollapsed,
    minHeight: TAGS_MIN_HEIGHT,
    height: state.layout.sidebarTagsHeight
  });
  const graphRows = sidebarPaneRows({
    visible: state.showGraphPane,
    collapsed: state.graphContentCollapsed,
    minHeight: GRAPH_MIN_HEIGHT,
    height: state.layout.sidebarGraphHeight
  });
  els.sidebar.style.gridTemplateRows = `auto auto minmax(${FILE_TREE_MIN_HEIGHT}px, 1fr) ${tagsRows} ${graphRows}`;
  const workspaceWidth = Math.max(0, windowWidth - state.layout.sidebarWidth - 6);
  const editorWidth = Math.round(Math.max(1, workspaceWidth - 6) * state.layout.editorRatio);
  if (!state.showEditorPane && !state.showPreviewPane) {
    els.workspaceContent.style.gridTemplateColumns = `0 0 0`;
  } else if (state.showEditorPane && !state.showPreviewPane) {
    els.workspaceContent.style.gridTemplateColumns = `minmax(0, 1fr) 0 0`;
  } else if (state.showPreviewPane && !state.showEditorPane) {
    els.workspaceContent.style.gridTemplateColumns = `0 0 minmax(0, 1fr)`;
  } else {
    els.workspaceContent.style.gridTemplateColumns = `minmax(260px, ${editorWidth}px) 6px minmax(260px, 1fr)`;
  }
}

function sidebarPaneRows({ visible, collapsed, minHeight, height }) {
  if (!visible) return "0 0";
  if (collapsed) return `6px ${SIDEBAR_PANE_HEADER_HEIGHT}px`;
  return `6px minmax(${minHeight}px, ${height}px)`;
}

function constrainSidebarPaneHeights() {
  const available = availableSidebarPaneHeight();
  const tagsMin = state.showTagsPane && !state.tagsContentCollapsed ? TAGS_MIN_HEIGHT : 0;
  const graphMin = state.showGraphPane && !state.graphContentCollapsed ? GRAPH_MIN_HEIGHT : 0;
  const tagsMax = Math.max(tagsMin, available - graphMin);
  const graphMax = Math.max(graphMin, available - tagsMin);

  if (state.showTagsPane) state.layout.sidebarTagsHeight = clamp(state.layout.sidebarTagsHeight, tagsMin, tagsMax);
  if (state.showGraphPane) state.layout.sidebarGraphHeight = clamp(state.layout.sidebarGraphHeight, graphMin, graphMax);

  const total = (state.showTagsPane && !state.tagsContentCollapsed ? state.layout.sidebarTagsHeight : 0) +
    (state.showGraphPane && !state.graphContentCollapsed ? state.layout.sidebarGraphHeight : 0);
  if (total > available && state.showGraphPane) {
    state.layout.sidebarGraphHeight = Math.max(graphMin, state.layout.sidebarGraphHeight - (total - available));
  }
}

function availableSidebarPaneHeight() {
  const sidebarHeight = els.sidebar.getBoundingClientRect().height || globalThis.innerHeight || 900;
  const brandHeight = els.sidebar.querySelector(".brand-bar")?.getBoundingClientRect().height || 0;
  const searchHeight = els.sidebar.querySelector(".search-wrap")?.getBoundingClientRect().height || 0;
  const resizerHeight = 6 * Number(state.showTagsPane) + 6 * Number(state.showGraphPane);
  const collapsedHeaderHeight =
    SIDEBAR_PANE_HEADER_HEIGHT * Number(state.showTagsPane && state.tagsContentCollapsed) +
    SIDEBAR_PANE_HEADER_HEIGHT * Number(state.showGraphPane && state.graphContentCollapsed);
  return Math.max(
    TAGS_MIN_HEIGHT + GRAPH_MIN_HEIGHT,
    sidebarHeight - brandHeight - searchHeight - resizerHeight - FILE_TREE_MIN_HEIGHT - collapsedHeaderHeight
  );
}

function maxTagsHeight() {
  const available = availableSidebarPaneHeight();
  const graphHeight = state.showGraphPane ? state.layout.sidebarGraphHeight : 0;
  return Math.max(TAGS_MIN_HEIGHT, available - graphHeight);
}

function maxGraphHeight() {
  const available = availableSidebarPaneHeight();
  const tagsHeight = state.showTagsPane ? state.layout.sidebarTagsHeight : 0;
  return Math.max(GRAPH_MIN_HEIGHT, available - tagsHeight);
}

function startResize(event, target) {
  event.preventDefault();
  const workspaceRect = els.workspaceContent.getBoundingClientRect();
  state.activeResize = {
    target,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startSidebarWidth: state.layout.sidebarWidth,
    startEditorRatio: state.layout.editorRatio,
    startSidebarTagsHeight: state.layout.sidebarTagsHeight,
    startSidebarGraphHeight: state.layout.sidebarGraphHeight,
    workspaceLeft: workspaceRect.left,
    workspaceWidth: workspaceRect.width,
    sidebarTop: els.sidebar.getBoundingClientRect().top,
    sidebarHeight: els.sidebar.getBoundingClientRect().height
  };

  event.currentTarget.setPointerCapture(event.pointerId);
  document.body.classList.add(target === "sidebarGraph" || target === "sidebarTags" ? "resizing-y" : "resizing");
  globalThis.addEventListener("pointermove", onResizeMove);
  globalThis.addEventListener("pointerup", stopResize, { once: true });
  globalThis.addEventListener("pointercancel", stopResize, { once: true });
}

function onResizeMove(event) {
  if (!state.activeResize) return;
  const resize = state.activeResize;

  if (resize.target === "sidebar") {
    const nextWidth = resize.startSidebarWidth + event.clientX - resize.startX;
    const maxSidebar = Math.max(220, Math.min(620, globalThis.innerWidth - 720));
    state.layout.sidebarWidth = clamp(nextWidth, 220, maxSidebar);
  } else if (resize.target === "editor") {
    const x = event.clientX - resize.workspaceLeft;
    const availableWidth = Math.max(1, resize.workspaceWidth - 6);
    state.layout.editorRatio = clamp(x / availableWidth, 0.28, 0.78);
  } else if (resize.target === "sidebarTags") {
    state.layout.sidebarTagsHeight = clamp(resize.startSidebarTagsHeight - (event.clientY - resize.startY), TAGS_MIN_HEIGHT, maxTagsHeight());
  } else if (state.showTagsPane) {
    const dy = event.clientY - resize.startY;
    const combinedHeight = resize.startSidebarTagsHeight + resize.startSidebarGraphHeight;
    state.layout.sidebarTagsHeight = clamp(resize.startSidebarTagsHeight + dy, TAGS_MIN_HEIGHT, combinedHeight - GRAPH_MIN_HEIGHT);
    state.layout.sidebarGraphHeight = combinedHeight - state.layout.sidebarTagsHeight;
  } else {
    state.layout.sidebarGraphHeight = clamp(resize.startSidebarGraphHeight - (event.clientY - resize.startY), GRAPH_MIN_HEIGHT, maxGraphHeight());
  }

  applyLayout();
  updateGraph();
}

function stopResize() {
  if (!state.activeResize) return;
  state.activeResize = null;
  document.body.classList.remove("resizing", "resizing-y");
  globalThis.removeEventListener("pointermove", onResizeMove);
  globalThis.removeEventListener("pointercancel", stopResize);
  saveLayout();
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("tektite:theme", nextTheme);
  els.themeIcon.dataset.mode = nextTheme;
  const label = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
  els.themeButton.dataset.tooltip = label;
  els.themeButton.setAttribute("aria-label", label);
  updateGraph();
}

function toggleFileExtensions() {
  state.showFileExtensions = !state.showFileExtensions;
  localStorage.setItem("tektite:showFileExtensions", state.showFileExtensions ? "1" : "0");
  updateSuffixButton();
  renderTree();
  renderEditorTabs();
  syncPaneStateToMenu();
}

function toggleEditorPane() {
  state.showEditorPane = !state.showEditorPane;
  localStorage.setItem("tektite:showEditorPane", state.showEditorPane ? "1" : "0");
  applyEditorPaneVisibility();
  syncPaneStateToMenu();
}

function togglePreviewPane() {
  state.showPreviewPane = !state.showPreviewPane;
  localStorage.setItem("tektite:showPreviewPane", state.showPreviewPane ? "1" : "0");
  applyPreviewPaneVisibility();
  syncPaneStateToMenu();
}

function syncPaneStateToMenu() {
  globalThis.tektite.setPaneState({
    showEditorPane: state.showEditorPane,
    showPreviewPane: state.showPreviewPane,
    showTagsPane: state.showTagsPane,
    showGraphPane: state.showGraphPane,
    showFileExtensions: state.showFileExtensions,
    showTerminalPane: state.showTerminalPane,
    showLineNumbers: state.showLineNumbers
  }).catch(() => {});
}

function applyEditorPaneVisibility() {
  document.querySelector(".editor-pane").classList.toggle("pane-hidden", !state.showEditorPane);
  els.workspaceResizer.hidden = !state.showEditorPane || !state.showPreviewPane;
  applyLayout();
}

function applyPreviewPaneVisibility() {
  document.querySelector(".preview-pane").classList.toggle("pane-hidden", !state.showPreviewPane);
  els.workspaceResizer.hidden = !state.showEditorPane || !state.showPreviewPane;
  applyLayout();
}

// ── Terminal ─────────────────────────────────────────────────────────────────

function removeLineNumbers() {
  els.lineNumbers.classList.add("hidden");
}

function toggleLineNumbers() {
  state.showLineNumbers = !state.showLineNumbers;
  localStorage.setItem("tektite:showLineNumbers", state.showLineNumbers ? "1" : "0");

  if(state.activePath.endsWith(".md")) applyLineNumbers();
  syncPaneStateToMenu();
}

function applyLineNumbers() {
  const editorBody = document.querySelector(".editor-body");
  if (!editorBody) return;
  editorBody.classList.toggle("line-numbers-on", state.showLineNumbers);
  if (state.showLineNumbers) {
    els.lineNumbers.classList.remove("hidden");
    renderLineNumbers();
  } else {
    removeLineNumbers();
  }
}

function renderLineNumbers() {
  if (!state.showLineNumbers) return;
  if (!state.activePath) { els.lineNumbers.innerHTML = ""; return; }

  const style = getComputedStyle(els.editor);
  const fontSize = Number.parseFloat(style.fontSize) || 15;
  const lineHeight = fontSize * 1.65;
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 28;
  const paddingRight = Number.parseFloat(style.paddingRight) || 28;
  const contentWidth = Math.max(1, els.editor.clientWidth - paddingLeft - paddingRight);
  // SFMono/monospace character width approximation
  const charWidth = fontSize * 0.601;
  const charsPerLine = Math.max(1, Math.floor(contentWidth / charWidth));

  const lines = els.editor.value.split("\n");
  els.lineNumbers.innerHTML = lines.map((line, i) => {
    const visualLines = Math.max(1, Math.ceil((line.length || 0.1) / charsPerLine));
    const h = visualLines * lineHeight;
    return `<span class="line-number" style="height:${h}px">${i + 1}</span>`;
  }).join("");

  syncLineNumbersScroll();
}

function syncLineNumbersScroll() {
  if (state.showLineNumbers) els.lineNumbers.scrollTop = els.editor.scrollTop;
}

function updateCurrentLineHighlight() {
  if (!state.activePath || state.activeType !== "note" || els.editor.disabled) {
    els.currentLineHighlight.style.opacity = "0";
    return;
  }

  const style = getComputedStyle(els.editor);

  const fontSize = Number.parseFloat(style.fontSize) || 15;

  let lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isNaN(lineHeight)) {
    lineHeight = fontSize * 1.65;
  }

  const mirror = document.createElement("div");
  mirror.style.cssText = `
    position: absolute;
    visibility: hidden;
    left: -9999px;
    top: 0;
    box-sizing: border-box;
    width: ${els.editor.offsetWidth}px;
    font: ${style.font};
    line-height: ${style.lineHeight};
    padding: ${style.padding};
    border: ${style.border};
    letter-spacing: ${style.letterSpacing};
    tab-size: ${style.tabSize};
    white-space: pre-wrap;
    overflow-wrap: break-word;
    overflow: hidden;
  `;

  const cursor = els.editor.selectionStart;
  const before = els.editor.value.slice(0, cursor);
  const after = els.editor.value.slice(cursor);

  mirror.appendChild(document.createTextNode(before));

  const marker = document.createElement("span");
  marker.textContent = "|";
  mirror.appendChild(marker);

  mirror.appendChild(document.createTextNode(after));
  document.body.appendChild(mirror);

  const top = marker.offsetTop - els.editor.scrollTop;

  mirror.remove();

  if (top < -lineHeight || top > els.editor.clientHeight) {
    els.currentLineHighlight.style.opacity = "0";
    return;
  }

  els.currentLineHighlight.style.top = `${top}px`;
  els.currentLineHighlight.style.height = `${lineHeight}px`;
  els.currentLineHighlight.style.opacity = "1";
}

function toggleTerminalPane() {
  state.showTerminalPane = !state.showTerminalPane;
  localStorage.setItem("tektite:showTerminalPane", state.showTerminalPane ? "1" : "0");
  applyTerminalPaneVisibility();
  syncPaneStateToMenu();

  if (state.showTerminalPane) {
    toggleTerminalContent();
  }
}

function applyTerminalPaneVisibility() {
  els.terminalPane.classList.toggle("hidden", !state.showTerminalPane);
  els.terminalResizer.classList.toggle("hidden", !state.showTerminalPane);
  if (state.showTerminalPane) {
    applyTerminalContentCollapsed();
    setTimeout(initTerminal, 60);
  } else {
    destroyTerminal();
  }
}

function toggleTerminalContent() {
  state.terminalContentCollapsed = !state.terminalContentCollapsed;
  localStorage.setItem("tektite:terminalContentCollapsed", state.terminalContentCollapsed ? "1" : "0");
  applyTerminalContentCollapsed();

  if (!state.terminalContentCollapsed) {
    if(termInstance === null) {
      initTerminal();
    }
    setTimeout(fitTerminal, 50);
  }
}

function applyTerminalContentCollapsed() {
  const pane = els.terminalPane;
  if (!pane) return;
  pane.classList.toggle("content-collapsed", state.terminalContentCollapsed);
  if (state.terminalContentCollapsed) pane.style.height = "";
  els.collapseTerminalButton.textContent = state.terminalContentCollapsed ? "+" : "-";
  els.collapseTerminalButton.setAttribute("aria-label", state.terminalContentCollapsed ? "Expand Terminal" : "Collapse Terminal");
}

function initTerminal() {
  if (termInstance) { fitTerminal(); return; }
  const TermCls = globalThis.Terminal;
  const FitCls = globalThis.FitAddon?.FitAddon;
  if (!TermCls) return;
  const term = new TermCls({
    fontFamily: '"MesloLGS NF", "Hack Nerd Font", "FiraCode Nerd Font", "JetBrainsMono Nerd Font", "Cascadia Code PL", "DejaVu Sans Mono for Powerline", "SFMono-Regular", Consolas, monospace',
    fontSize: 13,
    theme: { background: "#0d0e11", foreground: "#f6f2e8", cursor: "#65a8ad" },
    cursorBlink: true
  });
  const fit = FitCls ? new FitCls() : null;
  if (fit) term.loadAddon(fit);
  term.open(els.terminalContainer);
  requestAnimationFrame(() => {
    if (fit) fit.fit();
    globalThis.tektite.terminalCreate(state.rootPath || "", term.cols, term.rows)
      .then((pid) => {
        if (!pid) { term.write("\r\n\x1b[31mFailed to start terminal (node-pty unavailable).\x1b[0m\r\n"); termInstance = { term, fit, pid: null }; return; }
        term.onData((d) => globalThis.tektite.terminalWrite(pid, d));
        const unsub = globalThis.tektite.onTerminalData(pid, (d) => term.write(d));
        termInstance = { term, fit, pid, unsub };
      })
      .catch((err) => {
        const msg = err?.message || String(err);
        const stack = err?.stack || "";
        term.write(`\r\n\x1b[31mFailed to start terminal: ${msg}\x1b[0m\r\n`);
        if (stack) term.write(`\r\n\x1b[33m${stack}\x1b[0m\r\n`);
        termInstance = { term, fit, pid: null };
      });
  });
}

function destroyTerminal() {
  if (!termInstance) return;
  const { term, pid, unsub } = termInstance;
  unsub?.();
  if (pid) globalThis.tektite.terminalDestroy(pid);
  term.dispose();
  termInstance = null;
}

function fitTerminal() {
  if (!termInstance?.fit) return;
  termInstance.fit.fit();
  if (termInstance.pid) globalThis.tektite.terminalResize(termInstance.pid, termInstance.term.cols, termInstance.term.rows);
}

let termResizerDrag = null;

function onTerminalResizerDown(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  termResizerDrag = { startY: event.clientY, startH: els.terminalPane?.offsetHeight || 260 };
  els.terminalResizer.setPointerCapture(event.pointerId);
  const onMove = (e) => {
    if (!termResizerDrag) return;
    const delta = termResizerDrag.startY - e.clientY;
    const newH = Math.max(80, Math.min(globalThis.innerHeight - 200, termResizerDrag.startH + delta));
    const pane = els.terminalPane;
    if (pane) pane.style.height = `${newH}px`;
    fitTerminal();
  };
  const onUp = () => {
    termResizerDrag = null;
    globalThis.removeEventListener("pointermove", onMove);
    globalThis.removeEventListener("pointerup", onUp);
  };
  globalThis.addEventListener("pointermove", onMove);
  globalThis.addEventListener("pointerup", onUp);
}
// ─────────────────────────────────────────────────────────────────────────────

function toggleGraphPane() {
  state.showGraphPane = !state.showGraphPane;
  localStorage.setItem("tektite:showGraphPane", state.showGraphPane ? "1" : "0");
  applyGraphPaneVisibility();
  syncPaneStateToMenu();
}

function toggleTagsPane() {
  state.showTagsPane = !state.showTagsPane;
  localStorage.setItem("tektite:showTagsPane", state.showTagsPane ? "1" : "0");
  applyTagsPaneVisibility();
  syncPaneStateToMenu();
}

function toggleTagsContent() {
  state.tagsContentCollapsed = !state.tagsContentCollapsed;
  localStorage.setItem("tektite:tagsContentCollapsed", state.tagsContentCollapsed ? "1" : "0");
  applyTagsContentVisibility();
}

function toggleGraphContent() {
  state.graphContentCollapsed = !state.graphContentCollapsed;
  localStorage.setItem("tektite:graphContentCollapsed", state.graphContentCollapsed ? "1" : "0");
  applyGraphContentVisibility();
}

function applyTagsPaneVisibility() {
  els.sidebarTagsResizer.hidden = !state.showTagsPane;
  els.sidebarTagsPane.hidden = !state.showTagsPane;
  applyLayout();
  if (state.showTagsPane) {
    applyTagsContentVisibility();
    renderTags();
  }
}

function applyGraphPaneVisibility() {
  els.sidebarGraphResizer.hidden = !state.showGraphPane;
  els.sidebarGraphPane.hidden = !state.showGraphPane;
  applyLayout();
  if (state.showGraphPane) applyGraphContentVisibility();
}

function applyTagsContentVisibility() {
  els.sidebarTagsPane.classList.toggle("content-collapsed", state.tagsContentCollapsed);
  els.collapseTagsButton.textContent = state.tagsContentCollapsed ? "+" : "-";
  els.collapseTagsButton.setAttribute(
    "aria-label",
    state.tagsContentCollapsed ? "Expand Tags pane" : "Collapse Tags pane"
  );
  applyLayout();
}

function applyGraphContentVisibility() {
  els.sidebarGraphPane.classList.toggle("content-collapsed", state.graphContentCollapsed);
  els.collapseGraphButton.textContent = state.graphContentCollapsed ? "+" : "-";
  els.collapseGraphButton.setAttribute(
    "aria-label",
    state.graphContentCollapsed ? "Expand Graph pane" : "Collapse Graph pane"
  );
  applyLayout();
  if (state.showGraphPane && !state.graphContentCollapsed) updateGraph();
}

function updateSuffixButton() {
  els.suffixIcon.textContent = state.showFileExtensions ? "abc" : ".md";
  const label = state.showFileExtensions ? "Hide File Suffixes" : "Show File Suffixes";
  els.suffixButton.dataset.tooltip = label;
  els.suffixButton.setAttribute("aria-label", label);
}

function updateGitSyncButton() {
  const disabled = !state.rootPath || !state.hasGitRepo || state.gitSyncInProgress;
  const showGithub = state.hasGitRepo && state.gitProvider === "github";
  const showGenericGit = state.hasGitRepo && !showGithub;
  els.gitSyncButton.classList.toggle("hidden", !showGenericGit);
  els.githubSyncButton.classList.toggle("hidden", !showGithub);
  els.gitSyncButton.disabled = disabled || !showGenericGit;
  els.githubSyncButton.disabled = disabled || !showGithub;
}

async function chooseVault() {
  log("chooseVault start");
  const rootPath = await globalThis.tektite.chooseVault();
  if (!rootPath) return;
  await openVault(rootPath);
}

async function syncGitVault() {
  if (!state.rootPath || !state.hasGitRepo || state.gitSyncInProgress) return;

  state.gitSyncInProgress = true;
  updateGitSyncButton();
  setSaveState("Syncing...");
  showGitOutputDialog("Preparing Git sync...\n\n");

  try {
    await flushActiveNote();
    clearGitOutputSubscription();
    state.gitOutputUnsubscribe = globalThis.tektite.onGitSyncOutput(onGitSyncOutput);
    const result = await globalThis.tektite.syncGit(state.rootPath);
    await refreshVault({ flush: false });
    setSaveState(result.ok ? "Synced" : "Git sync failed");
  } catch (error) {
    setSaveState("Git sync failed");
    appendGitOutput(`${error.message || "Git sync failed."}\n`);
  } finally {
    clearGitOutputSubscription();
    state.gitSyncInProgress = false;
    updateGitSyncButton();
    setGitOutputCloseState(false);
  }
}

async function openVault(rootPath) {
  log("openVault start", rootPath);
  setSaveState("Opening...");
  try {
    const vault = await globalThis.tektite.scanVault(rootPath);
    if (!vault.ok) {
      handleUnavailableVault(vault);
      return;
    }
    log("openVault scan complete", { notes: vault.notes.length });
    state.rootPath = vault.rootPath;
    if (termInstance?.pid) globalThis.tektite.terminalWrite(termInstance.pid, `cd ${JSON.stringify(vault.rootPath)}\n`);
    state.tree = vault.tree;
    state.notes = vault.notes;
    state.previewRevision = Date.now();
    state.hasGitRepo = Boolean(vault.hasGitRepo);
    state.gitProvider = vault.gitProvider || null;
    state.settings = normalizeSettings(await globalThis.tektite.loadSettings(state.rootPath).catch(() => null));
    applyFontSizes();
    state.activePath = null;
    state.activeType = null;
    state.activeContent = "";
    state.openTabs = [];
    state.selectedPath = "";
    state.selectedType = "folder";
    state.previewHistory = [];
    state.previewForwardHistory = [];
    loadCollapsedFolders();
    indexNotes();
    await loadGraphContent();
    renderTags();

    localStorage.setItem("tektite:lastVault", rootPath);
    const vaultName = rootPath.split(/[\\/]/).pop() || rootPath;
    els.vaultName.textContent = vaultName;
    await globalThis.tektite.setVaultWindowTitle(vaultName);
    updateGitSyncButton();
    renderTree();
    updateGraph();

    renderEditorTabs();
    if (await restoreWorkspaceState()) {
      setSaveState(state.activeType === "asset" ? "Read-only" : "Saved");
    } else if (state.notes.length > 0) {
      await openNote(state.notes[0].path);
    } else {
      showEmptyState("Create a note to start writing.");
    }
    setSaveState("Idle");
    log("openVault complete");
  } catch (error) {
    showEmptyState(error.message || "Could not open vault.");
    setSaveState("Failed");
  }
}

async function refreshVault(options = {}) {
  log("refreshVault start");
  if (!state.rootPath) return chooseVault();
  const activePath = state.activePath;
  const activeType = state.activeType;
  const selectedPath = state.selectedPath;
  const selectedType = state.selectedType;
  if (options.flush !== false) await flushActiveNote();
  const vault = await globalThis.tektite.scanVault(state.rootPath);
  if (!vault.ok) {
    handleUnavailableVault(vault);
    return;
  }
  state.tree = vault.tree;
  state.notes = vault.notes;
  state.previewRevision = Date.now();
  state.hasGitRepo = Boolean(vault.hasGitRepo);
  state.gitProvider = vault.gitProvider || null;
  indexNotes();
  reconcileOpenTabs();
  await loadGraphContent();
  renderTags();
  if (selectedPath && entryExists(selectedPath, selectedType)) {
    state.selectedPath = selectedPath;
    state.selectedType = selectedType;
  } else if (activePath && entryExists(activePath, activeType)) {
    state.selectedPath = activePath;
    state.selectedType = activeType;
  } else {
    state.selectedPath = "";
    state.selectedType = "folder";
  }
  renderTree();
  renderEditorTabs();
  updateGitSyncButton();
  updateGraph();
  if (activePath && entryExists(activePath, activeType)) await activateTab(activePath, activeType, { preserveCursor: true });
}

async function createNote(context = currentSelection()) {
  log("createNote start");
  if (!state.rootPath) {
    await chooseVault();
    if (!state.rootPath) return;
  }

  const templates = await globalThis.tektite.listTemplates(state.rootPath, state.settings.templatesPath).catch(() => []);
  const result = await openNameDialog({ title: "New node", defaultName: "Untitled", templates });
  if (result === null) {
    log("createNote canceled");
    return;
  }

  const { name: requestedName, templatePath } = result;
  const folder = folderForContext(context);
  try {
    const newPath = await globalThis.tektite.createNote(state.rootPath, requestedName, folder, templatePath);
    await refreshVault();
    await openNote(newPath);
    log("createNote complete", newPath);
  } catch {
    setSaveState("Failed");
  }
}

async function createFolder(context = currentSelection()) {
  log("createFolder start");
  if (!state.rootPath) {
    await chooseVault();
    if (!state.rootPath) return;
  }

  const folderResult = await openNameDialog({ title: "New folder", defaultName: "Untitled folder" });
  if (folderResult === null) {
    log("createFolder canceled");
    return;
  }

  const requestedName = folderResult.name;
  try {
    const newPath = await globalThis.tektite.createFolder(state.rootPath, requestedName, folderForContext(context));
    state.collapsedFolders.delete(parentFolder(newPath));
    await refreshVault();
    selectEntry(newPath, "folder");
    els.fileTree.focus();
    log("createFolder complete", newPath);
  } catch {
    setSaveState("Failed");
  }
}

async function deleteSelectedEntry(context = currentSelection()) {
  if (!state.rootPath) return;
  const selection = context?.path ? context : currentSelection();
  if (!selection.path) return;

  const label = selection.type === "folder" ? selection.path : selection.path.split("/").pop();
  const message = selection.type === "folder"
    ? `Delete folder "${label}" and everything inside it?`
    : `Delete file "${label}"?`;
  if (!globalThis.confirm(message)) return;

  try {
    clearTimeout(state.saveTimer);
    await globalThis.tektite.deleteEntry(state.rootPath, selection.path, selection.type);
    if (selection.path === state.activePath || isPathInside(state.activePath, selection.path)) {
      showEmptyState("Select or create a note.");
    }
    state.selectedPath = "";
    state.selectedType = "folder";
    await refreshVault();
    setSaveState("Deleted");
    els.fileTree.focus();
  } catch {
    setSaveState("Failed");
  }
}

async function renameSelectedEntry(context = currentSelection()) {
  if (!state.rootPath || !context?.path) return;

  const currentName = context.path.split("/").pop() || context.path;
  const defaultName = context.type === "note" ? currentName.replace(/\.md$/i, "") : currentName;
  const renameResult = await openNameDialog({
    title: context.type === "folder" ? "Rename folder" : "Rename file",
    defaultName,
    confirmLabel: "Rename"
  });
  if (renameResult === null) return;
  const requestedName = renameResult.name;

  try {
    clearTimeout(state.saveTimer);
    if (state.activePath) await saveActiveNote();
    const newPath = await globalThis.tektite.renameEntry(state.rootPath, context.path, context.type, requestedName);
    const previousActivePath = state.activePath;
    await refreshVault({ flush: false });

    await reopenRenamedEntry(context, previousActivePath, newPath);
    setSaveState("Renamed");
  } catch (error) {
    setSaveState("Failed");
    const msg = error.message || "";
    const friendlyError = msg.includes("already exists")
      ? `Could not rename "${requestedName}.md": a file with that name already exists.`
      : `Could not rename file.`;
    globalThis.alert(friendlyError);
  }
}

async function reopenRenamedEntry(context, previousActivePath, newPath) {
  if (context.type === "note" && previousActivePath === context.path) {
    await openNote(newPath, { focusEditor: false });
    els.fileTree.focus();
    return;
  }
  if (context.type === "asset" && previousActivePath === context.path) {
    await openAsset(newPath, { focusEditor: false });
    els.fileTree.focus();
    return;
  }
  if (context.type === "folder" && isPathInside(previousActivePath, context.path)) {
    await openMovedActiveEntry(pathAfterMove(previousActivePath, context.path, newPath));
    els.fileTree.focus();
    return;
  }
  if (context.type !== "folder") selectEntry(newPath, context.type);
  els.fileTree.focus();
}

async function openMovedActiveEntry(path) {
  if (!path) return;
  if (state.noteByPath.has(path)) {
    await openNote(path);
    return;
  }
  if (treeEntryExists(state.tree, path, "asset")) await openAsset(path);
}

function openNameDialog({ title, defaultName, confirmLabel = "Create", templates = [] }) {
  return new Promise((resolve) => {
    state.nameDialogResolve = resolve;
    els.nameDialogTitle.textContent = title;
    els.confirmNameButton.textContent = confirmLabel;
    els.nameInput.value = defaultName;

    els.templateSelect.innerHTML = "";
    if (templates.length > 0) {
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "None";
      els.templateSelect.appendChild(blank);
      for (const tpl of templates) {
        const opt = document.createElement("option");
        opt.value = tpl.path;
        opt.textContent = tpl.name;
        els.templateSelect.appendChild(opt);
      }
      els.templateRow.classList.remove("hidden");
    } else {
      els.templateRow.classList.add("hidden");
    }

    els.nameDialog.setAttribute("open", "");
    els.nameDialog.classList.remove("hidden");
    els.nameInput.focus();
    els.nameInput.select();
  });
}

function onNameSubmit(event) {
  event.preventDefault();
  const name = els.nameInput.value.trim();
  const templatePath = els.templateRow.classList.contains("hidden") ? "" : els.templateSelect.value;
  closeNameDialog({ name: name || "Untitled", templatePath });
}

function closeNameDialog(value) {
  if (!state.nameDialogResolve) return;
  els.nameDialog.classList.add("hidden");
  els.nameDialog.removeAttribute("open");
  els.templateRow.classList.add("hidden");
  const resolve = state.nameDialogResolve;
  state.nameDialogResolve = null;
  resolve(value);
}

function openMoveDialog(context) {
  const folders = moveFolderOptions(context);
  if (!folders.length) return Promise.resolve(null);

  return new Promise((resolve) => {
    state.moveDialogResolve = resolve;
    const label = context.type === "folder" ? "folder" : "file";
    els.moveDialogTitle.textContent = `Move ${label}`;
    els.moveFolderSelect.innerHTML = "";
    for (const folder of folders) {
      const option = document.createElement("option");
      option.value = folder.path;
      option.textContent = `${"\u00a0\u00a0".repeat(folder.depth)}${folder.label}`;
      els.moveFolderSelect.appendChild(option);
    }

    const currentFolder = parentFolder(context.path);
    const preferred = folders.find((folder) => folder.path !== currentFolder) || folders[0];
    els.moveFolderSelect.value = preferred.path;
    els.moveDialog.setAttribute("open", "");
    els.moveDialog.classList.remove("hidden");
    els.moveFolderSelect.focus();
  });
}

function onMoveSubmit(event) {
  event.preventDefault();
  closeMoveDialog(els.moveFolderSelect.value);
}

function closeMoveDialog(value) {
  if (!state.moveDialogResolve) return;
  els.moveDialog.classList.add("hidden");
  els.moveDialog.removeAttribute("open");
  const resolve = state.moveDialogResolve;
  state.moveDialogResolve = null;
  resolve(value);
}

function moveFolderOptions(context) {
  if (!state.tree) return [];
  return flattenFoldersForMove(state.tree, context).filter((folder) => canMoveTreeEntry(context, folder.path));
}

function flattenFoldersForMove(node, context, depth = 0) {
  if (node?.type !== "folder") return [];
  const label = node.path ? node.name : `${state.tree.name || "Vault"} /`;
  const folders = [{ path: node.path || "", label, depth }];
  const children = Array.isArray(node.children) ? node.children : [];
  const childFolders = children
    .filter((child) => child.type === "folder")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  for (const child of childFolders) {
    if (context.type === "folder" && child.path === context.path) continue;
    folders.push(...flattenFoldersForMove(child, context, depth + 1));
  }
  return folders;
}

function updateMentionMenu() {
  if (state.activeType !== "note" || !state.activePath || document.activeElement !== els.editor) {
    closeMentionMenu();
    return;
  }

  const cursor = els.editor.selectionStart;
  const beforeCursor = els.editor.value.slice(0, cursor);
  const lineStart = Math.max(beforeCursor.lastIndexOf("\n") + 1, 0);
  const linePrefix = beforeCursor.slice(lineStart);
  const match = linePrefix.match(/(^|[\s([{@])@([A-Za-z0-9._\- /]*)$/);

  if (!match) {
    closeMentionMenu();
    return;
  }

  const query = match[2].toLowerCase();
  const start = cursor - match[2].length - 1;
  const items = state.notes
    .filter((note) => note.name.toLowerCase().includes(query) || note.path.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .slice(0, 12);

  state.mention = {
    active: true,
    start,
    query,
    selectedIndex: state.mention.query === query
      ? Math.min(state.mention.selectedIndex, items.length + MENTION_ACTION_COUNT - 1)
      : 0,
    items
  };
  renderMentionMenu();
  positionMentionMenu();
}

function renderMentionMenu() {
  if (!state.mention.active) return;
  els.mentionMenu.innerHTML = "";
  const newNodeOption = document.createElement("button");
  newNodeOption.type = "button";
  newNodeOption.className = `mention-option mention-action${state.mention.selectedIndex === 0 ? " active" : ""}`;
  newNodeOption.setAttribute("role", "option");
  newNodeOption.setAttribute("aria-selected", String(state.mention.selectedIndex === 0));
  newNodeOption.innerHTML = `<span>New Node</span><small>${escapeHtml(mentionDefaultName())}</small>`;
  newNodeOption.addEventListener("mousedown", (event) => {
    event.preventDefault();
    createMentionNode();
  });
  els.mentionMenu.appendChild(newNodeOption);

  const tocOption = document.createElement("button");
  tocOption.type = "button";
  tocOption.className = `mention-option mention-action${state.mention.selectedIndex === 1 ? " active" : ""}`;
  tocOption.setAttribute("role", "option");
  tocOption.setAttribute("aria-selected", String(state.mention.selectedIndex === 1));
  tocOption.innerHTML = "<span>Table of Contents</span><small>Current folder</small>";
  tocOption.addEventListener("mousedown", (event) => {
    event.preventDefault();
    insertTableOfContents({ replaceMention: true });
  });
  els.mentionMenu.appendChild(tocOption);

  state.mention.items.forEach((note, index) => {
    const optionIndex = index + MENTION_ACTION_COUNT;
    const option = document.createElement("button");
    option.type = "button";
    option.className = `mention-option${optionIndex === state.mention.selectedIndex ? " active" : ""}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(optionIndex === state.mention.selectedIndex));
    option.innerHTML = `<span>${escapeHtml(note.name)}</span><small>${escapeHtml(note.path)}</small>`;
    option.addEventListener("mousedown", (event) => {
      event.preventDefault();
      insertMentionLink(note);
    });
    els.mentionMenu.appendChild(option);
  });
  els.mentionMenu.classList.remove("hidden");
}

function positionMentionMenu() {
  if (!state.mention.active) return;
  const editorRect = els.editor.getBoundingClientRect();
  const caret = getTextareaCaretPosition(els.editor, els.editor.selectionStart);
  els.mentionMenu.style.left = `${caret.left}px`;
  els.mentionMenu.style.top = `${Math.min(caret.top + caret.height + 4, editorRect.bottom - 8)}px`;
}

function closeMentionMenu() {
  state.mention.active = false;
  state.mention.items = [];
  els.mentionMenu.classList.add("hidden");
  els.mentionMenu.innerHTML = "";
}

function insertMentionLink(note) {
  if (!note) return;
  const cursor = els.editor.selectionStart;
  const link = `[${note.name}](${relativeMarkdownLink(state.activePath, note.path)})`;
  els.editor.setRangeText(link, state.mention.start, cursor, "end");
  state.activeContent = els.editor.value;
  closeMentionMenu();
  renderPreview(state.activeContent);
  updateGraph();
  recordEditorHistory();
  setSaveState("Unsaved");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveActiveNote, 150);
  els.editor.focus();
}

async function createMentionNode() {
  if (!state.rootPath || state.activeType !== "note" || !state.activePath || !state.mention.active) return;

  const sourcePath = state.activePath;
  const rangeStart = state.mention.start;
  const rangeEnd = els.editor.selectionStart;
  const defaultName = mentionDefaultName();
  closeMentionMenu();
  const mentionResult = await openNameDialog({
    title: "New node",
    defaultName
  });
  if (mentionResult === null) {
    els.editor.focus();
    return;
  }
  const requestedName = mentionResult.name;
  try {
    const newPath = await globalThis.tektite.createNote(state.rootPath, requestedName, parentFolder(sourcePath));
    await refreshVault();
    if (state.activePath !== sourcePath && entryExists(sourcePath, "note")) {
      await openNote(sourcePath);
    }

    const note = state.noteByPath.get(newPath);
    if (!note) throw new Error("Created note was not found after refresh.");
    const link = `[${note.name}](${relativeMarkdownLink(sourcePath, newPath)})`;
    els.editor.setRangeText(link, rangeStart, rangeEnd, "end");
    state.activeContent = els.editor.value;
    renderPreview(state.activeContent);
    recordEditorHistory();
    setSaveState("Unsaved");
    clearTimeout(state.saveTimer);
    await saveActiveNote();
    await openNote(newPath);
  } catch {
    setSaveState("Failed");
  }
}

function mentionDefaultName() {
  return state.mention.query.trim() || "Untitled";
}

async function onEditorPaste(event) {
  if (!state.rootPath || state.activeType !== "note" || !state.activePath) return;
  const images = clipboardImageFiles(event.clipboardData);
  if (!images.length) return;
  event.preventDefault();

  try {
    const imported = [];
    for (const file of images) {
      const dataUrl = await readFileAsDataUrl(file);
      imported.push(await globalThis.tektite.saveClipboardImage(state.rootPath, activeFolder(), {
        name: clipboardImageName(file),
        mimeType: file.type,
        dataUrl
      }));
    }
    await refreshVault({ flush: false });
    insertImportedImages(imported);
    await saveActiveNote();
  } catch {
    setSaveState("Failed");
  }
}

function clipboardImageFiles(clipboardData) {
  if (!clipboardData) return [];
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (itemFiles.length) return itemFiles;
  return Array.from(clipboardData.files).filter((file) => file.type.startsWith("image/") || isImagePath(file.name));
}

function clipboardImageName(file) {
  const name = file?.name || "";
  return /^image\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name) ? "" : name;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Clipboard image data is invalid."));
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read clipboard image.")));
    reader.readAsDataURL(file);
  });
}

function onEditorDragOver(event) {
  if (!state.rootPath || state.activeType !== "note" || !state.activePath) return;
  const hasInternalEntry = event.dataTransfer.types.includes("application/x-tektite-entry");
  if (!hasInternalEntry && !hasImageFiles(event.dataTransfer.files)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

async function onEditorDrop(event) {
  if (!state.rootPath || state.activeType !== "note" || !state.activePath) return;
  const movePayload = parseMovePayload(event.dataTransfer);
  if (movePayload) {
    event.preventDefault();
    insertDroppedEntryLink(movePayload, event);
    return;
  }

  if (!hasImageFiles(event.dataTransfer.files)) return;
  event.preventDefault();
  const images = droppedImageFiles(event.dataTransfer.files);
  if (!images.length) return;

  try {
    const imported = [];
    for (const file of images) {
      const sourcePath = globalThis.tektite.getFilePath(file);
      if (!sourcePath) continue;
      imported.push(await globalThis.tektite.importImage(state.rootPath, sourcePath, activeFolder()));
    }
    if (!imported.length) return;

    await refreshVault({ flush: false });
    insertImportedImages(imported, event);
    await saveActiveNote();
  } catch {
    setSaveState("Failed");
  }
}

function insertImportedImages(images, event) {
  if (!images.length) return;
  const markdown = images
    .map((image) => `![${image.label}](${relativeMarkdownLink(state.activePath, image.path)})`)
    .join("\n");
  insertEditorMarkdown(markdown, event);
}

function insertDroppedEntryLink(payload, event) {
  if (!payload?.path) return;
  const markdown = markdownForEntry(payload);
  if (!markdown) return;
  insertEditorMarkdown(markdown, event);
}

function markdownForEntry(entry) {
  const label = entry.path.split("/").pop() || entry.path;
  const link = relativeMarkdownLink(state.activePath, entry.path);
  if (entry.type === "asset" && isImagePath(entry.path)) {
    return `![${basenameWithoutExtension(label)}](${link})`;
  }
  return `[${label}](${link})`;
}

function insertEditorMarkdown(markdown, event) {
  els.editor.focus();
  if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    const position = getTextareaPositionFromPoint(els.editor, event.clientX, event.clientY);
    els.editor.setSelectionRange(position, position);
  }

  insertMarkdownAtRange(markdown, els.editor.selectionStart, els.editor.selectionEnd);
}

function insertMarkdownAtRange(markdown, start, end) {
  els.editor.focus();
  const insertion = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
  els.editor.setRangeText(insertion, start, end, "end");
  state.activeContent = els.editor.value;
  renderPreview(state.activeContent);
  updateGraph();
  recordEditorHistory();
  setSaveState("Unsaved");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveActiveNote, 150);
}

function onTreeDragOver(event) {
  if (!state.rootPath) return;
  const hasInternalMove = event.dataTransfer.types.includes("application/x-tektite-entry");
  const hasExternalFiles = event.dataTransfer.types.includes("Files");
  if (!hasInternalMove && !hasExternalFiles) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = hasInternalMove ? "move" : "copy";
}

async function onTreeDrop(event) {
  if (!state.rootPath) return;
  const movePayload = parseMovePayload(event.dataTransfer);
  if (movePayload) {
    await moveTreeEntry(movePayload, folderFromDropTarget(event.target));
    return;
  }

  const files = [...(event.dataTransfer.files || [])];
  if (!files.length) return;
  event.preventDefault();
  const targetFolderPath = folderFromDropTarget(event.target);
  const imageExts = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]);

  try {
    for (const file of files) {
      const sourcePath = globalThis.tektite.getFilePath(file);
      if (!sourcePath) continue;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (imageExts.has(ext)) {
        await globalThis.tektite.importImage(state.rootPath, sourcePath, targetFolderPath);
      } else {
        await globalThis.tektite.importFile(state.rootPath, sourcePath, targetFolderPath);
      }
    }
    state.collapsedFolders.delete(targetFolderPath);
    await refreshVault();
    setSaveState("Imported");
  } catch {
    setSaveState("Failed");
  }
}

function onTreeDragStart(event) {
  const row = event.target.closest?.("[data-path][data-type]");
  if (!row) return;
  const path = row.dataset.path || "";
  const type = row.dataset.type;
  if (!path || !["folder", "note", "asset"].includes(type)) return;
  event.dataTransfer.effectAllowed = "copyMove";
  event.dataTransfer.setData("application/x-tektite-entry", JSON.stringify({ path, type }));
  event.dataTransfer.setData("text/plain", path);
}

async function moveTreeEntry(payload, targetFolderPath) {
  try {
    if (!canMoveTreeEntry(payload, targetFolderPath)) return;
    const originalActivePath = state.activePath;
    const nextPath = await globalThis.tektite.moveEntry(state.rootPath, payload.path, payload.type, targetFolderPath);
    updateMovedEntryState(payload, nextPath, originalActivePath);
    state.collapsedFolders.delete(targetFolderPath);
    await refreshVault();
    await reopenMovedTreeEntry(payload, nextPath);
    setSaveState("Moved");
  } catch {
    setSaveState("Failed");
  }
}

async function moveSelectedEntry(context = currentSelection()) {
  if (!state.rootPath || !context?.path) return;
  const targetFolderPath = await openMoveDialog(context);
  if (targetFolderPath === null) return;
  await moveTreeEntry(context, targetFolderPath);
  els.fileTree.focus();
}

function canMoveTreeEntry(payload, targetFolderPath) {
  if (!payload.path || payload.path === targetFolderPath) return false;
  return payload.type !== "folder" || !targetFolderPath.startsWith(`${payload.path}/`);
}

function updateMovedEntryState(payload, nextPath, originalActivePath) {
  if (payload.path === originalActivePath) {
    state.activePath = nextPath;
  } else if (payload.type === "folder" && isPathInside(originalActivePath, payload.path)) {
    state.activePath = `${nextPath}${originalActivePath.slice(payload.path.length)}`;
  }

  if (state.selectedPath !== payload.path) return;
  state.selectedPath = payload.type === "folder" ? "" : nextPath;
  state.selectedType = payload.type === "folder" ? "folder" : payload.type;
}

async function reopenMovedTreeEntry(payload, nextPath) {
  if (state.activePath) {
    await openMovedActiveEntry(state.activePath);
    if (entryExists(state.activePath, state.activeType)) return;
  }
  if (payload.type === "note") {
    await openNote(nextPath);
    return;
  }
  if (payload.type === "asset") await openAsset(nextPath);
}

function pathAfterMove(originalPath, oldBasePath, newBasePath) {
  if (!originalPath || !oldBasePath || originalPath === oldBasePath) return newBasePath;
  if (!originalPath.startsWith(`${oldBasePath}/`)) return originalPath;
  return `${newBasePath}${originalPath.slice(oldBasePath.length)}`;
}

function parseMovePayload(dataTransfer) {
  try {
    const raw = dataTransfer.getData("application/x-tektite-entry");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function folderFromDropTarget(target) {
  const row = target.closest?.("[data-path][data-type]");
  if (!row) return targetFolder();
  const type = row.dataset.type;
  const path = row.dataset.path || "";
  return type === "folder" ? path : parentFolder(path);
}

function hasImageFiles(files) {
  return droppedImageFiles(files).length > 0;
}

function droppedImageFiles(files) {
  return [...files].filter((file) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(extension);
  });
}

function isImagePath(value) {
  const extension = value.split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(extension);
}

function relativeMarkdownLink(sourcePath, targetPath) {
  const sourceFolder = parentFolder(sourcePath);
  const relative = relativePath(sourceFolder, targetPath);
  const normalized = relative.startsWith(".") ? relative : `./${relative}`;
  return encodeURI(normalized).replaceAll("%5B", "[").replaceAll("%5D", "]");
}

function localImageUrl(target, sourcePath = "") {
  const decoded = decodeLink(target);
  if (/^[a-z]+:\/\//i.test(decoded)) return null;
  const clean = decoded.replace(/#.*$/u, "").trim();
  const extension = clean.split(".").pop()?.toLowerCase();
  if (!["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(extension)) return null;

  const sourceFolder = parentFolder(sourcePath);
  const relative = normalizeVaultPath(sourceFolder ? `${sourceFolder}/${clean}` : clean);
  if (!relative || !state.rootPath) return null;
  if (!treeEntryExists(state.tree, relative, "asset")) return null;
  const absolutePath = `${state.rootPath}/${relative}`;
  return `file://${encodeURI(absolutePath)}?v=${state.previewRevision}`;
}

function relativePath(fromFolder, toPath) {
  const fromParts = fromFolder ? fromFolder.split("/") : [];
  const toParts = toPath.split("/");
  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return [...fromParts.map(() => ".."), ...toParts].join("/") || `./${toPath.split("/").at(-1)}`;
}

function getTextareaCaretPosition(textarea, position) {
  const div = document.createElement("div");
  const style = getComputedStyle(textarea);
  const properties = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "MozTabSize"
  ];

  div.style.position = "fixed";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";
  properties.forEach((prop) => {
    div.style[prop] = style[prop];
  });
  div.textContent = textarea.value.substring(0, position);

  const span = document.createElement("span");
  span.textContent = textarea.value.substring(position) || ".";
  div.appendChild(span);
  document.body.appendChild(div);

  const textareaRect = textarea.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const result = {
    left: textareaRect.left + (spanRect.left - divRect.left) - textarea.scrollLeft,
    top: textareaRect.top + (spanRect.top - divRect.top) - textarea.scrollTop,
    height: Number.parseFloat(style.lineHeight) || 20
  };

  div.remove();
  return result;
}

function getTextareaPositionFromPoint(textarea, clientX, clientY) {
  const nativePosition = getNativeTextareaPositionFromPoint(textarea, clientX, clientY);
  if (nativePosition !== null) return nativePosition;

  const value = textarea.value;
  if (!value) return 0;

  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const caret = getTextareaCaretPosition(textarea, mid);
    if (caret.top + caret.height < clientY) low = mid + 1;
    else high = mid;
  }

  const start = Math.max(0, low - 180);
  const end = Math.min(value.length, low + 180);
  let best = low;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = start; index <= end; index += 1) {
    const caret = getTextareaCaretPosition(textarea, index);
    const dx = caret.left - clientX;
    const dy = caret.top + caret.height / 2 - clientY;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }

  return best;
}

function getNativeTextareaPositionFromPoint(textarea, clientX, clientY) {
  if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(clientX, clientY);
    if (position?.offsetNode === textarea) return clamp(position.offset, 0, textarea.value.length);
  }

  return null;
}

async function openNote(relativePath, options = {}) {
  log("openNote", relativePath);
  if (!state.rootPath || !state.noteByPath.has(relativePath)) return;
  ensureOpenTab(relativePath, "note");
  await activateTab(relativePath, "note", options);
}

async function openAsset(relativePath, options = {}) {
  log("openAsset", relativePath);
  if (!state.rootPath || !isImagePath(relativePath) || !treeEntryExists(state.tree, relativePath, "asset")) return;
  ensureOpenTab(relativePath, "asset");
  await activateTab(relativePath, "asset", options);
}

async function activateTab(relativePath, type, options = {}) {
  if (!state.rootPath || !entryExists(relativePath, type)) return;
  if (state.activePath !== relativePath || state.activeType !== type) {
    await flushActiveNote();
  }
  if (!options.preservePreviewHistory) {
    state.previewHistory = [];
    state.previewForwardHistory = [];
  }

  if (state.find.active) closeFindBar();
  state.activePath = relativePath;
  state.activeType = type;
  state.selectedPath = relativePath;
  state.selectedType = type;
  els.notePath.textContent = relativePath;

  if (type === "note") {
    await checkForExternalNoteChanges({ paths: [relativePath] });
    const content = await resolveNoteContent(relativePath);
    applyNoteContent(relativePath, content, options);
  } else {
    removeLineNumbers()
    state.activeContent = "";
    els.editor.disabled = true;
    els.editor.classList.add("hidden");
    els.formattingBar.classList.add("hidden");
    els.imageViewer.classList.remove("hidden");
    const dataUrl = await globalThis.tektite.readAssetDataUrl(state.rootPath, relativePath);
    els.imageViewerImage.src = dataUrl;
    els.imageViewerImage.alt = relativePath.split("/").pop() || relativePath;
    els.noteTitle.textContent = relativePath.split("/").pop() || relativePath;
    resetEditorHistory("", 0);
    els.preview.innerHTML = `<p class="empty-copy">${escapeHtml(relativePath)}</p><img src="${dataUrl}" alt="${escapeAttr(els.imageViewerImage.alt)}">`;
  }

  renderEditorTabs();
  renderTree();
  updatePreviewNavButtons();
  updateGraph();
  setSaveState(type === "note" ? "Saved" : "Read-only");
  saveWorkspaceState();
}

function applyNoteContent(relativePath, content, options = {}) {
  const cursor = options.preserveCursor ? els.editor.selectionStart : 0;
  state.activeContent = content;
  state.noteContent.set(relativePath, content);
  els.editor.disabled = false;
  els.editor.classList.remove("hidden");
  els.formattingBar.classList.remove("hidden");
  els.imageViewer.classList.add("hidden");
  els.imageViewerImage.removeAttribute("src");
  els.editor.value = content;
  els.noteTitle.textContent = state.noteByPath.get(relativePath)?.title || relativePath;
  const nextCursor = Math.min(cursor, content.length);
  els.editor.setSelectionRange(nextCursor, nextCursor);
  resetEditorHistory(content, nextCursor);
  renderPreview(content);
  if (options.focusEditor !== false) els.editor.focus();
  if (state.showLineNumbers) applyLineNumbers();
  updateCurrentLineHighlight();
}

function openNotePaths() {
  return [...new Set(
    state.openTabs
      .filter((tab) => tab.type === "note")
      .map((tab) => tab.path)
      .filter((path) => state.noteByPath.has(path))
  )];
}

function applyExternalNoteUpdate(update) {
  if (!update || typeof update.path !== "string" || !Number.isFinite(update.modifiedAt)) return;
  const knownModifiedAt = state.noteDiskModifiedAt.get(update.path);
  if (!Number.isFinite(knownModifiedAt)) { state.noteDiskModifiedAt.set(update.path, update.modifiedAt); return; }
  if (update.modifiedAt === knownModifiedAt) { state.externalNoteChanges.delete(update.path); state.ignoredExternalNoteChanges.delete(update.path); return; }
  if (state.ignoredExternalNoteChanges.get(update.path) === update.modifiedAt) return;
  state.externalNoteChanges.set(update.path, update.modifiedAt);
}

async function checkForExternalNoteChanges(options = {}) {
  if (!state.rootPath || externalNoteCheckInFlight) return;
  const paths = Array.isArray(options.paths) && options.paths.length > 0
    ? [...new Set(options.paths.filter((path) => typeof path === "string" && state.noteByPath.has(path)))]
    : openNotePaths();
  if (paths.length === 0) return;

  externalNoteCheckInFlight = true;
  try {
    const updates = await globalThis.tektite.getNoteModifiedTimes(state.rootPath, paths);
    for (const update of updates) applyExternalNoteUpdate(update);
  } finally {
    externalNoteCheckInFlight = false;
  }

  if (options.promptActive && state.activeType === "note" && state.activePath) {
    const reloadedContent = await maybeReloadNoteFromExternalChange(state.activePath);
    if (typeof reloadedContent === "string") {
      applyNoteContent(state.activePath, reloadedContent, { preserveCursor: true });
      setSaveState("Saved");
    }
  }
}

async function resolveNoteContent(relativePath) {
  const reloadedContent = await maybeReloadNoteFromExternalChange(relativePath);
  if (typeof reloadedContent === "string") {
    return reloadedContent;
  }
  const ignoredModifiedAt = state.ignoredExternalNoteChanges.get(relativePath);
  if (Number.isFinite(ignoredModifiedAt) && state.noteContent.has(relativePath)) {
    return state.noteContent.get(relativePath);
  }
  const content = await globalThis.tektite.readNote(state.rootPath, relativePath);
  state.noteContent.set(relativePath, content);
  const knownModifiedAt = state.externalNoteChanges.get(relativePath) ??
    state.noteByPath.get(relativePath)?.modifiedAt;
  if (Number.isFinite(knownModifiedAt)) {
    state.noteDiskModifiedAt.set(relativePath, knownModifiedAt);
  }
  return content;
}

async function maybeReloadNoteFromExternalChange(relativePath) {
  const modifiedAt = state.externalNoteChanges.get(relativePath);
  if (!Number.isFinite(modifiedAt)) return null;

  const message = "This file changed outside Tektite.\n\nLoad changes from disk?";

  if (globalThis.confirm(message)) {
    state.externalNoteChanges.delete(relativePath);
    state.ignoredExternalNoteChanges.delete(relativePath);
    state.noteDiskModifiedAt.set(relativePath, modifiedAt);
    return globalThis.tektite.readNote(state.rootPath, relativePath);
  }

  state.externalNoteChanges.delete(relativePath);
  state.ignoredExternalNoteChanges.set(relativePath, modifiedAt);
  return null;
}

function ensureOpenTab(path, type) {
  const key = tabKey(path, type);
  if (state.openTabs.some((tab) => tab.key === key)) return;
  state.openTabs.push({
    key,
    path,
    type,
    title: tabTitle(path, type)
  });
}

function reconcileOpenTabs() {
  state.openTabs = state.openTabs
    .filter((tab) => entryExists(tab.path, tab.type))
    .map((tab) => ({ ...tab, title: tabTitle(tab.path, tab.type) }));

  if (state.activePath && !entryExists(state.activePath, state.activeType)) {
    state.activePath = null;
    state.activeType = null;
    state.activeContent = "";
  }
}

function renderEditorTabs() {
  els.editorTabs.innerHTML = "";
  els.editorTabs.hidden = state.openTabs.length === 0;

  for (const tab of state.openTabs) {
    const button = document.createElement("button");
    button.className = `editor-tab${tab.path === state.activePath && tab.type === state.activeType ? " active" : ""}`;
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", tab.path === state.activePath && tab.type === state.activeType ? "true" : "false");
    button.title = tab.path;
    button.innerHTML = `
      ${treeIconSvg(tab.type)}
      <span class="editor-tab-label">${escapeHtml(tab.title)}</span>
      <span class="editor-tab-close" role="button" aria-label="Close tab" tabindex="-1">×</span>
    `;
    button.addEventListener("click", (event) => {
      if (event.target.closest(".editor-tab-close")) {
        closeEditorTab(tab.path, tab.type);
        return;
      }
      activateTab(tab.path, tab.type);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onTabContextMenu(event, tab.path, tab.type);
    });
    els.editorTabs.appendChild(button);
  }
}

async function closeEditorTab(path, type) {
  const treeFocused = els.fileTree === document.activeElement || els.fileTree.contains(document.activeElement);
  const closingActive = path === state.activePath && type === state.activeType;
  if (closingActive) await flushActiveNote();

  const index = state.openTabs.findIndex((tab) => tab.path === path && tab.type === type);
  if (index < 0) return;
  state.openTabs.splice(index, 1);

  if (!closingActive) {
    renderEditorTabs();
    saveWorkspaceState();
    return;
  }

  const nextIndex = Math.min(index, state.openTabs.length - 1);
  const nextTab = nextIndex === -1 ? undefined : state.openTabs[nextIndex];
  if (nextTab) {
    await activateTab(nextTab.path, nextTab.type, { focusEditor: !treeFocused });
    if (treeFocused) els.fileTree.focus();
  } else {
    showEmptyState("Select or create a note.");
    if (treeFocused) els.fileTree.focus();
  }
  saveWorkspaceState();
}

function closeActiveEditorTab() {
  if (!state.activePath || !state.activeType) return;
  closeEditorTab(state.activePath, state.activeType);
}

async function closeAllEditorTabs() {
  if (state.openTabs.length === 0) return;
  await flushActiveNote();
  showEmptyState("Select or create a note.");
}

function isActiveNoteDirty() {
  if (state.activeType !== "note" || !state.activePath) return false;
  return els.editor.value !== (state.noteContent.get(state.activePath) || "");
}

async function flushActiveNote() {
  if (state.activeType !== "note" || !state.activePath) return;
  if (!isActiveNoteDirty()) {
    clearTimeout(state.saveTimer);
    state.activeContent = els.editor.value;
    return;
  }
  state.activeContent = els.editor.value;
  clearTimeout(state.saveTimer);
  await saveActiveNote();
}

function tabKey(path, type) {
  return `${type}:${path}`;
}

function tabTitle(path, type) {
  if (type === "note" && state.noteByPath.has(path)) {
    const note = state.noteByPath.get(path);
    return state.showFileExtensions ? note.name : note.title;
  }
  return path.split("/").pop() || path;
}

function onEditorInput() {
  if (state.activeType !== "note") return;
  if (state.editorHistory.restoring) return;
  state.activeContent = els.editor.value;
  renderPreview(state.activeContent);
  updateMentionMenu();
  recordEditorHistory();
  setSaveState("Unsaved");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveActiveNote, 450);
  if (state.find.active) updateFindMatches();
  if (state.showLineNumbers) renderLineNumbers();
}

function resetEditorHistory(content, cursor = 0) {
  state.editorHistory = {
    path: state.activePath,
    stack: [{
      content,
      selectionStart: cursor,
      selectionEnd: cursor
    }],
    index: 0,
    restoring: false
  };
}

function recordEditorHistory() {
  if (state.activeType !== "note" || !state.activePath || state.editorHistory.restoring) return;
  if (state.editorHistory.path !== state.activePath) {
    resetEditorHistory(els.editor.value, els.editor.selectionStart);
    return;
  }

  const snapshot = {
    content: els.editor.value,
    selectionStart: els.editor.selectionStart,
    selectionEnd: els.editor.selectionEnd
  };
  const current = state.editorHistory.stack[state.editorHistory.index];
  if (current?.content === snapshot.content && current.selectionStart === snapshot.selectionStart && current.selectionEnd === snapshot.selectionEnd) {
    return;
  }

  state.editorHistory.stack = state.editorHistory.stack.slice(0, state.editorHistory.index + 1);
  state.editorHistory.stack.push(snapshot);
  if (state.editorHistory.stack.length > 300) {
    state.editorHistory.stack.shift();
  }
  state.editorHistory.index = state.editorHistory.stack.length - 1;
}

function restoreEditorHistory(delta) {
  if (state.activeType !== "note" || !state.activePath || state.editorHistory.path !== state.activePath) return;
  const nextIndex = state.editorHistory.index + delta;
  if (nextIndex < 0 || nextIndex >= state.editorHistory.stack.length) return;

  const snapshot = state.editorHistory.stack[nextIndex];
  state.editorHistory.index = nextIndex;
  state.editorHistory.restoring = true;
  els.editor.value = snapshot.content;
  els.editor.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  state.activeContent = snapshot.content;
  renderPreview(state.activeContent);
  updateGraph();
  setSaveState("Unsaved");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveActiveNote, 450);
  state.editorHistory.restoring = false;
}

function onFindBarKeydown(event) {
  if (!state.find.active) return false;
  if (event.key === "Enter") {
    event.preventDefault();
    navigateFind(event.shiftKey ? -1 : 1);
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeFindBar();
    return true;
  }
  return false;
}

function toggleInlineFormat(prefix, suffix, placeholder) {
  const value = els.editor.value;
  const start = els.editor.selectionStart;
  const end = els.editor.selectionEnd;
  const selected = value.substring(start, end);
  const pLen = prefix.length;
  const sLen = suffix.length;

  if (selected) {
    const isWrapped = selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length > pLen + sLen;
    if (isWrapped) {
      const inner = selected.slice(pLen, -sLen);
      els.editor.value = value.substring(0, start) + inner + value.substring(end);
      els.editor.selectionStart = start;
      els.editor.selectionEnd = start + inner.length;
    } else {
      const wrapped = `${prefix}${selected}${suffix}`;
      els.editor.value = value.substring(0, start) + wrapped + value.substring(end);
      els.editor.selectionStart = start;
      els.editor.selectionEnd = start + wrapped.length;
    }
  } else {
    const snippet = `${prefix}${placeholder}${suffix}`;
    els.editor.value = value.substring(0, start) + snippet + value.substring(end);
    els.editor.selectionStart = start + pLen;
    els.editor.selectionEnd = start + pLen + placeholder.length;
  }
  onEditorInput();
}

function toggleHeading(level) {
  const value = els.editor.value;
  const start = els.editor.selectionStart;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", start);
  const blockEnd = lineEnd === -1 ? value.length : lineEnd;
  const line = value.substring(lineStart, blockEnd);
  const prefix = "#".repeat(level) + " ";
  const existingHeading = line.match(/^(#{1,6}) /);
  let updated;
  if (existingHeading?.[1] === "#".repeat(level)) {
    updated = line.slice(prefix.length);
  } else if (existingHeading) {
    updated = prefix + line.slice(existingHeading[0].length);
  } else {
    updated = prefix + line;
  }
  const newCursor = lineStart + updated.length;
  els.editor.value = value.substring(0, lineStart) + updated + value.substring(blockEnd);
  els.editor.selectionStart = els.editor.selectionEnd = Math.min(newCursor, lineStart + updated.length);
  onEditorInput();
}

function insertSeparator() {
  const value = els.editor.value;
  const start = els.editor.selectionStart;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const atLineStart = start === lineStart;
  const insert = atLineStart ? "---\n" : "\n---\n";
  const pos = atLineStart ? lineStart : start;
  els.editor.value = value.substring(0, pos) + insert + value.substring(pos);
  els.editor.selectionStart = els.editor.selectionEnd = pos + insert.length;
  onEditorInput();
}

function urlFilename(url) {
  const segment = url.replace(/[?#].*$/, "").split("/").findLast(Boolean) || "link";
  return segment.replace(/\.[^.]+$/, "") || "link";
}

function looksLikeUrl(text) {
  if (/\s/.test(text)) return false;
  return /^https?:\/\//i.test(text) ||
    text.startsWith("//") ||
    /^\.{0,2}\//.test(text) ||
    /^[a-zA-Z0-9][a-zA-Z0-9._\-/]*\.[a-zA-Z]{2,}(\/.*)?$/.test(text);
}

function insertMarkdownLink(isImage) {
  const value = els.editor.value;
  const start = els.editor.selectionStart;
  const end = els.editor.selectionEnd;
  const selected = value.substring(start, end);
  let snippet;
  if (selected && looksLikeUrl(selected)) {
    const label = urlFilename(selected);
    snippet = isImage ? `![${label}](${selected})` : `[${label}](${selected})`;
  } else {
    snippet = isImage ? "![Image](url)" : "[Link text](url)";
  }
  els.editor.value = value.substring(0, start) + snippet + value.substring(end);
  els.editor.selectionStart = els.editor.selectionEnd = start + snippet.length;
  onEditorInput();
}

function insertTable() {
  const value = els.editor.value;
  const start = els.editor.selectionStart;
  const end = els.editor.selectionEnd;
  const table = [
    "| Column 1 | Column 2 | Column 3 |",
    "| --- | --- | --- |",
    "| Cell 1 | Cell 2 | Cell 3 |",
    "| Cell 4 | Cell 5 | Cell 6 |",
    "| Cell 7 | Cell 8 | Cell 9 |"
  ].join("\n");
  const prefix = start > 0 && value[start - 1] !== "\n" ? "\n\n" : "";
  const suffix = value[end] && value[end] !== "\n" ? "\n\n" : "\n";
  const insert = `${prefix}${table}${suffix}`;

  els.editor.value = value.substring(0, start) + insert + value.substring(end);
  els.editor.selectionStart = start + prefix.length;
  els.editor.selectionEnd = start + prefix.length + table.length;
  onEditorInput();
}

function insertTableOfContents(options = {}) {
  if (state.activeType !== "note" || !state.activePath) return;
  const markdown = tableOfContentsMarkdown();
  if (!markdown) return;

  if (options.replaceMention && state.mention.active) {
    const rangeStart = state.mention.start;
    const rangeEnd = els.editor.selectionStart;
    closeMentionMenu();
    insertMarkdownAtRange(markdown, rangeStart, rangeEnd);
    return;
  }

  insertEditorMarkdown(markdown);
}

function tableOfContentsMarkdown() {
  const folderPath = activeFolder();
  const folderNode = folderPath ? findTreeNode(state.tree, folderPath) : state.tree;
  if (!folderNode) return "";
  const includeSubfolders = Boolean(state.settings.tocIncludeSubfolders);
  const lines = tocLinesForFolder(folderNode, 0, includeSubfolders);
  return lines.join("\n");
}

function tocLinesForFolder(folderNode, depth, includeSubfolders) {
  const lines = tocNoteLines(folderNode, depth);
  if (!includeSubfolders) return lines;
  for (const folder of sortedChildFolders(folderNode)) {
    const childLines = tocLinesForFolder(folder, depth + 1, true);
    if (!childLines.length) continue;
    lines.push(tocFolderLine(folder, depth, lines.length), ...childLines);
  }
  return lines;
}

function tocNoteLines(folderNode, depth) {
  return sortedChildNotes(folderNode).map((note, index) => {
    const label = state.showFileExtensions ? note.name : note.title;
    const link = relativeMarkdownLink(state.activePath, note.path);
    return `${tocIndent(depth)}${tocMarker(index)} [${label}](${link})`;
  });
}

function tocFolderLine(folder, depth, index) {
  return `${tocIndent(depth)}${tocMarker(index)} ${folder.name}`;
}

function tocMarker(index) {
  return state.settings.tocListStyle === "ordered" ? `${index + 1}.` : "-";
}

function tocIndent(depth) {
  return "  ".repeat(depth);
}

function sortedChildNotes(folderNode) {
  return childNodesOfType(folderNode, "note")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function sortedChildFolders(folderNode) {
  return childNodesOfType(folderNode, "folder")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function childNodesOfType(folderNode, type) {
  const children = Array.isArray(folderNode?.children) ? folderNode.children : [];
  return children.filter((child) => child.type === type);
}

function toggleListOnLines(kind = "ul") {
  const value = els.editor.value;
  const start = els.editor.selectionStart;
  const end = els.editor.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end === start ? end : end - 1);
  const blockEnd = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.substring(lineStart, blockEnd).split("\n");
  const isOrdered = kind === "ol";
  const listPattern = isOrdered ? /^\d+\.\s+/ : /^[-*+]\s+/;
  const allList = lines.every((l) => l.trim() === "" || listPattern.test(l));
  const toggled = allList
    ? lines.map((l) => l.replace(listPattern, "")).join("\n")
    : lines.map((l, index) => {
      if (l.trim() === "") return l;
      return isOrdered ? `${index + 1}. ${l.replace(/^[-*+]\s+/, "")}` : `- ${l.replace(/^\d+\.\s+/, "")}`;
    }).join("\n");
  els.editor.value = value.substring(0, lineStart) + toggled + value.substring(blockEnd);
  els.editor.selectionStart = lineStart;
  els.editor.selectionEnd = lineStart + toggled.length;
  onEditorInput();
}

function indentSelectedLines() {
  const start = els.editor.selectionStart;
  const end = els.editor.selectionEnd;
  const value = els.editor.value;
  if (value.substring(start, end).includes("\n")) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const block = value.substring(lineStart, end);
    const indented = block.replace(/^/gm, "\t");
    els.editor.value = value.substring(0, lineStart) + indented + value.substring(end);
    els.editor.selectionStart = lineStart;
    els.editor.selectionEnd = lineStart + indented.length;
  } else {
    els.editor.value = value.substring(0, start) + "\t" + value.substring(end);
    els.editor.selectionStart = els.editor.selectionEnd = start + 1;
  }
  onEditorInput();
}

function onEditorKeydown(event) {
  if (onFindBarKeydown(event)) return;
  if (onInlineFormatShortcut(event)) return;

  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "Digit8") {
    event.preventDefault();
    toggleListOnLines("ul");
    return;
  }

  if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !state.mention.active) {
    event.preventDefault();
    indentSelectedLines();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && key === "z") {
    event.preventDefault();
    restoreEditorHistory(event.shiftKey ? 1 : -1);
    return;
  }
  if ((event.metaKey || event.ctrlKey) && key === "y") {
    event.preventDefault();
    restoreEditorHistory(1);
    return;
  }

  if (state.mention.active) onMentionMenuKeydown(event);
}

function onInlineFormatShortcut(event) {
  if (!(event.metaKey || event.ctrlKey) || event.shiftKey || !hasEditorSelection()) return false;
  const key = event.key.toLowerCase();
  if (key === "b") {
    event.preventDefault();
    toggleInlineFormat("**", "**", "bold text");
    return true;
  }
  if (key === "i") {
    event.preventDefault();
    toggleInlineFormat("*", "*", "italic text");
    return true;
  }
  return false;
}

function hasEditorSelection() {
  return state.activeType === "note" &&
    document.activeElement === els.editor &&
    els.editor.selectionStart !== els.editor.selectionEnd;
}

function onMentionMenuKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.mention.selectedIndex = Math.min(
      state.mention.selectedIndex + 1,
      state.mention.items.length + MENTION_ACTION_COUNT - 1
    );
    renderMentionMenu();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    state.mention.selectedIndex = Math.max(state.mention.selectedIndex - 1, 0);
    renderMentionMenu();
  } else if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    if (state.mention.selectedIndex === 0) createMentionNode();
    else if (state.mention.selectedIndex === 1) insertTableOfContents({ replaceMention: true });
    else insertMentionLink(state.mention.items[state.mention.selectedIndex - MENTION_ACTION_COUNT]);
  } else if (event.key === "Escape") {
    event.preventDefault();
    closeMentionMenu();
  }
}

async function saveActiveNote() {
  if (!state.rootPath || state.activeType !== "note" || !state.activePath) return;
  state.activeContent = els.editor.value;
  if (!isActiveNoteDirty()) {
    setSaveState("Saved");
    return;
  }
  setSaveState("Saving...");
  const savedNote = await globalThis.tektite.writeNote(state.rootPath, state.activePath, state.activeContent);
  state.noteContent.set(state.activePath, state.activeContent);
  if (Number.isFinite(savedNote?.modifiedAt)) {
    state.noteDiskModifiedAt.set(state.activePath, savedNote.modifiedAt);
  }
  state.externalNoteChanges.delete(state.activePath);
  state.ignoredExternalNoteChanges.delete(state.activePath);
  setSaveState("Saved");
  const vault = await globalThis.tektite.scanVault(state.rootPath);
  if (!vault.ok) {
    handleUnavailableVault(vault);
    return;
  }
  state.tree = vault.tree;
  state.notes = vault.notes;
  indexNotes();
  reconcileOpenTabs();
  renderTags();
  renderEditorTabs();
  renderTree();
  updateGraph();
}

function showEmptyState(message = "Choose a local folder to start.") {
  state.activePath = null;
  state.activeType = null;
  state.activeContent = "";
  state.openTabs = [];
  state.noteDiskModifiedAt.clear();
  state.externalNoteChanges.clear();
  state.ignoredExternalNoteChanges.clear();
  state.previewHistory = [];
  state.previewForwardHistory = [];
  state.hasGitRepo = false;
  state.gitProvider = null;
  state.tags = [];
  els.tagCloud.innerHTML = "";
  els.editor.value = "";
  els.editor.disabled = true;
  els.editor.classList.remove("hidden");
  els.formattingBar.classList.add("hidden");
  els.imageViewer.classList.add("hidden");
  els.imageViewerImage.removeAttribute("src");
  resetEditorHistory("", 0);
  els.noteTitle.textContent = "Open a vault";
  els.notePath.textContent = message;
  els.preview.innerHTML = `<p class="empty-copy">${escapeHtml(message)}</p>`;
  renderEditorTabs();
  updateGitSyncButton();
  updatePreviewNavButtons();
  updateGraph();
  renderLineNumbers();
  saveWorkspaceState();
}

function handleUnavailableVault(result) {
  if (result?.code === "VAULT_NOT_FOUND") {
    setSaveState("Idle");
    return;
  }

  showEmptyState(result?.message || "Could not open vault.");
  setSaveState("Failed");
}

function showGitOutputDialog(output) {
  els.gitOutputText.textContent = output;
  setGitOutputCloseState(state.gitSyncInProgress);
  els.gitOutputDialog.setAttribute("open", "");
  els.gitOutputDialog.classList.remove("hidden");
}

function setGitOutputCloseState(syncing) {
  els.closeGitOutputButton.disabled = syncing;
  els.closeGitOutputButton.textContent = syncing ? "Syncing..." : "Close";
  els.closeGitOutputXButton.disabled = syncing;
}

function appendGitOutput(text) {
  els.gitOutputText.textContent += text;
  els.gitOutputText.scrollTop = els.gitOutputText.scrollHeight;
}

function onGitSyncOutput(payload) {
  if (!payload || typeof payload !== "object") return;
  if (typeof payload.text === "string") appendGitOutput(payload.text);
}

function clearGitOutputSubscription() {
  if (!state.gitOutputUnsubscribe) return;
  state.gitOutputUnsubscribe();
  state.gitOutputUnsubscribe = null;
}

function onGlobalEscape() {
  closeTreeContextMenu();
  if (!els.nameDialog.classList.contains("hidden")) closeNameDialog(null);
  if (!els.moveDialog.classList.contains("hidden")) closeMoveDialog(null);
  if (!els.gitOutputDialog.classList.contains("hidden")) closeGitOutputDialog();
  if (!els.settingsDialog.classList.contains("hidden")) closeSettingsDialog();
  if (state.find.active) closeFindBar();
}

function closeGitOutputDialog() {
  els.gitOutputDialog.classList.add("hidden");
  els.gitOutputDialog.removeAttribute("open");
}

function openSettingsDialog() {
  state.settings = normalizeSettings(state.settings);
  els.templatesPathInput.value = state.settings.templatesPath || "";
  els.autoLinkUrlsCheckbox.checked = Boolean(state.settings.autoLinkUrls);
  els.tocOrderedRadio.checked = state.settings.tocListStyle === "ordered";
  els.tocUnorderedRadio.checked = state.settings.tocListStyle !== "ordered";
  els.tocIncludeSubfoldersCheckbox.checked = Boolean(state.settings.tocIncludeSubfolders);
  els.treeFontSizeInput.value = state.settings.treeFontSize;
  els.editorFontSizeInput.value = state.settings.editorFontSize;
  els.settingsDialog.setAttribute("open", "");
  els.settingsDialog.classList.remove("hidden");
  requestAnimationFrame(() => els.templatesPathInput.focus());
}

function closeSettingsDialog() {
  els.settingsDialog.classList.add("hidden");
  els.settingsDialog.removeAttribute("open");
}

async function onSettingsSubmit(event) {
  event.preventDefault();
  const templatesPath = els.templatesPathInput.value.trim();
  const autoLinkUrls = els.autoLinkUrlsCheckbox.checked;
  const tocListStyle = els.tocOrderedRadio.checked ? "ordered" : "unordered";
  const tocIncludeSubfolders = els.tocIncludeSubfoldersCheckbox.checked;
  const treeFontSize = Number(els.treeFontSizeInput.value) || 13;
  const editorFontSize = Number(els.editorFontSizeInput.value) || 15;
  state.settings = normalizeSettings({ templatesPath, autoLinkUrls, tocListStyle, tocIncludeSubfolders, treeFontSize, editorFontSize });
  applyFontSizes();
  if (state.rootPath) {
    await globalThis.tektite.saveSettings(state.rootPath, state.settings).catch(() => {});
  }
  closeSettingsDialog();
}

function normalizeSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return {
    templatesPath: typeof source.templatesPath === "string" ? source.templatesPath : "",
    autoLinkUrls: Boolean(source.autoLinkUrls),
    tocListStyle: source.tocListStyle === "ordered" ? "ordered" : "unordered",
    tocIncludeSubfolders: Boolean(source.tocIncludeSubfolders),
    treeFontSize: Number.isFinite(source.treeFontSize) ? Math.min(24, Math.max(8, source.treeFontSize)) : 13,
    editorFontSize: Number.isFinite(source.editorFontSize) ? Math.min(32, Math.max(8, source.editorFontSize)) : 15
  };
}

function applyFontSizes() {
  const root = document.documentElement;
  root.style.setProperty("--tree-font-size", `${state.settings.treeFontSize}px`);
  root.style.setProperty("--editor-font-size", `${state.settings.editorFontSize}px`);
}

async function restoreWorkspaceState() {
  const workspace = await loadWorkspaceState();
  if (!workspace) return false;

  const tabs = sanitizeSavedTabs(workspace.openTabs);
  if (tabs.length === 0) return false;

  state.openTabs = tabs.map((tab) => ({
    key: tabKey(tab.path, tab.type),
    path: tab.path,
    type: tab.type,
    title: tabTitle(tab.path, tab.type)
  }));

  const active = tabs.find((tab) => tab.path === workspace.activePath && tab.type === workspace.activeType) || tabs[0];
  await activateTab(active.path, active.type, { preserveCursor: true });
  return true;
}

async function loadWorkspaceState() {
  if (!state.rootPath) return null;
  try {
    const persisted = await globalThis.tektite.loadWorkspaceState(state.rootPath);
    if (persisted?.workspace && typeof persisted.workspace === "object") return persisted.workspace;
  } catch {}

  try {
    const workspace = JSON.parse(localStorage.getItem(workspaceStorageKey()) || "null");
    if (!workspace || typeof workspace !== "object") return null;
    return workspace;
  } catch {
    return null;
  }
}

function sanitizeSavedTabs(tabs) {
  if (!Array.isArray(tabs)) return [];

  const seen = new Set();
  return tabs
    .filter((tab) => tab && typeof tab.path === "string" && (tab.type === "note" || tab.type === "asset"))
    .filter((tab) => entryExists(tab.path, tab.type))
    .filter((tab) => {
      const key = tabKey(tab.path, tab.type);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function saveWorkspaceState() {
  if (!state.rootPath) return;

  const tabs = state.openTabs
    .filter((tab) => entryExists(tab.path, tab.type))
    .map((tab) => ({ path: tab.path, type: tab.type }));

  const workspace = {
    openTabs: tabs,
    activePath: state.activePath,
    activeType: state.activeType,
    selectedPath: state.selectedPath,
    selectedType: state.selectedType
  };

  localStorage.setItem(workspaceStorageKey(), JSON.stringify(workspace));
  globalThis.tektite.saveWorkspaceState(state.rootPath, workspace).catch(() => {});
}

function workspaceStorageKey() {
  return `${WORKSPACE_STORAGE_PREFIX}${state.rootPath}`;
}

function indexNotes() {
  state.noteByPath = new Map(state.notes.map((note) => [note.path, note]));
  state.noteByTitle = new Map();

  for (const note of state.notes) {
    const aliases = new Set([
      note.title.toLowerCase(),
      note.path.toLowerCase(),
      note.path.replace(/\.md$/i, "").toLowerCase()
    ]);
    aliases.forEach((alias) => state.noteByTitle.set(alias, note));
  }
}

async function loadGraphContent() {
  log("loadGraphContent start", state.notes.length);
  const nextContent = new Map();
  const nextModifiedAt = new Map();
  await Promise.all(
    state.notes.map(async (note) => {
      try {
        nextContent.set(note.path, await globalThis.tektite.readNote(state.rootPath, note.path));
      } catch {
        nextContent.set(note.path, "");
      }
      if (Number.isFinite(note.modifiedAt)) nextModifiedAt.set(note.path, note.modifiedAt);
    })
  );
  state.noteContent = nextContent;
  state.noteDiskModifiedAt = nextModifiedAt;
  state.externalNoteChanges.clear();
  state.ignoredExternalNoteChanges.clear();
  log("loadGraphContent complete");
}

function renderTree() {
  if (!state.tree) {
    els.fileTree.innerHTML = "";
    return;
  }

  const query = els.searchInput.value.trim().toLowerCase();
  els.fileTree.innerHTML = "";
  const fragment = document.createDocumentFragment();
  fragment.appendChild(renderVaultRootDropRow());
  const children = Array.isArray(state.tree.children) ? state.tree.children : [];
  for (const child of children) {
    const node = renderTreeNode(child, query);
    if (node) fragment.appendChild(node);
  }
  els.fileTree.appendChild(fragment);
}

function renderVaultRootDropRow() {
  const button = document.createElement("button");
  button.className = "tree-row vault-root-row";
  button.type = "button";
  button.dataset.path = "";
  button.dataset.type = "folder";
  button.innerHTML = `${treeIconSvg("folder")}<span class="tree-label">${escapeHtml(state.tree.name || "Vault")}</span>`;
  button.addEventListener("click", () => toggleFolder(""));
  return button;
}

function treeIconSvg(kind) {
  if (kind === "note") {
    return `<span class="tree-kind-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M39.5 15.5h-9a2 2 0 0 1-2-2v-9h-18a2 2 0 0 0-2 2v35a2 2 0 0 0 2 2h27a2 2 0 0 0 2-2Z"></path><path d="M28.5 4.5 39.5 15.5"></path></svg></span>`;
  }
  if (kind === "asset") {
    return `<span class="tree-kind-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="m8 15 2.2-2.2a1.2 1.2 0 0 1 1.7 0L15 16"></path><path d="m14 14 1-1a1.2 1.2 0 0 1 1.7 0L20 16.3"></path><path d="M8.5 9.5h.01"></path></svg></span>`;
  }
  return `<span class="tree-kind-icon tree-folder-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M28 11v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6c3 0 3 3 5 3h9a2 2 0 0 1 2 2z"></path></svg></span>`;
}

function renderTreeNode(node, query) {
  if (node.type === "note" || node.type === "asset") return renderTreeLeafNode(node, query);
  return renderTreeFolderNode(node, query);
}

function renderTreeLeafNode(node, query) {
  const label = displayNoteLabel(node);
  if (query && !treeLeafMatchesQuery(node, query)) {
    return null;
  }

  const button = document.createElement("button");
  button.className = `tree-row tree-leaf-row${isSelected(node.path, node.type) ? " selected" : ""}${node.path === state.activePath ? " active" : ""}`;
  button.type = "button";
  button.draggable = true;
  button.dataset.path = node.path;
  button.dataset.type = node.type;
  button.innerHTML = `<span class="tree-caret-spacer" aria-hidden="true"></span>${treeIconSvg(node.type)}<span class="tree-label">${escapeHtml(label)}</span>`;
  button.addEventListener("click", () => {
    if (node.type === "note") openNote(node.path, { focusEditor: false });
    else openAsset(node.path, { focusEditor: false });
    els.fileTree.focus();
  });
  return button;
}

function treeLeafMatchesQuery(node, query) {
  const searchableLabel = `${node.title || ""} ${node.name || ""} ${node.path || ""}`.toLowerCase();
  if (searchableLabel.includes(query)) return true;
  if (node.type !== "note") return false;

  const content = noteContentForSearch(node.path);
  return content.toLowerCase().includes(query);
}

function noteContentForSearch(notePath) {
  if (notePath === state.activePath && state.activeType === "note") return state.activeContent;
  return state.noteContent.get(notePath) || "";
}

function renderTags() {
  state.tags = collectVaultTags();
  els.tagCloud.innerHTML = "";

  if (state.tags.length === 0) {
    els.tagCloud.innerHTML = `<p class="tag-empty">No tags yet</p>`;
    return;
  }

  for (const tag of state.tags) {
    const button = document.createElement("button");
    button.className = "tag-chip";
    button.type = "button";
    button.textContent = tag;
    button.addEventListener("click", () => {
      els.searchInput.value = els.searchInput.value == tag ? "" : tag;
      renderTree();
      els.searchInput.focus();
    });
    els.tagCloud.appendChild(button);
  }
}

function collectVaultTags() {
  const tags = new Map();
  for (const note of state.notes) {
    const content = noteContentForSearch(note.path);
    for (const tag of extractTags(content)) {
      const key = tag.toLowerCase();
      if (!tags.has(key)) tags.set(key, tag);
    }
  }

  return [...tags.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function extractTags(markdown) {
  const tags = [];
  const pattern = /(^|\s)#([A-Za-z0-9][A-Za-z0-9_-]*)/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    tags.push(`#${match[2]}`);
  }
  return tags;
}

function renderTreeFolderNode(node, query) {
  const childNodes = Array.isArray(node.children) ? node.children : [];
  const renderedChildren = childNodes.map((child) => renderTreeNode(child, query)).filter(Boolean);
  if (query && renderedChildren.length === 0) return null;
  const isCollapsed = !query && state.collapsedFolders.has(node.path);

  const wrap = document.createElement("div");
  const header = document.createElement("div");
  header.className = `tree-row${isSelected(node.path, "folder") ? " selected" : ""}`;
  header.setAttribute("aria-expanded", String(!isCollapsed));
  header.draggable = Boolean(node.path);
  header.dataset.path = node.path;
  header.dataset.type = "folder";

  const toggle = document.createElement("button");
  toggle.className = "tree-caret-button";
  toggle.type = "button";
  toggle.setAttribute("aria-label", isCollapsed ? "Expand folder" : "Collapse folder");
  toggle.innerHTML = `<span class="tree-caret" aria-hidden="true">${isCollapsed ? "▸" : "▾"}</span>`;
  toggle.addEventListener("click", () => { toggleFolder(node.path); els.fileTree.focus(); });

  const label = document.createElement("button");
  label.className = "tree-label-button";
  label.type = "button";
  label.innerHTML = `${treeIconSvg("folder")}<span class="tree-label">${escapeHtml(node.name)}</span>`;
  label.addEventListener("click", () => { selectEntry(node.path, "folder"); toggleFolder(node.path); els.fileTree.focus(); });

  header.append(toggle, label);
  const children = document.createElement("div");
  children.className = "tree-children";
  children.hidden = isCollapsed;
  renderedChildren.forEach((child) => children.appendChild(child));
  wrap.append(header, children);
  return wrap;
}

function onTreeContextMenu(event) {
  event.preventDefault();
  const context = contextFromTreeTarget(event.target);
  if (context.type !== "folder") selectEntry(context.path, context.type);
  openTreeContextMenu(event.clientX, event.clientY, context);
}

function contextFromTreeTarget(target) {
  const row = target.closest?.("[data-path][data-type]");
  if (!row) return { path: targetFolder(), type: "folder" };
  return {
    path: row.dataset.path || "",
    type: row.dataset.type || "folder"
  };
}

function collectFolderPaths(node, rootPath) {
  const paths = [];
  if (node?.type !== "folder") return paths;
  if (node.path !== "" || rootPath === "") paths.push(node.path);
  for (const child of node.children || []) {
    if (child.type === "folder") paths.push(...collectFolderPaths(child, rootPath));
  }
  return paths;
}

function expandAllFolders(context) {
  const startNode = context.path === ""
    ? state.tree
    : findTreeNode(state.tree, context.path);
  if (!startNode) return;
  for (const p of collectFolderPaths(startNode, context.path)) {
    state.collapsedFolders.delete(p);
  }
  saveCollapsedFolders();
  renderTree();
}

function collapseAllFolders(context) {
  const startNode = context.path === ""
    ? state.tree
    : findTreeNode(state.tree, context.path);
  if (!startNode) return;
  for (const p of collectFolderPaths(startNode, context.path)) {
    state.collapsedFolders.add(p);
  }
  saveCollapsedFolders();
  renderTree();
}

function openTreeContextMenu(x, y, context) {
  const isFolder = context.type === "folder";
  const items = [
    {
      label: "New node",
      shortcut: "⇧⌘N",
      action: () => createNote(context)
    },
    {
      label: "New folder",
      shortcut: "⇧⌘F",
      action: () => createFolder(context)
    }
  ];

  if (isFolder || context.path === "") {
    items.push(
      { type: "separator" },
      { label: "Expand All", action: () => expandAllFolders(context) },
      { label: "Collapse All", action: () => collapseAllFolders(context) }
    );
  }

  if (context.path) {
    items.push(
      { type: "separator" },
      {
        label: isFolder ? "Rename folder" : "Rename file",
        shortcut: "⇧⌘R",
        action: () => renameSelectedEntry(context)
      },
      {
        label: "Move...",
        action: () => moveSelectedEntry(context)
      },
      {
        label: isFolder ? "Delete folder" : "Delete file",
        shortcut: "⌘⌫",
        danger: true,
        action: () => deleteSelectedEntry(context)
      }
    );
  }

  showContextMenu(x, y, items);
}

function showContextMenu(x, y, items) {
  els.treeContextMenu.innerHTML = "";
  for (const item of items) {
    if (item.type === "separator") {
      const separator = document.createElement("div");
      separator.className = "context-menu-separator";
      els.treeContextMenu.appendChild(separator);
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = `context-menu-item${item.danger ? " danger" : ""}`;
    const shortcutHtml = item.shortcut ? `<span class="context-menu-shortcut">${escapeHtml(item.shortcut)}</span>` : "";
    button.innerHTML = `<span>${escapeHtml(item.label)}</span>${shortcutHtml}`;
    button.addEventListener("click", () => {
      closeTreeContextMenu();
      item.action();
    });
    els.treeContextMenu.appendChild(button);
  }

  els.treeContextMenu.classList.remove("hidden");
  const rect = els.treeContextMenu.getBoundingClientRect();
  els.treeContextMenu.style.left = `${Math.min(x, globalThis.innerWidth - rect.width - 8)}px`;
  els.treeContextMenu.style.top = `${Math.min(y, globalThis.innerHeight - rect.height - 8)}px`;
}

function closeTreeContextMenu() {
  els.treeContextMenu.classList.add("hidden");
}

function onTabContextMenu(event, path, type) {
  openTabContextMenu(event.clientX, event.clientY, path, type);
}

function openTabContextMenu(x, y, path, type) {
  closeTreeContextMenu();
  const items = [
    { label: "Close Tab", shortcut: "⌘W", action: () => closeEditorTab(path, type) },
    { type: "separator" },
    { label: "Close All Tabs", action: closeAllEditorTabs }
  ];
  showTabContextMenu(x, y, items);
}

function showTabContextMenu(x, y, items) {
  els.tabContextMenu.innerHTML = "";
  for (const item of items) {
    if (item.type === "separator") {
      const separator = document.createElement("div");
      separator.className = "context-menu-separator";
      els.tabContextMenu.appendChild(separator);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = `context-menu-item${item.danger ? " danger" : ""}`;
    const shortcutHtml = item.shortcut ? `<span class="context-menu-shortcut">${escapeHtml(item.shortcut)}</span>` : "";
    button.innerHTML = `<span>${escapeHtml(item.label)}</span>${shortcutHtml}`;
    button.addEventListener("click", () => {
      closeTabContextMenu();
      item.action();
    });
    els.tabContextMenu.appendChild(button);
  }

  els.tabContextMenu.classList.remove("hidden");
  const rect = els.tabContextMenu.getBoundingClientRect();
  els.tabContextMenu.style.left = `${Math.min(x, globalThis.innerWidth - rect.width - 8)}px`;
  els.tabContextMenu.style.top = `${Math.min(y, globalThis.innerHeight - rect.height - 8)}px`;
}

function closeTabContextMenu() {
  els.tabContextMenu.classList.add("hidden");
}

function getVisibleTreeRows() {
  return Array.from(els.fileTree.querySelectorAll(".tree-row")).filter(
    (el) => !el.closest(".tree-children[hidden]")
  );
}

function onTreeNavKeydown(event, rows, currentIdx) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    const next = rows[currentIdx + 1] || rows[0];
    activateTreeRow(next.dataset.path, next.dataset.type || "folder");
    next.scrollIntoView({ block: "nearest" });
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    const prev = rows[currentIdx - 1] || rows.at(-1);
    activateTreeRow(prev.dataset.path, prev.dataset.type || "folder");
    prev.scrollIntoView({ block: "nearest" });
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    if (state.selectedType === "folder" && state.collapsedFolders.has(state.selectedPath)) {
      toggleFolder(state.selectedPath);
    }
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (state.selectedType === "folder" && !state.collapsedFolders.has(state.selectedPath)) {
      toggleFolder(state.selectedPath);
    }
  } else if (event.key === "Enter") {
    event.preventDefault();
    activateTreeRow(state.selectedPath, state.selectedType, { toggle: true });
  }
}

function onTreeKeydown(event) {
  if (event.key === "Tab" && !event.shiftKey) {
    event.preventDefault();
    els.editor.focus();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Backspace") {
    event.preventDefault();
    if (state.selectedPath) deleteSelectedEntry(currentSelection());
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyF") {
    event.preventDefault();
    createFolder(currentSelection());
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyR") {
    event.preventDefault();
    if (state.selectedPath) renameSelectedEntry(currentSelection());
    return;
  }
  const rows = getVisibleTreeRows();
  if (!rows.length) return;
  const currentIdx = rows.findIndex((el) => el.dataset.path === state.selectedPath);
  onTreeNavKeydown(event, rows, currentIdx);
}

function activateTreeRow(path, type, { toggle = false } = {}) {
  if (type === "note") openNote(path, { focusEditor: false });
  else if (type === "asset") openAsset(path, { focusEditor: false });
  else {
    selectEntry(path, type);
    if (toggle) toggleFolder(path);
  }
}

function toggleFolder(folderPath) {
  if (!folderPath) return;
  if (state.collapsedFolders.has(folderPath)) {
    state.collapsedFolders.delete(folderPath);
  } else {
    state.collapsedFolders.add(folderPath);
  }
  saveCollapsedFolders();
  renderTree();
}

function selectEntry(path, type) {
  state.selectedPath = path;
  state.selectedType = type;
  renderTree();
}

function isSelected(path, type) {
  return state.selectedPath === path && state.selectedType === type;
}

function displayNoteLabel(note) {
  if (!note) return "";
  return state.showFileExtensions ? note.name : note.title;
}

function loadCollapsedFolders() {
  const key = collapsedFoldersKey();
  try {
    state.collapsedFolders = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    state.collapsedFolders = new Set();
  }
}

function saveCollapsedFolders() {
  localStorage.setItem(collapsedFoldersKey(), JSON.stringify([...state.collapsedFolders]));
}

function collapsedFoldersKey() {
  return `tektite:collapsed:${state.rootPath || "none"}`;
}

function renderPreview(markdown) {
  els.preview.innerHTML = markdownToHtml(markdown, state.activePath);
}

async function printCurrentPreview() {
  if (!state.activePath && !els.preview.textContent.trim()) return;

  if (state.activeType === "note") {
    state.activeContent = els.editor.value;
    renderPreview(state.activeContent);
  }

  try {
    const result = await globalThis.tektite.printPreview({
      title: els.noteTitle.textContent || "Tektite",
      path: state.activePath || "",
      html: els.preview.innerHTML
    });

    if (result?.ok === false && result.error && !/cancel/i.test(result.error)) {
      const msg = /no printer/i.test(result.error)
        ? "No printers configured. Please add a printer in System Settings and try again."
        : `Could not print: ${result.error}`;
      globalThis.alert(msg);
    }
  } catch {
    globalThis.alert("Could not print. Please try again.");
  }
}

function markdownToHtml(markdown, sourcePath = "") {
  const visibleMarkdown = stripMarkdownComments(markdown);
  const context = {
    sourcePath,
    blocks: [],
    paragraph: [],
    list: [],
    table: null,
    inCode: false,
    code: []
  };

  for (const line of visibleMarkdown.replaceAll("\r\n", "\n").split("\n")) {
    processMarkdownLine(context, line);
  }

  flushMarkdownParagraph(context);
  flushMarkdownList(context);
  flushMarkdownTable(context);
  if (context.inCode) flushMarkdownCode(context, true);
  return context.blocks.join("\n") || "<p>Start writing.</p>";
}

function stripMarkdownComments(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  let inCode = false;
  let inComment = false;

  return lines.map((line) => {
    if (line.startsWith("```")) {
      inCode = !inCode;
      return line;
    }
    if (inCode) return line;

    let output = "";
    let index = 0;
    while (index < line.length) {
      if (inComment) {
        const end = line.indexOf("%%", index);
        if (end === -1) return output;
        index = end + 2;
        inComment = false;
        continue;
      }

      const start = line.indexOf("%%", index);
      if (start === -1) {
        output += line.slice(index);
        break;
      }
      output += line.slice(index, start);
      index = start + 2;
      inComment = true;
    }
    return output;
  }).join("\n");
}

function appendListItem(context, match, tag) {
  flushMarkdownParagraph(context);
  const indent = match[1].replaceAll("\t", "  ").length;
  if (context.list.length && context.list[0].tag !== tag) flushMarkdownList(context);
  context.list.push({ text: match[2], indent, tag });
}

function processMarkdownLine(context, line) {
  if (line.startsWith("```")) return toggleMarkdownCode(context);
  if (context.inCode) { context.code.push(line); return; }
  if (!line.trim()) return flushMarkdownBlocks(context);

  const heading = line.match(/^(#{1,6})\s+(.+)$/);
  if (heading) return appendMarkdownHeading(context, heading);
  if (/^---+$/.test(line.trim())) return appendMarkdownRule(context);

  const unorderedItem = line.match(/^(\s*)[-*+]\s+(.+)$/);
  if (unorderedItem) { appendListItem(context, unorderedItem, "ul"); return; }

  const orderedItem = line.match(/^(\s*)\d+\.\s+(.+)$/);
  if (orderedItem) { appendListItem(context, orderedItem, "ol"); return; }

  if (/^\|.*\|/.test(line)) {
    flushMarkdownParagraph(context);
    flushMarkdownList(context);
    context.table = context.table || [];
    context.table.push(line);
    return;
  }
  if (context.table) flushMarkdownTable(context);

  const quote = line.match(/^>\s?(.*)$/);
  if (quote) return appendMarkdownQuote(context, quote[1]);
  context.paragraph.push(line.trim());
}

function toggleMarkdownCode(context) {
  if (context.inCode) {
    flushMarkdownCode(context, true);
    context.inCode = false;
    return;
  }
  flushMarkdownBlocks(context);
  context.inCode = true;
}

function flushMarkdownBlocks(context) {
  flushMarkdownParagraph(context);
  flushMarkdownList(context);
  flushMarkdownTable(context);
}

function flushMarkdownTable(context) {
  if (!context.table?.length) return;
  const rows = context.table.filter((r) => !/^\|[-| :]+\|/.test(r.trim()));
  const [headerRow, ...bodyRows] = rows;
  const parseCells = (row) =>
    row.split("|").slice(1, -1).map((c) => c.trim());
  const thCells = parseCells(headerRow)
    .map((c) => `<th>${inlineMarkdown(c, context.sourcePath)}</th>`)
    .join("");
  const bodyHtml = bodyRows
    .map((r) => {
      const tds = parseCells(r).map((c) => `<td>${inlineMarkdown(c, context.sourcePath)}</td>`).join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
  context.blocks.push(`<table><thead><tr>${thCells}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
  context.table = null;
}

function flushMarkdownParagraph(context) {
  if (!context.paragraph.length) return;
  context.blocks.push(`<p>${inlineMarkdown(context.paragraph.join(" "), context.sourcePath)}</p>`);
  context.paragraph = [];
}

function buildNestedList(items, sourcePath) {
  if (!items.length) return "";
  const baseIndent = items[0].indent;
  const tag = items[0].tag || "ul";
  let html = `<${tag}>`;
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.indent > baseIndent) { i++; continue; }
    let j = i + 1;
    while (j < items.length && items[j].indent > baseIndent) j++;
    const checkMatch = item.text.match(/^\[([x ])\]\s+(.+)$/i);
    let liContent;
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === "x" ? " checked" : "";
      liContent = `<input type="checkbox" disabled${checked}> ${inlineMarkdown(checkMatch[2], sourcePath)}`;
    } else {
      liContent = inlineMarkdown(item.text, sourcePath);
    }
    const liClass = checkMatch ? " class=\"task-item\"" : "";
    html += `<li${liClass}>${liContent}${buildNestedList(items.slice(i + 1, j), sourcePath)}</li>`;
    i = j;
  }
  return `${html}</${tag}>`;
}

function flushMarkdownList(context) {
  if (!context.list.length) return;
  context.blocks.push(buildNestedList(context.list, context.sourcePath));
  context.list = [];
}

function flushMarkdownCode(context, force = false) {
  if (!force && !context.code.length) return;
  context.blocks.push(`<pre><code>${escapeHtml(context.code.join("\n"))}</code></pre>`);
  context.code = [];
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function appendMarkdownHeading(context, heading) {
  flushMarkdownBlocks(context);
  const level = heading[1].length;
  const rawText = heading[2];
  const slug = slugifyHeading(rawText);
  const content = inlineMarkdown(rawText, context.sourcePath);
  context.blocks.push(`<h${level} id="${escapeAttr(slug)}">${content}</h${level}>`);
}

function appendMarkdownRule(context) {
  flushMarkdownBlocks(context);
  context.blocks.push("<hr>");
}

function appendMarkdownQuote(context, quote) {
  flushMarkdownBlocks(context);
  context.blocks.push(`<blockquote>${inlineMarkdown(quote, context.sourcePath)}</blockquote>`);
}

function brokenImageHtml(alt, href) {
  const label = alt || href || "Missing image";
  return `<span class="broken-image" title="${escapeAttr(href)}"><span aria-hidden="true">▧</span>${escapeHtml(label)}</span>`;
}

function inlineMarkdown(value, sourcePath = "") {
  const tokens = [];
  let text = escapeHtml(value);

  text = text.replace(/`([^`]+)`/g, (_match, code) => {
    const token = stash(tokens, `<code>${code}</code>`);
    return token;
  });

  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, href) => {
    const decoded = decodeLink(href);
    const isRemote = /^https?:\/\//i.test(decoded);
    const imageUrl = isRemote
      ? decoded.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"')
      : localImageUrl(href, sourcePath);
    const token = stash(
      tokens,
      imageUrl
        ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(alt)}">`
        : brokenImageHtml(alt, href)
    );
    return token;
  });

  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const decoded = decodeLink(href);
    const linkLabel = restore(tokens, label);
    // Pure anchor: #section
    if (decoded.startsWith("#")) {
      return stash(tokens, `<a href="${escapeAttr(decoded)}" class="anchor-link">${linkLabel}</a>`);
    }
    // Path with fragment: ./page.md#section — open note then scroll to anchor
    const fragmentIdx = decoded.indexOf("#");
    const pathPart = fragmentIdx >= 0 ? decoded.slice(0, fragmentIdx) : decoded;
    const fragment = fragmentIdx >= 0 ? decoded.slice(fragmentIdx) : "";
    const note = resolveNote(pathPart || decoded, sourcePath);
    if (note) {
      const data = fragment ? ` data-anchor="${escapeAttr(fragment)}"` : "";
      return stash(tokens, `<a href="#" data-note-path="${escapeAttr(note.path)}"${data}>${linkLabel}</a>`);
    }
    if (/^https?:\/\//i.test(decoded)) {
      return stash(tokens, `<a href="${escapeAttr(decoded)}" target="_blank" rel="noreferrer">${linkLabel}</a>`);
    }
    return stash(tokens, `<span class="wiki-link missing">${linkLabel}</span>`);
  });

  text = text.replace(/\[\[([^\]]+)\]\]/g, (_match, target) => {
    const [rawTarget, alias] = target.split("|");
    const note = resolveNote(rawTarget, sourcePath);
    const label = alias || rawTarget.replace(/#.*$/, "");
    const className = note ? "wiki-link" : "wiki-link missing";
    const data = note ? ` data-note-path="${escapeAttr(note.path)}"` : "";
    return stash(tokens, `<a href="#" class="${className}"${data}>${escapeHtml(label)}</a>`);
  });

  if (state.settings.autoLinkUrls) {
    text = text.replace(/https?:\/\/[^\s<>"'()[\]]+/g, (url) =>
      stash(tokens, `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${url}</a>`)
    );
  }

  text = text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/==(\S(?:.*?\S)?)==/g, "<mark>$1</mark>")
    .replace(/\^([^^\s][^^]*)\^/g, "<sup>$1</sup>")
    .replace(/:([a-z0-9_+-]+):/g, (_m, name) => emojiChar(name) || _m);

  return restore(tokens, text);
}

const EMOJI_MAP = {
  joy: "😂", smile: "😊", laughing: "😆", grinning: "😀", smiley: "😃",
  wink: "😉", blush: "😊", heart_eyes: "😍", kissing_heart: "😘", stuck_out_tongue: "😛",
  thinking: "🤔", hushed: "😯", astonished: "😲", flushed: "😳", sob: "😭",
  cry: "😢", rage: "😡", angry: "😠", expressionless: "😑", neutral_face: "😐",
  sweat_smile: "😅", sweat: "😓", weary: "😩", tired_face: "😫", dizzy_face: "😵",
  sunglasses: "😎", nerd_face: "🤓", monocle_face: "🧐", face_with_raised_eyebrow: "🤨",
  heart: "❤️", orange_heart: "🧡", yellow_heart: "💛", green_heart: "💚",
  blue_heart: "💙", purple_heart: "💜", broken_heart: "💔", sparkling_heart: "💖",
  thumbsup: "+1", thumbsdown: "-1", clap: "👏", raised_hands: "🙌", pray: "🙏",
  wave: "👋", point_right: "👉", point_left: "👈", point_up: "👆", point_down: "👇",
  fire: "🔥", star: "⭐", sparkles: "✨", tada: "🎉", trophy: "🏆",
  rocket: "🚀", bulb: "💡", warning: "⚠️", check: "✅", x: "❌",
  information_source: "ℹ️", question: "❓", exclamation: "❗", zap: "⚡",
  bug: "🐛", hammer: "🔨", wrench: "🔧", gear: "⚙️", lock: "🔒",
  key: "🔑", eyes: "👀", ear: "👂", brain: "🧠", muscle: "💪",
  100: "💯", ok_hand: "👌", v: "✌️", raised_hand: "✋", fist: "✊",
  computer: "💻", iphone: "📱", email: "📧", memo: "📝", clipboard: "📋",
  calendar: "📅", books: "📚", book: "📖", pencil: "✏️", link: "🔗",
  dog: "🐶", cat: "🐱", mouse: "🐭", pizza: "🍕", coffee: "☕",
  beer: "🍺", cake: "🎂", apple: "🍎", tada2: "🎊", gift: "🎁",
  sun: "☀️", cloud: "☁️", umbrella: "☂️", snowflake: "❄️", rainbow: "🌈",
  earth_americas: "🌎", earth_asia: "🌏", earth_africa: "🌍", globe_with_meridians: "🌐",
  white_check_mark: "✅", heavy_check_mark: "✔️", heavy_plus_sign: "➕",
  heavy_minus_sign: "➖", heavy_division_sign: "➗", heavy_multiplication_x: "✖️"
};

function emojiChar(name) {
  return EMOJI_MAP[name] || null;
}

function resolveNote(target, sourcePath = "") {
  const clean = decodeLink(target)
    .replace(/^\/+/, "")
    .replace(/#.*$/, "")
    .replace(/\|.*$/, "")
    .trim();

  if (!clean) return null;
  const candidates = buildNoteCandidates(clean, sourcePath);

  for (const candidate of candidates) {
    if (state.noteByTitle.has(candidate)) return state.noteByTitle.get(candidate);
  }

  return null;
}

function buildNoteCandidates(target, sourcePath = "") {
  const sourceFolder = sourcePath.includes("/") ? sourcePath.split("/").slice(0, -1).join("/") : "";
  const cleanedTarget = normalizeNoteTarget(target);
  const withoutExtension = cleanedTarget.replace(/\.md$/i, "");
  const withExtension = cleanedTarget.endsWith(".md") ? cleanedTarget : `${cleanedTarget}.md`;
  const relativeTarget = normalizeVaultPath(sourceFolder ? `${sourceFolder}/${cleanedTarget}` : cleanedTarget);
  const relativeWithoutExtension = relativeTarget.replace(/\.md$/i, "");
  const relativeWithExtension = relativeTarget.endsWith(".md") ? relativeTarget : `${relativeTarget}.md`;

  return unique([
    cleanedTarget,
    withExtension,
    withoutExtension,
    relativeTarget,
    relativeWithExtension,
    relativeWithoutExtension,
    basenameWithoutExtension(cleanedTarget),
    basenameWithoutExtension(withExtension)
  ].map((candidate) => candidate.toLowerCase()));
}

function normalizeNoteTarget(target) {
  return normalizeVaultPath(target.replaceAll("\\", "/").replace(/^\.\/+/, ""));
}

function normalizeVaultPath(value) {
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

function basenameWithoutExtension(value) {
  const base = value.split("/").pop() || value;
  return base.replace(/\.md$/i, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function decodeLink(value) {
  const trimmed = value.trim().replace(/^<|>$/g, "");
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function updateGraph() {
  if (!state.showGraphPane) return;
  if (state.graphContentCollapsed) return;
  if (!state.notes.length) {
    drawGraph({ nodes: [], edges: [] });
    return;
  }

  const links = parseLinksFromNotes();
  drawGraph(links);
}

function parseLinksFromNotes() {
  const nodes = state.notes.map((note) => ({
    id: note.path,
    title: note.title,
    active: note.path === state.activePath,
    degree: 0
  }));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = [];

  for (const note of state.notes) {
    const sourceContent =
      note.path === state.activePath ? state.activeContent : state.noteContent.get(note.path) || "";
    const targets = extractTargets(sourceContent);

    for (const target of targets) {
      const resolved = resolveNote(target, note.path);
      if (!resolved || resolved.path === note.path) continue;
      edges.push({ source: note.path, target: resolved.path });
      nodeMap.get(note.path).degree += 1;
      nodeMap.get(resolved.path).degree += 1;
    }
  }

  return { nodes, edges };
}

function extractTargets(markdown) {
  const targets = [];
  const wiki = /\[\[([^\]]+)\]\]/g;
  const md = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
  let match;

  const wikiTargets = [];
  const markdownTargets = [];
  while ((match = wiki.exec(markdown))) wikiTargets.push(match[1]);
  while ((match = md.exec(markdown))) markdownTargets.push(match[1]);
  targets.push(...wikiTargets, ...markdownTargets);
  return targets;
}

function drawGraph({ nodes, edges }) {
  const svg = els.graphSvg;
  const colors = graphColors();
  const rect = svg.getBoundingClientRect();
  const width = Math.max(rect.width || 720, 480);
  const height = Math.max(rect.height || 520, 420);
  const world = graphWorldSize(nodes.length, width, height);
  const signature = graphLayoutSignature(nodes, edges);
  if (signature !== state.graphLayoutSignature) {
    state.graphPositions.clear();
    state.graphLayoutSignature = signature;
    fitGraphViewport(world.width, world.height, width, height);
  }

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";
  els.graphEmpty.classList.toggle("hidden", nodes.length > 0 && edges.length > 0);

  if (!nodes.length) return;

  layoutGraphNodes(nodes, edges, world.width, world.height);
  renderGraphSvg(svg, nodes, edges, colors);
}

function graphColors() {
  const theme = getComputedStyle(document.documentElement);
  return {
    edge: theme.getPropertyValue("--graph-edge").trim() || "#557b7f",
    node: theme.getPropertyValue("--graph-node").trim() || "#25272d",
    accent: theme.getPropertyValue("--accent").trim() || "#65a8ad",
    accentDark: theme.getPropertyValue("--accent-dark").trim() || "#7fb9bd",
    ink: theme.getPropertyValue("--ink").trim() || "#ece6da"
  };
}

function graphLayoutSignature(nodes, edges) {
  const nodeIds = nodes.map((node) => node.id).sort().join("|");
  const edgeIds = edges
    .map((edge) => `${edge.source}->${edge.target}`)
    .sort()
    .join("|");
  return `${nodeIds}::${edgeIds}`;
}

function graphWorldSize(nodeCount, width, height) {
  const density = Math.max(1, Math.sqrt(nodeCount));
  return {
    width: Math.max(width, Math.round(density * 220)),
    height: Math.max(height, Math.round(density * 170))
  };
}

function fitGraphViewport(worldWidth, worldHeight, width, height) {
  const scale = clamp(Math.min(width / worldWidth, height / worldHeight) * 0.92, 0.28, 1);
  state.graphViewport.scale = scale;
  state.graphViewport.x = Math.round((width - worldWidth * scale) / 2);
  state.graphViewport.y = Math.round((height - worldHeight * scale) / 2);
}

function layoutGraphNodes(nodes, edges, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.42;
  nodes.forEach((node, index) => {
    const saved = state.graphPositions.get(node.id);
    if (saved) {
      node.x = saved.x;
      node.y = saved.y;
    } else {
      const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    }
  });

  const hasSavedLayout = nodes.some((node) => state.graphPositions.has(node.id));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const ticks = hasSavedLayout ? 80 : graphLayoutTicks(nodes.length);
  for (let tick = 0; tick < ticks; tick += 1) {
    applyGraphRepulsion(nodes);
    applyGraphEdgeAttraction(edges, nodeMap);
    applyGraphCollision(nodes);
    pullGraphNodesToCenter(nodes, centerX, centerY, width, height);
  }

  nodes.forEach((node) => {
    state.graphPositions.set(node.id, { x: node.x, y: node.y });
  });
}

function graphLayoutTicks(nodeCount) {
  return clamp(220 + nodeCount * 8, 260, 900);
}

function applyGraphRepulsion(nodes) {
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      pushGraphNodesApart(nodes[i], nodes[j]);
    }
  }
}

function pushGraphNodesApart(a, b) {
  const dx = a.x - b.x || 0.01;
  const dy = a.y - b.y || 0.01;
  const distance = Math.hypot(dx, dy);
  const force = Math.min(5200 / (distance * distance), 8);
  a.x += (dx / distance) * force;
  a.y += (dy / distance) * force;
  b.x -= (dx / distance) * force;
  b.y -= (dy / distance) * force;
}

function applyGraphCollision(nodes) {
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      separateGraphNodes(nodes[i], nodes[j]);
    }
  }
}

function separateGraphNodes(a, b) {
  const dx = b.x - a.x || 0.01;
  const dy = b.y - a.y || 0.01;
  const distance = Math.hypot(dx, dy);
  const minDistance = graphNodeCollisionRadius(a) + graphNodeCollisionRadius(b);
  if (distance >= minDistance) return;

  const push = (minDistance - distance) * 0.56;
  const nx = dx / distance;
  const ny = dy / distance;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
}

function graphNodeCollisionRadius(node) {
  const labelWidth = Math.min(180, Math.max(48, node.title.length * 7));
  return graphNodeRadius(node) + labelWidth * 0.24 + 18;
}

function applyGraphEdgeAttraction(edges, nodeMap) {
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    source.x += dx * 0.0035;
    source.y += dy * 0.0035;
    target.x -= dx * 0.0035;
    target.y -= dy * 0.0035;
  }
}

function pullGraphNodesToCenter(nodes, centerX, centerY, width, height) {
  for (const node of nodes) {
    node.x += (centerX - node.x) * 0.0035;
    node.y += (centerY - node.y) * 0.0035;
    const margin = graphNodeCollisionRadius(node);
    node.x = clamp(node.x, margin, width - margin);
    node.y = clamp(node.y, margin, height - margin);
  }
}

function renderGraphSvg(svg, nodes, edges, colors) {
  const edgeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const nodeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const viewportLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  viewportLayer.setAttribute("class", "graph-viewport");
  applyGraphViewport(viewportLayer);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", source.x);
    line.setAttribute("y1", source.y);
    line.setAttribute("x2", target.x);
    line.setAttribute("y2", target.y);
    line.setAttribute("stroke", colors.edge);
    line.setAttribute("stroke-width", "1.4");
    line.dataset.source = edge.source;
    line.dataset.target = edge.target;
    edgeLayer.appendChild(line);
  }

  for (const node of nodes) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.dataset.notePath = node.id;
    group.setAttribute("class", "graph-node");
    group.style.cursor = "pointer";

    const nodeRadius = graphNodeRadius(node);
    const labelOffset = nodeRadius + 8;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", nodeRadius);
    circle.setAttribute("fill", node.active ? colors.accent : colors.node);
    circle.setAttribute("stroke", node.active ? colors.accentDark : colors.accent);
    circle.setAttribute("stroke-width", node.active ? "3" : "2");

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", node.x + labelOffset);
    label.setAttribute("y", node.y + 4);
    label.dataset.offsetX = String(labelOffset);
    label.setAttribute("fill", colors.ink);
    label.setAttribute("font-size", "12");
    label.setAttribute("font-weight", node.active ? "700" : "560");
    label.textContent = node.title;

    group.append(circle, label);
    nodeLayer.appendChild(group);
  }

  viewportLayer.append(edgeLayer, nodeLayer);
  svg.append(viewportLayer);
}

function graphNodeRadius(node) {
  return 8 + Math.min(node.degree, 8) * 1.6;
}

function onGraphWheel(event) {
  event.preventDefault();
  const svg = els.graphSvg;
  const rect = svg.getBoundingClientRect();
  const pointX = event.clientX - rect.left;
  const pointY = event.clientY - rect.top;
  const previousScale = state.graphViewport.scale;
  const nextScale = clamp(previousScale * (event.deltaY < 0 ? 1.12 : 0.89), 0.35, 3.5);
  const scaleRatio = nextScale / previousScale;

  state.graphViewport.x = pointX - (pointX - state.graphViewport.x) * scaleRatio;
  state.graphViewport.y = pointY - (pointY - state.graphViewport.y) * scaleRatio;
  state.graphViewport.scale = nextScale;

  const viewportLayer = svg.querySelector(".graph-viewport");
  if (viewportLayer) applyGraphViewport(viewportLayer);
}

function onGraphPointerDown(event) {
  if (event.button !== 0) return;
  const node = event.target.closest("[data-note-path]");
  const graphPoint = graphPointFromEvent(event);
  const notePath = node?.dataset.notePath || null;
  const savedPosition = notePath ? state.graphPositions.get(notePath) : null;
  state.graphDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startGraphX: graphPoint.x,
    startGraphY: graphPoint.y,
    nodeStartX: savedPosition?.x || graphPoint.x,
    nodeStartY: savedPosition?.y || graphPoint.y,
    viewportX: state.graphViewport.x,
    viewportY: state.graphViewport.y,
    didMove: false,
    mode: notePath ? "node" : "pan",
    notePath
  };
  event.preventDefault();
  els.graphSvg.setPointerCapture(event.pointerId);
  els.graphSvg.classList.add(notePath ? "dragging-node" : "panning");
  globalThis.addEventListener("pointermove", onGraphPointerMove);
  globalThis.addEventListener("pointerup", stopGraphPan, { once: true });
  globalThis.addEventListener("pointercancel", stopGraphPan, { once: true });
}

function onGraphPointerMove(event) {
  if (!state.graphDrag) return;
  const dx = event.clientX - state.graphDrag.startX;
  const dy = event.clientY - state.graphDrag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 3) state.graphDrag.didMove = true;

  if (state.graphDrag.mode === "node") {
    const graphPoint = graphPointFromEvent(event);
    const next = {
      x: state.graphDrag.nodeStartX + graphPoint.x - state.graphDrag.startGraphX,
      y: state.graphDrag.nodeStartY + graphPoint.y - state.graphDrag.startGraphY
    };
    state.graphPositions.set(state.graphDrag.notePath, next);
    moveGraphNodeElement(state.graphDrag.notePath, next.x, next.y);
  } else {
    state.graphViewport.x = state.graphDrag.viewportX + dx;
    state.graphViewport.y = state.graphDrag.viewportY + dy;
    const viewportLayer = els.graphSvg.querySelector(".graph-viewport");
    if (viewportLayer) applyGraphViewport(viewportLayer);
  }
}

function stopGraphPan() {
  if (!state.graphDrag) return;
  const notePath = state.graphDrag.notePath;
  const shouldOpen = state.graphDrag.mode === "node" && notePath && !state.graphDrag.didMove;
  state.graphDrag = null;
  els.graphSvg.classList.remove("panning", "dragging-node");
  globalThis.removeEventListener("pointermove", onGraphPointerMove);
  globalThis.removeEventListener("pointercancel", stopGraphPan);
  if (shouldOpen) openNote(notePath);
}

function graphPointFromEvent(event) {
  const rect = els.graphSvg.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - state.graphViewport.x) / state.graphViewport.scale,
    y: (event.clientY - rect.top - state.graphViewport.y) / state.graphViewport.scale
  };
}

function moveGraphNodeElement(notePath, x, y) {
  const group = els.graphSvg.querySelector(`.graph-node[data-note-path="${cssEscape(notePath)}"]`);
  if (!group) return;
  const circle = group.querySelector("circle");
  const label = group.querySelector("text");
  circle?.setAttribute("cx", x);
  circle?.setAttribute("cy", y);
  if (label) {
    const offsetX = Number(label.dataset.offsetX) || 13;
    label.setAttribute("x", x + offsetX);
    label.setAttribute("y", y + 4);
  }

  els.graphSvg.querySelectorAll(`[data-source="${cssEscape(notePath)}"]`).forEach((line) => {
    line.setAttribute("x1", x);
    line.setAttribute("y1", y);
  });
  els.graphSvg.querySelectorAll(`[data-target="${cssEscape(notePath)}"]`).forEach((line) => {
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
  });
}

function applyGraphViewport(element) {
  element.setAttribute(
    "transform",
    `translate(${state.graphViewport.x} ${state.graphViewport.y}) scale(${state.graphViewport.scale})`
  );
}

function onPreviewContextMenu(event) {
  const link = event.target.closest("a");
  const img = !link && event.target.closest("img");
  let url = null;

  if (link) {
    const notePath = link.dataset.notePath;
    if (notePath && state.rootPath) {
      const noteFilePath = `${state.rootPath}/${notePath}`;
      url = `file://${encodeURI(noteFilePath).replaceAll("%2F", "/")}`;
    } else {
      const href = link.getAttribute("href");
      if (href && href !== "#") url = href;
    }
  } else if (img) {
    const src = img.getAttribute("src");
    if (src) url = src;
  }

  if (!url) return;
  event.preventDefault();
  showContextMenu(event.clientX, event.clientY, [
    { label: "Copy link", action: () => navigator.clipboard.writeText(url) }
  ]);
}

function onPreviewClick(event) {
  // Handle same-page anchor links
  const anchorLink = event.target.closest("a.anchor-link");
  if (anchorLink) {
    event.preventDefault();
    const hash = anchorLink.getAttribute("href");
    const target = hash && els.preview.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const link = event.target.closest("[data-note-path]");
  if (!link) return;
  event.preventDefault();
  const anchor = link.dataset.anchor || "";
  openNoteFromPreviewLink(link.dataset.notePath, anchor);
}

function scrollPreviewToAnchor(anchor) {
  if (!anchor) return;
  requestAnimationFrame(() => {
    const target = els.preview.querySelector(anchor);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function openNoteFromPreviewLink(notePath, anchor = "") {
  if (!notePath || !state.noteByPath.has(notePath)) return;
  if (notePath === state.activePath) {
    scrollPreviewToAnchor(anchor);
    return;
  }
  if (state.activePath && state.activeType === "note") {
    const lastPath = state.previewHistory.at(-1);
    if (lastPath !== state.activePath) state.previewHistory.push(state.activePath);
  }
  state.previewForwardHistory = [];
  openNote(notePath, { preservePreviewHistory: true }).then(() => {
    scrollPreviewToAnchor(anchor);
  });
}

function goBackPreviewHistory() {
  const previousPath = state.previewHistory.pop();
  if (!previousPath) return updatePreviewNavButtons();
  if (state.activePath && state.activeType === "note") state.previewForwardHistory.push(state.activePath);
  openNote(previousPath, { preservePreviewHistory: true });
}

function goForwardPreviewHistory() {
  const nextPath = state.previewForwardHistory.pop();
  if (!nextPath) return updatePreviewNavButtons();
  if (state.activePath && state.activeType === "note") state.previewHistory.push(state.activePath);
  openNote(nextPath, { preservePreviewHistory: true });
}

function updatePreviewNavButtons() {
  els.previewBackButton.disabled = state.previewHistory.length === 0;
  els.previewForwardButton.disabled = state.previewForwardHistory.length === 0;
}

function onGraphClick(event) {
  if (state.graphDrag) return;
  const node = event.target.closest("[data-note-path]");
  if (!node) return;
  event.preventDefault();
  openNote(node.dataset.notePath);
}

function activeFolder() {
  if (!state.activePath) return "";
  const parts = state.activePath.split("/");
  parts.pop();
  return parts.join("/");
}

function targetFolder() {
  if (state.selectedType === "folder") return state.selectedPath || "";
  if (state.selectedType === "note" && state.selectedPath) return parentFolder(state.selectedPath);
  return activeFolder();
}

function folderForContext(context) {
  if (!context?.path) return "";
  if (context.type === "folder") return context.path;
  return parentFolder(context.path);
}

function currentSelection() {
  if (state.selectedPath) {
    return { path: state.selectedPath, type: state.selectedType };
  }
  if (state.activePath) {
    return { path: state.activePath, type: state.activeType || "note" };
  }
  return { path: "", type: "folder" };
}

function parentFolder(relativePath) {
  const parts = relativePath.split("/");
  parts.pop();
  return parts.join("/");
}

function isPathInside(path, folder) {
  if (!path || !folder) return false;
  return path === folder || path.startsWith(`${folder}/`);
}

function entryExists(path, type) {
  if (!path) return type === "folder";
  if (type === "note") return state.noteByPath.has(path);
  if (type === "asset") return treeEntryExists(state.tree, path, "asset");
  return folderExists(state.tree, path);
}

function findTreeNode(node, path) {
  if (!node) return null;
  if (node.path === path) return node;
  for (const child of node.children || []) {
    const found = findTreeNode(child, path);
    if (found) return found;
  }
  return null;
}

function folderExists(node, path) {
  if (node?.type !== "folder") return false;
  if (node.path === path) return true;
  const children = Array.isArray(node.children) ? node.children : [];
  return children.some((child) => folderExists(child, path));
}

function treeEntryExists(node, path, type) {
  if (!node) return false;
  if (node.path === path && node.type === type) return true;
  const children = Array.isArray(node.children) ? node.children : [];
  return children.some((child) => treeEntryExists(child, path, type));
}

function setSaveState(value) {
  els.saveState.textContent = value;
}

function stash(tokens, html) {
  const token = `@@TEKTITE_STASH_${tokens.length}@@`;
  tokens.push(html);
  return token;
}

function restore(tokens, text) {
  return text.replace(/@@TEKTITE_STASH_(\d+)@@/g, (_match, index) => tokens[Number(index)]);
}

function openFindBar() {
  if (!state.activePath || state.activeType !== "note") return;
  state.find.active = true;
  els.findBar.classList.remove("hidden");
  els.editor.classList.add("find-active");
  const sel = els.editor.value.substring(els.editor.selectionStart, els.editor.selectionEnd);
  if (sel && !sel.includes("\n")) els.findInput.value = sel;
  els.findInput.select();
  els.findInput.focus();
  updateFindMatches();
}

function closeFindBar() {
  state.find.active = false;
  state.find.matches = [];
  state.find.index = -1;
  els.findBar.classList.add("hidden");
  els.editor.classList.remove("find-active");
  els.editorFindOverlay.innerHTML = "";
  els.findInput.value = "";
  els.findCount.textContent = "";
  els.editor.focus();
}

function updateFindMatches() {
  const query = els.findInput.value.toLowerCase();
  if (!query) {
    state.find.matches = [];
    state.find.index = -1;
    els.findCount.textContent = "";
    els.editorFindOverlay.innerHTML = "";
    return;
  }
  const content = els.editor.value.toLowerCase();
  const matches = [];
  let pos = 0;
  while ((pos = content.indexOf(query, pos)) !== -1) {
    matches.push({ start: pos, end: pos + query.length });
    pos += query.length;
  }
  state.find.matches = matches;
  if (!matches.length) {
    state.find.index = -1;
    els.findCount.textContent = "No results";
    els.editorFindOverlay.innerHTML = "";
    return;
  }
  if (state.find.index < 0 || state.find.index >= matches.length) state.find.index = 0;
  selectFindMatch(state.find.index);
  els.findInput.focus();
}

function navigateFind(delta) {
  const { matches } = state.find;
  if (!matches.length) return;
  state.find.index = (state.find.index + delta + matches.length) % matches.length;
  selectFindMatch(state.find.index);
}

function selectFindMatch(index) {
  const { matches } = state.find;
  if (index < 0 || index >= matches.length) return;
  const match = matches[index];
  els.findCount.textContent = `${index + 1} of ${matches.length}`;
  const text = els.editor.value.substring(0, match.start);
  const lines = (text.match(/\n/g) || []).length;
  const lineHeight = 15 * 1.65;
  els.editor.scrollTop = Math.max(0, lines * lineHeight + 26 - els.editor.clientHeight / 2);
  els.editor.setSelectionRange(match.start, match.end);
  updateFindOverlay();
}

function updateFindOverlay() {
  const { matches, index } = state.find;
  const text = els.editor.value;
  if (!matches.length) {
    els.editorFindOverlay.innerHTML = "";
    return;
  }
  let html = "";
  let pos = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    html += escapeHtml(text.substring(pos, m.start));
    html += `<mark${i === index ? ' class="find-current"' : ""}>${escapeHtml(text.substring(m.start, m.end))}</mark>`;
    pos = m.end;
  }
  html += escapeHtml(text.substring(pos));
  els.editorFindOverlay.innerHTML = `<pre>${html}</pre>`;
  syncFindOverlayScroll();
}

function syncFindOverlayScroll() {
  const pre = els.editorFindOverlay.querySelector("pre");
  if (pre) pre.style.transform = `translateY(-${els.editor.scrollTop}px)`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);
  const backslash = String.fromCodePoint(92);
  const quote = String.fromCodePoint(34);
  return String(value)
    .replaceAll(backslash, backslash + backslash)
    .replaceAll(quote, backslash + quote);
}
