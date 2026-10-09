import { expect, test } from "@playwright/test";

test("Phase 3 skill tree, hotbar, casting, auto and reset work on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase3QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => page.evaluate(() => !!(window as any).__GV_PHASE2__)).toBe(true);

  // Raise Novice high enough to unlock the first job and earn skill points.
  await page.evaluate(() => (window as any).__GV_PHASE2__.gainExp(9000, 9000));

  await page.locator("#gv-menu-btn").click();
  await page.locator("#gv-character-btn").click();
  await page.locator("[data-phase2='tab'][data-tab='job']").click();
  await page.locator("[data-phase2='job'][data-job='ranger']").click();
  await expect(page.locator(".gv2-current-job")).toContainText("Ranger");
  await page.locator(".gv2-close").click();

  // Open the custom skill window. It must show 3 Novice + 8 Ranger skills.
  await page.locator("#gv-skill-btn").click();
  await expect(page.locator("#gv-skill-system")).toBeVisible();
  await expect(page.locator("[data-skill-id]")).toHaveCount(11);

  const pointsBefore = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return char.skillPoints;
  });
  expect(pointsBefore).toBeGreaterThan(0);

  await page.locator("[data-learn-skill='piercing_shot']").click();
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return char.learnedSkills.piercing_shot || 0;
  })).toBe(1);

  // Quick-slot puts the learned skill in the first free position (0-2 are Novice defaults).
  await page.locator("[data-quickslot-skill='piercing_shot']").click();
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return char.hotbar[3];
  })).toBe("piercing_shot");

  // Auto-battle controls persist.
  await page.locator("[data-skill-tab='auto']").click();
  await page.locator(".gv3-switch").click();
  await page.locator("[data-auto-hp]").evaluate((element: HTMLInputElement) => {
    element.value = "45";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return { enabled: char.autoBattle.enabled, hp: char.autoBattle.potionHpBelow };
  })).toEqual({ enabled: true, hp: 45 });

  // Turn auto back off so it cannot race the manual combat assertion.
  await page.locator(".gv3-switch").click();
  await page.locator("[data-skill-close]").click();
  await page.locator("#gv-resume").click();

  // Ranger starts close enough to the training wolf for Piercing Shot (range 300).
  await page.locator("[data-hotbar-slot='3']").click();
  await expect.poll(async () => page.evaluate(() => (window as any).__GV_SKILL_STATE__?.lastResult?.skillId || "")).toBe("piercing_shot");
  const castResult = await page.evaluate(() => (window as any).__GV_SKILL_STATE__?.lastResult);
  console.log("PHASE3_CAST_RESULT", JSON.stringify(castResult));
  expect(castResult.ok).toBe(true);
  expect(castResult.damage).toBeGreaterThan(0);

  // Cast bar must interrupt on a hit event for interruptible skills.
  await page.locator("[data-hotbar-slot='1']").click();
  await expect(page.locator("#gv-castbar")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:player-hit", { detail: { damage: 4, hp: 80, maxHp: 100 } })));
  await expect(page.locator("#gv-castbar")).toBeHidden();

  // Reset uses the configured Memory Respec Chip and refunds spent points.
  await page.locator("#gv-menu-btn").click();
  await page.locator("#gv-skill-btn").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-skill-reset]").click();

  const saved = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    return {
      version: save.version,
      char: save.characters.find((entry: any) => entry?.id === save.selectedCharacterId),
    };
  });
  expect(saved.version).toBeGreaterThanOrEqual(4);
  expect(saved.char.learnedSkills.survivor_strike).toBe(1);
  expect(saved.char.learnedSkills.field_first_aid).toBe(1);
  expect(saved.char.learnedSkills.camp_rest).toBe(1);
  expect(saved.char.learnedSkills.piercing_shot || 0).toBe(0);
  expect(saved.char.skillResetItems).toBe(0);
  expect(saved.char.skillPoints).toBe(pointsBefore);

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter((message) =>
    /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message),
  );
  expect(fatal).toEqual([]);
});
