<script>
  import { onMount } from "svelte";
  import "@fontsource/silkscreen/latin.css";
  import "../app.css";

  export let data;

  const CATALOG_URL = "/roms/pdroms/nes/catalog.json";
  const BUTTON_ORDER = ["up", "down", "left", "right", "select", "start", "b", "a"];
  const KEYBOARD_BUTTON_MAP = new Map([
    ["KeyZ", "b"],
    ["KeyX", "a"],
    ["ShiftLeft", "select"],
    ["ShiftRight", "select"],
    ["Enter", "start"],
    ["ArrowUp", "up"],
    ["ArrowDown", "down"],
    ["ArrowLeft", "left"],
    ["ArrowRight", "right"],
  ]);
  const SYSTEM_BUTTONS = [
    { button: "select", label: "Select", key: "SHIFT" },
    { button: "start", label: "Start", key: "ENTER" },
  ];
  const ACTION_BUTTONS = [
    { button: "b", label: "B", key: "Z", tone: "secondary" },
    { button: "a", label: "A", key: "X", tone: "primary" },
  ];

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
  let pressedButtons = createPressedButtons();

  function createPressedButtons() {
    return BUTTON_ORDER.reduce((state, button) => {
      state[button] = false;
      return state;
    }, {});
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

  function setPressedButton(button, pressed) {
    if (!button || pressedButtons[button] === undefined) {
      return false;
    }

    if (pressedButtons[button] !== pressed) {
      pressedButtons = {
        ...pressedButtons,
        [button]: pressed,
      };
    }

    emulator?.setButton(button, pressed);
    return true;
  }

  function releaseAllInputs() {
    pressedButtons = createPressedButtons();
    emulator?.releaseAllButtons();
  }

  function handleControllerPress(button, event) {
    event.preventDefault();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    void enableAudio().catch(() => {});
    setPressedButton(button, true);
  }

  function handleControllerRelease(button, event) {
    event.preventDefault();
    setPressedButton(button, false);
  }

  async function handleFilePickerChange(event) {
    const [file] = event.currentTarget.files ?? [];
    await loadRomFile(file);
    event.currentTarget.value = "";
  }

  onMount(() => {
    const handleKeydown = (event) => {
      const button = KEYBOARD_BUTTON_MAP.get(event.code);
      if (!button) {
        return;
      }

      setPressedButton(button, true);
      event.preventDefault();
    };

    const handleKeyup = (event) => {
      const button = KEYBOARD_BUTTON_MAP.get(event.code);
      if (!button) {
        return;
      }

      setPressedButton(button, false);
      event.preventDefault();
    };

    const handleBlur = () => {
      releaseAllInputs();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        releaseAllInputs();
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
      releaseAllInputs();
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
        <p class="hero-meta">
          <a
            class="hero-meta-link"
            href={data.emulatorSourceUrl}
            rel="external"
          >
            {data.emulatorLocLabel}
          </a>
        </p>
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

      <section class="controller-dock" aria-label="Live NES controller">
        <div class="controller-shell">
          <div class="controller-body">
            <div class="dpad-cluster" role="group" aria-label="Directional pad">
              <button
                type="button"
                class={`pad-button dpad-button up ${pressedButtons.up ? "pressed" : ""}`.trim()}
                aria-label="Up"
                aria-pressed={pressedButtons.up}
                on:pointerdown={(event) => handleControllerPress("up", event)}
                on:pointerup={(event) => handleControllerRelease("up", event)}
                on:pointercancel={(event) => handleControllerRelease("up", event)}
                on:lostpointercapture={() => setPressedButton("up", false)}
              >
                <span class="pad-button-face">Up</span>
                <span class="pad-button-key">Up</span>
              </button>

              <button
                type="button"
                class={`pad-button dpad-button left ${pressedButtons.left ? "pressed" : ""}`.trim()}
                aria-label="Left"
                aria-pressed={pressedButtons.left}
                on:pointerdown={(event) => handleControllerPress("left", event)}
                on:pointerup={(event) => handleControllerRelease("left", event)}
                on:pointercancel={(event) => handleControllerRelease("left", event)}
                on:lostpointercapture={() => setPressedButton("left", false)}
              >
                <span class="pad-button-face">Left</span>
                <span class="pad-button-key">Left</span>
              </button>

              <div class="dpad-core" aria-hidden="true"></div>

              <button
                type="button"
                class={`pad-button dpad-button right ${pressedButtons.right ? "pressed" : ""}`.trim()}
                aria-label="Right"
                aria-pressed={pressedButtons.right}
                on:pointerdown={(event) => handleControllerPress("right", event)}
                on:pointerup={(event) => handleControllerRelease("right", event)}
                on:pointercancel={(event) => handleControllerRelease("right", event)}
                on:lostpointercapture={() => setPressedButton("right", false)}
              >
                <span class="pad-button-face">Right</span>
                <span class="pad-button-key">Right</span>
              </button>

              <button
                type="button"
                class={`pad-button dpad-button down ${pressedButtons.down ? "pressed" : ""}`.trim()}
                aria-label="Down"
                aria-pressed={pressedButtons.down}
                on:pointerdown={(event) => handleControllerPress("down", event)}
                on:pointerup={(event) => handleControllerRelease("down", event)}
                on:pointercancel={(event) => handleControllerRelease("down", event)}
                on:lostpointercapture={() => setPressedButton("down", false)}
              >
                <span class="pad-button-face">Down</span>
                <span class="pad-button-key">Down</span>
              </button>
            </div>

            <div class="controller-center-panel">
              <div class="controller-badge" aria-hidden="true">
                <span class="controller-brand">Nintendo Entertainment System</span>
                <span class="controller-player">Player One</span>
              </div>

              <div class="system-button-group" role="group" aria-label="System buttons">
                {#each SYSTEM_BUTTONS as control (control.button)}
                  <button
                    type="button"
                    class={`pad-button system-button ${pressedButtons[control.button] ? "pressed" : ""}`.trim()}
                    aria-label={control.label}
                    aria-pressed={pressedButtons[control.button]}
                    on:pointerdown={(event) => handleControllerPress(control.button, event)}
                    on:pointerup={(event) => handleControllerRelease(control.button, event)}
                    on:pointercancel={(event) => handleControllerRelease(control.button, event)}
                    on:lostpointercapture={() => setPressedButton(control.button, false)}
                  >
                    <span class="pad-button-face">{control.label}</span>
                    <span class="pad-button-key">{control.key}</span>
                  </button>
                {/each}
              </div>
            </div>

            <div class="action-cluster" role="group" aria-label="Action buttons">
              {#each ACTION_BUTTONS as control (control.button)}
                <button
                  type="button"
                  class={`pad-button action-button ${control.tone} ${pressedButtons[control.button] ? "pressed" : ""}`.trim()}
                  aria-label={control.label}
                  aria-pressed={pressedButtons[control.button]}
                  on:pointerdown={(event) => handleControllerPress(control.button, event)}
                  on:pointerup={(event) => handleControllerRelease(control.button, event)}
                  on:pointercancel={(event) => handleControllerRelease(control.button, event)}
                  on:lostpointercapture={() => setPressedButton(control.button, false)}
                >
                  <span class="action-button-label">{control.label}</span>
                  <span class="pad-button-key">{control.key}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>
      </section>
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
