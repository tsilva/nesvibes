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

async function readCatalog(filePath, failureMessage) {
  try {
    const source = await readFile(filePath, "utf8");
    const entries = JSON.parse(source);

    if (!Array.isArray(entries)) {
      throw new Error("Catalog must contain a top-level array.");
    }

    return {
      entries,
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

export async function load() {
  const [emulatorSource, publicDomainCatalog, licensedCatalog] = await Promise.all([
    readFile(EMULATOR_FILE_PATH, "utf8"),
    readCatalog(PUBLIC_DOMAIN_CATALOG_FILE_PATH, {
      empty: "No bundled ROMs available.",
      error: "Bundled ROM catalog failed to load. Drag-and-drop remains available."
    }),
    readCatalog(LICENSED_CATALOG_FILE_PATH, {
      empty: "No redistributable homebrew bundled.",
      error: "Licensed homebrew catalog failed to load."
    })
  ]);
  const emulatorLocLabel = `Single javascript file (${formatApproximateLoc(
    countLines(emulatorSource)
  )}) · Vibecoded with GPT-5.4. ❤️`;

  return {
    emulatorLocLabel,
    emulatorSourceUrl: EMULATOR_SOURCE_URL,
    publicDomainCatalog: publicDomainCatalog.entries,
    publicDomainCatalogMessage: publicDomainCatalog.message,
    licensedCatalog: licensedCatalog.entries,
    licensedCatalogMessage: licensedCatalog.message
  };
}
