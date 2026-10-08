import { defineConfig } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";

export default defineConfig({
  base: "./",
  optimizeDeps: { include: ["pixi.js > @xmldom/xmldom"] },
  build: {
    rolldownOptions: {
      output: {
        // Safari on Netlify deploy previews was failing CanvasEngine's
        // secondary dynamic Pixi module import. Ship a single JS bundle.
        codeSplitting: false,
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
