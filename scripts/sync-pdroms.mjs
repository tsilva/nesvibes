import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const baseUrl = "https://www.zophar.net";
const listingUrl = `${baseUrl}/pdroms/nes.html`;
const outputRoot = path.join(repoRoot, "roms", "pdroms", "nes");
const archiveDir = path.join(outputRoot, "archives");
const extractDir = path.join(outputRoot, "library");
const catalogPath = path.join(outputRoot, "catalog.json");

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDescription(pageHtml) {
  const match = pageHtml.match(
    /Go to Nintendo Entertainment System roms list<\/a><\/p>\s*<p align="left">([\s\S]*?)<\/p>/i
  );
  return match ? stripTags(match[1]) : "";
}

function parseAuthor(pageHtml) {
  const match = pageHtml.match(/Author:\s*([^<\r\n]+)/i);
  return match ? stripTags(match[1]) : "";
}

function parseTitle(pageHtml) {
  const match = pageHtml.match(/<title>\s*([^<]+?)\s+-\s+Nintendo Entertainment System ROM/i);
  return match ? stripTags(match[1]) : "";
}

function parseDownloadUrl(pageHtml) {
  const redirected = pageHtml.match(/https:\/\/www\.zophar\.net\/download_file\/\d+/i);
  if (redirected) {
    return redirected[0];
  }

  const direct = pageHtml.match(/href="(\/roms\/files\/nes\/[^"]+)"/i);
  return direct ? `${baseUrl}${direct[1]}` : "";
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, { redirect: "manual" });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect without location for ${url}`);
    }

    const redirectedUrl = new URL(location, url).toString()
      .replace("https://roms.zophar.net/", "https://www.zophar.net/")
      .replace("http://roms.zophar.net/", "https://www.zophar.net/");

    return fetchBuffer(redirectedUrl);
  }

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    finalUrl: response.url || url,
  };
}

async function ensureEmptyDir(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

async function walkForRoms(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkForRoms(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".nes")) {
      files.push(entryPath);
    }
  }

  return files;
}

function extractArchive(archivePath, destinationDir) {
  execFileSync("bsdtar", ["-xf", archivePath, "-C", destinationDir]);
}

function mapperSupport(mapper) {
  return [0, 1, 2, 3, 4].includes(mapper);
}

async function buildCatalogEntry(filePath, archiveMeta) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  const data = new Uint8Array(await readFile(filePath));

  if (
    data.length < 16 ||
    data[0] !== 0x4e ||
    data[1] !== 0x45 ||
    data[2] !== 0x53 ||
    data[3] !== 0x1a
  ) {
    throw new Error(`Invalid iNES file: ${relativePath}`);
  }

  const prgBanks = data[4];
  const chrBanks = data[5];
  const flags6 = data[6];
  const flags7 = data[7];
  const mapper = (flags6 >> 4) | (flags7 & 0xf0);
  const size = await stat(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const derivedTitle = baseName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: `${archiveMeta.slug}-${slugify(baseName)}`,
    title: archiveMeta.title && archiveMeta.romCount === 1 ? archiveMeta.title : derivedTitle,
    archiveTitle: archiveMeta.title,
    file: relativePath,
    sizeBytes: size.size,
    mapper,
    supported: mapperSupport(mapper),
    prgBanks,
    chrBanks,
    description: archiveMeta.description,
    author: archiveMeta.author,
    sourcePage: archiveMeta.detailUrl,
    sourceDownload: archiveMeta.downloadUrl,
  };
}

async function main() {
  const listingHtml = await fetchText(listingUrl);
  const detailUrls = [...new Set(
    [...listingHtml.matchAll(/https:\/\/www\.zophar\.net\/pdroms\/nes\/[a-z0-9-]+\.html/g)].map(
      (match) => match[0]
    )
  )];
  const directArchiveLinks = [...new Set(
    [...listingHtml.matchAll(/\/roms\/files\/nes\/[^"]+/g)].map((match) => `${baseUrl}${match[0]}`)
  )];

  await mkdir(outputRoot, { recursive: true });
  await ensureEmptyDir(archiveDir);
  await ensureEmptyDir(extractDir);

  const archives = [];

  for (const detailUrl of detailUrls) {
    const pageHtml = await fetchText(detailUrl);
    const title = parseTitle(pageHtml);
    const description = parseDescription(pageHtml);
    const author = parseAuthor(pageHtml);
    const downloadUrl = parseDownloadUrl(pageHtml);
    if (!downloadUrl) {
      throw new Error(`Missing download URL for ${detailUrl}`);
    }

    archives.push({
      title,
      description,
      author,
      detailUrl,
      downloadUrl,
    });
  }

  for (const directUrl of directArchiveLinks) {
    archives.push({
      title: path.basename(directUrl, path.extname(directUrl)).replace(/[_-]+/g, " ").trim(),
      description: "",
      author: "",
      detailUrl: listingUrl,
      downloadUrl: directUrl,
    });
  }

  const uniqueArchives = [];
  const seenDownloads = new Set();
  for (const archive of archives) {
    if (seenDownloads.has(archive.downloadUrl)) {
      continue;
    }
    seenDownloads.add(archive.downloadUrl);
    uniqueArchives.push(archive);
  }

  const catalog = [];
  const skippedArchives = [];

  for (const archive of uniqueArchives) {
    const slug = slugify(archive.title || path.basename(archive.detailUrl, ".html"));
    const archiveExtractDir = path.join(extractDir, slug);
    let archivePath = "";

    try {
      const { buffer, finalUrl } = await fetchBuffer(archive.downloadUrl);
      const archiveName = path.basename(new URL(finalUrl).pathname) || `${slug}.zip`;
      archivePath = path.join(archiveDir, archiveName);

      await writeFile(archivePath, buffer);
      await mkdir(archiveExtractDir, { recursive: true });
      extractArchive(archivePath, archiveExtractDir);

      const romFiles = await walkForRoms(archiveExtractDir);
      if (romFiles.length === 0) {
        skippedArchives.push({ title: archive.title, reason: "No .nes files found" });
        continue;
      }

      const archiveMeta = {
        ...archive,
        slug,
        romCount: romFiles.length,
        downloadUrl: finalUrl,
      };

      for (const romFile of romFiles) {
        catalog.push(await buildCatalogEntry(romFile, archiveMeta));
      }
    } catch (error) {
      skippedArchives.push({
        title: archive.title,
        reason: error instanceof Error ? error.message : String(error),
      });
      await rm(archiveExtractDir, { recursive: true, force: true });
      if (archivePath) {
        await rm(archivePath, { force: true });
      }
    }
  }

  catalog.sort((a, b) => a.title.localeCompare(b.title));
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

  console.log(`Synced ${uniqueArchives.length} archives and ${catalog.length} ROMs.`);
  const supported = catalog.filter((entry) => entry.supported).length;
  console.log(`Supported by emulator: ${supported}/${catalog.length}`);
  if (skippedArchives.length > 0) {
    console.log(`Skipped ${skippedArchives.length} archives.`);
    for (const skipped of skippedArchives) {
      console.log(`- ${skipped.title}: ${skipped.reason}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
