<script>
  import { onMount } from "svelte";
  import "../app.css";
  import { createNesEmulator } from "$lib/emu/nes-emulator.js";

  const CATALOG_URL = "/roms/pdroms/nes/catalog.json";

  let canvas;
  let emulator;
  let romCatalog = [];
  let activeCatalogId = "";
  let catalogMessage = "Loading bundled ROMs...";
  let stageMode = "empty";
  let isDragging = false;
  let overlayTitle = "Drop a `.nes` ROM";
  let overlayCopy = "Enable audio, then drag in a ROM or launch one from the library.";
  let audioMessage = "Click to arm browser audio, then boot a ROM.";
  let audioTone = "ready";
  let audioButtonLabel = "Enable Audio";

  function setAudioStatus(message, tone = "ready", buttonLabel = "Enable Audio") {
    audioMessage = message;
    audioTone = tone;
    audioButtonLabel = buttonLabel;
  }

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

  async function enableAudio() {
    return emulator?.enableAudio() ?? false;
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
        `${file.name} loaded. Drag a new ROM into the window to replace it.`
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
        `${entry.title} launched from Quicklaunch. Drag another ROM anytime to replace it.`
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

  onMount(() => {
    emulator = createNesEmulator({
      canvas,
      onAudioStatus: setAudioStatus,
      onRuntimeError: handleEmulatorRuntimeError
    });

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
    };
  });
</script>

<svelte:head>
  <title>NES Vibes</title>
  <link
    rel="icon"
    href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23252525'/%3E%3Crect x='8' y='10' width='48' height='44' rx='4' fill='%23c7c7c7'/%3E%3Crect x='14' y='16' width='36' height='18' fill='%23070707'/%3E%3Crect x='18' y='20' width='28' height='10' fill='%233b6fd8'/%3E%3Crect x='14' y='40' width='12' height='4' fill='%23e4000f'/%3E%3Crect x='30' y='40' width='20' height='4' fill='%23909090'/%3E%3C/svg%3E"
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="page-shell">
  <header class="hero-banner" aria-label="Landing page intro">
    <div class="hero-grid">
      <div>
        <p class="eyebrow">8-bit ROM lab</p>
        <h1 class="hero-title">NESVibes</h1>
        <p class="hero-lede">Play NES directly in your browser.</p>
        <p class="hero-meta">Svelte shell. Emulator isolated in one module. Tuned for Vercel.</p>
        <div class="hero-badges" aria-label="Platform highlights">
          <span class="badge alt">Svelte</span>
          <span class="badge">Vercel-ready</span>
          <span class="badge">Single-file emulator core</span>
        </div>
      </div>
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
        <div class="stat-card">
          <span class="stat-label">Audio</span>
          <div class="audio-panel">
            <p class="audio-status" data-tone={audioTone}>{audioMessage}</p>
            <button class="audio-button" type="button" on:click={() => void enableAudio()}>
              {audioButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="content-grid">
    <section class="cabinet" aria-label="NES player">
      <div class="stage-shell">
        <section
          class={`stage ${stageMode}${isDragging ? " dragging" : ""}`}
          aria-label="ROM drop zone"
        >
          <canvas bind:this={canvas} id="screen" width="256" height="240" tabindex="0" aria-label="NES screen"></canvas>
          <div class="overlay">
            <p class="loader-kicker">PLAYER ONE READY</p>
            <strong>{overlayTitle}</strong>
            <p id="loader-copy">{overlayCopy}</p>
          </div>
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
          <div class="launcher-grid" role="list">
            {#each romCatalog as entry (entry.id)}
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
            {/each}
          </div>
        {/if}
      </article>
    </aside>
  </main>
</div>
