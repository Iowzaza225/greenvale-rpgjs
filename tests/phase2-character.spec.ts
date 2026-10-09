import { expect, test } from "@playwright/test";

test("Phase 2 stats, levels, jobs, costume and emote work on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase2QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () =>
    page.evaluate(() => !!(window as any).__GV_PHASE2__),
  ).toBe(true);

  // Gain enough test EXP to create stat points and unlock the Novice job change.
  await page.evaluate(() => (window as any).__GV_PHASE2__.gainExp(8000, 8000));

  await page.locator("#gv-menu-btn").click();
  await page.locator("#gv-character-btn").click();
  await expect(page.locator("#gv-character-system")).toBeVisible();
  await expect(page.locator(".gv2-stat-row")).toHaveCount(6);

  const before = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const char = save.characters.find((entry: any) => entry?.id === save.selectedCharacterId);
    return { str: char.stats.STR, points: char.statPoints, jobLevel: char.jobLevel };
  });
  expect(before.points).toBeGreaterThan(0);
  expect(before.jobLevel).toBeGreaterThanOrEqual(10);

  const strRow = page.locator(".gv2-stat-row").filter({ hasText: "STR" });
  await strRow.locator("button").click();

  await page.locator("[data-phase2='tab'][data-tab='job']").click();
  await expect(page.locator(".gv2-job-cards article")).toHaveCount(6);
  await page.locator("[data-phase2='job'][data-job='vanguard']").click();
  await expect(page.locator(".gv2-current-job")).toContainText("Vanguard");

  await page.locator("[data-phase2='tab'][data-tab='costume']").click();
  await page.locator("[data-phase2='costume'][data-costume='greenvale_scout']").click();

  await page.locator("[data-phase2='tab'][data-tab='emote']").click();
  await page.locator("[data-phase2='emote'][data-emote='wave']").click();
  await expect(page.locator("#gv-emote-bubble")).toBeVisible();

  const saved = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    return {
      version: save.version,
      char: save.characters.find((entry: any) => entry?.id === save.selectedCharacterId),
      bridge: JSON.parse(localStorage.getItem("greenvale.profile.v1") || "null"),
    };
  });

  expect(saved.version).toBe(3);
  expect(saved.char.classId).toBe("vanguard");
  expect(saved.char.stats.STR).toBe(before.str + 1);
  expect(saved.char.costumeId).toBe("greenvale_scout");
  expect(saved.char.jobLevel).toBe(1);
  expect(saved.bridge.classId).toBe("vanguard");
  expect(saved.bridge.derived.MaxHP).toBeGreaterThan(0);

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter((message) =>
    /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message),
  );
  expect(fatal).toEqual([]);
});
