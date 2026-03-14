# Changelog

## [2.0.0] - 2026-03-15

A ground-up rewrite. Leaner, faster, and way more capable.

### What's New

- **Pinch-to-Zoom** — Two-finger zoom on touch devices. Captured images respect the zoom level automatically.
- **`resetZoom()`** — Snap back to 1x programmatically.
- **`zoom` property** — Read the current zoom level at any time.
- **`Camera.define()`** — Register `<js-camera>` explicitly when you need control over timing.
- **`Camera.createElement()`** — Create a camera element on the fly, no HTML needed.
- **`deviceId` option & property** — Target a specific camera by device ID.
- **`track` property** — Direct access to the active `MediaStreamTrack`.
- **`queryPermission()`** — Check camera permission state before opening.
- **`revokePermission()`** — Revoke camera access programmatically.
- **`getDevices()`** — List all available cameras with labels.
- **`waitOpen()`** — Await camera readiness without polling.
- **Viewport-filling default** — Works full-screen out of the box, no CSS required. Easily overridden with a simple selector.
- **GitHub Pages demo** — [Live demo](https://shumatsumonobu.github.io/js-camera/) to try it instantly.

### What Changed (v1 → v2)

- **`open()` takes an options object now.**
  ```js
  // Before
  await camera.open('back', 1920, 1080);

  // After
  await camera.open({ facingMode: 'back', width: 1920, height: 1080 });
  ```

- **Default facing mode is `'front'`** — Most web apps start with the selfie camera.

- **Methods renamed for clarity:**
  - `camera.getTrack()` → `camera.track` (property)
  - `camera.getPermission()` → `camera.queryPermission()`
  - `camera.getAvailableDevices()` → `camera.getDevices()`

- **CSS classes use `jsc-` prefix** — `.camera-controls` → `.jsc-controls`, etc.

- **No more global CSS injection** — v1 forced `html, body { height: 100%; margin: 0; overflow: hidden; }`. v2 uses zero-specificity defaults that never fight your styles. Add your own body styles if your layout needs them.

- **Debug panel removed** — The `debug` / `dat-gui` attribute and `dat.gui` dependency are gone. Use browser DevTools instead.

- **Dependencies removed** — `handlebars` and `dat.gui` are gone. Zero dependencies now.

- **Types removed** — `Constraints` (use standard `MediaStreamConstraints`), `GuiState` / `DebugPanelState` (removed with the debug panel).

### Under the Hood

- Flash effect rebuilt with Web Animations API — smooth and reliable.
- `#flipHorizontally` rewritten with Canvas transforms instead of pixel loops.
- 100+ lines of dead CSS removed, z-index unified, CSS custom properties for all sizing.
- Stream and event listener leaks fixed across the board.
- `connectedCallback` no longer duplicates UI when the element moves in the DOM.

---

## [1.0.4] - 2021-08-23

- **Crop captures** — You can now extract a specific region from the captured image.

## [1.0.3] - 2020-09-23

- **Position fix** — Camera element now correctly switches to relative positioning when placed inside a static container.

## [1.0.2] - 2020-08-26

- **Package fix** — API.md is now included in the npm package.

## [1.0.1] - 2020-08-26

- **Docs shipped** — Added API.md and CHANGELOG.md to the project.

## [1.0.0] - 2020-08-25

- **Hello, world.** — First release of js-camera.

[2.0.0]: https://github.com/shumatsumonobu/js-camera/compare/v1.0.4...v2.0.0
[1.0.4]: https://github.com/shumatsumonobu/js-camera/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/shumatsumonobu/js-camera/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/shumatsumonobu/js-camera/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/shumatsumonobu/js-camera/compare/v1.0.0...v1.0.1
