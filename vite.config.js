import adapter from "@sveltejs/adapter-vercel";
import { sentrySvelteKit } from "@sentry/sveltekit/vite";
import { defineConfig, loadEnv } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { SENTRY_ORG, SENTRY_PROJECT } from "./src/lib/sentry-project.js";

export default defineConfig(({ command, mode }) => {
  const isHostedBuild = process.env.VERCEL === "1" && Boolean(process.env.VERCEL_DEPLOYMENT_ID);
  const authToken = command === "build" && isHostedBuild
    ? loadEnv(mode, process.cwd(), "").SENTRY_AUTH_TOKEN
    : undefined;

  return {
    define: command === "build" ? { __SENTRY_DEBUG__: false } : {},
    plugins: [
      sentrySvelteKit({
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
        authToken,
        autoUploadSourceMaps: Boolean(authToken),
      }),
      sveltekit({
        adapter: adapter({ runtime: "nodejs24.x" }),
        inlineStyleThreshold: 50000,
        tracing: { server: true },
      }),
    ],
  };
});
