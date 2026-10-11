import { expect, test } from "@playwright/test";

test("Phase 6 combat VFX, generated audio, rain and day-night work on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase6QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#gv-effects-layer")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("#gv-environment-layer")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => (window as any).__GV_EFFECTS_READY__ === true)).toBe(true);

  // A real combat-result from the Phase 4/5 path should drive Phase 6 VFX.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-nearest-enemy-hp", { detail: { hp: 1 } })));
  await page.locator("[data-combat='auto']").click();
  await expect.poll(async () => page.locator("#gv-effects-layer").getAttribute("data-last-effect"), {
    timeout: 14_000,
  }).not.toBeNull();
  await page.locator("[data-combat='auto']").click();

  // Deterministic QA hook verifies crit + element presentation without relying on RNG.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-effect", {
    detail: { kind: "crit", element: "fire", audio: "crit" },
  })));
  await expect(page.locator("#gv-effects-layer")).toHaveAttribute("data-last-effect", "crit");
  await expect(page.locator("#gv-effects-layer")).toHaveAttribute("data-last-element", "fire");
  await expect(page.locator("#gv-effects-layer")).toHaveAttribute("data-last-audio-requested", "crit");

  // Healing skills use their own green/light ring instead of a damage burst.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:skill-result", {
    detail: { ok: true, skillId: "field_first_aid", heal: 42, damage: 0 },
  })));
  await expect(page.locator("#gv-effects-layer")).toHaveAttribute("data-last-effect", "heal");
  await expect(page.locator("#gv-effects-layer")).toHaveAttribute("data-last-element", "light");

  // Environment can be forced in debug mode; normal play cycles automatically.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-environment", {
    detail: { phase: "night", rain: true },
  })));
  await expect(page.locator("#gv-environment-layer")).toHaveAttribute("data-phase", "night");
  await expect(page.locator("#gv-environment-layer")).toHaveAttribute("data-rain", "true");
  await expect(page.locator(".gv6-rain i").first()).toBeAttached();

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter(message => /applySyncPacket|module script|RPGJS .*BOOT ERROR|TypeError|ReferenceError/i.test(message));
  expect(fatal).toEqual([]);
});
