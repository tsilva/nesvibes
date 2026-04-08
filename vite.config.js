import { sentrySvelteKit } from "@sentry/sveltekit";
import { defineConfig, loadEnv } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { SENTRY_ORG, SENTRY_PROJECT } from "./src/lib/sentry-project.js";

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), "");
  const authToken = process.env.SENTRY_AUTH_TOKEN || loadedEnv.SENTRY_AUTH_TOKEN;

  return {
    plugins: [
      sentrySvelteKit({
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
        authToken,
      }),
      sveltekit(),
    ],
  };
});
