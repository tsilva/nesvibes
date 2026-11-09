import { SENTRY_DSN } from "$app/env/private";
import { PUBLIC_SENTRY_DSN } from "$app/env/public";
import * as Sentry from "@sentry/sveltekit";
import { createSentryOptions, isSentryEnabled } from "#lib/sentry.js";
import { DEFAULT_SENTRY_DSN } from "#lib/sentry-project.js";

const sentryDsn =
  SENTRY_DSN?.trim() ||
  PUBLIC_SENTRY_DSN?.trim() ||
  DEFAULT_SENTRY_DSN;
const sentryOptions = createSentryOptions(sentryDsn, isSentryEnabled());

if (sentryOptions) {
  Sentry.init(sentryOptions);
}
