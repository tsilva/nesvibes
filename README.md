# NES Vibes

This repository now ships as a single self-contained [`index.html`](/Users/tsilva/repos/romhacking/index.html) file. Open it directly in a browser with `file://`, then drag a `.nes` ROM into the viewport to load it.

## Features

- Single-file emulator with no HTTP server requirement
- Drag-and-drop or manual ROM selection
- Mapper 0 / NROM iNES support
- 6502 CPU core with official opcodes and common unofficial NOPs
- PPU rendering with scrolling, sprites, OAM DMA, NMI, palette RAM, and nametable mirroring
- Keyboard controller input

## Run

Open [`index.html`](/Users/tsilva/repos/romhacking/index.html) directly in your browser.

## Controls

- Arrows: D-pad
- `Z`: B
- `X`: A
- `Enter`: Start
- `Shift`: Select

## Notes

- This build intentionally targets mapper 0 ROMs only.
- Audio is not implemented.
