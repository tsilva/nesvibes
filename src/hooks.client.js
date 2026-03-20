import * as Sentry from "@sentry/sveltekit";
import { getSentryOptions } from "$lib/sentry.js";

const sentryOptions = getSentryOptions();

if (sentryOptions) {
  Sentry.init(sentryOptions);
}

export const handleError = Sentry.handleErrorWithSentry();
