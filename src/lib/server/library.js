import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EMULATOR_FILE_PATH = resolve(process.cwd(), "src/lib/emu/nes-emulator.js");
const PUBLIC_DOMAIN_CATALOG_FILE_PATH = resolve(process.cwd(), "static/roms/pdroms/nes/catalog.json");
const LICENSED_CATALOG_FILE_PATH = resolve(process.cwd(), "static/roms/licensed/nes/catalog.json");
const EMULATOR_SOURCE_URL =
  "https://github.com/tsilva/nesvibes/blob/main/src/lib/emu/nes-emulator.js";

function countLines(source) {
  if (source.length === 0) {
    return 0;
  }

  const newlineCount = (source.match(/\n/g) ?? []).length;
  return source.endsWith("\n") ? newlineCount : newlineCount + 1;
}

function formatApproximateLoc(lineCount) {
  if (lineCount >= 1000) {
    const thousands = Math.round(lineCount / 100) / 10;
    const formattedThousands = Number.isInteger(thousands)
      ? String(thousands.toFixed(0))
      : String(thousands.toFixed(1));

    return `~${formattedThousands}k LOC`;
  }

  return `~${lineCount} LOC`;
}

function compareLibraryEntries(a, b) {
  if (a.sourceKind !== b.sourceKind) {
    return a.sourceKind === "licensed" ? -1 : 1;
  }

  return a.title.localeCompare(b.title);
}

async function readCatalog(filePath, failureMessage, sourceKind) {
  try {
    const source = await readFile(filePath, "utf8");
    const entries = JSON.parse(source);

    if (!Array.isArray(entries)) {
      throw new Error("Catalog must contain a top-level array.");
    }

    return {
      entries: entries.map((entry) => ({ ...entry, sourceKind })),
      message: entries.length === 0 ? failureMessage.empty : ""
    };
  } catch (error) {
    console.error(`Failed to read ROM catalog at ${filePath}`, error);

    return {
      entries: [],
      message: failureMessage.error
    };
  }
}

function buildPageTitle(selectedGame) {
  return selectedGame ? `Play ${selectedGame.title} | NESVibes` : "NESVibes | Vibecoded with GPT-5.4";
}

function buildPageDescription(selectedGame) {
  if (!selectedGame) {
    return "Vibecoded with GPT-5.4, NESVibes lets you play public-domain and redistributable homebrew NES games instantly in your browser with quicklaunch ROMs, upstream credits, license notices, touch controls, fullscreen play, and a built-in debugger.";
  }

  const authorSuffix = selectedGame.author ? ` by ${selectedGame.author}` : "";
  return `${selectedGame.description} Play ${selectedGame.title}${authorSuffix} instantly in your browser on NESVibes.`;
}

export async function getLibraryData() {
  const [publicDomainCatalog, licensedCatalog] = await Promise.all([
    readCatalog(
      PUBLIC_DOMAIN_CATALOG_FILE_PATH,
      {
        empty: "No bundled ROMs available.",
        error: "Bundled ROM catalog failed to load. Drag-and-drop remains available."
      },
      "public-domain"
    ),
    readCatalog(
      LICENSED_CATALOG_FILE_PATH,
      {
        empty: "No redistributable homebrew bundled.",
        error: "Licensed homebrew catalog failed to load."
      },
      "licensed"
    )
  ]);

  return {
    publicDomainCatalog: publicDomainCatalog.entries,
    publicDomainCatalogMessage: publicDomainCatalog.message,
    licensedCatalog: licensedCatalog.entries,
    licensedCatalogMessage: licensedCatalog.message,
    libraryEntries: [...publicDomainCatalog.entries, ...licensedCatalog.entries].sort(compareLibraryEntries)
  };
}

export async function getLibraryEntryBySlug(slug) {
  const { libraryEntries } = await getLibraryData();
  return libraryEntries.find((entry) => entry.id === slug) ?? null;
}

export async function getLibraryRouteEntries() {
  const { libraryEntries } = await getLibraryData();
  return libraryEntries.map((entry) => ({ slug: entry.id }));
}

export async function loadNesVibesPageData(selectedGameId = null) {
  const [emulatorSource, libraryData] = await Promise.all([
    readFile(EMULATOR_FILE_PATH, "utf8"),
    getLibraryData()
  ]);
  const selectedGame = selectedGameId
    ? libraryData.libraryEntries.find((entry) => entry.id === selectedGameId) ?? null
    : null;
  const emulatorLocLabel = `Single javascript file (${formatApproximateLoc(
    countLines(emulatorSource)
  )}) · Vibecoded with GPT-5.4. ❤️`;

  return {
    emulatorLocLabel,
    emulatorSourceUrl: EMULATOR_SOURCE_URL,
    publicDomainCatalog: libraryData.publicDomainCatalog,
    publicDomainCatalogMessage: libraryData.publicDomainCatalogMessage,
    licensedCatalog: libraryData.licensedCatalog,
    licensedCatalogMessage: libraryData.licensedCatalogMessage,
    selectedGame,
    selectedGameId: selectedGame?.id ?? null,
    pageTitle: buildPageTitle(selectedGame),
    pageDescription: buildPageDescription(selectedGame)
  };
}
