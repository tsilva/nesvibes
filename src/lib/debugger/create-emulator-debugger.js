import { get, writable } from "svelte/store";

const DEFAULT_MEMORY_ADDRESS = 0x0000;
const DEFAULT_MEMORY_LENGTH = 0x80;
const POLL_INTERVAL_MS = 150;

function createInitialState() {
  return {
    attached: false,
    hasRom: false,
    memoryError: "",
    memoryInput: formatAddress(DEFAULT_MEMORY_ADDRESS),
    open: false,
    paused: false,
    snapshot: null,
  };
}

function formatAddress(value) {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function parseAddress(value) {
  const normalized = value.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{1,4}$/.test(normalized)) {
    return null;
  }

  return Number.parseInt(normalized, 16) & 0xffff;
}

export function createEmulatorDebugger() {
  const store = writable(createInitialState());
  let emulator = null;
  let memoryAddress = DEFAULT_MEMORY_ADDRESS;
  let pollHandle = 0;

  function stopPolling() {
    if (!pollHandle || typeof window === "undefined") {
      return;
    }

    window.clearInterval(pollHandle);
    pollHandle = 0;
  }

  function syncSnapshot() {
    if (!emulator?.getDebugSnapshot) {
      store.update((state) => ({
        ...state,
        attached: Boolean(emulator),
        hasRom: false,
        paused: false,
        snapshot: null,
      }));
      return null;
    }

    const snapshot = emulator.getDebugSnapshot({
      length: DEFAULT_MEMORY_LENGTH,
      startAddress: memoryAddress,
    });

    store.update((state) => ({
      ...state,
      attached: true,
      hasRom: Boolean(snapshot),
      paused: snapshot?.paused ?? false,
      snapshot,
    }));

    return snapshot;
  }

  function startPolling() {
    stopPolling();
    if (typeof window === "undefined") {
      return;
    }

    pollHandle = window.setInterval(() => {
      try {
        syncSnapshot();
      } catch (error) {
        console.error(error);
      }
    }, POLL_INTERVAL_MS);
  }

  function withSnapshotRefresh(action) {
    if (!emulator) {
      return null;
    }

    const result = action();
    syncSnapshot();
    return result;
  }

  return {
    subscribe: store.subscribe,
    applyMemoryInput() {
      const state = get(store);
      const nextAddress = parseAddress(state.memoryInput);
      if (nextAddress === null) {
        store.update((current) => ({
          ...current,
          memoryError: "Use a hex address from 0000 to FFFF.",
        }));
        return null;
      }

      memoryAddress = nextAddress;
      store.update((current) => ({
        ...current,
        memoryError: "",
        memoryInput: formatAddress(nextAddress),
      }));
      return syncSnapshot();
    },
    attachEmulator(nextEmulator) {
      emulator = nextEmulator;
      syncSnapshot();
      startPolling();
    },
    detachEmulator() {
      stopPolling();
      emulator = null;
      memoryAddress = DEFAULT_MEMORY_ADDRESS;
      store.set(createInitialState());
    },
    refresh() {
      return syncSnapshot();
    },
    setMemoryInput(value) {
      store.update((state) => ({
        ...state,
        memoryError: "",
        memoryInput: value,
      }));
    },
    stepInstruction() {
      return withSnapshotRefresh(() => emulator?.stepInstruction?.());
    },
    toggleOpen() {
      store.update((state) => ({
        ...state,
        open: !state.open,
      }));
      syncSnapshot();
    },
    toggleRunning() {
      return withSnapshotRefresh(() => {
        if (emulator?.isPaused?.()) {
          return emulator.resume?.();
        }

        return emulator?.pause?.();
      });
    },
  };
}
