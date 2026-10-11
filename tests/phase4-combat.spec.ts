import { expect, test } from "@playwright/test";

test("Phase 4 target, auto attack, loot, status and respawn work on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase4QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#gv-combat-controls")).toBeVisible({ timeout: 10_000 });

  // Combat state should acquire the nearest live wolf for the target HUD.
  await page.evaluate(() => window.dispatchEvent(new Event("greenvale:combat-state-request")));
  await expect(page.locator("#gv-combat-target")).toBeVisible();
  await expect(page.locator(".gv4-target-card")).toContainText(/Wolf/i);

  // Make the nearest enemy one hit from defeat, enable auto attack, then verify
  // the real server combat path approaches and defeats it.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-nearest-enemy-hp", { detail: { hp: 1 } })));
  await page.locator("[data-combat='auto']").click();

  await expect.poll(async () => page.evaluate(() => {
    const result = (window as any).__GV_COMBAT_LAST__;
    return result?.direction === "outgoing" && Number(result.damage) > 0;
  }), { timeout: 14_000 }).toBe(true);

  // Default auto-loot persists drops into save v5.
  await page.evaluate(() => window.dispatchEvent(new Event("greenvale:debug-force-loot")));
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return save.version === 5 && Number(char?.lootBag?.ashfang_fang || 0) >= 1;
  })).toBe(true);

  // Status strip is driven by authoritative status state.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-player-status", { detail: { id: "bleed", durationMs: 1000 } })));
  await expect(page.locator("#gv-player-status")).toBeVisible();
  await expect(page.locator("#gv-player-status")).toContainText("เลือดไหล");

  // Death waits before reviving at camp and shows the dedicated overlay.
  await page.evaluate(() => window.dispatchEvent(new Event("greenvale:debug-player-kill")));
  await expect(page.locator("#gv-death-overlay")).toBeVisible({ timeout: 4_000 });
  await expect(page.locator("#gv-death-overlay")).toBeHidden({ timeout: 7_000 });

  // Combat settings are persisted and can be switched off after respawn.
  const autoButton = page.locator("[data-combat='auto']");
  await autoButton.click();
  const saved = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return { version: save.version, combat: char.combatSettings, loot: char.lootBag };
  });
  expect(saved.version).toBe(5);
  expect(saved.combat.autoAttack).toBe(false);
  expect(saved.combat.autoLoot).toBe(true);
  expect(saved.loot.ashfang_fang).toBeGreaterThanOrEqual(1);

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter(message => /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message));
  expect(fatal).toEqual([]);
});
