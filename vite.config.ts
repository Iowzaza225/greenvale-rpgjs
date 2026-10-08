import { defineConfig, type Plugin } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server.ts";

const BUILD_ID =
  process.env.COMMIT_REF?.slice(0, 8) ||
  process.env.GITHUB_SHA?.slice(0, 8) ||
  process.env.DEPLOY_ID?.slice(0, 8) ||
  "local";
const BUILD_TIME = new Date().toISOString();
const APP_VERSION = process.env.npm_package_version || "0.3.0-phase0";

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
  define: {
    __GV_BUILD_ID__: JSON.stringify(BUILD_ID),
    __GV_BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __GV_APP_VERSION__: JSON.stringify(APP_VERSION),
  },
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
