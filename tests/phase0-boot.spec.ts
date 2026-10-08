import { expect, test } from "@playwright/test";

test("Phase 0 boots on iPhone WebKit without sync/runtime overlay", async ({ page }) => {
  const runtimeErrors: string[] = [];

  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#gv-menu")).toBeVisible();
  await expect(page.locator("#build-stamp")).toBeVisible();
  await expect(page.locator("#build-stamp")).toContainText("build");

  await expect.poll(async () =>
    page.evaluate(() => (window as any).__GV_PHASE0_READY__ === true),
  ).toBe(true);

  await page.locator("#gv-new").click();
  await expect(page.locator("#gv-create")).toBeVisible();
  await page.locator("#gv-name").fill("Phase0QA");
  await page.locator("#gv-start").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () =>
    page.evaluate(() => (window as any).__GV_CANVAS_READY__ === true),
  ).toBe(true);

  await expect(page.locator("#runtime-error")).toBeHidden();
  await expect(page.locator("#gv-in-game")).toBeVisible();

  const fatal = runtimeErrors.filter((message) =>
    /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message),
  );
  expect(fatal).toEqual([]);
});
