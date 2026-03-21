import test from "node:test";
import assert from "node:assert/strict";

import { buildRomAssetKeepSet, getRomAssetState } from "../scripts/rom-assets.mjs";

test("ROM keep set preserves catalog-referenced legal files with nonstandard names", async () => {
  const keepSet = await buildRomAssetKeepSet(process.cwd());

  assert.equal(keepSet.has("static/roms/pdroms/nes/library/snow/snow.txt"), true);
  assert.equal(keepSet.has("static/roms/pdroms/nes/library/tetramino/GPL.txt"), true);
});

test("ROM assets only include catalog-referenced local files", async () => {
  const { missingFiles, removableFiles } = await getRomAssetState(process.cwd());

  assert.deepEqual(missingFiles, []);
  assert.deepEqual(removableFiles, []);
});
