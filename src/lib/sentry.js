import { env } from "$env/dynamic/public";
import { DEFAULT_SENTRY_DSN } from "$lib/sentry-project.js";

function parseBoolean(value) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return null;
}

export function getDefaultSentryDsn() {
  const dsn = env.PUBLIC_SENTRY_DSN?.trim();
  return dsn ? dsn : DEFAULT_SENTRY_DSN;
}

export function isSentryEnabled() {
  const explicitFlag = parseBoolean(env.PUBLIC_SENTRY_ENABLED);

  if (explicitFlag !== null) {
    return explicitFlag;
  }

  return import.meta.env.PROD;
}

export function createSentryOptions(dsn, enabled = isSentryEnabled()) {
  if (!dsn) {
    return null;
  }

  return {
    dsn,
    enabled,
    tracesSampleRate: 0.1,
    enableLogs: true,
    sendDefaultPii: true,
  };
}

export function getSentryOptions() {
  return createSentryOptions(getDefaultSentryDsn());
}
