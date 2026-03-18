# NES Vibes

This repository ships as a mostly self-contained static site rooted at [`index.html`](/Users/tsilva/repos/romhacking/index.html). You can still open it directly with `file://` and drag in a `.nes` ROM, or serve/deploy the repo and use the bundled public-domain quicklaunch library.

## Features

- Single-file emulator with no HTTP server requirement
- Bundled Zophar NES public-domain library with quicklaunch when served over HTTP(S)
- Drag-and-drop or manual ROM selection
- Mapper 0 / NROM, 1 / MMC1, 2 / UxROM, 3 / CNROM, and 4 / MMC3 iNES support
- 6502 CPU core with official opcodes and common unofficial NOPs
- PPU rendering with scrolling, sprites, OAM DMA, NMI, palette RAM, and nametable mirroring
- Browser audio with pulse, triangle, noise, frame counter timing, and DMC direct-level mixing
- Keyboard controller input

## Run

Open [`index.html`](/Users/tsilva/repos/romhacking/index.html) directly in your browser for drag-and-drop loading.

To use the bundled ROM quicklaunch panel, serve or deploy the repo so [`roms/pdroms/nes/catalog.json`](/Users/tsilva/repos/romhacking/roms/pdroms/nes/catalog.json) and the ROM files can be fetched over HTTP(S).

## Controls

- Arrows: D-pad
- `Z`: B
- `X`: A
- `Enter`: Start
- `Shift`: Select
- Click `Enable Audio` once to unlock browser playback before or during play

## Notes

- This build currently targets mapper 0, 1, 2, 3, and 4 ROMs.
- Audio playback requires a user gesture in the browser; the page exposes an `Enable Audio` button for that unlock step.
- The bundled Zophar sync currently resolves 36 `.nes` files, with 35 launchable in this mapper set and the mapper-5 `TMNT Demo` shown but disabled.

## ROM Sync

Run `node scripts/sync-pdroms.mjs` to re-fetch the Zophar NES PD-ROM bundle into [`roms/pdroms/nes`](/Users/tsilva/repos/romhacking/roms/pdroms/nes).
