# NES Emulator

This repository now contains a small browser-based NES emulator written from scratch for the bundled `SuperMarioBros-Nes-v0.nes` ROM.

## Features

- 6502 CPU core with official opcodes and common unofficial NOPs
- iNES parsing for mapper 0 / NROM
- PPU rendering with scrolling, sprites, OAM DMA, NMI, palette RAM, and nametable mirroring
- Keyboard controller input
- No external dependencies

## Run

Serve the folder over HTTP and open the page in a browser:

```sh
cd /Users/tsilva/repos/romhacking
python3 -m http.server 8000
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Controls

- Arrows: D-pad
- `Z`: B
- `X`: A
- `Enter`: Start
- `Shift`: Select

## Notes

- This emulator is intentionally scoped to the included mapper 0 ROM.
- Audio is not implemented.
