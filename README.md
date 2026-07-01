# Pinpoint

[![npm version](https://img.shields.io/npm/v/@wyverselabs/pinpoint.svg)](https://www.npmjs.com/package/@wyverselabs/pinpoint)
[![CI](https://github.com/w00ing/pinpoint/actions/workflows/ci.yml/badge.svg)](https://github.com/w00ing/pinpoint/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Pinpoint is a dev-only UI source locator for AI coding agents.

Click any rendered element in an Electron React app and copy the source context needed to edit it. It feels like an element picker, but the clipboard output is optimized for handing precise code location to an AI agent.

Pinpoint is early `0.x` software. It is usable today, but public APIs and the clipboard payload may evolve while the project settles.

## What It Copies

```xml
<pinpoint-selection>
{
  "kind": "pinpoint.selection",
  "source": {
    "location": "src/components/ExportButton.tsx:42:5",
    "element": "Button",
    "kind": "jsx-metadata"
  },
  "target": {
    "tag": "button",
    "name": "Export",
    "role": "button"
  },
  "window": "main"
}
</pinpoint-selection>
```

The XML wrapper makes the pasted block easy for an AI agent to identify. The JSON stays intentionally small: source location, target identity, and window label.

## Install

```sh
npm install -D @wyverselabs/pinpoint
```

```sh
bun add -d @wyverselabs/pinpoint
```

Pinpoint currently targets Electron + React + Vite apps.

Peer dependencies are optional at package install time because each subpath has different runtime needs:

- `vite` for `@wyverselabs/pinpoint/vite`
- `electron` for `@wyverselabs/pinpoint/electron/*`

## 1. Add The Vite Plugin

Add the plugin to your renderer build:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pinpoint from "@wyverselabs/pinpoint/vite";

export default defineConfig({
  plugins: [
    pinpoint({
      root: __dirname,
    }),
    react(),
  ],
});
```

The plugin injects `data-ui-context-source` and `data-ui-context-name` attributes into JSX output so selected DOM nodes can be traced back to source files.

## 2. Wire Electron Main

Register the clipboard IPC handler and toggle Pinpoint from your app shortcut:

```ts
import { app, globalShortcut } from "electron";
import {
  DEFAULT_PINPOINT_ACCELERATOR,
  registerElectronPinpointMain,
  toggleElectronPinpointForFocusedWindow,
} from "@wyverselabs/pinpoint/electron/main";

if (!app.isPackaged) {
  app.whenReady().then(() => {
    const disposePinpoint = registerElectronPinpointMain();

    globalShortcut.register(DEFAULT_PINPOINT_ACCELERATOR, () => {
      toggleElectronPinpointForFocusedWindow();
    });

    app.once("before-quit", () => {
      disposePinpoint();
      globalShortcut.unregister(DEFAULT_PINPOINT_ACCELERATOR);
    });
  });
}
```

You can use your own shortcut lifecycle instead. The important part is that `registerElectronPinpointMain()` runs in development and `toggleElectronPinpointForFocusedWindow()` runs when your shortcut fires.

## 3. Wire Preload And Renderer

Expose the preload bridge:

```ts
import { exposeElectronPinpointPreload } from "@wyverselabs/pinpoint/electron/preload";

if (process.env.NODE_ENV === "development") {
  exposeElectronPinpointPreload();
}
```

Install the renderer listener in each window:

```ts
import { installElectronPinpoint } from "@wyverselabs/pinpoint/electron/renderer";

if (import.meta.env.DEV) {
  installElectronPinpoint({ windowLabel: "main" });
}
```

Then press the configured shortcut, hover an element, and click to copy the Pinpoint selection to your clipboard.

## Production Safety

Pinpoint is designed to be dev-only:

- The Vite metadata plugin disables itself when Vite mode is `production`.
- Electron main, preload, and renderer hooks should be installed behind your app's development guards.
- The recommended snippets above avoid installing runtime hooks in packaged production apps.

## API

### `@wyverselabs/pinpoint/vite`

```ts
import pinpoint from "@wyverselabs/pinpoint/vite";
```

Options:

- `root?: string`
- `include?: RegExp`
- `exclude?: RegExp`
- `enabled?: boolean`

### `@wyverselabs/pinpoint/electron/main`

```ts
import {
  DEFAULT_PINPOINT_ACCELERATOR,
  registerElectronPinpointMain,
  toggleElectronPinpointForFocusedWindow,
} from "@wyverselabs/pinpoint/electron/main";
```

### `@wyverselabs/pinpoint/electron/preload`

```ts
import { exposeElectronPinpointPreload } from "@wyverselabs/pinpoint/electron/preload";
```

### `@wyverselabs/pinpoint/electron/renderer`

```ts
import { installElectronPinpoint } from "@wyverselabs/pinpoint/electron/renderer";
```

## Release Checks

```sh
bun run release:check
```

This runs tests, builds the package, and previews the npm tarball.
