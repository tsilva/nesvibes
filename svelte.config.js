import adapter from "@sveltejs/adapter-vercel";

const config = {
  kit: {
    adapter: adapter({ runtime: "nodejs24.x" }),
    inlineStyleThreshold: 50000,

    experimental: {
      tracing: {
        server: true
      },

      instrumentation: {
        server: true
      }
    }
  }
};

export default config;