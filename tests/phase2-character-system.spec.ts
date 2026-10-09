import { expect, test } from "@playwright/test";

test("Phase 2 stats, EXP, job change, costume, emote and animation systems work on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase2QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });

  let save = await page.evaluate(() => JSON.parse(localStorage.getItem("greenvale.save") || "null"));
  expect(save.version).toBe(3);
  expect(save.characters[0].stats).toEqual({ STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 });
  expect(save.characters[0].classId).toBe("novice");

  // Seed the normal Job Lv 10 milestone so the UI path can be tested without grinding hundreds of mobs.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("greenvale.save") || "null");
    const character = data.characters[0];
    character.baseLevel = 2;
    character.baseExp = 0;
    character.jobLevel = 10;
    character.jobExp = 0;
    character.statPoints = 5;
    character.tutorial = { step: 4, completed: true, trainingPotionUsed: true };
    data.selectedCharacterId = character.id;
    data.updatedAt = Date.now();
    localStorage.setItem("greenvale.save", JSON.stringify(data));
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await expect(page.locator(".gv-slot")).toHaveCount(3);
  await page.locator("[data-action='enter-character']").first().click();
  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });

  await page.locator("#gv-menu-btn").click();
  await expect(page.locator("#gv-panel")).toBeVisible();
  await expect(page.locator("#gv-character-system")).toBeVisible();
  await expect(page.locator(".gv-stat-row")).toHaveCount(6);
  await expect(page.locator(".gv-derived-cell")).toHaveCount(17);
  await expect(page.locator("[data-cs-action='job']")).toHaveCount(6);

  // Spend a stat point and verify save persistence.
  await page.locator("[data-cs-action='stat'][data-stat='STR']").click();
  save = await page.evaluate(() => JSON.parse(localStorage.getItem("greenvale.save") || "null"));
  expect(save.characters[0].stats.STR).toBe(2);
  expect(save.characters[0].statPoints).toBe(4);

  // Change from Novice to Ranger at Job Lv 10.
  await page.locator("[data-cs-action='job'][data-job='ranger']").click();
  await expect(page.locator(".gv-cs-head")).toContainText("Ranger");
  save = await page.evaluate(() => JSON.parse(localStorage.getItem("greenvale.save") || "null"));
  expect(save.characters[0].classId).toBe("ranger");
  expect(save.characters[0].jobLevel).toBe(1);
  expect(save.characters[0].jobExp).toBe(0);
  expect(save.characters[0].equipment.weaponId).toBe("training_bow");

  // Costume is cosmetic-only state.
  await page.locator("[data-cs-action='costume'][data-costume='valley-cloak']").click();
  save = await page.evaluate(() => JSON.parse(localStorage.getItem("greenvale.save") || "null"));
  expect(save.characters[0].costumeId).toBe("valley-cloak");

  // All required placeholder animation states are available.
  await expect(page.locator("[data-cs-action='animation']")).toHaveCount(9);
  await page.locator("[data-cs-action='animation'][data-animation='death']").click();
  await expect(page.locator(".gv-animation-stage")).toHaveAttribute("data-animation", "death");

  // Eight emotes and the in-world bubble.
  await expect(page.locator("[data-cs-action='emote']")).toHaveCount(8);
  await page.locator("[data-cs-action='emote'][data-emote='hello']").click();
  await expect(page.locator("#gv-emote-pop")).toBeVisible();

  // Simulate authoritative battle EXP bridge.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("greenvale:experience", {
      detail: { baseExp: 500, jobExp: 500 },
    }));
  });
  await expect.poll(async () => {
    const data = await page.evaluate(() => JSON.parse(localStorage.getItem("greenvale.save") || "null"));
    return [data.characters[0].baseLevel, data.characters[0].jobLevel];
  }).toEqual([3, 3]);

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter((message) =>
    /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message),
  );
  expect(fatal).toEqual([]);
});

test("Phase 2 migrates a Phase 1 save to v3 without losing the character", async ({ page }) => {
  await page.goto("/?lang=th", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("greenvale.save", JSON.stringify({
      version: 2,
      account: { mode: "guest", id: "guest-local" },
      selectedCharacterId: "old-char",
      characters: [{
        id: "old-char",
        slot: 0,
        name: "OldSave",
        classId: "novice",
        baseLevel: 4,
        jobLevel: 5,
        appearance: { gender:"female",hairStyle:"crop",hairColor:"coal",skinColor:"warm",outfit:"field" },
        renameCredits: 1,
        cutsceneSeen: true,
        tutorial: { step: 4, completed: true, trainingPotionUsed: true },
        quest: { kills: 2, completed: false },
        createdAt: Date.now()-1000,
        updatedAt: Date.now()-1000
      }, null, null],
      createdAt: Date.now()-1000,
      updatedAt: Date.now()-1000
    }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem("greenvale.save") || "null"));
  expect(save.version).toBe(3);
  expect(save.characters[0].name).toBe("OldSave");
  expect(save.characters[0].baseLevel).toBe(4);
  expect(save.characters[0].jobLevel).toBe(5);
  expect(save.characters[0].stats.STR).toBe(1);
  expect(save.characters[0].statPoints).toBeGreaterThan(0);
  expect(save.characters[0].skillPoints).toBeGreaterThan(0);
});
