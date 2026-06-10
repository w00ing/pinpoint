# Pinpoint

Pinpoint is a dev-only UI picker that copies AI-ready context for the exact rendered element you click.

It highlights DOM elements like an inspector, then copies a structured payload:

```xml
<pinpoint-selection>
{
  "schemaVersion": 1,
  "kind": "pinpoint.selection",
  "source": {
    "primary": "src/components/ExportButton.tsx:42:5"
  }
}
</pinpoint-selection>
```

## Install

```sh
bun add -d @wyverselabs/pinpoint
```

Pinpoint expects the host app to provide compatible peers:

- `effect`
- `electron` for the Electron integration
- `vite` for source metadata injection

## Vite

Add the source metadata plugin to the renderer build in development:

```ts
import pinpoint from "@wyverselabs/pinpoint/vite";

export default defineConfig({
  plugins: [
    pinpoint({
      root: __dirname,
    }),
  ],
});
```

The plugin injects `data-ui-context-source` and `data-ui-context-name` attributes into JSX output so selected DOM nodes can be traced back to source files.

## Electron

Register the main-process clipboard/IPC handler and send the toggle event from your shortcut:

```ts
import {
  DEFAULT_PINPOINT_ACCELERATOR,
  registerElectronPinpointMain,
  toggleElectronPinpointForFocusedWindow,
} from "@wyverselabs/pinpoint/electron/main";

yield* registerElectronPinpointMain();
yield* shortcutService.registerScoped(DEFAULT_PINPOINT_ACCELERATOR, () => {
  fireAndForget(toggleElectronPinpointForFocusedWindow());
});
```

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

## Browser Extension

The browser adapter is intentionally small for now:

```ts
import { installBrowserPinpoint } from "@wyverselabs/pinpoint/browser-extension";

installBrowserPinpoint();
```

Post `pinpoint:toggle` to the page to activate the picker.

## Package

Build the distributable package:

```sh
bun run build
```

Create a local tarball:

```sh
bun run pack
```

Preview published contents without writing a tarball:

```sh
bun run pack:dry
```
