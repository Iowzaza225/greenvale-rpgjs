import { defineConfig } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";

export default defineConfig({
  optimizeDeps: { include: ["pixi.js > @xmldom/xmldom"] },
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
