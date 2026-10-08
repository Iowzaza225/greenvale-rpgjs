import { defineConfig, type Plugin } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";

const greenvaleSingleBundle = (): Plugin => ({
  name: "greenvale-single-bundle",
  enforce: "post",
  configResolved(config: any) {
    const output = config.build?.rolldownOptions?.output;
    const patch = (value: any) => {
      if (!value) return;
      // @rpgjs/vite adds manualChunks. Remove it only for our standalone
      // mobile build so CanvasEngine/Pixi do not require a secondary module.
      delete value.manualChunks;
      value.codeSplitting = false;
    };
    if (Array.isArray(output)) output.forEach(patch);
    else patch(output);
  },
});

export default defineConfig({
  base: "./",
  optimizeDeps: { include: ["pixi.js > @xmldom/xmldom"] },
  build: {
    rolldownOptions: {
      output: {
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
    greenvaleSingleBundle(),
  ],
});
