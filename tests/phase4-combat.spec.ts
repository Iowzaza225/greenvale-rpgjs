import { expect, test } from "@playwright/test";

test("Phase 4 combat core works on iPhone WebKit", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase4QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });

  await page.evaluate(() => {
    (window as any).__GV_PHASE4_EVENTS__ = [];
    (window as any).__GV_PHASE4_LOOT__ = [];
    window.addEventListener("greenvale:combat-event", (event) => {
      (window as any).__GV_PHASE4_EVENTS__.push((event as CustomEvent).detail);
    });
    window.addEventListener("greenvale:loot-award", (event) => {
      (window as any).__GV_PHASE4_LOOT__.push((event as CustomEvent).detail);
    });
  });

  await page.locator("#gv-menu-btn").click();
  await page.locator("#gv-combat-btn").click();
  await expect(page.locator("#gv-combat-system")).toBeVisible();

  const autoAttack = page.locator("[data-auto-attack]");
  const autoLoot = page.locator("[data-auto-loot]");
  await autoLoot.uncheck();
  await autoAttack.check();
  await page.locator("[data-combat-close]").click();

  await expect(page.locator("#gv-combat-target")).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () =>
    page.evaluate(() => (window as any).__GV_PHASE4_EVENTS__?.some((event: any) => event?.source === "player")),
    { timeout: 20_000 },
  ).toBe(true);

  // Gold is guaranteed by the wolf drop table, so manual loot prompt is deterministic.
  await expect(page.locator("#gv-loot-prompt")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-loot-claim]").click();
  await expect.poll(async () =>
    page.evaluate(() => ((window as any).__GV_PHASE4_LOOT__?.length || 0) > 0),
    { timeout: 8_000 },
  ).toBe(true);

  const saved = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return { version: save.version, combatSettings: char.combatSettings };
  });
  expect(saved.version).toBe(5);
  expect(saved.combatSettings.autoAttack).toBe(true);
  expect(saved.combatSettings.autoLoot).toBe(false);

  // Death/respawn regression: zero HP must show KO and revive at camp asynchronously.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-player-hp", { detail: { hp: 0 } })));
  await expect(page.locator("#gv-death-overlay")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator("#gv-death-overlay")).toBeHidden({ timeout: 8_000 });

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = pageErrors.filter((message) =>
    /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message),
  );
  expect(fatal).toEqual([]);
});
