# NES Vibes

NES Vibes is now a SvelteKit app optimized for Vercel preview deployments. The emulator runtime lives in a single isolated module at [`src/lib/emu/nes-emulator.js`](/Users/tsilva/repos/romhacking/src/lib/emu/nes-emulator.js), while the UI shell, drag-and-drop, quicklaunch, and audio state live in [`src/routes/+page.svelte`](/Users/tsilva/repos/romhacking/src/routes/+page.svelte).

## Run

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Build the deployment bundle with:

```bash
npm run build
```

## Controls

- Arrows: D-pad
- `Z`: B
- `X`: A
- `Enter`: Start
- `Shift`: Select
- Click `Enable Audio` once to unlock browser playback before or during play

## Notes

- The bundled public-domain library is served from [`static/roms/pdroms/nes`](/Users/tsilva/repos/romhacking/static/roms/pdroms/nes).
- This build currently targets mapper 0, 1, 2, 3, and 4 ROMs.
- The bundled Zophar sync currently resolves 36 `.nes` files, with 35 launchable in this mapper set and the mapper-5 `TMNT Demo` shown but disabled.

## ROM Sync

Run `node scripts/sync-pdroms.mjs` to re-fetch the Zophar NES PD-ROM bundle into [`static/roms/pdroms/nes`](/Users/tsilva/repos/romhacking/static/roms/pdroms/nes).
