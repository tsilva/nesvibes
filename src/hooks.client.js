import { createClientMonitoring } from "#lib/client-monitoring.js";
import { getSentryOptions } from "#lib/sentry.js";
import { version } from "$app/env";
import { updated } from "$app/state";
import { createRootModuleRecovery } from "#lib/root-module-recovery.js";

const monitoring = createClientMonitoring({
  scope: globalThis,
  options: getSentryOptions(),
  recoverModule: createRootModuleRecovery({ scope: globalThis, version, checkForUpdate: () => updated.check() }),
  loadSdk: async () => {
    const { init, captureException, handleErrorWithSentry } = await import("@sentry/sveltekit");
    return { init, captureException, handleErrorWithSentry };
  },
});

// SvelteKit awaits init before hydration. The SDK can download separately while
// the server-rendered page paints, with early errors retained until it is ready.
export async function init() {
  await monitoring.init();
}
export const handleError = monitoring.handleError;
