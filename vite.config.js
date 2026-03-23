import { sentrySvelteKit } from "@sentry/sveltekit";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [sentrySvelteKit({
    org: "tsilva",
    project: "nesvibes"
  }), sveltekit()]
});
