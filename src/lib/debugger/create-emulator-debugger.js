import { get, writable } from "svelte/store";

const DEFAULT_MEMORY_ADDRESS = 0x0000;
const DEBUG_SNAPSHOT_CHUNK_LENGTH = 0x100;
const MEMORY_VIEW_LENGTH = 0x0800;
const MEMORY_SEARCH_LENGTH = MEMORY_VIEW_LENGTH;
const POLL_INTERVAL_MS = 150;

function createInitialMemorySearchState() {
  return {
    baselineCaptured: false,
    candidateCount: 0,
    captureCount: 0,
    comparisonCount: 0,
    lastMatchCount: 0,
    mode: "changed",
    results: [],
    targetValue: null,
    viewBytes: null,
  };
}

function createInitialState() {
  return {
    attached: false,
    hasRom: false,
    memorySearch: createInitialMemorySearchState(),
    open: false,
    paused: false,
    snapshot: null,
  };
}

function matchesMemorySearch(mode, previousValue, currentValue, targetValue) {
  switch (mode) {
    case "unchanged":
      return previousValue === currentValue;
    case "increased":
      return currentValue > previousValue;
    case "decreased":
      return currentValue < previousValue;
    case "exact":
      return targetValue !== null && currentValue === targetValue;
    case "changed":
    default:
      return previousValue !== currentValue;
  }
}

export function createEmulatorDebugger() {
  const store = writable(createInitialState());
  let emulator = null;
  let memorySearchSnapshot = null;
  let memorySearchCandidates = null;
  let pollHandle = 0;

  function resetMemorySearchState() {
    memorySearchSnapshot = null;
    memorySearchCandidates = null;
    store.update((state) => ({
      ...state,
      memorySearch: createInitialMemorySearchState(),
    }));
  }

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

    const state = get(store);
    const baseSnapshot = emulator.getDebugSnapshot({
      length: DEBUG_SNAPSHOT_CHUNK_LENGTH,
      startAddress: DEFAULT_MEMORY_ADDRESS,
    });
    const memoryView = state.open ? readMemoryRange(DEFAULT_MEMORY_ADDRESS, MEMORY_VIEW_LENGTH) : null;
    const searchViewBytes = memorySearchCandidates ? readMemorySearchSnapshot() : null;
    const snapshot = baseSnapshot && memoryView
      ? {
          ...baseSnapshot,
          memory: memoryView,
        }
      : baseSnapshot;

    store.update((state) => ({
      ...state,
      attached: true,
      hasRom: Boolean(snapshot),
      memorySearch: searchViewBytes
        ? {
            ...state.memorySearch,
            viewBytes: searchViewBytes,
          }
        : state.memorySearch,
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

  function readMemoryRange(startAddress, length) {
    if (!emulator?.getDebugSnapshot) {
      return null;
    }

    const bytes = new Array(length);

    for (let offset = 0; offset < length; offset += DEBUG_SNAPSHOT_CHUNK_LENGTH) {
      const chunk = emulator.getDebugSnapshot({
        length: Math.min(DEBUG_SNAPSHOT_CHUNK_LENGTH, length - offset),
        startAddress: startAddress + offset,
      });

      if (!chunk?.memory?.bytes) {
        return null;
      }

      for (let index = 0; index < chunk.memory.bytes.length; index += 1) {
        bytes[offset + index] = chunk.memory.bytes[index];
      }
    }

    return {
      bytes,
      length,
      startAddress,
    };
  }

  function readMemorySearchSnapshot() {
    return readMemoryRange(DEFAULT_MEMORY_ADDRESS, MEMORY_SEARCH_LENGTH)?.bytes ?? null;
  }

  return {
    subscribe: store.subscribe,
    attachEmulator(nextEmulator) {
      emulator = nextEmulator;
      resetMemorySearchState();
      syncSnapshot();
      startPolling();
    },
    captureMemorySearch({ mode = "changed", value = null } = {}) {
      if (!emulator?.getDebugSnapshot) {
        return null;
      }

      const nextSnapshot = readMemorySearchSnapshot();
      if (!nextSnapshot) {
        return null;
      }

      if (!memorySearchSnapshot) {
        memorySearchSnapshot = nextSnapshot;
        store.update((state) => ({
          ...state,
          memorySearch: {
            ...createInitialMemorySearchState(),
            baselineCaptured: true,
            captureCount: 1,
            mode,
            targetValue: value,
            viewBytes: nextSnapshot,
          },
        }));
        syncSnapshot();
        return [];
      }

      const candidateAddresses = memorySearchCandidates
        ? [...memorySearchCandidates.keys()]
        : Array.from({ length: MEMORY_SEARCH_LENGTH }, (_, address) => address);

      const nextCandidates = new Map();
      for (const address of candidateAddresses) {
        const previousValue = memorySearchSnapshot[address];
        const currentValue = nextSnapshot[address];

        if (!matchesMemorySearch(mode, previousValue, currentValue, value)) {
          continue;
        }

        nextCandidates.set(address, {
          address,
          currentValue,
          previousValue,
          changeCount: (memorySearchCandidates?.get(address)?.changeCount ?? 0) + (previousValue !== currentValue ? 1 : 0),
        });
      }

      memorySearchSnapshot = nextSnapshot;
      memorySearchCandidates = nextCandidates;

      store.update((state) => ({
        ...state,
        memorySearch: {
          baselineCaptured: true,
          candidateCount: nextCandidates.size,
          captureCount: state.memorySearch.captureCount + 1,
          comparisonCount: state.memorySearch.comparisonCount + 1,
          lastMatchCount: nextCandidates.size,
          mode,
          results: [...nextCandidates.values()],
          targetValue: value,
          viewBytes: nextSnapshot,
        },
      }));

      syncSnapshot();
      return [...nextCandidates.values()];
    },
    canEditMemoryAddress(address) {
      return emulator?.isDebugWritableAddress?.(address) ?? false;
    },
    detachEmulator() {
      stopPolling();
      emulator = null;
      memorySearchSnapshot = null;
      memorySearchCandidates = null;
      store.set(createInitialState());
    },
    refresh() {
      return syncSnapshot();
    },
    resetMemorySearch() {
      resetMemorySearchState();
      syncSnapshot();
    },
    setMemoryByte(address, value) {
      if (!emulator?.setDebugByte || !emulator?.isPaused?.()) {
        return false;
      }

      const didWrite = emulator.setDebugByte(address, value);
      if (!didWrite) {
        return false;
      }

      syncSnapshot();
      return true;
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
