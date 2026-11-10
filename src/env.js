import { defineEnvVars } from "@sveltejs/kit/env";

const optionalString = (value) => value;

export const variables = defineEnvVars({
  PUBLIC_GOOGLE_ANALYTICS_ID: { public: true, schema: optionalString },
  PUBLIC_SENTRY_DSN: { public: true, schema: optionalString },
  PUBLIC_SENTRY_ENABLED: { public: true, schema: optionalString },
  SENTRY_DSN: { schema: optionalString },
});
