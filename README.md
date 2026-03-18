# NES Vibes

This repository now ships as a single self-contained [`index.html`](/Users/tsilva/repos/romhacking/index.html) file. Open it directly in a browser with `file://`, then drag a `.nes` ROM into the viewport to load it.

## Features

- Single-file emulator with no HTTP server requirement
- Drag-and-drop or manual ROM selection
- Mapper 0 / NROM, 1 / MMC1, 2 / UxROM, 3 / CNROM, and 4 / MMC3 iNES support
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

- This build currently targets mapper 0, 1, 2, 3, and 4 ROMs.
- Audio is not implemented.
