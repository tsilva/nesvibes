import * as Sentry from "@sentry/sveltekit";
import { getSentryOptions } from "$lib/sentry.js";

const sentryOptions = getSentryOptions();

globalThis.__nesvibesRasterOverflow = (message = "Sentry smoke test") => {
  const error = new Error(`${message} [${new Date().toISOString()}]`);

  if (sentryOptions) {
    Sentry.captureException(error);
  } else {
    console.warn("Sentry DSN is not configured; throwing without capture.");
  }

  throw error;
};

if (sentryOptions) {
  Sentry.init(sentryOptions);
}

export const handleError = Sentry.handleErrorWithSentry();
