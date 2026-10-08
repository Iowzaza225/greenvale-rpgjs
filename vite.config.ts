import { defineConfig } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";

export default defineConfig({
  // Keep deploy previews and production deploys portable on Netlify.
  base: "./",
  optimizeDeps: { include: ["pixi.js > @xmldom/xmldom"] },
  build: {
    rollupOptions: {
      output: {
        // CanvasEngine lazy-loads Pixi. Safari on Netlify deploy previews can
        // fail that secondary module request, so ship one self-contained JS bundle.
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    ...rpgjs({
      server: startServer,
      entryPoints: {
        rpg: "./src/standalone.ts",
        mmorpg: { client: "./src/client.ts", server: "./src/server.ts" },
      },
    }),
  ],
});
