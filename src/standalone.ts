import { provideRpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client";
import startServer from "./server";
import "./styles.css";

try {
  startGame({
    ...configClient,
    providers: [configClient.providers, provideRpg(startServer)],
  });
  if (typeof window !== "undefined") (window as any).__GREENVALE_RPGJS_LOADED__ = true;
} catch (error) {
  console.error("[Greenvale RPGJS boot failed]", error);
  throw error;
}
