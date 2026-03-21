import test from "node:test";
import assert from "node:assert/strict";

import { getLibraryData, loadNesVibesPageData } from "../src/lib/server/library.js";

test("library data is pre-shaped for the page and keeps licensed entries first", async () => {
  const data = await getLibraryData();

  assert.equal(data.libraryStatusMessages.length, 0);
  assert.equal(data.libraryEntries.length > 0, true);
  assert.equal(data.libraryEntries[0].sourceKind, "licensed");
  assert.equal(typeof data.libraryEntries[0].playPath, "string");
  assert.equal(typeof data.libraryEntries[0].assetHref, "string");
  assert.equal(Array.isArray(data.libraryEntries[0].detailLinks), true);
});

test("selected game page data preserves bundled legal links for public-domain exceptions", async () => {
  const snowPage = await loadNesVibesPageData("snow-snow");
  const tetraminoPage = await loadNesVibesPageData("tetramino-t");

  assert.equal(
    snowPage.selectedGame.detailLinks.some((link) => link.label === "Bundled license" && link.href === "/roms/pdroms/nes/library/snow/snow.txt"),
    true
  );
  assert.equal(
    tetraminoPage.selectedGame.detailLinks.some((link) => link.label === "Bundled license" && link.href === "/roms/pdroms/nes/library/tetramino/GPL.txt"),
    true
  );
});

test("selected game page data preserves legal and source links for licensed entries", async () => {
  const pageData = await loadNesVibesPageData("air-hockey");
  const labels = pageData.selectedGame.detailLinks.map((link) => link.label);

  assert.deepEqual(labels, ["Page", "Source", "License", "Notice", "Bundled license"]);
});
