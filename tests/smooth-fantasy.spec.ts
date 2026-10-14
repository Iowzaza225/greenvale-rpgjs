import { expect, test } from "@playwright/test";

test("smooth fantasy atlas: 3x4 transparent PNG for heroes, NPCs and monsters", async ({ page }) => {
  await page.goto("/?debug=1&art=smooth");
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__GV_ART_QA__))).toBe(true);
  const sheets = await page.evaluate(async () => {
    // Production Vite preview serves bundled JS, not raw TypeScript modules.
    const art = (window as any).__GV_ART_QA__;
    const ids = ["hero-novice", "hero-vanguard", "hero-arcanist", "npc-mara",
      "monster-ashfang_wolf", "monster-mossling", "monster-hollow_raider",
      "monster-giant_mire_crab"];
    return Promise.all(ids.map(async (id) => {
      const source: string = art.smooth(id);
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const bgAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
      const anchors = [0, 1, 2, 3].map(row =>
        ctx.getImageData(48, row * 112 + 65, 1, 1).data[3]
      );
      return { id, prefix: source.slice(0, 22), width: image.width,
        height: image.height, bgAlpha, anchors, length: source.length };
    }));
  });
  for (const sheet of sheets) {
    expect(sheet.prefix).toBe("data:image/png;base64,");
    expect(sheet.width).toBe(288);
    expect(sheet.height).toBe(448);
    expect(sheet.bgAlpha).toBe(0);
    expect(sheet.anchors.every((alpha: number) => alpha > 0)).toBe(true);
    expect(sheet.length).toBeGreaterThan(1000);
  }
});

test("pixel art remains available as a safe fallback", async ({ page }) => {
  await page.goto("/?debug=1&art=pixel");
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__GV_ART_QA__))).toBe(true);
  const checked = await page.evaluate(async () => {
    const art = (window as any).__GV_ART_QA__;
    const image = new Image();
    image.src = art.pixel("hero-novice");
    await image.decode();
    return { width: image.width, height: image.height };
  });
  expect(checked).toEqual({ width: 144, height: 224 });
});
