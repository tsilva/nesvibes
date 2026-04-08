import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { SENTRY_BASE_URL, SENTRY_ORG, SENTRY_PROJECT } from "../src/lib/sentry-project.js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const loaded = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    loaded[key] = value;
  }

  return loaded;
}

function printHelp() {
  console.log(`Usage: pnpm sentry:issues -- [options]

Options:
  --all                  Include resolved and ignored issues
  --query <query>        Override the Sentry issue search query
  --limit <count>        Number of issues to return (default: 10)
  --stats-period <span>  Time window like 24h, 7d, 14d (default: 14d)
  --json                 Print raw JSON instead of a table
  --help                 Show this help
`);
}

function parseArgs(argv) {
  const options = {
    all: false,
    json: false,
    limit: 10,
    query: null,
    statsPeriod: "14d",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--") {
      continue;
    }

    if (argument === "--all") {
      options.all = true;
      continue;
    }

    if (argument === "--json") {
      options.json = true;
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--query") {
      options.query = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (argument === "--limit") {
      const parsedLimit = Number.parseInt(argv[index + 1] ?? "", 10);

      if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw new Error("`--limit` must be an integer between 1 and 100.");
      }

      options.limit = parsedLimit;
      index += 1;
      continue;
    }

    if (argument === "--stats-period") {
      options.statsPeriod = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function formatCell(value, width) {
  const text = String(value ?? "");
  return text.length >= width ? `${text.slice(0, width - 1)}…` : text.padEnd(width, " ");
}

async function sentryFetch(config, pathname, searchParams = new URLSearchParams()) {
  const requestUrl = new URL(pathname, config.baseUrl);
  requestUrl.search = searchParams.toString();

  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${config.authToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sentry API request failed (${response.status} ${response.statusText}): ${body}`);
  }

  return response.json();
}

async function resolveProjectId(config) {
  const projects = await sentryFetch(
    config,
    `/api/0/organizations/${encodeURIComponent(config.org)}/projects/`,
  );

  const project = projects.find((entry) => entry.slug === config.project);

  if (!project?.id) {
    throw new Error(`Could not find project slug "${config.project}" in org "${config.org}".`);
  }

  return project.id;
}

function printIssuesTable(issues, config, options) {
  console.log(
    `Sentry issues for ${config.org}/${config.project} (query: ${options.query ?? (options.all ? "<all>" : "is:unresolved")}, stats: ${options.statsPeriod})`,
  );
  console.log("");

  if (issues.length === 0) {
    console.log("No issues found.");
    return;
  }

  console.log(
    [
      formatCell("Issue", 16),
      formatCell("Level", 8),
      formatCell("Events", 8),
      formatCell("Users", 7),
      formatCell("Last Seen", 20),
      "Title",
    ].join("  "),
  );

  for (const issue of issues) {
    console.log(
      [
        formatCell(issue.shortId ?? issue.id, 16),
        formatCell(issue.level ?? "-", 8),
        formatCell(issue.count ?? "-", 8),
        formatCell(issue.userCount ?? "-", 7),
        formatCell(issue.lastSeen ?? "-", 20),
        issue.title ?? issue.metadata?.title ?? "-",
      ].join("  "),
    );

    if (issue.permalink) {
      console.log(`  ${issue.permalink}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const cwd = process.cwd();
  const fileEnv = loadEnvFile(path.join(cwd, ".env.sentry-mcp"));
  const authToken = process.env.SENTRY_AUTH_TOKEN || fileEnv.SENTRY_AUTH_TOKEN || "";
  const org = process.env.SENTRY_ORG || fileEnv.SENTRY_ORG || SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT || fileEnv.SENTRY_PROJECT || SENTRY_PROJECT;
  const baseUrl = (process.env.SENTRY_BASE_URL || fileEnv.SENTRY_BASE_URL || SENTRY_BASE_URL).replace(/\/+$/, "");

  if (!authToken) {
    throw new Error(
      "Missing SENTRY_AUTH_TOKEN. Set it in the environment or in .env.sentry-mcp.",
    );
  }

  const config = {
    authToken,
    org,
    project,
    baseUrl,
  };

  const projectId = await resolveProjectId(config);
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(options.limit));
  searchParams.set("statsPeriod", options.statsPeriod);
  searchParams.append("project", String(projectId));
  searchParams.set("sort", "date");
  searchParams.set("query", options.query ?? (options.all ? "" : "is:unresolved"));

  const issues = await sentryFetch(
    config,
    `/api/0/organizations/${encodeURIComponent(config.org)}/issues/`,
    searchParams,
  );

  if (options.json) {
    console.log(JSON.stringify(issues, null, 2));
    return;
  }

  printIssuesTable(issues, config, options);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
