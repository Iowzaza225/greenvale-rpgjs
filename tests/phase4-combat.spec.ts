import { expect, test } from "@playwright/test";

async function enterWorld(page: any) {
  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase4QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => page.evaluate(() => !!(window as any).__GV_COMBAT__)).toBe(true);
}

test("Phase 4 combat rules and mobile UI stay stable on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));
  await enterWorld(page);

  const results = await page.evaluate(() => {
    const combat = (window as any).__GV_COMBAT__;
    const base = {
      attacker: { ATK: 50, MATK: 50, DEF: 5, MDEF: 5, HIT: 50, FLEE: 5, perfectDodge: 0, CRIT: 0, critResistance: 0, blockChance: 0 },
      defender: { ATK: 10, MATK: 10, DEF: 5, MDEF: 5, HIT: 10, FLEE: 5, perfectDodge: 0, CRIT: 0, critResistance: 0, blockChance: 0 },
      skillMultiplier: 1,
      targetElement: "earth",
      targetSize: "medium",
      targetRace: "beast",
      profile: "melee",
      magical: false,
      rng: () => 0.5,
    };
    const neutral = combat.resolve({ ...base, element: "neutral" });
    const fire = combat.resolve({ ...base, element: "fire" });
    const miss = combat.resolve({ ...base, attacker: { ...base.attacker, HIT: 0 }, defender: { ...base.defender, FLEE: 999 }, element: "neutral" });
    const dodge = combat.resolve({ ...base, defender: { ...base.defender, perfectDodge: 30 }, element: "neutral", rng: () => 0 });
    const crit = combat.resolve({ ...base, attacker: { ...base.attacker, CRIT: 999 }, element: "neutral", rng: () => 0.1 });
    const block = combat.resolve({ ...base, defender: { ...base.defender, blockChance: 75 }, element: "neutral", rng: () => 0.5 });
    return { neutral, fire, miss, dodge, crit, block };
  });

  expect(results.fire.damage).toBeGreaterThan(results.neutral.damage);
  expect(results.miss.type).toBe("miss");
  expect(results.dodge.type).toBe("perfect-dodge");
  expect(results.crit.type).toBe("critical");
  expect(results.block.type).toBe("block");

  await page.locator("#gv-menu-btn").click();
  await page.locator("#gv-combat-btn").click();
  await expect(page.locator("#gv-combat-system")).toBeVisible();
  await expect(page.locator("[data-auto-attack]")).toHaveCount(1);
  await expect(page.locator(".gv4-readonly")).toContainText("ปิดอยู่");

  await page.locator("label.gv4-toggle").first().click();
  await page.locator("label.gv4-toggle").nth(1).click();
  const combatSettings = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return { version: save.version, settings: char.combatSettings, reviveKits: char.reviveKits };
  });
  expect(combatSettings.version).toBe(5);
  expect(combatSettings.settings.autoAttack).toBe(true);
  expect(combatSettings.settings.autoLoot).toBe(false);
  expect(combatSettings.reviveKits).toBeGreaterThanOrEqual(1);

  await page.locator("[data-close]").click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:status-add", { detail: { id: "poison", durationMs: 5000 } })));
  await expect(page.locator("#gv-status-tray")).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:combat-result", { detail: { type: "critical", damage: 77 } })));
  await expect(page.locator(".gv4-float--critical")).toContainText("77");

  // Regression: damage labels must never show negative/zero hit values.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:combat-result", { detail: { type: "hit", damage: -0 } })));
  await expect(page.locator(".gv4-float--hit")).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:death", { detail: { source: "qa" } })));
  await expect(page.locator(".gv4-death")).toBeVisible();
  await expect(page.locator("[data-respawn='save-point']")).toBeVisible();
  await page.locator("[data-respawn='save-point']").click();
  await expect(page.locator("#gv-combat-system")).toBeHidden();

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter((message) => /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message));
  expect(fatal).toEqual([]);
});
