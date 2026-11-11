import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildRomAssetKeepSet, getRomAssetState, verifyBuiltRomAssets } from "../scripts/rom-assets.mjs";

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

test("the deployment gate rejects missing and altered catalog assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "nesvibes-rom-build-"));
  try {
    const licensed = join(root, "static/roms/licensed/nes");
    const pdroms = join(root, "static/roms/pdroms/nes");
    await mkdir(licensed, { recursive: true });
    await mkdir(pdroms, { recursive: true });
    await writeFile(join(licensed, "catalog.json"), JSON.stringify([
      { file: "roms/licensed/nes/game.nes", licenseFile: "roms/licensed/nes/LICENSE.txt" },
    ]));
    await writeFile(join(pdroms, "catalog.json"), "[]");
    await writeFile(join(licensed, "game.nes"), Buffer.from([78, 69, 83, 26]));
    await writeFile(join(licensed, "LICENSE.txt"), "Synthetic fixture license");
    const output = join(root, ".vercel/output/static");
    await mkdir(output, { recursive: true });
    await cp(join(root, "static/roms"), join(output, "roms"), { recursive: true });
    assert.equal(await verifyBuiltRomAssets(root), 4);
    const builtGame = join(output, "roms/licensed/nes/game.nes");
    await writeFile(builtGame, "altered");
    await assert.rejects(verifyBuiltRomAssets(root), /differs from its source.*game\.nes/);
    await rm(builtGame);
    await assert.rejects(verifyBuiltRomAssets(root), /missing.*game\.nes/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
