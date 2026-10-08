import { provideRpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client";
import startServer from "./server";
import "./styles.css";
import { installWeaponFx } from "./weapon-fx";

declare global {
  interface Window {
    __GV_ENTRY_STARTED__?: boolean;
    __GV_CANVAS_READY__?: boolean;
    __GV_START_REQUESTED__?: boolean;
    __GV_ON_CANVAS_READY__?: () => void;
    __GV_SHOW_ERROR__?: (message: unknown) => void;
  }
}

let launched = false;

function launchGame() {
  if (launched) return;
  launched = true;
  installWeaponFx();
  window.__GV_ENTRY_STARTED__ = true;

  try {
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

    let checks = 0;
    const timer = window.setInterval(() => {
      checks++;
      if (document.querySelector("#rpg canvas")) {
        window.__GV_CANVAS_READY__ = true;
        window.clearInterval(timer);
        const stamp = document.getElementById("build-stamp");
        if (stamp) stamp.textContent = "GREENVALE • GAME READY";
        window.__GV_ON_CANVAS_READY__?.();
      } else if (checks >= 60) {
        window.clearInterval(timer);
        window.__GV_SHOW_ERROR__?.("RPGJS did not create a canvas within 24 seconds");
      }
    }, 400);
  } catch (error: any) {
    console.error("[Greenvale RPGJS boot failed]", error);
    window.__GV_SHOW_ERROR__?.(
      "RPGJS SYNC BOOT ERROR\n" + (error?.stack || error?.message || String(error)),
    );
    throw error;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("greenvale:start", launchGame);
  if (window.__GV_START_REQUESTED__) launchGame();
}
