<script>
  import { Bug, Pause, Play, StepForward, X } from "lucide-svelte";

  export let debuggerController;

  const REGISTER_FIELDS = [
    { key: "pc", label: "PC", width: 4, description: "Program Counter" },
    { key: "a", label: "A", width: 2, description: "Accumulator" },
    { key: "x", label: "X", width: 2, description: "X Index Register" },
    { key: "y", label: "Y", width: 2, description: "Y Index Register" },
    { key: "s", label: "SP", width: 2, description: "Stack Pointer" },
    { key: "p", label: "P", width: 2, description: "Processor Status Register" },
  ];

  const FLAG_LABELS = {
    N: "Negative",
    V: "Overflow",
    U: "Unused",
    B: "Break",
    D: "Decimal Mode",
    I: "Interrupt Disable",
    Z: "Zero",
    C: "Carry",
  };
  const MEMORY_SEARCH_MODE_OPTIONS = [
    { value: "changed", label: "Changed" },
    { value: "unchanged", label: "Unchanged" },
    { value: "increased", label: "Increased" },
    { value: "decreased", label: "Decreased" },
    { value: "exact", label: "Exact" },
  ];
  let memoryByteDrafts = {};
  let memorySearchMode = "changed";
  let memorySearchExactValue = "";

  function buildMemoryRows(bytes, startAddress, changedAddresses = null, filterChangedRows = false) {
    const rows = [];
    for (let index = 0; index < bytes.length; index += 16) {
      const rowAddress = startAddress + index;
      const rowBytes = bytes.slice(index, index + 16).map((value, byteIndex) => {
        const address = rowAddress + byteIndex;
        return {
          address,
          changed: changedAddresses?.has(address) ?? false,
          value,
        };
      });

      if (filterChangedRows && !rowBytes.some((byte) => byte.changed)) {
        continue;
      }

      rows.push({
        address: rowAddress,
        bytes: rowBytes,
      });
    }
    return rows;
  }

  function formatHex(value, width = 2) {
    if (value === null || value === undefined) {
      return "·".repeat(width);
    }

    return value.toString(16).toUpperCase().padStart(width, "0");
  }

  function formatAscii(value) {
    if (value === null || value === undefined) {
      return " ";
    }

    return value >= 32 && value <= 126 ? String.fromCharCode(value) : ".";
  }

  function sanitizeHexByte(value) {
    return value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 2);
  }

  function sanitizeSearchExactValue(value) {
    return value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 2);
  }

  function captureMemorySearch() {
    const targetValue = memorySearchMode === "exact"
      ? Number.parseInt(sanitizeSearchExactValue(memorySearchExactValue), 16)
      : null;

    debuggerController.captureMemorySearch({
      mode: memorySearchMode,
      value: Number.isNaN(targetValue) ? null : targetValue,
    });
  }

  function resetMemorySearch() {
    debuggerController.resetMemorySearch();
  }

  function canEditMemoryByte(address) {
    return state.paused && debuggerController.canEditMemoryAddress(address);
  }

  function getMemoryByteDraft(byte) {
    return memoryByteDrafts[byte.address] ?? formatHex(byte.value, 2);
  }

  function setMemoryByteDraft(address, value) {
    memoryByteDrafts = {
      ...memoryByteDrafts,
      [address]: value,
    };
  }

  function commitMemoryByte(address, value) {
    const nextValue = sanitizeHexByte(value).padStart(2, "0");
    const didWrite = debuggerController.setMemoryByte(address, Number.parseInt(nextValue, 16));

    if (didWrite) {
      setMemoryByteDraft(address, nextValue);
      return true;
    }

    return false;
  }

  function handleMemoryByteFocus(byte, event) {
    setMemoryByteDraft(byte.address, getMemoryByteDraft(byte));
    event.currentTarget.select();
  }

  function handleMemoryByteInput(byte, event) {
    const nextValue = sanitizeHexByte(event.currentTarget.value);
    setMemoryByteDraft(byte.address, nextValue);

    if (nextValue.length === 2) {
      commitMemoryByte(byte.address, nextValue);
    }
  }

  function handleMemoryByteBlur(byte) {
    const nextValue = sanitizeHexByte(memoryByteDrafts[byte.address] ?? "");

    if (!nextValue) {
      setMemoryByteDraft(byte.address, formatHex(byte.value, 2));
      return;
    }

    commitMemoryByte(byte.address, nextValue);
  }

  function handleMemoryByteKeydown(byte, event) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitMemoryByte(byte.address, memoryByteDrafts[byte.address] ?? formatHex(byte.value, 2));
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMemoryByteDraft(byte.address, formatHex(byte.value, 2));
      event.currentTarget.blur();
    }
  }

  function registerTooltip(field, value) {
    return `${field.description} (${field.label}): ${formatHex(value, field.width)}`;
  }

  function flagTooltip(flag) {
    const description = FLAG_LABELS[flag.label] ?? flag.label;
    return `${description} flag (${flag.label}): ${flag.enabled ? "set" : "clear"}`;
  }

  function debuggerMetaTooltip(type, value) {
    switch (type) {
      case "running":
        return state.paused
          ? "Paused means the game is frozen right now. Press Play to let it continue."
          : "Running means the game is actively moving and the emulator is not paused.";
      case "scanline":
        return `Scanline is the current horizontal line the NES is working through while building a frame. ${value} is the current line.`;
      case "cycle":
        return `Cycle is the tiny step within the current scanline. ${value} means the graphics chip is at step ${value} of this line.`;
      case "stall":
        return value === 0
          ? "Stall is CPU wait time. 0 means the CPU is not waiting right now."
          : `Stall is CPU wait time. ${value} means the CPU still has ${value} wait cycle${value === 1 ? "" : "s"} before continuing normally.`;
      default:
        return "";
    }
  }

  $: state = $debuggerController;
  $: memorySearch = state.memorySearch;
  $: snapshot = state.snapshot;
  $: memorySearchResults = memorySearch?.results ?? [];
  $: changedAddresses = new Set(memorySearchResults.map((result) => result.address));
  $: memorySearchModeOptions = MEMORY_SEARCH_MODE_OPTIONS;
  $: memorySearchHasBaseline = memorySearch?.baselineCaptured ?? false;
  $: memorySearchShowFilters = memorySearchHasBaseline;
  $: memorySearchActive = (memorySearch?.comparisonCount ?? 0) > 0
    || ((memorySearch?.mode ?? "") === "exact" && (memorySearch?.candidateCount ?? 0) > 0);
  $: memorySearchNeedsValue = memorySearchMode === "exact";
  $: memorySearchHasValue = sanitizeSearchExactValue(memorySearchExactValue).length > 0;
  $: memorySearchCanCapture = !memorySearchShowFilters || !memorySearchNeedsValue || memorySearchHasValue;
  $: memorySearchAppliedMode = memorySearchActive ? (memorySearch?.mode ?? "changed") : memorySearchMode;
  $: memorySearchAppliedModeLabel = MEMORY_SEARCH_MODE_OPTIONS.find((option) => option.value === memorySearchAppliedMode)?.label ?? "Changed";
  $: memorySearchAppliedTargetValue = memorySearchActive ? memorySearch?.targetValue ?? null : null;
  $: memoryRows = memorySearchActive && memorySearch?.viewBytes
    ? buildMemoryRows(memorySearch.viewBytes, 0, changedAddresses, true)
    : snapshot
      ? buildMemoryRows(snapshot.memory.bytes, snapshot.memory.startAddress, changedAddresses)
      : [];
  $: if (!state.paused && Object.keys(memoryByteDrafts).length > 0) {
    memoryByteDrafts = {};
  }
  $: memorySearchSummary = !memorySearchHasBaseline
    ? "Capture once to save a baseline snapshot. Compare filters unlock for the next capture."
    : memorySearch.comparisonCount === 0
      ? memorySearch.mode === "exact" && memorySearch.targetValue !== null
        ? `${memorySearch.candidateCount} address${memorySearch.candidateCount === 1 ? "" : "es"} currently equal ${formatHex(memorySearch.targetValue, 2)}. Reproduce the target event, then capture again with another rule.`
        : "Baseline saved. Reproduce the target event, then capture again with the compare rule you want to apply."
      : null;
