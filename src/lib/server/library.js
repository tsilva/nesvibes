import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getLibraryEntrySlug } from "../rom-slug.js";
import { site } from "../site.js";

const EMULATOR_FILE_PATH = resolve(process.cwd(), "src/lib/emu/nes-emulator.js");
const PUBLIC_DOMAIN_CATALOG_FILE_PATH = resolve(process.cwd(), "static/roms/pdroms/nes/catalog.json");
const LICENSED_CATALOG_FILE_PATH = resolve(process.cwd(), "static/roms/licensed/nes/catalog.json");
const EMULATOR_SOURCE_URL =
  "https://github.com/tsilva/nesvibes/blob/main/src/lib/emu/nes-emulator.js";
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 155;
const DETAIL_PAGE_FALLBACK_CTA = "No download required, with fullscreen play and touch controls.";
const AUTO_LAUNCH_MODE_KEYS = ["most-valuable", "next-most-valuable"];
const META_SENTENCE_REJECT_PATTERNS = [
  /^Although\b/i,
  /^Unfortunately\b/i,
  /^It's supposed to\b/i,
  /^It'?s supposed to\b/i,
  /^Source included\b/i,
  /All Rights Reserved/i,
  /emulator authors/i,
  /copyright/i
];

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

function normalizeMetaText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function trimTextAtWordBoundary(text, maxLength) {
  const normalizedText = normalizeMetaText(text);

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  const slice = normalizedText.slice(0, Math.max(0, maxLength - 1));
  const lastSpaceIndex = slice.lastIndexOf(" ");
  const trimmedSlice = lastSpaceIndex >= 0 ? slice.slice(0, lastSpaceIndex) : slice;

  return `${trimmedSlice.trimEnd()}…`;
}

function toSentenceList(description) {
  return normalizeMetaText(description)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function stripLowValuePrefixes(sentence) {
  const rewritten = sentence
    .replace(/^This is\s+/i, "")
    .replace(/^This ROM is\s+/i, "")
    .replace(/^This game is\s+/i, "")
    .replace(/^This demo is\s+/i, "");

  return rewritten.length > 0
    ? `${rewritten.charAt(0).toUpperCase()}${rewritten.slice(1)}`
    : "";
}

function getGameContextClause(description) {
  const sentences = toSentenceList(description);

  for (const sentence of sentences) {
    const rewrittenSentence = stripLowValuePrefixes(sentence);

    if (!rewrittenSentence || META_SENTENCE_REJECT_PATTERNS.some((pattern) => pattern.test(rewrittenSentence))) {
      continue;
    }

    return rewrittenSentence;
  }

  return "";
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

function buildQuicklaunchEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    file: entry.file,
    supported: entry.supported,
    sizeBytes: entry.sizeBytes,
    prgBanks: entry.prgBanks,
    chrBanks: entry.chrBanks,
    assetHref: assetPath(entry.file),
  };
}

function buildLibraryListEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    mapper: entry.mapper,
    supported: entry.supported,
    licenseSummary: getEntryLicenseSummary(entry),
    playPath: `/play/${encodeURIComponent(entry.slug)}`,
  };
}

function compareRomValue(a, b) {
  return (
    b.sizeBytes - a.sizeBytes ||
    b.prgBanks - a.prgBanks ||
    b.chrBanks - a.chrBanks ||
    a.title.localeCompare(b.title)
  );
}

function buildAutoLaunchEntries(entries) {
  const rankedEntries = entries.filter((entry) => entry.supported).sort(compareRomValue);

  return Object.fromEntries(
    AUTO_LAUNCH_MODE_KEYS
      .map((mode, index) => [mode, rankedEntries[index] ? buildQuicklaunchEntry(rankedEntries[index]) : null])
      .filter(([, entry]) => entry !== null)
  );
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
  if (!selectedGame) {
    return site.title;
  }

  const preferredTitle = `Play ${selectedGame.title} NES Game Online in Your Browser | ${site.name}`;
  if (preferredTitle.length <= MAX_TITLE_LENGTH) {
    return preferredTitle;
  }

  const shortFallbackTitle = `Play ${selectedGame.title} NES Game Online | ${site.name}`;
  if (shortFallbackTitle.length <= MAX_TITLE_LENGTH) {
    return shortFallbackTitle;
  }

  return trimTextAtWordBoundary(`Play ${selectedGame.title} NES Online | ${site.name}`, MAX_TITLE_LENGTH);
}

function buildPageDescription(selectedGame) {
  if (!selectedGame) {
    return site.description;
  }

  const intro = `Play ${selectedGame.title}, a Nintendo Entertainment System (NES) game, online instantly in your browser.`;
  const contextClause = getGameContextClause(selectedGame.description);

  if (contextClause) {
    const withContext = `${intro} ${contextClause}`;

    if (withContext.length <= MAX_DESCRIPTION_LENGTH) {
      return withContext;
    }
  }

  const withFallbackCta = `${intro} ${DETAIL_PAGE_FALLBACK_CTA}`;
  if (withFallbackCta.length <= MAX_DESCRIPTION_LENGTH) {
    return withFallbackCta;
  }

  return trimTextAtWordBoundary(intro, MAX_DESCRIPTION_LENGTH);
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
    autoLaunchEntriesByMode: buildAutoLaunchEntries(libraryData.publicDomainEntries),
    libraryEntries: libraryData.libraryEntries.map(buildLibraryListEntry),
    libraryStatusMessages: libraryData.libraryStatusMessages,
    selectedGame,
    selectedGameId: selectedGame?.id ?? null,
    pageTitle: buildPageTitle(selectedGame),
    pageDescription: buildPageDescription(selectedGame)
  };
}
