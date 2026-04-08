import { env as privateEnv } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import * as Sentry from "@sentry/sveltekit";
import { createSentryOptions, isSentryEnabled } from "$lib/sentry.js";
import { DEFAULT_SENTRY_DSN } from "$lib/sentry-project.js";

const sentryDsn =
  privateEnv.SENTRY_DSN?.trim() ||
  publicEnv.PUBLIC_SENTRY_DSN?.trim() ||
  DEFAULT_SENTRY_DSN;
const sentryOptions = createSentryOptions(sentryDsn, isSentryEnabled());

if (sentryOptions) {
  Sentry.init(sentryOptions);
}
