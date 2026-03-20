import { env } from "$env/dynamic/public";

export function getSentryDsn() {
  const dsn = env.PUBLIC_SENTRY_DSN?.trim();
  return dsn ? dsn : null;
}

export function getSentryOptions() {
  const dsn = getSentryDsn();

  if (!dsn) {
    return null;
  }

  return { dsn };
}
