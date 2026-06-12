const path = require("node:path");

function buildApplicationMenu({
  Menu,
  shell,
  platform = process.platform,
  recentVaults = [],
  getPaneState,
  getWindows,
  getActiveWindow,
  windowMenuLabel,
  focusWindow,
  toggleMaximize,
  createWindow,
  showAboutWindow,
  openRecentVault,
  sendToActiveWindow,
  sendToWindowOrCreate
}) {
  const isMac = platform === "darwin";
  const s = getPaneState?.();
  const recentVaultItems = recentVaults.length > 0
    ? recentVaults.map((vaultPath) => ({
        label: path.basename(vaultPath) || vaultPath,
        sublabel: vaultPath,
        click: () => openRecentVault(vaultPath)
      }))
    : [{ label: "No Recent Vaults", enabled: false }];

  const template = [
    ...(isMac
      ? [
          {
            label: "Tektite",
            submenu: [
              { label: "About Tektite", click: showAboutWindow },
              { type: "separator" },
              { label: "Settings…", accelerator: "Cmd+,", click: () => sendToActiveWindow("menu:open-settings") },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" }
            ]
          }
        ]
      : []),
    {
      label: "File",
      submenu: [
        { label: "New Window", accelerator: "CmdOrCtrl+N", click: () => createWindow({ restoreLastVault: false }) },
        { type: "separator" },
        { label: "Open Vault...", accelerator: "CmdOrCtrl+O", click: () => sendToWindowOrCreate("menu:open-vault") },
        { label: "Recent Vaults...", submenu: recentVaultItems },
        { type: "separator" },
        { label: "New Node", accelerator: "CmdOrCtrl+Shift+N", click: () => sendToActiveWindow("menu:new-note") },
        { label: "New Folder", accelerator: "CmdOrCtrl+Shift+F", click: () => sendToActiveWindow("menu:new-folder") },
        { type: "separator" },
        { label: "Close Tab", accelerator: "CmdOrCtrl+W", click: () => sendToActiveWindow("menu:close-tab") },
        { label: "Close All Tabs", click: () => sendToActiveWindow("menu:close-all-tabs") },
        { label: "Close Window", accelerator: "Shift+CmdOrCtrl+W", click: () => getActiveWindow()?.close() },
        { type: "separator" },
        { label: "Print...", accelerator: "CmdOrCtrl+P", click: () => sendToActiveWindow("menu:print-preview") },
        { type: "separator" },
        { label: "Settings…", accelerator: "CmdOrCtrl+,", click: () => sendToActiveWindow("menu:open-settings") },
        ...(isMac ? [] : [{ type: "separator" }, { role: "quit" }])
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Refresh Vault", accelerator: "CmdOrCtrl+R", click: () => sendToActiveWindow("menu:refresh-vault") },
        { type: "separator" },
        { label: "Toggle Dark/Light Mode", click: () => sendToActiveWindow("menu:toggle-theme") },
        { type: "separator" },
        {
          label: "Show File Suffixes",
          type: "checkbox",
          checked: s?.showFileExtensions === true,
          click: () => sendToActiveWindow("menu:toggle-file-suffixes")
        },
        {
          label: "Show Editor Pane",
          type: "checkbox",
          checked: s?.showEditorPane !== false,
          click: () => sendToActiveWindow("menu:toggle-editor-pane")
        },
        {
          label: "Show Preview Pane",
          type: "checkbox",
          checked: s?.showPreviewPane !== false,
          click: () => sendToActiveWindow("menu:toggle-preview-pane")
        },
        {
          label: "Show Tags Pane",
          type: "checkbox",
          checked: s?.showTagsPane !== false,
          click: () => sendToActiveWindow("menu:toggle-tags-pane")
        },
        {
          label: "Show Graph Pane",
          type: "checkbox",
          checked: s?.showGraphPane !== false,
          click: () => sendToActiveWindow("menu:toggle-graph-pane")
        },
        {
          label: "Show Terminal",
          type: "checkbox",
          checked: s?.showTerminalPane === true,
          click: () => sendToActiveWindow("menu:toggle-terminal-pane")
        },
        {
          label: "Show Line Numbers",
          type: "checkbox",
          checked: s?.showLineNumbers === true,
          click: () => sendToActiveWindow("menu:toggle-line-numbers")
        },
        { type: "separator" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: windowMenuItems({
        isMac,
        windows: getWindows(),
        focusedWindow: getActiveWindow(),
        windowMenuLabel,
        focusWindow,
        toggleMaximize
      })
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Documentation",
          click: () => shell.openExternal("https://github.com/mathiasconradt/tektite/blob/main/docs/user-guide.md")
        },
        ...(isMac ? [] : [{ type: "separator" }, { label: "About Tektite", click: showAboutWindow }])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function windowMenuItems({ isMac, windows, focusedWindow, windowMenuLabel, focusWindow, toggleMaximize }) {
  const windowItems = windows.map((window) => ({
    type: "checkbox",
    label: windowMenuLabel(window),
    checked: window === focusedWindow,
    click: () => focusWindow(window)
  }));

  return [
    { role: "minimize" },
    isMac ? { role: "zoom" } : { label: "Maximize", click: () => toggleMaximize(focusedWindow) },
    ...(isMac ? [{ type: "separator" }, { role: "front" }] : []),
    { type: "separator" },
    ...(windowItems.length > 0 ? windowItems : [{ label: "No Windows", enabled: false }])
  ];
}

module.exports = { buildApplicationMenu };
