import assert from "node:assert/strict";
import test from "node:test";

import { createClientMonitoring } from "../src/lib/client-monitoring.js";

function fixture(enabled = true) {
  const captured = [];
  const initialized = [];
  const handled = [];
  const warnings = [];
  const errors = [];
  const scope = new EventTarget();
  scope.console = {
    warn: (message) => warnings.push(message),
    error: (error) => errors.push(error),
  };
  const options = { enabled, dsn: "https://public@example.test/1" };
  const sdk = {
    init: (value) => initialized.push(value),
    captureException: (error, hint) => captured.push({ error, hint }),
    handleErrorWithSentry: () => (input) => {
      handled.push(input);
      return { message: "Framework error" };
    },
  };
  return { scope, options, sdk, captured, initialized, handled, warnings, errors };
}

function emit(scope, type, properties) {
  scope.dispatchEvent(Object.assign(new Event(type), properties));
}

test("errors and rejected promises survive SDK loading with their original objects", async () => {
  const f = fixture();
  let finishLoading;
  const loading = new Promise((resolve) => { finishLoading = resolve; });
  const monitor = createClientMonitoring({ ...f, loadSdk: () => loading });
  const first = monitor.init();
  assert.equal(first, monitor.init());
  const error = new Error("Before initialization");
  const rejection = new Error("Rejected during initialization");
  emit(f.scope, "error", { error });
  emit(f.scope, "unhandledrejection", { reason: rejection });
  assert.equal(f.captured.length, 0);
  finishLoading(f.sdk);
  await first;
  assert.deepEqual(f.initialized, [f.options]);
  assert.deepEqual(f.captured.map((entry) => entry.error), [error, rejection]);
  assert.ok(f.captured.every((entry) => entry.hint.mechanism.handled === false));

  emit(f.scope, "error", { error: new Error("SDK owns global errors now") });
  assert.equal(f.captured.length, 2);
  const input = { error: new Error("Framework failure"), status: 500 };
  assert.deepEqual(monitor.handleError(input), { message: "Framework error" });
  assert.deepEqual(f.handled, [input]);
});

test("the smoke test captures once when its thrown error also reaches the startup listener", async () => {
  const f = fixture();
  const monitor = createClientMonitoring({ ...f, loadSdk: async () => f.sdk });
  let thrown;
  try { f.scope.__sentryTest(); } catch (error) { thrown = error; }
  assert.match(thrown.message, /^Sentry smoke test \[/);
  emit(f.scope, "error", { error: thrown });
  await monitor.init();
  assert.deepEqual(f.captured.map((entry) => entry.error), [thrown]);

  assert.throws(() => f.scope.__sentryTest(), /Sentry smoke test/);
  assert.equal(f.captured.length, 2);
});

test("disabled monitoring retains the smoke-test warning and makes no captures", async () => {
  const f = fixture(false);
  const monitor = createClientMonitoring({ ...f, loadSdk: async () => f.sdk });
  emit(f.scope, "error", { error: new Error("Disabled") });
  assert.throws(() => f.scope.__sentryTest(), /Sentry smoke test/);
  await monitor.init();
  assert.deepEqual(f.initialized, [f.options]);
  assert.equal(f.captured.length, 0);
  assert.deepEqual(f.warnings, ["Sentry is disabled; throwing without capture."]);
});

test("an SDK download failure allows app startup and retains errors for a later retry", async () => {
  const f = fixture();
  let attempts = 0;
  const monitor = createClientMonitoring({
    ...f,
    loadSdk: async () => {
      if (++attempts === 1) throw new Error("Unavailable JavaScript chunk");
      return f.sdk;
    },
  });
  assert.equal(await monitor.init(), null);
  for (let index = 0; index < 55; index++) {
    emit(f.scope, "error", { error: new Error(`Startup error ${index}`) });
  }
  assert.equal(await monitor.init(), f.sdk);
  assert.equal(f.captured.length, 50);
  assert.equal(f.captured[0].error.message, "Startup error 0");
  assert.equal(f.captured.at(-1).error.message, "Startup error 49");
  assert.equal(f.warnings.length, 1);
});
