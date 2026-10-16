import { expect, test } from "@playwright/test";

test("REBORN baked CC0 Knight sheet has real animation banks and is wired to the RPGJS hero",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto("/?debug=1&lang=th",{waitUntil:"domcontentloaded"});
  const inspected=await page.evaluate(async()=>{
    const url="/assets/characters/kaykit-knight-2p5d.webp";
    const response=await fetch(url);
    if(!response.ok)throw new Error("Missing baked KayKit atlas HTTP "+response.status);
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement("canvas");
    canvas.width=image.width;canvas.height=image.height;
    const context=canvas.getContext("2d")!;
    context.drawImage(image,0,0);
    const data=[] as Array<{bank:number,opaque:number,poseDifferent:boolean}>;
    for(let bank=0;bank<9;bank++){
      const a=context.getImageData((bank*3)*96,0,96,112).data;
      const b=context.getImageData((bank*3+1)*96,0,96,112).data;
      let opaque=0,different=0;
      for(let p=0;p<a.length;p+=4) {
        if(b[p+3]>32)opaque++;
        if(Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2])+Math.abs(a[p+3]-b[p+3])>10)different++;
      }
      data.push({bank,opaque,poseDifferent:different>25});
    }
    return {width:image.width,height:image.height,transparentCorner:context.getImageData(0,0,1,1).data[3],data};
  });
  expect(inspected.width).toBe(2592);
  expect(inspected.height).toBe(448);
  expect(inspected.transparentCorner).toBe(0);
  expect(inspected.data).toHaveLength(9);
  for(const entry of inspected.data)expect(entry.opaque).toBeGreaterThan(200);
  for(const bank of [0,2,3,5,6])expect(inspected.data[bank].poseDifferent).toBe(true);

  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("KayKitReborn");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();
  await expect(page.locator("#rpg canvas")).toBeVisible({timeout:30_000});
  await expect.poll(()=>page.evaluate(()=>(window as any).__GV_REBORN_ASSET_QA__?.loadedFor||"")).toBe("hero");
  await expect(page.locator("[data-combat='attack']")).toBeVisible();
  await expect(page.locator("#runtime-error")).toBeHidden();
  expect(errors.filter(s=>/applySyncPacket|module script|RPGJS .*BOOT ERROR/i.test(s))).toEqual([]);
});

test("REBORN real Kenney buttons are loaded and visible on mobile",async({page})=>{
  await page.goto("/?debug=1&lang=th",{waitUntil:"domcontentloaded"});
  const files=[
    "hexagon_brown_dark.png","hexagon_grey_green.png","panel_brown_dark.png","button_brown.png"
  ];
  for(const file of files){
    const response=await page.request.get("/assets/vendor/kenney/"+file);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/image\/png/);
  }
  await page.locator("#gv-play").click();
  await page.locator("[data-action='create-slot']").first().click();
  await page.locator("#gv-name").fill("KenneyReborn");
  await page.locator("#gv-create-character").click();
  await page.locator("[data-action='skip-cutscene']").click();
  await expect(page.locator("body")).toHaveClass(/gv-compact-hud/);
  await expect(page.locator("[data-combat='attack']")).toBeVisible();
  const background=await page.locator("[data-combat='attack']").evaluate(e=>getComputedStyle(e).backgroundImage);
  expect(background).toContain("kenney");
});
