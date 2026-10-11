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

  // The nearest Phase 5 spawn must still be a real combat target.
  await page.evaluate(() => window.dispatchEvent(new Event("greenvale:combat-state-request")));
  await expect(page.locator("#gv-combat-target")).toBeVisible();

  // Defeat one live monster through the real combat path and verify the Bestiary records it.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-nearest-enemy-hp", { detail: { hp: 1 } })));
  await page.locator("[data-combat='auto']").click();
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("greenvale.bestiary.v1") || "null");
    return Object.values(save?.kills || {}).some(value => Number(value) >= 1);
  }), { timeout: 15_000 }).toBe(true);
  await page.locator("[data-combat='auto']").click();

  await page.locator("#gv-bestiary-button").click();
  await expect(page.locator("#gv-bestiary-panel")).toBeVisible();
  await expect(page.locator(".gv5-bestiary-entry")).toHaveCount(14);
  await page.locator("[data-best-close]").click();

  // Field boss targeting drives the dedicated boss HP bar and phase metadata.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-target-monster", { detail: { monsterId: "ashfang_alpha" } })));
  await expect(page.locator("#gv-boss-bar")).toBeVisible();
  await expect(page.locator("#gv-boss-bar")).toContainText(/Ashfang Alpha|อัลฟาเขี้ยวเถ้า/);

  // Mini-bosses normally wait 30-60 minutes; debug mode can activate the same pooled slot immediately.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-activate-miniboss", { detail: { monsterId: "marrowtusk" } })));
  await expect(page.locator("#gv-monster-toast")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("greenvale:debug-target-monster", { detail: { monsterId: "marrowtusk" } })));
  await expect(page.locator("#gv-combat-target")).toContainText(/Marrowtusk|หมูป่าเขี้ยวกระดูก/);

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter(message => /applySyncPacket|module script|RPGJS .*BOOT ERROR|TypeError/i.test(message));
  expect(fatal).toEqual([]);
});
