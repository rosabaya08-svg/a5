import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig();

const config = {
  ...cloudflareConfig,
  buildCommand: "node node_modules/next/dist/bin/next build --webpack",
};

export default config;
