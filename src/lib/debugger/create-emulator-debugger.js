import { get, writable } from "svelte/store";

const DEFAULT_MEMORY_ADDRESS = 0x0000;
const DEFAULT_MEMORY_LENGTH = 0x100;
const MEMORY_SEARCH_LENGTH = 0x0800;
const POLL_INTERVAL_MS = 150;

function createInitialMemorySearchState() {
  return {
    baselineCaptured: false,
    candidateCount: 0,
    captureCount: 0,
    comparisonCount: 0,
    lastDiffCount: 0,
    results: [],
    viewBytes: null,
  };
}

function createInitialState() {
  return {
    attached: false,
    hasRom: false,
    memoryError: "",
    memorySearch: createInitialMemorySearchState(),
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

    const snapshot = emulator.getDebugSnapshot({
      length: DEFAULT_MEMORY_LENGTH,
      startAddress: memoryAddress,
    });
    const searchViewBytes = memorySearchCandidates ? readMemorySearchSnapshot() : null;

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

  function readMemorySearchSnapshot() {
    if (!emulator?.getDebugSnapshot) {
      return null;
    }

    const bytes = new Array(MEMORY_SEARCH_LENGTH);

    for (let offset = 0; offset < MEMORY_SEARCH_LENGTH; offset += DEFAULT_MEMORY_LENGTH) {
      const chunk = emulator.getDebugSnapshot({
        length: Math.min(DEFAULT_MEMORY_LENGTH, MEMORY_SEARCH_LENGTH - offset),
        startAddress: offset,
      });

      if (!chunk?.memory?.bytes) {
        return null;
      }

      for (let index = 0; index < chunk.memory.bytes.length; index += 1) {
        bytes[offset + index] = chunk.memory.bytes[index];
      }
    }

    return bytes;
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
      resetMemorySearchState();
      syncSnapshot();
      startPolling();
    },
    captureMemorySearch() {
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
            viewBytes: nextSnapshot,
          },
        }));
        syncSnapshot();
        return [];
      }

      const latestDiffs = [];
      for (let address = 0; address < MEMORY_SEARCH_LENGTH; address += 1) {
        const previousValue = memorySearchSnapshot[address];
        const currentValue = nextSnapshot[address];

        if (previousValue === currentValue) {
          continue;
        }

        latestDiffs.push({
          address,
          currentValue,
          previousValue,
        });
      }

      const latestDiffMap = new Map(
        latestDiffs.map((entry) => [
          entry.address,
          {
            ...entry,
            changeCount: (memorySearchCandidates?.get(entry.address)?.changeCount ?? 0) + 1,
          },
        ]),
      );

      const nextCandidates = memorySearchCandidates
        ? new Map(
            [...memorySearchCandidates.keys()]
              .filter((address) => latestDiffMap.has(address))
              .map((address) => [address, latestDiffMap.get(address)]),
          )
        : latestDiffMap;

      memorySearchSnapshot = nextSnapshot;
      memorySearchCandidates = nextCandidates;

      store.update((state) => ({
        ...state,
        memorySearch: {
          baselineCaptured: true,
          candidateCount: nextCandidates.size,
          captureCount: state.memorySearch.captureCount + 1,
          comparisonCount: state.memorySearch.comparisonCount + 1,
          lastDiffCount: latestDiffs.length,
          results: [...nextCandidates.values()],
          viewBytes: nextSnapshot,
        },
      }));

      syncSnapshot();
      return [...nextCandidates.values()];
    },
    detachEmulator() {
      stopPolling();
      emulator = null;
      memoryAddress = DEFAULT_MEMORY_ADDRESS;
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
