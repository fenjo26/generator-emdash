import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  trailingSlash: "always",
  site: "https://example.com", // patched by generate.js with real domain
  devToolbar: { enabled: false },
});
