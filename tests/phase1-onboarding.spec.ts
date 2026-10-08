import { expect, test } from "@playwright/test";

test("Phase 1 character onboarding works on iPhone WebKit", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));

  await page.goto("/?debug=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#gv-play")).toBeVisible();

  // Language toggle must re-render the title without reloading.
  await page.locator("[data-action='language']").click();
  await expect(page.locator("#gv-play")).toContainText("Play now");
  await page.locator("[data-action='language']").click();

  await page.locator("#gv-play").click();
  await expect(page.locator("[data-action='create-slot']")).toHaveCount(3);
  await page.locator("[data-action='create-slot']").first().click();

  // Validation: too short fails.
  await page.locator("#gv-name").fill("A");
  await page.locator("#gv-create-character").click();
  await expect(page.locator("#gv-name-error")).not.toHaveText("");

  // Preview controls and future-career guide are interactive.
  await page.locator("[data-action='rotate']").click();
  await page.locator("[data-action='animation']").click();
  await page.locator("[data-action='career']").click();
  await expect(page.locator(".gv-career-card")).toHaveCount(6);
  await page.locator("[data-action='creator']").click();

  await page.locator("#gv-name").fill("Phase1QA");
  await page.locator("[data-action='random-all']").click();
  await page.locator("#gv-name").fill("Phase1QA");
  await page.locator("#gv-create-character").click();

  await expect(page.locator(".gv-cutscene-card")).toBeVisible();
  await page.locator("[data-action='skip-cutscene']").click();

  await expect(page.locator("#rpg canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#gv-tutorial")).toBeVisible();

  // Mandatory tutorial: walk gesture.
  await page.evaluate(() => {
    const y = innerHeight * 0.8;
    window.dispatchEvent(new PointerEvent("pointerdown", { clientX: 35, clientY: y, bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 80, clientY: y - 10, bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 80, clientY: y - 10, bubbles: true }));
  });

  // Attack gesture on the right.
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent("pointerdown", { clientX: innerWidth * 0.82, clientY: innerHeight * 0.78, bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: innerWidth * 0.82, clientY: innerHeight * 0.78, bubbles: true }));
  });

  await expect(page.locator("[data-tutorial-action='potion']")).toBeVisible();
  await page.locator("[data-tutorial-action='potion']").click();
  await page.locator("#gv-quest").click();
  await expect(page.locator("#gv-tutorial")).toBeHidden({ timeout: 5_000 });

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("greenvale.save") || "null"));
  expect(saved.version).toBe(2);
  expect(saved.characters.filter(Boolean)).toHaveLength(1);
  expect(saved.characters[0].name).toBe("Phase1QA");
  expect(saved.characters[0].classId).toBe("novice");
  expect(saved.characters[0].tutorial.completed).toBe(true);

  await expect(page.locator("#runtime-error")).toBeHidden();
  const fatal = runtimeErrors.filter((message) =>
    /applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(message),
  );
  expect(fatal).toEqual([]);
});
