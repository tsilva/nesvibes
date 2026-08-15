import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = process.cwd();

function compareVersions(left, right) {
  const leftParts = left.split(/[.-]/).slice(0, 3).map(Number);
  const rightParts = right.split(/[.-]/).slice(0, 3).map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function collectDependencyVersions() {
  const names = [
    "@opentelemetry/core",
    "@sveltejs/kit",
    "brace-expansion",
    "cookie",
    "devalue",
    "nanoid",
    "postcss",
    "svelte",
    "tar",
    "vite",
  ];
  const output = execFileSync(
    "pnpm",
    ["list", ...names, "--json", "--depth", "Infinity", "--lockfile-only"],
    { cwd: root, encoding: "utf8" },
  );
  const versions = new Map();

  function walk(node) {
    for (const dependencies of [node.dependencies, node.devDependencies]) {
      for (const [name, dependency] of Object.entries(dependencies ?? {})) {
        if (dependency.resolved) {
          assert.match(dependency.resolved, /^https:\/\/registry\.npmjs\.org\//);
        }
        if (dependency.version) {
          const current = versions.get(name) ?? new Set();
          current.add(dependency.version);
          versions.set(name, current);
        }
        walk(dependency);
      }
    }
  }

  for (const project of JSON.parse(output)) walk(project);
  return { names, versions };
}

test("installed vulnerable dependency families are patched", () => {
  const { names, versions } = collectDependencyVersions();
  for (const name of names) {
    assert.ok((versions.get(name)?.size ?? 0) > 0, `${name} was not inspected`);
  }

  const floors = new Map([
    ["@opentelemetry/core", "2.8.0"],
    ["@sveltejs/kit", "2.70.2"],
    ["cookie", "0.7.0"],
    ["devalue", "5.8.1"],
    ["nanoid", "3.3.18"],
    ["postcss", "8.5.23"],
    ["svelte", "5.55.7"],
    ["tar", "7.5.19"],
    ["vite", "8.0.16"],
  ]);
  for (const [name, floor] of floors) {
    for (const installed of versions.get(name) ?? []) {
      assert.ok(compareVersions(installed, floor) >= 0, `${name}@${installed} is below ${floor}`);
    }
  }

  for (const installed of versions.get("brace-expansion") ?? []) {
    if (installed.startsWith("5.")) {
      assert.ok(compareVersions(installed, "5.0.9") >= 0, `brace-expansion@${installed} is vulnerable`);
    }
  }

  const lockfile = readFileSync(`${root}/pnpm-lock.yaml`, "utf8");
  const babelVersion = lockfile.match(/^  '@babel\/core@([^']+)':$/m)?.[1];
  assert.ok(babelVersion, "@babel/core lock entry was not inspected");
  assert.ok(compareVersions(babelVersion, "7.29.6") >= 0, `@babel/core@${babelVersion} is vulnerable`);
});

test("manifests and lockfile reject exotic dependency sources", () => {
  const manifest = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));
  for (const dependencies of [manifest.dependencies, manifest.devDependencies]) {
    for (const specifier of Object.values(dependencies ?? {})) {
      assert.doesNotMatch(specifier, /^(?:git(?:\+|:)|https?:|file:|link:|workspace:)/i);
    }
  }

  const lockfile = readFileSync(`${root}/pnpm-lock.yaml`, "utf8");
  assert.doesNotMatch(lockfile, /\b(?:git\+|github:|https?:|file:|link:|workspace:|tarball:)/i);

  const workspace = readFileSync(`${root}/pnpm-workspace.yaml`, "utf8");
  assert.match(workspace, /^minimumReleaseAge: 10080$/m);
  assert.match(workspace, /^blockExoticSubdeps: true$/m);
});
