import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getLibraryEntrySlug } from "../rom-slug.js";

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

function getEntryAuthorCredit(entry) {
  const credits = Array.isArray(entry.credits) ? entry.credits : [];
  const namedAuthor = entry.author?.trim();

  if (namedAuthor) {
    const matchingCredit = credits.find((credit) => credit.name?.trim() === namedAuthor && credit.url);
    return { name: namedAuthor, url: matchingCredit?.url ?? "" };
  }

  const firstCredit = credits.find((credit) => credit.name?.trim());
  return firstCredit ? { name: firstCredit.name.trim(), url: firstCredit.url ?? "" } : null;
}

function buildEntryDetailLinks(entry) {
  const links = [];

  if (entry.originalPageUrl) {
    links.push({
      external: true,
      href: entry.originalPageUrl,
      label: "Page",
    });
  }

  if (entry.archiveDownloadUrl && entry.sourceKind === "public-domain") {
    links.push({
      external: true,
      href: entry.archiveDownloadUrl,
      label: "Archive",
    });
  }

  if (entry.sourceUrl) {
    links.push({
      external: true,
      href: entry.sourceUrl,
      label: "Source",
    });
  }

  if (entry.licenseUrl) {
    links.push({
      external: true,
      href: entry.licenseUrl,
      label: "License",
    });
  }

  if (entry.noticeFile) {
    links.push({
      external: false,
      href: assetPath(entry.noticeFile),
      label: "Notice",
    });
  }

  if (entry.licenseFile) {
    links.push({
      external: false,
      href: assetPath(entry.licenseFile),
      label: "Bundled license",
    });
  }

  return links;
}

function buildLibraryEntryViewModel(entry) {
  return {
    ...entry,
    assetHref: assetPath(entry.file),
    authorCredit: getEntryAuthorCredit(entry),
    detailLinks: buildEntryDetailLinks(entry),
    licenseSummary: getEntryLicenseSummary(entry),
    playPath: `/play/${encodeURIComponent(entry.slug)}`,
  };
}

async function readCatalog(filePath, failureMessage, sourceKind) {
  try {
    const source = await readFile(filePath, "utf8");
    const entries = JSON.parse(source);

    if (!Array.isArray(entries)) {
      throw new Error("Catalog must contain a top-level array.");
    }

    return {
      entries: entries.map((entry) => buildLibraryEntryViewModel({
        ...entry,
        slug: getLibraryEntrySlug(entry),
        sourceKind,
      })),
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
  const [publicDomainEntries, licensedEntries] = await Promise.all([
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

  const libraryEntries = [...publicDomainEntries.entries, ...licensedEntries.entries].sort(compareLibraryEntries);
  const libraryStatusMessages = [publicDomainEntries.message, licensedEntries.message].filter(Boolean);

  return {
    publicDomainCatalog: publicDomainEntries.entries,
    publicDomainCatalogMessage: publicDomainEntries.message,
    publicDomainEntries: publicDomainEntries.entries,
    licensedCatalog: licensedEntries.entries,
    licensedCatalogMessage: licensedEntries.message,
    licensedEntries: licensedEntries.entries,
    libraryEntries,
    libraryStatusMessages,
  };
}

export async function getLibraryEntryBySlug(slug) {
  const { libraryEntries } = await getLibraryData();
  return libraryEntries.find((entry) => entry.slug === slug || entry.id === slug) ?? null;
}

export async function getLibraryRouteEntries() {
  const { libraryEntries } = await getLibraryData();
  return libraryEntries.map((entry) => ({ slug: entry.slug }));
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
    publicDomainEntries: libraryData.publicDomainEntries,
    licensedEntries: libraryData.licensedEntries,
    libraryEntries: libraryData.libraryEntries,
    libraryStatusMessages: libraryData.libraryStatusMessages,
    selectedGame,
    selectedGameId: selectedGame?.id ?? null,
    pageTitle: buildPageTitle(selectedGame),
    pageDescription: buildPageDescription(selectedGame)
  };
}
