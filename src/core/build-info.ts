declare const __GV_BUILD_ID__: string;
declare const __GV_BUILD_TIME__: string;
declare const __GV_APP_VERSION__: string;

export const buildInfo = Object.freeze({
  id: typeof __GV_BUILD_ID__ === "string" ? __GV_BUILD_ID__ : "unknown",
  time: typeof __GV_BUILD_TIME__ === "string" ? __GV_BUILD_TIME__ : "unknown",
  version: typeof __GV_APP_VERSION__ === "string" ? __GV_APP_VERSION__ : "0.0.0",
});

export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  if (query.get("debug") === "1") return true;
  try {
    return window.localStorage.getItem("greenvale.debug") === "1";
  } catch {
    return false;
  }
}

export function renderBuildStamp(): void {
  const el = document.getElementById("build-stamp");
  if (!el) return;
  if (!isDebugMode()) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = `Greenvale v${buildInfo.version} · build ${buildInfo.id}`;
  el.setAttribute("data-build-id", buildInfo.id);
  el.setAttribute("title", buildInfo.time);
}
