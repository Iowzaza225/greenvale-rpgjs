/**
 * Phase 5B: lightweight smooth-fantasy character sheet prototype.
 * Preserves RPGJS 3 columns x 4 facing rows layout.
 * Draws vector shapes at native resolution rather than scaling pixel blocks.
 * Art pipeline can later replace this generator with authored transparent PNGs.
 */
export const SMOOTH_FRAME = { width: 96, height: 112, columns: 3, rows: 4 } as const;
export type SmoothRole = "hero" | "monster";
export type SmoothFacing = 0 | 1 | 2 | 3;
export const SMOOTH_FACING_ORDER = ["down", "left", "right", "up"] as const;

const palettes: Record<string, [string, string, string]> = {
  novice: ["#617e6d", "#d8bf86", "#3b5149"],
  vanguard: ["#596675", "#d5b982", "#343e4b"],
  arcanist: ["#58557d", "#b8a4e3", "#302e53"],
  ranger: ["#3c765b", "#c9b476", "#294d3e"],
  mender: ["#8da996", "#e7dcb5", "#51685b"],
  shade: ["#3a3b51", "#9e89bd", "#262638"],
  trader: ["#916d4f", "#e3b77b", "#59412e"],
  ashfang_wolf: ["#667773", "#b2b5a4", "#384d4a"],
  mossling: ["#588d63", "#bbd88d", "#386046"]
};
const sheetCache = new Map<string, string>();
const paintEllipse = (c: CanvasRenderingContext2D, x:number,y:number,rx:number,ry:number,color:string) => {
  c.fillStyle=color; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fill();
};
function paint(c:CanvasRenderingContext2D,id:string,role:SmoothRole,frame:number,facing:SmoothFacing):void {
  const [base,trim,dark]=palettes[id] ?? palettes[role==="hero"?"novice":"ashfang_wolf"];
  const w=SMOOTH_FRAME.width,h=SMOOTH_FRAME.height;
  c.save();c.translate(frame*w,facing*h);
  const bob=frame===1?-3:frame===2?1:0;
  paintEllipse(c,48,101,26,6,"#0c1b2080");
  c.translate(0,bob);
  c.lineJoin="round";c.lineCap="round";
  if(role==="monster"){
    paintEllipse(c,46,72,29,19,dark);
    paintEllipse(c,46,65,28,18,base);
    paintEllipse(c,65,52,19,16,base);
    c.fillStyle=dark;c.beginPath();c.moveTo(52,45);c.lineTo(53,26);c.lineTo(66,40);c.lineTo(73,25);c.lineTo(79,46);c.fill();
    paintEllipse(c,76,56,12,8,trim);
    if(facing!==3)paintEllipse(c,69,48,3,3,"#efb47a");
    for(const x of [27,62]){paintEllipse(c,x,90,7,12,dark);paintEllipse(c,x,94,6,6,base);}
    c.strokeStyle=trim;c.lineWidth=7;c.beginPath();c.moveTo(20,68);c.quadraticCurveTo(7,51,12,43);c.stroke();
  }else{
    const stride=frame===0?-5:frame===2?5:0;
    paintEllipse(c,37,89+stride,9,13,dark);paintEllipse(c,59,89-stride,9,13,dark);
    c.strokeStyle=dark;c.lineWidth=13;c.beginPath();c.moveTo(34,56);c.lineTo(24,76);c.moveTo(62,56);c.lineTo(72,76);c.stroke();
    paintEllipse(c,48,62,23,26,base);
    c.fillStyle=trim;c.beginPath();c.moveTo(30,45);c.lineTo(66,45);c.lineTo(61,51);c.lineTo(35,51);c.fill();
    paintEllipse(c,48,32,17,19,"#c9a080");
    paintEllipse(c,48,22,19,11,dark);
    if(facing!==3){const offset=facing===1?-4:facing===2?4:0;paintEllipse(c,42+offset,34,2,2,dark);paintEllipse(c,54+offset,34,2,2,dark);}
    c.strokeStyle=trim;c.lineWidth=4;c.beginPath();c.moveTo(72,76);c.lineTo(77,37);c.stroke();
  }
  // Small directional highlight provides depth without expensive WebGL lights.
  c.globalAlpha=.22;paintEllipse(c,39,53,12,20,"#ffffff");c.globalAlpha=1;
  c.restore();
}
export function smoothFantasySheetDataUrl(id:string,role:SmoothRole="hero"):string {
  if(typeof document==="undefined")throw new Error("Canvas requires a browser");
  const key=role+":"+id;const hit=sheetCache.get(key);if(hit)return hit;
  const canvas=document.createElement("canvas");
  canvas.width=SMOOTH_FRAME.width*SMOOTH_FRAME.columns;
  canvas.height=SMOOTH_FRAME.height*SMOOTH_FRAME.rows;
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx)throw new Error("Canvas 2D unavailable");
  ctx.imageSmoothingEnabled=true;
  for(let facing=0;facing<4;facing++)for(let frame=0;frame<3;frame++)paint(ctx,id,role,frame,facing as SmoothFacing);
  const url=canvas.toDataURL("image/png");sheetCache.set(key,url);return url;
}
