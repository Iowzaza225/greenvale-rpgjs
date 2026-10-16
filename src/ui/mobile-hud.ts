import { gameEvents } from "../core/event-bus";
import "./mobile-hud.css";
import "./kenney-hud-icons.css";

/**
 * REBORN mobile HUD: PRESENTATION ONLY.
 * Preserve RPGJS's real native joystick/interact action and the existing
 * Greenvale combat + skill event handlers. Do not fake gameplay with DOM input.
 */
let initialized = false;

export function initMobileHud(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const query = window.matchMedia("(pointer: coarse) and (max-width: 900px)");
  const update = () => {
    document.body.classList.toggle("gv-compact-hud", Boolean(window.__GV_CANVAS_READY__ && query.matches));
  };
  gameEvents.on("game:canvas-ready", update);
  window.addEventListener("resize", update);
  query.addEventListener?.("change", update);
  document.addEventListener("visibilitychange", update);
  update();
}
