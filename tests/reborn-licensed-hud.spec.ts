import { expect, test } from "@playwright/test";

test("REBORN loads the vendored licensed HUD icons on a real mobile game screen", async ({ page }) => {
  await page.goto("/?debug=1&lang=th", { waitUntil: "domcontentloaded" });
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("RebornArt");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("body")).toHaveClass(/gv-compact-hud/);

  const icons = ["icon_sword.png", "icon_target.png", "icon_menu.png"];
  for (const name of icons) {
    const response = await page.request.get("/assets/kenney-mobile/" + name);
    expect(response.ok()).toBeTruthy();
    expect((await response.body()).subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  }
  const backgroundImages = await page.evaluate(() => {
    const ids = ["[data-combat='attack']", "[data-combat='target']", "#gv-menu-btn"];
    return ids.map(selector => {
      const node = document.querySelector(selector);
      if (!node) return "";
      return getComputedStyle(node, "::before").backgroundImage;
    });
  });
  expect(backgroundImages[0]).toContain("icon_sword.png");
  expect(backgroundImages[1]).toContain("icon_target.png");
  expect(backgroundImages[2]).toContain("icon_menu.png");
  await expect(page.locator("#runtime-error")).toBeHidden();
});
