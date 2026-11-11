import assert from "node:assert/strict";
import test from "node:test";
import { createRootModuleRecovery } from "../src/lib/root-module-recovery.js";
import { createClientMonitoring } from "../src/lib/client-monitoring.js";

const failure = (path = "https://example.test/_app/immutable/nodes/0.old.js") =>
  new TypeError(`Failed to fetch dynamically imported module: ${path}`);

function fixture(checkForUpdate = async () => true) {
  const storage = new Map();
  let reloads = 0;
  const scope = { location: { origin: "https://example.test", reload: () => reloads++ },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setTimeout, clearTimeout,
  };
  return { scope, version: "build-a", checkForUpdate, get reloads() { return reloads; } };
}

test("a confirmed update recovers initial root hydration once across reloads", async () => {
  const f = fixture();
  const recover = createRootModuleRecovery(f);
  assert.equal(await recover(failure()), true);
  assert.equal(await recover(failure()), false);
  assert.equal(await createRootModuleRecovery(f)(failure()), false);
  assert.equal(f.reloads, 1);
});

test("ordinary errors, other modules and external URLs never reload gameplay", async () => {
  let checks = 0;
  const f = fixture(async () => { checks++; return true; });
  const recover = createRootModuleRecovery(f);
  for (const error of [new Error("game failure"), failure("https://other.test/_app/immutable/nodes/0.old.js"),
    failure("https://example.test/_app/immutable/nodes/2.old.js"), failure("https://example.test/_app/immutable/chunks/0.old.js")]) {
    assert.equal(await recover(error), false);
  }
  assert.equal(checks, 0);
  assert.equal(f.reloads, 0);
});

test("unchanged versions, unavailable version checks and blocked storage preserve errors", async () => {
  for (const check of [async () => false, async () => { throw Error("offline"); }]) {
    const f = fixture(check);
    assert.equal(await createRootModuleRecovery(f)(failure()), false);
    assert.equal(f.reloads, 0);
  }
  const f = fixture();
  f.scope.sessionStorage.setItem = () => { throw Error("storage blocked"); };
  assert.equal(await createRootModuleRecovery(f)(failure()), false);
  assert.equal(f.reloads, 0);
});

test("concurrent failures share a single update check and reload", async () => {
  let complete;
  let checks = 0;
  const f = fixture(() => { checks++; return new Promise(resolve => { complete = resolve; }); });
  const recover = createRootModuleRecovery(f);
  const first = recover(failure());
  const second = recover(failure());
  await Promise.resolve(); complete(true);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(checks, 1);
  assert.equal(f.reloads, 1);
});

test("a timed out update check cannot cause a delayed reload", async () => {
  let timeout, complete;
  const f = fixture(() => new Promise(resolve => { complete = resolve; }));
  f.scope.setTimeout = callback => { timeout = callback; return 1; };
  f.scope.clearTimeout = () => {};
  const recovering = createRootModuleRecovery(f)(failure());
  await Promise.resolve(); timeout();
  assert.equal(await recovering, false);
  complete(true); await Promise.resolve();
  assert.equal(f.reloads, 0);
});

test("only a successful version recovery bypasses terminal framework error reporting", async () => {
  const handled = [];
  const input = { error: failure(), status: 500 };
  for (const recovered of [true, false]) {
    const scope = Object.assign(new EventTarget(), { console });
    const monitor = createClientMonitoring({ scope, options: { enabled: false },
      recoverModule: async () => recovered,
      loadSdk: async () => ({ init() {}, captureException() {}, handleErrorWithSentry: () => value => {
        handled.push(value); return { message: "Original error" };
      } }),
    });
    await monitor.init();
    assert.equal((await monitor.handleError(input)).message, recovered ? "Loading the latest version…" : "Original error");
  }
  assert.deepEqual(handled, [input]);
});

test("root bootstrap rejections recover after SDK init and retain handled telemetry", async () => {
  for (const recovered of [true, false]) {
    const scope = Object.assign(new EventTarget(), { console });
    let config;
    let attempts = 0;
    const monitor = createClientMonitoring({ scope, options: { enabled: false },
      recoverModule: async () => { attempts++; return recovered; },
      loadSdk: async () => ({ init(value) { config = value; }, captureException() {}, handleErrorWithSentry: () => () => ({}) }),
    });
    await monitor.init();
    const error = failure();
    scope.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: error }));
    const event = { exception: { values: [{ value: error.message, mechanism: { handled: false } }] } };
    const result = await config.beforeSend(event, { originalException: error });
    assert.equal(attempts, 1);
    assert.equal(result.exception.values[0].mechanism.handled, recovered);
    assert.equal(result.tags?.recovery, recovered ? "root-module-update" : undefined);
    assert.ok(result, "recovered failures remain visible in telemetry");
    assert.equal(event.exception.values[0].mechanism.handled, false, "leave the input envelope intact");
  }
});
