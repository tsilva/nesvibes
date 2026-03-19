<script>
  export let debuggerController;

  const REGISTER_FIELDS = [
    { key: "pc", label: "PC", width: 4 },
    { key: "a", label: "A", width: 2 },
    { key: "x", label: "X", width: 2 },
    { key: "y", label: "Y", width: 2 },
    { key: "s", label: "SP", width: 2 },
    { key: "p", label: "P", width: 2 },
  ];

  function chunk(bytes, size) {
    const rows = [];
    for (let index = 0; index < bytes.length; index += size) {
      rows.push(bytes.slice(index, index + size));
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

  function submitMemoryAddress() {
    debuggerController.applyMemoryInput();
  }

  $: state = $debuggerController;
  $: snapshot = state.snapshot;
  $: memoryRows = snapshot ? chunk(snapshot.memory.bytes, 16) : [];
</script>

<div class="debugger-dock">
  <button
    type="button"
    class={`debugger-toggle ${state.open ? "open" : ""}`.trim()}
    aria-controls="emulator-debugger-panel"
    aria-expanded={state.open}
    on:click={() => debuggerController.toggleOpen()}
  >
    <span class={`debugger-status ${state.hasRom ? (state.paused ? "paused" : "running") : "idle"}`.trim()} aria-hidden="true"></span>
    <span>Debugger</span>
  </button>

  {#if state.open}
    <section class="debugger-panel" id="emulator-debugger-panel" aria-label="Emulator debugger">
      {#if !state.hasRom}
        <div class="debugger-empty">
          <strong>No ROM loaded</strong>
          <p>Load a cartridge to inspect registers and CPU memory.</p>
        </div>
      {:else}
        <div class="debugger-toolbar">
          <button type="button" class="debugger-action" on:click={() => debuggerController.toggleRunning()}>
            {state.paused ? "Play" : "Pause"}
          </button>
          <button
            type="button"
            class="debugger-action"
            disabled={!state.paused}
            on:click={() => debuggerController.stepInstruction()}
          >
            Step
          </button>
          <button type="button" class="debugger-action ghost" on:click={() => debuggerController.refresh()}>
            Refresh
          </button>
        </div>

        <div class="debugger-meta">
          <span>{state.paused ? "Paused" : "Running"}</span>
          <span>Scanline {snapshot.ppu.scanline}</span>
          <span>Cycle {snapshot.ppu.cycle}</span>
          <span>Stall {snapshot.cpu.stallCycles}</span>
        </div>

        <section class="debugger-section" aria-label="CPU registers">
          <div class="debugger-section-header">
            <h2>Registers</h2>
            <span class="debugger-chip">6502</span>
          </div>

          <div class="register-grid">
            {#each REGISTER_FIELDS as field (field.key)}
              <div class="register-card">
                <span class="register-label">{field.label}</span>
                <strong>{formatHex(snapshot.cpu[field.key], field.width)}</strong>
              </div>
            {/each}
          </div>

          <div class="flag-row" aria-label="CPU flags">
            {#each snapshot.cpu.flags as flag (flag.label)}
              <span class={`flag-chip ${flag.enabled ? "active" : ""}`.trim()}>
                {flag.label}
              </span>
            {/each}
          </div>
        </section>

        <section class="debugger-section" aria-label="CPU RAM monitor">
          <div class="debugger-section-header">
            <h2>RAM Monitor</h2>
            <span class="debugger-chip">CPU bus</span>
          </div>

          <form class="memory-form" on:submit|preventDefault={submitMemoryAddress}>
            <label>
              <span>Address</span>
              <input
                type="text"
                inputmode="text"
                maxlength="6"
                spellcheck="false"
                value={state.memoryInput}
                on:input={(event) => debuggerController.setMemoryInput(event.currentTarget.value)}
              />
            </label>
            <button type="submit" class="debugger-action">Go</button>
          </form>

          {#if state.memoryError}
            <p class="memory-error">{state.memoryError}</p>
          {/if}

          <div class="memory-grid" role="table" aria-label="Memory bytes">
            {#each memoryRows as row, rowIndex (`row-${rowIndex}`)}
              <div class="memory-row" role="row">
                <span class="memory-address" role="cell">
                  {formatHex(snapshot.memory.startAddress + rowIndex * 16, 4)}
                </span>
                <div class="memory-bytes" role="cell">
                  {#each row as value, byteIndex (`byte-${rowIndex}-${byteIndex}`)}
                    <span>{formatHex(value, 2)}</span>
                  {/each}
                </div>
                <span class="memory-ascii" role="cell">
                  {row.map(formatAscii).join("")}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </section>
  {/if}
</div>

<style>
  .debugger-dock {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    display: grid;
    gap: 0;
    align-items: start;
    justify-items: end;
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
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 24px 24px 0 0;
    padding: 10px 14px;
    color: #f4f0d8;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.02)),
      rgba(29, 41, 22, 0.96);
    border: 3px solid rgba(204, 230, 82, 0.45);
    box-shadow:
      inset 0 0 0 2px rgba(215, 255, 102, 0.08),
      0 12px 22px rgba(0, 0, 0, 0.35);
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: transform 120ms ease, border-color 120ms ease, color 120ms ease;
  }

  .debugger-toggle:hover,
  .debugger-toggle:focus-visible,
  .debugger-toggle.open {
    color: #fcffef;
    border-color: rgba(218, 255, 96, 0.78);
    transform: translateY(-1px);
  }

  .debugger-toggle:focus-visible,
  .debugger-action:focus-visible,
  .memory-form input:focus-visible {
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
    pointer-events: auto;
    width: min(440px, calc(100vw - 24px));
    height: 100dvh;
    max-height: 100dvh;
    overflow: auto;
    padding: 20px 20px 28px;
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

  .debugger-empty {
    display: grid;
    gap: 8px;
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
  .memory-error,
  .debugger-meta,
  .memory-form span,
  .register-label,
  .memory-address,
  .memory-ascii,
  .memory-bytes,
  .debugger-chip {
    font-size: 11px;
    line-height: 1.4;
  }

  .debugger-toolbar,
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

  .debugger-action {
    padding: 9px 10px;
    color: #112500;
    background: linear-gradient(180deg, #d7f66b 0%, #8ec63f 100%);
    border: 2px solid rgba(19, 35, 8, 0.85);
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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

  .debugger-section {
    padding-top: 12px;
    border-top: 1px solid rgba(212, 255, 118, 0.16);
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

  .memory-form {
    display: flex;
    gap: 10px;
    align-items: end;
  }

  .memory-form label {
    display: grid;
    gap: 6px;
    flex: 1;
  }

  .memory-form input {
    width: 100%;
    padding: 9px 10px;
    color: #fffce8;
    background: rgba(0, 0, 0, 0.32);
    border: 2px solid rgba(213, 255, 118, 0.2);
    font: inherit;
    text-transform: uppercase;
  }

  .memory-error {
    margin: 0;
    color: #ff8b75;
  }

  .memory-grid {
    gap: 6px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(213, 255, 118, 0.12);
  }

  .memory-row {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 100px;
    gap: 10px;
    align-items: center;
  }

  .memory-address,
  .memory-ascii,
  .memory-bytes {
    font-family: var(--font-body);
  }

  .memory-address {
    color: #b9cf81;
  }

  .memory-bytes {
    display: grid;
    grid-template-columns: repeat(16, minmax(0, 1fr));
    gap: 6px;
    color: #fffce8;
  }

  .memory-ascii {
    color: rgba(235, 243, 196, 0.68);
    letter-spacing: 0.08em;
  }

  @media (max-width: 720px) {
    .debugger-dock {
      top: 0;
      right: 0;
      bottom: 0;
    }

    .debugger-panel {
      width: min(100vw - 12px, 420px);
      height: 100dvh;
      max-height: 100dvh;
      padding: 14px;
    }

    .debugger-meta,
    .register-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .memory-row {
      grid-template-columns: 1fr;
    }

    .memory-bytes {
      grid-template-columns: repeat(8, minmax(0, 1fr));
    }
  }
</style>
