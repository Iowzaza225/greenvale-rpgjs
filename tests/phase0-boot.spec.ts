import { expect, test } from "@playwright/test";

test("Phase 0 boot regression stays stable through Phase 1 onboarding", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#gv-play")).toBeVisible();
  await expect(page.locator("#build-stamp")).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => (window as any).__GV_PHASE0_READY__ === true),
  ).toBe(true);

  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("BootQA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () =>
    page.evaluate(() => (window as any).__GV_CANVAS_READY__ === true),
  ).toBe(true);
  await expect(page.locator("#runtime-error")).toBeHidden();

  const fatal = runtimeErrors.filter((message) =>
    /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message),
  );
  expect(fatal).toEqual([]);
});
