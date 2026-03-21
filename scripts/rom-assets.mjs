import { readFile, readdir, rm } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export const ROMS_ROOT_RELATIVE_PATH = "static/roms";
export const CATALOG_RELATIVE_PATHS = [
  "static/roms/pdroms/nes/catalog.json",
  "static/roms/licensed/nes/catalog.json",
];

const CATALOG_ENTRY_ASSET_FIELDS = ["file", "licenseFile", "noticeFile"];

function toPosixPath(filePath) {
  return filePath.split(sep).join("/");
}

function resolveCatalogAssetPath(assetPath) {
  const normalizedAssetPath = String(assetPath ?? "").trim().replace(/^\/+/, "");
  if (!normalizedAssetPath) {
    return null;
  }

  const repoRelativePath = toPosixPath(`static/${normalizedAssetPath}`);
  if (!repoRelativePath.startsWith(`${ROMS_ROOT_RELATIVE_PATH}/`)) {
    throw new Error(`Catalog asset path must stay inside ${ROMS_ROOT_RELATIVE_PATH}: ${assetPath}`);
  }

  return repoRelativePath;
}

async function walkFiles(rootDir, directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const filePaths = [];

  for (const entry of entries) {
    const absolutePath = resolve(directoryPath, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...await walkFiles(rootDir, absolutePath));
      continue;
    }

    if (entry.isFile()) {
      filePaths.push(toPosixPath(relative(rootDir, absolutePath)));
    }
  }

  return filePaths;
}

async function readCatalogEntries(rootDir, catalogRelativePath) {
  const source = await readFile(resolve(rootDir, catalogRelativePath), "utf8");
  const entries = JSON.parse(source);

  if (!Array.isArray(entries)) {
    throw new Error(`Catalog must contain a top-level array: ${catalogRelativePath}`);
  }

  return entries;
}

export async function buildRomAssetKeepSet(rootDir = process.cwd()) {
  const keepSet = new Set(CATALOG_RELATIVE_PATHS);

  for (const catalogRelativePath of CATALOG_RELATIVE_PATHS) {
    const entries = await readCatalogEntries(rootDir, catalogRelativePath);

    for (const entry of entries) {
      for (const fieldName of CATALOG_ENTRY_ASSET_FIELDS) {
        const repoRelativePath = resolveCatalogAssetPath(entry[fieldName]);
        if (repoRelativePath) {
          keepSet.add(repoRelativePath);
        }
      }
    }
  }

  return keepSet;
}

export async function listRomFiles(rootDir = process.cwd()) {
  return walkFiles(rootDir, resolve(rootDir, ROMS_ROOT_RELATIVE_PATH));
}

export async function getRomAssetState(rootDir = process.cwd()) {
  const keepSet = await buildRomAssetKeepSet(rootDir);
  const existingFiles = await listRomFiles(rootDir);
  const existingFileSet = new Set(existingFiles);
  const missingFiles = [...keepSet].filter((filePath) => !existingFileSet.has(filePath)).sort();
  const removableFiles = existingFiles.filter((filePath) => !keepSet.has(filePath)).sort();

  return {
    existingFiles,
    keepSet,
    missingFiles,
    removableFiles,
  };
}

export async function pruneRomAssets(rootDir = process.cwd()) {
  const state = await getRomAssetState(rootDir);

  if (state.missingFiles.length > 0) {
    throw new Error(
      `Refusing to prune while catalog-referenced assets are missing:\n${state.missingFiles.join("\n")}`
    );
  }

  for (const filePath of state.removableFiles) {
    await rm(resolve(rootDir, filePath));
  }

  return state.removableFiles;
}

function printFileList(title, filePaths) {
  if (filePaths.length === 0) {
    return;
  }

  console.log(`${title}:`);
  for (const filePath of filePaths) {
    console.log(`- ${filePath}`);
  }
}

async function main() {
  const shouldPrune = process.argv.includes("--prune");
  const shouldList = process.argv.includes("--list");

  if (shouldPrune) {
    const prunedFiles = await pruneRomAssets();
    console.log(`Pruned ${prunedFiles.length} ROM companion files.`);
    if (shouldList) {
      printFileList("Pruned files", prunedFiles);
    }
    return;
  }

  const state = await getRomAssetState();
  console.log(`Catalog-referenced files: ${state.keepSet.size}`);
  console.log(`Existing ROM files: ${state.existingFiles.length}`);
  console.log(`Missing referenced files: ${state.missingFiles.length}`);
  console.log(`Removable ROM companion files: ${state.removableFiles.length}`);

  if (shouldList) {
    printFileList("Missing referenced files", state.missingFiles);
    printFileList("Removable files", state.removableFiles);
  }

  if (state.missingFiles.length > 0 || state.removableFiles.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
