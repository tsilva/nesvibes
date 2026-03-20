<script>
  import { onMount } from "svelte";
  import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    EyeOff,
    Gamepad2,
    Joystick,
    Keyboard,
    Maximize2,
    Minimize2,
  } from "lucide-svelte";
  import "../app.css";

  export let data;

  const PUBLIC_DOMAIN_CATALOG_URL = "/roms/pdroms/nes/catalog.json";
  const LICENSED_CATALOG_URL = "/roms/licensed/nes/catalog.json";
  const CANVAS_CONTROL_MODES = ["controls", "gamepad", "keys", "hidden"];
  const DESKTOP_CANVAS_CONTROL_MODES = CANVAS_CONTROL_MODES.filter((mode) => mode !== "gamepad");
  const BUTTON_ORDER = ["up", "down", "left", "right", "select", "start", "b", "a"];
  const DIRECTIONAL_BUTTONS = ["up", "down", "left", "right"];
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
  const BUTTON_KEY_LABELS = new Map([
    ["select", "Shift"],
    ["start", "Enter"],
    ["b", "Z"],
    ["a", "X"],
  ]);
  const TOUCH_DIRECTION_BUTTONS = [
    { button: "up", label: "Up", position: "up", icon: ArrowUp },
    { button: "left", label: "Left", position: "left", icon: ArrowLeft },
    { button: "right", label: "Right", position: "right", icon: ArrowRight },
    { button: "down", label: "Down", position: "down", icon: ArrowDown },
  ];
  const SYSTEM_BUTTONS = [
    { button: "select", label: "Select" },
    { button: "start", label: "Start" },
  ];
  const ACTION_BUTTONS = [
    { button: "b", label: "B", tone: "secondary" },
    { button: "a", label: "A", tone: "primary" },
  ];
  const DESKTOP_DEBUGGER_QUERY = "(min-width: 981px)";
  const COARSE_POINTER_QUERY = "(pointer: coarse)";
  const EMPTY_OVERLAY_TITLE = "Drop a `.nes` ROM";
  const RELOAD_OVERLAY_TITLE = "Drop another ROM";
  const DESKTOP_EMPTY_OVERLAY_COPY = "Drop a ROM here, or click this prompt to choose one.";
  const MOBILE_EMPTY_OVERLAY_COPY = "Click this prompt to choose a ROM.";
  const ROM_MODE_PARAM_NAMES = ["romMode", "rom-mode", "mode"];
  const ROM_MODE_RANK_BY_ALIAS = new Map([
    ["most-valuable", 0],
    ["most-valuable-rom", 0],
    ["most-valuable-rom-mode", 0],
    ["next-most-valuable", 1],
    ["next-most-valuable-rom", 1],
    ["next-most-valuable-rom-mode", 1],
  ]);
  const JOYSTICK_MAX_DISTANCE = 34;
  const JOYSTICK_DEAD_ZONE = 0.38;

  let canvas;
  let stageElement;
  let emulator;
  let emulatorPromise;
  let debuggerComponent = null;
  let debuggerController = null;
  let debuggerEnabled = false;
  let filePicker;
  let romCatalog = [];
  let licensedCatalog = [];
  let activeLibraryId = "";
  let catalogMessage = "Loading bundled ROMs...";
  let licensedCatalogMessage = "Loading redistributable homebrew...";
  let stageMode = "empty";
  let isMobileMode = false;
  let isDragging = false;
  let isFullscreen = false;
  let fullscreenSupported = false;
  let overlayVariant = "empty";
  let overlayLoadedPrefix = "";
  let overlayTitle = EMPTY_OVERLAY_TITLE;
  let overlayCopy = DESKTOP_EMPTY_OVERLAY_COPY;
  let pressedButtons = createPressedButtons();
  let joystickState = createJoystickState();
  let canToggleFullscreen = false;
  let hasTouchInput = false;
  let requestedRomMode = null;
  let canvasControlsMode = "controls";

  $: effectiveCanvasControlsMode = isMobileMode
    ? "gamepad"
    : canvasControlsMode === "gamepad"
      ? "controls"
      : canvasControlsMode;
  $: libraryEntries = [
    ...romCatalog.map((entry) => ({
      ...entry,
      collectionLabel: "Public domain",
      sourceKind: "public-domain"
    })),
    ...licensedCatalog.map((entry) => ({
      ...entry,
      collectionLabel: "Licensed homebrew",
      sourceKind: "licensed"
    }))
  ].sort((a, b) => a.title.localeCompare(b.title));
  $: selectedLibraryEntry =
    libraryEntries.find((entry) => entry.id === activeLibraryId) ?? null;
  $: libraryStatusMessages = [
    romCatalog.length === 0 && catalogMessage ? catalogMessage : "",
    licensedCatalog.length === 0 && licensedCatalogMessage ? licensedCatalogMessage : ""
  ].filter(Boolean);
  $: canToggleFullscreen = fullscreenSupported && stageMode === "loaded";
  $: showCanvasControls = stageMode === "loaded" && effectiveCanvasControlsMode !== "hidden";
  $: showJoystickOverlay = effectiveCanvasControlsMode === "gamepad" && (hasTouchInput || isMobileMode);

  function refreshDebugger() {
    debuggerController?.refresh();
  }

  async function enableDesktopDebugger() {
    if (debuggerEnabled || typeof window === "undefined") {
      return;
    }

    const [{ default: EmulatorDebugger }, { createEmulatorDebugger }] = await Promise.all([
      import("$lib/components/EmulatorDebugger.svelte"),
      import("$lib/debugger/create-emulator-debugger.js"),
    ]);

    debuggerController = createEmulatorDebugger();
    debuggerComponent = EmulatorDebugger;
    debuggerEnabled = true;

    if (emulator) {
      debuggerController.attachEmulator(emulator);
      refreshDebugger();
    }
  }

  function disableDesktopDebugger() {
    debuggerController?.detachEmulator();
    debuggerController = null;
    debuggerComponent = null;
    debuggerEnabled = false;
  }

  function createPressedButtons() {
    return BUTTON_ORDER.reduce((state, button) => {
      state[button] = false;
      return state;
    }, {});
  }

  function createJoystickState() {
    return {
      active: false,
      pointerId: null,
      x: 0,
      y: 0,
    };
  }

  function setCanvasControlsMode(mode) {
    if (isMobileMode) {
      return;
    }

    if (canvasControlsMode === "gamepad" && mode !== "gamepad") {
      releaseJoystick();
    }

    canvasControlsMode = mode;
  }

  function cycleCanvasControlsMode() {
    const availableModes = isMobileMode ? CANVAS_CONTROL_MODES : DESKTOP_CANVAS_CONTROL_MODES;
    const currentMode = availableModes.includes(effectiveCanvasControlsMode)
      ? effectiveCanvasControlsMode
      : availableModes[0];
    const currentIndex = availableModes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % availableModes.length;
    setCanvasControlsMode(availableModes[nextIndex]);
  }

  function getCanvasControlsModeLabel(mode) {
    if (mode === "gamepad") {
      return "Touch gamepad overlay";
    }

    if (mode === "keys") {
      return "Keyboard overlay";
    }

    if (mode === "hidden") {
      return "Overlay hidden";
    }

    return "Controls overlay";
  }

  function getCanvasControlsModeIcon(mode) {
    if (mode === "gamepad") {
      return Joystick;
    }

    if (mode === "keys") {
      return Keyboard;
    }

    if (mode === "hidden") {
      return EyeOff;
    }

    return Gamepad2;
  }

  function getCanvasControlText(control, mode) {
    return mode === "keys"
      ? BUTTON_KEY_LABELS.get(control.button) ?? control.label
      : control.label;
  }

  function getEmptyOverlayCopy() {
    return isMobileMode ? MOBILE_EMPTY_OVERLAY_COPY : DESKTOP_EMPTY_OVERLAY_COPY;
  }

  function getLoadedOverlayCopy(prefix) {
    return isMobileMode
      ? `${prefix}. Click this prompt anytime to replace it.`
      : `${prefix}. Drop another ROM anytime to replace it.`;
  }

  function syncOverlayForViewport() {
    if (overlayVariant === "empty") {
      overlayTitle = EMPTY_OVERLAY_TITLE;
      overlayCopy = getEmptyOverlayCopy();
      return;
    }

    if (overlayVariant === "loaded") {
      overlayTitle = RELOAD_OVERLAY_TITLE;
      overlayCopy = getLoadedOverlayCopy(overlayLoadedPrefix);
    }
  }

  function setOverlay(title, message) {
    overlayVariant = "custom";
    overlayLoadedPrefix = "";
    overlayTitle = title;
    overlayCopy = message;
  }

  function setEmptyOverlay() {
    overlayVariant = "empty";
    overlayLoadedPrefix = "";
    syncOverlayForViewport();
  }

  function setLoadedOverlay(prefix) {
    overlayVariant = "loaded";
    overlayLoadedPrefix = prefix;
    syncOverlayForViewport();
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

  function getLicenseLabel(entry) {
    if (entry.assetLicenseName) {
      return `${entry.licenseName} code / ${entry.assetLicenseName} assets`;
    }

    return entry.licenseName;
  }

  function getEntryLicenseSummary(entry) {
    return entry.licenseName ? getLicenseLabel(entry) : "Public domain";
  }

  function normalizeRomMode(value) {
    return value
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-");
  }

  function getRequestedRomMode(search) {
    const params = new URLSearchParams(search);

    for (const paramName of ROM_MODE_PARAM_NAMES) {
      const value = params.get(paramName);
      if (!value) {
        continue;
      }

      const normalizedValue = normalizeRomMode(value);
      if (ROM_MODE_RANK_BY_ALIAS.has(normalizedValue)) {
        return normalizedValue;
      }
    }

    return null;
  }

  // Larger supported ROMs tend to exercise more of the emulator and expose more content,
  // so size is the primary ranking signal for the auto-launch "value" modes.
  function compareRomValue(a, b) {
    return (
      b.sizeBytes - a.sizeBytes ||
      b.prgBanks - a.prgBanks ||
      b.chrBanks - a.chrBanks ||
      a.title.localeCompare(b.title)
    );
  }

  function getRomEntryForMode(catalog, mode) {
    if (!mode) {
      return null;
    }

    const requestedRank = ROM_MODE_RANK_BY_ALIAS.get(mode);
    if (requestedRank === undefined) {
      return null;
    }

    const supportedEntries = catalog.filter((entry) => entry.supported).sort(compareRomValue);
    return supportedEntries[requestedRank] ?? null;
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
          if (debuggerEnabled) {
            debuggerController?.attachEmulator(emulator);
          }
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
    refreshDebugger();
    setStageMode("error");
    setOverlay(
      "Emulation halted",
      error instanceof Error ? error.message : String(error)
    );
  }

  function loadRomBytes(bytes, successMessage) {
    try {
      emulator.loadRomBytes(bytes);
      debuggerController?.resetMemorySearch();
      refreshDebugger();
      setStageMode("loaded");
      setLoadedOverlay(successMessage);
    } catch (error) {
      refreshDebugger();
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
    activeLibraryId = "";

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      loadRomBytes(bytes, `${file.name} loaded`);
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
      loadRomBytes(bytes, `${entry.title} launched from Quicklaunch`);
      activeLibraryId = entry.id;
    } catch (error) {
      console.error(error);
    }
  }

  async function loadBundledCatalog() {
    if (location.protocol === "file:") {
      catalogMessage = "Quicklaunch needs HTTP(S). Open the deployed site or run a local static server, or keep using drag-and-drop from disk.";
      licensedCatalogMessage = "Licensed quicklaunch also needs HTTP(S). Drag-and-drop still works from disk.";
      return;
    }

    try {
      const response = await fetch(PUBLIC_DOMAIN_CATALOG_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading ${PUBLIC_DOMAIN_CATALOG_URL}`);
      }

      romCatalog = await response.json();
      catalogMessage = romCatalog.length === 0 ? "No bundled ROMs available." : "";
      const modeEntry = getRomEntryForMode(romCatalog, requestedRomMode);
      if (modeEntry) {
        await loadBundledRom(modeEntry);
      }

    } catch (error) {
      console.error(error);
      catalogMessage = "Bundled ROM catalog failed to load. Drag-and-drop remains available.";
    }
  }

  async function loadLicensedCatalog() {
    if (location.protocol === "file:") {
      licensedCatalogMessage = "Licensed quicklaunch needs HTTP(S). Drag-and-drop still works from disk.";
      return;
    }

    try {
      const response = await fetch(LICENSED_CATALOG_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading ${LICENSED_CATALOG_URL}`);
      }

      licensedCatalog = await response.json();
      licensedCatalogMessage = licensedCatalog.length === 0 ? "No redistributable homebrew bundled." : "";
    } catch (error) {
      console.error(error);
      licensedCatalogMessage = "Licensed homebrew catalog failed to load.";
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
    joystickState = createJoystickState();
    pressedButtons = createPressedButtons();
    emulator?.releaseAllButtons();
  }

  function syncDirectionalButtons(nextButtons) {
    for (const button of DIRECTIONAL_BUTTONS) {
      setPressedButton(button, nextButtons.has(button));
    }
  }

  function clampJoystickOffset(rawX, rawY) {
    const distance = Math.hypot(rawX, rawY);
    if (distance <= JOYSTICK_MAX_DISTANCE || distance === 0) {
      return { x: rawX, y: rawY };
    }

    const scale = JOYSTICK_MAX_DISTANCE / distance;
    return {
      x: rawX * scale,
      y: rawY * scale,
    };
  }

  function updateJoystickFromEvent(event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    const { x, y } = clampJoystickOffset(event.clientX - centerX, event.clientY - centerY);
    const nextButtons = new Set();

    if ((y / JOYSTICK_MAX_DISTANCE) <= -JOYSTICK_DEAD_ZONE) {
      nextButtons.add("up");
    }

    if ((y / JOYSTICK_MAX_DISTANCE) >= JOYSTICK_DEAD_ZONE) {
      nextButtons.add("down");
    }

    if ((x / JOYSTICK_MAX_DISTANCE) <= -JOYSTICK_DEAD_ZONE) {
      nextButtons.add("left");
    }

    if ((x / JOYSTICK_MAX_DISTANCE) >= JOYSTICK_DEAD_ZONE) {
      nextButtons.add("right");
    }

    joystickState = {
      ...joystickState,
      x,
      y,
    };
    syncDirectionalButtons(nextButtons);
  }

  function releaseJoystick() {
    joystickState = createJoystickState();
    syncDirectionalButtons(new Set());
  }

  function syncFullscreenState() {
    isFullscreen = document.fullscreenElement === stageElement;
  }

  function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName;
    return (
      target.isContentEditable ||
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT"
    );
  }

  async function toggleFullscreenMode() {
    if (!canToggleFullscreen || !stageElement) {
      return;
    }

    try {
      if (document.fullscreenElement === stageElement) {
        await document.exitFullscreen();
      } else {
        await stageElement.requestFullscreen();
        canvas?.focus();
      }
    } catch (error) {
      console.error(error);
    }
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

  function handleJoystickPointerDown(event) {
    event.preventDefault();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    void enableAudio().catch(() => {});
    joystickState = {
      ...joystickState,
      active: true,
      pointerId: event.pointerId,
    };
    updateJoystickFromEvent(event);
  }

  function handleJoystickPointerMove(event) {
    if (!joystickState.active || joystickState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    updateJoystickFromEvent(event);
  }

  function handleJoystickPointerUp(event) {
    if (joystickState.pointerId !== null && joystickState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    releaseJoystick();
  }

  function handleJoystickLostCapture() {
    if (!joystickState.active) {
      return;
    }

    releaseJoystick();
  }

  async function handleFilePickerChange(event) {
    const [file] = event.currentTarget.files ?? [];
    await loadRomFile(file);
    event.currentTarget.value = "";
  }

  onMount(() => {
    const debuggerQuery = window.matchMedia(DESKTOP_DEBUGGER_QUERY);
    const coarsePointerQuery = window.matchMedia(COARSE_POINTER_QUERY);
    requestedRomMode = getRequestedRomMode(window.location.search);

    fullscreenSupported = typeof document.fullscreenEnabled === "boolean"
      ? document.fullscreenEnabled
      : typeof stageElement?.requestFullscreen === "function";

    const syncTouchInput = () => {
      hasTouchInput = navigator.maxTouchPoints > 0 || coarsePointerQuery.matches;
    };

    const syncDebuggerMode = () => {
      const nextIsMobileMode = !debuggerQuery.matches;

      isMobileMode = nextIsMobileMode;
      if (!nextIsMobileMode && canvasControlsMode === "gamepad") {
        releaseJoystick();
        canvasControlsMode = "controls";
      }
      syncOverlayForViewport();

      if (debuggerQuery.matches) {
        void enableDesktopDebugger().catch((error) => {
          console.error(error);
        });
      } else {
        disableDesktopDebugger();
      }
    };

    const handleKeydown = (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "KeyF" && !event.repeat && canToggleFullscreen) {
        void toggleFullscreenMode();
        event.preventDefault();
        return;
      }

      const button = KEYBOARD_BUTTON_MAP.get(event.code);
      if (!button) {
        return;
      }

      setPressedButton(button, true);
      event.preventDefault();
    };

    const handleKeyup = (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

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

    const handleFullscreenChange = () => {
      syncFullscreenState();
      if (document.fullscreenElement === stageElement) {
        canvas?.focus();
      } else {
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
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    void Promise.all([loadBundledCatalog(), loadLicensedCatalog()]);
    syncFullscreenState();
    syncTouchInput();
    syncDebuggerMode();
    coarsePointerQuery.addEventListener("change", syncTouchInput);
    debuggerQuery.addEventListener("change", syncDebuggerMode);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      coarsePointerQuery.removeEventListener("change", syncTouchInput);
      debuggerQuery.removeEventListener("change", syncDebuggerMode);
      releaseAllInputs();
      disableDesktopDebugger();
      emulator?.destroy();
      emulator = undefined;
      emulatorPromise = undefined;
    };
  });
</script>

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
      <div class="hero-copy">
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
        {#if debuggerComponent && debuggerController && stageMode === "loaded"}
          <svelte:component this={debuggerComponent} debuggerController={debuggerController} />
        {/if}
        <section
          bind:this={stageElement}
          class={`stage ${stageMode}${isDragging ? " dragging" : ""}`}
          aria-label="ROM drop zone"
        >
          {#if stageMode === "loaded"}
            <div class="stage-toolbar">
              {#if !isMobileMode}
                <button
                  type="button"
                  class="stage-toolbar-button controls-toggle"
                  aria-label={`Switch controls overlay mode. Currently ${getCanvasControlsModeLabel(effectiveCanvasControlsMode).toLowerCase()}.`}
                  title={`Controls overlay: ${getCanvasControlsModeLabel(effectiveCanvasControlsMode)}`}
                  on:click={() => cycleCanvasControlsMode()}
                >
                  <svelte:component this={getCanvasControlsModeIcon(effectiveCanvasControlsMode)} size={18} strokeWidth={2.25} aria-hidden="true" />
                </button>
              {/if}
              {#if canToggleFullscreen}
                <button
                  type="button"
                  class="stage-toolbar-button fullscreen-toggle"
                  aria-pressed={isFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  on:click={() => void toggleFullscreenMode()}
                >
                  {#if isFullscreen}
                    <Minimize2 size={18} strokeWidth={2.25} aria-hidden="true" />
                  {:else}
                    <Maximize2 size={18} strokeWidth={2.25} aria-hidden="true" />
                  {/if}
                </button>
              {/if}
            </div>
          {/if}
          <canvas bind:this={canvas} id="screen" width="256" height="240" tabindex="0" aria-label="NES screen"></canvas>
          <button class="overlay" type="button" on:click={openRomPicker}>
            <p class="loader-kicker">PLAYER ONE READY</p>
            {#if !(isMobileMode && overlayVariant === "empty")}
              <strong>{overlayTitle}</strong>
            {/if}
            <p id="loader-copy">{overlayCopy}</p>
            {#if overlayVariant === "empty"}
              <p class="overlay-note">Try the Super Mario Bros ROM if you have it :)</p>
            {/if}
          </button>
          {#if showCanvasControls}
            <div class={`touch-controls active ${effectiveCanvasControlsMode === "keys" ? "keys-mode" : ""} ${showJoystickOverlay ? "gamepad-mode" : ""}`.trim()}>
              <div class="touch-cluster touch-system" role="group" aria-label="System buttons">
                {#each SYSTEM_BUTTONS as control (control.button)}
                  <button
                    type="button"
                    class={`touch-button system ${pressedButtons[control.button] ? "pressed" : ""}`.trim()}
                    aria-label={control.label}
                    aria-pressed={pressedButtons[control.button]}
                    on:pointerdown={(event) => handleControllerPress(control.button, event)}
                    on:pointerup={(event) => handleControllerRelease(control.button, event)}
                    on:pointercancel={(event) => handleControllerRelease(control.button, event)}
                    on:lostpointercapture={() => setPressedButton(control.button, false)}
                  >
                    <span class="touch-button-label">{getCanvasControlText(control, effectiveCanvasControlsMode)}</span>
                  </button>
                {/each}
              </div>

              {#if showJoystickOverlay}
                <div class="touch-cluster touch-joystick-shell" role="group" aria-label="Analog directional pad">
                  <div
                    class={`touch-joystick ${joystickState.active ? "active" : ""}`.trim()}
                    aria-hidden="true"
                    on:pointerdown={handleJoystickPointerDown}
                    on:pointermove={handleJoystickPointerMove}
                    on:pointerup={handleJoystickPointerUp}
                    on:pointercancel={handleJoystickPointerUp}
                    on:lostpointercapture={handleJoystickLostCapture}
                  >
                    <span class="touch-joystick-base"></span>
                    <span class="touch-joystick-guide horizontal"></span>
                    <span class="touch-joystick-guide vertical"></span>
                    <span
                      class="touch-joystick-thumb"
                      style={`transform: translate(${joystickState.x}px, ${joystickState.y}px);`}
                    >
                      <Joystick size={24} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              {:else}
                <div class="touch-cluster touch-dpad" role="group" aria-label="Directional pad">
                  {#each TOUCH_DIRECTION_BUTTONS as control (control.button)}
                    <button
                      type="button"
                      class={`touch-button directional ${control.position} ${pressedButtons[control.button] ? "pressed" : ""}`.trim()}
                      aria-label={control.label}
                      aria-pressed={pressedButtons[control.button]}
                      on:pointerdown={(event) => handleControllerPress(control.button, event)}
                      on:pointerup={(event) => handleControllerRelease(control.button, event)}
                      on:pointercancel={(event) => handleControllerRelease(control.button, event)}
                      on:lostpointercapture={() => setPressedButton(control.button, false)}
                    >
                      <span class="touch-button-label touch-button-icon" aria-hidden="true">
                        <svelte:component this={control.icon} size={18} strokeWidth={2.75} />
                      </span>
                    </button>
                  {/each}
                </div>
              {/if}

              <div class="touch-cluster touch-actions" role="group" aria-label="Action buttons">
                {#each ACTION_BUTTONS as control (control.button)}
                  <button
                    type="button"
                    class={`touch-button action ${control.button} ${pressedButtons[control.button] ? "pressed" : ""}`.trim()}
                    aria-label={control.label}
                    aria-pressed={pressedButtons[control.button]}
                    on:pointerdown={(event) => handleControllerPress(control.button, event)}
                    on:pointerup={(event) => handleControllerRelease(control.button, event)}
                    on:pointercancel={(event) => handleControllerRelease(control.button, event)}
                    on:lostpointercapture={() => setPressedButton(control.button, false)}
                  >
                    <span class="touch-button-label">{getCanvasControlText(control, effectiveCanvasControlsMode)}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </section>
      </div>
    </section>

    <aside class="side-rail" aria-label="Setup notes">
      <article class="launcher-shell" aria-label="Bundled ROM library">
        <div class="launcher-header">
          <h2>ROM Library</h2>
          <p class="launcher-subcopy">
            Public-domain ROMs plus redistributable homebrew with bundled notices, credits, and upstream links.
          </p>
        </div>
        <div class="launcher-scroll">
          {#if libraryStatusMessages.length > 0}
            <div class="launcher-status-stack" aria-live="polite">
              {#each libraryStatusMessages as message (`status-${message}`)}
                <p class="launcher-empty">{message}</p>
              {/each}
            </div>
          {/if}

          {#if selectedLibraryEntry}
            <div class="launcher-details" aria-live="polite">
              <p class="launcher-details-title">{selectedLibraryEntry.title}</p>
              <p class="launcher-details-copy">{selectedLibraryEntry.description}</p>
              <p class="launcher-details-meta">
                <span>{selectedLibraryEntry.collectionLabel}</span>
                {#if selectedLibraryEntry.author}
                  <span>By {selectedLibraryEntry.author}</span>
                {/if}
                {#if selectedLibraryEntry.releaseDate}
                  <span>{selectedLibraryEntry.releaseDate}</span>
                {/if}
                <span>{formatRomSize(selectedLibraryEntry.sizeBytes)}</span>
              </p>
              <p class="launcher-details-license">
                <strong>License:</strong> {getEntryLicenseSummary(selectedLibraryEntry)}
              </p>

              {#if selectedLibraryEntry.sourceKind === "licensed"}
                <p class="launcher-note">
                  Redistributed unmodified. Keep upstream notices with the ROMs and follow each bundled notice before reusing code or assets separately.
                </p>
              {/if}

              {#if selectedLibraryEntry.originalPageUrl || selectedLibraryEntry.sourceUrl || selectedLibraryEntry.noticeFile || selectedLibraryEntry.licenseFile}
                <div class="launcher-link-row">
                  {#if selectedLibraryEntry.originalPageUrl}
                    <a href={selectedLibraryEntry.originalPageUrl} target="_blank" rel="noreferrer">Original page</a>
                  {/if}
                  {#if selectedLibraryEntry.sourceUrl}
                    <a href={selectedLibraryEntry.sourceUrl} target="_blank" rel="noreferrer">Source repo</a>
                  {/if}
                  {#if selectedLibraryEntry.noticeFile}
                    <a href={assetPath(selectedLibraryEntry.noticeFile)} target="_blank" rel="noreferrer">Bundled notice</a>
                  {/if}
                  {#if selectedLibraryEntry.licenseFile}
                    <a href={assetPath(selectedLibraryEntry.licenseFile)} target="_blank" rel="noreferrer">Bundled license</a>
                  {/if}
                </div>
              {/if}

              {#if selectedLibraryEntry.credits?.length}
                <ul class="launcher-credits" aria-label="Game credits">
                  {#each selectedLibraryEntry.credits as credit, index (`${selectedLibraryEntry.id}-${index}`)}
                    <li>
                      <span>{credit.role}:</span>
                      {#if credit.url}
                        <a href={credit.url} target="_blank" rel="noreferrer">{credit.name}</a>
                      {:else}
                        <span>{credit.name}</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}

          {#if libraryEntries.length > 0}
            <ul class="launcher-grid" aria-label="Bundled ROM list">
              {#each libraryEntries as entry (entry.id)}
                <li class="launcher-list-item">
                  <button
                    type="button"
                    class={`launcher-item ${entry.id === activeLibraryId ? "active" : ""} ${entry.supported ? "" : "unsupported"}`.trim()}
                    disabled={!entry.supported}
                    title={entry.supported
                      ? `${entry.title} • Mapper ${entry.mapper} • ${formatRomSize(entry.sizeBytes)} • ${getEntryLicenseSummary(entry)}`
                      : `${entry.title} is unavailable in this build (mapper ${entry.mapper})`}
                    on:click={() => void loadBundledRom(entry)}
                  >
                    <span class="launcher-item-eyebrow">{entry.collectionLabel}</span>
                    <strong>{entry.title}</strong>
                    <span class="launcher-item-meta">{formatRomSize(entry.sizeBytes)}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="launcher-empty">No bundled ROMs available.</p>
          {/if}
        </div>
      </article>
    </aside>
  </main>
</div>
