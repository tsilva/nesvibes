import test from "node:test";
import assert from "node:assert/strict";

import { createPageMetadata, site } from "../src/lib/site.js";
import { loadNesVibesPageData } from "../src/lib/server/library.js";

test("homepage metadata stays category-first and schema-aligned", () => {
  const metadata = createPageMetadata();

  assert.equal(metadata.title, "Play NES Games Online in Your Browser | NESVibes");
  assert.equal(
    metadata.description,
    "Play Nintendo Entertainment System (NES) games online instantly in your browser with bundled homebrew and public-domain ROMs, touch controls, fullscreen play, and drag-and-drop support for your own .nes files."
  );
  assert.equal(metadata.canonicalUrl, "https://nesvibes.tsilva.eu/");
  assert.equal(metadata.ogImageAlt, site.ogImage.alt);
  assert.equal(metadata.jsonLd["@type"], "CollectionPage");
  assert.equal(metadata.jsonLd.description, metadata.description);
  assert.equal(metadata.jsonLd.mainEntity.description, metadata.description);
});

test("game metadata keeps NES-online positioning while aligning schema and shared social alt text", async () => {
  const pageData = await loadNesVibesPageData("bingo-bingo");
  const metadata = createPageMetadata({
    pathname: pageData.selectedGame.playPath,
    title: pageData.pageTitle,
    description: pageData.pageDescription,
    selectedGame: pageData.selectedGame
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
  assert.equal(metadata.jsonLd.mainEntity.description, pageData.pageDescription);
});

test("longer game titles fall back to the shorter NES-online title formula", async () => {
  const pageData = await loadNesVibesPageData("air-hockey");

  assert.equal(
    pageData.pageTitle,
    "Play Air Hockey - NES Black Box NES Game Online | NESVibes"
  );
});
