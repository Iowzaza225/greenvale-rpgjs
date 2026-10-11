import { expect, test } from "@playwright/test";

test("Phase 5 monster roster, Bestiary, field boss and mini-boss work on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("Phase5QA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#gv-bestiary-button")).toBeVisible({ timeout: 10_000 });

  const monsterCount = async () => page.evaluate(() => new Promise<any>(resolve => {
    const timer = window.setTimeout(() => resolve(null), 1200);
    window.addEventListener("greenvale:debug-monster-count-result", (event: Event) => {
      window.clearTimeout(timer);
      resolve((event as CustomEvent).detail || null);
    }, { once: true });
    window.dispatchEvent(new Event("greenvale:debug-monster-count"));
  }));

  // The nearest Phase 5 spawn must still be a real combat target.
  await page.evaluate(() => window.dispatchEvent(new Event("greenvale:combat-state-request")));
  await expect(page.locator("#gv-combat-target")).toBeVisible();

  // Greenvale Camp should stay sparse: only the three quest wolves are live.
  const initialCount = await monsterCount();
  expect(initialCount?.counts?.ashfang_wolf).toBe(3);
  expect(initialCount?.total).toBe(3);

  // Defeat one live monster through the real combat path and verify the Bestiary records it.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-nearest-enemy-hp", { detail: { hp: 1 } })));
  await page.locator("[data-combat='auto']").click();
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.bestiary.v1") || "null");
    return Object.values(save?.kills || {}).some(value => Number(value) >= 1);
  }), { timeout: 15_000 }).toBe(true);
  await page.locator("[data-combat='auto']").click();

  // Action Battle removes defeated events. Phase 5 must recreate the spawn slot
  // rather than mutating the removed synchronized object (Safari "removeEvent").
  await expect.poll(async () => (await monsterCount())?.counts?.ashfang_wolf ?? 0, {
    timeout: 12_000,
    intervals: [1000],
  }).toBe(3);
  await expect(page.locator("#runtime-error")).toBeHidden();

  await page.locator("#gv-bestiary-button").click();
  await expect(page.locator("#gv-bestiary-panel")).toBeVisible();
  await expect(page.locator(".gv5-bestiary-entry")).toHaveCount(14);
  await page.locator("[data-best-close]").click();

  // Field bosses are not permanently packed into Greenvale Camp. Spawn one
  // explicitly in QA mode, then acquire it through the normal target state.
  const bossSpawn = await page.evaluate(() => new Promise<any>(resolve => {
    const timer = window.setTimeout(() => resolve(null), 1600);
    window.addEventListener("greenvale:debug-monster-spawn-result", (event: Event) => {
      window.clearTimeout(timer);
      resolve((event as CustomEvent).detail || null);
    }, { once: true });
    window.dispatchEvent(new CustomEvent("greenvale:debug-spawn-monster", {
      detail: { monsterId: "ashfang_alpha", x: 870, y: 720 },
    }));
  }));
  expect(bossSpawn?.ok).toBe(true);
  const bossTarget = await page.evaluate(() => new Promise<any>(resolve => {
    const timer = window.setTimeout(() => resolve(null), 1200);
    window.addEventListener("greenvale:debug-monster-target-result", (event: Event) => {
      window.clearTimeout(timer);
      resolve((event as CustomEvent).detail || null);
    }, { once: true });
    window.dispatchEvent(new CustomEvent("greenvale:debug-target-monster", { detail: { monsterId: "ashfang_alpha" } }));
  }));
  expect(bossTarget?.ok).toBe(true);
  expect(bossTarget?.boss).toBe(true);
  await expect(page.locator("#gv-boss-bar")).toBeVisible();
  await expect(page.locator("#gv-boss-bar")).toContainText(/Ashfang Alpha|อัลฟาเขี้ยวเถ้า/);

  // Mini-bosses normally wait 30-60 minutes; debug mode activates the same pooled slot immediately.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-activate-miniboss", { detail: { monsterId: "marrowtusk" } })));
  await expect(page.locator("#gv-monster-toast")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-player-position", { detail: { x: 750, y: 190 } })));
  await page.waitForTimeout(350);
  const miniTarget = await page.evaluate(() => new Promise<any>(resolve => {
    const timer = window.setTimeout(() => resolve(null), 1200);
    window.addEventListener("greenvale:debug-monster-target-result", (event: Event) => {
      window.clearTimeout(timer);
      resolve((event as CustomEvent).detail || null);
    }, { once: true });
    window.dispatchEvent(new CustomEvent("greenvale:debug-target-monster", { detail: { monsterId: "marrowtusk" } }));
  }));
  expect(miniTarget?.ok).toBe(true);
  await expect(page.locator("#gv-combat-target")).toContainText(/Marrowtusk|หมูป่าเขี้ยวกระดูก/);

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter(message => /applySyncPacket|module script|RPGJS .*BOOT ERROR|TypeError/i.test(message));
  expect(fatal).toEqual([]);
});
