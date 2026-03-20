import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDirectory = resolve(new URL(".", import.meta.url).pathname, "..");
const vercelConfigPath = resolve(rootDirectory, "vercel.json");

const expectedHeaders = new Map([
  [
    "content-security-policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.google-analytics.com; font-src 'self'; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://*.ingest.sentry.io https://sentry.io; manifest-src 'self'; worker-src 'self'"
  ],
  ["strict-transport-security", "max-age=31536000; includeSubDomains; preload"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["cross-origin-opener-policy", "same-origin"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=()"]
]);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function normalizeHeaders(headers) {
  return new Map(
    headers.map((header) => [String(header.key).toLowerCase(), String(header.value)])
  );
}

async function loadHeadersFromConfig() {
  const source = await readFile(vercelConfigPath, "utf8");
  const config = JSON.parse(source);

  if (!Array.isArray(config.headers)) {
    throw new Error("vercel.json must contain a top-level headers array.");
  }

  const globalRule = config.headers.find((rule) => rule.source === "/(.*)");
  if (!globalRule || !Array.isArray(globalRule.headers)) {
    throw new Error("vercel.json must define a global /(.*) header rule.");
  }

  return normalizeHeaders(globalRule.headers);
}

async function verifyRemoteHeaders(targetUrl) {
  const response = await fetch(targetUrl, {
    method: "HEAD",
    redirect: "manual"
  });

  return new Map(Array.from(response.headers.entries()));
}

function compareHeaders(actualHeaders, label) {
  for (const [expectedKey, expectedValue] of expectedHeaders) {
    const actualValue = actualHeaders.get(expectedKey);

    if (actualValue === undefined) {
      fail(`${label}: missing ${expectedKey}`);
      continue;
    }

    if (actualValue !== expectedValue) {
      fail(
        `${label}: ${expectedKey} mismatch\nexpected: ${expectedValue}\nactual:   ${actualValue}`
      );
    }
  }
}

async function main() {
  const actualConfigHeaders = await loadHeadersFromConfig();
  compareHeaders(actualConfigHeaders, "vercel.json");

  const targetUrl = process.argv[2];
  if (targetUrl) {
    const remoteHeaders = await verifyRemoteHeaders(targetUrl);
    compareHeaders(remoteHeaders, targetUrl);
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log(
    targetUrl
      ? `Security headers match in vercel.json and at ${targetUrl}.`
      : "Security headers match the expected policy in vercel.json."
  );
}

await main();
