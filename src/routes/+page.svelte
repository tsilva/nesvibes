<script>
  import { onMount } from "svelte";
  import "@fontsource/silkscreen/latin.css";
  import "../app.css";

  export let data;

  const CATALOG_URL = "/roms/pdroms/nes/catalog.json";

  let canvas;
  let emulator;
  let emulatorPromise;
  let filePicker;
  let romCatalog = [];
  let activeCatalogId = "";
  let catalogMessage = "Loading bundled ROMs...";
  let stageMode = "empty";
  let isDragging = false;
  let overlayTitle = "Drop a `.nes` ROM";
  let overlayCopy = "Drop a ROM here, or click this prompt to choose one.";

  function setOverlay(title, message) {
    overlayTitle = title;
    overlayCopy = message;
  }

  function setStageMode(mode) {
    stageMode = mode;
  }

  function formatRomSize(sizeBytes) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  function assetPath(path) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  async function ensureEmulator() {
    if (emulator) {
      return emulator;
    }

    if (!canvas) {
      throw new Error("The emulator display is not ready yet.");
    }

    if (!emulatorPromise) {
      emulatorPromise = import("$lib/emu/nes-emulator.js")
        .then(({ createNesEmulator }) => {
          emulator = createNesEmulator({
            canvas,
            onRuntimeError: handleEmulatorRuntimeError
          });
          return emulator;
        })
        .catch((error) => {
          emulatorPromise = undefined;
          handleEmulatorRuntimeError(error);
          throw error;
        });
    }

    return emulatorPromise;
  }

  async function enableAudio() {
    const runtime = await ensureEmulator();
    return runtime.enableAudio();
  }

  function handleEmulatorRuntimeError(error) {
    setStageMode("error");
    setOverlay(
      "Emulation halted",
      error instanceof Error ? error.message : String(error)
    );
  }

  function loadRomBytes(bytes, successMessage) {
    try {
      emulator.loadRomBytes(bytes);
      setStageMode("loaded");
      setOverlay("Drop another ROM", successMessage);
    } catch (error) {
      setStageMode("error");
      setOverlay(
        "ROM load failed",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async function loadRomFile(file) {
    if (!file) {
      return;
    }

    await enableAudio();
    activeCatalogId = "";

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      loadRomBytes(
        bytes,
        `${file.name} loaded. Drop another ROM anytime to replace it.`
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function loadBundledRom(entry) {
    try {
      await enableAudio();
      const response = await fetch(assetPath(entry.file), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while fetching ${entry.file}`);
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      loadRomBytes(
        bytes,
        `${entry.title} launched from Quicklaunch. Drop another ROM anytime to replace it.`
      );
      activeCatalogId = entry.id;
    } catch (error) {
      console.error(error);
    }
  }

  async function loadBundledCatalog() {
    if (location.protocol === "file:") {
      catalogMessage = "Quicklaunch needs HTTP(S). Open the deployed site or run a local static server, or keep using drag-and-drop from disk.";
      return;
    }

    try {
      const response = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading ${CATALOG_URL}`);
      }

      romCatalog = await response.json();
      catalogMessage = romCatalog.length === 0 ? "No bundled ROMs available." : "";
    } catch (error) {
      console.error(error);
      catalogMessage = "Bundled ROM catalog failed to load. Drag-and-drop remains available.";
    }
  }

  function isFileDrag(event) {
    return Array.from(event.dataTransfer?.types || []).includes("Files");
  }

  function openRomPicker() {
    void ensureEmulator();
    void enableAudio();
    filePicker?.click();
  }

  async function handleFilePickerChange(event) {
    const [file] = event.currentTarget.files ?? [];
    await loadRomFile(file);
    event.currentTarget.value = "";
  }

  onMount(() => {
    const handleKeydown = (event) => {
      if (emulator?.setButtonByCode(event.code, true)) {
        event.preventDefault();
      }
    };

    const handleKeyup = (event) => {
      if (emulator?.setButtonByCode(event.code, false)) {
        event.preventDefault();
      }
    };

    const handleBlur = () => {
      emulator?.releaseAllButtons();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        emulator?.releaseAllButtons();
      }
    };

    const handleDragEnter = (event) => {
      if (!isFileDrag(event)) {
        return;
      }

      event.preventDefault();
      isDragging = true;
    };

    const handleDragOver = (event) => {
      if (!isFileDrag(event)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      isDragging = true;
    };

    const handleDragLeave = (event) => {
      if (event.relatedTarget === null || event.target === document.documentElement) {
        isDragging = false;
      }
    };

    const handleDrop = async (event) => {
      if (!isFileDrag(event)) {
        return;
      }

      event.preventDefault();
      isDragging = false;
      await loadRomFile(event.dataTransfer?.files?.[0]);
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void loadBundledCatalog();

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      emulator?.destroy();
      emulator = undefined;
      emulatorPromise = undefined;
    };
  });
</script>

<svelte:head>
  <title>NES Vibes</title>
  <meta
    name="description"
    content="Play public-domain and homebrew NES ROMs directly in your browser with drag-and-drop loading and a bundled quicklaunch library."
  />
  <meta name="theme-color" content="#252525" />
  <link
    rel="icon"
    href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23252525'/%3E%3Crect x='8' y='10' width='48' height='44' rx='4' fill='%23c7c7c7'/%3E%3Crect x='14' y='16' width='36' height='18' fill='%23070707'/%3E%3Crect x='18' y='20' width='28' height='10' fill='%233b6fd8'/%3E%3Crect x='14' y='40' width='12' height='4' fill='%23e4000f'/%3E%3Crect x='30' y='40' width='20' height='4' fill='%23909090'/%3E%3C/svg%3E"
  />
</svelte:head>

<div class="page-shell">
  <header class="hero-banner" aria-label="Landing page intro">
    <div class="hero-controls">
      <div class="hero-stats" aria-label="Runtime stats">
        <div class="stat-card input-card">
          <span class="stat-label">Input</span>
          <span class="stat-value input-badge-row" aria-label="Keyboard controls">
            <span class="input-badge-key accent">Z</span>
            <span class="input-badge-key accent">X</span>
            <span class="input-badge-key wide">Shift</span>
            <span class="input-badge-key wide">Enter</span>
          </span>
        </div>
      </div>
      <a
        class="hero-github-link"
        href="https://github.com/tsilva/nesvibes"
        target="_blank"
        rel="noreferrer"
        aria-label="Open NESVibes on GitHub"
        title="View source on GitHub"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 5.08 3.29 9.38 7.85 10.9 0.57 0.11 0.78-0.25 0.78-0.55 0-0.27-0.01-1.16-0.02-2.1-3.19 0.69-3.86-1.35-3.86-1.35-0.52-1.32-1.27-1.67-1.27-1.67-1.04-0.71 0.08-0.7 0.08-0.7 1.15 0.08 1.75 1.18 1.75 1.18 1.02 1.75 2.69 1.24 3.35 0.95 0.1-0.74 0.4-1.24 0.72-1.52-2.55-0.29-5.23-1.28-5.23-5.69 0-1.26 0.45-2.28 1.18-3.08-0.12-0.29-0.51-1.46 0.11-3.04 0 0 0.96-0.31 3.14 1.18 0.91-0.25 1.88-0.37 2.85-0.38 0.97 0.01 1.94 0.13 2.85 0.38 2.17-1.49 3.13-1.18 3.13-1.18 0.62 1.58 0.23 2.75 0.11 3.04 0.73 0.8 1.18 1.82 1.18 3.08 0 4.42-2.68 5.39-5.24 5.68 0.41 0.36 0.78 1.05 0.78 2.12 0 1.53-0.01 2.76-0.01 3.14 0 0.3 0.21 0.67 0.79 0.55 4.55-1.52 7.83-5.82 7.83-10.89C23.5 5.65 18.35 0.5 12 0.5Z"
          />
        </svg>
      </a>
    </div>
    <div class="hero-grid">
      <div>
        <p class="eyebrow">8-bit ROM lab</p>
        <h1 class="hero-title">NESVibes</h1>
        <p class="hero-lede">Play NES directly in your browser.</p>
        <p class="hero-meta">{data.emulatorLocLabel}</p>
      </div>
    </div>
  </header>

  <main class="content-grid">
    <section class="cabinet" aria-label="NES player">
      <input
        bind:this={filePicker}
        type="file"
        accept=".nes,application/octet-stream"
        hidden
        on:change={handleFilePickerChange}
      />
      <div class="stage-shell">
        <section
          class={`stage ${stageMode}${isDragging ? " dragging" : ""}`}
          aria-label="ROM drop zone"
        >
          <canvas bind:this={canvas} id="screen" width="256" height="240" tabindex="0" aria-label="NES screen"></canvas>
          <button class="overlay" type="button" on:click={openRomPicker}>
            <p class="loader-kicker">PLAYER ONE READY</p>
            <strong>{overlayTitle}</strong>
            <p id="loader-copy">{overlayCopy}</p>
          </button>
        </section>
      </div>
    </section>

    <aside class="side-rail" aria-label="Setup notes">
      <article class="launcher-shell" aria-label="Bundled public domain quicklaunch">
        <div class="launcher-header">
          <h2>Public Domain ROMs</h2>
        </div>

        {#if catalogMessage}
          <p class="launcher-empty">{catalogMessage}</p>
        {:else}
          <ul class="launcher-grid" aria-label="Bundled ROM list">
            {#each romCatalog as entry (entry.id)}
              <li class="launcher-list-item">
                <button
                  type="button"
                  class={`launcher-item ${entry.id === activeCatalogId ? "active" : ""} ${entry.supported ? "" : "unsupported"}`.trim()}
                  disabled={!entry.supported}
                  title={entry.supported
                    ? `${entry.title} • Mapper ${entry.mapper} • ${formatRomSize(entry.sizeBytes)}`
                    : `${entry.title} is unavailable in this build (mapper ${entry.mapper})`}
                  on:click={() => void loadBundledRom(entry)}
                >
                  <strong>{entry.title}</strong>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </article>
    </aside>
  </main>
</div>