</script>

<div class="debugger-dock">
  {#if !state.open}
    <button
      type="button"
      class="debugger-toggle"
      aria-controls="emulator-debugger-panel"
      aria-expanded="false"
      aria-label="Open debugger"
      on:click={() => debuggerController.toggleOpen()}
    >
      <span class={`debugger-status ${state.hasRom ? (state.paused ? "paused" : "running") : "idle"}`.trim()} aria-hidden="true"></span>
      <Bug size={16} strokeWidth={2.25} aria-hidden="true" />
    </button>
  {/if}

  {#if state.open}
    <section class="debugger-panel" id="emulator-debugger-panel" aria-label="Emulator debugger">
      <div class="debugger-header">
        {#if state.hasRom}
          <div class="debugger-toolbar">
            <button
              type="button"
              class="debugger-action"
              aria-label={state.paused ? "Play" : "Pause"}
              title={state.paused ? "Play" : "Pause"}
              on:click={() => debuggerController.toggleRunning()}
            >
              {#if state.paused}
                <Play size={15} strokeWidth={2.25} aria-hidden="true" />
              {:else}
                <Pause size={15} strokeWidth={2.25} aria-hidden="true" />
              {/if}
            </button>
            <button
              type="button"
              class="debugger-action"
              disabled={!state.paused}
              aria-label="Step"
              title="Step"
              on:click={() => debuggerController.stepInstruction()}
            >
              <StepForward size={15} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        {:else}
          <p class="debugger-title">Debugger</p>
        {/if}

        <button
          type="button"
          class="debugger-close"
          aria-label="Close debugger"
          title="Close debugger"
          on:click={() => debuggerController.toggleOpen()}
        >
          <X size={15} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      {#if !state.hasRom}
        <div class="debugger-body">
          <div class="debugger-empty">
            <strong>No ROM loaded</strong>
            <p>Load a cartridge to inspect registers and CPU memory.</p>
          </div>
        </div>
      {:else}
        <div class="debugger-body debugger-body-loaded">
          <div class="debugger-meta">
            <span
              class="debugger-meta-item"
              title={debuggerMetaTooltip("running")}
              data-tooltip={debuggerMetaTooltip("running")}
            >
              {state.paused ? "Paused" : "Running"}
            </span>
            <span
              class="debugger-meta-item"
              title={debuggerMetaTooltip("scanline", snapshot.ppu.scanline)}
              data-tooltip={debuggerMetaTooltip("scanline", snapshot.ppu.scanline)}
            >
              Scanline {snapshot.ppu.scanline}
            </span>
            <span
              class="debugger-meta-item"
              title={debuggerMetaTooltip("cycle", snapshot.ppu.cycle)}
              data-tooltip={debuggerMetaTooltip("cycle", snapshot.ppu.cycle)}
            >
              Cycle {snapshot.ppu.cycle}
            </span>
            <span
              class="debugger-meta-item"
              title={debuggerMetaTooltip("stall", snapshot.cpu.stallCycles)}
              data-tooltip={debuggerMetaTooltip("stall", snapshot.cpu.stallCycles)}
            >
              Stall {snapshot.cpu.stallCycles}
            </span>
          </div>

          <section class="debugger-section" aria-label="CPU registers">
            <div class="debugger-section-header">
              <h2>Registers</h2>
              <span class="debugger-chip">6502</span>
            </div>

              <div class="register-grid">
              {#each REGISTER_FIELDS as field (field.key)}
                <div class="register-card" title={registerTooltip(field, snapshot.cpu[field.key])}>
                  <span class="register-label">{field.label}</span>
                  <strong>{formatHex(snapshot.cpu[field.key], field.width)}</strong>
                </div>
              {/each}
            </div>

            <div class="flag-row" aria-label="CPU flags">
              {#each snapshot.cpu.flags as flag (flag.label)}
                <span
                  class={`flag-chip ${flag.enabled ? "active" : ""}`.trim()}
                  title={flagTooltip(flag)}
                >
                  {flag.label}
                </span>
              {/each}
            </div>
          </section>

          <section class="debugger-section debugger-memory-section" aria-label="CPU RAM monitor">
            <div class="memory-search-toolbar" aria-label="RAM search controls">
              <div class="memory-search-copy">
                <strong>RAM Search</strong>
                {#if memorySearchSummary}
                  <p>{memorySearchSummary}</p>
                {/if}
              </div>

              <div class="memory-search-actions">
                {#if memorySearchShowFilters}
                  <label class="memory-search-filter">
                    <span>Compare</span>
                    <select bind:value={memorySearchMode} aria-label="RAM search comparison mode">
                      {#each memorySearchModeOptions as option (option.value)}
                        <option value={option.value}>{option.label}</option>
                      {/each}
                    </select>
                  </label>
                  {#if memorySearchNeedsValue}
                    <label class="memory-search-filter">
                      <span>Hex</span>
                      <input
                        type="text"
                        inputmode="text"
                        maxlength="2"
                        spellcheck="false"
                        aria-label="Exact RAM search value in hex"
                        bind:value={memorySearchExactValue}
                        on:input={(event) => {
                          memorySearchExactValue = sanitizeSearchExactValue(event.currentTarget.value);
                        }}
                      />
                    </label>
                  {/if}
                {/if}
                <button
                  type="button"
                  class="debugger-action"
                  disabled={!memorySearchCanCapture}
                  on:click={captureMemorySearch}
                >
                  Capture
                </button>
                <button
                  type="button"
                  class="debugger-action ghost"
                  disabled={!memorySearch?.baselineCaptured}
                  on:click={resetMemorySearch}
                >
                  Reset
                </button>
              </div>
            </div>

            <div class="memory-search-stats">
              <span>{memorySearch?.captureCount ?? 0} snapshots</span>
              <span>{memorySearch?.lastMatchCount ?? 0} matched last capture</span>
            </div>

            <div
              class={`memory-grid ${memorySearchActive ? "filtered" : ""}`.trim()}
              role="table"
              aria-label="Live memory bytes"
            >
              {#if memoryRows.length > 0}
                {#each memoryRows as row (`row-${row.address}`)}
                <div class="memory-row" role="row">
                  <span class="memory-address" role="cell">
                    {formatHex(row.address, 4)}
                  </span>
                  <div class="memory-bytes" role="cell">
                    {#each row.bytes as byte (`byte-${byte.address}`)}
                      {#if canEditMemoryByte(byte.address)}
                        <input
                          class={`memory-byte-input ${byte.changed ? "changed" : ""}`.trim()}
                          type="text"
                          inputmode="text"
                          maxlength="2"
                          spellcheck="false"
                          aria-label={`Edit memory at ${formatHex(byte.address, 4)}`}
                          value={getMemoryByteDraft(byte)}
                          on:blur={() => handleMemoryByteBlur(byte)}
                          on:focus={(event) => handleMemoryByteFocus(byte, event)}
                          on:input={(event) => handleMemoryByteInput(byte, event)}
                          on:keydown={(event) => handleMemoryByteKeydown(byte, event)}
                        />
                      {:else}
                        <span class:changed={byte.changed}>{formatHex(byte.value, 2)}</span>
                      {/if}
                    {/each}
                  </div>
                  <div class="memory-ascii" role="cell" aria-hidden="true">
                    {#each row.bytes as byte (`ascii-${byte.address}`)}
                      <span class:changed={byte.changed}>{formatAscii(byte.value)}</span>
                    {/each}
                  </div>
                </div>
                {/each}
              {:else if memorySearchActive}
                <p class="memory-search-empty">
                  No addresses survived the latest filter. Reset to start a new search.
                </p>
              {/if}
            </div>
          </section>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .debugger-dock {
    position: fixed;
    inset: 0;
    z-index: 3;
    pointer-events: none;
  }

  .debugger-toggle,
  .debugger-action {
    pointer-events: auto;
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
  }

  .debugger-toggle {
    position: absolute;
    top: 18px;
    right: 18px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    min-width: 38px;
    min-height: 38px;
    padding: 8px 10px;
    color: #f4f0d8;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.02)),
      rgba(29, 41, 22, 0.96);
    border: 2px solid rgba(204, 230, 82, 0.32);
    box-shadow:
      inset 0 0 0 2px rgba(215, 255, 102, 0.08),
      0 8px 16px rgba(0, 0, 0, 0.24);
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: transform 120ms ease, border-color 120ms ease, color 120ms ease;
  }

  .debugger-toggle:hover,
  .debugger-toggle:focus-visible {
    color: #fcffef;
    border-color: rgba(218, 255, 96, 0.6);
    transform: translateY(-1px);
  }

  .debugger-toggle:focus-visible,
  .debugger-action:focus-visible {
    outline: 2px solid rgba(248, 184, 0, 0.85);
    outline-offset: 2px;
  }

  .debugger-status {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #626262;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45);
  }

  .debugger-status.running {
    background: #9bff4b;
    box-shadow:
      0 0 0 2px rgba(0, 0, 0, 0.45),
      0 0 12px rgba(155, 255, 75, 0.72);
  }

  .debugger-status.paused {
    background: #ffd34b;
    box-shadow:
      0 0 0 2px rgba(0, 0, 0, 0.45),
      0 0 12px rgba(255, 211, 75, 0.68);
  }

  .debugger-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
    pointer-events: auto;
    width: min(720px, calc(100vw - 24px));
    height: 100dvh;
    min-height: 100dvh;
    max-height: none;
    overflow: hidden;
    padding: 18px 24px 28px;
    color: #eef0cf;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 14%),
      rgba(16, 24, 16, 0.95);
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    border-left: 3px solid rgba(184, 232, 93, 0.52);
    box-shadow:
      inset 0 0 0 2px rgba(232, 255, 184, 0.05),
      -18px 0 36px rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(10px);
  }

  .debugger-panel::-webkit-scrollbar {
    width: 10px;
  }

  .debugger-panel::-webkit-scrollbar-thumb {
    background: rgba(206, 255, 121, 0.3);
  }

  .debugger-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .debugger-title {
    margin: 0;
    align-self: center;
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .debugger-empty {
    display: grid;
    gap: 8px;
    align-content: start;
  }

  .debugger-empty strong,
  .debugger-section h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .debugger-empty p,
  .debugger-meta,
  .memory-search-copy p,
  .memory-search-stats,
  .register-label,
  .memory-address,
  .memory-ascii,
  .memory-bytes,
  .debugger-chip {
    font-size: 11px;
    line-height: 1.4;
  }

  .debugger-toolbar,
  .debugger-body,
  .debugger-meta,
  .debugger-section,
  .register-grid,
  .memory-grid {
    display: grid;
    gap: 10px;
  }

  .debugger-toolbar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .debugger-body {
    min-height: 0;
    overflow: hidden;
  }

  .debugger-body-loaded {
    grid-template-rows: auto auto minmax(0, 1fr);
  }

  .debugger-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 41px;
    padding: 9px 10px;
    color: #112500;
    background: linear-gradient(180deg, #d7f66b 0%, #8ec63f 100%);
    border: 2px solid rgba(19, 35, 8, 0.85);
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .debugger-close {
    pointer-events: auto;
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 41px;
    height: 41px;
    padding: 0;
    color: rgba(241, 244, 214, 0.88);
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(212, 255, 118, 0.25);
    cursor: pointer;
    transition: border-color 120ms ease, color 120ms ease, background-color 120ms ease;
  }

  .debugger-close:hover,
  .debugger-close:focus-visible {
    color: #fcffef;
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(212, 255, 118, 0.34);
  }

  .debugger-action.ghost {
    color: #f1f4d6;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(212, 255, 118, 0.25);
  }

  .debugger-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .debugger-meta {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    color: rgba(235, 243, 196, 0.75);
  }

  .debugger-meta-item {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-width: 0;
    cursor: help;
  }

  .debugger-section {
    padding-top: 12px;
    border-top: 1px solid rgba(212, 255, 118, 0.16);
    min-height: 0;
  }

  .debugger-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .debugger-chip {
    padding: 3px 6px;
    color: #e5f6a9;
    background: rgba(213, 255, 118, 0.09);
    border: 1px solid rgba(213, 255, 118, 0.22);
  }

  .register-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .register-card {
    display: grid;
    gap: 4px;
    padding: 10px 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(213, 255, 118, 0.14);
  }

  .register-label {
    color: rgba(235, 243, 196, 0.7);
    text-transform: uppercase;
  }

  .register-card strong {
    font-family: var(--font-display);
    font-size: 16px;
    line-height: 1;
    color: #fffce8;
  }

  .flag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .flag-chip {
    min-width: 32px;
    padding: 5px 7px;
    text-align: center;
    color: rgba(227, 232, 203, 0.5);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .flag-chip.active {
    color: #132500;
    background: #d5ff76;
    border-color: rgba(16, 27, 9, 0.75);
  }

  .debugger-memory-section {
    grid-template-rows: auto auto auto minmax(0, 1fr);
  }

  .memory-search-toolbar,
  .memory-search-stats,
  .memory-search-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .memory-search-toolbar {
    justify-content: space-between;
  }

  .memory-search-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .memory-search-copy strong {
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .memory-search-copy p,
  .memory-search-empty {
    margin: 0;
    color: rgba(235, 243, 196, 0.78);
  }

  .memory-search-actions {
    flex-wrap: wrap;
    flex-shrink: 0;
    align-items: end;
  }

  .memory-search-filter {
    display: grid;
    gap: 4px;
    min-width: 0;
    color: rgba(235, 243, 196, 0.72);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .memory-search-filter select,
  .memory-search-filter input {
    min-height: 41px;
    padding: 8px 10px;
    color: #fffce8;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(212, 255, 118, 0.18);
    font: inherit;
    text-transform: uppercase;
  }

  .memory-search-filter input {
    width: 64px;
    text-align: center;
  }

  .memory-search-filter select:focus-visible,
  .memory-search-filter input:focus-visible {
    outline: 1px solid rgba(248, 184, 0, 0.85);
    outline-offset: 1px;
  }

  .memory-search-actions .debugger-action {
    min-width: 96px;
    align-self: end;
  }

  .memory-search-stats {
    flex-wrap: wrap;
    color: rgba(235, 243, 196, 0.72);
  }

  .memory-search-empty {
    margin: 0;
    color: rgba(235, 243, 196, 0.78);
  }

  .memory-grid {
    gap: 6px;
    min-height: 0;
    align-content: start;
    grid-auto-rows: max-content;
    padding: 10px;
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(213, 255, 118, 0.12);
    overflow: auto;
  }

  .memory-row {
    display: grid;
    grid-template-columns: 4ch auto 16ch;
    gap: 10px;
    align-items: center;
    width: max-content;
    min-width: 100%;
  }

  .memory-address,
  .memory-ascii,
  .memory-bytes {
    font-family: var(--font-body);
    font-variant-numeric: tabular-nums;
    white-space: pre;
  }

  .memory-address {
    color: #b9cf81;
  }

  .memory-bytes {
    display: grid;
    grid-template-columns: repeat(16, 2ch);
    justify-content: start;
    gap: 1.1ch;
    align-items: center;
    color: #fffce8;
  }

  .memory-bytes span,
  .memory-ascii span,
  .memory-byte-input {
    display: block;
    border-radius: 3px;
    transition: background-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
  }

  .memory-byte-input {
    width: 2.3ch;
    margin: 0;
    padding: 0;
    color: #fffce8;
    background: transparent;
    border: 0;
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: center;
    text-transform: uppercase;
    caret-color: #d5ff76;
  }

  .memory-byte-input:focus-visible {
    outline: 1px solid rgba(248, 184, 0, 0.85);
    outline-offset: 1px;
  }

  .memory-ascii {
    display: grid;
    grid-template-columns: repeat(16, 1ch);
    gap: 0.08em;
    min-width: 16ch;
    color: rgba(235, 243, 196, 0.68);
    letter-spacing: 0;
  }

  .memory-grid.filtered .memory-bytes span,
  .memory-grid.filtered .memory-ascii span,
  .memory-grid.filtered .memory-byte-input {
    color: rgba(235, 243, 196, 0.38);
  }

  .memory-bytes span.changed,
  .memory-ascii span.changed,
  .memory-byte-input.changed {
    color: #142000;
    -webkit-text-fill-color: #142000;
    background: #d5ff76;
    box-shadow: inset 0 0 0 1px rgba(16, 27, 9, 0.72);
    text-shadow: none;
  }

  @media (hover: hover) and (pointer: fine) and (min-width: 981px) {
    .debugger-meta-item::before,
    .debugger-meta-item::after {
      position: absolute;
      left: 50%;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 6px);
      transition: opacity 140ms ease, transform 140ms ease;
    }

    .debugger-meta-item::before {
      content: "";
      bottom: calc(100% + 8px);
      border-width: 7px 7px 0;
      border-style: solid;
      border-color: rgba(215, 255, 118, 0.2) transparent transparent;
      z-index: 2;
    }

    .debugger-meta-item::after {
      content: attr(data-tooltip);
      bottom: calc(100% + 15px);
      width: min(220px, 28vw);
      padding: 8px 10px;
      color: #f8fbeb;
      background: rgba(15, 23, 12, 0.98);
      border: 1px solid rgba(215, 255, 118, 0.2);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.32);
      font-size: 11px;
      line-height: 1.35;
      text-transform: none;
      letter-spacing: 0;
      white-space: normal;
      z-index: 3;
    }

    .debugger-meta-item:hover::before,
    .debugger-meta-item:hover::after {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  @media (max-width: 720px) {
    .debugger-dock {
      inset: 0;
    }

    .debugger-toggle {
      top: 12px;
      right: 12px;
    }

    .debugger-panel {
      top: 0;
      right: 0;
      bottom: 0;
      gap: 8px;
      width: min(100vw - 12px, 420px);
      height: 100dvh;
      min-height: 100dvh;
      max-height: none;
      padding: 14px 14px 14px;
    }

    .debugger-meta,
    .register-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .memory-row {
      grid-template-columns: 1fr;
      width: 100%;
      min-width: 0;
    }

    .memory-search-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .memory-search-actions {
      width: 100%;
    }

    .memory-search-filter {
      flex: 1 1 140px;
    }

    .memory-search-filter input,
    .memory-search-filter select {
      width: 100%;
    }

    .memory-search-actions .debugger-action {
      flex: 1 1 0;
      min-width: 0;
    }

    .memory-bytes {
      grid-template-columns: repeat(8, 2ch);
    }

    .memory-ascii {
      grid-template-columns: repeat(8, 1ch);
    }
  }
</style>
