<div align="center">
  <img src="logo.png" alt="nesvibes" width="512"/>

  [![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
  [![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://nesvibes.tsilva.eu)
  [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

  **Vibecoded with GPT-5.4. Play public-domain and homebrew NES games right in your browser.**

  [Live Demo](https://nesvibes.tsilva.eu) · [GitHub](https://github.com/tsilva/nesvibes)
</div>

---

## 🕹️ Overview

**The Punchline:** nesvibes is vibecoded with GPT-5.4, and that is the point.

**The Pain:** Setting up NES emulators means downloading apps, hunting for ROMs, and fiddling with configs — just to play a quick round of a retro game.

**The Solution:** nesvibes is a browser-native NES emulator built with SvelteKit. It ships with 44 playable bundled ROMs spanning public-domain and redistributable homebrew releases, supports drag-and-drop for your own `.nes` files, and runs entirely client-side.

**The Result:** Open a URL, pick a game, play. Zero setup, works on desktop and mobile.

<div align="center">

| Metric | Value |
|--------|-------|
| 🎮 Built-in ROMs | 44 playable bundled titles |
| 🗺️ Mappers | 5 (NROM, MMC1, UxROM, CNROM, MMC3) |
| 🔧 Setup | Zero — just open the URL |

</div>

## ✨ Features

- ⚡ **Instant play** — 44 bundled public-domain and licensed homebrew ROMs with quicklaunch sidebar
- 📂 **Drag & drop** — load your own `.nes` files straight from disk
- 🗺️ **5 mapper support** — NROM (0), MMC1 (1), UxROM (2), CNROM (3), MMC3 (4)
- 🔊 **Authentic audio** — pulse, triangle, and noise channels via AudioWorklet
- 🐛 **Built-in debugger** — CPU registers, memory hex viewer, step-through execution
- 📱 **Mobile touch controls** — on-screen D-pad and buttons for phones and tablets
- 🖥️ **Fullscreen mode** — press `F` or click the button for immersive play
- 🎨 **Retro UI** — dark theme with scanline grid, NES-inspired color accents, and Silkscreen font

## 🚀 Quick Start

### Play online

Head to **[nesvibes.tsilva.eu](https://nesvibes.tsilva.eu)** and pick a ROM from the sidebar.

### Run locally

```bash
git clone https://github.com/tsilva/nesvibes.git
cd nesvibes
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Enable Google Analytics 4 with a public measurement ID:

```bash
PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX npm run dev
```

Enable Sentry error reporting with a public DSN:

```bash
PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0 npm run dev
```

Run the project checks:

```bash
npm run check
```

Verify the production security header policy:

```bash
npm run check:headers
```

You can also verify a deployed URL matches the checked-in policy:

```bash
npm run check:headers -- https://nesvibes.tsilva.eu
```

## 🎮 Controls

### ⌨️ Keyboard

| Key | NES Button |
|-----|------------|
| Arrow keys | D-pad |
| `Z` | B |
| `X` | A |
| `Enter` | Start |
| `Shift` | Select |
| `F` | Fullscreen toggle |

### 📱 Touch

On mobile, on-screen controls appear automatically with a D-pad on the left and action buttons on the right.

> **Note:** Click **Enable Audio** once to unlock browser sound playback before or during play.

## 🐛 Debugger

On desktop viewports (≥981px), a debugger panel docks to the right edge with:

- **CPU registers** — PC, A, X, Y, SP, and status flags
- **Memory viewer** — hex dump with ASCII column, navigate to any address (0000–FFFF)
- **Execution controls** — Play, Pause, and Step for instruction-level debugging

Toggle it with the debug icon in the bottom corner.

## 🗺️ Mapper Support

| Mapper | Name | Status |
|--------|------|--------|
| 0 | NROM | ✅ Supported |
| 1 | MMC1 | ✅ Supported |
| 2 | UxROM | ✅ Supported |
| 3 | CNROM | ✅ Supported |
| 4 | MMC3 | ✅ Supported |
| 5 | MMC5 | ⚠️ Shown but disabled |

## 📁 Project Structure

```
src/
├── lib/
│   ├── emu/
│   │   ├── nes-emulator.js          # Core emulator (~2.5k LOC)
│   │   └── audio-output-worklet.js  # AudioWorklet processor
│   ├── components/
│   │   └── EmulatorDebugger.svelte   # Debugger panel UI
│   └── debugger/
│       └── create-emulator-debugger.js
├── routes/
│   └── +page.svelte                  # Main app shell
└── app.css                           # Global styles

static/roms/pdroms/nes/
├── catalog.json                      # ROM metadata (36 entries)
└── library/                          # Public-domain ROM files
```

## 🛠️ Tech Stack

- **[SvelteKit](https://kit.svelte.dev/)** — app framework with SSR and prerendering
- **[Vite](https://vitejs.dev/)** — dev server and build tool
- **[Vercel](https://vercel.com/)** — deployment platform
- **[Silkscreen](https://fonts.google.com/specimen/Silkscreen)** — retro display font
- **[Lucide](https://lucide.dev/)** — icon library
- **Web Audio API** — AudioWorklet-based sound pipeline

## 📝 Notes

- The bundled ROM library is served from `static/roms/pdroms/nes` and `static/roms/licensed/nes`.
- 45 ROMs are cataloged in total: 36 public-domain entries and 9 redistributable homebrew entries.
- 44 bundled ROMs are launchable with the current mapper set. The mapper-5 TMNT Demo is shown but disabled.
- The emulator runs entirely client-side. Google Analytics is only loaded when `PUBLIC_GOOGLE_ANALYTICS_ID` is set, and it is deferred until after mount so it stays out of the render path.
- Sentry is enabled when `PUBLIC_SENTRY_DSN` is set.
- Production deployments attach static security headers from `vercel.json`, including CSP, HSTS, COOP, and clickjacking/content-sniffing protections.

## ⭐ Support

If you enjoy nesvibes, consider [giving it a star on GitHub](https://github.com/tsilva/nesvibes) ⭐
