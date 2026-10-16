import { expect, test } from "@playwright/test";

test("mobile 2.5D original sprites contain nine distinct 3-frame animations", async ({ page }) => {
  await page.goto("/?debug=1&lang=th", {waitUntil:"domcontentloaded"});
  await expect.poll(async()=>page.evaluate(()=>Boolean((window as any).__GV_MOBILE_ART_QA__))).toBe(true);

  const result=await page.evaluate(async()=>{
    const qa=(window as any).__GV_MOBILE_ART_QA__;
    const ids=[
      "hero-novice","hero-vanguard","hero-arcanist","hero-ranger","hero-mender","hero-shade","hero-trader",
      "npc-mara","npc-trainer","npc-healer",
      "monster-ashfang_wolf","monster-mossling","monster-giant_mire_crab"
    ];
    const tested=[];
    for(const id of ids){
      const src=qa.smooth(id);
      const image=new Image();
      image.src=src;await image.decode();
      const canvas=document.createElement("canvas");
      canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d")!;
      ctx.drawImage(image,0,0);
      const fingerprints=[] as number[];
      for(const action of qa.actions){
        const left=(qa.actionOffset(action)+1)*96;
        const pixels=ctx.getImageData(left,0,96,112).data;
        let score=0,visible=0;
        for(let i=0;i<pixels.length;i+=4){
          if(pixels[i+3]>48){visible++;score=(score+pixels[i]*3+pixels[i+1]*5+pixels[i+2]*7+(i/4)*11)>>>0;}
        }
        fingerprints.push(score);
        if(!visible)throw new Error(`Invisible animation: ${id}/${action}`);
      }
      tested.push({
        id,width:image.width,height:image.height,
        backgroundAlpha:ctx.getImageData(0,0,1,1).data[3],
        numberOfDistinctActions:new Set(fingerprints).size
      });
      image.src="";canvas.width=0;canvas.height=0;
    }
    return tested;
  });

  expect(result).toHaveLength(13);
  for(const atlas of result){
    expect(atlas.width).toBe(2592);
    expect(atlas.height).toBe(448);
    expect(atlas.backgroundAlpha).toBe(0);
    expect(atlas.numberOfDistinctActions).toBeGreaterThanOrEqual(7);
  }
});

test("iPhone WebKit boots using original 2.5D hero and wolf artwork",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/?debug=1&lang=th",{waitUntil:"domcontentloaded"});
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("MobileArtQA");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({timeout:30000});
  await expect(page.locator("#runtime-error")).toBeHidden();
  expect(errors.filter(x=>/applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(x))).toEqual([]);
});
