import adapter from "@sveltejs/adapter-vercel";

const config = {
  kit: {
    adapter: adapter(),
    inlineStyleThreshold: 50000
  }
};

export default config;
