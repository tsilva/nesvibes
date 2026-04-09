import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createPageMetadata, getManifestData, getRobotsLines, site } from "../src/lib/site.js";
import { loadNesVibesPageData } from "../src/lib/server/library.js";

test("homepage metadata stays category-first and upgrades schema to a playable NES library page", async () => {
  const pageData = await loadNesVibesPageData();
  const metadata = createPageMetadata({
    libraryEntries: pageData.libraryEntries
  });

  assert.equal(metadata.title, "Play NES Games Online in Your Browser | NESVibes");
  assert.equal(
    metadata.description,
    "Play NES games online instantly in your browser with bundled homebrew and public-domain titles, drag-and-drop ROM support, touch controls, and fullscreen retro play."
  );
  assert.equal(metadata.canonicalUrl, "https://nesvibes.tsilva.eu/");
  assert.equal(metadata.ogImageAlt, site.ogImage.alt);
  assert.equal(metadata.jsonLd["@type"], "CollectionPage");
  assert.equal(metadata.jsonLd.description, metadata.description);
  assert.equal(metadata.jsonLd.about["@type"], "WebApplication");
  assert.equal(metadata.jsonLd.about.description, metadata.description);
  assert.equal(metadata.jsonLd.mainEntity["@type"], "ItemList");
  assert.equal(metadata.jsonLd.mainEntity.numberOfItems, 44);
  assert.equal(metadata.jsonLd.mainEntity.itemListElement.length, 8);
});

test("game metadata keeps NES-online positioning while aligning detail pages to video-game schema", async () => {
  const pageData = await loadNesVibesPageData("bingo-bingo");
  const metadata = createPageMetadata({
    pathname: pageData.selectedGame.playPath,
    title: pageData.pageTitle,
    description: pageData.pageDescription,
    selectedGame: pageData.selectedGame,
    libraryEntries: pageData.libraryEntries
  });

  assert.equal(pageData.pageTitle, "Play Bingo NES Game Online in Your Browser | NESVibes");
  assert.match(
    pageData.pageDescription,
    /^Play Bingo, a Nintendo Entertainment System \(NES\) game, online instantly in your browser\./
  );
  assert.equal(metadata.canonicalUrl, "https://nesvibes.tsilva.eu/play/bingo");
  assert.equal(metadata.ogImageAlt, site.ogImage.alt);
  assert.equal(metadata.description, pageData.pageDescription);
  assert.equal(metadata.jsonLd["@type"], "WebPage");
  assert.equal(metadata.jsonLd.description, pageData.pageDescription);
  assert.equal(metadata.jsonLd.mainEntity["@type"], "VideoGame");
  assert.equal(metadata.jsonLd.mainEntity.description, pageData.pageDescription);
  assert.equal(metadata.jsonLd.mainEntity.gamePlatform, "Nintendo Entertainment System");
  assert.equal(metadata.jsonLd.mainEntity.author.name, "Damian Yerrick");
});

test("manifest and robots stay aligned with the site metadata source of truth", async () => {
  const [manifestSource, robotsSource] = await Promise.all([
    readFile(new URL("../static/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../static/robots.txt", import.meta.url), "utf8")
  ]);
  const manifest = JSON.parse(manifestSource);
  const expectedManifest = getManifestData();

  assert.deepEqual(manifest, expectedManifest);
  assert.equal(robotsSource.trim(), getRobotsLines().join("\n"));
});

test("longer game titles fall back to the shorter NES-online title formula", async () => {
  const pageData = await loadNesVibesPageData("air-hockey");

  assert.equal(
    pageData.pageTitle,
    "Play Air Hockey - NES Black Box NES Game Online | NESVibes"
  );
});
