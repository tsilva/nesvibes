Original prompt: Add fullscreen mod support, clicking it shows the emulator canvas only in browser fullscreen mode

- Inspected the Svelte page shell, emulator canvas container, and CSS. There was no existing fullscreen control or fullscreen-state handling.
- Plan: add a player-side fullscreen toggle, request browser fullscreen on the stage element, hide page chrome by targeting only the stage, and verify with Svelte checks plus a browser run.

- Implemented fullscreen mode: added a toggle outside the fullscreen target, request fullscreen on the stage element, track fullscreen state, and scale the canvas in fullscreen while hiding overlay/chrome.

- Verification: `npm run check` passed. Browser verification confirmed the stage enters browser fullscreen and expands to the viewport, and the fullscreen capture rendered only the canvas stage.

- Refined the live controller to more closely match the original NES pad: flatter off-white shell, black faceplate, larger chrome-rimmed D-pad, centered select/start island, Nintendo wordmark, and square A/B wells with red circular buttons.

- Verification: `npm run check` passed after the controller pass. Browser inspection confirmed the updated controller layout rendered in-page.

- Tooling note: the required `develop-web-game` Playwright client was invoked against `http://127.0.0.1:4173`, but the bundled Chromium process crashed on launch with `SEGV_ACCERR` before producing captures. Used the app's Playwright browser tooling for visual verification instead.
