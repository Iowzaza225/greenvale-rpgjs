import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const provenance = {
  url: "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb",
  sha1Blob: "717b56ca2b5ff5392679774725201ba03a3eefab"
};
const sourcePath = "public/assets/vendor/kaykit/Knight.glb";
const outputPath = "public/assets/characters/kaykit-knight-2p5d.webp";
const shaGitBlob = bytes => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

async function prepare() {
  await mkdir("public/assets/vendor/kaykit", {recursive:true});
  await mkdir("public/assets/characters", {recursive:true});
  let bytes;
  try { bytes = await readFile(sourcePath); } catch {}
  if (!bytes || shaGitBlob(bytes)!==provenance.sha1Blob) {
    const response=await fetch(provenance.url);
    if (!response.ok) throw new Error(`KayKit download failed: HTTP ${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
    if (shaGitBlob(bytes)!==provenance.sha1Blob) throw new Error("KayKit source git blob SHA mismatch; refusing unverified asset");
    await writeFile(sourcePath,bytes);
  }
  console.log("KayKit source verified",bytes.length,"bytes");
}
async function run() {
  await prepare();
  // Plain static asset server: Vite's RPGJS HTML transformer also injects the
  // actual game entry into non-game pages, so the atlas baker must not use Vite.
  const root=process.cwd();
  const server=createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
      const allowed=pathname.startsWith("/node_modules/three/") ||
        pathname==="/tools/kaykit-bake.html" ||
        pathname==="/tools/kaykit-bake.js" ||
        pathname==="/assets/vendor/kaykit/Knight.glb";
      if(!allowed) {res.writeHead(404);res.end("not found");return;}
      const relative=pathname.startsWith("/assets/")?"public"+pathname:"."+pathname;
      const absolute=resolve(root,relative);
      if(!absolute.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
      const bytes=await readFile(absolute);
      const ext=pathname.endsWith(".html")?"text/html":
        pathname.endsWith(".js")?"text/javascript":
        pathname.endsWith(".glb")?"model/gltf-binary":"application/octet-stream";
      res.writeHead(200,{"Content-Type":ext,"Access-Control-Allow-Origin":"*"});
      res.end(bytes);
    }catch(e){res.writeHead(404);res.end(String(e));}
  });
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(4178,"127.0.0.1",ok)});
  let browser;
  try {
    browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
    const page=await browser.newPage({viewport:{width:1180,height:760}});
    page.on("console",x=>console.log("[baker]",x.text()));
    page.on("pageerror",e=>console.error("[baker error]",e));
    await page.goto("http://127.0.0.1:4178/tools/kaykit-bake.html",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Boolean(window.__KAYKIT_DONE__||window.__KAYKIT_ERROR__),null,{timeout:120_000});
    const out=await page.evaluate(()=>({data:window.__KAYKIT_DONE__,error:window.__KAYKIT_ERROR__}));
    if(out.error) throw new Error(out.error);
    if(!out.data?.startsWith("data:image/webp;base64,"))throw new Error("Renderer did not produce WebP atlas");
    const bytes=Buffer.from(out.data.split(",")[1],"base64");
    if(bytes.length<9000)throw new Error("Atlas suspiciously small");
    await writeFile(outputPath,bytes);
    console.log("Baked KayKit Knight atlas",bytes.length,"bytes",outputPath);
  } finally {await browser?.close(); await new Promise(ok=>server.close(ok));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
