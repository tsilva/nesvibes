import { defineEnvVars } from "@sveltejs/kit/env";

const optionalString = (value) => value;
const buildPublicConfig = process.env.VERCEL === "1";

export const variables = defineEnvVars({
  PUBLIC_GOOGLE_ANALYTICS_ID: { public: true, static: buildPublicConfig, schema: optionalString },
  PUBLIC_SENTRY_DSN: { public: true, static: buildPublicConfig, schema: optionalString },
  PUBLIC_SENTRY_ENABLED: { public: true, static: buildPublicConfig, schema: optionalString },
  SENTRY_DSN: { schema: optionalString },
});
