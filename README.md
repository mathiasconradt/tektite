# Tektite - a minimalistic Markdown knowledge base app

[![macOS Build](https://github.com/mathiasconradt/tektite/actions/workflows/macos-build.yml/badge.svg)](https://github.com/mathiasconradt/tektite/actions/workflows/macos-build.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mathiasconradt_tektite&metric=alert_status&token=27834731d82afc73030bc1e8559b67ac51f516d1)](https://sonarcloud.io/summary/new_code?id=mathiasconradt_tektite)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Buy me a coffee](https://img.shields.io/badge/Buy%20me-a%20coffee-ff5f5f?logo=ko-fi&logoColor=white)](https://ko-fi.com/mathiasconradt)
![GitHub stars](https://img.shields.io/github/stars/mathiasconradt/tektite)

![Tektite](docs/images/promo.png)

Tektite is a deliberately lightweight Markdown knowledge base app for macOS and Linux. It keeps the core workflow simple: open a local folder, write Markdown notes, preview them live, and see how they connect in the graph.

There is no login, cloud sync service, telemetry, remote storage, account system, or plugin system. Your vault is just a folder on disk, and if you want sync, plain Git works nicely.

## Features

- Open any local folder as a vault.
- Reopen previously used vaults from `File > Recent Vaults...`.
- Sync Git-backed vaults with a lightweight `git pull --ff-only`, `git add -A`, `git commit`, and `git push` action.
- Browse folders, Markdown notes, and image assets in a collapsible file tree.
- Search notes by filename, path, and Markdown content.
- Collect `#tags` from Markdown notes into a clickable tag pane.
- Click tags to filter the file tree by that tag.
- Show or hide the Tags and Graph panes from the View menu.
- Create new notes and folders from the file tree context menu.
- Pre-populate new notes from templates stored in a configurable templates folder.
- Delete files and folders from the file tree context menu.
- Move files, folders, and images by dragging them in the file tree.
- Automatically update Markdown image references when an image is moved.
- Toggle visible file extensions in the file tree.
- Edit Markdown with autosave.
- Use native-style undo and redo history in the editor.
- Live Markdown preview.
- Click Markdown links and `[[wikilinks]]` in preview to open linked notes.
- Use the Preview back button to return after following a preview link.
- Type `@` in the editor to insert a Markdown link to another note.
- Drag files, folders, or images from the file tree into the editor to insert Markdown links or image embeds.
- Drag images from Finder into the editor or file tree to import and embed them.
- View a graph of note-to-note links.
- Click graph nodes to open notes.
- Zoom the graph with the mouse wheel.
- Pan the graph by dragging empty space.
- Drag individual graph nodes to reposition them.
- Toggle dark and light mode. Dark mode is the default.
- Configure vault-specific settings (templates folder path) via the Settings dialog.
- Built-in terminal pane running the system shell (zsh, bash, etc.) at the bottom of the workspace.

## Documentation

See the [User Guide](docs/user-guide.md) for a full walkthrough of all features.

See the [Changelog](CHANGELOG.md) for release history.

## Screenshots

![Tektite screenshot](docs/images/screenshot.png)

## Run

```sh
npm install
npm start
```

On macOS, `npm start` launches a local packaged `Tektite.app` so the Dock and menu bar show `Tektite` instead of Electron.

For faster development startup, use:

```sh
npm run dev
```

In dev mode on macOS, the host process may still appear as Electron.

On Linux, `npm install` rebuilds the native terminal module for Electron automatically. If your npm setup blocks lifecycle scripts or the terminal module fails to load, run:

```sh
npm run rebuild:native
npm run dev
```

## Packaging

```sh
npm run package:mac
npm run package:linux
```

The package scripts use the `electron-packager` CLI provided by `@electron/packager`. Install dependencies first with `npm install`.

## Homebrew

```sh
brew tap mathiasconradt/tektite https://github.com/mathiasconradt/tektite
brew install --cask tektite
```

The cask installs the macOS release asset from GitHub Releases.

Homebrew installs the matching build for Apple Silicon or Intel Macs.

The Homebrew cask removes the macOS quarantine attribute during install. If you download the release zip manually and macOS says the app is damaged, run:

```sh
xattr -cr "/Applications/Tektite.app"
```

Patch releases are created automatically for app changes on `main`. The version bump workflow updates `package.json`, `package-lock.json`, and the Homebrew cask, then pushes a matching `vX.Y.Z` tag. The macOS build workflow publishes that tag as a GitHub Release with the app zip attached.

## Author

Tektite was created by Mathias Conradt.

Copyright © 2026 Mathias Conradt.

Released under the Apache License 2.0.

See [NOTICE.md](NOTICE.md) for third-party notices.

## Contact

LinkedIn: https://www.linkedin.com/in/mathiasconradt/

X: https://x.com/mathiasconradt

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=mathiasconradt/tektite&type=timeline&logscale&legend=top-left)](https://www.star-history.com/?repos=mathiasconradt%2Ftektite&type=timeline&logscale=&legend=top-left)
