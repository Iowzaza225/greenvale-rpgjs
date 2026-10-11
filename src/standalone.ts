import { provideRpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client";
import startServer from "./server";
import { loadGameConfig } from "./core/config";
import { gameEvents } from "./core/event-bus";
import { initI18n } from "./core/i18n";
import { buildInfo, renderBuildStamp } from "./core/build-info";
import { initOnboarding } from "./ui/onboarding";
import { initCharacterSystem } from "./ui/character-system";
import { initSkillSystem } from "./ui/skill-system";
import "./styles.css";

declare global {
  interface Window {
    __GV_ENTRY_STARTED__?: boolean;
    __GV_CANVAS_READY__?: boolean;
    __GV_START_REQUESTED__?: boolean;
    __GV_PHASE0_READY__?: boolean;
    __GV_BUILD_INFO__?: typeof buildInfo;
    __GV_ON_CANVAS_READY__?: () => void;
    __GV_SHOW_ERROR__?: (message: unknown) => void;
  }
}

let launched = false;
let foundationReady = false;
let onboardingReady = false;

function errorText(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

function setupFoundation(): boolean {
  if (foundationReady) return true;

  try {
    const config = loadGameConfig();
    const locale = initI18n();
    document.documentElement.lang = locale;
    renderBuildStamp();

    foundationReady = true;
    window.__GV_PHASE0_READY__ = true;
    window.__GV_BUILD_INFO__ = buildInfo;
    gameEvents.emit("bootstrap:ready", {
      build: buildInfo,
      locale,
      configSchema: {
        classes: config.classes.schemaVersion,
        skills: config.skills.schemaVersion,
        monsters: config.monsters.schemaVersion,
      },
    });
    return true;
  } catch (error) {
    window.__GV_PHASE0_READY__ = false;
    window.__GV_SHOW_ERROR__?.("PHASE 0 FOUNDATION ERROR\n" + errorText(error));
    return false;
  }
}

function mountOnboarding(): void {
  if (onboardingReady) return;
  try {
    initOnboarding();
    initCharacterSystem();
    initSkillSystem();
    onboardingReady = true;
    gameEvents.emit("onboarding:ready", { build: buildInfo.id });
  } catch (error) {
    window.__GV_SHOW_ERROR__?.("PHASE 1 ONBOARDING ERROR\n" + errorText(error));
  }
}

function launchGame() {
  if (launched) return;
  if (!setupFoundation()) return;

  launched = true;
  window.__GV_ENTRY_STARTED__ = true;
  gameEvents.emit("game:boot-start", { build: buildInfo.id });

  try {
    const boot = startGame({
      ...configClient,
      providers: [configClient.providers, provideRpg(startServer)],
    });

    Promise.resolve(boot).catch((error) => {
      console.error("[Greenvale RPGJS async boot failed]", error);
      gameEvents.emit("game:boot-error", { phase: "async", error });
      window.__GV_SHOW_ERROR__?.(
        "RPGJS ASYNC BOOT ERROR\n" + errorText(error),
      );
    });

    let checks = 0;
    const timer = window.setInterval(() => {
      checks++;
      if (document.querySelector("#rpg canvas")) {
        window.__GV_CANVAS_READY__ = true;
        window.clearInterval(timer);
        const stamp = document.getElementById("build-stamp");
        if (stamp) stamp.dataset.state = "ready";
        renderBuildStamp();
        gameEvents.emit("game:canvas-ready", { build: buildInfo.id });
        window.__GV_ON_CANVAS_READY__?.();
      } else if (checks >= 60) {
        window.clearInterval(timer);
        const message = "RPGJS did not create a canvas within 24 seconds";
        gameEvents.emit("game:boot-error", { phase: "watchdog", error: message });
        window.__GV_SHOW_ERROR__?.(message);
      }
    }, 400);
  } catch (error) {
    console.error("[Greenvale RPGJS boot failed]", error);
    gameEvents.emit("game:boot-error", { phase: "sync", error });
    window.__GV_SHOW_ERROR__?.(
      "RPGJS SYNC BOOT ERROR\n" + errorText(error),
    );
  }
}

if (typeof window !== "undefined") {
  setupFoundation();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountOnboarding, { once: true });
  } else {
    mountOnboarding();
  }

  window.addEventListener("greenvale:start", launchGame);
  if (window.__GV_START_REQUESTED__) launchGame();
}
