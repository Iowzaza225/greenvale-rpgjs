import { expect, test } from "@playwright/test";

test("desktop keyboard, original character sprites and five connected maps", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.stack || error.message));
  await page.goto("/?debug=1&lang=th");
  await page.locator("#gv-play").click();
  await page.locator("[data-action=create-slot]").first().click();
  await page.locator("#gv-name").fill("DesktopQA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action=skip-cutscene]").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({timeout:30000});

  await expect(page.locator("body")).toHaveAttribute("data-gv-device","desktop");
  await expect(page.locator("#gv-desktop-help")).toBeVisible();
  await page.keyboard.press("KeyM");
  await expect(page.locator("#gv-world-map")).toBeVisible();
  await expect(page.locator(".gv-world-zone")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await expect(page.locator("#gv-world-map")).toBeHidden();

  await page.keyboard.press("KeyK");
  await expect(page.locator("#gv-skill-system")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#gv-skill-system")).toBeHidden();

  await page.keyboard.press("KeyC");
  await expect(page.locator("#gv-character-system")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#gv-character-system")).toBeHidden();

  const seen: string[] = [];
  await page.evaluate(() => {
    (window as any).__GV_DESKTOP_KEY_EVENTS__ = [];
    window.addEventListener("greenvale:hotbar-use",event => {
      (window as any).__GV_DESKTOP_KEY_EVENTS__.push((event as CustomEvent).detail.slot);
    });
  });
  await page.keyboard.press("Digit1");
  await page.keyboard.press("Digit0");
  const slots = await page.evaluate(() => (window as any).__GV_DESKTOP_KEY_EVENTS__);
  expect(slots).toEqual([0,9]);

  for(const id of ["training-plains","mutant-grove","stoneburrow-cavern","rotten-core","greenvale-camp"]){
    await page.evaluate(id => window.dispatchEvent(new CustomEvent("greenvale:debug-travel",{detail:{id}})),id);
    await expect(page.locator("body")).toHaveAttribute("data-gv-map",id,{timeout:15000});
    await expect(page.locator("#rpg canvas")).toBeVisible();
  }
  await expect(page.locator("#runtime-error")).toBeHidden();
  expect(errors.filter(message => /applySyncPacket|module script|RPGJS .*BOOT ERROR|Cannot resolve spritesheet/i.test(message))).toEqual([]);
});
