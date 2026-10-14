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

test("painted atlas is bundled and visibly differs from old canvas primitives", async ({ page }) => {
  await page.goto("/?debug=1&art=painted");
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__GV_ART_QA__))).toBe(true);
  const result = await page.evaluate(async () => {
    const art = (window as any).__GV_ART_QA__;
    const ids = ["hero-novice", "hero-vanguard", "hero-arcanist",
      "npc-mara", "npc-trainer", "monster-ashfang_wolf", "monster-hollow_raider"];
    return Promise.all(ids.map(async id => {
      const painted: string | undefined = await art.painted(id);
      if (!painted) return {id, available:false};
      const img = new Image();
      img.src = painted;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img,0,0);
      const rgba = ctx.getImageData(0,0,img.width,img.height);
      let visiblePixels=0;
      for(let i=3;i<rgba.data.length;i+=4)if(rgba.data[i]>32)visiblePixels++;
      return {id,available:true,width:img.width,height:img.height,
        visiblePixels,pixelSource: painted===art.smooth(id)};
    }));
  });
  expect(result).toHaveLength(7);
  for(const sprite of result){
    expect(sprite.available).toBe(true);
    expect(sprite.width).toBe(288);
    expect(sprite.height).toBe(448);
    expect(sprite.visiblePixels).toBeGreaterThan(2000);
    expect(sprite.pixelSource).toBe(false);
  }
});

test("actual gameplay uses painted sprites, not procedural cartoon fallback", async ({ page }) => {
  await page.goto("/?debug=1&art=painted");
  await page.locator("#gv-play").click();
  await page.locator("[data-action=create-slot]").first().click();
  await page.locator("#gv-name").fill("PaintedQA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action=skip-cutscene]").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({timeout:30_000});
  await expect.poll(() => page.evaluate(() => {
    return (window as any).__GV_ACTUAL_ART__?.["hero-novice"];
  }), {timeout:20_000}).toBe("painted");
  await expect(page.locator("#gv-art-source-debug")).toContainText("PAINTED");
});
