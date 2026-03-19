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
    lastDiffCount: 0,
    results: [],
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
