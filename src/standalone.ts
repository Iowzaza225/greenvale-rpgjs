import { provideRpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client";
import startServer from "./server";
import "./styles.css";

declare global {
  interface Window {
    __GV_ENTRY_STARTED__?: boolean;
    __GV_CANVAS_READY__?: boolean;
    __GV_SHOW_ERROR__?: (message: unknown) => void;
  }
}

try {
  if (typeof window !== "undefined") window.__GV_ENTRY_STARTED__ = true;

  const boot = startGame({
    ...configClient,
    providers: [configClient.providers, provideRpg(startServer)],
  });

  Promise.resolve(boot).catch((error) => {
    console.error("[Greenvale RPGJS async boot failed]", error);
    window.__GV_SHOW_ERROR__?.(
      "RPGJS ASYNC BOOT ERROR\n" + (error?.stack || error?.message || String(error)),
    );
  });

  if (typeof window !== "undefined") {
    let checks = 0;
    const timer = window.setInterval(() => {
      checks++;
      const canvas = document.querySelector("#rpg canvas");
      if (canvas) {
        window.__GV_CANVAS_READY__ = true;
        window.clearInterval(timer);
        const stamp = document.getElementById("build-stamp");
        if (stamp) stamp.textContent = "RPGJS V2.3 • CANVAS READY";
      } else if (checks >= 20) {
        window.clearInterval(timer);
      }
    }, 400);
  }
} catch (error: any) {
  console.error("[Greenvale RPGJS boot failed]", error);
  if (typeof window !== "undefined") {
    window.__GV_SHOW_ERROR__?.(
      "RPGJS SYNC BOOT ERROR\n" + (error?.stack || error?.message || String(error)),
    );
  }
  throw error;
}
