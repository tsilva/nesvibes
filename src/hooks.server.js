import * as Sentry from "@sentry/sveltekit";

export const handle = Sentry.sentryHandle();
export const handleError = Sentry.handleErrorWithSentry();
