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
  // WASD is translated to native RPGJS arrow events. Check actual player motion,
  // not merely synthetic key dispatch.
  await page.evaluate(() => {
    (window as any).__GV_COORDS__ = null;
    window.addEventListener("greenvale:debug-player-coords",event => {
      (window as any).__GV_COORDS__ = (event as CustomEvent).detail;
    });
    window.dispatchEvent(new Event("greenvale:debug-player-coords-request"));
  });
  const before = await page.evaluate(() => (window as any).__GV_COORDS__);
  expect(before).toBeTruthy();
  await page.keyboard.down("w");
  await page.waitForTimeout(420);
  await page.keyboard.up("w");
  await page.evaluate(() => window.dispatchEvent(new Event("greenvale:debug-player-coords-request")));
  const after = await page.evaluate(() => (window as any).__GV_COORDS__);
  expect(after.y).toBeLessThan(before.y - 3);

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

  await page.keyboard.press("KeyI");
  await expect(page.locator("#gv-inventory")).toBeVisible();
  await page.keyboard.press("KeyQ");
  await expect(page.locator("#gv-quests")).toBeVisible();
  await expect(page.locator("#gv-inventory")).toBeVisible();
  const header=page.locator("#gv-quests header h2");
  const box=await header.boundingBox();
  expect(box).toBeTruthy();
  const panelBefore=await page.locator("#gv-quests section").boundingBox();
  await page.mouse.move(box!.x+12,box!.y+10);
  await page.mouse.down();
  await page.mouse.move(box!.x-100,box!.y+55,{steps:6});
  await page.mouse.up();
  const panelAfter=await page.locator("#gv-quests section").boundingBox();
  expect(panelAfter!.x).toBeLessThan(panelBefore!.x-20);
  await page.keyboard.press("Escape");
  await expect(page.locator("#gv-quests")).toBeHidden();
  await expect(page.locator("#gv-inventory")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#gv-inventory")).toBeHidden();

  // 16:9 and 16:10: hotbar and combat buttons must never overlap.
  for(const viewport of [{width:1280,height:720},{width:1280,height:800}]){
    await page.setViewportSize(viewport);
    const hotbar=await page.locator("#gv-skill-hotbar").boundingBox();
    const combat=await page.locator("#gv-combat-controls").boundingBox();
    expect(hotbar).toBeTruthy();expect(combat).toBeTruthy();
    expect(hotbar!.x+hotbar!.width).toBeLessThanOrEqual(combat!.x);
  }


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
  await page.screenshot({path:"test-results/desktop-25d.png"});
  await expect(page.locator("#runtime-error")).toBeHidden();
  expect(errors.filter(message => /applySyncPacket|module script|RPGJS .*BOOT ERROR|Cannot resolve spritesheet/i.test(message))).toEqual([]);
});
